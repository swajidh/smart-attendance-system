import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/landing/LandingPage';
import DashboardLayout from './components/dashboard/DashboardLayout';

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import CourseDashboard from './pages/dashboard/CourseDashboard';
import FaceEnrollment from './pages/dashboard/FaceEnrollment';
import LiveClassroom from './pages/dashboard/LiveClassroom';
import AttentionAnalysis from './pages/dashboard/AttentionAnalysis';
import ReportsLogs from './pages/dashboard/ReportsLogs';
import SystemSettings from './pages/dashboard/SystemSettings';

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium' }} />
      <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="enrollment" element={<FaceEnrollment />} />
          <Route path="courses" element={<CourseDashboard />} />
          <Route path="live" element={<LiveClassroom />} />
          <Route path="attention" element={<AttentionAnalysis />} />
          <Route path="reports" element={<ReportsLogs />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>
      </Routes>
    </Router>
    </>
  );
}
