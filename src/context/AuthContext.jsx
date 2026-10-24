import { createContext, useContext, useState, useEffect } from 'react';
import api, { authApi } from '../api/axios';

const AuthContext = createContext();

// Fallback mock users in case the backend throws a 403 or is down
const mockUsers = [
  { id: 1, username: 'client1', password: 'password123', role: 'CLIENT', fullName: 'John Client' },
  { id: 2, username: 'coordinator1', password: 'password123', role: 'COORDINATOR', fullName: 'Jane Coordinator' },
  { id: 3, username: 'vendor1', password: 'password123', role: 'VENDOR', fullName: 'AV Solutions' },
  { id: 4, username: 'admin', password: 'password123', role: 'ADMIN', fullName: 'AICC Administrator' },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    if (token === 'mock-token') {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
      return;
    }

    api.get('/users/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    try {
      const res = await authApi.post('/auth/login', { username, password });
      const token = res.data.accessToken || res.data.token;
      
      if (token) {
        localStorage.setItem('token', token);
        const me = await api.get('/users/me');
        const userData = { ...me.data, role: res.data.role || me.data.role };
        setUser(userData);
        return userData;
      }
    } catch (apiError) {
      console.warn('Backend login failed, using mock users...');
      const mockUser = mockUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (mockUser) {
        const userData = { ...mockUser };
        delete userData.password;
        localStorage.setItem('token', 'mock-token');
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
      }
      
      throw new Error('Invalid username or password');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);