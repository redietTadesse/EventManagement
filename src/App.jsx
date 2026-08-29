import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './store/AppContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import ClientDashboard from './pages/client/ClientDashboard';
import NewInquiry from './pages/client/NewInquiry';
import MyInquiries from './pages/client/MyInquiries';
import ClientInquiryDetail from './pages/client/InquiryDetail';
import ProposalView from './pages/client/ProposalView';
import VendorDashboard from './pages/vendor/VendorDashboard';
import Assignments from './pages/vendor/Assignments';
import AssignmentDetail from './pages/vendor/AssignmentDetail';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import AllInquiries from './pages/coordinator/AllInquiries';
import CoordinatorInquiryDetail from './pages/coordinator/InquiryDetail';
import AllEvents from './pages/coordinator/AllEvents';
import EventDetail from './pages/coordinator/EventDetail';
import AllVendors from './pages/coordinator/AllVendors';
import Venues from './pages/coordinator/Venues';
import VendorProfile from './pages/VendorProfile';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { state } = useApp();
  const { currentUser } = state;
  if (!currentUser) return <Navigate to="/login" />;
  if (allowedRole && currentUser.role !== allowedRole) return <Navigate to="/" />;
  return children;
};

const HomeRedirect = () => {
  const { state } = useApp();
  const { currentUser } = state;
  if (!currentUser) return <Navigate to="/login" />;
  switch (currentUser.role) {
    case 'CLIENT': return <Navigate to="/client/dashboard" />;
    case 'VENDOR': return <Navigate to="/vendor/dashboard" />;
    case 'COORDINATOR': return <Navigate to="/coordinator/dashboard" />;
    default: return <Navigate to="/login" />;
  }
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Navbar />
        <main className="container mx-auto px-4 py-6 max-w-7xl page-enter">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<HomeRedirect />} />

            <Route path="/client/dashboard" element={<ProtectedRoute allowedRole="CLIENT"><ClientDashboard /></ProtectedRoute>} />
            <Route path="/client/inquiries/new" element={<ProtectedRoute allowedRole="CLIENT"><NewInquiry /></ProtectedRoute>} />
            <Route path="/client/inquiries" element={<ProtectedRoute allowedRole="CLIENT"><MyInquiries /></ProtectedRoute>} />
            <Route path="/client/inquiries/:id" element={<ProtectedRoute allowedRole="CLIENT"><ClientInquiryDetail /></ProtectedRoute>} />
            <Route path="/client/proposals/:id" element={<ProtectedRoute allowedRole="CLIENT"><ProposalView /></ProtectedRoute>} />

            <Route path="/vendor/dashboard" element={<ProtectedRoute allowedRole="VENDOR"><VendorDashboard /></ProtectedRoute>} />
            <Route path="/vendor/assignments" element={<ProtectedRoute allowedRole="VENDOR"><Assignments /></ProtectedRoute>} />
            <Route path="/vendor/assignments/:id" element={<ProtectedRoute allowedRole="VENDOR"><AssignmentDetail /></ProtectedRoute>} />
            <Route path="/vendor/:id" element={<ProtectedRoute><VendorProfile /></ProtectedRoute>} />

            <Route path="/coordinator/dashboard" element={<ProtectedRoute allowedRole="COORDINATOR"><CoordinatorDashboard /></ProtectedRoute>} />
            <Route path="/coordinator/inquiries" element={<ProtectedRoute allowedRole="COORDINATOR"><AllInquiries /></ProtectedRoute>} />
            <Route path="/coordinator/inquiries/:id" element={<ProtectedRoute allowedRole="COORDINATOR"><CoordinatorInquiryDetail /></ProtectedRoute>} />
            <Route path="/coordinator/events" element={<ProtectedRoute allowedRole="COORDINATOR"><AllEvents /></ProtectedRoute>} />
            <Route path="/coordinator/events/:id" element={<ProtectedRoute allowedRole="COORDINATOR"><EventDetail /></ProtectedRoute>} />
            <Route path="/coordinator/vendors" element={<ProtectedRoute allowedRole="COORDINATOR"><AllVendors /></ProtectedRoute>} />
            <Route path="/coordinator/venues" element={<ProtectedRoute allowedRole="COORDINATOR"><Venues /></ProtectedRoute>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;