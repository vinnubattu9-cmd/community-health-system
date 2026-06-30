const dbManager = require('../config/dbManager');

// @desc    Get High-Priority Follow-up List (ASHA/ANM Workers)
// @route   GET /api/plans/priority-list
// @access  Private
exports.getPriorityList = async (req, res) => {
  try {
    const { village = '' } = req.query;
    
    // Get all surveys using dbManager
    const result = await dbManager.getSurveys({
      page: 1,
      limit: 1000, // Fetch large limit to process aggregates
      village
    });

    const surveys = result.data;

    // Filter and map high priority patients
    const priorityList = [];

    surveys.forEach(s => {
      // We only prioritize individuals who are At Risk or have clear vital alerts
      if (s.status === 'At Risk' || s.oxygenLevel < 95 || s.bloodPressureSystolic >= 140 || s.bloodPressureDiastolic >= 90 || s.bloodSugar >= 200 || s.temperature > 38.0) {
        
        let reason = '';
        let action = '';

        if (s.oxygenLevel < 92) {
          reason = 'Critical Oxygen Level';
          action = 'Immediate Hospital Referral & Oxygen Support';
        } else if (s.bloodPressureSystolic >= 180 || s.bloodPressureDiastolic >= 120) {
          reason = 'Hypertensive Emergency';
          action = 'Urgent Doctor Referral & BP Medication Review';
        } else if (s.bloodSugar >= 250) {
          reason = 'Severe Hyperglycemia';
          action = 'Referral for Insulin/Sugar Testing & Diabetic Consultation';
        } else if (s.temperature > 38.5) {
          reason = 'High Fever';
          action = 'Provide Antipyretics & Monitor for Infection';
        } else if (s.oxygenLevel >= 92 && s.oxygenLevel < 95) {
          reason = 'Mild Hypoxia';
          action = 'Monitor Oxygen SpO2 daily & rest';
        } else if (s.bloodPressureSystolic >= 140 || s.bloodPressureDiastolic >= 90) {
          reason = 'High Blood Pressure';
          action = 'Conduct Home Visit for BP Re-check & Salt Reduction Advice';
        } else if (s.bloodSugar >= 200 && s.bloodSugar < 250) {
          reason = 'High Blood Sugar';
          action = 'Conduct Home Visit for Blood Glucose Check & Sugar Restriction';
        } else if (s.status === 'At Risk') {
          reason = 'Multiple Vital Deviations';
          action = 'Schedule Comprehensive PHC Check-up';
        } else {
          reason = 'General Assessment Follow-up';
          action = 'Routine ANM Home Check-up';
        }

        priorityList.push({
          id: s._id || s.id,
          citizenId: s.citizenId,
          name: s.name,
          age: s.age,
          gender: s.gender,
          village: s.village,
          status: s.status,
          healthScore: s.healthScore || 0,
          reason,
          action,
          date: s.createdAt
        });
      }
    });

    // Sort priority list: lower health score first (i.e. sicker patients first)
    priorityList.sort((a, b) => a.healthScore - b.healthScore);

    res.status(200).json({
      success: true,
      count: priorityList.length,
      data: priorityList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error generating priority list'
    });
  }
};

// @desc    Get Health Camp & Awareness Recommendations
// @route   GET /api/plans/camp-recommendations
// @access  Private (ANM / PHC / NGO)
exports.getCampRecommendations = async (req, res) => {
  try {
    const { village = '' } = req.query;

    const result = await dbManager.getSurveys({
      page: 1,
      limit: 1000,
      village
    });

    const surveys = result.data;

    // Group citizens by village
    const villageData = {};

    surveys.forEach(s => {
      const v = s.village || 'General';
      if (!villageData[v]) {
        villageData[v] = {
          villageName: v,
          totalSurveyed: 0,
          highBpCount: 0,
          highSugarCount: 0,
          underweightCount: 0,
          pregnantCount: 0
        };
      }

      const vStats = villageData[v];
      vStats.totalSurveyed++;

      if (s.diseaseAnalysis) {
        if (s.diseaseAnalysis.suspectedHypertension) vStats.highBpCount++;
        if (s.diseaseAnalysis.suspectedDiabetes) vStats.highSugarCount++;
        if (s.diseaseAnalysis.suspectedMalnutrition) vStats.underweightCount++;
      }
      if (s.medicalHistory && s.medicalHistory.pregnancy) {
        vStats.pregnantCount++;
      }
    });

    // Generate recommendations per village
    const recommendations = [];

    Object.values(villageData).forEach(v => {
      const camps = [];

      // 1. Hypertension Camp
      if (v.highBpCount >= 5 || (v.totalSurveyed >= 10 && (v.highBpCount / v.totalSurveyed) >= 0.20)) {
        camps.push({
          type: 'Hypertension Screening & Heart Wellness Camp',
          reason: `${v.highBpCount} out of ${v.totalSurveyed} surveyed citizens exhibit high blood pressure or chronic hypertension.`,
          priority: v.highBpCount >= 10 ? 'High' : 'Medium',
          awarenessTopic: 'Salt Reduction & Hypertension Prevention'
        });
      }

      // 2. Diabetes Camp
      if (v.highSugarCount >= 5 || (v.totalSurveyed >= 10 && (v.highSugarCount / v.totalSurveyed) >= 0.15)) {
        camps.push({
          type: 'Diabetes Screening & Glucometer Check Camp',
          reason: `${v.highSugarCount} citizens are suspected of high blood sugar or diabetes.`,
          priority: v.highSugarCount >= 10 ? 'High' : 'Medium',
          awarenessTopic: 'Managing Carbohydrate Intake & Healthy Cooking'
        });
      }

      // 3. Nutrition Camp
      if (v.underweightCount >= 5 || (v.totalSurveyed >= 10 && (v.underweightCount / v.totalSurveyed) >= 0.20)) {
        camps.push({
          type: 'Nutritional Support & Growth Monitoring Camp',
          reason: `${v.underweightCount} underweight citizens need nutrition counseling and child growth mapping.`,
          priority: v.underweightCount >= 10 ? 'High' : 'Medium',
          awarenessTopic: 'Balanced Diet & Handwashing Hygiene'
        });
      }

      // 4. Maternal Health Camp
      if (v.pregnantCount >= 3) {
        camps.push({
          type: 'Maternal Care & Antenatal Check-up Camp',
          reason: `${v.pregnantCount} active pregnancies require prenatal check-ups, vaccines, and IFA tablet distribution.`,
          priority: 'High',
          awarenessTopic: 'Antenatal Checkups, Breastfeeding, & Neonatal Care'
        });
      }

      // If no camps triggers, give a general health check recommendation
      if (camps.length === 0 && v.totalSurveyed > 0) {
        camps.push({
          type: 'General Health Awareness & Sanitation Drive',
          reason: `No immediate risk clustering detected. General prevention check recommended.`,
          priority: 'Low',
          awarenessTopic: 'General Hygiene, Clean Drinking Water, & Vaccine Schedules'
        });
      }

      recommendations.push({
        village: v.villageName,
        totalSurveyed: v.totalSurveyed,
        camps
      });
    });

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error generating camp recommendations'
    });
  }
};

