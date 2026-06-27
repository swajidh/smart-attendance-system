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

function getWsBase() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  if (apiUrl.startsWith('/')) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  return apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
}

const WS_BASE = getWsBase();

export default function LiveClassroom() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const frameCountRef = useRef(0);

  // ── state ──────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionData, setSessionData] = useState(null);   // full session response
  const [roster, setRoster] = useState([]);               // AttendanceRecordResponse[]
  const [faces, setFaces] = useState([]);
  const [stats, setStats] = useState({
    present: 0,
    presentInFrame: 0,
    unknown: 0,
    class_attention: null,
    frame: 0,
    profilesLoaded: 0,
  });
  const [attentionScores, setAttentionScores] = useState({}); // { studentId: score }
  const [attentionUnavailable, setAttentionUnavailable] = useState(false);
  const [attentionUnavailableReason, setAttentionUnavailableReason] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isIdle, setIsIdle] = useState(true);
  const [ws, setWs] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [postClassSummary, setPostClassSummary] = useState(null); // set after session close
  const [recognitionProfiles, setRecognitionProfiles] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
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
    setCameraReady(false);
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
      wsRef.current = socket;
      setIsConnected(true);
      setSessionActive(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        toast.error(`Session error: ${data.error}`);
        return;
      }

      if (data.type === 'connected') {
        setRecognitionProfiles(data.recognition_profiles ?? 0);
        setAttentionUnavailable(data.attention_available === false);
        setAttentionUnavailableReason(data.attention_reason || 'Attention scoring unavailable');
        setStats(prev => ({
          ...prev,
          profilesLoaded: data.recognition_profiles ?? 0,
        }));
        if ((data.recognition_profiles ?? 0) === 0) {
          toast.error(
            'No face profiles for this course. Enroll faces under Face Enrollment, then add students to the course.',
            { duration: 8000 }
          );
        } else {
          toast.success(
            `Continuous monitoring active — ${data.recognition_profiles} face profile(s) loaded`
          );
        }
        if (data.attention_available === false) {
          toast.error(data.attention_reason || 'Attention scoring is unavailable on this server', { duration: 8000 });
        }
        return;
      }

      if (data.type === 'roster_refreshed') {
        setRecognitionProfiles(data.recognition_profiles ?? 0);
        setStats(prev => ({
          ...prev,
          profilesLoaded: data.recognition_profiles ?? prev.profilesLoaded,
        }));
        return;
      }

      if (data.type === 'pong') {
        return;
      }

      if (data.faces || data.stats) {
        if (data.faces) {
          setFaces(data.faces);
          setIsIdle(data.faces.length === 0);
        }

        const rosterPresent = data.stats?.roster_present ?? data.stats?.present ?? 0;
        const presentInFrame = data.stats?.present_in_frame
          ?? (data.faces ? data.faces.filter(f => f.status === 'Present').length : 0);

        // Update roster + attention for every recognized face in this frame
        const newScores = {};
        if (data.faces?.length) {
          setRoster(prev => {
            const updated = [...prev];
            data.faces.forEach(face => {
              if (face.status !== 'Present') return;

              let idx = face.attendanceRecordId
                ? updated.findIndex(r => String(r.id) === face.attendanceRecordId)
                : -1;
              if (idx < 0 && face.studentId) {
                idx = updated.findIndex(r => r.student_code === face.studentId);
              }

              if (idx >= 0) {
                updated[idx] = {
                  ...updated[idx],
                  status: 'present',
                  confidence: face.recognitionConfidence ?? updated[idx].confidence,
                };
                if (face.studentId != null) {
                  newScores[face.studentId] = face.attentionScore ?? null;
                }
              }
            });
            return updated;
          });
        }
        if (Object.keys(newScores).length > 0) {
          setAttentionScores(prev => ({ ...prev, ...newScores }));
        }

        const unknownCount = data.faces
          ? data.faces.filter(f => f.status === 'Unknown').length
          : (data.stats?.unknown ?? 0);

        if (data.stats?.frame) {
          frameCountRef.current = data.stats.frame;
        }

        setStats(prev => ({
          ...prev,
          present: rosterPresent,
          presentInFrame,
          unknown: unknownCount,
          class_attention: data.stats?.class_attention ?? prev.class_attention,
          frame: data.stats?.frame ?? prev.frame,
          profilesLoaded: data.stats?.profiles_loaded ?? prev.profilesLoaded,
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
      wsRef.current = null;
      setIsConnected(false);
    };

    wsRef.current = socket;
    setWs(socket);
  };

  // ── frame sending loop (runs for entire session) ───────────────────────────
  const sendFrame = useCallback(() => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !webcamRef.current || !cameraReady) return;
    const video = webcamRef.current.video;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;
    const img = webcamRef.current.getScreenshot();
    if (img) socket.send(JSON.stringify({ type: 'frame', image: img }));
  }, [cameraReady]);

  useEffect(() => {
    if (!isConnected || !cameraReady) return;
    const frameInterval = setInterval(sendFrame, 500);
    const pingInterval = setInterval(() => {
      const socket = wsRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
    return () => {
      clearInterval(frameInterval);
      clearInterval(pingInterval);
    };
  }, [isConnected, cameraReady, sendFrame]);

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
        ? `✓ ${face.studentName || face.studentId || 'Recognized'}${face.attentionScore != null ? ` · ${Math.round(face.attentionScore)}` : ''}`
        : face.recognitionConfidence != null
          ? `? ${Math.round(face.recognitionConfidence * 100)}%`
          : '⚠ Unknown';
      const labelW = ctx.measureText(label).width + 20;
      ctx.fillStyle = isPresent ? '#22c55e' : '#ef4444';
      ctx.fillRect(x, y - 28, labelW, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(label, x + 8, y - 12);

      if (isPresent && face.attentionScore != null) {
        const scoreLabel = `${Math.round(face.attentionScore)}`;
        ctx.fillStyle = face.attentionScore >= 70 ? '#059669' : face.attentionScore >= 40 ? '#d97706' : '#dc2626';
        ctx.fillRect(x, y + h + 4, 36, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(scoreLabel, x + 6, y + h + 16);
      }
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
      wsRef.current?.close();
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
  const presentCount = Math.max(
    roster.filter(r => String(r.status).toLowerCase() === 'present').length,
    stats.present ?? 0,
  );
  const scanningActive = isConnected && cameraReady && sessionActive;
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // ── cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {attentionUnavailable && sessionActive && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm font-medium">
          Attention scoring unavailable: {attentionUnavailableReason}. Attendance tracking continues normally.
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Classroom</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time attendance tracking via facial recognition</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className={`px-4 py-2 rounded-full flex items-center gap-2.5 text-sm font-semibold shadow-sm ${
            !sessionActive ? 'bg-slate-100 text-slate-500 border border-slate-200' :
            !isConnected  ? 'bg-rose-50 text-rose-600 border border-rose-100' :
            !cameraReady  ? 'bg-amber-50 text-amber-600 border border-amber-100' :
            isIdle        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              !sessionActive ? 'bg-slate-400' :
              !isConnected  ? 'bg-rose-500' :
              !cameraReady  ? 'bg-amber-500' :
              isIdle        ? 'bg-indigo-500 animate-pulse' :
                              'bg-emerald-500 animate-pulse'
            }`} />
            {!sessionActive ? 'No Active Session' :
             !isConnected ? 'Connecting...' :
             !cameraReady ? 'Starting Camera...' :
             isIdle ? 'Scanning — no face in frame' :
             'Scanning — face detected'}
          </div>
          {scanningActive && (
            <p className="text-[11px] text-slate-500">
              Frame {stats.frame || 0} · {stats.profilesLoaded || recognitionProfiles || 0} profile(s) · continuous monitoring
            </p>
          )}
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
                {!cameraReady && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-white">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p className="text-sm font-medium">Starting camera…</p>
                    <p className="text-xs text-slate-400 mt-1">Allow webcam access if prompted</p>
                  </div>
                )}
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  mirrored
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.92}
                  onUserMedia={() => setCameraReady(true)}
                  onUserMediaError={() => {
                    setCameraReady(false);
                    toast.error('Camera access failed. Allow webcam permission and retry.');
                  }}
                  videoConstraints={{ facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }}
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
                {recognitionProfiles != null && recognitionProfiles === 0 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    No face profiles loaded for this course.
                  </p>
                )}
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
                        String(record.status).toLowerCase() === 'present'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {String(record.status).toLowerCase() === 'present' ? 'Present' : 'Absent'}
                      </span>
                      <button
                        onClick={() => toggleAttendance(record)}
                        className={`w-10 h-6 rounded-full relative transition-colors ${
                          String(record.status).toLowerCase() === 'present' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title="Toggle attendance (manual override)"
                      >
                        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                          String(record.status).toLowerCase() === 'present' ? 'translate-x-4' : 'translate-x-0'
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
