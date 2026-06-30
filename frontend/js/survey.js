document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('health-survey-form');
  
  // Form fields
  const heightInput = document.getElementById('height');
  const weightInput = document.getElementById('weight');
  const oxygenInput = document.getElementById('oxygenLevel');
  const systolicInput = document.getElementById('bloodPressureSystolic');
  const diastolicInput = document.getElementById('bloodPressureDiastolic');
  const genderSelect = document.getElementById('gender');

  // Live feedback elements
  const liveBmi = document.getElementById('live-bmi');
  const liveBmiCat = document.getElementById('live-bmi-cat');
  const liveSpo2Alert = document.getElementById('live-spo2-alert');
  const liveBpCat = document.getElementById('live-bp-cat');

  // --- Checkup Type Toggle Logic ---
  const checkupTypeSelect = document.getElementById('checkupType');
  const citizenIdGroup = document.getElementById('group-citizen-id');
  const btnLoadCitizen = document.getElementById('btn-load-citizen');

  checkupTypeSelect.addEventListener('change', () => {
    if (checkupTypeSelect.value === 'followup') {
      citizenIdGroup.style.display = 'block';
    } else {
      citizenIdGroup.style.display = 'none';
    }
  });

  // Load citizen data for follow-up
  btnLoadCitizen.addEventListener('click', async () => {
    const citizenId = document.getElementById('citizenId').value.trim();
    if (!citizenId) {
      showToast('Missing ID', 'Please enter a Citizen Health ID to load.', 'error');
      return;
    }

    try {
      // Fetch the latest survey for this citizen
      const history = await API.getCitizenHistory(citizenId);
      if (!history || history.length === 0) {
        showToast('Not Found', `No records found for Citizen ID: ${citizenId}`, 'error');
        return;
      }

      const latest = history[history.length - 1];
      // Pre-fill form with previous data
      document.getElementById('name').value = latest.name || '';
      document.getElementById('age').value = latest.age || '';
      document.getElementById('gender').value = latest.gender || '';
      document.getElementById('occupation').value = latest.occupation || '';
      document.getElementById('familyId').value = latest.familyId || '';
      document.getElementById('village').value = latest.village || '';
      document.getElementById('address').value = latest.address || '';

      // Lifestyle
      if (latest.lifestyle) {
        document.getElementById('lifestyle-smoking').value = latest.lifestyle.smoking || 'Never';
        document.getElementById('lifestyle-alcohol').value = latest.lifestyle.alcohol || 'Never';
        document.getElementById('lifestyle-exercise').value = latest.lifestyle.exercise || 'None';
        document.getElementById('lifestyle-diet').value = latest.lifestyle.diet || 'Balanced';
      }

      // Medical history
      if (latest.medicalHistory) {
        document.getElementById('history-diabetes').checked = !!latest.medicalHistory.diabetes;
        document.getElementById('history-hypertension').checked = !!latest.medicalHistory.hypertension;
        document.getElementById('history-heart').checked = !!latest.medicalHistory.heartDisease;
        document.getElementById('history-pregnancy').checked = !!latest.medicalHistory.pregnancy;
        document.getElementById('history-meds').value = latest.medicalHistory.medication || '';
      }

      showToast('Citizen Loaded', `Previous data for ${latest.name} loaded. Update vitals and submit.`, 'success');
      updateLiveBmi();
    } catch (err) {
      console.error('Load citizen failed:', err);
    }
  });

  // Show pregnancy checkbox only for female
  genderSelect.addEventListener('change', () => {
    const pregnancyLabel = document.getElementById('label-pregnancy');
    if (genderSelect.value === 'Female') {
      pregnancyLabel.style.display = 'flex';
    } else {
      pregnancyLabel.style.display = 'none';
    }
  });

  // --- Real-time BMI calculation listener ---
  const updateLiveBmi = () => {
    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);

    if (height > 0 && weight > 0) {
      const heightM = height / 100;
      const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
      
      liveBmi.textContent = bmi;
      liveBmi.className = 'feedback-val';
      
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

  // Real-time SpO2 assessment
  oxygenInput.addEventListener('input', () => {
    const spo2 = parseInt(oxygenInput.value);
    if (spo2 > 0) {
      if (spo2 < 92) {
        liveSpo2Alert.textContent = 'Critical!';
        liveSpo2Alert.className = 'feedback-val danger';
      } else if (spo2 < 95) {
        liveSpo2Alert.textContent = 'Low Oxygen';
        liveSpo2Alert.className = 'feedback-val warning';
      } else {
        liveSpo2Alert.textContent = 'Normal';
        liveSpo2Alert.className = 'feedback-val success';
      }
    } else {
      liveSpo2Alert.textContent = '--';
      liveSpo2Alert.className = 'feedback-val';
    }
  });

  // Real-time Blood Pressure assessment
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

  // --- Form submit & validation ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const inputs = form.querySelectorAll('.form-control');
    inputs.forEach(input => input.style.borderColor = '');

    let isValid = true;
    const errors = [];

    const nameVal = document.getElementById('name').value.trim();
    const ageVal = parseInt(document.getElementById('age').value);
    const genderVal = document.getElementById('gender').value;
    const occupationVal = document.getElementById('occupation').value.trim();
    const villageVal = document.getElementById('village').value;
    const heightVal = parseFloat(heightInput.value);
    const weightVal = parseFloat(weightInput.value);
    const tempVal = parseFloat(document.getElementById('temperature').value);
    const pulseVal = parseInt(document.getElementById('pulseRate').value);
    const spo2Val = parseInt(oxygenInput.value);
    const sugarVal = parseInt(document.getElementById('bloodSugar').value);
    const sysVal = parseInt(systolicInput.value);
    const diaVal = parseInt(diastolicInput.value);

    const markInvalid = (id, errorMsg) => {
      const el = document.getElementById(id);
      if (el) el.style.borderColor = 'var(--danger)';
      errors.push(errorMsg);
      isValid = false;
    };

    if (!nameVal) markInvalid('name', 'Full Name is required.');
    if (isNaN(ageVal) || ageVal < 1 || ageVal > 120) markInvalid('age', 'Age must be between 1 and 120.');
    if (!genderVal) markInvalid('gender', 'Please select a gender.');
    if (!occupationVal) markInvalid('occupation', 'Occupation is required.');
    if (!villageVal) markInvalid('village', 'Village / Ward is required.');
    
    if (isNaN(heightVal) || heightVal < 30 || heightVal > 300) markInvalid('height', 'Height must be 30–300 cm.');
    if (isNaN(weightVal) || weightVal < 2 || weightVal > 500) markInvalid('weight', 'Weight must be 2–500 kg.');
    if (isNaN(tempVal) || tempVal < 30 || tempVal > 45) markInvalid('temperature', 'Temperature must be 30–45 °C.');
    if (isNaN(pulseVal) || pulseVal < 20 || pulseVal > 250) markInvalid('pulseRate', 'Pulse rate must be 20–250 bpm.');
    if (isNaN(spo2Val) || spo2Val < 50 || spo2Val > 100) markInvalid('oxygenLevel', 'SpO2 must be 50–100%.');
    if (isNaN(sugarVal) || sugarVal < 20 || sugarVal > 1000) markInvalid('bloodSugar', 'Blood sugar must be 20–1000 mg/dL.');
    if (isNaN(sysVal) || sysVal < 50 || sysVal > 250) markInvalid('bloodPressureSystolic', 'Systolic BP must be 50–250 mmHg.');
    if (isNaN(diaVal) || diaVal < 30 || diaVal > 150) markInvalid('bloodPressureDiastolic', 'Diastolic BP must be 30–150 mmHg.');

    if (!isValid) {
      showToast('Validation Error', errors[0], 'error');
      return;
    }

    // Collect optional fields
    const citizenIdVal = document.getElementById('citizenId').value.trim() || null;
    const familyIdVal = document.getElementById('familyId').value.trim();
    const addressVal = document.getElementById('address').value.trim();

    const lifestyleVal = {
      smoking: document.getElementById('lifestyle-smoking').value,
      alcohol: document.getElementById('lifestyle-alcohol').value,
      exercise: document.getElementById('lifestyle-exercise').value,
      diet: document.getElementById('lifestyle-diet').value,
    };

    const medicalHistoryVal = {
      diabetes: document.getElementById('history-diabetes').checked,
      hypertension: document.getElementById('history-hypertension').checked,
      heartDisease: document.getElementById('history-heart').checked,
      pregnancy: document.getElementById('history-pregnancy').checked,
      medication: document.getElementById('history-meds').value.trim() || 'None',
    };

    const surveyPayload = {
      name: nameVal,
      age: ageVal,
      gender: genderVal,
      occupation: occupationVal,
      village: villageVal,
      address: addressVal,
      familyId: familyIdVal,
      height: heightVal,
      weight: weightVal,
      temperature: tempVal,
      pulseRate: pulseVal,
      oxygenLevel: spo2Val,
      bloodPressureSystolic: sysVal,
      bloodPressureDiastolic: diaVal,
      bloodSugar: sugarVal,
      lifestyle: lifestyleVal,
      medicalHistory: medicalHistoryVal
    };

    // If re-check, include previous citizenId to maintain history chain
    if (citizenIdVal) {
      surveyPayload.citizenId = citizenIdVal;
    }

    try {
      const savedSurvey = await API.submitSurvey(surveyPayload);
      if (savedSurvey && (savedSurvey._id || savedSurvey.id)) {
        const id = savedSurvey._id || savedSurvey.id;
        window.location.href = `report.html?id=${id}`;
      }
    } catch (err) {
      console.error('Submission failed:', err);
    }
  });
});
