import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('orchestrator_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect if not on login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('orchestrator_token');
        localStorage.removeItem('orchestrator_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
