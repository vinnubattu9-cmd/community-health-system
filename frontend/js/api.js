// Centralized API Base URL configuration
// Using hosted backend API URL
const API_BASE = 'https://community-health-system.onrender.com/api';

// Token Management Helpers
const getAuthToken = () => localStorage.getItem('admin_token');
const setAuthToken = (token) => localStorage.setItem('admin_token', token);
const removeAuthToken = () => localStorage.removeItem('admin_token');
const hasAuthToken = () => !!getAuthToken();

// Shared headers constructor
const getHeaders = (contentType = 'application/json') => {
  const headers = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// UI Helpers (Toast notifications and loaders)
const showLoader = (show = true) => {
  let spinner = document.getElementById('global-spinner');
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'global-spinner';
    spinner.className = 'spinner-overlay';
    spinner.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(spinner);
  }
  if (show) {
    spinner.classList.add('show');
  } else {
    spinner.classList.remove('show');
  }
};

const showToast = (title, message, type = 'info') => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'notifications-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-xmark';
  
  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.style.animation = 'none'; // reset animation
    toast.offsetHeight; // trigger reflow
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// Global Theme Switcher Initialization
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Set up theme toggler buttons if present
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-toggle-btn');
    if (btn) {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      showToast('Theme Changed', `Switched to ${newTheme} mode`, 'info');
    }
  });
};

// Initialize theme on script load
document.addEventListener('DOMContentLoaded', initTheme);

// Central API HTTP methods wrapper
const API = {
  // Authentication Request
  login: async (username, password) => {
    showLoader(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Login failed');
      }
      
      setAuthToken(resData.token);
      showToast('Login Successful', 'Welcome to Admin Dashboard', 'success');
      return resData;
    } catch (error) {
      showToast('Authentication Failed', error.message, 'error');
      throw error;
    } finally {
      showLoader(false);
    }
  },

  logout: () => {
    removeAuthToken();
    showToast('Logged Out', 'You have been successfully logged out', 'info');
    // Redirect to home page or refresh page
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },

  // Surveys Requests
  submitSurvey: async (formData) => {
    showLoader(true);
    try {
      const response = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to submit health survey');
      }

      showToast('Survey Submitted', 'Your health metrics have been recorded', 'success');
      return resData.data;
    } catch (error) {
      showToast('Submission Error', error.message, 'error');
      throw error;
    } finally {
      showLoader(false);
    }
  },

  getSurveys: async (params = {}) => {
    const { page = 1, limit = 10, search = '', status = '', sortBy = 'createdAt', order = 'desc' } = params;
    
    // Construct query string
    const query = new URLSearchParams({ page, limit, search, status, sortBy, order }).toString();
    
    try {
      const response = await fetch(`${API_BASE}/surveys?${query}`, {
        method: 'GET',
        headers: getHeaders()
      });

      const resData = await response.json();
      if (response.status === 401) {
        // Token expired/invalid
        removeAuthToken();
        throw new Error('UNAUTHORIZED');
      }
      
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to fetch surveys list');
      }
      return resData;
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        showToast('Fetch Error', error.message, 'error');
      }
      throw error;
    }
  },

  getSurvey: async (id) => {
    showLoader(true);
    try {
      const response = await fetch(`${API_BASE}/surveys/${id}`, {
        method: 'GET',
        headers: getHeaders()
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to retrieve report');
      }
      return resData.data;
    } catch (error) {
      showToast('Report Retrieval Failed', error.message, 'error');
      throw error;
    } finally {
      showLoader(false);
    }
  },

  updateSurvey: async (id, formData) => {
    showLoader(true);
    try {
      const response = await fetch(`${API_BASE}/surveys/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      const resData = await response.json();
      if (response.status === 401) {
        removeAuthToken();
        throw new Error('UNAUTHORIZED');
      }

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to update record');
      }

      showToast('Record Updated', 'Survey details modified successfully', 'success');
      return resData.data;
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        showToast('Update Failed', error.message, 'error');
      }
      throw error;
    } finally {
      showLoader(false);
    }
  },

  deleteSurvey: async (id) => {
    showLoader(true);
    try {
      const response = await fetch(`${API_BASE}/surveys/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const resData = await response.json();
      if (response.status === 401) {
        removeAuthToken();
        throw new Error('UNAUTHORIZED');
      }

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to delete record');
      }

      showToast('Record Deleted', 'Survey has been removed from database', 'success');
      return true;
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        showToast('Delete Failed', error.message, 'error');
      }
      throw error;
    } finally {
      showLoader(false);
    }
  },

  getStats: async () => {
    try {
      const response = await fetch(`${API_BASE}/surveys/stats`, {
        method: 'GET',
        headers: getHeaders()
      });

      const resData = await response.json();
      if (response.status === 401) {
        removeAuthToken();
        throw new Error('UNAUTHORIZED');
      }

      if (!response.ok) {
        throw new Error(resData.message || 'Failed to fetch dashboard metrics');
      }
      return resData.data;
    } catch (error) {
      if (error.message !== 'UNAUTHORIZED') {
        showToast('Metrics Error', error.message, 'error');
      }
      throw error;
    }
  },

  getPublicStats: async () => {
    try {
      const response = await fetch(`${API_BASE}/surveys/public-stats`, {
        method: 'GET',
        headers: getHeaders()
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || 'Failed to fetch public stats');
      }
      return resData.data;
    } catch (error) {
      console.error('Error fetching public stats:', error);
      return null;
    }
  }
};
