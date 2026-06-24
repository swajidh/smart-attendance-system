import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PanelLeft, Eye, LogOut, User, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

function userInitials(user) {
  if (!user?.name) return '?';
  const parts = user.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export default function Topbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
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

  return (
    <header className="h-[72px] bg-white flex items-center justify-between px-6 sticky top-0 z-10 w-full border-b border-transparent shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all active:scale-95"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 text-slate-900 font-bold text-[17px] tracking-tight hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Eye className="w-[18px] h-[18px] text-white" />
          </div>
          AttendAI
        </Link>
      </div>

      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E5BF0]"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <div className="h-9 w-9 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#1E5BF0] font-bold text-sm tracking-wide">
            {userInitials(user)}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-100 shadow-lg py-1 z-50"
            role="menu"
          >
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              <p className="text-[10px] text-slate-400 capitalize mt-0.5">{user?.role || 'user'}</p>
            </div>
            <Link
              to="/dashboard/profile"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              Profile
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
