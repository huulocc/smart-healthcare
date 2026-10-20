import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import AuthProvider from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home/Home';
import Departments from './pages/Departments/Departments';
import Doctors from './pages/Doctors/Doctors';
import AuthPage from './pages/Auth/AuthPage';
import Profile from './pages/Profile/Profile';
import ChangePassword from './pages/ChangePassword/ChangePassword';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import VerifyEmail from './pages/VerifyEmail/VerifyEmail';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminManagementPage from './components/admin/AdminManagementPage';
import AdminSchedules from './components/admin/AdminSchedules';
import AdminAccounts from './components/admin/AdminAccounts';
import AdminReports from './components/admin/AdminReports';
import AdminSettings from './components/admin/AdminSettings';
import AdminNotifications from './components/admin/AdminNotifications';
import AppointmentProvider from './context/AppointmentContext';
import DoctorDetails from './pages/DoctorDetails/DoctorDetails';
import Booking from './pages/Booking/Booking';
import Appointments from './pages/Appointments/Appointments';
import AppointmentDetails from './pages/Appointments/AppointmentDetails';
import DoctorWorkspace from './pages/Doctor/DoctorWorkspace';
import { NotFound } from './components/healthcare/HealthcareUI';
import DepartmentDetails from './pages/DepartmentDetails/DepartmentDetails';
import BookingResult from './pages/Booking/BookingResult';
import DoctorLayout from './layouts/DoctorLayout';
import DoctorSchedule from './pages/Doctor/DoctorSchedule';
import DoctorProfile from './pages/Doctor/DoctorProfile';

function PublicPage({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}

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
            <Route
              path="/departments/:id"
              element={
                <PublicPage>
                  <DepartmentDetails />
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
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route
                path="patients"
                element={<AdminManagementPage type="patients" />}
              />
              <Route
                path="doctors"
                element={<AdminManagementPage type="doctors" />}
              />
              <Route
                path="departments"
                element={<AdminManagementPage type="departments" />}
              />
              <Route
                path="appointments"
                element={<AdminManagementPage type="appointments" />}
              />
              <Route path="schedules" element={<AdminSchedules />} />
              <Route
                path="payments"
                element={<AdminManagementPage type="payments" />}
              />
              <Route
                path="ai-consultation"
                element={<AdminManagementPage type="ai" />}
              />
              <Route path="users" element={<AdminAccounts />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route
              path="*"
              element={
                <PublicPage>
                  <NotFound />
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
