import axios from 'axios';

// Resource endpoints live under /api/v1.
// Auth endpoints live outside the version prefix at /api/auth.
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Auth base: /api/auth — derived by stripping trailing /v1 from API_ROOT,
// unless VITE_AUTH_URL is set.
const AUTH_ROOT =
  import.meta.env.VITE_AUTH_URL || API_ROOT.replace(/\/v1\/?$/, '');

const api = axios.create({
  baseURL: API_ROOT,
  timeout: 60000,
});

export const authApi = axios.create({
  baseURL: AUTH_ROOT,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Bearer token on every request that has one.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
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
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;