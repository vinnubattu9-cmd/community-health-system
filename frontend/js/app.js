document.addEventListener('DOMContentLoaded', async () => {
  const totalSurveysEl = document.getElementById('stat-total-surveys');
  const healthyEl = document.getElementById('stat-healthy');
  const atRiskEl = document.getElementById('stat-at-risk');
  const avgBmiEl = document.getElementById('stat-avg-bmi');

  try {
    const stats = await API.getPublicStats();
    if (stats) {
      totalSurveysEl.textContent = stats.totalSurveys;
      healthyEl.textContent = stats.healthyCount;
      atRiskEl.textContent = stats.atRiskCount;
      avgBmiEl.textContent = stats.averageBmi + ' kg/m²';
    } else {
      throw new Error('No statistics data returned');
    }
  } catch (error) {
    console.error('Error loading landing page stats:', error);
    // Display fallback safe values
    totalSurveysEl.textContent = '0';
    healthyEl.textContent = '0';
    atRiskEl.textContent = '0';
    avgBmiEl.textContent = '--';
  }
});
