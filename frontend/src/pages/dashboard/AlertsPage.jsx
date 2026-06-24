import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Users,
  Activity,
  Settings,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Brain,
  ChevronDown,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────

const severityConfig = {
  critical: { label: 'Critical', color: 'text-rose-700 bg-rose-100 border-rose-200', dot: 'bg-rose-500' },
  high:     { label: 'High',     color: 'text-orange-700 bg-orange-100 border-orange-200', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   color: 'text-amber-700 bg-amber-100 border-amber-200', dot: 'bg-amber-400' },
  low:      { label: 'Low',      color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
};

const corrFlagConfig = {
  double_risk:           { label: 'Double Risk',          color: 'text-rose-700 bg-rose-100' },
  hidden_disengagement:  { label: 'Hidden Disengagement', color: 'text-purple-700 bg-purple-100' },
  poor_attendance:       { label: 'Poor Attendance',      color: 'text-orange-700 bg-orange-100' },
  at_risk:               { label: 'At Risk',              color: 'text-amber-700 bg-amber-100' },
  healthy:               { label: 'Healthy',              color: 'text-emerald-700 bg-emerald-100' },
};

const scatterFill = {
  double_risk: '#ef4444',
  hidden_disengagement: '#a855f7',
  poor_attendance: '#f97316',
  at_risk: '#f59e0b',
  healthy: '#10b981',
};

// ── main ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [searchParams] = useSearchParams();
  const storedUser = JSON.parse(localStorage.getItem('smart_attendance_user') || '{}');
  const userRole = storedUser?.role || '';
  const isCounselor = userRole === 'counselor';

  const [tab, setTab] = useState('alerts');  // alerts | risk | correlation | settings
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState(searchParams.get('batch_id') || '');
  const [alerts, setAlerts] = useState([]);
  const [riskList, setRiskList] = useState([]);
  const [correlation, setCorrelation] = useState([]);
  const [courses, setCourses] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [notifPrefs, setNotifPrefs] = useState({ dashboard: true, email: false, frequency: 'immediate' });
  const [loading, setLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState(false);
  const [editThreshold, setEditThreshold] = useState(null); // { course_id, attention_threshold, attendance_threshold }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const batchParam = batchId ? `&batch_id=${batchId}` : '';
    const [alertsRes, riskRes, corrRes, coursesRes, notifRes] = await Promise.allSettled([
      api.get(`/alerts?resolved=${filterResolved}&limit=200${batchParam}`),
      api.get(`/alerts/risk-list${batchId ? `?batch_id=${batchId}` : ''}`),
      api.get(`/reports/correlation/batch?limit=200${batchId ? `&batch_id=${batchId}` : ''}`),
      api.get('/courses'),
      api.get('/alerts/notifications'),
    ]);
    if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data);
    if (riskRes.status === 'fulfilled') setRiskList(riskRes.value.data);
    if (corrRes.status === 'fulfilled') setCorrelation(corrRes.value.data);
    if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data);
    if (notifRes.status === 'fulfilled') setNotifPrefs(notifRes.value.data);
    setLoading(false);

    // Fetch thresholds per course
    const cs = coursesRes.status === 'fulfilled' ? coursesRes.value.data : [];
    if (cs.length > 0) {
      const threshRes = await Promise.all(
        cs.map(c => api.get(`/alerts/thresholds?course_id=${c.id}`).catch(() => null))
      );
      setThresholds(threshRes.filter(Boolean).map(r => r.data));
    }
  }, [filterResolved, batchId]);

  useEffect(() => {
    if (!isCounselor) return;
    api.get('/batches/mine')
      .then((res) => {
        setBatches(res.data);
        if (!batchId && res.data.length > 0) {
          setBatchId(res.data[0].id);
        }
      })
      .catch(() => {});
  }, [isCounselor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resolveAlert = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
      toast.success('Alert resolved');
    } catch { toast.error('Failed to resolve alert'); }
  };

  const saveThreshold = async () => {
    if (!editThreshold) return;
    try {
      await api.post('/alerts/thresholds', editThreshold);
      toast.success('Threshold saved');
      setEditThreshold(null);
      fetchAll();
    } catch { toast.error('Failed to save threshold'); }
  };

  const saveNotifPrefs = async (prefs) => {
    try {
      await api.put('/alerts/notifications', prefs);
      setNotifPrefs(prefs);
      toast.success('Notification preferences saved');
    } catch { toast.error('Failed to save preferences'); }
  };

  // ── stats ─────────────────────────────────────────────────────────────────
  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved);
  const doubleRisk = correlation.filter(c => c.correlation_flag === 'double_risk');

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      <PageHeader
        title="Alerts & Intervention"
        description="Real-time engagement alerts, risk identification, and academic intervention tools."
        actions={
          <div className="flex items-center gap-3">
            {isCounselor && batches.length > 0 && (
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <Button variant="outline" icon={RefreshCw} onClick={fetchAll} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Bell} label="Unresolved Alerts" value={unresolvedAlerts.length}
          color={unresolvedAlerts.length > 0 ? 'rose' : 'slate'} />
        <StatCard icon={ShieldAlert} label="Critical Alerts" value={criticalAlerts.length}
          color={criticalAlerts.length > 0 ? 'rose' : 'slate'} />
        <StatCard icon={Users} label="At-Risk Students" value={riskList.length}
          color={riskList.length > 0 ? 'amber' : 'slate'} />
        <StatCard icon={Activity} label="Double-Risk" value={doubleRisk.length}
          color={doubleRisk.length > 0 ? 'purple' : 'slate'} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-slate-100 pb-1 flex-wrap">
        {[
          { id: 'alerts', label: `Alerts (${unresolvedAlerts.length})` },
          { id: 'risk', label: `Risk List (${riskList.length})` },
          { id: 'correlation', label: 'Correlation Report' },
          { id: 'settings', label: 'Thresholds & Notifications' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Alerts tab ──────────────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <Card noPadding className="border-slate-100 shadow-sm overflow-hidden rounded-[32px]">
          <CardHeader
            title="Alert Log"
            subtitle="Immutable record of engagement and attendance alerts."
            action={
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterResolved}
                  onChange={e => setFilterResolved(e.target.checked)}
                  className="rounded"
                />
                Show resolved
              </label>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {loading ? 'Loading…' : 'No alerts found.'}
                    </td>
                  </tr>
                ) : alerts.map(alert => {
                  const sev = severityConfig[alert.severity] || severityConfig.low;
                  return (
                    <tr key={alert.id} className={`hover:bg-slate-50/50 transition-colors ${alert.resolved ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 text-sm">{alert.student_name || '—'}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{alert.roll_no || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                          {alert.alert_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${sev.color}`}>
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-slate-600 truncate">{alert.message}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(alert.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!alert.resolved ? (
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mx-auto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Risk list tab ────────────────────────────────────────────────────── */}
      {tab === 'risk' && (
        <Card noPadding className="border-slate-100 shadow-sm overflow-hidden rounded-[32px]">
          <CardHeader
            title="Academic Risk List"
            subtitle="Students with repeated attendance or engagement issues in the last 4 weeks."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Attendance</th>
                  <th className="px-6 py-4">Avg Attention</th>
                  <th className="px-6 py-4">Risk Factors</th>
                  <th className="px-6 py-4">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riskList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      {loading ? 'Loading…' : 'No at-risk students found.'}
                    </td>
                  </tr>
                ) : riskList.map(student => (
                  <tr key={student.student_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                          {(student.student_name || 'S').charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{student.student_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{student.roll_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.attendance_pct != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${student.attendance_pct}%` }} />
                          </div>
                          <span className="text-sm font-bold text-rose-600">{student.attendance_pct}%</span>
                        </div>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {student.avg_attention != null ? (
                        <div className="flex items-center gap-1 text-sm font-bold text-amber-600">
                          <Brain className="w-3.5 h-3.5" /> {student.avg_attention}
                        </div>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.risk_factors.map(f => (
                          <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            {f.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-slate-600">{student.recommended_action}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Correlation tab ──────────────────────────────────────────────────── */}
      {tab === 'correlation' && (
        <div className="space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(corrFlagConfig).map(([k, v]) => (
              <span key={k} className={`text-xs font-bold px-3 py-1 rounded-full ${v.color}`}>{v.label}</span>
            ))}
          </div>

          {/* Scatter chart */}
          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader
              title="Attendance × Attention Correlation"
              subtitle="Each dot is a student. Red zone = double-risk."
            />
            <CardContent className="p-6">
              {correlation.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 10, right: 30, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="attendance_pct" type="number" domain={[0, 100]} name="Attendance %"
                      tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}>
                      <Label value="Attendance %" offset={-15} position="insideBottom" style={{ fill: '#94a3b8', fontSize: 11 }} />
                    </XAxis>
                    <YAxis dataKey="avg_attention" type="number" domain={[0, 100]} name="Avg Attention"
                      tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}>
                      <Label value="Avg Attention" angle={-90} position="insideLeft" style={{ fill: '#94a3b8', fontSize: 11 }} />
                    </YAxis>
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        if (!d) return null;
                        const fc = corrFlagConfig[d.correlation_flag] || corrFlagConfig.healthy;
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
                            <p className="font-bold text-slate-800">{d.student_name}</p>
                            <p className="text-slate-500">{d.roll_no}</p>
                            <p>Attendance: <strong>{d.attendance_pct}%</strong></p>
                            <p>Attention: <strong>{d.avg_attention}</strong></p>
                            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${fc.color}`}>
                              {fc.label}
                            </span>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={75} stroke="#f59e0b" strokeDasharray="4 4"
                      label={{ value: '75% threshold', fill: '#f59e0b', fontSize: 10, position: 'top' }} />
                    <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4"
                      label={{ value: 'Attention threshold', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                    <Scatter
                      data={correlation}
                      fill="#3b82f6"
                      shape={(props) => {
                        const { cx, cy, payload } = props;
                        const color = scatterFill[payload.correlation_flag] || '#94a3b8';
                        return <circle cx={cx} cy={cy} r={6} fill={color} fillOpacity={0.8} stroke="white" strokeWidth={1.5} />;
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  {loading ? 'Loading…' : 'No correlation data yet. Run sessions to populate.'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Correlation table */}
          {correlation.length > 0 && (
            <Card noPadding className="border-slate-100 shadow-sm overflow-hidden rounded-[28px]">
              <CardHeader title="Student Breakdown" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-3">Student</th>
                      <th className="px-6 py-3">Attendance</th>
                      <th className="px-6 py-3">Avg Attention</th>
                      <th className="px-6 py-3">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {correlation.slice(0, 50).map(s => {
                      const fc = corrFlagConfig[s.correlation_flag] || corrFlagConfig.healthy;
                      return (
                        <tr key={s.student_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3">
                            <p className="font-semibold text-slate-800 text-sm">{s.student_name}</p>
                            <p className="text-[10px] text-slate-400">{s.roll_no}</p>
                          </td>
                          <td className="px-6 py-3 text-sm font-bold text-slate-700">{s.attendance_pct}%</td>
                          <td className="px-6 py-3 text-sm font-bold text-slate-700">{s.avg_attention || '—'}</td>
                          <td className="px-6 py-3">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${fc.color}`}>{fc.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Settings tab ─────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Threshold configuration */}
          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader
              title="Attention Thresholds"
              subtitle="Set per-course thresholds for low-engagement detection."
            />
            <CardContent className="p-6 space-y-4">
              {courses.length === 0 ? (
                <p className="text-sm text-slate-400">No courses found.</p>
              ) : courses.map(course => {
                const stored = thresholds.find(t => t.course_id === course.id);
                const isEditing = editThreshold?.course_id === course.id;
                const attVal = isEditing
                  ? editThreshold.attention_threshold
                  : (stored?.attention_threshold ?? 40);
                return (
                  <div key={course.id} className="p-4 border border-slate-100 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{course.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{course.code}</p>
                      </div>
                      {!isEditing ? (
                        <button
                          onClick={() => setEditThreshold({
                            course_id: course.id,
                            attention_threshold: attVal,
                            attendance_threshold: stored?.attendance_threshold ?? 75,
                          })}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={saveThreshold}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-800">Save</button>
                          <button onClick={() => setEditThreshold(null)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Attention threshold: {attVal}/100
                      </label>
                      <input
                        type="range" min={0} max={100} step={5}
                        value={attVal}
                        disabled={!isEditing}
                        onChange={e => setEditThreshold(prev => ({
                          ...prev,
                          attention_threshold: Number(e.target.value),
                        }))}
                        className="w-full mt-1 accent-blue-600 disabled:opacity-50"
                      />
                      <div className="flex justify-between text-[9px] text-slate-300 font-bold mt-0.5">
                        <span>0</span><span>50</span><span>100</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Notification preferences */}
          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader
              title="Notification Preferences"
              subtitle="Configure how and when you receive alert notifications."
            />
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <ToggleRow
                  label="Dashboard Notifications"
                  sub="Show alert banners in the live classroom view"
                  checked={notifPrefs.dashboard}
                  onChange={v => saveNotifPrefs({ ...notifPrefs, dashboard: v })}
                />
                <ToggleRow
                  label="Email Notifications"
                  sub="Send email for critical and high-severity alerts"
                  checked={notifPrefs.email}
                  onChange={v => saveNotifPrefs({ ...notifPrefs, email: v })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alert Frequency</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {['immediate', 'hourly', 'daily'].map(freq => (
                    <button
                      key={freq}
                      onClick={() => saveNotifPrefs({ ...notifPrefs, frequency: freq })}
                      className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        notifPrefs.frequency === freq
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement heatmap */}
          <Card className="border-slate-100 shadow-sm rounded-[28px] lg:col-span-2">
            <CardHeader
              title="Classroom Engagement Heatmap"
              subtitle="Seating-arrangement view of average attention scores. Students are ordered by attention (left = highest)."
            />
            <CardContent className="p-6">
              {correlation.length > 0 ? (
                <EngagementHeatmap students={correlation} />
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">
                  Run sessions with attention tracking to see the heatmap.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    rose:   'bg-rose-50 text-rose-600 border-rose-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    slate:  'bg-slate-50 text-slate-400 border-slate-100',
  };
  return (
    <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${colorMap[color] || colorMap.slate}`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function EngagementHeatmap({ students }) {
  // Sort descending by attention; lay out in a classroom grid (6 columns)
  const sorted = [...students].sort((a, b) => (b.avg_attention || 0) - (a.avg_attention || 0));
  const COLS = 6;

  const scoreToColor = (score) => {
    if (score == null || score === 0) return 'bg-slate-200';
    if (score >= 70) return 'bg-emerald-400';
    if (score >= 50) return 'bg-emerald-200';
    if (score >= 40) return 'bg-amber-300';
    if (score >= 25) return 'bg-orange-400';
    return 'bg-rose-500';
  };

  return (
    <div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0,1fr))` }}>
        {sorted.map(s => (
          <div
            key={s.student_id}
            title={`${s.student_name}\nAttention: ${s.avg_attention ?? '—'}\nAttendance: ${s.attendance_pct}%`}
            className={`aspect-square rounded-2xl ${scoreToColor(s.avg_attention)} flex flex-col items-center justify-center p-2 cursor-default transition-transform hover:scale-105`}
          >
            <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center font-bold text-xs text-white mb-1">
              {(s.student_name || 'S').charAt(0)}
            </div>
            <p className="text-[9px] font-bold text-white/90 text-center truncate w-full px-1">
              {s.student_name?.split(' ')[0] || ''}
            </p>
            {s.avg_attention > 0 && (
              <p className="text-[9px] text-white/80 font-bold">{Math.round(s.avg_attention)}</p>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Legend:</p>
        {[
          { label: '≥70 Attentive', cls: 'bg-emerald-400' },
          { label: '50-70 Good', cls: 'bg-emerald-200' },
          { label: '40-50 Moderate', cls: 'bg-amber-300' },
          { label: '25-40 Low', cls: 'bg-orange-400' },
          { label: '<25 Critical', cls: 'bg-rose-500' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${l.cls}`} />
            <span className="text-[10px] text-slate-500 font-medium">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
