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
  ScanFace
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

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
      // best-effort — clear locally regardless
    }
    localStorage.removeItem('smart_attendance_token');
    localStorage.removeItem('smart_attendance_user');
    toast.success('Signed out');
    navigate('/login');
  };

  const navLinks = [
    {
      category: "OVERVIEW",
      roles: ['admin', 'teacher', 'counselor'],
      items: [
        { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { name: "Live Classroom", path: "/dashboard/live", icon: Eye }
      ]
    },
    {
      category: "MANAGEMENT",
      roles: ['admin', 'teacher'],
      items: [
        { name: "Students", path: "/dashboard/students", icon: Users },
        { name: "Face Enrollment", path: "/dashboard/enrollment", icon: ScanFace },
        { name: "Courses", path: "/dashboard/courses", icon: BookOpen },
        { name: "Attendance", path: "/dashboard/reports", icon: ClipboardList }
      ]
    },
    {
      category: "ANALYTICS",
      roles: ['admin', 'teacher', 'counselor'],
      items: [
        { name: "Attention", path: "/dashboard/attention", icon: BrainCircuit },
        { name: "Alerts", path: "/dashboard/alerts", icon: TriangleAlert },
        { name: "Reports", path: "/dashboard/reports", icon: BarChart2 }
      ]
    },
    {
      category: "SYSTEM",
      roles: ['admin'],
      items: [
        { name: "Administration", path: "/dashboard/settings", icon: Settings }
      ]
    }
  ];

  // Only show nav items permitted for the authenticated user's role
  const userRole = user?.role || 'student';
  const visibleLinks = navLinks.filter(section => !section.roles || section.roles.includes(userRole));

  return (
    <aside className={`fixed left-0 top-0 h-full w-[240px] bg-white border-r border-slate-200 flex flex-col z-20 transition-all duration-300 transform ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}`}>
      {/* Logo Area */}
      <div className="h-[72px] flex items-center px-6 pt-2">
        <div className="flex items-center gap-3 text-slate-900 font-bold text-[17px] tracking-tight">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Eye className="w-[18px] h-[18px] text-white" />
          </div>
          AttendAI
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto w-full py-4 px-3 custom-scrollbar">
        {visibleLinks.map((section, idx) => (
          <div key={idx} className="mb-6">
            <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              {section.category}
            </p>
            <ul className="space-y-[2px]">
              {section.items.map((link) => {
                const isActive = location.pathname === link.path || (link.path !== "/dashboard" && location.pathname.startsWith(link.path));
                const Icon = link.icon;
                
                return (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className={`flex items-center gap-3.5 px-3 py-[10px] rounded-xl text-[14.5px] font-medium transition-colors ${
                        isActive 
                          ? "bg-[#EBF3FF] text-[#1E5BF0]" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`w-5 h-5 stroke-[2] ${isActive ? "text-[#1E5BF0]" : "text-slate-400"}`} />
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* User Info & Sign Out */}
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
            <p className="text-[11px] text-slate-500 capitalize truncate">
              {user?.role || 'User'}
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
