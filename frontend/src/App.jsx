import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';  // ← UPDATED PATH

import ProtectedRoute from './components/ProtectedRoute';
import RootRedirect from './components/RootRedirect';
import PortalSelect from './components/PortalSelect';
import Login from './components/Login';

import ClientDashboard from './client/ClientDashboard';
import NewInquiry from './client/NewInquiry';

import CoordinatorDashboard from './coordinator/Dashboard';
import AllInquiries from './coordinator/AllInquiries';
import InquiryDetail from './coordinator/InquiryDetail';
import Events from './coordinator/Events';

import VendorDashboard from './vendor/VendorDashboard';

import VendorManagement from './admin/VendorManagement';
import VendorForm from './admin/VendorForm';
import VendorDetail from './admin/VendorDetail';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortalSelect />} />
          <Route path="/login/:portal?" element={<Login />} />
          <Route path="/dashboard" element={<RootRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/new-inquiry" element={<NewInquiry />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['COORDINATOR']} />}>
            <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
            <Route path="/coordinator/inquiries" element={<AllInquiries />} />
            <Route path="/coordinator/inquiries/:id" element={<InquiryDetail />} />
            <Route path="/coordinator/events" element={<Events />} />
            <Route path="/coordinator/vendors" element={<VendorManagement />} />
            <Route path="/coordinator/vendors/new" element={<VendorForm />} />
            <Route path="/coordinator/vendors/:id" element={<VendorDetail />} />
            <Route path="/coordinator/vendors/:id/edit" element={<VendorForm />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;