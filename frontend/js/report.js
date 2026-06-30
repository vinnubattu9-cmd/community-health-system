document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const surveyId = params.get('id');

  if (!surveyId) {
    document.getElementById('report-name').textContent = 'Error: No Report ID';
    return;
  }

  let surveyData = null;

  try {
    surveyData = await API.getSurvey(surveyId);
  } catch (err) {
    document.getElementById('report-name').textContent = 'Report Not Found';
    return;
  }

  // --- Populate Header ---
  document.getElementById('report-name').textContent = surveyData.name;
  document.getElementById('report-meta').textContent =
    `${surveyData.age} years • ${surveyData.gender} • ${surveyData.occupation}`;
  document.getElementById('report-citizen-id').textContent =
    `Health ID: ${surveyData.citizenId || 'N/A'} | Village: ${surveyData.village || 'N/A'}`;
  document.getElementById('report-date').textContent =
    `Generated: ${new Date(surveyData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  // --- Health Score ---
  const score = surveyData.healthScore || 0;
  document.getElementById('health-score-display').textContent = score;
  const scoreDisplay = document.getElementById('health-score-display');
  if (score >= 80) scoreDisplay.style.color = 'var(--success)';
  else if (score >= 60) scoreDisplay.style.color = 'var(--warning)';
  else scoreDisplay.style.color = 'var(--danger)';

  // --- Status Badge ---
  const badgeEl = document.getElementById('report-status-badge');
  const status = surveyData.status || 'Healthy';
  badgeEl.textContent = status;
  if (status === 'Healthy') badgeEl.className = 'report-badge healthy';
  else if (status === 'Needs Improvement') badgeEl.className = 'report-badge warning';
  else badgeEl.className = 'report-badge danger';

  // --- Citizen Health Card ---
  document.getElementById('card-citizen-name').textContent = surveyData.name;
  document.getElementById('card-citizen-id').textContent = surveyData.citizenId || 'CH-XXXX';
  document.getElementById('card-demographics').textContent =
    `${surveyData.age} yrs | ${surveyData.gender} | BMI: ${surveyData.bmi}`;
  document.getElementById('card-village').textContent = surveyData.village || 'N/A';

  // Next checkup calculation based on status
  const nextCheckupDate = new Date();
  if (status === 'At Risk') nextCheckupDate.setMonth(nextCheckupDate.getMonth() + 1);
  else if (status === 'Needs Improvement') nextCheckupDate.setMonth(nextCheckupDate.getMonth() + 3);
  else nextCheckupDate.setMonth(nextCheckupDate.getMonth() + 6);
  document.getElementById('card-next-checkup').textContent =
    `Next Checkup: ${nextCheckupDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;

  const cardRiskEl = document.getElementById('card-risk-status');
  cardRiskEl.textContent = status.toUpperCase();
  if (status === 'Healthy') cardRiskEl.className = 'card-risk-status healthy';
  else if (status === 'Needs Improvement') cardRiskEl.className = 'card-risk-status needs-improvement';
  else cardRiskEl.className = 'card-risk-status at-risk';

  // --- QR Code Generation ---
  const reportUrl = window.location.href;
  const qrContainer = document.getElementById('citizen-qr-code');
  try {
    new QRCode(qrContainer, {
      text: reportUrl,
      width: 68,
      height: 68,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (qrErr) {
    qrContainer.innerHTML = '<i class="fa-solid fa-qrcode" style="font-size: 2rem; color: #94a3b8;"></i>';
  }

  // --- Disease Risk Analysis ---
  const da = surveyData.diseaseAnalysis;
  if (da && (da.suspectedDiabetes || da.suspectedHypertension || da.suspectedObesity || da.suspectedMalnutrition)) {
    const section = document.getElementById('disease-analysis-section');
    section.style.display = 'block';
    const grid = document.getElementById('disease-analysis-grid');

    const risks = [
      { key: 'suspectedDiabetes', label: 'Possible Diabetes Risk', icon: 'fa-droplet', color: 'var(--warning)' },
      { key: 'suspectedHypertension', label: 'Possible Hypertension Risk', icon: 'fa-gauge-high', color: 'var(--danger)' },
      { key: 'suspectedObesity', label: 'Possible Obesity Risk', icon: 'fa-weight-scale', color: 'var(--warning)' },
      { key: 'suspectedMalnutrition', label: 'Possible Malnutrition Risk', icon: 'fa-bowl-food', color: 'var(--primary)' },
    ];

    risks.forEach(r => {
      const flagged = da[r.key];
      const card = document.createElement('div');
      card.style.cssText = `display:flex;align-items:center;gap:12px;padding:14px;border-radius:var(--radius-sm);background:${flagged ? 'var(--warning-light)' : 'var(--bg-tertiary)'};border:1px solid ${flagged ? 'var(--warning)' : 'var(--border-color)'};`;
      card.innerHTML = `
        <i class="fa-solid ${r.icon}" style="font-size:1.3rem;color:${flagged ? r.color : 'var(--text-muted)'};width:28px;text-align:center;"></i>
        <div>
          <div style="font-weight:700;font-size:0.9rem;color:${flagged ? 'var(--text-primary)' : 'var(--text-muted)'}">${r.label}</div>
          <div style="font-size:0.75rem;color:${flagged ? r.color : 'var(--text-muted)'};font-weight:700;">${flagged ? '⚠ FLAGGED – Clinical Review Recommended' : '✓ Not Detected'}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // --- Vital Signs Grid ---
  const vitalsGrid = document.getElementById('vitals-grid');
  const vitals = [
    { label: 'BMI', value: `${surveyData.bmi}`, sub: surveyData.bmiCategory, icon: 'fa-weight-scale', status: ['Healthy'].includes(surveyData.bmiCategory) ? 'normal' : 'alert' },
    { label: 'Blood Pressure', value: `${surveyData.bloodPressureSystolic}/${surveyData.bloodPressureDiastolic}`, sub: 'mmHg', icon: 'fa-gauge', status: surveyData.bloodPressureSystolic < 130 ? 'normal' : 'alert' },
    { label: 'Blood Sugar', value: `${surveyData.bloodSugar}`, sub: 'mg/dL', icon: 'fa-droplet', status: surveyData.bloodSugar >= 70 && surveyData.bloodSugar < 140 ? 'normal' : 'alert' },
    { label: 'SpO₂ (Oxygen)', value: `${surveyData.oxygenLevel}%`, sub: 'Oxygen Saturation', icon: 'fa-wind', status: surveyData.oxygenLevel >= 95 ? 'normal' : 'alert' },
    { label: 'Body Temperature', value: `${surveyData.temperature}°C`, sub: 'Body Temp', icon: 'fa-thermometer', status: surveyData.temperature >= 36.1 && surveyData.temperature <= 37.5 ? 'normal' : 'alert' },
    { label: 'Pulse Rate', value: `${surveyData.pulseRate}`, sub: 'bpm', icon: 'fa-heart-pulse', status: surveyData.pulseRate >= 60 && surveyData.pulseRate <= 100 ? 'normal' : 'alert' },
  ];

  vitalsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px;';
  vitals.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vital-card';
    card.style.cssText = `padding:20px;border-radius:var(--radius-sm);background:var(--bg-tertiary);border:1px solid ${v.status === 'normal' ? 'var(--border-color)' : 'var(--warning)'};text-align:center;`;
    card.innerHTML = `
      <i class="fa-solid ${v.icon}" style="font-size:1.4rem;color:${v.status === 'normal' ? 'var(--primary)' : 'var(--warning)'};margin-bottom:8px;"></i>
      <div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);">${v.value}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${v.label}</div>
      <div style="font-size:0.8rem;color:${v.status === 'normal' ? 'var(--success)' : 'var(--warning)'};font-weight:600;">${v.sub}</div>
    `;
    vitalsGrid.appendChild(card);
  });

  // --- Lifestyle & Medical History ---
  const ls = surveyData.lifestyle;
  const mh = surveyData.medicalHistory;
  if (ls || mh) {
    document.getElementById('lifestyle-history-section').style.display = 'block';
    const grid = document.getElementById('lifestyle-history-grid');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:12px;';

    if (ls) {
      [
        { label: 'Smoking', value: ls.smoking, icon: 'fa-smoking' },
        { label: 'Alcohol', value: ls.alcohol, icon: 'fa-wine-glass' },
        { label: 'Exercise', value: ls.exercise, icon: 'fa-person-running' },
        { label: 'Diet', value: ls.diet, icon: 'fa-apple-whole' },
      ].forEach(item => {
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-sm);border:1px solid var(--border-color);';
        el.innerHTML = `<i class="fa-solid ${item.icon}" style="color:var(--primary);width:20px;"></i><div><div style="font-size:0.75rem;color:var(--text-muted);">${item.label}</div><div style="font-weight:700;">${item.value || 'N/A'}</div></div>`;
        grid.appendChild(el);
      });
    }

    if (mh) {
      const diseases = [];
      if (mh.diabetes) diseases.push('Diabetes');
      if (mh.hypertension) diseases.push('Hypertension');
      if (mh.heartDisease) diseases.push('Heart Disease');
      if (mh.pregnancy) diseases.push('Pregnancy');

      const chronicEl = document.createElement('div');
      chronicEl.style.cssText = 'grid-column:1/-1;padding:12px;background:var(--bg-tertiary);border-radius:var(--radius-sm);border:1px solid var(--border-color);';
      chronicEl.innerHTML = `
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;"><i class="fa-solid fa-notes-medical" style="margin-right:6px;color:var(--warning);"></i>Chronic Conditions</div>
        <div style="font-weight:700;">${diseases.length ? diseases.join(', ') : 'None Reported'}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">Medications: ${mh.medication || 'None'}</div>
      `;
      grid.appendChild(chronicEl);
    }
  }

  // --- Recommendations ---
  const recBox = document.getElementById('recommendations-list');
  recBox.style.cssText = 'background:var(--bg-tertiary);border-left:4px solid var(--primary);border-radius:var(--radius-sm);padding:20px;display:flex;flex-direction:column;gap:10px;';
  const recs = surveyData.recommendations || [];
  if (recs.length === 0) {
    recBox.innerHTML = '<p style="color:var(--text-muted);">No specific recommendations at this time.</p>';
  } else {
    recs.forEach((rec, i) => {
      const li = document.createElement('div');
      li.style.cssText = 'display:flex;align-items:flex-start;gap:10px;font-size:0.9rem;color:var(--text-secondary);';
      li.innerHTML = `<span style="background:var(--primary);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.75rem;font-weight:700;">${i + 1}</span><span>${rec}</span>`;
      recBox.appendChild(li);
    });
  }

  // --- Follow-up History ---
  if (surveyData.citizenId) {
    try {
      const history = await API.getCitizenHistory(surveyData.citizenId);
      if (history && history.length > 1) {
        document.getElementById('history-section').style.display = 'block';
        const tbody = document.getElementById('history-table-body');
        history.forEach((entry, idx) => {
          const prevBmi = idx > 0 ? history[idx - 1].bmi : null;
          let bmiTrend = '';
          if (prevBmi !== null) {
            const diff = (entry.bmi - prevBmi).toFixed(1);
            if (entry.bmi < prevBmi) bmiTrend = `<span class="history-trend-indicator improved"><i class="fa-solid fa-arrow-down"></i>${Math.abs(diff)}</span>`;
            else if (entry.bmi > prevBmi) bmiTrend = `<span class="history-trend-indicator worse"><i class="fa-solid fa-arrow-up"></i>${diff}</span>`;
            else bmiTrend = `<span class="history-trend-indicator no-change">—</span>`;
          } else {
            bmiTrend = '<span style="color:var(--text-muted);">First Entry</span>';
          }

          const tr = document.createElement('tr');
          const isCurrentRow = (entry._id === surveyId || entry.id === surveyId);
          if (isCurrentRow) tr.style.backgroundColor = 'var(--primary-light)';
          tr.innerHTML = `
            <td>${new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
            <td>${entry.bmi}</td>
            <td>${bmiTrend}</td>
            <td>${entry.bloodPressureSystolic}/${entry.bloodPressureDiastolic}</td>
            <td>${entry.bloodSugar}</td>
            <td style="font-weight:700;color:${entry.healthScore >= 80 ? 'var(--success)' : entry.healthScore >= 60 ? 'var(--warning)' : 'var(--danger)'}">${entry.healthScore || '—'}</td>
            <td><span style="font-weight:600;color:${entry.status === 'Healthy' ? 'var(--success)' : entry.status === 'Needs Improvement' ? 'var(--warning)' : 'var(--danger)'};">${entry.status}</span></td>
          `;
          tbody.appendChild(tr);
        });
      }
    } catch (histErr) {
      console.log('Could not load history:', histErr.message);
    }
  }

  // --- AI Advisory ---
  try {
    const advisory = await API.generateAdvisory(surveyData);
    if (advisory) {
      document.getElementById('ai-advisory-text').textContent = advisory;
      document.getElementById('ai-advisory-panel').style.display = 'block';
    }
  } catch (aiErr) {
    console.log('AI advisory could not be loaded:', aiErr.message);
  }

  // --- PDF Download ---
  document.getElementById('btn-download-pdf').addEventListener('click', () => {
    const element = document.getElementById('printable-report-card');
    const opt = {
      margin: [10, 10],
      filename: `CommHealth-Report-${surveyData.name.replace(/\s/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    showToast('Generating PDF', 'Please wait while your report is being prepared...', 'info');
    html2pdf().set(opt).from(element).save();
  });

  // --- Print ---
  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  // --- Share ---
  document.getElementById('btn-share').addEventListener('click', async () => {
    const reportUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${surveyData.name}'s Health Report - CommHealth`,
          text: `View the community health report for ${surveyData.name}. Health Score: ${surveyData.healthScore}/100.`,
          url: reportUrl
        });
      } catch (shareErr) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(reportUrl).then(() => {
        showToast('Link Copied', 'Report link copied to clipboard!', 'success');
      });
    }
  });
});
