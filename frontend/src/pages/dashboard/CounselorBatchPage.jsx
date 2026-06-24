import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Brain,
  RefreshCw,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';

const flagColors = {
  double_risk: 'bg-rose-100 text-rose-700',
  hidden_disengagement: 'bg-purple-100 text-purple-700',
  poor_attendance: 'bg-orange-100 text-orange-700',
  at_risk: 'bg-amber-100 text-amber-700',
  healthy: 'bg-emerald-100 text-emerald-700',
};

export default function CounselorBatchPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBatches = useCallback(async () => {
    try {
      const res = await api.get('/batches/mine');
      setBatches(res.data);
      if (res.data.length > 0 && !selectedBatchId) {
        setSelectedBatchId(res.data[0].id);
      }
    } catch {
      toast.error('Could not load your batches');
    }
  }, [selectedBatchId]);

  const loadRoster = useCallback(async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/batches/${batchId}/students`);
      setRoster(res.data);
    } catch {
      toast.error('Could not load batch roster');
      setRoster(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  useEffect(() => {
    if (selectedBatchId) loadRoster(selectedBatchId);
  }, [selectedBatchId, loadRoster]);

  const students = roster?.students || [];

  const summary = useMemo(() => {
    if (!students.length) {
      return { size: 0, atRisk: 0, avgAttendance: 0, avgAttention: 0 };
    }
    const atRisk = students.filter((s) =>
      ['double_risk', 'hidden_disengagement', 'poor_attendance', 'at_risk'].includes(s.correlation_flag)
    ).length;
    const avgAttendance = Math.round(
      students.reduce((a, s) => a + (s.attendance_pct || 0), 0) / students.length
    );
    const avgAttention = Math.round(
      students.reduce((a, s) => a + (s.avg_attention || 0), 0) / students.length
    );
    return { size: students.length, atRisk, avgAttendance, avgAttention };
  }, [students]);

  const batchQuery = selectedBatchId ? `?batch_id=${selectedBatchId}` : '';

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      <PageHeader
        title="My Batch"
        description="Students assigned to you for this intake — attendance, attention, and alerts."
        actions={
          <div className="flex items-center gap-3">
            {batches.length > 1 && (
              <div className="relative">
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-700"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.student_count} students)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={() => loadRoster(selectedBatchId)}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {batches.length === 0 && !loading && (
        <Card className="border-slate-100 rounded-[28px]">
          <CardContent className="p-10 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-semibold text-slate-700">No batch assigned yet</p>
            <p className="text-sm mt-2">Ask an administrator to upload a counselor batch CSV.</p>
          </CardContent>
        </Card>
      )}

      {batches.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Batch Size', value: summary.size, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'At-Risk', value: summary.atRisk, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Avg Attendance', value: `${summary.avgAttendance}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Avg Attention', value: summary.avgAttention, icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((s) => (
              <Card key={s.label} className="border-slate-100 rounded-[24px]">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{loading ? '…' : s.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigate(`/dashboard/alerts${batchQuery}`)}>
              View Alerts <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="outline" onClick={() => navigate(`/dashboard/reports${batchQuery}`)}>
              View Reports
            </Button>
          </div>

          <Card className="border-slate-100 shadow-sm rounded-[28px] overflow-hidden">
            <CardHeader
              title={roster?.name || 'Student Roster'}
              subtitle={`${roster?.intake_year || ''} · Group ${roster?.batch_code || ''}`}
            />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      {['Name', 'Roll No', 'Attendance', 'Attention', 'Status', 'Open Alerts'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">Loading roster…</td>
                      </tr>
                    ) : students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">No students in this batch.</td>
                      </tr>
                    ) : (
                      students.map((s) => (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-semibold text-slate-800">{s.name}</td>
                          <td className="px-5 py-3 text-slate-500 font-mono text-xs">{s.roll_no}</td>
                          <td className="px-5 py-3">{s.attendance_pct}%</td>
                          <td className="px-5 py-3">{Math.round(s.avg_attention || 0)}</td>
                          <td className="px-5 py-3">
                            <Badge className={flagColors[s.correlation_flag] || flagColors.healthy}>
                              {(s.correlation_flag || 'healthy').replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-5 py-3">
                            {s.open_alerts > 0 ? (
                              <span className="text-rose-600 font-bold">{s.open_alerts}</span>
                            ) : (
                              <span className="text-slate-300">0</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
