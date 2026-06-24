document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('health-survey-form');
  
  // Form fields
  const heightInput = document.getElementById('height');
  const weightInput = document.getElementById('weight');
  const oxygenInput = document.getElementById('oxygenLevel');
  const systolicInput = document.getElementById('bloodPressureSystolic');
  const diastolicInput = document.getElementById('bloodPressureDiastolic');

  // Live feedback elements
  const liveBmi = document.getElementById('live-bmi');
  const liveBmiCat = document.getElementById('live-bmi-cat');
  const liveSpo2Alert = document.getElementById('live-spo2-alert');
  const liveBpCat = document.getElementById('live-bp-cat');

  // Real-time BMI calculation listener
  const updateLiveBmi = () => {
    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);

    if (height > 0 && weight > 0) {
      const heightM = height / 100;
      const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
      
      liveBmi.textContent = bmi;
      liveBmi.className = 'feedback-val'; // reset class
      
      if (bmi < 18.5) {
        liveBmiCat.textContent = 'Underweight';
        liveBmiCat.className = 'feedback-val warning';
      } else if (bmi >= 18.5 && bmi < 25.0) {
        liveBmiCat.textContent = 'Healthy';
        liveBmiCat.className = 'feedback-val success';
      } else if (bmi >= 25.0 && bmi < 30.0) {
        liveBmiCat.textContent = 'Overweight';
        liveBmiCat.className = 'feedback-val warning';
      } else {
        liveBmiCat.textContent = 'Obese';
        liveBmiCat.className = 'feedback-val danger';
      }
    } else {
      liveBmi.textContent = '--';
      liveBmiCat.textContent = '--';
      liveBmiCat.className = 'feedback-val';
    }
  };

  heightInput.addEventListener('input', updateLiveBmi);
  weightInput.addEventListener('input', updateLiveBmi);

  // Real-time SpO2 assessment listener
  oxygenInput.addEventListener('input', () => {
    const spo2 = parseInt(oxygenInput.value);
    
    if (spo2 > 0) {
      if (spo2 < 95) {
        liveSpo2Alert.textContent = 'Low Oxygen!';
        liveSpo2Alert.className = 'feedback-val danger';
      } else {
        liveSpo2Alert.textContent = 'Normal';
        liveSpo2Alert.className = 'feedback-val success';
      }
    } else {
      liveSpo2Alert.textContent = '--';
      liveSpo2Alert.className = 'feedback-val';
    }
  });

  // Real-time Blood Pressure assessment listener
  const updateLiveBp = () => {
    const sys = parseInt(systolicInput.value);
    const dia = parseInt(diastolicInput.value);

    if (sys > 0 && dia > 0) {
      if (sys >= 180 || dia >= 120) {
        liveBpCat.textContent = 'Crisis!';
        liveBpCat.className = 'feedback-val danger';
      } else if (sys >= 140 || dia >= 90) {
        liveBpCat.textContent = 'Hypertension Stg 2';
        liveBpCat.className = 'feedback-val danger';
      } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
        liveBpCat.textContent = 'Hypertension Stg 1';
        liveBpCat.className = 'feedback-val warning';
      } else if (sys >= 120 && sys < 130 && dia < 80) {
        liveBpCat.textContent = 'Elevated';
        liveBpCat.className = 'feedback-val warning';
      } else if (sys < 90 || dia < 60) {
        liveBpCat.textContent = 'Hypotension';
        liveBpCat.className = 'feedback-val warning';
      } else {
        liveBpCat.textContent = 'Normal';
        liveBpCat.className = 'feedback-val success';
      }
    } else {
      liveBpCat.textContent = '--';
      liveBpCat.className = 'feedback-val';
    }
  };

  systolicInput.addEventListener('input', updateLiveBp);
  diastolicInput.addEventListener('input', updateLiveBp);

  // Form submit & custom verification logic
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous error borders
    const inputs = form.querySelectorAll('.form-control');
    inputs.forEach(input => input.style.borderColor = '');

    // List of validations
    let isValid = true;
    const errors = [];

    const nameVal = document.getElementById('name').value.trim();
    const ageVal = parseInt(document.getElementById('age').value);
    const genderVal = document.getElementById('gender').value;
    const occupationVal = document.getElementById('occupation').value.trim();
    const heightVal = parseFloat(heightInput.value);
    const weightVal = parseFloat(weightInput.value);
    const tempVal = parseFloat(document.getElementById('temperature').value);
    const pulseVal = parseInt(document.getElementById('pulseRate').value);
    const spo2Val = parseInt(oxygenInput.value);
    const sugarVal = parseInt(document.getElementById('bloodSugar').value);
    const sysVal = parseInt(systolicInput.value);
    const diaVal = parseInt(diastolicInput.value);

    // Helper functions for showing element errors
    const markInvalid = (id, errorMsg) => {
      document.getElementById(id).style.borderColor = 'var(--danger)';
      errors.push(errorMsg);
      isValid = false;
    };

    // Validation checks
    if (!nameVal) markInvalid('name', 'Full Name is required.');
    if (isNaN(ageVal) || ageVal < 1 || ageVal > 120) markInvalid('age', 'Age must be between 1 and 120.');
    if (!genderVal) markInvalid('gender', 'Please select a gender.');
    if (!occupationVal) markInvalid('occupation', 'Occupation is required.');
    
    if (isNaN(heightVal) || heightVal < 30 || heightVal > 300) markInvalid('height', 'Height must be between 30 and 300 cm.');
    if (isNaN(weightVal) || weightVal < 2 || weightVal > 500) markInvalid('weight', 'Weight must be between 2 and 500 kg.');
    if (isNaN(tempVal) || tempVal < 30 || tempVal > 45) markInvalid('temperature', 'Temperature must be between 30.0°C and 45.0°C.');
    if (isNaN(pulseVal) || pulseVal < 20 || pulseVal > 250) markInvalid('pulseRate', 'Pulse rate must be between 20 and 250 bpm.');
    if (isNaN(spo2Val) || spo2Val < 50 || spo2Val > 100) markInvalid('oxygenLevel', 'SpO2 level must be between 50% and 100%.');
    if (isNaN(sugarVal) || sugarVal < 20 || sugarVal > 1000) markInvalid('bloodSugar', 'Blood sugar must be between 20 and 1000 mg/dL.');
    if (isNaN(sysVal) || sysVal < 50 || sysVal > 250) markInvalid('bloodPressureSystolic', 'Systolic pressure must be between 50 and 250 mmHg.');
    if (isNaN(diaVal) || diaVal < 30 || diaVal > 150) markInvalid('bloodPressureDiastolic', 'Diastolic pressure must be between 30 and 150 mmHg.');

    if (!isValid) {
      showToast('Validation Error', errors[0], 'error');
      return;
    }

    // Prepare payload
    const surveyPayload = {
      name: nameVal,
      age: ageVal,
      gender: genderVal,
      occupation: occupationVal,
      height: heightVal,
      weight: weightVal,
      temperature: tempVal,
      pulseRate: pulseVal,
      oxygenLevel: spo2Val,
      bloodPressureSystolic: sysVal,
      bloodPressureDiastolic: diaVal,
      bloodSugar: sugarVal
    };

    try {
      const savedSurvey = await API.submitSurvey(surveyPayload);
      if (savedSurvey && savedSurvey._id) {
        // Redirect to report page passing survey ID in query parameters
        window.location.href = `report.html?id=${savedSurvey._id}`;
      }
    } catch (err) {
      console.error('Submission failed:', err);
    }
  });
});
