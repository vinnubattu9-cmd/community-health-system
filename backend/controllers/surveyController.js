const dbManager = require('../config/dbManager');

// Helper function to perform health analysis
function analyzeHealth(data) {
  const { 
    height, weight, temperature, pulseRate, oxygenLevel, 
    bloodPressureSystolic, bloodPressureDiastolic, bloodSugar,
    lifestyle = {}, medicalHistory = {}
  } = data;
  
  // BMI calculation
  const heightM = height / 100;
  const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
  
  let bmiCategory = 'Healthy';
  if (bmi < 18.5) {
    bmiCategory = 'Underweight';
  } else if (bmi >= 18.5 && bmi < 25.0) {
    bmiCategory = 'Healthy';
  } else if (bmi >= 25.0 && bmi < 30.0) {
    bmiCategory = 'Overweight';
  } else {
    bmiCategory = 'Obese';
  }

  const recommendations = [];
  let healthScore = 100;

  // 1. BMI Recommendations & Deductions
  if (bmiCategory === 'Underweight') {
    recommendations.push("Increase caloric intake with nutrient-dense foods (nuts, seeds, lean proteins).");
    recommendations.push("Consider strength training to build muscle mass safely.");
    healthScore -= 10;
  } else if (bmiCategory === 'Overweight') {
    recommendations.push("Incorporate 150 minutes of moderate cardiovascular exercise per week.");
    recommendations.push("Adopt a balanced, portion-controlled diet focusing on whole foods.");
    healthScore -= 5;
  } else if (bmiCategory === 'Obese') {
    recommendations.push("Consult a nutritionist for a structured weight management plan.");
    recommendations.push("Engage in low-impact activities (swimming, walking) to protect joints.");
    healthScore -= 15;
  } else {
    recommendations.push("Maintain your current balanced diet and active lifestyle.");
  }

  // 2. Oxygen Level (SpO2)
  if (oxygenLevel < 92) {
    recommendations.push("CRITICAL: Low blood oxygen (SpO2 < 92%). Seek immediate medical attention.");
    healthScore -= 30;
  } else if (oxygenLevel >= 92 && oxygenLevel < 95) {
    recommendations.push("Mild hypoxia. Rest in a well-ventilated room. Consult a doctor.");
    healthScore -= 15;
  }

  // 3. Body Temperature (Celsius)
  if (temperature > 38.5) {
    recommendations.push("High fever detected. Stay hydrated, rest, and consult a healthcare provider.");
    healthScore -= 20;
  } else if (temperature > 37.5 && temperature <= 38.5) {
    recommendations.push("Low-grade fever. Monitor temperature closely, stay hydrated, and rest.");
    healthScore -= 10;
  } else if (temperature < 35.5) {
    recommendations.push("Low body temperature (Hypothermia risk). Warm up with layers and consult a doctor.");
    healthScore -= 15;
  }

  // 4. Pulse Rate (bpm)
  if (pulseRate > 120) {
    recommendations.push("Severely high heart rate. Avoid stimulants, rest, and seek medical attention.");
    healthScore -= 15;
  } else if (pulseRate > 100 && pulseRate <= 120) {
    recommendations.push("High resting heart rate (Tachycardia). Manage stress and avoid caffeine.");
    healthScore -= 5;
  } else if (pulseRate < 60) {
    recommendations.push("Low heart rate (Bradycardia). Seek medical evaluation if experiencing dizziness.");
    healthScore -= 5;
  }

  // 5. Blood Pressure
  const sys = parseInt(bloodPressureSystolic);
  const dia = parseInt(bloodPressureDiastolic);
  if (sys >= 180 || dia >= 120) {
    recommendations.push("CRITICAL: Hypertensive crisis. Seek emergency medical attention immediately.");
    healthScore -= 30;
  } else if (sys >= 140 || dia >= 90) {
    recommendations.push("Stage 2 Hypertension. Limit sodium intake, manage stress, and consult a doctor.");
    healthScore -= 20;
  } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
    recommendations.push("Stage 1 Hypertension. Focus on regular exercise and reducing sodium.");
    healthScore -= 10;
  } else if (sys >= 120 && sys < 130 && dia < 80) {
    recommendations.push("Elevated Blood Pressure. Monitor levels and adopt a heart-healthy diet.");
    healthScore -= 10;
  } else if (sys < 90 || dia < 60) {
    recommendations.push("Low Blood Pressure (Hypotension). Ensure adequate hydration.");
    healthScore -= 10;
  }

  // 6. Blood Sugar (mg/dL)
  const sugar = parseInt(bloodSugar);
  if (sugar >= 200) {
    recommendations.push("High blood sugar (hyperglycemia range). Seek medical consultation immediately.");
    healthScore -= 25;
  } else if (sugar >= 140 && sugar < 200) {
    recommendations.push("Impaired glucose tolerance (Pre-diabetic levels). Reduce refined sugar intake.");
    healthScore -= 10;
  } else if (sugar < 70) {
    recommendations.push("Low blood sugar (hypoglycemia). Consume fast-acting sugar (fruit juice, honey).");
    healthScore -= 25;
  }

  // 7. Lifestyle Deductions
  if (lifestyle.smoking === 'Daily') healthScore -= 5;
  if (lifestyle.alcohol === 'Daily') healthScore -= 5;
  if (lifestyle.exercise === 'None') healthScore -= 5;

  // 8. Chronic History Deductions
  if (medicalHistory.diabetes) healthScore -= 5;
  if (medicalHistory.hypertension) healthScore -= 5;
  if (medicalHistory.heartDisease) healthScore -= 5;

  // Clamp health score between 0 and 100
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Risk Status Classification based on health score
  let status = 'Healthy';
  if (healthScore >= 80) {
    status = 'Healthy';
  } else if (healthScore >= 60 && healthScore < 80) {
    status = 'Needs Improvement';
  } else {
    status = 'At Risk';
  }

  // Suspected Disease Analysis
  const diseaseAnalysis = {
    suspectedDiabetes: (sugar >= 200 || !!medicalHistory.diabetes),
    suspectedHypertension: (sys >= 140 || dia >= 90 || !!medicalHistory.hypertension),
    suspectedObesity: (bmi >= 30),
    suspectedMalnutrition: (bmi < 18.5)
  };

  return { bmi, bmiCategory, status, recommendations, healthScore, diseaseAnalysis };
}

