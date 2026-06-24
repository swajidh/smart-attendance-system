import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token');
    }
  }, [token]);

  const validate = () => {
    const e = {};
    if (!form.newPassword) e.newPassword = 'Password is required';
    else if (form.newPassword.length < 8) e.newPassword = 'Password must be at least 8 characters';
    if (form.confirmPassword !== form.newPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: form.newPassword,
      });
      toast.success('Password reset successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Reset failed. The link may have expired.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid reset link</h2>
          <p className="text-sm text-slate-500 mb-6">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow">
          <Eye className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-900">AttendAI</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                placeholder="Min 8 characters"
                autoComplete="new-password"
                className={`w-full px-3.5 py-2.5 pr-11 border rounded-xl text-[14.5px] bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.newPassword
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword}</p>}
          </div>

          {/* Confirm */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Confirm password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              className={`px-3.5 py-2.5 border rounded-xl text-[14.5px] bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                errors.confirmPassword
                  ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            />
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:pointer-events-none mt-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} AttendAI — Smart Attendance System
      </p>
    </div>
  );
}
