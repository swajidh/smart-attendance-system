import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Eye,
  Users,
  BookOpen,
  ClipboardList,
  BrainCircuit,
  TriangleAlert,
  BarChart2,
  Settings,
  LogOut,
  User,
  ScanFace,
  ShieldAlert,
  ScanEye,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { NAV_ITEMS, canAccess, getRoleLabel } from '../../config/roles';

const ICONS = {
  Dashboard: LayoutDashboard,
  'Live Classroom': Eye,
  'My Batch': Users,
  Students: Users,
  'Face Enrollment': ScanFace,
  Courses: BookOpen,
  Attendance: ClipboardList,
  Attention: BrainCircuit,
  'Exam Monitoring': ScanEye,
  'Exam Review': ShieldAlert,
  Alerts: TriangleAlert,
  Reports: BarChart2,
  Administration: Settings,
};

export default function Sidebar({ isCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('smart_attendance_user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // best-effort
    }
    localStorage.removeItem('smart_attendance_token');
    localStorage.removeItem('smart_attendance_user');
    toast.success('Signed out');
    navigate('/login');
  };

  const userRole = user?.role || 'student';

  const visibleLinks = useMemo(() => {
    const sections = {};
    NAV_ITEMS.forEach((item) => {
      if (!canAccess(userRole, item.permission)) return;
      if (item.roles && !item.roles.includes(userRole)) return;
      if (!sections[item.category]) sections[item.category] = [];
      // Deduplicate Attendance/Reports both pointing to /dashboard/reports
      const exists = sections[item.category].some((i) => i.path === item.path && i.name === item.name);
      if (!exists) sections[item.category].push(item);
    });
    return Object.entries(sections).map(([category, items]) => ({ category, items }));
  }, [userRole]);

  return (
    <aside className={`fixed left-0 top-0 h-full w-[240px] bg-white border-r border-slate-200 flex flex-col z-20 transition-all duration-300 transform ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}`}>
      <div className="h-[72px] flex items-center px-6 pt-2">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 text-slate-900 font-bold text-[17px] tracking-tight hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Eye className="w-[18px] h-[18px] text-white" />
          </div>
          AttendAI
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto w-full py-4 px-3 custom-scrollbar">
        {visibleLinks.map((section) => (
          <div key={section.category} className="mb-6">
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              {section.category}
            </p>
            <ul className="space-y-[2px]">
              {section.items.map((link) => {
                const isActive = location.pathname === link.path
                  || (link.path !== '/dashboard' && location.pathname.startsWith(link.path));
                const Icon = ICONS[link.name] || LayoutDashboard;

                return (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className={`flex items-center gap-3.5 px-3 py-[10px] rounded-xl text-[14.5px] font-medium transition-colors ${
                        isActive
                          ? 'bg-[#EBF3FF] text-[#1E5BF0]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 stroke-[2] ${isActive ? 'text-[#1E5BF0]' : 'text-slate-400'}`} />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-3 mb-2 border-t border-slate-100">
        <Link
          to="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.name || 'Loading...'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {getRoleLabel(user?.role)}
            </p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3.5 w-full px-3 py-[10px] rounded-xl text-[14.5px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5 stroke-[2]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
