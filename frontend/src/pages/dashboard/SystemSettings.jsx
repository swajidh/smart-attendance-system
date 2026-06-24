import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Activity, HardDrive, FileText, Upload, Bell,
  RefreshCw, Download, Shield, CheckCircle2, XCircle,
  AlertTriangle, Server, Database, Cpu, MemoryStick,
  ChevronDown, Trash2, Edit2, Save,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ── helpers ───────────────────────────────────────────────────────────────────
const roleBadge = {
  admin:     'bg-rose-100 text-rose-700',
  teacher:   'bg-blue-100 text-blue-700',
  counselor: 'bg-purple-100 text-purple-700',
  student:   'bg-emerald-100 text-emerald-700',
};

function GaugeBar({ label, value, max = 100, warn = 70, critical = 90, unit = '%' }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= critical ? 'bg-rose-500' : pct >= warn ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span className={pct >= warn ? 'text-amber-600 font-bold' : 'text-slate-700'}>
          {value != null ? `${value}${unit}` : '—'}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusDot({ ok }) {
  return ok
    ? <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Online</span>
    : <span className="inline-flex items-center gap-1.5 text-rose-600 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-rose-500" />Error</span>;
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function SystemSettings() {
  const [tab, setTab] = useState('users');

  // Users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingRole, setEditingRole] = useState(null); // user id

  // Health
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Audit log
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ entity_type: '', action: '' });

  // SIS import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const sisFileRef = useRef(null);

  // Counselor batches
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchImportResult, setBatchImportResult] = useState(null);
  const batchFileRef = useRef(null);

  // Backup
  const [backing, setBacking] = useState(false);

  // Notification config
  const [notifPrefs, setNotifPrefs] = useState({ dashboard: true, email: false, frequency: 'immediate' });
  const [emailSummaryConfig, setEmailSummaryConfig] = useState({ enabled: false, frequency: 'weekly' });

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/auth/admin/users');
      setUsers(res.data);
    } catch { toast.error('Could not load users'); }
    finally { setUsersLoading(false); }
  }, []);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/system/health');
      setHealth(res.data);
    } catch { toast.error('Could not load system health'); }
    finally { setHealthLoading(false); }
  }, []);

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    const params = new URLSearchParams({ limit: 100 });
    if (auditFilters.entity_type) params.set('entity_type', auditFilters.entity_type);
    if (auditFilters.action) params.set('action', auditFilters.action);
    try {
      const res = await api.get(`/system/audit-log?${params}`);
      setAuditLogs(res.data);
    } catch { toast.error('Could not load audit log'); }
    finally { setAuditLoading(false); }
  }, [auditFilters]);

  const fetchNotifPrefs = useCallback(async () => {
    try {
      const res = await api.get('/alerts/notifications');
      setNotifPrefs(res.data);
    } catch { /* silent */ }
  }, []);

  const fetchBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const res = await api.get('/batches');
      setBatches(res.data);
    } catch { toast.error('Could not load counselor batches'); }
    finally { setBatchesLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    else if (tab === 'health') fetchHealth();
    else if (tab === 'audit') fetchAuditLog();
    else if (tab === 'notifications') fetchNotifPrefs();
    else if (tab === 'batches') fetchBatches();
  }, [tab, fetchUsers, fetchHealth, fetchAuditLog, fetchNotifPrefs, fetchBatches]);

  // ── Role update ──────────────────────────────────────────────────────────
  const updateRole = async (userId, role) => {
    try {
      const res = await api.put(`/auth/admin/users/${userId}/role`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setEditingRole(null);
      toast.success('Role updated');
    } catch { toast.error('Failed to update role'); }
  };

  // ── Backup ───────────────────────────────────────────────────────────────
  const triggerBackup = async () => {
    setBacking(true);
    try {
      const res = await api.post('/system/backup', {}, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch { toast.error('Backup failed — pg_dump may not be available'); }
    finally { setBacking(false); }
  };

  // ── Restore ──────────────────────────────────────────────────────────────
  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm(`Restore database from "${file.name}"? This will overwrite existing data.`)) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/system/restore', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Database restored successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Restore failed');
    }
  };

  // ── Batch CSV import ─────────────────────────────────────────────────────
  const handleBatchImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchImporting(true);
    setBatchImportResult(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/batches/import-csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBatchImportResult(res.data);
      toast.success(`Assigned ${res.data.students_assigned} students to batches`);
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Batch import failed');
    } finally {
      setBatchImporting(false);
      if (batchFileRef.current) batchFileRef.current.value = '';
    }
  };

  const downloadBatchTemplate = async () => {
    try {
      const res = await api.get('/batches/import-template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'batch_assignment_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download template');
    }
  };

  // ── SIS import ───────────────────────────────────────────────────────────
  const handleSisImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api.post('/system/sis-import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(res.data);
      toast.success(`Imported ${res.data.imported} students`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      if (sisFileRef.current) sisFileRef.current.value = '';
    }
  };

  // ── Save notif prefs ─────────────────────────────────────────────────────
  const saveNotifPrefs = async (prefs) => {
    try {
      await api.put('/alerts/notifications', prefs);
      setNotifPrefs(prefs);
      toast.success('Notification preferences saved');
    } catch { toast.error('Failed to save preferences'); }
  };

  // ── Email summary ────────────────────────────────────────────────────────
  const triggerEmailSummary = async () => {
    try {
      await api.post('/system/email-summary/trigger');
      toast.success('Email summary queued');
    } catch { toast.error('Failed to trigger email summary'); }
  };

  const TABS = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'backup', label: 'Backup & Restore', icon: HardDrive },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'sis', label: 'SIS Import', icon: Upload },
    { id: 'batches', label: 'Counselor Batches', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      <PageHeader
        title="System Settings"
        description="User management, system health, audit logs, and configuration."
      />

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap border-b border-slate-100 pb-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── User Management ────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <Card noPadding className="border-slate-100 shadow-sm overflow-hidden rounded-[28px]">
          <CardHeader
            title="User Management"
            subtitle="Manage roles and account status for all system users."
            action={
              <Button variant="outline" icon={RefreshCw} onClick={fetchUsers} disabled={usersLoading}>
                Refresh
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersLoading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm">
                          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{user.full_name || '—'}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingRole === user.id ? (
                        <div className="flex items-center gap-2">
                          <select defaultValue={user.role}
                            id={`role-${user.id}`}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                            {['admin', 'teacher', 'counselor', 'student'].map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button onClick={() => {
                            const sel = document.getElementById(`role-${user.id}`);
                            updateRole(user.id, sel.value);
                          }} className="text-emerald-600 hover:text-emerald-800">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-600">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${roleBadge[user.role] || 'bg-slate-100 text-slate-600'}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusDot ok={user.is_active} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setEditingRole(user.id)}
                        className="text-xs font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 mx-auto">
                        <Edit2 className="w-3 h-3" /> Edit Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── System Health ──────────────────────────────────────────────────── */}
      {tab === 'health' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Live system resource metrics and service status.</p>
            <Button variant="outline" icon={RefreshCw} onClick={fetchHealth} disabled={healthLoading}>
              {healthLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {health ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Resources */}
              <Card className="border-slate-100 shadow-sm rounded-[28px]">
                <CardHeader title="System Resources" />
                <CardContent className="p-6 space-y-5">
                  {health.psutil_available ? (
                    <>
                      <GaugeBar label="CPU Usage" value={health.cpu_percent} />
                      <GaugeBar label="RAM Usage" value={health.ram_percent}
                        unit={`% (${health.ram_used_mb}MB / ${health.ram_total_mb}MB)`} />
                      <GaugeBar label="Disk Usage" value={health.disk_percent}
                        unit={`% (${health.disk_used_gb}GB / ${health.disk_total_gb}GB)`} />
                    </>
                  ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      psutil not installed. Run <code className="font-mono text-xs">pip install psutil</code> to enable metrics.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Services */}
              <Card className="border-slate-100 shadow-sm rounded-[28px]">
                <CardHeader title="Service Status" />
                <CardContent className="p-6 space-y-4">
                  <ServiceRow label="Database" icon={Database} ok={health.db_status === 'ok'}
                    detail={health.db_status === 'ok' ? 'Connected' : health.db_status} />
                  <ServiceRow label="Head Pose ML" icon={Cpu}
                    ok={health.ml?.head_pose === 'ready'}
                    detail={health.ml?.head_pose || 'unknown'} />
                  <ServiceRow label="Face Encoder" icon={Cpu}
                    ok={health.ml?.face_encoder === 'ready'}
                    detail={health.ml?.face_encoder || 'unknown'} />
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last checked</p>
                    <p className="text-xs text-slate-600 mt-1">{new Date(health.timestamp).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-sm">
              {healthLoading ? 'Loading health data…' : 'Click Refresh to check system health.'}
            </div>
          )}
        </div>
      )}

      {/* ── Backup & Restore ───────────────────────────────────────────────── */}
      {tab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader title="Database Backup" subtitle="Download a full SQL dump of the current database." />
            <CardContent className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
                <Shield className="w-4 h-4 inline mr-2" />
                Backup requires <code className="text-xs font-mono">pg_dump</code> in system PATH (included with PostgreSQL).
              </div>
              <Button
                variant="primary" icon={Download}
                onClick={triggerBackup} disabled={backing}
                className="w-full py-4"
              >
                {backing ? 'Generating…' : 'Download Backup (.sql)'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader title="Database Restore" subtitle="Upload a .sql backup file to restore the database." />
            <CardContent className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-700">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                <strong>Warning:</strong> Restore overwrites all existing data. This action cannot be undone.
              </div>
              <label className="w-full cursor-pointer">
                <div className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-center text-sm text-slate-500">
                  <Upload className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  Click to upload .sql backup file
                </div>
                <input type="file" accept=".sql" className="hidden" onChange={handleRestore} />
              </label>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Audit Log ─────────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <Card noPadding className="border-slate-100 shadow-sm overflow-hidden rounded-[28px]">
          <CardHeader
            title="Audit Log"
            subtitle="Immutable record of all system actions."
            action={
              <div className="flex gap-2">
                <input placeholder="Filter action…"
                  value={auditFilters.action}
                  onChange={e => setAuditFilters(p => ({ ...p, action: e.target.value }))}
                  className="text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-28" />
                <input placeholder="Filter entity…"
                  value={auditFilters.entity_type}
                  onChange={e => setAuditFilters(p => ({ ...p, entity_type: e.target.value }))}
                  className="text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 w-28" />
                <Button variant="outline" icon={RefreshCw} onClick={fetchAuditLog} disabled={auditLoading}>
                  Load
                </Button>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Changes</th>
                  <th className="px-6 py-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLoading ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">No audit entries yet. Click Load to fetch.</td></tr>
                ) : auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-slate-700">{log.user_email || 'System'}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">{log.action}</span>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-xs text-slate-600">{log.entity_type}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{(log.entity_id || '').slice(0, 8)}…</p>
                    </td>
                    <td className="px-6 py-3 max-w-xs">
                      {log.new_value ? (
                        <p className="text-[10px] font-mono text-slate-500 truncate">
                          {JSON.stringify(log.new_value).slice(0, 60)}
                        </p>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── SIS Import ────────────────────────────────────────────────────── */}
      {tab === 'sis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader title="Student Bulk Import" subtitle="Upload a CSV to import students from your SIS." />
            <CardContent className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2 text-sm text-blue-700">
                <p className="font-bold">Required CSV columns:</p>
                <div className="flex flex-wrap gap-2">
                  {['name', 'email', 'roll_no'].map(c => (
                    <code key={c} className="bg-white px-2 py-0.5 rounded text-xs font-mono border border-blue-200">{c}</code>
                  ))}
                </div>
                <p className="font-bold mt-2">Optional columns:</p>
                <div className="flex flex-wrap gap-2">
                  {['department', 'phone'].map(c => (
                    <code key={c} className="bg-white px-2 py-0.5 rounded text-xs font-mono border border-blue-100 text-blue-500">{c}</code>
                  ))}
                </div>
              </div>

              <label className="w-full cursor-pointer block">
                <div className={`w-full py-8 rounded-2xl border-2 border-dashed transition-all text-center ${importing ? 'border-blue-300 bg-blue-50 animate-pulse' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-500 font-medium">
                    {importing ? 'Importing…' : 'Click to upload CSV file'}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">Max 5,000 rows</p>
                </div>
                <input ref={sisFileRef} type="file" accept=".csv" className="hidden"
                  onChange={handleSisImport} disabled={importing} />
              </label>

              {/* Download template */}
              <button
                onClick={() => {
                  const csv = 'name,email,roll_no,department,phone\nJohn Doe,jdoe@example.com,STU-001,Computer Science,\n';
                  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                  const a = document.createElement('a'); a.href = url; a.download = 'sis_template.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download template CSV
              </button>
            </CardContent>
          </Card>

          {/* Results */}
          {importResult && (
            <Card className="border-slate-100 shadow-sm rounded-[28px]">
              <CardHeader title="Import Results" />
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-emerald-700">{importResult.imported}</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Imported</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                    <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-amber-700">{importResult.duplicates_resolved}</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Duplicates Skipped</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-500">Total rows: <strong>{importResult.total_rows_processed}</strong></p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-rose-500 uppercase">Errors ({importResult.errors.length}):</p>
                      {importResult.errors.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-xs text-rose-500 font-mono">{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Counselor Batches ─────────────────────────────────────────────── */}
      {tab === 'batches' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-100 shadow-sm rounded-[28px]">
              <CardHeader title="Batch Assignment Import" subtitle="Upload a CSV to assign students to counselor intake batches (~40 each)." />
              <CardContent className="p-6 space-y-4">
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-2 text-sm text-purple-700">
                  <p className="font-bold">Required CSV columns:</p>
                  <div className="flex flex-wrap gap-2">
                    {['intake_year', 'batch_code', 'counselor_email', 'student_id'].map(c => (
                      <code key={c} className="bg-white px-2 py-0.5 rounded text-xs font-mono border border-purple-200">{c}</code>
                    ))}
                  </div>
                  <p className="font-bold mt-2">Optional (for new students):</p>
                  <div className="flex flex-wrap gap-2">
                    {['roll_no', 'name', 'email', 'department'].map(c => (
                      <code key={c} className="bg-white px-2 py-0.5 rounded text-xs font-mono border border-purple-100 text-purple-500">{c}</code>
                    ))}
                  </div>
                </div>

                <label className="w-full cursor-pointer block">
                  <div className={`w-full py-8 rounded-2xl border-2 border-dashed transition-all text-center ${batchImporting ? 'border-purple-300 bg-purple-50 animate-pulse' : 'border-slate-200 hover:border-purple-400 hover:bg-slate-50'}`}>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm text-slate-500 font-medium">
                      {batchImporting ? 'Importing…' : 'Click to upload batch assignment CSV'}
                    </p>
                  </div>
                  <input ref={batchFileRef} type="file" accept=".csv" className="hidden"
                    onChange={handleBatchImport} disabled={batchImporting} />
                </label>

                <button
                  onClick={downloadBatchTemplate}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download template CSV
                </button>
              </CardContent>
            </Card>

            {batchImportResult && (
              <Card className="border-slate-100 shadow-sm rounded-[28px]">
                <CardHeader title="Import Results" />
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-emerald-700">{batchImportResult.students_assigned}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Assigned</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                      <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-blue-700">{batchImportResult.batches_created}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase">Batches Created</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs text-slate-500 space-y-1">
                    <p>Students created: <strong>{batchImportResult.students_created}</strong></p>
                    <p>Skipped: <strong>{batchImportResult.skipped}</strong></p>
                    {batchImportResult.warnings?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-amber-500 uppercase">Warnings</p>
                        {batchImportResult.warnings.slice(0, 3).map((w, i) => (
                          <p key={i} className="text-amber-600">{w}</p>
                        ))}
                      </div>
                    )}
                    {batchImportResult.errors?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-rose-500 uppercase">Errors ({batchImportResult.errors.length})</p>
                        {batchImportResult.errors.slice(0, 5).map((e, i) => (
                          <p key={i} className="text-rose-500 font-mono">{e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-slate-100 shadow-sm rounded-[28px] overflow-hidden">
            <CardHeader title="All Counselor Batches" subtitle="Intake groups and assigned counselors." />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      {['Intake', 'Code', 'Batch Name', 'Counselor', 'Students', 'Target'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchesLoading ? (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
                    ) : batches.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No batches yet. Upload a CSV to create them.</td></tr>
                    ) : (
                      batches.map(b => (
                        <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-semibold">{b.intake_year}</td>
                          <td className="px-5 py-3 font-mono text-xs">{b.batch_code}</td>
                          <td className="px-5 py-3 text-slate-700">{b.name}</td>
                          <td className="px-5 py-3">
                            <span className="font-medium text-slate-800">{b.counselor_name}</span>
                            <span className="block text-xs text-slate-400">{b.counselor_email}</span>
                          </td>
                          <td className="px-5 py-3 font-bold">{b.student_count}</td>
                          <td className="px-5 py-3 text-slate-400">~{b.target_size}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Notification Config ─────────────────────────────────────────────── */}
      {tab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader title="Alert Notifications" subtitle="Control how alerts are delivered to you." />
            <CardContent className="p-6 space-y-5">
              <ToggleRow label="Dashboard Notifications"
                sub="Show alert banners during live monitoring"
                checked={notifPrefs.dashboard}
                onChange={v => saveNotifPrefs({ ...notifPrefs, dashboard: v })} />
              <ToggleRow label="Email Notifications"
                sub="Receive critical alerts via email"
                checked={notifPrefs.email}
                onChange={v => saveNotifPrefs({ ...notifPrefs, email: v })} />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Alert Frequency</p>
                <div className="grid grid-cols-3 gap-2">
                  {['immediate', 'hourly', 'daily'].map(freq => (
                    <button key={freq}
                      onClick={() => saveNotifPrefs({ ...notifPrefs, frequency: freq })}
                      className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        notifPrefs.frequency === freq ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-100 shadow-sm rounded-[28px]">
            <CardHeader title="Periodic Attendance Summary"
              subtitle="Configure scheduled email summaries for teaching staff." />
            <CardContent className="p-6 space-y-5">
              <ToggleRow label="Enable Periodic Emails"
                sub="Automatically send attendance summaries to teachers"
                checked={emailSummaryConfig.enabled}
                onChange={async v => {
                  const updated = { ...emailSummaryConfig, enabled: v };
                  setEmailSummaryConfig(updated);
                  try {
                    await api.post(`/system/email-summary/configure?enabled=${v}&frequency=${updated.frequency}`);
                    toast.success(v ? 'Email summaries enabled' : 'Email summaries disabled');
                  } catch { toast.error('Failed to update email summary config'); }
                }} />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Summary Frequency</p>
                <div className="grid grid-cols-3 gap-2">
                  {['daily', 'weekly', 'monthly'].map(freq => (
                    <button key={freq}
                      onClick={async () => {
                        const updated = { ...emailSummaryConfig, frequency: freq };
                        setEmailSummaryConfig(updated);
                        try {
                          await api.post(`/system/email-summary/configure?enabled=${updated.enabled}&frequency=${freq}`);
                        } catch { /* silent */ }
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        emailSummaryConfig.frequency === freq ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}>
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="outline" icon={Bell} onClick={triggerEmailSummary} className="w-full">
                Send Summary Now
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────────────────────

function ServiceRow({ label, icon: Icon, ok, detail }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50/60 rounded-xl border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-sm">{label}</p>
          <p className="text-[10px] text-slate-400">{detail}</p>
        </div>
      </div>
      <StatusDot ok={ok} />
    </div>
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
