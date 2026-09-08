import axios from 'axios';

// Use environment variable for base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 3000, // 3 seconds timeout
});

// Auth endpoints live under /api/auth
export const authApi = axios.create({
  baseURL: API_BASE_URL.replace('/api', ''),
  headers: { 'Content-Type': 'application/json' },
  timeout: 3000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ✅ THIS IS THE IMPORTANT LINE - ADD THIS
export default api;