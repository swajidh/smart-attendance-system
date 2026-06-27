import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Brain, CalendarDays, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, LogOut, RefreshCw, User,
  Clock, Award, AlertTriangle,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────
const attColor = (score) => {
  if (!score) return 'text-slate-400';
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-rose-600';
};

const attBg = (score) => {
  if (!score) return 'bg-slate-50';
  if (score >= 70) return 'bg-emerald-50 border-emerald-100';
  if (score >= 40) return 'bg-amber-50 border-amber-100';
  return 'bg-rose-50 border-rose-100';
};

const attPctColor = (pct) => {
  if (pct >= 85) return 'text-emerald-600';
  if (pct >= 75) return 'text-amber-600';
  return 'text-rose-600';
};

function logout() {
  localStorage.removeItem('smart_attendance_token');
  localStorage.removeItem('smart_attendance_user');
  window.location.href = '/login';
}

function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function StudentPortal() {
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [attention, setAttention] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | calendar | attention | courses

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [profileRes, attRes, attnRes, coursesRes] = await Promise.allSettled([
      api.get('/portal/me'),
      api.get('/portal/attendance'),
      api.get('/portal/attention'),
      api.get('/portal/courses'),
    ]);

    if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
    else if (profileRes.reason?.response?.status === 404) {
      toast.error('No student record linked to your account. Ask an admin to add you with the same email.');
    } else if (profileRes.status === 'rejected') {
      toast.error('Could not load your profile.');
    }
    if (attRes.status === 'fulfilled') setAttendance(attRes.value.data);
    else if (attRes.status === 'rejected' && attRes.reason?.response?.status !== 404) {
      toast.error('Could not load attendance data.');
    }
    if (attnRes.status === 'fulfilled') setAttention(attnRes.value.data);
    else if (attnRes.status === 'rejected' && attnRes.reason?.response?.status !== 404) {
      toast.error('Could not load attention data.');
    }
    if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data);
    else if (coursesRes.status === 'rejected' && coursesRes.reason?.response?.status !== 404) {
      toast.error('Could not load enrolled courses.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const storedUser = JSON.parse(localStorage.getItem('smart_attendance_user') || '{}');
  const overallAtt =
    attendance?.overall?.overall_percentage
    ?? attendance?.overall?.overall_attendance_pct
    ?? 0;
  const overallAttn = attention?.overall_avg ?? 0;
  const enrolledCount = courses.length;

  // ── calendar ──────────────────────────────────────────────────────────────
  const calendarMap = {};
  (attendance?.calendar || []).forEach(r => {
    const key = localDateKey(new Date(r.date));
    const prev = calendarMap[key];
    if (!prev || prev !== 'present') {
      calendarMap[key] = r.status;
    }
  });

  // Build last 90 days grid (local dates — matches how users read the calendar)
  const today = new Date();
  const calDays = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (89 - i));
    const key = localDateKey(d);
    return { date: key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), status: calendarMap[key] };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-medium">Loading your portal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/20 font-sans text-slate-800">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">Smart Attendance</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Student Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Nav tabs */}
            <div className="hidden md:flex gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'calendar', label: 'Calendar' },
                { id: 'attention', label: 'Attention' },
                { id: 'courses', label: 'Courses' },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    tab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Profile chip */}
            <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                {(profile?.name || storedUser?.name || 'S').charAt(0)}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-800">{profile?.name || storedUser?.name || 'Student'}</p>
                <p className="text-[10px] text-slate-400">{profile?.roll_no || '—'}</p>
              </div>
              <button onClick={logout} className="ml-2 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="md:hidden flex border-t border-slate-100 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'calendar', label: 'Calendar' },
            { id: 'attention', label: 'Attention' },
            { id: 'courses', label: 'Courses' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8 pb-16">

        {!profile && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 text-sm">Account not linked to a student record</p>
              <p className="text-amber-700 text-xs mt-1">
                An administrator must register you as a student using the same email as this login
                ({storedUser?.email || 'your account email'}). Then sign out and sign in again.
              </p>
            </div>
          </div>
        )}

        {/* ── Overview ──────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Welcome card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-[28px] p-8 text-white overflow-hidden relative">
              <div className="absolute -right-6 -bottom-6 w-40 h-40 rounded-full bg-white/5" />
              <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/5" />
              <p className="text-blue-200 text-sm font-semibold mb-1">Welcome back</p>
              <h1 className="text-3xl font-bold mb-1">{profile?.name || storedUser?.name || 'Student'}</h1>
              <p className="text-blue-200 text-sm">{profile?.roll_no} · {profile?.department || 'Student'}</p>
              <div className="mt-6 flex gap-4 flex-wrap">
                <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm border border-white/10">
                  <p className="text-blue-200 text-[10px] font-bold uppercase">Attendance</p>
                  <p className="text-2xl font-bold">{overallAtt.toFixed(1)}%</p>
                </div>
                <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm border border-white/10">
                  <p className="text-blue-200 text-[10px] font-bold uppercase">Avg Attention</p>
                  <p className="text-2xl font-bold">{overallAttn > 0 ? `${overallAttn}/100` : '—'}</p>
                </div>
                <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur-sm border border-white/10">
                  <p className="text-blue-200 text-[10px] font-bold uppercase">Courses</p>
                  <p className="text-2xl font-bold">{enrolledCount}</p>
                </div>
              </div>
            </div>

            {/* Risk banner */}
            {overallAtt < 75 && overallAtt > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <p className="font-bold text-rose-700 text-sm">Attendance Warning</p>
                  <p className="text-rose-600 text-xs">Your attendance is at {overallAtt.toFixed(1)}% — below the required 75%. Please speak with your academic advisor.</p>
                </div>
              </div>
            )}

            {profile?.low_attention_warning && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <Brain className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-amber-800 text-sm">Attention Warning</p>
                  <p className="text-amber-700 text-xs">
                    Your average attention score is {profile.overall_attention}/100 — below the expected threshold. Try to stay engaged during class sessions.
                  </p>
                </div>
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PortalStatCard
                label="Overall Attendance"
                value={`${overallAtt.toFixed(1)}%`}
                icon={CalendarDays}
                color={overallAtt >= 75 ? 'emerald' : 'rose'}
                sub={overallAtt >= 75 ? 'On track' : 'Below threshold'}
              />
              <PortalStatCard
                label="Avg Attention"
                value={overallAttn > 0 ? `${overallAttn}/100` : '—'}
                icon={Brain}
                color={overallAttn >= 60 ? 'blue' : 'amber'}
                sub={overallAttn >= 60 ? 'Good focus' : overallAttn > 0 ? 'Needs improvement' : 'No data yet'}
              />
              <PortalStatCard
                label="Courses Enrolled"
                value={enrolledCount}
                icon={BookOpen}
                color="blue"
                sub="Active modules"
              />
              <PortalStatCard
                label="Sessions (90d)"
                value={attendance?.calendar?.length ?? 0}
                icon={Clock}
                color="slate"
                sub="Classes attended"
              />
            </div>

            {/* Monthly attendance mini-bar */}
            {(attendance?.monthly?.length ?? 0) > 0 && (
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-1">Monthly Attendance</h3>
                <p className="text-xs text-slate-400 mb-5">Classes attended per month over the last 6 months</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={attendance.monthly} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow text-xs">
                            <p className="font-bold">{d.month}</p>
                            <p>Present: <strong className="text-emerald-600">{d.present}</strong></p>
                            <p>Absent: <strong className="text-rose-500">{d.absent}</strong></p>
                            <p>Rate: <strong>{d.attendance_pct}%</strong></p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Course quick list */}
            {courses.length > 0 && (
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">My Courses</h3>
                <div className="space-y-3">
                  {courses.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-[10px] uppercase">
                          {c.code.split('-')[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{c.code}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${attPctColor(c.attendance_pct)}`}>{c.attendance_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Calendar ──────────────────────────────────────────────────────── */}
        {tab === 'calendar' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Attendance Calendar</h2>
              <p className="text-sm text-slate-500 mt-1">Last 90 days — each square represents one class day.</p>
            </div>

            {/* Legend */}
            <div className="flex gap-4 flex-wrap">
              {[
                { cls: 'bg-emerald-500', label: 'Present' },
                { cls: 'bg-rose-400', label: 'Absent' },
                { cls: 'bg-slate-200', label: 'No class' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${l.cls}`} />
                  <span className="text-xs text-slate-500 font-medium">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                {calDays.map(d => (
                  <div key={d.date} title={`${d.label}: ${d.status || 'no class'}`}
                    className={`aspect-square rounded-lg transition-transform hover:scale-110 cursor-default ${
                      d.status === 'present' ? 'bg-emerald-500'
                      : d.status ? 'bg-rose-400'
                      : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Per-course breakdown */}
            {(attendance?.overall?.per_course?.length ?? 0) > 0 && (
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Per-Course Breakdown</h3>
                <div className="space-y-4">
                  {attendance.overall.per_course.map(c => (
                    <div key={c.course_id}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-700">{c.course_name}</span>
                        <span className={`text-sm font-bold ${attPctColor(c.attendance_pct)}`}>{c.attendance_pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${c.attendance_pct >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${c.attendance_pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {c.present_sessions ?? c.present ?? 0}/{c.total_sessions ?? c.total ?? 0} sessions
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Attention ─────────────────────────────────────────────────────── */}
        {tab === 'attention' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Attention Trends</h2>
              <p className="text-sm text-slate-500 mt-1">Your focus and engagement analytics across sessions.</p>
            </div>

            {/* Overall score */}
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.2" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={overallAttn >= 70 ? '#10b981' : overallAttn >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3.2" strokeDasharray={`${(overallAttn / 100) * 100} 100`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-800">{overallAttn > 0 ? Math.round(overallAttn) : '—'}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Attention Score</p>
                <p className={`text-3xl font-bold mt-1 ${attColor(overallAttn)}`}>
                  {overallAttn > 0 ? `${overallAttn}/100` : 'No data'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {overallAttn >= 70 ? '🟢 Great focus — keep it up!'
                   : overallAttn >= 40 ? '🟡 Moderate engagement. Try to minimize distractions.'
                   : overallAttn > 0 ? '🔴 Low engagement detected. Consider talking to your advisor.'
                   : 'Attend sessions with attention tracking enabled.'}
                </p>
              </div>
            </div>

            {/* Weekly trend line */}
            {(attention?.weekly_trend?.length ?? 0) > 0 ? (
              <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-1">Weekly Attention Trend</h3>
                <p className="text-xs text-slate-400 mb-5">Average attention score per week (last 8 weeks)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={attention.weekly_trend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow text-xs">
                            <p className="font-bold text-slate-700">{d.week}</p>
                            <p>Attention: <strong className={attColor(d.avg_score)}>{d.avg_score}</strong></p>
                            <p className="text-slate-400">{d.samples} samples</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4"
                      label={{ value: 'Good', fill: '#10b981', fontSize: 9, position: 'right' }} />
                    <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4"
                      label={{ value: 'Moderate', fill: '#f59e0b', fontSize: 9, position: 'right' }} />
                    <Line type="monotone" dataKey="avg_score" stroke="#3b82f6" strokeWidth={2.5}
                      dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-white rounded-[24px] border border-slate-100 p-10 text-center shadow-sm">
                <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No attention data yet.</p>
                <p className="text-slate-300 text-xs mt-1">Attend sessions where attention tracking is active.</p>
              </div>
            )}

            {/* Per-session table */}
            {(attention?.per_session?.length ?? 0) > 0 && (
              <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Session History</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Attention score per attended session</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-3">Course</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Attention Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attention.per_session.map(s => (
                        <tr key={s.session_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3">
                            <p className="font-semibold text-slate-800 text-sm">{s.course_name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{s.course_code}</p>
                          </td>
                          <td className="px-6 py-3 text-xs text-slate-500">{s.date}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${s.avg_score >= 70 ? 'bg-emerald-500' : s.avg_score >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
                                  style={{ width: `${s.avg_score}%` }} />
                              </div>
                              <span className={`text-sm font-bold ${attColor(s.avg_score)}`}>{s.avg_score}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Courses ───────────────────────────────────────────────────────── */}
        {tab === 'courses' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Courses</h2>
              <p className="text-sm text-slate-500 mt-1">Your enrolled modules and attendance breakdown.</p>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-slate-100 p-12 text-center shadow-sm">
                <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">You are not enrolled in any courses yet.</p>
                <p className="text-slate-300 text-xs mt-1">Contact your lecturer or administrator.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {courses.map(course => (
                  <div key={course.id}
                    className={`bg-white rounded-[24px] border p-6 shadow-sm hover:shadow-md transition-all ${attBg(course.avg_attention)}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xs uppercase">
                          {course.code.split('-')[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{course.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{course.code}</p>
                        </div>
                      </div>
                      <AttBadge pct={course.attendance_pct} />
                    </div>

                    {/* Schedule */}
                    {(course.slots || []).length > 0 && (
                      <div className="mb-4 space-y-1">
                        {course.slots.slice(0, 2).map((slot, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                            {typeof slot === 'object' ? `${slot.day} ${slot.time}` : slot}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Attendance bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                        <span>Attendance</span>
                        <span className={attPctColor(course.attendance_pct)}>{course.attendance_pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${course.attendance_pct >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${course.attendance_pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Sessions</p>
                        <p className="text-lg font-bold text-slate-700">{course.total_sessions}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Present</p>
                        <p className="text-lg font-bold text-emerald-600">{course.present}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Absent</p>
                        <p className="text-lg font-bold text-rose-500">{course.absent}</p>
                      </div>
                    </div>

                    {/* Attention */}
                    {course.avg_attention > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <Brain className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500">Avg attention:</span>
                        <span className={`font-bold ${attColor(course.avg_attention)}`}>{course.avg_attention}/100</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PortalStatCard({ label, value, icon: Icon, color, sub }) {
  const map = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose:    'bg-rose-50 text-rose-600 border-rose-100',
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    slate:   'bg-slate-50 text-slate-500 border-slate-100',
  };
  return (
    <div className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 ${map[color] || map.slate}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function AttBadge({ pct }) {
  if (pct >= 85) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">{pct}%</span>;
  if (pct >= 75) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">{pct}%</span>;
  if (pct > 0)   return <span className="text-xs font-bold px-2 py-1 rounded-full bg-rose-100 text-rose-700">{pct}%</span>;
  return <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-400">—</span>;
}