// @desc    Submit new survey (ASHA Workers)
// @route   POST /api/surveys
// @access  Public (or protected if preferred, but public for ASHA submit flexibility)
exports.createSurvey = async (req, res) => {
  try {
    const analysis = analyzeHealth(req.body);
    const surveyData = {
      ...req.body,
      ...analysis
    };
    
    const survey = await dbManager.saveSurvey(surveyData);
    
    res.status(201).json({
      success: true,
      data: survey
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all surveys with filters (Search, Status, Village)
// @route   GET /api/surveys
// @access  Private (Admin / Workers)
exports.getSurveys = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', village = '', sortBy = 'createdAt', order = 'desc' } = req.query;

    const result = await dbManager.getSurveys({
      page,
      limit,
      search,
      status,
      village,
      sortBy,
      order
    });

    res.status(200).json({
      success: true,
      count: result.data.length,
      pagination: {
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: result.pages
      },
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error retrieving surveys'
    });
  }
};

// @desc    Get survey by ID
// @route   GET /api/surveys/:id
// @access  Public (so reports can be shared via ID card link)
exports.getSurveyById = async (req, res) => {
  try {
    const survey = await dbManager.getSurveyById(req.params.id);
    
    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey report not found'
      });
    }

    res.status(200).json({
      success: true,
      data: survey
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid survey ID'
    });
  }
};

// @desc    Get historical surveys for a specific citizen (Follow-up tracking)
// @route   GET /api/surveys/citizen/:citizenId/history
// @access  Public/Private
exports.getCitizenHistory = async (req, res) => {
  try {
    const history = await dbManager.getSurveysByCitizenId(req.params.citizenId);
    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error retrieving citizen history'
    });
  }
};

// @desc    Update survey record
// @route   PUT /api/surveys/:id
// @access  Private (Admin / ASHA / ANM)
exports.updateSurvey = async (req, res) => {
  try {
    const analysis = analyzeHealth(req.body);
    const updatedData = {
      ...req.body,
      ...analysis
    };

    const survey = await dbManager.updateSurvey(req.params.id, updatedData);

    if (!survey) {
      return res.status(404).json({
        success: false,
        message: 'Survey record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: survey
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete survey record
// @route   DELETE /api/surveys/:id
// @access  Private (Admin / SACHIVALAYAM)
exports.deleteSurvey = async (req, res) => {
  try {
    const deleted = await dbManager.deleteSurvey(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Survey record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid survey ID'
    });
  }
};

// @desc    Get dashboard metrics & chart aggregates (supports village filtering)
// @route   GET /api/surveys/stats
// @access  Private (Admin / PHC / ANM / NGO)
exports.getStats = async (req, res) => {
  try {
    const { village = '' } = req.query;
    const stats = await dbManager.getStats({ village });

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalSurveys: stats.totalSurveys,
          healthyCount: stats.healthyCount,
          needsImpCount: stats.needsImprovementCount,
          atRiskCount: stats.atRiskCount,
          averageBmi: stats.averageBmi,
          pregnantCount: stats.pregnantCount
        },
        charts: {
          bmiDistribution: {
            labels: ['Underweight', 'Healthy', 'Overweight', 'Obese'],
            values: [
              stats.bmiDistribution.Underweight || 0,
              stats.bmiDistribution.Healthy || 0,
              stats.bmiDistribution.Overweight || 0,
              stats.bmiDistribution.Obese || 0
            ]
          },
          healthStatus: {
            labels: ['Healthy', 'Needs Improvement', 'At Risk'],
            values: [
              stats.healthyCount,
              stats.needsImprovementCount,
              stats.atRiskCount
            ]
          },
          ageDistribution: {
            labels: ['Children (<18)', 'Adults (18-59)', 'Seniors (60+)'],
            values: [
              stats.ageDistribution.Children || 0,
              stats.ageDistribution.Adults || 0,
              stats.ageDistribution.Seniors || 0
            ]
          },
          genderDistribution: {
            labels: ['Male', 'Female', 'Other'],
            values: [
              stats.genderDistribution.Male || 0,
              stats.genderDistribution.Female || 0,
              stats.genderDistribution.Other || 0
            ]
          },
          diseaseRisks: {
            labels: ['Diabetes', 'Hypertension', 'Obesity', 'Malnutrition'],
            values: [
              stats.diseaseRisks.suspectedDiabetes || 0,
              stats.diseaseRisks.suspectedHypertension || 0,
              stats.diseaseRisks.suspectedObesity || 0,
              stats.diseaseRisks.suspectedMalnutrition || 0
            ]
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error calculating stats'
    });
  }
};

// @desc    Get public stats for landing page
// @route   GET /api/surveys/public-stats
// @access  Public
exports.getPublicStats = async (req, res) => {
  try {
    const stats = await dbManager.getStats();

    res.status(200).json({
      success: true,
      data: {
        totalSurveys: stats.totalSurveys,
        healthyCount: stats.healthyCount,
        atRiskCount: stats.atRiskCount,
        averageBmi: stats.averageBmi
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error calculating stats'
    });
  }
};
