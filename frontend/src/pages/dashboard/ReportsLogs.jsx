import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Search,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  History,
  TrendingDown,
  TrendingUp,
  Filter,
  ArrowRight,
  MoreHorizontal,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import api from '../../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function ReportsLogs() {
  // ── state ────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [courses, setCourses] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);

  const [filterCourse, setFilterCourse] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('sessions'); // sessions | at-risk

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // ── data fetching ─────────────────────────────────────────────────────────
  const buildParams = () => {
    const p = new URLSearchParams();
    if (filterCourse !== 'all') p.set('course_id', filterCourse);
    if (startDate) p.set('start_date', new Date(startDate).toISOString());
    if (endDate) p.set('end_date', new Date(endDate).toISOString());
    return p.toString();
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = buildParams();
    try {
      const [summaryRes, trendRes, atRiskRes, coursesRes] = await Promise.allSettled([
        api.get(`/reports/attendance${params ? '?' + params : ''}`),
        api.get(`/reports/trends?period=${filterPeriod}${filterCourse !== 'all' ? '&course_id=' + filterCourse : ''}`),
        api.get('/reports/at-risk'),
        api.get('/courses'),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (trendRes.status === 'fulfilled') setTrendData(trendRes.value.data);
      if (atRiskRes.status === 'fulfilled') setAtRisk(atRiskRes.value.data);
      if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data);
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCourse, filterPeriod, startDate, endDate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── session detail overlay ────────────────────────────────────────────────
  const openSessionDetail = async (session) => {
    setSelectedSession(session);
    try {
      const res = await api.get(`/reports/last-seen?session_id=${session.id}`);
      setSelectedSessionDetail(res.data);
    } catch {
      setSelectedSessionDetail([]);
    }
  };

  const closeDetail = () => { setSelectedSession(null); setSelectedSessionDetail(null); };

  // ── export helpers ────────────────────────────────────────────────────────
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportFile = async (format) => {
    setExporting(true);
    const params = buildParams();
    const url = `/reports/export/${format}${params ? '?' + params : ''}`;
    const toastId = toast.loading(`Generating ${format.toUpperCase()} report…`);
    try {
      const token = localStorage.getItem('smart_attendance_token');
      const res = await fetch(`${API_BASE}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const ts = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `attendance_${ts}.${format}`);
      toast.success(`${format.toUpperCase()} downloaded!`, { id: toastId });
    } catch (err) {
      toast.error(`Export failed: ${err.message}`, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const exportSessionDetail = async (session) => {
    setExporting(true);
    const params = new URLSearchParams({ course_id: session.course_id });
    const toastId = toast.loading('Generating session PDF…');
    try {
      const token = localStorage.getItem('smart_attendance_token');
      const res = await fetch(`${API_BASE}/reports/export/pdf?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      triggerDownload(blob, `session_${session.session_id}.pdf`);
      toast.success('PDF downloaded!', { id: toastId });
    } catch (err) {
      toast.error(`Export failed: ${err.message}`, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const sessions = summary?.sessions ?? [];
  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.course_name.toLowerCase().includes(q) ||
      s.session_id.toLowerCase().includes(q) ||
      s.course_code.toLowerCase().includes(q)
    );
  });

  const stats = {
    totalSessions: summary?.total_sessions ?? 0,
    avgAttendance: summary?.avg_attendance_pct ?? 0,
    anomalies: sessions.filter((s) => s.attendance_pct < 50 || s.total_unknown > 5).length,
    activeCourses: [...new Set(sessions.map((s) => s.course_id))].length,
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      <PageHeader
        title="Reports & Analytics"
        description="Converting raw classroom activity into academic intelligence and audit trails."
        actions={
          <div className="flex gap-3">
            <Button
              variant="outline"
              icon={Download}
              disabled={exporting}
              onClick={() => exportFile('csv')}
            >
              Export All CSV
            </Button>
            <Button
              variant="primary"
              icon={FileText}
              disabled={exporting}
              onClick={() => exportFile('pdf')}
            >
              Generate PDF
            </Button>
          </div>
        }
      />

      {/* Filters row */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Course</label>
              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From</label>
              <input
                type="date"
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To</label>
              <input
                type="date"
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={fetchAll}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Apply'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sessions"
          value={stats.totalSessions}
          icon={History}
          trend="Closed sessions"
          color="blue"
        />
        <StatCard
          title="Avg. Attendance"
          value={`${stats.avgAttendance}%`}
          icon={BarChart3}
          trend={stats.avgAttendance > 80 ? 'Stable Performance' : 'Below Target'}
          color={stats.avgAttendance > 80 ? 'emerald' : 'amber'}
          isPositive={stats.avgAttendance > 80}
        />
        <StatCard
          title="Anomalies"
          value={stats.anomalies}
          icon={AlertTriangle}
          trend="Flagged sessions"
          color={stats.anomalies > 0 ? 'rose' : 'slate'}
          isWarning={stats.anomalies > 0}
        />
        <StatCard
          title="Active Courses"
          value={stats.activeCourses}
          icon={CheckCircle2}
          trend="In selected range"
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: tab view — sessions | at-risk */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab bar */}
          <div className="flex gap-2 border-b border-slate-100 pb-1">
            {[
              { id: 'sessions', label: 'Session Archive' },
              { id: 'at-risk', label: `At-Risk Students (${atRisk.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t-xl text-xs font-bold uppercase tracking-widest transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'sessions' && (
            <Card noPadding className="border-slate-100 shadow-sm overflow-hidden rounded-[32px]">
              <CardHeader
                title="Audit Trail: Session Archives"
                subtitle="Immutable record of all finalized attendance sessions."
                action={
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search…"
                      className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none w-48 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Session Info</th>
                      <th className="px-6 py-4">Engagement</th>
                      <th className="px-6 py-4 text-center">Unknowns</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSessions.map((session) => {
                      const isAnomaly = session.attendance_pct < 50 || session.total_unknown > 5;
                      return (
                        <tr
                          key={session.id}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          onClick={() => openSessionDetail(session)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  isAnomaly ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                {session.course_code.slice(0, 3).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{session.course_name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">
                                  {session.session_id} · {new Date(session.start_time).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 w-24">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                <span>{session.attendance_pct}%</span>
                                <span>{session.total_present}/{session.total_enrolled}</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    session.attendance_pct > 80
                                      ? 'bg-emerald-500'
                                      : session.attendance_pct > 50
                                      ? 'bg-blue-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${session.attendance_pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={session.total_unknown > 0 ? 'warning' : 'success'} className="text-[10px]">
                              {session.total_unknown} Unknown
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {isAnomaly ? (
                              <div className="flex items-center gap-1 text-rose-600 font-bold text-[10px] uppercase">
                                <AlertTriangle className="w-3 h-3" /> Anomaly
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase">
                                <CheckCircle2 className="w-3 h-3" /> Verified
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 text-slate-300 group-hover:text-blue-600 transition-colors">
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSessions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                          {loading ? 'Loading sessions…' : 'No sessions found. Complete a Live Classroom session to see reports.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'at-risk' && (
            <Card noPadding className="border-slate-100 shadow-sm overflow-hidden rounded-[32px]">
              <CardHeader
                title="At-Risk Students"
                subtitle="Students with attendance below 75%. Severity: warning 60–75%, critical <60%."
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Sessions</th>
                      <th className="px-6 py-4">Attendance</th>
                      <th className="px-6 py-4">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {atRisk.map((student) => (
                      <tr key={student.student_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              student.severity === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{student.student_name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{student.roll_no}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{student.department || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {student.present_sessions}/{student.total_sessions}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${student.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}
                                style={{ width: `${student.attendance_pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${student.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                              {student.attendance_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={student.severity === 'critical' ? 'danger' : 'warning'}>
                            {student.severity}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {atRisk.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                          {loading ? 'Loading…' : 'No at-risk students found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Right: trend chart + quick exports */}
        <div className="space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-[28px] bg-slate-900 text-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-lg">Attendance Trend</h4>
                <select
                  className="text-[10px] bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white font-bold uppercase"
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={trendData} margin={{ top: 4, right: 0, bottom: 0, left: -30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#94A3B8', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                      labelStyle={{ color: '#94A3B8' }}
                      itemStyle={{ color: '#60A5FA' }}
                      formatter={(value) => [`${value}%`, 'Avg. Attendance']}
                    />
                    <Bar dataKey="avg_attendance_pct" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
                  {loading ? 'Loading trend data…' : 'No data yet. Complete sessions to see trends.'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader title="Quick Export" className="pb-0" />
            <CardContent className="p-6 space-y-3">
              <ExportButton
                title="Attendance History"
                subtitle="Student-wise analytics"
                format="PDF"
                onClick={() => exportFile('pdf')}
                loading={exporting}
              />
              <ExportButton
                title="Course Performance"
                subtitle="Session summaries"
                format="CSV"
                onClick={() => exportFile('csv')}
                loading={exporting}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Session detail overlay */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-2xl shadow-2xl rounded-[32px]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <Badge variant="primary" className="mb-2">{selectedSession.session_id}</Badge>
                <h3 className="text-2xl font-bold text-slate-900">{selectedSession.course_name}</h3>
                <p className="text-sm text-slate-500">
                  {selectedSession.course_code} · {new Date(selectedSession.start_time).toLocaleString()}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Present</p>
                  <p className="text-xl font-bold text-emerald-600">{selectedSession.total_present}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Absent</p>
                  <p className="text-xl font-bold text-rose-600">{selectedSession.total_absent}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-center border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Unknowns</p>
                  <p className="text-xl font-bold text-amber-600">{selectedSession.total_unknown}</p>
                </div>
              </div>
              <h4 className="font-bold text-slate-800 mb-4">Roster Scan Results</h4>
              <div className="space-y-2">
                {selectedSessionDetail ? (
                  selectedSessionDetail.map((s) => (
                    <div
                      key={s.student_id}
                      className="flex items-center justify-between p-3 border border-slate-50 rounded-xl text-sm"
                    >
                      <div>
                        <span className="font-medium text-slate-700">{s.student_name}</span>
                        <span className="text-xs text-slate-400 ml-2">{s.roll_no}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {s.first_seen && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            {new Date(s.first_seen).toLocaleTimeString()}
                          </span>
                        )}
                        <Badge variant={s.status === 'present' ? 'success' : 'outline'}>
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm text-center py-4">Loading roster…</p>
                )}
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeDetail}>
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                icon={Download}
                disabled={exporting}
                onClick={() => exportSessionDetail(selectedSession)}
              >
                Export Detail PDF
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, trend, color, isPositive, isWarning }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    slate: 'bg-slate-50 text-slate-400 border-slate-100',
  };
  return (
    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isWarning ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          ) : isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className={`text-[11px] font-bold ${isWarning ? 'text-rose-500' : isPositive ? 'text-emerald-500' : 'text-slate-400'}`}>
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportButton({ title, subtitle, format, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-between p-4 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group disabled:opacity-50"
    >
      <div className="text-left">
        <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{title}</p>
        <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>
      </div>
      <div
        className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${
          format === 'PDF' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
        }`}
      >
        {format}
      </div>
    </button>
  );
}
