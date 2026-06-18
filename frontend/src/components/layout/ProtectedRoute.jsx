import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';

/**
 * Validates the stored JWT by calling GET /auth/me.
 * - No token → redirect to /login
 * - Invalid/expired token → clear storage, redirect to /login
 * - Valid token → render child routes; refresh stored user object
 */
export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const [status, setStatus] = useState('checking'); // 'checking' | 'authenticated' | 'unauthenticated'
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
        // Keep stored user in sync with latest server data
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

  // Students can only access /portal, not /dashboard
  if (!allowedRoles && user?.role === 'student') {
    return <Navigate to="/portal" replace />;
  }

  // Role guard — if caller specified allowedRoles, check against them
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Students trying to access staff-only routes → send to portal
    const fallback = user.role === 'student' ? '/portal' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
