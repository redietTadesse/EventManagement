import axios from 'axios';

// All resource endpoints live under /api/v1; auth lives outside the version
// prefix at /api/auth (see AuthController @RequestMapping("/api/auth")).
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_ROOT,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10s: a cold Render instance can take several seconds to wake
});

// Auth lives outside /v1
export const authApi = axios.create({
  baseURL: API_ROOT.replace('/api/v1', '/api'),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
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
