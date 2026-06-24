document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const surveyId = urlParams.get('id');

  if (!surveyId) {
    showToast('Missing Report ID', 'Redirecting you to the health survey...', 'error');
    setTimeout(() => {
      window.location.href = 'survey.html';
    }, 2000);
    return;
  }

  // Load Survey Report
  try {
    const data = await API.getSurvey(surveyId);
    renderReport(data);
  } catch (error) {
    console.error('Error loading report:', error);
    // If not found, display message in card
    const cardBody = document.querySelector('.report-body');
    cardBody.innerHTML = `
      <div style="text-align: center; padding: 40px 0;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--danger); margin-bottom: 20px;"></i>
        <h3>Report Not Found</h3>
        <p style="color: var(--text-muted); margin-bottom: 24px;">The requested health record could not be loaded from our database.</p>
        <a href="survey.html" class="btn btn-primary">Take a New Survey</a>
      </div>
    `;
    document.querySelector('.report-actions').style.display = 'none';
  }

  // Render function
  function renderReport(data) {
    // Header & Meta
    document.getElementById('report-date').textContent = `Date: ${new Date(data.createdAt).toLocaleDateString()} ${new Date(data.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    
    const statusEl = document.getElementById('report-status');
    statusEl.textContent = data.status;
    statusEl.className = 'report-badge'; // reset
    if (data.status === 'Healthy') {
      statusEl.classList.add('healthy');
    } else if (data.status === 'Needs Improvement') {
      statusEl.classList.add('warning');
    } else {
      statusEl.classList.add('danger');
    }

    // Subject Information
    document.getElementById('report-name').textContent = data.name;
    document.getElementById('report-age-gender').textContent = `${data.age} Yrs / ${data.gender}`;
    document.getElementById('report-occupation').textContent = data.occupation;
    document.getElementById('report-id').textContent = data._id;

    // BMI
    document.getElementById('report-bmi').textContent = `${data.bmi} kg/m² (${data.weight}kg / ${data.height}cm)`;
    const bmiCatEl = document.getElementById('report-bmi-cat');
    bmiCatEl.textContent = data.bmiCategory;
    bmiCatEl.className = 'vital-status'; // reset
    if (data.bmiCategory === 'Healthy') bmiCatEl.classList.add('healthy');
    else if (data.bmiCategory === 'Underweight' || data.bmiCategory === 'Overweight') bmiCatEl.classList.add('warning');
    else bmiCatEl.classList.add('danger');

    // Temperature
    document.getElementById('report-temp').textContent = `${data.temperature} °C`;
    const tempStatusEl = document.getElementById('report-temp-status');
    if (data.temperature > 38.5) {
      tempStatusEl.textContent = 'Fever';
      tempStatusEl.className = 'vital-status danger';
    } else if (data.temperature > 37.5 && data.temperature <= 38.5) {
      tempStatusEl.textContent = 'Mild Fever';
      tempStatusEl.className = 'vital-status warning';
    } else if (data.temperature < 35.5) {
      tempStatusEl.textContent = 'Low Temp';
      tempStatusEl.className = 'vital-status danger';
    } else {
      tempStatusEl.textContent = 'Normal';
      tempStatusEl.className = 'vital-status healthy';
    }

    // Pulse Rate
    document.getElementById('report-pulse').textContent = `${data.pulseRate} bpm`;
    const pulseStatusEl = document.getElementById('report-pulse-status');
    if (data.pulseRate > 100) {
      pulseStatusEl.textContent = 'Tachycardia';
      pulseStatusEl.className = 'vital-status danger';
    } else if (data.pulseRate < 60) {
      pulseStatusEl.textContent = 'Bradycardia';
      pulseStatusEl.className = 'vital-status warning';
    } else {
      pulseStatusEl.textContent = 'Normal';
      pulseStatusEl.className = 'vital-status healthy';
    }

    // SpO2
    document.getElementById('report-oxygen').textContent = `${data.oxygenLevel} %`;
    const oxyStatusEl = document.getElementById('report-oxygen-status');
    if (data.oxygenLevel < 92) {
      oxyStatusEl.textContent = 'Critical Hypoxia';
      oxyStatusEl.className = 'vital-status danger';
    } else if (data.oxygenLevel >= 92 && data.oxygenLevel < 95) {
      oxyStatusEl.textContent = 'Mild Hypoxia';
      oxyStatusEl.className = 'vital-status warning';
    } else {
      oxyStatusEl.textContent = 'Normal';
      oxyStatusEl.className = 'vital-status healthy';
    }

    // Blood Pressure
    document.getElementById('report-bp').textContent = `${data.bloodPressureSystolic}/${data.bloodPressureDiastolic} mmHg`;
    const bpStatusEl = document.getElementById('report-bp-status');
    const sys = data.bloodPressureSystolic;
    const dia = data.bloodPressureDiastolic;
    
    if (sys >= 180 || dia >= 120) {
      bpStatusEl.textContent = 'BP Crisis';
      bpStatusEl.className = 'vital-status danger';
    } else if (sys >= 140 || dia >= 90) {
      bpStatusEl.textContent = 'Hypertension Stg 2';
      bpStatusEl.className = 'vital-status danger';
    } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      bpStatusEl.textContent = 'Hypertension Stg 1';
      bpStatusEl.className = 'vital-status warning';
    } else if (sys >= 120 && sys < 130 && dia < 80) {
      bpStatusEl.textContent = 'Elevated BP';
      bpStatusEl.className = 'vital-status warning';
    } else if (sys < 90 || dia < 60) {
      bpStatusEl.textContent = 'Hypotension';
      bpStatusEl.className = 'vital-status warning';
    } else {
      bpStatusEl.textContent = 'Normal';
      bpStatusEl.className = 'vital-status healthy';
    }

    // Blood Sugar
    document.getElementById('report-sugar').textContent = `${data.bloodSugar} mg/dL`;
    const sugarStatusEl = document.getElementById('report-sugar-status');
    if (data.bloodSugar >= 200) {
      sugarStatusEl.textContent = 'Hyperglycemia';
      sugarStatusEl.className = 'vital-status danger';
    } else if (data.bloodSugar >= 140 && data.bloodSugar < 200) {
      sugarStatusEl.textContent = 'Pre-diabetic';
      sugarStatusEl.className = 'vital-status warning';
    } else if (data.bloodSugar < 70) {
      sugarStatusEl.textContent = 'Hypoglycemia';
      sugarStatusEl.className = 'vital-status danger';
    } else {
      sugarStatusEl.textContent = 'Normal';
      sugarStatusEl.className = 'vital-status healthy';
    }

    // Recommendations List
    const recBox = document.getElementById('recommendations-container');
    const recList = document.getElementById('report-recommendations-list');
    recList.innerHTML = '';
    
    // Style adjustments based on overall health status
    if (data.status === 'At Risk') {
      recBox.className = 'recommendations-box danger-style';
    } else {
      recBox.className = 'recommendations-box';
    }

    data.recommendations.forEach(rec => {
      const li = document.createElement('li');
      li.textContent = rec;
      recList.appendChild(li);
    });

    // Wire actions
    // Share Report
    document.getElementById('btn-share-report').onclick = () => {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          showToast('Share Link Copied', 'Health report URL written to clipboard', 'success');
        })
        .catch(err => {
          showToast('Share Error', 'Failed to copy report link', 'error');
        });
    };

    // Print Report
    document.getElementById('btn-print-report').onclick = () => {
      window.print();
    };

    // Download PDF Report via html2pdf
    document.getElementById('btn-download-pdf').onclick = () => {
      showLoader(true);
      const element = document.getElementById('health-report-card');
      const opt = {
        margin:       10,
        filename:     `CommHealth_Report_${data.name.replace(/\s+/g, '_')}_${data._id}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        showLoader(false);
        showToast('PDF Downloaded', 'Health report saved successfully', 'success');
      }).catch(err => {
        showLoader(false);
        showToast('PDF Export Failed', err.message, 'error');
      });
    };
  }
});
