import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ROLE_SHORT_DESCRIPTIONS } from '../../config/roles';

const STAFF_ROLES = [
  { id: 'admin', label: 'Administrator' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'counselor', label: 'Counselor' },
];

const inputClass = (hasError) =>
  `px-3.5 py-2.5 border rounded-xl text-[14.5px] bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
      : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
  }`;

export default function StaffSignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    staffKey: '',
    role: 'teacher',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const selectedRole = STAFF_ROLES.find((r) => r.id === form.role) ?? STAFF_ROLES[1];

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    if (!form.staffKey.trim()) e.staffKey = 'Staff registration key is required';
    if (!form.role) e.role = 'Select a role';
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
      await api.post('/auth/register/staff', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        staff_key: form.staffKey,
      });
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Try again.';
      toast.error(typeof msg === 'string' ? msg : 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Staff registration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Register as admin, teacher, or counselor to access the dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Role</label>
            <div className="grid grid-cols-1 gap-2">
              {STAFF_ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, role: role.id }))}
                  className={`px-3 py-3 rounded-xl text-left border transition-all ${
                    form.role === role.id
                      ? 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-200'
                  }`}
                >
                  <span className="text-sm font-semibold block">{role.label}</span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    {ROLE_SHORT_DESCRIPTIONS[role.id]}
                  </span>
                </button>
              ))}
            </div>
            {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Full name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Dr. Jane Smith"
              autoComplete="name"
              className={inputClass(errors.name)}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Email address</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="jane@school.edu"
              autoComplete="email"
              className={inputClass(errors.email)}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Staff key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Staff registration key</label>
            <input
              type="password"
              name="staffKey"
              value={form.staffKey}
              onChange={handleChange}
              placeholder="Enter staff key"
              autoComplete="off"
              className={inputClass(errors.staffKey)}
            />
            {!errors.staffKey && (
              <p className="text-xs text-slate-400">
                Provided by your institution (local default: AttendAI-Staff-2026)
              </p>
            )}
            {errors.staffKey && <p className="text-sm text-red-500">{errors.staffKey}</p>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
                autoComplete="new-password"
                className={`w-full pr-11 ${inputClass(errors.password)}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Confirm password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              className={inputClass(errors.confirmPassword)}
            />
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:pointer-events-none mt-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Creating account…' : `Create ${selectedRole.label} account`}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-slate-500">
          Are you a student?{' '}
          <Link to="/signup" className="text-slate-700 hover:text-slate-900 font-medium underline underline-offset-2">
            Student registration
          </Link>
        </p>
      </div>

      <p className="mt-6 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} AttendAI — Smart Attendance System
      </p>
    </div>
  );
}
