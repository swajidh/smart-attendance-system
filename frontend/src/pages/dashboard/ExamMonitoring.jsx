import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import {
  Loader2,
  BookOpen,
  AlertTriangle,
  ScanEye,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card, { CardContent } from '../../components/ui/Card';
import ExamViolationBadge from '../../components/exam/ExamViolationBadge';
import ExamCalibrationModal from '../../components/exam/ExamCalibrationModal';
import api from '../../services/api';
import { getWsBase, uploadUrl } from '../../utils/media';

const WS_BASE = getWsBase();
const CALIBRATION_SECONDS = 30;

export default function ExamMonitoring() {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const calibrationTimerRef = useRef(null);

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [roomName, setRoomName] = useState('Exam Hall');
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  const [exam, setExam] = useState(null);
  const [phase, setPhase] = useState('setup');
  const [isConnected, setIsConnected] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [recognitionProfiles, setRecognitionProfiles] = useState(null);
  const [objectDetectionReady, setObjectDetectionReady] = useState(null);

  const [faces, setFaces] = useState([]);
  const [objects, setObjects] = useState([]);
  const [violations, setViolations] = useState([]);
  const [studentCounts, setStudentCounts] = useState({});
  const [roster, setRoster] = useState([]);
  const [stats, setStats] = useState({ frame: 0, active_violations: 0, students_monitored: 0 });

  const [calibrationSecondsLeft, setCalibrationSecondsLeft] = useState(CALIBRATION_SECONDS);
  const [isFinalizingCalibration, setIsFinalizingCalibration] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const sessionActive = phase === 'calibrating' || phase === 'monitoring';
  const monitoringActive = isConnected && cameraReady && sessionActive;
  const isIdle = faces.length === 0;

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

  useEffect(() => () => { wsRef.current?.close(); }, []);

  const connectWebSocket = useCallback((examId) => {
    const token = localStorage.getItem('smart_attendance_token') || '';
    const socket = new WebSocket(
      `${WS_BASE}/api/v1/exams/${examId}/monitor?token=${encodeURIComponent(token)}`
    );

    socket.onopen = () => {
      wsRef.current = socket;
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'connected') {
        setRecognitionProfiles(data.recognition_profiles ?? 0);
        setObjectDetectionReady(data.object_detection_ready ?? null);
        if (!data.pipeline_ready) {
          toast.error(data.pipeline_reason || 'Exam ML pipeline unavailable', { duration: 8000 });
        } else if (!data.object_detection_ready) {
          toast.error(
            data.pipeline_reason
              || 'Object detection unavailable — phone and cheat-sheet flags will not work.',
            { duration: 10000 }
          );
        } else if ((data.recognition_profiles ?? 0) === 0) {
          toast.error(
            'No face profiles for this course. Gaze tracking needs enrolled students; phone detection still works.',
            { duration: 8000 }
          );
        } else {
          toast.success(
            `Exam monitor connected — ${data.recognition_profiles} profile(s), object detection active`
          );
        }
        return;
      }

      if (data.type === 'frame_result') {
        if (data.faces) setFaces(data.faces);
        if (data.objects) setObjects(data.objects);
        if (data.stats) setStats((prev) => ({ ...prev, ...data.stats }));

        if (data.violations_new?.length) {
          setViolations((prev) => [...data.violations_new, ...prev].slice(0, 50));
          setStudentCounts((prev) => {
            const next = { ...prev };
            data.violations_new.forEach((v) => {
              const key = v.student_id || v.student_name || 'unknown';
              next[key] = (next[key] || 0) + 1;
            });
            return next;
          });
          data.violations_new.forEach((v) => {
            toast.error(v.message || `Violation: ${v.type}`, { duration: 6000 });
          });
        }
      }
    };

    socket.onerror = () => toast.error('WebSocket connection failed');
    socket.onclose = () => {
      wsRef.current = null;
      setIsConnected(false);
    };

    wsRef.current = socket;
  }, []);

  const finalizeCalibration = useCallback(async () => {
    if (!exam?.id || isFinalizingCalibration) return;
    setIsFinalizingCalibration(true);
    try {
      const res = await api.post(`/exams/${exam.id}/calibrate`);
      setExam(res.data);
      setPhase('monitoring');
      toast.success('Calibration complete — monitoring active');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Calibration failed');
    } finally {
      setIsFinalizingCalibration(false);
    }
  }, [exam?.id, isFinalizingCalibration]);

  const startExamFlow = async () => {
    if (!selectedCourseId) {
      toast.error('Please select a course first');
      return;
    }
    setIsBusy(true);
    setCameraReady(false);
    try {
      const createRes = await api.post('/exams', {
        course_id: selectedCourseId,
        room_name: roomName || 'Exam Hall',
      });
      const startRes = await api.post(`/exams/${createRes.data.id}/start`);
      const started = startRes.data;
      setExam(started);
      setPhase('calibrating');
      setViolations([]);
      setStudentCounts({});
      try {
        const detail = await api.get(`/courses/${selectedCourseId}/detail`);
        setRoster(detail.data.students || []);
      } catch {
        setRoster([]);
      }
      connectWebSocket(started.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start exam monitoring');
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (phase !== 'calibrating' || !exam?.id) {
      if (calibrationTimerRef.current) {
        clearInterval(calibrationTimerRef.current);
        calibrationTimerRef.current = null;
      }
      return undefined;
    }

    setCalibrationSecondsLeft(CALIBRATION_SECONDS);
    calibrationTimerRef.current = setInterval(() => {
      setCalibrationSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => {
      if (calibrationTimerRef.current) {
        clearInterval(calibrationTimerRef.current);
        calibrationTimerRef.current = null;
      }
    };
  }, [phase, exam?.id]);

  useEffect(() => {
    if (phase === 'calibrating' && calibrationSecondsLeft === 0 && !isFinalizingCalibration) {
      finalizeCalibration();
    }
  }, [phase, calibrationSecondsLeft, isFinalizingCalibration, finalizeCalibration]);

  const sendFrame = useCallback(() => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !webcamRef.current || !cameraReady) return;
    const video = webcamRef.current.video;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;
    const img = webcamRef.current.getScreenshot();
    if (img) socket.send(JSON.stringify({ type: 'frame', image: img }));
  }, [cameraReady]);

  useEffect(() => {
    if (!monitoringActive) return undefined;
    const frameInterval = setInterval(sendFrame, 500);
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
    return () => {
      clearInterval(frameInterval);
      clearInterval(pingInterval);
    };
  }, [monitoringActive, sendFrame]);

  useEffect(() => {
    if (!canvasRef.current || !webcamRef.current?.video) return;
    const canvas = canvasRef.current;
    const video = webcamRef.current.video;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach((face) => {
      const x = (face.x / 100) * canvas.width;
      const y = (face.y / 100) * canvas.height;
      const w = (face.width / 100) * canvas.width;
      const h = (face.height / 100) * canvas.height;
      const enrolled = Boolean(face.studentUuid || face.studentName);
      const onPaper = enrolled && face.gazeStatus === 'on_paper';
      const gazeAway = enrolled && face.gazeStatus === 'away';

      ctx.lineWidth = 3;
      if (!enrolled) {
        ctx.strokeStyle = '#94a3b8';
        ctx.fillStyle = 'rgba(148,163,184,0.12)';
      } else if (onPaper) {
        ctx.strokeStyle = '#22c55e';
        ctx.fillStyle = 'rgba(34,197,94,0.15)';
      } else if (gazeAway) {
        ctx.strokeStyle = '#f43f5e';
        ctx.fillStyle = 'rgba(239,68,68,0.15)';
      } else {
        ctx.strokeStyle = '#6366f1';
        ctx.fillStyle = 'rgba(99,102,241,0.12)';
      }
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.stroke();
      ctx.fill();

      const label = face.studentName || face.studentId || 'Staff / visitor';
      const gaze = gazeAway ? ` · ${Math.round(face.headPose?.yaw || 0)}°` : '';
      const labelText = onPaper ? `✓ ${label}` : `${label}${gaze}`;
      const labelW = ctx.measureText(labelText).width + 20;
      ctx.fillStyle = !enrolled ? '#64748b' : onPaper ? '#22c55e' : gazeAway ? '#ef4444' : '#6366f1';
      ctx.fillRect(x, y - 28, labelW, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText(labelText, x + 10, y - 10);
    });

    objects.forEach((obj) => {
      const x = (obj.x / 100) * canvas.width;
      const y = (obj.y / 100) * canvas.height;
      const w = (obj.width / 100) * canvas.width;
      const h = (obj.height / 100) * canvas.height;
      const isPhone = obj.label === 'cell phone';
      ctx.strokeStyle = isPhone ? '#dc2626' : '#ea580c';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = isPhone ? 'rgba(220,38,38,0.2)' : 'rgba(234,88,12,0.15)';
      ctx.fillRect(x, y, w, h);
      const tag = `${isPhone ? 'PHONE' : 'NOTES'} ${Math.round((obj.confidence || 0) * 100)}%`;
      const tagW = ctx.measureText(tag).width + 16;
      ctx.fillStyle = isPhone ? '#dc2626' : '#ea580c';
      ctx.fillRect(x, Math.max(0, y - 22), tagW, 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(tag, x + 8, Math.max(14, y - 8));
    });
  }, [faces, objects]);

  const endExam = async () => {
    if (!exam?.id) return;
    if (!window.confirm('End this exam session? Violations will remain pending review.')) return;
    setIsBusy(true);
    try {
      wsRef.current?.close();
      setIsConnected(false);
      await api.put(`/exams/${exam.id}/close`);
      setPhase('ended');
      toast.success('Exam session closed');
      navigate('/dashboard/exam-review', { state: { examId: exam.id } });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to close exam');
    } finally {
      setIsBusy(false);
    }
  };

  const statusLabel = !sessionActive
    ? 'No Active Exam'
    : phase === 'calibrating'
      ? 'Calibrating hall…'
      : !isConnected
        ? 'Connecting…'
        : !cameraReady
          ? 'Starting camera…'
          : isIdle
            ? 'Monitoring — no faces in frame'
            : 'Monitoring — faces detected';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Exam Hall Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1">
            Detects phones, gaze away, notes, and smartwatch signals — not hall identity
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className={`px-4 py-2 rounded-full flex items-center gap-2.5 text-sm font-semibold shadow-sm ${
            !sessionActive ? 'bg-slate-100 text-slate-500 border border-slate-200' :
            phase === 'calibrating' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
            !isConnected ? 'bg-rose-50 text-rose-600 border border-rose-100' :
            !cameraReady ? 'bg-amber-50 text-amber-600 border border-amber-100' :
            isIdle ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
            'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              !sessionActive ? 'bg-slate-400' :
              phase === 'calibrating' ? 'bg-amber-500 animate-pulse' :
              !isConnected ? 'bg-rose-500' :
              !cameraReady ? 'bg-amber-500' :
              isIdle ? 'bg-indigo-500 animate-pulse' :
              'bg-emerald-500 animate-pulse'
            }`} />
            {statusLabel}
          </div>
          {monitoringActive && (
            <p className="text-[11px] text-slate-500">
              Frame {stats.frame || 0} · {recognitionProfiles ?? 0} profile(s)
              {objectDetectionReady === false ? ' · YOLO off' : objectDetectionReady ? ' · YOLO on' : ''}
              {' · '}{roomName}
            </p>
          )}
        </div>
      </div>

      {!sessionActive && (
        <Card className="border-slate-100 shadow-sm rounded-[24px]">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ScanEye className="w-5 h-5 text-rose-600" />
              Start Exam Monitoring
            </h3>
            {isLoadingCourses ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading courses...
              </div>
            ) : courses.length === 0 ? (
              <p className="text-sm text-slate-500">
                No courses found. Create a course and enroll students with face profiles first.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="flex-1 min-w-[240px] py-2 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— Select a course —</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                  <input
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Exam Hall A"
                    className="min-w-[180px] py-2 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={startExamFlow}
                    disabled={!selectedCourseId || isBusy}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                  >
                    {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isBusy ? 'Starting...' : 'Start Exam Monitoring'}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  A 30-second calibration step runs before active monitoring. Violations require human review.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sessionActive && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-slate-100 shadow-sm relative rounded-[24px]">
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {phase === 'calibrating' ? 'CALIBRATING' : 'LIVE'} · {selectedCourse?.code || 'Exam'}
                </div>
                <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-medium text-white shadow-sm">
                  {exam?.exam_code} · {roomName}
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

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-slate-100 rounded-2xl bg-slate-50/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monitored</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 ml-0.5">
                    {stats.students_monitored ?? faces.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-rose-100 rounded-2xl bg-rose-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-widest">Flags</p>
                  </div>
                  <p className="text-2xl font-bold text-rose-700 ml-0.5">{stats.active_violations ?? 0}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-100 rounded-[24px] max-h-[220px] flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-[24px]">
                <h3 className="font-semibold text-slate-800">
                  Exam Roster
                  <span className="ml-2 text-xs font-normal text-slate-400">{roster.length} enrolled</span>
                </h3>
                <p className="text-xs text-slate-500">Violation counts for this session</p>
              </div>
              <div className="overflow-y-auto p-2 flex-1">
                {roster.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No students enrolled in this course.</p>
                ) : (
                  roster.map((s) => {
                    const count = studentCounts[s.id] || studentCounts[s.student_id] || 0;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.student_id} · {s.roll_no}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                          count ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count} flagged
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="border-slate-100 rounded-[24px] max-h-[240px] flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-[24px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="font-semibold text-slate-800">Violation Feed</h3>
              </div>
              <div className="overflow-y-auto p-2 flex-1">
                {violations.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No violations yet</p>
                ) : (
                  violations.map((v) => (
                    <div key={v.id} className="flex gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                      {v.snapshotUrl && (
                        <img
                          src={uploadUrl(v.snapshotUrl)}
                          alt=""
                          className="w-14 h-10 object-cover rounded-lg border border-slate-100 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <ExamViolationBadge type={v.type} severity={v.severity} />
                        <p className="text-xs font-semibold text-slate-800 mt-1 truncate">
                          {v.student_name || (v.type === 'phone_detected' ? 'Hall' : 'Unlinked')}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{v.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <button
              type="button"
              onClick={() => navigate('/dashboard/exam-review')}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <BookOpen className="w-4 h-4" />
              Open Review Queue
            </button>

            <button
              type="button"
              onClick={endExam}
              disabled={isBusy || exam?.status === 'closed'}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              {isBusy ? 'Closing…' : 'End Exam Session'}
            </button>
          </div>
        </div>
      )}

      <ExamCalibrationModal
        open={phase === 'calibrating'}
        secondsLeft={calibrationSecondsLeft}
        onFinalize={finalizeCalibration}
        isFinalizing={isFinalizingCalibration}
      />
    </div>
  );
}
