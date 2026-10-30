import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';

import ProtectedRoute from './components/ProtectedRoute';
import RootRedirect from './components/RootRedirect';
import PortalSelect from './components/PortalSelect';
import Login from './components/Login';
import VendorApplication from './components/VendorApplication';

import ClientDashboard from './client/ClientDashboard';
import NewInquiry from './client/NewInquiry';
import ClientInquiries from './client/ClientInquiries';
import ClientInquiryDetail from './client/ClientInquiryDetail';
import ClientEventHistory from './client/ClientEventHistory';
import ClientEventDetail from './client/ClientEventDetail';

import CoordinatorDashboard from './coordinator/Dashboard';
import AllInquiries from './coordinator/AllInquiries';
import InquiryDetail from './coordinator/InquiryDetail';
import Events from './coordinator/Events';
import EventDetail from './coordinator/EventDetail';
import Venues from './coordinator/Venues';
import VenueDetail from './coordinator/VenueDetail';
import MasterCalendar from './components/MasterCalendar';
import AvailabilityGrid from './coordinator/AvailabilityGrid';

import VendorDashboard from './vendor/VendorDashboard';
import MyAssignments from './vendor/MyAssignments';
import AssignmentDetail from './vendor/AssignmentDetail';
import OpenAssignments from './vendor/OpenAssignments';

import AdminDashboard from './admin/Dashboard';
import VendorManagement from './admin/VendorManagement';
import VendorForm from './admin/VendorForm';
import VendorDetail from './admin/VendorDetail';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PortalSelect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/:portal?" element={<Login />} />
      <Route path="/vendor-application" element={<VendorApplication />} />

      <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/new-inquiry" element={<NewInquiry />} />
        <Route path="/client/inquiries" element={<ClientInquiries />} />
        <Route path="/client/inquiries/:id" element={<ClientInquiryDetail />} />
        <Route path="/client/events" element={<ClientEventHistory />} />
        <Route path="/client/events/:id" element={<ClientEventDetail />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['COORDINATOR']} />}>
        <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
        <Route path="/coordinator/inquiries" element={<AllInquiries />} />
        <Route path="/coordinator/inquiries/:id" element={<InquiryDetail />} />
        <Route path="/coordinator/events" element={<Events />} />
        <Route path="/coordinator/events/:id" element={<EventDetail />} />
        <Route path="/coordinator/venues" element={<Venues />} />
        <Route path="/coordinator/venues/:id" element={<VenueDetail />} />
        <Route path="/coordinator/calendar" element={<MasterCalendar />} />
        <Route path="/coordinator/availability" element={<AvailabilityGrid />} />
        {/* Uncomment only if the backend authorizes COORDINATOR on
            PATCH /vendors/{id}/toggle-active:
        <Route path="/coordinator/vendors" element={<VendorManagement />} />
        */}
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
        <Route path="/vendor/dashboard" element={<VendorDashboard />} />
        <Route path="/vendor/assignments" element={<MyAssignments />} />
        <Route path="/vendor/assignments/:id" element={<AssignmentDetail />} />
        <Route path="/vendor/open" element={<OpenAssignments />} />
      </Route>

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
    <ToastProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;