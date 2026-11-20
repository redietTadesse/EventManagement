import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';

import ProtectedRoute from './components/ProtectedRoute';
import RootRedirect from './components/RootRedirect';
import LandingPage from './components/LandingPage';
import PageErrorBoundary from './components/PageErrorBoundary';
import Login from './components/Login';
import { AppearanceController } from './components/Appearance';
const PasswordRecovery = lazy(() => import('./components/PasswordRecovery'));
const VendorApplication = lazy(() => import('./components/VendorApplication'));

const ClientDashboard = lazy(() => import('./client/ClientDashboard'));
const NewInquiry = lazy(() => import('./client/NewInquiry'));
const ClientInquiries = lazy(() => import('./client/ClientInquiries'));
const ClientInquiryDetail = lazy(() => import('./client/ClientInquiryDetail'));
const ClientEventHistory = lazy(() => import('./client/ClientEventHistory'));
const ClientEventDetail = lazy(() => import('./client/ClientEventDetail'));
const ClientVenues = lazy(() => import('./client/ClientVenues'));

const CoordinatorDashboard = lazy(() => import('./coordinator/Dashboard'));
const AllInquiries = lazy(() => import('./coordinator/AllInquiries'));
const InquiryDetail = lazy(() => import('./coordinator/InquiryDetail'));
const Events = lazy(() => import('./coordinator/Events'));
const EventDetail = lazy(() => import('./coordinator/EventDetail'));
const Venues = lazy(() => import('./coordinator/Venues'));
const VenueSchedule = lazy(() => import('./coordinator/VenueSchedule'));
const BookingFollowups = lazy(() => import('./coordinator/BookingFollowups'));
const AutomaticAssistance = lazy(() => import('./coordinator/AutomaticAssistance'));
const VenueDetail = lazy(() => import('./coordinator/VenueDetail'));
const MasterCalendar = lazy(() => import('./components/MasterCalendar'));
const AvailabilityGrid = lazy(() => import('./coordinator/AvailabilityGrid'));
const CoordinatorVendors = lazy(() => import('./coordinator/CoordinatorVendors'));
const IncidentReviewPanel = lazy(() => import('./coordinator/IncidentReviewPanel'));

const VendorDashboard = lazy(() => import('./vendor/VendorDashboard'));
const FaydaCallback = lazy(() => import('./vendor/FaydaVerification').then(module => ({ default: module.FaydaCallback })));
const MyAssignments = lazy(() => import('./vendor/MyAssignments'));
const AssignmentDetail = lazy(() => import('./vendor/AssignmentDetail'));
const OpenAssignments = lazy(() => import('./vendor/OpenAssignments'));

const AdminDashboard = lazy(() => import('./admin/Dashboard'));
const AdminCoordinators = lazy(() => import('./admin/Coordinators'));
const VendorManagement = lazy(() => import('./admin/VendorManagement'));
const VendorApplications = lazy(() => import('./admin/VendorApplications'));
const VendorForm = lazy(() => import('./admin/VendorForm'));
const VendorDetail = lazy(() => import('./admin/VendorDetail'));
const AdminVenues = lazy(() => import('./admin/Venues'));

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<PasswordRecovery />} />
      <Route path="/reset-password" element={<PasswordRecovery reset />} />
      <Route path="/login/:portal?" element={<Login />} />
      <Route path="/vendor-application" element={<VendorApplication />} />

      <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/new-inquiry" element={<NewInquiry />} />
        <Route path="/client/venues" element={<ClientVenues />} />
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
        <Route path="/coordinator/assistance" element={<AutomaticAssistance />} />
        <Route path="/coordinator/follow-ups" element={<BookingFollowups />} />
        <Route path="/coordinator/venue-schedule" element={<VenueSchedule />} />
        <Route path="/coordinator/venues" element={<Venues />} />
        <Route path="/coordinator/venues/:id" element={<VenueDetail />} />
        <Route path="/coordinator/calendar" element={<MasterCalendar />} />
        <Route path="/coordinator/availability" element={<AvailabilityGrid />} />
        <Route path="/coordinator/vendors" element={<CoordinatorVendors />} />
        <Route path="/coordinator/incident-reviews" element={<IncidentReviewPanel />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
        <Route path="/vendor/dashboard" element={<VendorDashboard />} />
        <Route path="/vendor/fayda/callback" element={<FaydaCallback />} />
        <Route path="/callback" element={<FaydaCallback />} />
        <Route path="/vendor/assignments" element={<MyAssignments />} />
        <Route path="/vendor/assignments/:id" element={<AssignmentDetail />} />
        <Route path="/vendor/open" element={<OpenAssignments />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/coordinators" element={<AdminCoordinators />} />
        <Route path="/admin/vendors" element={<VendorManagement />} />
        <Route path="/admin/vendor-applications" element={<VendorApplications />} />
        <Route path="/admin/vendors/new" element={<VendorForm />} />
        <Route path="/admin/vendors/:id/edit" element={<VendorForm />} />
        <Route path="/admin/vendors/:id" element={<VendorDetail />} />
        <Route path="/admin/venues" element={<AdminVenues />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppearanceController />
      <AppProvider>
        <BrowserRouter>
          <PageErrorBoundary><Suspense fallback={<div role="status" aria-live="polite" className="page-loading"><span className="page-loading-mark" aria-hidden="true">AICC</span><p>Opening your workspace…</p></div>}><AppRoutes /></Suspense></PageErrorBoundary>
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
