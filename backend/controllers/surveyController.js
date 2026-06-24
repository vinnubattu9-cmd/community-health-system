const Survey = require('../models/Survey');

// Helper function to perform health analysis
function analyzeHealth(data) {
  const { height, weight, temperature, pulseRate, oxygenLevel, bloodPressureSystolic, bloodPressureDiastolic, bloodSugar } = data;
  
  // BMI calculation: weight (kg) / height (m)^2
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
  let riskPoints = 0;
  let needImpPoints = 0;

  // BMI Recommendations
  if (bmiCategory === 'Underweight') {
    recommendations.push("Increase caloric intake with nutrient-dense foods (nuts, seeds, lean proteins).");
    recommendations.push("Consider strength training to build muscle mass safely.");
    needImpPoints += 1;
  } else if (bmiCategory === 'Overweight') {
    recommendations.push("Incorporate 150 minutes of moderate cardiovascular exercise per week.");
    recommendations.push("Adopt a balanced, portion-controlled diet focusing on whole foods.");
    needImpPoints += 1;
  } else if (bmiCategory === 'Obese') {
    recommendations.push("Consult a nutritionist for a structured weight management plan.");
    recommendations.push("Engage in low-impact activities (swimming, walking) to protect joints.");
    riskPoints += 1.5;
  } else {
    recommendations.push("Maintain your current balanced diet and active lifestyle.");
  }

  // Oxygen Level (SpO2)
  if (oxygenLevel < 92) {
    recommendations.push("CRITICAL: Low blood oxygen (SpO2 < 92%). Seek immediate medical attention.");
    riskPoints += 3;
  } else if (oxygenLevel >= 92 && oxygenLevel < 95) {
    recommendations.push("Mild hypoxia. Rest in a well-ventilated room. Consult a doctor if levels continue to drop.");
    riskPoints += 2;
  }

  // Body Temperature (Celsius)
  if (temperature > 38.5) {
    recommendations.push("High fever detected. Stay hydrated, rest, and consult a healthcare provider.");
    riskPoints += 2;
  } else if (temperature > 37.5 && temperature <= 38.5) {
    recommendations.push("Low-grade fever. Monitor your temperature closely, stay hydrated, and rest.");
    needImpPoints += 1;
  } else if (temperature < 35.5) {
    recommendations.push("Low body temperature (Hypothermia risk). Warm up with layers and consult a doctor.");
    riskPoints += 2;
  }

  // Pulse Rate (bpm)
  if (pulseRate > 100) {
    recommendations.push("High resting heart rate (Tachycardia). Avoid caffeine and manage stress. Consult a doctor.");
    needImpPoints += 1;
    if (pulseRate > 120) riskPoints += 1;
  } else if (pulseRate < 60) {
    recommendations.push("Low heart rate (Bradycardia). Seek medical evaluation if experiencing fatigue or dizziness.");
    needImpPoints += 1;
  }

  // Blood Pressure
  const sys = bloodPressureSystolic;
  const dia = bloodPressureDiastolic;
  if (sys >= 180 || dia >= 120) {
    recommendations.push("CRITICAL: Hypertensive crisis. Seek emergency medical attention immediately.");
    riskPoints += 3;
  } else if (sys >= 140 || dia >= 90) {
    recommendations.push("Stage 2 Hypertension. Limit sodium intake, manage stress, and consult a doctor.");
    riskPoints += 2;
  } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
    recommendations.push("Stage 1 Hypertension. Focus on regular exercise, reducing sodium, and monitoring BP.");
    needImpPoints += 1;
  } else if (sys >= 120 && sys < 130 && dia < 80) {
    recommendations.push("Elevated Blood Pressure. Monitor levels regularly and adopt a heart-healthy diet.");
    needImpPoints += 1;
  } else if (sys < 90 || dia < 60) {
    recommendations.push("Low Blood Pressure (Hypotension). Ensure adequate hydration. Consult a doctor.");
    needImpPoints += 1;
  }

  // Blood Sugar (mg/dL)
  if (bloodSugar >= 200) {
    recommendations.push("High blood sugar (hyperglycemia range). Consult a doctor immediately.");
    riskPoints += 2.5;
  } else if (bloodSugar >= 140 && bloodSugar < 200) {
    recommendations.push("Impaired glucose tolerance (Pre-diabetic levels). Reduce sugar intake.");
    needImpPoints += 1;
  } else if (bloodSugar < 70) {
    recommendations.push("Low blood sugar (hypoglycemia). Consume fast-acting sugar (fruit juice, honey).");
    riskPoints += 2;
  }

  // Final Health Status Classification
  let status = 'Healthy';
  if (riskPoints >= 2 || (riskPoints > 0 && needImpPoints >= 2)) {
    status = 'At Risk';
  } else if (needImpPoints > 0 || riskPoints > 0) {
    status = 'Needs Improvement';
  }

  if (recommendations.length === 0) {
    recommendations.push("Your health parameters are in the optimal range. Continue your healthy routine!");
  }

  return { bmi, bmiCategory, status, recommendations };
}

