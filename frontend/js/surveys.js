document.addEventListener('DOMContentLoaded', () => {
  // Authentication & Layout Checks
  const authOverlay = document.getElementById('auth-overlay');
  const adminPanel = document.getElementById('admin-panel');
  const btnLogout = document.getElementById('btn-logout');
  const loginForm = document.getElementById('admin-login-form');

  // Tab Navigation Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Chart instances trackers
  let bmiChartInstance = null;
  let statusChartInstance = null;
  let ageChartInstance = null;

  // Table Listing Variables
  let currentPage = 1;
  let limit = 10;
  let searchVal = '';
  let statusFilter = '';
  let sortByVal = 'createdAt';
  let sortOrder = 'desc';

  // Modal Controls
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-survey-form');
  const btnCloseEdit = document.getElementById('btn-close-edit');

  // Verify auth session
  const checkAuth = () => {
    if (hasAuthToken()) {
      authOverlay.classList.remove('show');
      adminPanel.style.display = 'block';
      btnLogout.style.display = 'inline-flex';
      loadDashboard();
    } else {
      authOverlay.classList.add('show');
      adminPanel.style.display = 'none';
      btnLogout.style.display = 'none';
    }
  };

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;

    try {
      await API.login(user, pass);
      checkAuth();
    } catch (err) {
      console.error(err);
    }
  });

  // Logout handler
  btnLogout.addEventListener('click', () => {
    API.logout();
  });

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
      
      if (tabId === 'tab-records') {
        loadRecords();
      } else {
        loadDashboard();
      }
    });
  });

  // Initial load wrapper
  checkAuth();

  // Load Dashboard Data (Stats & Charts)
  async function loadDashboard() {
    try {
      showLoader(true);
      const data = await API.getStats();
      if (!data) return;

      // Populate dashboard metrics card elements
      document.getElementById('admin-total-surveys').textContent = data.metrics.totalSurveys;
      document.getElementById('admin-healthy').textContent = data.metrics.healthyCount;
      document.getElementById('admin-at-risk').textContent = data.metrics.atRiskCount;
      document.getElementById('admin-avg-bmi').textContent = data.metrics.averageBmi + ' kg/m²';

      // Render Chart.js graphs
      renderBmiChart(data.charts.bmiDistribution);
      renderStatusChart(data.charts.healthStatus);
      renderAgeChart(data.charts.ageDistribution);
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') checkAuth();
    } finally {
      showLoader(false);
    }
  }

  // Chart Rendering Functions
  function renderBmiChart(chartData) {
    const ctx = document.getElementById('bmiChart').getContext('2d');
    if (bmiChartInstance) bmiChartInstance.destroy();
    
    // Check theme for axis colors
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    bmiChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Number of Individuals',
          data: chartData.values,
          backgroundColor: ['#38bdf8', '#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: labelColor } },
          y: { grid: { color: gridColor }, ticks: { color: labelColor, stepSize: 1 } }
        }
      }
    });
  }

  function renderStatusChart(chartData) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const labelColor = isDark ? '#f8fafc' : '#0f172a';

    statusChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: chartData.labels,
        datasets: [{
          data: chartData.values,
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#111827' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: labelColor, boxWidth: 12, font: { weight: '600' } }
          }
        }
      }
    });
  }

  function renderAgeChart(chartData) {
    const ctx = document.getElementById('ageChart').getContext('2d');
    if (ageChartInstance) ageChartInstance.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#1e293b' : '#e2e8f0';
    const labelColor = isDark ? '#94a3b8' : '#64748b';

    ageChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Survey Count',
          data: chartData.values,
          backgroundColor: 'rgba(14, 165, 233, 0.7)',
          borderColor: '#0ea5e9',
          borderWidth: 1.5,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: labelColor } },
          y: { grid: { color: gridColor }, ticks: { color: labelColor, stepSize: 1 } }
        }
      }
    });
  }

  // Load Records Directory Table
  async function loadRecords() {
    try {
      showLoader(true);
      const res = await API.getSurveys({
        page: currentPage,
        limit,
        search: searchVal,
        status: statusFilter,
        sortBy: sortByVal,
        order: sortOrder
      });

      renderTable(res.data);
      renderPagination(res.pagination);
    } catch (error) {
      if (error.message === 'UNAUTHORIZED') checkAuth();
    } finally {
      showLoader(false);
    }
  }

  // Render surveys table rows
  function renderTable(surveys) {
    const tbody = document.getElementById('records-table-body');
    tbody.innerHTML = '';

    if (surveys.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 2rem; display: block; margin-bottom: 8px;"></i>
            No records matched your search query.
          </td>
        </tr>
      `;
      return;
    }

    surveys.forEach(item => {
      const tr = document.createElement('tr');
      
      let badgeClass = 'healthy';
      if (item.status === 'Needs Improvement') badgeClass = 'warning';
      if (item.status === 'At Risk') badgeClass = 'danger';

      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 0.85rem;"><a href="report.html?id=${item._id}" target="_blank" style="color: var(--primary); font-weight: 700;">${item._id.substring(item._id.length - 8)}</a></td>
        <td style="font-weight: 600;">${item.name}</td>
        <td>${item.age}</td>
        <td>${item.gender}</td>
        <td>${item.occupation}</td>
        <td>${item.bmi} <span style="font-size: 0.75rem; color: var(--text-muted);">(${item.bmiCategory.substring(0, 5)}.)</span></td>
        <td><span class="badge ${badgeClass}">${item.status}</span></td>
        <td>${new Date(item.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn view-btn" data-id="${item._id}" title="View Health Report">
              <i class="fa-solid fa-file-medical"></i>
            </button>
            <button class="action-btn edit-btn" data-id="${item._id}" title="Edit Record">
              <i class="fa-solid fa-user-pen"></i>
            </button>
            <button class="action-btn delete delete-btn" data-id="${item._id}" title="Delete Record">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Wire actions
    tbody.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.open(`report.html?id=${btn.getAttribute('data-id')}`, '_blank');
      });
    });

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to permanently delete this health survey record?')) {
          const success = await API.deleteSurvey(id);
          if (success) loadRecords();
        }
      });
    });

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openEditModal(btn.getAttribute('data-id'));
      });
    });
  }

  // Render Table Pagination Controls
  function renderPagination(meta) {
    const controls = document.getElementById('pagination-controls');
    const info = document.getElementById('pagination-info');
    
    controls.innerHTML = '';
    
    const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);
    info.textContent = `Showing ${start} to ${end} of ${meta.total} entries`;

    if (meta.pages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = `page-btn ${meta.page === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
    if (meta.page !== 1) {
      prevBtn.onclick = () => { currentPage--; loadRecords(); };
    }
    controls.appendChild(prevBtn);

    // Number Buttons
    for (let i = 1; i <= meta.pages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `page-btn ${meta.page === i ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => { currentPage = i; loadRecords(); };
      controls.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = `page-btn ${meta.page === meta.pages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
    if (meta.page !== meta.pages) {
      nextBtn.onclick = () => { currentPage++; loadRecords(); };
    }
    controls.appendChild(nextBtn);
  }

  // Toolbar search inputs, filtering, sorting triggers
  let searchTimeout;
  document.getElementById('record-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchVal = e.target.value;
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadRecords();
    }, 400); // 400ms debounce
  });

  document.getElementById('filter-status').addEventListener('change', (e) => {
    statusFilter = e.target.value;
    currentPage = 1;
    loadRecords();
  });

  document.getElementById('sort-by').addEventListener('change', (e) => {
    const val = e.target.value;
    sortByVal = val;
    sortOrder = 'desc'; // default newest or highest
    if (val === 'name') sortOrder = 'asc';
    currentPage = 1;
    loadRecords();
  });

  // Edit Modal Operations
  async function openEditModal(id) {
    try {
      const survey = await API.getSurvey(id);
      if (!survey) return;

      document.getElementById('edit-record-id').value = survey._id;
      document.getElementById('edit-name').value = survey.name;
      document.getElementById('edit-age').value = survey.age;
      document.getElementById('edit-gender').value = survey.gender;
      document.getElementById('edit-occupation').value = survey.occupation;
      document.getElementById('edit-height').value = survey.height;
      document.getElementById('edit-weight').value = survey.weight;
      document.getElementById('edit-temp').value = survey.temperature;
      document.getElementById('edit-pulse').value = survey.pulseRate;
      document.getElementById('edit-oxygen').value = survey.oxygenLevel;
      document.getElementById('edit-sugar').value = survey.bloodSugar;
      document.getElementById('edit-systolic').value = survey.bloodPressureSystolic;
      document.getElementById('edit-diastolic').value = survey.bloodPressureDiastolic;

      editModal.classList.add('show');
    } catch (err) {
      console.error(err);
    }
  }

  const closeEditModal = () => {
    editModal.classList.remove('show');
    editForm.reset();
  };

  btnCloseEdit.addEventListener('click', closeEditModal);

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-record-id').value;

    const payload = {
      name: document.getElementById('edit-name').value.trim(),
      age: parseInt(document.getElementById('edit-age').value),
      gender: document.getElementById('edit-gender').value,
      occupation: document.getElementById('edit-occupation').value.trim(),
      height: parseFloat(document.getElementById('edit-height').value),
      weight: parseFloat(document.getElementById('edit-weight').value),
      temperature: parseFloat(document.getElementById('edit-temp').value),
      pulseRate: parseInt(document.getElementById('edit-pulse').value),
      oxygenLevel: parseInt(document.getElementById('edit-oxygen').value),
      bloodSugar: parseInt(document.getElementById('edit-sugar').value),
      bloodPressureSystolic: parseInt(document.getElementById('edit-systolic').value),
      bloodPressureDiastolic: parseInt(document.getElementById('edit-diastolic').value)
    };

    try {
      await API.updateSurvey(id, payload);
      closeEditModal();
      loadRecords();
    } catch (err) {
      console.error(err);
    }
  });

  // Export to Excel (using SheetJS xlsx)
  document.getElementById('btn-export-excel').onclick = async () => {
    try {
      showLoader(true);
      // Fetch all records from database without page limits
      const res = await API.getSurveys({ page: 1, limit: 10000 });
      if (!res || !res.data) return;

      const exportData = res.data.map(item => ({
        "Record ID": item._id,
        "Name": item.name,
        "Age": item.age,
        "Gender": item.gender,
        "Occupation": item.occupation,
        "Height (cm)": item.height,
        "Weight (kg)": item.weight,
        "BMI": item.bmi,
        "BMI Class": item.bmiCategory,
        "Temperature (°C)": item.temperature,
        "Pulse Rate (bpm)": item.pulseRate,
        "Oxygen SpO2 (%)": item.oxygenLevel,
        "BP Systolic": item.bloodPressureSystolic,
        "BP Diastolic": item.bloodPressureDiastolic,
        "Blood Sugar (mg/dL)": item.bloodSugar,
        "Overall Status": item.status,
        "Date Saved": new Date(item.createdAt).toLocaleString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Community Vitals Data");
      XLSX.writeFile(workbook, "Community_Health_Surveys_Export.xlsx");
      showToast('Export Completed', 'Excel document saved successfully', 'success');
    } catch (error) {
      console.error(error);
    } finally {
      showLoader(false);
    }
  };

  // Export to PDF (using jsPDF & AutoTable)
  document.getElementById('btn-export-pdf').onclick = async () => {
    try {
      showLoader(true);
      const res = await API.getSurveys({ page: 1, limit: 10000 });
      if (!res || !res.data) return;

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape' });

      // Title & Headers
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text("Community Health Monitoring System", 14, 15);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text("Administrative Health Records Directory", 14, 20);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

      const tableCols = ["Survey ID", "Name", "Age", "Gender", "Occupation", "BMI", "BP", "Sugar", "SpO2", "Status"];
      const tableRows = res.data.map(item => [
        item._id.substring(item._id.length - 8),
        item.name,
        item.age,
        item.gender,
        item.occupation,
        `${item.bmi} (${item.bmiCategory.substring(0, 3)}.)`,
        `${item.bloodPressureSystolic}/${item.bloodPressureDiastolic}`,
        item.bloodSugar,
        item.oxygenLevel + "%",
        item.status
      ]);

      doc.autoTable({
        head: [tableCols],
        body: tableRows,
        startY: 30,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [14, 165, 233], halign: 'left', fontStyle: 'bold' }
      });

      doc.save("Community_Health_Surveys_Report.pdf");
      showToast('PDF Exported', 'Records PDF document downloaded', 'success');
    } catch (error) {
      console.error(error);
    } finally {
      showLoader(false);
    }
  };
});
