import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain,
  Eye,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Users,
  Activity,
  Clock,
  ChevronDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 70) return { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400', bar: 'bg-emerald-500', hex: '#10b981' };
  if (score >= 40) return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-400', bar: 'bg-amber-500', hex: '#f59e0b' };
  return { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-400', bar: 'bg-rose-500', hex: '#ef4444' };
}

function scoreLabel(score) {
  if (score >= 70) return 'Attentive';
  if (score >= 40) return 'Moderate';
  return 'Disengaged';
}

// ── Radial gauge ──────────────────────────────────────────────────────────────

function RadialGauge({ score, size = 180 }) {
  const r = (size / 2) * 0.75;
  const circumference = Math.PI * r; // half-circle arc length
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const offset = circumference * (1 - pct);
  const col = scoreColor(score);

  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
      {/* Background arc */}
      <path
        d={`M ${size * 0.1},${size * 0.55} A ${r},${r} 0 0,1 ${size * 0.9},${size * 0.55}`}
        fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={`M ${size * 0.1},${size * 0.55} A ${r},${r} 0 0,1 ${size * 0.9},${size * 0.55}`}
        fill="none" stroke={col.hex} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      {/* Score text */}
      <text x={size / 2} y={size * 0.45} textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight="bold" fill={col.hex}>
        {Math.round(score)}
      </text>
      <text x={size / 2} y={size * 0.59} textAnchor="middle" fontSize={size * 0.09}
        fill="#94a3b8" fontWeight="600">
        {scoreLabel(score).toUpperCase()}
      </text>
    </svg>
  );
}

// ── Student card ──────────────────────────────────────────────────────────────

