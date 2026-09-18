import React, { createContext, useContext, useReducer } from 'react';

// ===== Mock Users =====
const users = [
  { id: 1, username: 'client1', password: 'password123', role: 'CLIENT', fullName: 'John Client', email: 'client@example.com' },
  { id: 4, username: 'coordinator1', password: 'password123', role: 'COORDINATOR', fullName: 'Jane Coordinator', email: 'coord@aicc.et' },
  { id: 2, username: 'vendor1', password: 'password123', role: 'VENDOR', fullName: 'AV Solutions', email: 'av@example.com' },
  { id: 3, username: 'vendor2', password: 'password123', role: 'VENDOR', fullName: 'Catering Plus', email: 'catering@example.com' },
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

// ===== Mock Inquiries =====
const initialInquiries = [
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

// ===== Mock Notifications =====
const initialNotifications = [
  { id: 1, userId: 4, title: 'New Inquiry', message: 'John Client submitted a conference inquiry', isRead: false, type: 'INQUIRY', createdAt: '2026-08-20T10:00:00' },
  { id: 2, userId: 4, title: 'Proposal Sent', message: 'Proposal sent for wedding inquiry', isRead: false, type: 'PROPOSAL', createdAt: '2026-08-22T14:00:00' },
];

// ===== Initial State =====
const initialState = {
  users: users || [],
  inquiries: initialInquiries || [],
  notifications: initialNotifications || [],
  currentUser: null,
};

// ===== Reducer =====
const reducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };

    case 'LOGOUT':
      return { ...state, currentUser: null };

    case 'CREATE_INQUIRY': {
      const newInquiry = {
        id: (state.inquiries?.length || 0) + 1,
        clientId: state.currentUser?.id,
        clientName: state.currentUser?.fullName || 'Unknown',
        ...action.payload,
        status: 'INQUIRY_SUBMITTED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const notif = {
        id: (state.notifications?.length || 0) + 1,
        userId: 4,
        title: 'New Inquiry',
        message: `${state.currentUser?.fullName || 'A client'} submitted a ${action.payload.eventType} inquiry`,
        isRead: false,
        type: 'INQUIRY',
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        inquiries: [...(state.inquiries || []), newInquiry],
        notifications: [...(state.notifications || []), notif],
      };
    }

    default:
      return state;
  }
};

// ===== Context =====
const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
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