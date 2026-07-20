import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ExamViolationBadge from '../../components/exam/ExamViolationBadge';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { canAccess, PERMISSIONS } from '../../config/roles';
import { uploadUrl } from '../../utils/media';

const REVIEW_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'dismissed', label: 'Dismissed' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'phone_detected', label: 'Phone' },
  { value: 'gaze_away', label: 'Gaze away' },
  { value: 'unauthorized_object', label: 'Unauthorized object / notes' },
  { value: 'smartwatch_suspected', label: 'Watch suspected' },
  { value: 'multiple_faces', label: 'Multiple faces (legacy)' },
  { value: 'face_absent', label: 'Face absent (legacy)' },
  { value: 'unknown_face', label: 'Unknown face (legacy)' },
];

export default function ExamReview() {
  const location = useLocation();
  const preselectedExamId = location.state?.examId || '';
  const storedUser = JSON.parse(localStorage.getItem('smart_attendance_user') || '{}');
  const userRole = storedUser?.role || '';
  const isCounselor = userRole === 'counselor';
  const canReview = canAccess(userRole, PERMISSIONS.exam_violations_review);
  const canExport = canAccess(userRole, PERMISSIONS.exam_reports_export);

  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(preselectedExamId);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');

  useEffect(() => {
    if (!isCounselor) return;
    api.get('/batches/mine')
      .then((res) => {
        setBatches(res.data);
        if (res.data.length > 0) setBatchId(res.data[0].id);
      })
      .catch(() => {});
  }, [isCounselor]);

  const batchParam = batchId ? { batch_id: batchId } : {};

  const loadExams = useCallback(async () => {
    try {
      const res = await api.get('/exams', { params: batchParam });
      setExams(res.data);
      if (!selectedExamId && res.data.length > 0) {
        setSelectedExamId(res.data[0].id);
      }
    } catch {
      toast.error('Failed to load exams');
    }
  }, [selectedExamId, batchId]);

  const loadViolations = useCallback(async () => {
    if (!selectedExamId) {
      setViolations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = { ...batchParam };
      if (reviewFilter) params.review_status = reviewFilter;
      const res = await api.get(`/exams/${selectedExamId}/violations`, { params });
      let rows = res.data;
      if (typeFilter) {
        rows = rows.filter((v) => v.violation_type === typeFilter);
      }
      setViolations(rows);
    } catch {
      toast.error('Failed to load violations');
    } finally {
      setLoading(false);
    }
  }, [selectedExamId, reviewFilter, typeFilter, batchId]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  const handleReview = async (violationId, status) => {
    if (status === 'dismissed' && !reviewNote.trim()) {
      toast.error('A dismiss reason is required');
      return;
    }
    setReviewingId(violationId);
    try {
      await api.put(`/exams/${selectedExamId}/violations/${violationId}/review`, {
        review_status: status,
        review_note: reviewNote.trim() || null,
      });
      toast.success(status === 'confirmed' ? 'Violation confirmed' : 'Violation dismissed');
      setReviewNote('');
      setLightbox(null);
      loadViolations();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Review failed');
    } finally {
      setReviewingId(null);
    }
  };

  const exportPdf = async () => {
    if (!selectedExamId || !canExport) return;
    setExporting(true);
    try {
      const res = await api.get(`/exams/${selectedExamId}/export/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const exam = exams.find((e) => e.id === selectedExamId);
      link.download = `exam_${exam?.exam_code || selectedExamId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Integrity report downloaded');
    } catch {
      toast.error('PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const pendingCount = violations.filter((v) => v.review_status === 'pending').length;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      <PageHeader
        title="Exam Review"
        description="Review violation evidence — confirm or dismiss before any disciplinary action."
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
            <Button variant="outline" icon={RefreshCw} onClick={loadViolations}>
              Refresh
            </Button>
            {canExport && (
              <Button
                variant="primary"
                icon={FileText}
                disabled={!selectedExamId || exporting}
                isLoading={exporting}
                onClick={exportPdf}
              >
                Export Integrity PDF
              </Button>
            )}
          </div>
        }
      />

      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1 min-w-[240px] flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Exam session
              </label>
              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5BF0]/20"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
              >
                <option value="">Select exam…</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.exam_code} — {e.room_name} ({e.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Review status
              </label>
              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
              >
                {REVIEW_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Violation type
              </label>
              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all-types'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedExam && (
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
              <span>Total violations: <strong className="text-slate-900">{selectedExam.total_violations}</strong></span>
              <span>Students flagged: <strong className="text-slate-900">{selectedExam.students_flagged}</strong></span>
              <span>Phones detected: <strong className="text-slate-900">{selectedExam.phones_detected}</strong></span>
              <span>Pending in view: <strong className="text-rose-600">{pendingCount}</strong></span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card noPadding className="border-slate-100 shadow-sm overflow-hidden rounded-[32px]">
        <CardHeader
          title="Violation Log"
          subtitle={
            isCounselor
              ? 'Showing violations for students in your assigned batch only.'
              : 'All violations default to pending until reviewed by staff.'
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Evidence</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Sustained</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading violations…
                  </td>
                </tr>
              ) : violations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {selectedExamId ? 'No violations found for this filter.' : 'Select an exam session.'}
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {v.snapshot_path ? (
                        <button type="button" onClick={() => setLightbox(v)} className="group">
                          <img
                            src={uploadUrl(v.snapshot_path)}
                            alt=""
                            className="w-20 h-14 object-cover rounded-lg border border-slate-100 group-hover:border-blue-300 transition-colors"
                          />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 text-sm">{v.student_name || 'Unknown'}</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate max-w-[180px]">{v.message}</p>
                    </td>
                    <td className="px-6 py-4">
                      <ExamViolationBadge type={v.violation_type} />
                    </td>
                    <td className="px-6 py-4">
                      <ExamViolationBadge severity={v.severity} />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{v.sustained_seconds}s</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg capitalize ${
                        v.review_status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : v.review_status === 'confirmed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {v.review_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {v.review_status === 'pending' && canReview ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            type="button"
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Confirm"
                            onClick={() => handleReview(v.id, 'confirmed')}
                            disabled={reviewingId === v.id}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600"
                            title="Dismiss"
                            onClick={() => { setReviewNote(''); setLightbox(v); }}
                            disabled={reviewingId === v.id}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : v.review_status === 'pending' ? (
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Read only</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <ExamViolationBadge type={lightbox.violation_type} />
                  <ExamViolationBadge severity={lightbox.severity} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{lightbox.student_name || 'Unknown'}</h3>
                <p className="text-sm text-slate-500 mt-1">{lightbox.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {lightbox.snapshot_path && (
              <img
                src={uploadUrl(lightbox.snapshot_path)}
                alt=""
                className="w-full max-h-[50vh] object-contain bg-slate-950"
              />
            )}
            {lightbox.review_status === 'pending' && canReview && (
              <div className="p-6 space-y-4 border-t border-slate-100">
                <textarea
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm"
                  rows={2}
                  placeholder="Review note (required when dismissing as false positive)"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLightbox(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    icon={ShieldAlert}
                    onClick={() => handleReview(lightbox.id, 'confirmed')}
                    disabled={reviewingId === lightbox.id}
                    isLoading={reviewingId === lightbox.id}
                  >
                    Confirm violation
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleReview(lightbox.id, 'dismissed')}
                    disabled={reviewingId === lightbox.id}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