function StudentCard({ student, onClick, selected }) {
  const col = scoreColor(student.avg_score ?? student.score ?? 0);
  const sc = student.avg_score ?? student.score ?? 0;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
        selected ? 'border-blue-500 bg-blue-50/60' : 'border-slate-100 hover:border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${col.bg} ${col.text}`}>
          {(student.student_name || 'S').charAt(0).toUpperCase()}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${col.bg} ${col.text}`}>
          {scoreLabel(sc)}
        </span>
      </div>
      <p className="font-semibold text-slate-800 text-sm truncate">{student.student_name || 'Unknown'}</p>
      <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">{student.roll_no}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${col.bar} transition-all`} style={{ width: `${sc}%` }} />
        </div>
        <span className={`text-sm font-bold ${col.text}`}>{sc}</span>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AttentionAnalysis() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [liveData, setLiveData] = useState(null);      // /attention/live
  const [classData, setClassData] = useState(null);    // /attention/class-average
  const [timeline, setTimeline] = useState([]);        // /attention/timeline
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [historyData, setHistoryData] = useState(null);// /attention/student/:id/history
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');          // overview | history
  const pollRef = useRef(null);

  // ── Load sessions ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/sessions?limit=20');
        setSessions(res.data);
        if (res.data.length > 0) {
          const active = res.data.find(s => s.status === 'active');
          const pick = active || res.data[0];
          setSelectedSessionId(pick.id);
          setIsLive(pick.status === 'active');
        }
      } catch {
        // no sessions yet
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Fetch data for selected session ───────────────────────────────────────
  const fetchSessionData = useCallback(async () => {
    if (!selectedSessionId) return;
    try {
      const [liveRes, classRes, timelineRes] = await Promise.allSettled([
        api.get(`/attention/live?session_id=${selectedSessionId}`),
        api.get(`/attention/class-average?session_id=${selectedSessionId}`),
        api.get(`/attention/timeline?session_id=${selectedSessionId}`),
      ]);
      if (liveRes.status === 'fulfilled') setLiveData(liveRes.value.data);
      if (classRes.status === 'fulfilled') setClassData(classRes.value.data);
      if (timelineRes.status === 'fulfilled') setTimeline(timelineRes.value.data);
    } catch {
      // ignore
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchSessionData();
    // Clear old poll
    if (pollRef.current) clearInterval(pollRef.current);
    if (isLive) {
      pollRef.current = setInterval(fetchSessionData, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchSessionData, isLive]);

  // ── Student history ────────────────────────────────────────────────────────
  const loadStudentHistory = async (student) => {
    setSelectedStudent(student);
    setTab('history');
    try {
      const res = await api.get(`/attention/student/${student.student_id}/history?weeks=4`);
      setHistoryData(res.data);
    } catch {
      setHistoryData(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // Merge live in-memory scores with DB class-average scores
  const displayStudents = (() => {
    // Prefer DB class-average (richer: has min/max/samples)
    const dbStudents = classData?.students ?? [];
    // If session is active, overlay live scores
    const liveMap = {};
    (liveData?.students ?? []).forEach(s => { liveMap[s.student_id] = s.score; });
    return dbStudents.map(s => ({
      ...s,
      avg_score: liveMap[s.student_id] ?? s.avg_score,
    }));
  })();

  const classAverage = liveData?.class_average ?? classData?.class_average ?? 0;
  const col = scoreColor(classAverage);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      <PageHeader
        title="Attention Analysis"
        description="Behavioural engagement tracking — real-time and historical patterns."
        actions={
          <div className="flex items-center gap-3">
            {isLive && (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                LIVE SESSION
              </div>
            )}
            <button
              onClick={fetchSessionData}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        }
      />

      {/* Session selector */}
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session</label>
              <div className="relative">
                <select
                  className="appearance-none pr-8 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none min-w-[300px]"
                  value={selectedSessionId}
                  onChange={e => {
                    setSelectedSessionId(e.target.value);
                    const s = sessions.find(x => x.id === e.target.value);
                    setIsLive(s?.status === 'active');
                  }}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.course_name} — {s.session_id} ({s.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {/* Tab bar */}
            <div className="flex gap-2 ml-auto">
              {['overview', 'history'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                    tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-600 border border-slate-200'
                  }`}
                >
                  {t === 'overview' ? 'Overview' : 'Student History'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center py-16 text-slate-400">Loading sessions…</div>
      )}

      {!loading && sessions.length === 0 && (
        <Card className="border-slate-100 rounded-2xl">
          <CardContent className="p-12 text-center">
            <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No sessions found.</p>
            <p className="text-slate-400 text-sm mt-1">Start a Live Classroom session to begin tracking attention.</p>
          </CardContent>
        </Card>
      )}

      {/* ── OVERVIEW TAB ── */}
      {!loading && tab === 'overview' && sessions.length > 0 && (
        <div className="space-y-8">
          {/* Top row: gauge + stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Class engagement gauge */}
            <Card className="lg:col-span-1 border-slate-100 shadow-sm rounded-[28px] bg-slate-900 text-white">
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Class Engagement</p>
                <RadialGauge score={classAverage} size={180} />
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-400">{displayStudents.length} students tracked</p>
                  {isLive && (
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">Live</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Session info + quick stats */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatMiniCard
                icon={Activity}
                label="Session"
                value={selectedSession?.session_id ?? '—'}
                sub={selectedSession?.course_name ?? ''}
                color="blue"
              />
              <StatMiniCard
                icon={Users}
                label="Tracked"
                value={displayStudents.length}
                sub={`${displayStudents.filter(s => (s.avg_score ?? 0) >= 70).length} highly attentive`}
                color="emerald"
              />
              <StatMiniCard
                icon={AlertTriangle}
                label="Disengaged"
                value={displayStudents.filter(s => (s.avg_score ?? 0) < 40).length}
                sub="Score < 40"
                color={displayStudents.filter(s => (s.avg_score ?? 0) < 40).length > 0 ? 'rose' : 'slate'}
              />
            </div>
          </div>

          {/* Student grid */}
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-4">Student Engagement Grid</h3>
            {displayStudents.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {displayStudents.map(student => (
                  <StudentCard
                    key={student.student_id}
                    student={student}
                    selected={selectedStudent?.student_id === student.student_id}
                    onClick={() => loadStudentHistory(student)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-slate-100 rounded-2xl">
                <CardContent className="p-8 text-center">
                  <Eye className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">
                    {isLive
                      ? 'Waiting for students to be recognised in the live session…'
                      : 'No attention data for this session yet.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Engagement timeline */}
          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader
              title="Engagement Timeline"
              subtitle="Class average attention score over the session (2-minute buckets)"
            />
            <CardContent className="p-6">
              {timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timeline} margin={{ top: 4, right: 24, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                      formatter={(v) => [`${v}%`, 'Avg Attention']}
                    />
                    <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Target', fill: '#10b981', fontSize: 10 }} />
                    <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="avg_score"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#3b82f6' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  <div className="text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    {isLive ? 'Timeline builds as the session progresses…' : 'No timeline data for this session.'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {!loading && tab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student picker */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Select Student</h3>
            {displayStudents.length > 0 ? (
              displayStudents.map(s => (
                <StudentCard
                  key={s.student_id}
                  student={s}
                  selected={selectedStudent?.student_id === s.student_id}
                  onClick={() => loadStudentHistory(s)}
                />
              ))
            ) : (
              <p className="text-sm text-slate-400">No students tracked for this session.</p>
            )}
          </div>

          {/* History detail */}
          <div className="lg:col-span-2 space-y-6">
            {historyData ? (
              <>
                <Card className={`border-2 rounded-[28px] ${historyData.persistent_low ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{historyData.student_name}</h3>
                        <p className="text-sm text-slate-400">{historyData.roll_no}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold" style={{ color: scoreColor(historyData.overall_avg).hex }}>
                          {historyData.overall_avg}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">4-week avg</p>
                      </div>
                    </div>
                    {historyData.persistent_low && (
                      <div className="flex items-center gap-2 p-3 bg-rose-100 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <p className="text-sm font-semibold text-rose-700">
                          Persistent low engagement detected — consider intervention.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Weekly trend chart */}
                {historyData.weekly_trend?.length > 0 && (
                  <Card className="border-slate-100 shadow-sm rounded-[28px]">
                    <CardHeader title="Weekly Trend" subtitle="Average attention score per ISO week" />
                    <CardContent className="p-6">
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={historyData.weekly_trend} margin={{ top: 4, right: 24, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
                            formatter={(v, name) => name === 'avg_score' ? [`${v}%`, 'Avg Attention'] : [v, name]}
                          />
                          <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="avg_score" stroke="#3b82f6" strokeWidth={2.5}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              const fill = payload.flagged ? '#ef4444' : '#3b82f6';
                              return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={fill} />;
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="text-[10px] text-rose-500 font-bold mt-2">● Red dot = week flagged (≥2 low-attention sessions)</p>
                    </CardContent>
                  </Card>
                )}

                {/* Session log table */}
                {historyData.sessions?.length > 0 && (
                  <Card className="border-slate-100 shadow-sm rounded-[28px]">
                    <CardHeader title="Session Log" subtitle="Last 4 weeks of sessions" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Avg Score</th>
                            <th className="px-6 py-3">Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {historyData.sessions.map((s, i) => {
                            const c = scoreColor(s.avg_score);
                            return (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="px-6 py-3 text-sm text-slate-600">{s.date}</td>
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${s.avg_score}%` }} />
                                    </div>
                                    <span className={`text-sm font-bold ${c.text}`}>{s.avg_score}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3">
                                  <Badge variant={s.level === 'high' ? 'success' : s.level === 'medium' ? 'warning' : 'danger'}>
                                    {scoreLabel(s.avg_score)}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-slate-100 rounded-2xl">
                <CardContent className="p-12 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Select a student from the left to view their history.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatMiniCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    slate: 'bg-slate-50 text-slate-400 border-slate-100',
  };
  return (
    <Card className="border-slate-100 shadow-sm rounded-[24px]">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
