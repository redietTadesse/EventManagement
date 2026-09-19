import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api, { authApi } from '../api/axios';

// ===== Mock Data =====
const mockUsers = [
  { id: 1, username: 'client1', password: 'password123', role: 'CLIENT', fullName: 'John Client', email: 'client@example.com' },
  { id: 2, username: 'vendor1', password: 'password123', role: 'VENDOR', fullName: 'AV Solutions', email: 'av@example.com' },
  { id: 3, username: 'vendor2', password: 'password123', role: 'VENDOR', fullName: 'Catering Plus', email: 'catering@example.com' },
  { id: 4, username: 'coordinator1', password: 'password123', role: 'COORDINATOR', fullName: 'Jane Coordinator', email: 'coord@aicc.et' },
  { id: 5, username: 'vendor3', password: 'password123', role: 'VENDOR', fullName: 'SecureGuard', email: 'secure@example.com' },
  { id: 6, username: 'vendor4', password: 'password123', role: 'VENDOR', fullName: 'CleanCo', email: 'clean@example.com' },
  { id: 7, username: 'vendor5', password: 'password123', role: 'VENDOR', fullName: 'PhotoPro', email: 'photo@example.com' },
  { id: 8, username: 'vendor6', password: 'password123', role: 'VENDOR', fullName: 'Melody Events', email: 'music@example.com' },
  { id: 9, username: 'vendor7', password: 'password123', role: 'VENDOR', fullName: 'Gourmet Catering', email: 'gourmet@example.com' },
  { id: 10, username: 'vendor8', password: 'password123', role: 'VENDOR', fullName: 'Sound & Light Co.', email: 'sound@example.com' },
  { id: 11, username: 'vendor9', password: 'password123', role: 'VENDOR', fullName: 'Elite Security', email: 'elite@example.com' },
  { id: 12, username: 'vendor10', password: 'password123', role: 'VENDOR', fullName: 'Sparkle Clean', email: 'sparkle@example.com' },
  { id: 13, username: 'vendor11', password: 'password123', role: 'VENDOR', fullName: 'Capture Moments', email: 'capture@example.com' },
  { id: 14, username: 'vendor12', password: 'password123', role: 'VENDOR', fullName: 'DJ Vibes', email: 'dj@example.com' },
  { id: 15, username: 'vendor13', password: 'password123', role: 'VENDOR', fullName: 'ProStage AV', email: 'prostage@example.com' },
  { id: 16, username: 'vendor14', password: 'password123', role: 'VENDOR', fullName: 'Addis Feast Catering', email: 'adfeast@example.com' },
  { id: 17, username: 'vendor15', password: 'password123', role: 'VENDOR', fullName: 'GuardPlus', email: 'guardplus@example.com' },
];

const mockInquiries = [
  {
    id: 1,
    clientId: 1,
    clientName: 'John Client',
    eventType: 'conference',
    eventDate: '2026-10-15',
    expectedAttendees: 500,
    requirements: 'Projector, catering, security',
    status: 'INQUIRY_SUBMITTED',
    createdAt: '2026-08-20T10:00:00',
    updatedAt: '2026-08-20T10:00:00'
  },
  {
    id: 2,
    clientId: 1,
    clientName: 'John Client',
    eventType: 'wedding',
    eventDate: '2026-11-05',
    expectedAttendees: 300,
    requirements: 'Catering, photography, flowers, music',
    status: 'PROPOSAL_SENT',
    createdAt: '2026-08-21T09:00:00',
    updatedAt: '2026-08-22T14:00:00'
  },
  {
    id: 3,
    clientId: 1,
    clientName: 'John Client',
    eventType: 'trade_show',
    eventDate: '2026-10-15',
    expectedAttendees: 2000,
    requirements: 'Exhibition space, booth setup, security, cleaning',
    status: 'EVENT_CREATED',
    createdAt: '2026-08-23T08:00:00',
    updatedAt: '2026-08-23T08:00:00'
  },
];

const initialState = {
  users: mockUsers,
  inquiries: mockInquiries, // Pre-populate with mock data
  notifications: [],
  currentUser: null,
  loading: false,
  error: null,
};

// ===== Reducer =====
const reducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_INQUIRIES':
      return { ...state, inquiries: action.payload };
    case 'ADD_INQUIRY':
      return { ...state, inquiries: [...state.inquiries, action.payload] };
    case 'UPDATE_INQUIRY':
      return {
        ...state,
        inquiries: state.inquiries.map(i => i.id === action.payload.id ? action.payload : i)
      };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

