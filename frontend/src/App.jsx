import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/landing/LandingPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { PERMISSIONS } from './config/roles';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import StaffSignupPage from './pages/auth/StaffSignupPage';
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
import CounselorBatchPage from './pages/dashboard/CounselorBatchPage';
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
          <Route path="/staff/signup" element={<StaffSignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Staff dashboard */}
          <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.dashboard_view} />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="profile" element={<ProfilePage />} />

              <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.live_sessions} />}>
                <Route path="live" element={<LiveClassroom />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.manage_students} />}>
                <Route path="students" element={<StudentManagement />} />
                <Route path="enrollment" element={<FaceEnrollment />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.manage_courses} />}>
                <Route path="courses" element={<CourseDashboard />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.batches_read} />}>
                <Route path="my-batch" element={<CounselorBatchPage />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.alerts} />}>
                <Route path="alerts" element={<AlertsPage />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.attention_read} />}>
                <Route path="attention" element={<AttentionAnalysis />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.reports_read} />}>
                <Route path="reports" element={<ReportsLogs />} />
              </Route>

              <Route element={<ProtectedRoute requiredPermission={PERMISSIONS.system_admin} />}>
                <Route path="settings" element={<SystemSettings />} />
              </Route>
            </Route>
          </Route>

          {/* Student portal */}
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
