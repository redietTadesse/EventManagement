import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './store/AppContext';

import ProtectedRoute from './components/ProtectedRoute';
import RootRedirect from './components/RootRedirect';
import PortalSelect from './components/PortalSelect';
import Login from './components/Login';
import ClientDashboard from './client/ClientDashboard';
import NewInquiry from './client/NewInquiry';
import ClientInquiries from './client/ClientInquiries';
import ClientEventHistory from './client/ClientEventHistory';
import ClientEventDetail from './client/ClientEventDetail';
import CoordinatorDashboard from './coordinator/Dashboard';
import AllInquiries from './coordinator/AllInquiries';
import InquiryDetail from './coordinator/InquiryDetail';
import Events from './coordinator/Events';
import EventDetail from './coordinator/EventDetail';
import Venues from './coordinator/Venues';
import VenueDetail from './coordinator/VenueDetail';
import Calendar from './components/Calendar';
import VendorDashboard from './vendor/VendorDashboard';
import MyAssignments from './vendor/MyAssignments';
import AssignmentDetail from './vendor/AssignmentDetail';
import OpenAssignments from './vendor/OpenAssignments';
import VendorManagement from './admin/VendorManagement';
import VendorForm from './admin/VendorForm';
import VendorDetail from './admin/VendorDetail';
import AdminDashboard from './admin/Dashboard';
import AvailabilityGrid from './coordinator/AvailabilityGrid.jsx';

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
      <Route
        path="/coordinator/events/:id"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <EventDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/venues"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <Venues />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/venues/:id"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <VenueDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/calendar"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/availability"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <AvailabilityGrid />
          </ProtectedRoute>
        }
      />
     
      <Route
        path="/coordinator/venues"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <Venues />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinator/venues/:id"
        element={
          <ProtectedRoute allowedRoles={['COORDINATOR']}>
            <VenueDetail />
          </ProtectedRoute>
        }
      />

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