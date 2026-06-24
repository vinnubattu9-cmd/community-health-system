// Automated Test Script for Health Analysis Logic
const assert = require('assert');

// We simulate the analysis logic from our controller to test it in isolation
function analyzeHealth(data) {
  const { height, weight, temperature, pulseRate, oxygenLevel, bloodPressureSystolic, bloodPressureDiastolic, bloodSugar } = data;
  
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

  // BMI
  if (bmiCategory === 'Underweight') {
    recommendations.push("Increase caloric intake");
    needImpPoints += 1;
  } else if (bmiCategory === 'Overweight') {
    recommendations.push("Increase cardiovascular exercise");
    needImpPoints += 1;
  } else if (bmiCategory === 'Obese') {
    recommendations.push("Consult a nutritionist");
    riskPoints += 1.5;
  }

  // Oxygen
  if (oxygenLevel < 92) {
    recommendations.push("CRITICAL: Low blood oxygen");
    riskPoints += 3;
  } else if (oxygenLevel >= 92 && oxygenLevel < 95) {
    recommendations.push("Mild hypoxia");
    riskPoints += 2;
  }

  // Temp
  if (temperature > 38.5) {
    recommendations.push("High fever");
    riskPoints += 2;
  } else if (temperature > 37.5 && temperature <= 38.5) {
    recommendations.push("Low-grade fever");
    needImpPoints += 1;
  } else if (temperature < 35.5) {
    recommendations.push("Hypothermia");
    riskPoints += 2;
  }

  // Pulse
  if (pulseRate > 100) {
    recommendations.push("High heart rate");
    needImpPoints += 1;
    if (pulseRate > 120) riskPoints += 1;
  } else if (pulseRate < 60) {
    recommendations.push("Low heart rate");
    needImpPoints += 1;
  }

  // Blood Pressure
  const sys = bloodPressureSystolic;
  const dia = bloodPressureDiastolic;
  if (sys >= 180 || dia >= 120) {
    recommendations.push("CRITICAL: BP crisis");
    riskPoints += 3;
  } else if (sys >= 140 || dia >= 90) {
    recommendations.push("Stage 2 Hypertension");
    riskPoints += 2;
  } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
    recommendations.push("Stage 1 Hypertension");
    needImpPoints += 1;
  } else if (sys >= 120 && sys < 130 && dia < 80) {
    recommendations.push("Elevated BP");
    needImpPoints += 1;
  } else if (sys < 90 || dia < 60) {
    recommendations.push("Hypotension");
    needImpPoints += 1;
  }

  // Sugar
  if (bloodSugar >= 200) {
    recommendations.push("High blood sugar");
    riskPoints += 2.5;
  } else if (bloodSugar >= 140 && bloodSugar < 200) {
    recommendations.push("Impaired glucose tolerance");
    needImpPoints += 1;
  } else if (bloodSugar < 70) {
    recommendations.push("Low blood sugar");
    riskPoints += 2;
  }

  let status = 'Healthy';
  if (riskPoints >= 2 || (riskPoints > 0 && needImpPoints >= 2)) {
    status = 'At Risk';
  } else if (needImpPoints > 0 || riskPoints > 0) {
    status = 'Needs Improvement';
  }

  return { bmi, bmiCategory, status };
}

// Run Test Cases
function runTests() {
  console.log("Running Health Analysis Vitals & BMI Test Suite...");

  // Test 1: Completely Healthy Subject
  const subject1 = {
    height: 175,
    weight: 70, // BMI = 70 / 1.75^2 = 22.9 (Healthy)
    temperature: 36.6,
    pulseRate: 72,
    oxygenLevel: 98,
    bloodPressureSystolic: 115,
    bloodPressureDiastolic: 75,
    bloodSugar: 90
  };
  const res1 = analyzeHealth(subject1);
  assert.strictEqual(res1.bmi, 22.9);
  assert.strictEqual(res1.bmiCategory, 'Healthy');
  assert.strictEqual(res1.status, 'Healthy');
  console.log("✔ Test 1 passed: Healthy subject evaluated correctly.");

  // Test 2: Overweight, Elevated BP (Needs Improvement)
  const subject2 = {
    height: 180,
    weight: 85, // BMI = 85 / 1.8^2 = 26.2 (Overweight)
    temperature: 36.8,
    pulseRate: 80,
    oxygenLevel: 98,
    bloodPressureSystolic: 125, // Elevated
    bloodPressureDiastolic: 78,
    bloodSugar: 100
  };
  const res2 = analyzeHealth(subject2);
  assert.strictEqual(res2.bmi, 26.2);
  assert.strictEqual(res2.bmiCategory, 'Overweight');
  assert.strictEqual(res2.status, 'Needs Improvement');
  console.log("✔ Test 2 passed: Needs Improvement status evaluated correctly.");

  // Test 3: Hypoxia, Hypertensive Crisis (At Risk)
  const subject3 = {
    height: 170,
    weight: 60, // BMI = 20.8 (Healthy)
    temperature: 37.0,
    pulseRate: 90,
    oxygenLevel: 88, // Critical SpO2 (<92) -> At Risk
    bloodPressureSystolic: 185, // Crisis -> At Risk
    bloodPressureDiastolic: 125, // Crisis -> At Risk
    bloodSugar: 95
  };
  const res3 = analyzeHealth(subject3);
  assert.strictEqual(res3.status, 'At Risk');
  console.log("✔ Test 3 passed: At Risk status (Critical SpO2 & BP) evaluated correctly.");

  // Test 4: Underweight, Hypoglycemia (At Risk)
  const subject4 = {
    height: 165,
    weight: 45, // BMI = 16.5 (Underweight)
    temperature: 36.2,
    pulseRate: 58, // Bradycardia (Needs Imp)
    oxygenLevel: 96,
    bloodPressureSystolic: 105,
    bloodPressureDiastolic: 65,
    bloodSugar: 60 // Hypoglycemia (<70) -> At Risk
  };
  const res4 = analyzeHealth(subject4);
  assert.strictEqual(res4.bmiCategory, 'Underweight');
  assert.strictEqual(res4.status, 'At Risk');
  console.log("✔ Test 4 passed: At Risk status (Hypoglycemia) evaluated correctly.");

  console.log("All tests passed successfully!");
}

runTests();
