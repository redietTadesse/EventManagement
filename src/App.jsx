import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './store/AppContext';

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
import Calendar from './components/Calendar';
import VendorDashboard from './vendor/VendorDashboard';
import VendorManagement from './admin/VendorManagement';
import VendorForm from './admin/VendorForm';
import VendorDetail from './admin/VendorDetail';
import AdminDashboard from './admin/Dashboard';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PortalSelect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/:portal?" element={<Login />} />

      {/* Client routes */}
      <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/new-inquiry" element={<NewInquiry />} />
      </Route>

      {/* Coordinator routes */}
      <Route element={<ProtectedRoute allowedRoles={['COORDINATOR']} />}>
        <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
        <Route path="/coordinator/inquiries" element={<AllInquiries />} />
        <Route path="/coordinator/inquiries/:id" element={<InquiryDetail />} />
        <Route path="/coordinator/events" element={<Events />} />
        <Route path="/coordinator/calendar" element={<Calendar />} />
      </Route>

      {/* Vendor routes */}
      <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
        <Route path="/vendor/dashboard" element={<VendorDashboard />} />
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/vendors" element={<VendorManagement />} />
        <Route path="/admin/vendors/new" element={<VendorForm />} />
        <Route path="/admin/vendors/:id/edit" element={<VendorForm />} />
        <Route path="/admin/vendors/:id" element={<VendorDetail />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;