// ===== Context =====
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      if (token === 'mock-token') {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          dispatch({ type: 'LOGIN', payload: JSON.parse(storedUser) });
        }
        return;
      }
      dispatch({ type: 'SET_LOADING', payload: true });
      api
        .get('/users/me')
        .then((res) => {
          dispatch({ type: 'LOGIN', payload: res.data });
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
    }
  }, []);

  // ===== Login =====
  const login = async (username, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const res = await authApi.post('/auth/login', { username, password });
      const { accessToken, role } = res.data;
      localStorage.setItem('token', accessToken);
      const me = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const user = { ...me.data, role: role || me.data.role };
      dispatch({ type: 'LOGIN', payload: user });
      dispatch({ type: 'SET_LOADING', payload: false });
      return user;
    } catch (error) {
      // Fallback to mock
      const mockUser = mockUsers.find(u => u.username === username && u.password === password);
      if (mockUser) {
        const user = { ...mockUser };
        delete user.password;
        localStorage.setItem('token', 'mock-token');
        localStorage.setItem('user', JSON.stringify(user));
        dispatch({ type: 'LOGIN', payload: user });
        dispatch({ type: 'SET_LOADING', payload: false });
        return user;
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: 'Invalid username or password' });
        throw new Error('Invalid credentials');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  // ===== Users =====
  const fetchUsers = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.get('/users');
      dispatch({ type: 'SET_USERS', payload: res.data });
      return res.data;
    } catch (error) {
      dispatch({ type: 'SET_USERS', payload: mockUsers });
      return mockUsers;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // ===== Inquiries =====
  const fetchInquiries = async () => {
  // Don't fetch if already loading or if we already have data
  if (state.loading || state.inquiries.length > 0) {
    return state.inquiries;
  }
  
  dispatch({ type: 'SET_LOADING', payload: true });
  try {
    const res = await api.get('/inquiries');
    dispatch({ type: 'SET_INQUIRIES', payload: res.data });
    return res.data;
  } catch (error) {
    // Use mock data from initialState
    return state.inquiries;
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};

  const fetchInquiryById = async (id) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.get(`/inquiries/${id}`);
      return res.data;
    } catch (error) {
      const mock = state.inquiries.find(i => i.id === parseInt(id));
      return mock || null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createInquiry = async (inquiryData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      const res = await api.post('/inquiries', inquiryData);
      dispatch({ type: 'ADD_INQUIRY', payload: res.data });
      return res.data;
    } catch (error) {
      const newInquiry = {
        id: state.inquiries.length + 1,
        ...inquiryData,
        status: 'INQUIRY_SUBMITTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_INQUIRY', payload: newInquiry });
      return newInquiry;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateInquiry = async (id, data) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.put(`/inquiries/${id}`, data);
      dispatch({ type: 'UPDATE_INQUIRY', payload: res.data });
      return res.data;
    } catch (error) {
      const updated = { ...state.inquiries.find(i => i.id === parseInt(id)), ...data };
      dispatch({ type: 'UPDATE_INQUIRY', payload: updated });
      return updated;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const convertInquiryToEvent = async (id, eventData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.post(`/inquiries/${id}/convert`, eventData);
      await fetchInquiries();
      return res.data;
    } catch (error) {
      const updated = { ...state.inquiries.find(i => i.id === parseInt(id)), status: 'EVENT_CREATED', event: eventData };
      dispatch({ type: 'UPDATE_INQUIRY', payload: updated });
      return updated;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // ===== Vendors =====
  const fetchVendors = async () => {
    try {
      const res = await api.get('/vendors');
      return res.data;
    } catch (error) {
      return state.users.filter(u => u.role === 'VENDOR');
    }
  };

  const createVendor = async (vendorData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.post('/vendors', vendorData);
      await fetchUsers();
      return res.data;
    } catch (error) {
      const newVendor = {
        id: state.users.length + 1,
        ...vendorData,
        role: 'VENDOR',
        isActive: true,
      };
      dispatch({ type: 'SET_USERS', payload: [...state.users, newVendor] });
      return newVendor;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const toggleVendorStatus = async (id) => {
    try {
      await api.patch(`/vendors/${id}/toggle-active`);
      await fetchUsers();
    } catch (error) {
      const updatedUsers = state.users.map(u =>
        u.id === parseInt(id) ? { ...u, isActive: !u.isActive } : u
      );
      dispatch({ type: 'SET_USERS', payload: updatedUsers });
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      dispatch({ type: 'SET_NOTIFICATIONS', payload: res.data });
      return res.data;
    } catch (error) {
      return [];
    }
  };

  const value = {
    state,
    dispatch,
    login,
    logout,
    fetchUsers,
    fetchInquiries,
    fetchInquiryById,
    createInquiry,
    updateInquiry,
    convertInquiryToEvent,
    fetchVendors,
    createVendor,
    toggleVendorStatus,
    fetchNotifications,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export default AppContext;