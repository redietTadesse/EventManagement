import axios from 'axios';

// Resource endpoints live under /api/v1.
// Auth endpoints live outside the version prefix at /api/auth
// (see AuthController @RequestMapping("/api/auth")).
const API_ROOT =
  import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Auth base: /api/auth, not /api/v1/auth.
// Derive it by stripping the trailing /v1 (optional trailing slash) from
// API_ROOT. If VITE_AUTH_URL is set, it wins — use that for deployments
// where auth and resources don't share a host.
const AUTH_ROOT =
  import.meta.env.VITE_AUTH_URL || API_ROOT.replace(/\/v1\/?$/, '');

const api = axios.create({
  baseURL: API_ROOT,
  headers: { 'Content-Type': 'application/json' },
});

export const authApi = axios.create({
  baseURL: AUTH_ROOT,
  headers: { 'Content-Type': 'application/json' },
});

// Bearer token on every request that has one.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Any 401 from a protected endpoint wipes the token and returns home.
// Login goes through authApi (separate instance), so a wrong-password 401
// does not trigger this and does not loop.
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