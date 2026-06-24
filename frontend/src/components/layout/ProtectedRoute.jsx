import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';
import { canAccess } from '../../config/roles';

/**
 * Validates the stored JWT by calling GET /auth/me.
 * - No token → redirect to /login
 * - Invalid/expired token → clear storage, redirect to /login
 * - Valid token → render child routes; refresh stored user object
 *
 * Guards (optional):
 * - allowedRoles: legacy role list check
 * - requiredPermission: canonical permission from config/roles.js
 */
export default function ProtectedRoute({ allowedRoles, requiredPermission }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('smart_attendance_token');
    if (!token) {
      setStatus('unauthenticated');
      return;
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        localStorage.setItem('smart_attendance_user', JSON.stringify(data));
        setUser(data);
        setStatus('authenticated');
      })
      .catch(() => {
        localStorage.removeItem('smart_attendance_token');
        localStorage.removeItem('smart_attendance_user');
        setStatus('unauthenticated');
      });
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Students can only access /portal, not /dashboard (when no explicit guard)
  if (!allowedRoles && !requiredPermission && user?.role === 'student') {
    return <Navigate to="/portal" replace />;
  }

  // Permission guard (canonical matrix)
  if (requiredPermission && user && !canAccess(user.role, requiredPermission)) {
    const fallback = user.role === 'student' ? '/portal' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  // Legacy role guard
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'student' ? '/portal' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  // Student-only routes: redirect staff away from /portal
  if (allowedRoles?.length === 1 && allowedRoles[0] === 'student' && user?.role !== 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
