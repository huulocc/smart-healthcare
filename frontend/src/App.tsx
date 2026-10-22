import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
// The public 404 belongs with the booking and doctor-details screens, so it keeps their look.
// The admin area has its own, which renders inside the admin shell.
import { NotFound as PublicNotFound } from './components/healthcare/HealthcareUI';
import AppointmentProvider from './context/AppointmentContext';
import AuthProvider from './context/AuthProvider';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import DoctorLayout from './layouts/DoctorLayout';
import MainLayout from './layouts/MainLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminDepartments from './pages/Admin/AdminDepartments';
import AdminDoctorRequests from './pages/Admin/AdminDoctorRequests';
import AdminDoctors from './pages/Admin/AdminDoctors';
import AdminSchedules from './pages/Admin/AdminSchedules';
import ComingSoon from './pages/Admin/ComingSoon';
import AppointmentDetails from './pages/Appointments/AppointmentDetails';
import Appointments from './pages/Appointments/Appointments';
import AuthPage from './pages/Auth/AuthPage';
import Booking from './pages/Booking/Booking';
import BookingResult from './pages/Booking/BookingResult';
import ChangePassword from './pages/ChangePassword/ChangePassword';
import DepartmentDetails from './pages/DepartmentDetails/DepartmentDetails';
import Departments from './pages/Departments/Departments';
import DoctorProfile from './pages/Doctor/DoctorProfile';
import DoctorSchedule from './pages/Doctor/DoctorSchedule';
import DoctorWorkspace from './pages/Doctor/DoctorWorkspace';
import DoctorDetails from './pages/DoctorDetails/DoctorDetails';
import Doctors from './pages/Doctors/Doctors';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import Home from './pages/Home/Home';
import NotFound from './pages/NotFound/NotFound';
import Profile from './pages/Profile/Profile';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import VerifyEmail from './pages/VerifyEmail/VerifyEmail';

function PublicPage({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

// Routed but unbuilt. Keeping the paths means the sidebar links and anyone's bookmarks still
// land somewhere that explains itself, and swapping in the real screen is a one-line change.
const soon = {
  patients: 'Patients will appear here once the patient records API exists.',
  appointments:
    'Booking has its own screens for patients and doctors. An admin view over every appointment still needs an API of its own.',
  payments: 'Payments follow booking: there is nothing to bill against yet.',
  ai: 'The AI chat widget runs on the RAG service, which does not record consultations yet.',
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppointmentProvider>
          <Routes>
            <Route
              path="/"
              element={
                <PublicPage>
                  <Home />
                </PublicPage>
              }
            />
            <Route
              path="/departments"
              element={
                <PublicPage>
                  <Departments />
                </PublicPage>
              }
            />
            <Route
              path="/departments/:id"
              element={
                <PublicPage>
                  <DepartmentDetails />
                </PublicPage>
              }
            />
            <Route
              path="/doctors"
              element={
                <PublicPage>
                  <Doctors />
                </PublicPage>
              }
            />
            <Route
              path="/doctors/:id"
              element={
                <PublicPage>
                  <DoctorDetails />
                </PublicPage>
              }
            />
            {['/book/:id', '/book/:id/details', '/book/:id/payment'].map(
              (path) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <PublicPage>
                      <Booking />
                    </PublicPage>
                  }
                />
              ),
            )}
            <Route
              path="/booking/result/:id"
              element={
                <PublicPage>
                  <BookingResult />
                </PublicPage>
              }
            />
            <Route
              path="/my-appointments"
              element={
                <PublicPage>
                  <Appointments />
                </PublicPage>
              }
            />
            <Route
              path="/appointments"
              element={
                <PublicPage>
                  <Appointments />
                </PublicPage>
              }
            />
            <Route
              path="/appointments/:id"
              element={
                <PublicPage>
                  <AppointmentDetails />
                </PublicPage>
              }
            />

            <Route path="/doctor" element={<DoctorLayout />}>
              <Route index element={<DoctorWorkspace />} />
              <Route path="appointments" element={<DoctorWorkspace />} />
              <Route path="appointments/:id" element={<AppointmentDetails />} />
              <Route path="schedule" element={<DoctorSchedule />} />
              <Route path="profile" element={<DoctorProfile />} />
            </Route>

            <Route
              path="/login"
              element={
                <AuthLayout>
                  <AuthPage />
                </AuthLayout>
              }
            />
            <Route
              path="/register"
              element={
                <AuthLayout>
                  <AuthPage />
                </AuthLayout>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <AuthLayout>
                  <ForgotPassword />
                </AuthLayout>
              }
            />
            <Route
              path="/reset-password"
              element={
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              }
            />
            <Route
              path="/verify-email"
              element={
                <AuthLayout>
                  <VerifyEmail />
                </AuthLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <PublicPage>
                    <Profile />
                  </PublicPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/change-password"
              element={
                <ProtectedRoute>
                  <PublicPage>
                    <ChangePassword />
                  </PublicPage>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <RequireRole role="ADMIN">
                  <AdminLayout />
                </RequireRole>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="doctors" element={<AdminDoctors />} />
              <Route path="doctor-requests" element={<AdminDoctorRequests />} />
              <Route path="departments" element={<AdminDepartments />} />
              <Route path="schedules" element={<AdminSchedules />} />
              <Route
                path="patients"
                element={<ComingSoon title="Patients" note={soon.patients} />}
              />
              <Route
                path="appointments"
                element={
                  <ComingSoon title="Appointments" note={soon.appointments} />
                }
              />
              <Route
                path="payments"
                element={
                  <ComingSoon title="Payments & Billing" note={soon.payments} />
                }
              />
              <Route
                path="ai-consultation"
                element={<ComingSoon title="AI Consultation" note={soon.ai} />}
              />
              <Route path="*" element={<NotFound inAdmin />} />
            </Route>

            <Route
              path="*"
              element={
                <PublicPage>
                  <PublicNotFound />
                </PublicPage>
              }
            />
          </Routes>
        </AppointmentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
