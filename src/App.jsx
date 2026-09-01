import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function AppRoutes() {
  return (
    <Routes>
      {/* Public: portal selection comes before login */}
      <Route path="/" element={<PortalSelect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/:portal?" element={<Login />} />

      {/* Client routes */}
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/new-inquiry"
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <NewInquiry />
          </ProtectedRoute>
        }
      />

      {/* Coordinator routes */}
      <Route
        path="/coordinator/dashboard"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/inquiries"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <AllInquiries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/inquiries/:id"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <InquiryDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/events"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <Events />
          </ProtectedRoute>
        }
      />

      {/* Vendor routes */}
      <Route
        path="/vendor/dashboard"
        element={
          <ProtectedRoute allowedRoles={['VENDOR']}>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Unknown paths → role-aware redirect (or login) */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;