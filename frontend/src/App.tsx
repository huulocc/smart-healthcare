import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import AuthProvider from './context/AuthProvider';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminDoctorRequests from './pages/Admin/AdminDoctorRequests';
import AdminDepartments from './pages/Admin/AdminDepartments';
import AdminDoctors from './pages/Admin/AdminDoctors';
import AdminSchedules from './pages/Admin/AdminSchedules';
import ComingSoon from './pages/Admin/ComingSoon';
import AuthPage from './pages/Auth/AuthPage';
import ChangePassword from './pages/ChangePassword/ChangePassword';
import Departments from './pages/Departments/Departments';
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
    'Booking is being built by another part of the team. This screen will be connected when its API exists.',
  payments: 'Payments follow booking: there is nothing to bill against yet.',
  ai: 'The AI chat widget runs on the RAG service, which does not record consultations yet.',
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                <NotFound />
              </PublicPage>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
