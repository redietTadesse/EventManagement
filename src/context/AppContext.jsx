import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api, { authApi } from '../api/axios';

/**
 * Single source of truth for application state.
 */
const initialState = {
  currentUser: null,
  users: [],
  inquiries: [],
  vendors: [],
  notifications: [],   // client-side only; no backend endpoint yet
  loading: false,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':       return { ...state, currentUser: action.payload };
    case 'LOGOUT':      return { ...initialState };
    case 'SET_USERS':   return { ...state, users: action.payload };
    case 'SET_INQUIRIES': return { ...state, inquiries: action.payload };
    case 'ADD_INQUIRY': return { ...state, inquiries: [...state.inquiries, action.payload] };
    case 'UPDATE_INQUIRY':
      return { ...state, inquiries: state.inquiries.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'SET_VENDORS': return { ...state, vendors: action.payload };
    case 'SET_NOTIFICATIONS': return { ...state, notifications: action.payload };
    case 'ADD_NOTIFICATION': return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, isRead: true } : n) };
    case 'MARK_ALL_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, isRead: true })) };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    case 'SET_ERROR':   return { ...state, error: action.payload };
    case 'CLEAR_ERROR': return { ...state, error: null };
    default: return state;
  }
};

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restore session from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    api.get('/users/me')
      .then(res => dispatch({ type: 'LOGIN', payload: res.data }))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => dispatch({ type: 'SET_LOADING', payload: false }));
  }, []);

  // ===== AUTH =====

  const login = async (username, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      const res = await authApi.post('/auth/login', { username, password });
      const { accessToken, role } = res.data;
      localStorage.setItem('token', accessToken);

      const me = await api.get('/users/me');
      const user = { ...me.data, role: role || me.data.role };
      dispatch({ type: 'LOGIN', payload: user });
      return user;
    } catch (err) {
      const raw = err.response?.data;
      const msg = (raw && typeof raw === 'object') ? (raw.message || 'Login failed') : raw;
      dispatch({ type: 'SET_ERROR', payload: typeof msg === 'string' ? msg : 'Login failed' });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Resolved: Keep registerClient, which doesn't auto-login but simply creates the account.
  const registerClient = async ({ fullName, username, email, password }) => {
    const res = await authApi.post('/auth/register', {
      fullName,
      username,
      email,
      password,
      role: 'CLIENT',
    });
    return res.data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  }, []);

  // ===== USERS / VENDORS =====

  const fetchUsers = useCallback(async () => {
    const res = await api.get('/users');
    dispatch({ type: 'SET_USERS', payload: res.data });
    return res.data;
  }, []);

  const fetchVendors = useCallback(async () => {
    const res = await api.get('/vendors');
    dispatch({ type: 'SET_VENDORS', payload: res.data });
    return res.data;
  }, []);

  const toggleUserStatus = useCallback(async (userId) => {
    await api.patch(`/users/${userId}/toggle-active`);
    await fetchUsers();
  }, [fetchUsers]);

  const createVendor = useCallback(async (vendorData) => {
    const res = await api.post('/users', { ...vendorData, role: 'VENDOR' });
    await fetchUsers();
    return res.data;
  }, [fetchUsers]);

  const toggleVendorStatus = useCallback(async (id) => {
    await api.patch(`/users/${id}/toggle-active`);
    await fetchUsers();
  }, [fetchUsers]);

  // ===== INQUIRIES =====

  const fetchInquiries = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await api.get('/inquiries');
      dispatch({ type: 'SET_INQUIRIES', payload: res.data });
      return res.data;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const fetchInquiryById = useCallback(async (id) => {
    const res = await api.get(`/inquiries/${id}`);
    return res.data;
  }, []);

  const createInquiry = useCallback(async (payload) => {
    const res = await api.post('/inquiries', payload);
    dispatch({ type: 'ADD_INQUIRY', payload: res.data });
    return res.data;
  }, []);

  const updateInquiry = useCallback(async (id, payload) => {
    const res = await api.put(`/inquiries/${id}`, payload);
    dispatch({ type: 'UPDATE_INQUIRY', payload: res.data });
    return res.data;
  }, []);

  const sendProposal = useCallback(async (inquiryId, proposal) => {
    const { venue, venueId, venueDetails, price, terms, vendorShortlist, pricingTier } = proposal;

    const body = {
      venue,
      venueId: venueId ?? null,
      venueDetails: venueDetails == null
        ? null
        : (typeof venueDetails === 'string' ? venueDetails : JSON.stringify(venueDetails)),
      price: Number.isFinite(price) ? price : 0,
      terms,
      vendorShortlist: vendorShortlist
        ? Object.fromEntries(
            Object.entries(vendorShortlist)
              .filter(([, v]) => v !== '' && v !== null && v !== undefined)
              .map(([k, v]) => [k, (Array.isArray(v) ? v : [v]).map(String)])
          )
        : null,
      pricingTier,
    };

    const res = await api.post(`/inquiries/${inquiryId}/proposal`, body);
    dispatch({ type: 'UPDATE_INQUIRY', payload: res.data });
    return res.data;
  }, []);

  const acceptProposal = useCallback(async (inquiryId) => {
    const res = await api.patch(`/inquiries/${inquiryId}/accept`);
    dispatch({ type: 'UPDATE_INQUIRY', payload: res.data });
    return res.data;
  }, []);

  const rejectProposal = useCallback(async (inquiryId, reason) => {
    const res = await api.patch(`/inquiries/${inquiryId}/reject`, null, { params: { reason } });
    dispatch({ type: 'UPDATE_INQUIRY', payload: res.data });
    return res.data;
  }, []);

  const convertInquiryToEvent = useCallback(async (inquiryId, eventData) => {
    const res = await api.post(`/inquiries/${inquiryId}/convert`, eventData);
    await fetchInquiries();
    return res.data;
  }, [fetchInquiries]);

  // ===== ASSIGNMENTS =====

  const fetchAssignmentsForEvent = useCallback(async (eventId) => {
    const res = await api.get(`/assignments/event/${eventId}`);
    return res.data;
  }, []);

  const respondToAssignment = useCallback(async (assignmentId, response, declineReason) => {
    const res = await api.patch(`/assignments/${assignmentId}/respond`, { response, declineReason });
    return res.data;
  }, []);

  const claimAssignment = useCallback(async (assignmentId) => {
    const res = await api.post(`/assignments/${assignmentId}/claim`);
    return res.data;
  }, []);

  const forceAssign = useCallback(async (assignmentId, vendorId, category) => {
    const res = await api.post(
      `/assignments/${assignmentId}/force-assign`,
      { vendorId, category: category || 'unspecified' }
    );
    return res.data;
  }, []);

  const fetchOpenAssignments = useCallback(async () => {
    const res = await api.get('/assignments/open');
    return res.data;
  }, []);

  const fetchMyVendorProfile = useCallback(async () => {
    const res = await api.get('/vendors/me');
    return res.data;
  }, []);

  const fetchMyAssignments = useCallback(async () => {
    const res = await api.get('/assignments/me');
    return res.data;
  }, []);

  const fetchMyAssignment = useCallback(async (id) => {
    const res = await api.get(`/assignments/me/${id}`);
    return res.data;
  }, []);

  const rateAssignment = useCallback(async (assignmentId, rating, comment) => {
    const res = await api.post(`/assignments/${assignmentId}/rate`, { rating, comment });
    return res.data;
  }, []);

  // ===== VENUES =====

  const fetchAvailableVenues = useCallback(async (date) => {
    const res = await api.get('/venues/available', { params: { date } });
    return res.data;
  }, []);

  const fetchAllVenues = useCallback(async () => {
    const res = await api.get('/venues');
    return res.data;
  }, []);

  const fetchVenueById = useCallback(async (id) => {
    const res = await api.get(`/venues/${id}`);
    return res.data;
  }, []);

  const fetchVenueBookings = useCallback(async (id) => {
    const res = await api.get(`/venues/${id}/bookings`);
    return res.data;
  }, []);

  const fetchCoordinatorStats = useCallback(async () => {
    const res = await api.get('/coordinator/stats');
    return res.data;
  }, []);

  // ===== NOTIFICATIONS (client-side only) =====

  const addNotification = useCallback((notification) => {
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { id: Date.now(), isRead: false, createdAt: new Date().toISOString(), ...notification },
    });
  }, []);

  const markNotificationRead = useCallback((id) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' });
  }, []);

  const value = {
    state,
    dispatch,
    // auth
    login, registerClient, logout,
    // users/vendors
    fetchUsers, fetchVendors, toggleUserStatus, createVendor, toggleVendorStatus,
    fetchMyVendorProfile,
    // inquiries
    fetchInquiries, fetchInquiryById, createInquiry, updateInquiry,
    sendProposal, acceptProposal, rejectProposal, convertInquiryToEvent,
    // assignments
    fetchAssignmentsForEvent, respondToAssignment, claimAssignment,
    forceAssign, fetchOpenAssignments,
    fetchMyAssignments, fetchMyAssignment, rateAssignment,
    // venues
    fetchAvailableVenues, fetchAllVenues, fetchVenueById, fetchVenueBookings,
    // coordinator
    fetchCoordinatorStats,
    // notifications
    addNotification, markNotificationRead, markAllNotificationsRead,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export default AppContext;