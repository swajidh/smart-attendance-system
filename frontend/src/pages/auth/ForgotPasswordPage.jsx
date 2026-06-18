import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email'); return; }

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
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
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-sm text-slate-500 mb-6">
              If an account exists for <span className="font-medium text-slate-700">{email}</span>,
              you'll receive a password reset link shortly.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
              <p className="text-sm text-slate-500 mt-1">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@school.edu"
                  autoComplete="email"
                  className={`px-3.5 py-2.5 border rounded-xl text-[14.5px] bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} AttendAI — Smart Attendance System
      </p>
    </div>
  );
}
