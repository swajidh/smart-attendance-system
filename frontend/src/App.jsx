import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/landing/LandingPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import CourseDashboard from './pages/dashboard/CourseDashboard';
import FaceEnrollment from './pages/dashboard/FaceEnrollment';
import LiveClassroom from './pages/dashboard/LiveClassroom';
import AttentionAnalysis from './pages/dashboard/AttentionAnalysis';
import ReportsLogs from './pages/dashboard/ReportsLogs';
import SystemSettings from './pages/dashboard/SystemSettings';
import StudentManagement from './pages/dashboard/StudentManagement';
import ProfilePage from './pages/dashboard/ProfilePage';
import AlertsPage from './pages/dashboard/AlertsPage';

// Student Portal
import StudentPortal from './pages/portal/StudentPortal';

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected dashboard — all authenticated roles */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="live" element={<LiveClassroom />} />
              <Route path="attention" element={<AttentionAnalysis />} />
              <Route path="reports" element={<ReportsLogs />} />

              {/* Teacher + counselor + admin — alerts & intervention */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher', 'counselor']} />}>
                <Route path="alerts" element={<AlertsPage />} />
              </Route>

              {/* Admin + teacher only */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
                <Route path="students" element={<StudentManagement />} />
                <Route path="enrollment" element={<FaceEnrollment />} />
                <Route path="courses" element={<CourseDashboard />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="settings" element={<SystemSettings />} />
              </Route>
            </Route>
          </Route>

          {/* Student portal — students only */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/portal" element={<StudentPortal />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}
