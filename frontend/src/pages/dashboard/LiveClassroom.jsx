import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import Card, { CardContent } from '../../components/ui/Card';
import { Users, AlertCircle, CheckCircle2, Loader2, BookOpen, Brain } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

function attentionColor(score) {
  if (score == null) return { bg: 'bg-slate-100', text: 'text-slate-400' };
  if (score >= 70) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
  if (score >= 40) return { bg: 'bg-amber-100', text: 'text-amber-700' };
  return { bg: 'bg-rose-100', text: 'text-rose-700' };
}

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')
  .replace(/^http/, 'ws')
  .replace(/\/api\/v1$/, '');

export default function LiveClassroom() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // ── state ──────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionData, setSessionData] = useState(null);   // full session response
  const [roster, setRoster] = useState([]);               // AttendanceRecordResponse[]
  const [faces, setFaces] = useState([]);
  const [stats, setStats] = useState({ present: 0, unknown: 0, class_attention: null });
  const [attentionScores, setAttentionScores] = useState({}); // { studentId: score }
  const [isConnected, setIsConnected] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const [ws, setWs] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [postClassSummary, setPostClassSummary] = useState(null); // set after session close
  const alertedStudents = useRef(new Set()); // debounce — prevent repeated toasts per session

  // ── load courses ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses');
        setCourses(res.data);
        if (res.data.length === 1) setSelectedCourseId(res.data[0].id);
      } catch (err) {
        console.error('Failed to load courses:', err);
        toast.error('Could not load courses. Make sure the backend is running.');
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // ── start session ──────────────────────────────────────────────────────────
  const startSession = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course first');
      return;
    }
    setIsStarting(true);
    try {
      const res = await api.post('/sessions', { course_id: selectedCourseId });
      const session = res.data;
      setSessionData(session);
      // Initialize roster from session response (all absent)
      setRoster(session.roster || []);
      connectWebSocket(session.id);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to start session';
      toast.error(msg);
    } finally {
      setIsStarting(false);
    }
  };

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const connectWebSocket = (sessionId) => {
    const token = localStorage.getItem('smart_attendance_token') || '';
    const socket = new WebSocket(
      `${WS_BASE}/api/v1/sessions/${sessionId}/detect?token=${encodeURIComponent(token)}`
    );

    socket.onopen = () => {
      setIsConnected(true);
      setSessionActive(true);
      toast.success('ML Engine connected — recognition active');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        toast.error(`Session error: ${data.error}`);
        return;
      }

      if (data.faces) {
        setFaces(data.faces);
        setIsIdle(data.faces.length === 0);

        // Update roster status + attention scores for recognized students
        const newScores = {};
        setRoster(prev => {
          const updated = [...prev];
          data.faces.forEach(face => {
            if (face.status === 'Present' && face.attendanceRecordId) {
              const idx = updated.findIndex(r => String(r.id) === face.attendanceRecordId);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], status: 'present' };
                // Map by student_code / studentId so we can look up in render
                if (face.studentId != null) {
                  newScores[face.studentId] = face.attentionScore ?? null;
                }
              }
            }
          });
          return updated;
        });
        if (Object.keys(newScores).length > 0) {
          setAttentionScores(prev => ({ ...prev, ...newScores }));
        }

        const unknownCount = data.faces.filter(f => f.status === 'Unknown').length;
        setStats(prev => ({
          ...prev,
          unknown: unknownCount,
          class_attention: data.stats?.class_attention ?? prev.class_attention,
        }));
      }

      // Real-time alert toasts
      if (data.alerts?.length > 0) {
        data.alerts.forEach(alert => {
          const key = alert.student_id || alert.student_name;
          if (!alertedStudents.current.has(key)) {
            alertedStudents.current.add(key);
            toast.error(alert.message, {
              duration: 10000,
              icon: '⚠️',
              style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
            });
            // Allow re-alerting after 10 minutes
            setTimeout(() => alertedStudents.current.delete(key), 10 * 60 * 1000);
          }
        });
      }
    };

    socket.onerror = () => {
      toast.error('WebSocket connection failed');
      setIsConnected(false);
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    setWs(socket);
  };

  // ── frame sending loop ─────────────────────────────────────────────────────
  const sendFrame = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !webcamRef.current) return;
    const img = webcamRef.current.getScreenshot();
    if (img) ws.send(JSON.stringify({ type: 'frame', image: img }));
  }, [ws]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(sendFrame, 200); // ~5 FPS
    return () => clearInterval(interval);
  }, [isConnected, sendFrame]);

  // ── draw bounding boxes ────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || !webcamRef.current?.video) return;
    const canvas = canvasRef.current;
    const video = webcamRef.current.video;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach(face => {
      const x = (face.x / 100) * canvas.width;
      const y = (face.y / 100) * canvas.height;
      const w = (face.width / 100) * canvas.width;
      const h = (face.height / 100) * canvas.height;
      const isPresent = face.status === 'Present';

      ctx.lineWidth = 3;
      ctx.strokeStyle = isPresent ? '#22c55e' : '#ef4444';
      ctx.fillStyle = isPresent ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.stroke();
      ctx.fill();

      const label = isPresent
        ? `✓ ${face.studentName || face.studentId || 'Recognized'}`
        : '⚠ Unknown';
      const labelW = ctx.measureText(label).width + 20;
      ctx.fillStyle = isPresent ? '#22c55e' : '#ef4444';
      ctx.fillRect(x, y - 28, labelW, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(label, x + 8, y - 12);
    });
  }, [faces]);

  // ── manual override ────────────────────────────────────────────────────────
  const toggleAttendance = async (record) => {
    const newStatus = record.status === 'present' ? 'absent' : 'present';
    try {
      const res = await api.put(`/attendance/${record.id}`, {
        status: newStatus,
        reason: 'Manual override from live classroom',
      });
      setRoster(prev =>
        prev.map(r => (r.id === record.id ? { ...r, status: res.data.status } : r))
      );
      toast.success(`${record.student_name}: marked ${newStatus}`);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Override failed';
      toast.error(msg);
    }
  };

  // ── end session ────────────────────────────────────────────────────────────
  const endSession = async () => {
    if (!window.confirm('Finalize this session? Absent students will be recorded.')) return;
    setIsEnding(true);
    try {
      if (ws) ws.close();
      setIsConnected(false);
      setSessionActive(false);
      alertedStudents.current.clear();

      const res = await api.put(`/sessions/${sessionData.id}/close`);
      const closed = res.data;
      toast.success(
        `Session closed — ${closed.stats.total_present} present, ${closed.stats.total_absent} absent`
      );
      setSessionData(closed);

      // Re-fetch final roster
      const rosterRes = await api.get(`/sessions/${sessionData.id}`);
      const finalRoster = rosterRes.data.roster || [];
      setRoster(finalRoster);

      // Fetch attention timeline for post-class summary
      let timeline = [];
      try {
        const tlRes = await api.get(`/attention/timeline?session_id=${sessionData.id}`);
        timeline = tlRes.data;
      } catch { /* no attention data */ }

      // Build post-class summary
      const presentStudents = finalRoster.filter(r => r.status === 'present');
      const absentStudents = finalRoster.filter(r => r.status !== 'present');
      const disengaged = Object.entries(attentionScores)
        .filter(([, s]) => s != null && s < 40)
        .map(([code]) => finalRoster.find(r => r.student_code === code))
        .filter(Boolean);

      setPostClassSummary({
        session: closed,
        presentCount: presentStudents.length,
        absentCount: absentStudents.length,
        totalEnrolled: finalRoster.length,
        disengagedStudents: disengaged,
        classAttention: stats.class_attention,
        timeline,
        timestamp: new Date().toLocaleString(),
      });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to close session';
      toast.error(msg);
    } finally {
      setIsEnding(false);
    }
  };

  // ── computed stats ─────────────────────────────────────────────────────────
  const presentCount = roster.filter(r => r.status === 'present').length;
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // ── cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (ws) ws.close(); };
  }, [ws]);

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Classroom</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time attendance tracking via facial recognition</p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-full flex items-center gap-2.5 text-sm font-semibold shadow-sm ${
            !sessionActive ? 'bg-slate-100 text-slate-500 border border-slate-200' :
            !isConnected  ? 'bg-rose-50 text-rose-600 border border-rose-100' :
            isIdle        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              !sessionActive ? 'bg-slate-400' :
              !isConnected  ? 'bg-rose-500' :
              isIdle        ? 'bg-indigo-500' :
                              'bg-emerald-500 animate-pulse'
            }`} />
            {!sessionActive ? 'No Active Session' :
             !isConnected   ? 'Connecting...' :
             isIdle         ? 'ML Engine: Idle' :
                              'ML Engine: Running'}
          </div>
        </div>
      </div>

      {/* Course selector — shown before session starts */}
      {!sessionActive && (
        <Card className="border-slate-100 shadow-sm rounded-[24px]">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Start a New Session
            </h3>
            {isLoadingCourses ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading courses...
              </div>
            ) : courses.length === 0 ? (
              <p className="text-sm text-slate-500">
                No courses found. Create a course first via the API or admin panel.
              </p>
            ) : (
              <div className="flex items-center gap-4 flex-wrap">
                <select
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="flex-1 min-w-[240px] py-2 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Select a course —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
                <button
                  onClick={startSession}
                  disabled={!selectedCourseId || isStarting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                >
                  {isStarting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isStarting ? 'Starting...' : 'Start Session'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post-class summary modal */}
      {postClassSummary && (
        <PostClassSummary
          summary={postClassSummary}
          onClose={() => setPostClassSummary(null)}
        />
      )}

      {sessionActive && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-slate-100 shadow-sm relative rounded-[24px]">
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  LIVE • {sessionData?.course_code} — {sessionData?.course_name}
                </div>
                <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-medium text-white shadow-sm">
                  {sessionData?.session_id} | Started: {sessionData?.start_time
                    ? new Date(sessionData.start_time).toLocaleTimeString() : ''}
                </div>
              </div>

              <CardContent className="p-0 relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ width: 1280, height: 720, facingMode: 'user' }}
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-emerald-100 rounded-2xl bg-emerald-50/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">Present</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700 ml-0.5">{presentCount}</p>
                </CardContent>
              </Card>

              <Card className="border-rose-100 rounded-2xl bg-rose-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-widest">Unknown</p>
                  </div>
                  <p className="text-2xl font-bold text-rose-700 ml-0.5">{stats.unknown}</p>
                </CardContent>
              </Card>
            </div>

            {/* Attention score card — only shown when attention pipeline is active */}
            {stats.class_attention != null && stats.class_attention > 0 && (
              <Card className={`rounded-2xl border-2 ${
                stats.class_attention >= 70 ? 'border-emerald-100 bg-emerald-50/30' :
                stats.class_attention >= 40 ? 'border-amber-100 bg-amber-50/30' :
                'border-rose-100 bg-rose-50/30'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        stats.class_attention >= 70 ? 'bg-emerald-100 text-emerald-600' :
                        stats.class_attention >= 40 ? 'bg-amber-100 text-amber-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        <Brain className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attention</p>
                    </div>
                    <p className={`text-xl font-bold ${
                      stats.class_attention >= 70 ? 'text-emerald-700' :
                      stats.class_attention >= 40 ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {Math.round(stats.class_attention)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stats.class_attention >= 70 ? 'bg-emerald-500' :
                        stats.class_attention >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.round(stats.class_attention)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Roster */}
            <Card className="border-slate-100 rounded-[24px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-[24px]">
                <h3 className="font-semibold text-slate-800">
                  Session Roster
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {roster.length} enrolled
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Live attendance — toggle to override</p>
              </div>
              <div className="max-h-[320px] overflow-y-auto p-2">
                {roster.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No students enrolled in this course.
                  </p>
                ) : roster.map(record => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{record.student_name}</p>
                      <p className="text-xs text-slate-400">{record.student_code} · {record.roll_no}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Attention badge */}
                      {(() => {
                        const score = attentionScores[record.student_code];
                        if (score == null) return null;
                        const c = attentionColor(score);
                        return (
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${c.bg} ${c.text}`} title="Attention score">
                            <Brain className="w-3 h-3" />{Math.round(score)}
                          </span>
                        );
                      })()}
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                        record.status === 'present'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {record.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                      <button
                        onClick={() => toggleAttendance(record)}
                        className={`w-10 h-6 rounded-full relative transition-colors ${
                          record.status === 'present' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title="Toggle attendance (manual override)"
                      >
                        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          record.status === 'present' ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* End session */}
            <button
              onClick={endSession}
              disabled={!sessionActive || isEnding || sessionData?.status === 'closed'}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {isEnding && <Loader2 className="w-4 h-4 animate-spin" />}
              {sessionData?.status === 'closed'
                ? 'Session Completed'
                : isEnding ? 'Finalizing...' : 'End Session'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Post-class summary overlay ────────────────────────────────────────────────

function PostClassSummary({ summary, onClose }) {
  const { session, presentCount, absentCount, totalEnrolled,
          disengagedStudents, classAttention, timeline, timestamp } = summary;

  const attendancePct = totalEnrolled > 0
    ? Math.round((presentCount / totalEnrolled) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Post-Class Summary</p>
              <h2 className="text-2xl font-bold">{session?.course_name}</h2>
              <p className="text-slate-400 text-sm mt-1">{session?.session_id} · {timestamp}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          {/* Attendance stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-2xl p-4 text-center border border-emerald-100">
              <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Present</p>
              <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
            </div>
            <div className="bg-rose-50 rounded-2xl p-4 text-center border border-rose-100">
              <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Absent</p>
              <p className="text-2xl font-bold text-rose-700">{absentCount}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Attendance</p>
              <p className="text-2xl font-bold text-blue-700">{attendancePct}%</p>
            </div>
          </div>

          {/* Attention summary */}
          {classAttention != null && classAttention > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Class Attention</p>
                <p className="text-2xl font-bold text-slate-800">{Math.round(classAttention)}<span className="text-sm font-normal text-slate-400">/100</span></p>
              </div>
              <div className="w-24 h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${classAttention >= 70 ? 'bg-emerald-500' : classAttention >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.round(classAttention)}%` }}
                />
              </div>
            </div>
          )}

          {/* Disengaged students */}
          {disengagedStudents.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Low Engagement Students ({disengagedStudents.length})
              </p>
              <div className="space-y-2">
                {disengagedStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-sm font-semibold text-slate-800">{s.student_name}</span>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Low attention</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline mini-chart */}
          {timeline.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Engagement Over Time</p>
              <div className="flex items-end gap-1 h-16">
                {timeline.map((pt, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full rounded-t transition-all ${pt.avg_score >= 70 ? 'bg-emerald-500' : pt.avg_score >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
                      style={{ height: `${(pt.avg_score / 100) * 60}px` }}
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-[9px] font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                      {pt.time}: {pt.avg_score}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                <span>{timeline[0]?.time}</span>
                <span>{timeline[timeline.length - 1]?.time}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Close Summary
          </button>
          <button
            onClick={() => { onClose(); window.location.href = '/dashboard/reports'; }}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            View Full Report
          </button>
        </div>
      </div>
    </div>
  );
}
