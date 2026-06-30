const SurveyMongo = require('../models/Survey');
const AdminMongo = require('../models/Admin');
const firestoreDb = require('./firebase');
const bcrypt = require('bcryptjs');

// Determine if we should use Firebase Firestore based on environment and provider config
const useFirebase = () => {
  return process.env.DB_PROVIDER === 'firebase' && firestoreDb !== null;
};

// Helper to convert Firestore document to standard JSON object
const docToObj = (doc) => {
  if (!doc.exists) return null;
  const data = doc.data();
  // Ensure the id property is mapped from doc.id
  return { id: doc.id, _id: doc.id, ...data };
};

const dbManager = {
  // --- Admin Auth Collection Operations ---
  
  findUser: async (username) => {
    const formattedUsername = username.toLowerCase().trim();
    if (useFirebase()) {
      const usersRef = firestoreDb.collection('admins');
      const snapshot = await usersRef.where('username', '==', formattedUsername).limit(1).get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return docToObj(doc);
    } else {
      return await AdminMongo.findOne({ username: formattedUsername });
    }
  },

  createUser: async (userData) => {
    const { username, password, role } = userData;
    const formattedUsername = username.toLowerCase().trim();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (useFirebase()) {
      const usersRef = firestoreDb.collection('admins');
      
      // Check if user already exists
      const existing = await usersRef.where('username', '==', formattedUsername).limit(1).get();
      if (!existing.empty) {
        throw new Error('User already exists');
      }

      const newUser = {
        username: formattedUsername,
        password: hashedPassword,
        role: role || 'ASHA',
        createdAt: new Date().toISOString()
      };

      const docRef = await usersRef.add(newUser);
      return { id: docRef.id, _id: docRef.id, ...newUser };
    } else {
      // Mongo uses Schema hook for hashing
      const newUser = new AdminMongo({
        username: formattedUsername,
        password,
        role: role || 'ASHA'
      });
      return await newUser.save();
    }
  },

  // --- Survey Collection Operations ---

  saveSurvey: async (surveyData) => {
    // Generate Citizen ID if not provided (Format: CH-YYYY-XXXX)
    if (!surveyData.citizenId) {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000); // 4 digit random number
      surveyData.citizenId = `CH-${year}-${rand}`;
    }

    if (useFirebase()) {
      const surveysRef = firestoreDb.collection('surveys');
      const payload = {
        ...surveyData,
        createdAt: surveyData.createdAt || new Date().toISOString()
      };
      const docRef = await surveysRef.add(payload);
      return { id: docRef.id, _id: docRef.id, ...payload };
    } else {
      const newSurvey = new SurveyMongo(surveyData);
      return await newSurvey.save();
    }
  },

  getSurveys: async (options = {}) => {
    const { page = 1, limit = 10, search = '', status = '', village = '', sortBy = 'createdAt', order = 'desc' } = options;
    const skipIndex = (page - 1) * limit;

    if (useFirebase()) {
      let query = firestoreDb.collection('surveys');

      // Firestore doesn't do native partial regex searches easily.
      // For a prototype, we will fetch and filter in-memory if search is active, 
      // or filter strictly if using exact values.
      let docs = [];
      const snapshot = await query.get();
      snapshot.forEach(doc => docs.push(docToObj(doc)));

      // Apply In-Memory Filters (Search, Status, Village)
      if (search) {
        const searchLower = search.toLowerCase();
        docs = docs.filter(doc => 
          (doc.name && doc.name.toLowerCase().includes(searchLower)) ||
          (doc.citizenId && doc.citizenId.toLowerCase().includes(searchLower))
        );
      }
      if (status) {
        docs = docs.filter(doc => doc.status === status);
      }
      if (village) {
        docs = docs.filter(doc => doc.village && doc.village.toLowerCase() === village.toLowerCase());
      }

      // Sort
      docs.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        // Handle dates
        if (sortBy === 'createdAt') {
          valA = new Date(valA);
          valB = new Date(valB);
        }

        if (valA < valB) return order === 'asc' ? -1 : 1;
        if (valA > valB) return order === 'asc' ? 1 : -1;
        return 0;
      });

      const total = docs.length;
      const paginatedData = docs.slice(skipIndex, skipIndex + parseInt(limit));

      return {
        total,
        data: paginatedData,
        pages: Math.ceil(total / limit)
      };
    } else {
      const query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { citizenId: { $regex: search, $options: 'i' } }
        ];
      }
      if (status) {
        query.status = status;
      }
      if (village) {
        query.village = { $regex: new RegExp(`^${village}$`, 'i') };
      }

      const sortOrder = order === 'asc' ? 1 : -1;
      const sort = {};
      sort[sortBy] = sortOrder;

      const total = await SurveyMongo.countDocuments(query);
      const surveys = await SurveyMongo.find(query)
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skipIndex);

      return {
        total,
        data: surveys,
        pages: Math.ceil(total / limit)
      };
    }
  },

  getSurveyById: async (id) => {
    if (useFirebase()) {
      const doc = await firestoreDb.collection('surveys').doc(id).get();
      return docToObj(doc);
    } else {
      return await SurveyMongo.findById(id);
    }
  },

  getSurveysByCitizenId: async (citizenId) => {
    if (useFirebase()) {
      const snapshot = await firestoreDb.collection('surveys')
        .where('citizenId', '==', citizenId)
        .get();
      const results = [];
      snapshot.forEach(doc => results.push(docToObj(doc)));
      // Sort oldest to newest
      results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return results;
    } else {
      return await SurveyMongo.find({ citizenId }).sort({ createdAt: 1 });
    }
  },

  updateSurvey: async (id, surveyData) => {
    if (useFirebase()) {
      const docRef = firestoreDb.collection('surveys').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return null;
      
      const payload = {
        ...surveyData,
        updatedAt: new Date().toISOString()
      };
      await docRef.update(payload);
      return { id, _id: id, ...doc.data(), ...payload };
    } else {
      return await SurveyMongo.findByIdAndUpdate(
        id,
        { $set: surveyData },
        { new: true, runValidators: true }
      );
    }
  },

  deleteSurvey: async (id) => {
    if (useFirebase()) {
      const docRef = firestoreDb.collection('surveys').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return false;
      await docRef.delete();
      return true;
    } else {
      const result = await SurveyMongo.findByIdAndDelete(id);
      return !!result;
    }
  },

  getStats: async (filters = {}) => {
    const { village = '' } = filters;

    let surveys = [];
    if (useFirebase()) {
      const snapshot = await firestoreDb.collection('surveys').get();
      snapshot.forEach(doc => surveys.push(docToObj(doc)));
    } else {
      surveys = await SurveyMongo.find({});
    }

    // Apply village filter if specified
    if (village) {
      surveys = surveys.filter(s => s.village && s.village.toLowerCase() === village.toLowerCase());
    }

    const totalSurveys = surveys.length;
    if (totalSurveys === 0) {
      return {
        totalSurveys: 0,
        healthyCount: 0,
        needsImprovementCount: 0,
        atRiskCount: 0,
        averageBmi: 0,
        bmiDistribution: { Underweight: 0, Healthy: 0, Overweight: 0, Obese: 0 },
        statusDistribution: { Healthy: 0, 'Needs Improvement': 0, 'At Risk': 0 },
        ageDistribution: { Children: 0, Adults: 0, Seniors: 0 },
        genderDistribution: { Male: 0, Female: 0, Other: 0 },
        pregnantCount: 0,
        diseaseRisks: { suspectedDiabetes: 0, suspectedHypertension: 0, suspectedObesity: 0, suspectedMalnutrition: 0 }
      };
    }

    let healthyCount = 0;
    let needsImprovementCount = 0;
    let atRiskCount = 0;
    let bmiSum = 0;
    let pregnantCount = 0;

    const bmiDist = { Underweight: 0, Healthy: 0, Overweight: 0, Obese: 0 };
    const statusDist = { Healthy: 0, 'Needs Improvement': 0, 'At Risk': 0 };
    const ageDist = { Children: 0, Adults: 0, Seniors: 0 };
    const genderDist = { Male: 0, Female: 0, Other: 0 };
    const diseaseRisks = { suspectedDiabetes: 0, suspectedHypertension: 0, suspectedObesity: 0, suspectedMalnutrition: 0 };

    surveys.forEach(s => {
      // Status
      if (s.status === 'Healthy') healthyCount++;
      else if (s.status === 'Needs Improvement') needsImprovementCount++;
      else if (s.status === 'At Risk') atRiskCount++;
      statusDist[s.status] = (statusDist[s.status] || 0) + 1;

      // BMI
      bmiSum += s.bmi || 0;
      if (s.bmiCategory) {
        bmiDist[s.bmiCategory] = (bmiDist[s.bmiCategory] || 0) + 1;
      }

      // Age groups
      if (s.age < 18) ageDist.Children++;
      else if (s.age >= 60) ageDist.Seniors++;
      else ageDist.Adults++;

      // Gender
      if (s.gender) {
        genderDist[s.gender] = (genderDist[s.gender] || 0) + 1;
      }

      // Pregnancy
      if (s.medicalHistory && s.medicalHistory.pregnancy) {
        pregnantCount++;
      }

      // Suspected Diseases
      if (s.diseaseAnalysis) {
        if (s.diseaseAnalysis.suspectedDiabetes) diseaseRisks.suspectedDiabetes++;
        if (s.diseaseAnalysis.suspectedHypertension) diseaseRisks.suspectedHypertension++;
        if (s.diseaseAnalysis.suspectedObesity) diseaseRisks.suspectedObesity++;
        if (s.diseaseAnalysis.suspectedMalnutrition) diseaseRisks.suspectedMalnutrition++;
      }
    });

    return {
      totalSurveys,
      healthyCount,
      needsImprovementCount,
      atRiskCount,
      averageBmi: parseFloat((bmiSum / totalSurveys).toFixed(1)),
      bmiDistribution: bmiDist,
      statusDistribution: statusDist,
      ageDistribution: ageDist,
      genderDistribution: genderDist,
      pregnantCount,
      diseaseRisks
    };
  }
};

module.exports = dbManager;
