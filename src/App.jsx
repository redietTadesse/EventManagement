import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
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
import AvailabilityGrid from './coordinator/AvailabilityGrid.jsx';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PortalSelect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/:portal?" element={<Login />} />

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
      <Route
        path="/client/inquiries"
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <ClientInquiries />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/inquiries/:id"
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <InquiryDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/events"
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <ClientEventHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/events/:id"
        element={
          <ProtectedRoute allowedRoles={['CLIENT']}>
            <ClientEventDetail />
          </ProtectedRoute>
        }
      />

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

      <Route
        path="/vendor/dashboard"
        element={
          <ProtectedRoute allowedRoles={['VENDOR']}>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/assignments"
        element={
          <ProtectedRoute allowedRoles={['VENDOR']}>
            <MyAssignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/assignments/:id"
        element={
          <ProtectedRoute allowedRoles={['VENDOR']}>
            <AssignmentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/open"
        element={
          <ProtectedRoute allowedRoles={['VENDOR']}>
            <OpenAssignments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/vendors"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <VendorManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendors/new"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <VendorForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendors/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <VendorForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vendors/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <VendorDetail />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;