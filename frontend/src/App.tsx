import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import AuthProvider from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home/Home';
import Departments from './pages/Departments/Departments';
import Doctors from './pages/Doctors/Doctors';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Profile from './pages/Profile/Profile';
import ChangePassword from './pages/ChangePassword/ChangePassword';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminManagementPage from './components/admin/AdminManagementPage';
import AdminSchedules from './components/admin/AdminSchedules';
import AdminAccounts from './components/admin/AdminAccounts';
import AdminReports from './components/admin/AdminReports';
import AdminSettings from './components/admin/AdminSettings';
import AdminNotifications from './components/admin/AdminNotifications';

function PublicPage({ children }: { children: ReactNode }) { return <MainLayout>{children}</MainLayout>; }

function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/" element={<PublicPage><Home /></PublicPage>} />
    <Route path="/departments" element={<PublicPage><Departments /></PublicPage>} />
    <Route path="/doctors" element={<PublicPage><Doctors /></PublicPage>} />
    <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
    <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
    <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
    <Route path="/reset-password" element={<AuthLayout><ResetPassword /></AuthLayout>} />
    <Route path="/profile" element={<ProtectedRoute><PublicPage><Profile /></PublicPage></ProtectedRoute>} />
    <Route path="/profile/change-password" element={<ProtectedRoute><PublicPage><ChangePassword /></PublicPage></ProtectedRoute>} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="patients" element={<AdminManagementPage type="patients" />} />
      <Route path="doctors" element={<AdminManagementPage type="doctors" />} />
      <Route path="departments" element={<AdminManagementPage type="departments" />} />
      <Route path="appointments" element={<AdminManagementPage type="appointments" />} />
      <Route path="schedules" element={<AdminSchedules />} />
      <Route path="payments" element={<AdminManagementPage type="payments" />} />
      <Route path="ai-consultation" element={<AdminManagementPage type="ai" />} />
      <Route path="users" element={<AdminAccounts />} />
      <Route path="reports" element={<AdminReports />} />
      <Route path="notifications" element={<AdminNotifications />} />
      <Route path="settings" element={<AdminSettings />} />
    </Route>
  </Routes></AuthProvider></BrowserRouter>;
}

export default App;