// @desc    Generate Village Health Action Plan
// @route   GET /api/plans/action-plan/:village
// @access  Private (ANM / PHC / Gram Sachivalayam)
exports.getVillageActionPlan = async (req, res) => {
  try {
    const village = req.params.village;

    const result = await dbManager.getSurveys({
      page: 1,
      limit: 1000,
      village
    });

    const surveys = result.data;
    const totalSurveyed = surveys.length;

    if (totalSurveyed === 0) {
      return res.status(404).json({
        success: false,
        message: `No survey records found for village: ${village}`
      });
    }

    // Counts
    let highRiskCount = 0;
    let modRiskCount = 0;
    let childCount = 0;
    let seniorCount = 0;
    let pregnantCount = 0;
    let diabeticRisk = 0;
    let bpRisk = 0;
    let obeseRisk = 0;
    let underweightRisk = 0;

    const patientsToVisit = [];

    surveys.forEach(s => {
      if (s.status === 'At Risk') {
        highRiskCount++;
        // Add to urgent visit list
        patientsToVisit.push({
          name: s.name,
          citizenId: s.citizenId,
          age: s.age,
          gender: s.gender,
          vitalDeviation: s.bloodPressureSystolic >= 140 ? 'High BP' : s.bloodSugar >= 200 ? 'High Sugar' : s.oxygenLevel < 95 ? 'Hypoxia' : 'Multiple issues',
          status: 'At Risk',
          healthScore: s.healthScore || 0
        });
      } else if (s.status === 'Needs Improvement') {
        modRiskCount++;
      }

      if (s.age < 18) childCount++;
      else if (s.age >= 60) seniorCount++;

      if (s.medicalHistory && s.medicalHistory.pregnancy) pregnantCount++;

      if (s.diseaseAnalysis) {
        if (s.diseaseAnalysis.suspectedDiabetes) diabeticRisk++;
        if (s.diseaseAnalysis.suspectedHypertension) bpRisk++;
        if (s.diseaseAnalysis.suspectedObesity) obeseRisk++;
        if (s.diseaseAnalysis.suspectedMalnutrition) underweightRisk++;
      }
    });

    // Sort patients to visit by severity
    patientsToVisit.sort((a, b) => a.healthScore - b.healthScore);

    // Create action recommendations list
    const actionPlanRecommendations = [];
    if (bpRisk > 0) {
      actionPlanRecommendations.push(`${bpRisk} citizens require Blood Pressure follow-ups.`);
    }
    if (diabeticRisk > 0) {
      actionPlanRecommendations.push(`${diabeticRisk} citizens require Diabetes screening & sugar control advice.`);
    }
    if (underweightRisk > 0) {
      actionPlanRecommendations.push(`${underweightRisk} underweight citizens require nutritional guidance and support.`);
    }
    if (pregnantCount > 0) {
      actionPlanRecommendations.push(`${pregnantCount} pregnant women require regular Antenatal Care (ANC) follow-ups.`);
    }

    // Determine camps
    const recommendedCamps = [];
    if (bpRisk >= 5) recommendedCamps.push('Organise one Hypertension Screening Camp this month.');
    if (diabeticRisk >= 5) recommendedCamps.push('Organise one Diabetes Screening & Glucometer Check Camp.');
    if (underweightRisk >= 5) recommendedCamps.push('Organise one Nutrition Counseling & Supplement Distribution session.');
    if (pregnantCount >= 3) recommendedCamps.push('Coordinate with PHC to host a Maternal Care Clinic day.');

    if (recommendedCamps.length === 0) {
      recommendedCamps.push('Conduct standard door-to-door sanitation and immunization awareness drives.');
    }

    res.status(200).json({
      success: true,
      data: {
        village,
        totalSurveyed,
        highRiskCount,
        modRiskCount,
        demographics: {
          children: childCount,
          seniors: seniorCount,
          pregnantWomen: pregnantCount
        },
        diseaseRisks: {
          suspectedDiabetes: diabeticRisk,
          suspectedHypertension: bpRisk,
          suspectedObesity: obeseRisk,
          suspectedMalnutrition: underweightRisk
        },
        actionPlanRecommendations,
        recommendedCamps,
        urgentVisits: patientsToVisit.slice(0, 10) // Limit to top 10 urgent visits for the plan view
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server Error generating village action plan'
    });
  }
};
