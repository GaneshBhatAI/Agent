import axios from 'axios';

const savedApiUrl = localStorage.getItem('orchestrator_api_url');
export const API_BASE_URL = savedApiUrl || (window.location.hostname === 'localhost' ? 'http://localhost:8001/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 4000,
});

// Attach session token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('orchestrator_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses normally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    return Promise.reject(error);
  }
);

export default api;