// @desc    Submit new survey
// @route   POST /api/surveys
// @access  Public
exports.createSurvey = async (req, res) => {
  try {
    const analysis = analyzeHealth(req.body);
    const surveyData = {
      ...req.body,
      ...analysis
    };
    
    const survey = new Survey(surveyData);
    await survey.save();
    
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

// @desc    Get all surveys with filter, search, sorting and pagination
// @route   GET /api/surveys
// @access  Private (Admin)
exports.getSurveys = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Filter by health status
    if (status) {
      query.status = status;
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sort = {};
    sort[sortBy] = sortOrder;

    const skipIndex = (page - 1) * limit;

    const total = await Survey.countDocuments(query);
    const surveys = await Survey.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skipIndex);

    res.status(200).json({
      success: true,
      count: surveys.length,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: surveys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get survey by ID
// @route   GET /api/surveys/:id
// @access  Public
exports.getSurveyById = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    
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

// @desc    Update survey record
// @route   PUT /api/surveys/:id
// @access  Private (Admin)
exports.updateSurvey = async (req, res) => {
  try {
    const analysis = analyzeHealth(req.body);
    const updatedData = {
      ...req.body,
      ...analysis
    };

    const survey = await Survey.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true
    });

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
// @access  Private (Admin)
exports.deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findByIdAndDelete(req.params.id);

    if (!survey) {
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

// @desc    Get dashboard metrics & chart aggregates
// @route   GET /api/surveys/stats
// @access  Private (Admin)
exports.getStats = async (req, res) => {
  try {
    const totalSurveys = await Survey.countDocuments();
    
    // Aggregates
    const healthyCount = await Survey.countDocuments({ status: 'Healthy' });
    const needsImpCount = await Survey.countDocuments({ status: 'Needs Improvement' });
    const atRiskCount = await Survey.countDocuments({ status: 'At Risk' });
    
    // Average BMI calculation
    const avgBmiResult = await Survey.aggregate([
      {
        $group: {
          _id: null,
          avgBmi: { $avg: '$bmi' }
        }
      }
    ]);
    const averageBmi = avgBmiResult.length > 0 ? parseFloat(avgBmiResult[0].avgBmi.toFixed(1)) : 0;

    // BMI categories distribution
    const bmiUnderweight = await Survey.countDocuments({ bmiCategory: 'Underweight' });
    const bmiHealthy = await Survey.countDocuments({ bmiCategory: 'Healthy' });
    const bmiOverweight = await Survey.countDocuments({ bmiCategory: 'Overweight' });
    const bmiObese = await Survey.countDocuments({ bmiCategory: 'Obese' });

    // Age distribution buckets
    const ageUnder18 = await Survey.countDocuments({ age: { $lt: 18 } });
    const age18to35 = await Survey.countDocuments({ age: { $gte: 18, $lte: 35 } });
    const age36to50 = await Survey.countDocuments({ age: { $gte: 36, $lte: 50 } });
    const age51to65 = await Survey.countDocuments({ age: { $gte: 51, $lte: 65 } });
    const ageOver65 = await Survey.countDocuments({ age: { $gt: 65 } });

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalSurveys,
          healthyCount,
          needsImpCount,
          atRiskCount,
          averageBmi
        },
        charts: {
          bmiDistribution: {
            labels: ['Underweight', 'Healthy', 'Overweight', 'Obese'],
            values: [bmiUnderweight, bmiHealthy, bmiOverweight, bmiObese]
          },
          healthStatus: {
            labels: ['Healthy', 'Needs Improvement', 'At Risk'],
            values: [healthyCount, needsImpCount, atRiskCount]
          },
          ageDistribution: {
            labels: ['Under 18', '18-35', '36-50', '51-65', 'Over 65'],
            values: [ageUnder18, age18to35, age36to50, age51to65, ageOver65]
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error calculating stats'
    });
  }
};

// @desc    Get public stats for landing page
// @route   GET /api/surveys/public-stats
// @access  Public
exports.getPublicStats = async (req, res) => {
  try {
    const totalSurveys = await Survey.countDocuments();
    const healthyCount = await Survey.countDocuments({ status: 'Healthy' });
    const atRiskCount = await Survey.countDocuments({ status: 'At Risk' });
    
    const avgBmiResult = await Survey.aggregate([
      {
        $group: {
          _id: null,
          avgBmi: { $avg: '$bmi' }
        }
      }
    ]);
    const averageBmi = avgBmiResult.length > 0 ? parseFloat(avgBmiResult[0].avgBmi.toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalSurveys,
        healthyCount,
        atRiskCount,
        averageBmi
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error calculating stats'
    });
  }
};
