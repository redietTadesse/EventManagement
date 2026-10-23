import axios from 'axios';

// All resource endpoints live under /api/v1; auth lives outside the version
// prefix at /api/auth (see AuthController @RequestMapping("/api/auth")).
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_ROOT,
  headers: { 'Content-Type': 'application/json' },
});

// Auth lives outside /v1
export const authApi = axios.create({
  baseURL: API_BASE_URL.replace('/api', ''), // Removes /api for auth routes
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
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

export default api;
