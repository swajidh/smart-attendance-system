import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Users,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Play,
  Clock,
  ShieldCheck,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';
import { canAccess, getRoleLabel, PERMISSIONS } from '../../config/roles';

const WELCOME_BY_ROLE = {
  admin: 'Administrator',
  teacher: 'Instructor',
  counselor: 'Counselor',
};

export default function DashboardHome() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('smart_attendance_user') || '{}');
  const userRole = storedUser?.role || 'teacher';
  const canRunLive = canAccess(userRole, PERMISSIONS.live_sessions);
  const canManageCourses = canAccess(userRole, PERMISSIONS.manage_courses);
  const [data, setData] = useState({
    totalStudents: 0,
    activeCourses: 0,
    avgAttendancePct: 0,
    recentSessions: [],
    courses: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        const d = res.data;
        setData({
          totalStudents: d.total_students,
          activeCourses: d.total_courses,
          avgAttendancePct: d.avg_attendance_pct,
          recentSessions: d.recent_sessions,
          courses: d.courses,
        });
      } catch {
        // Leave zeros — backend may not have data yet
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = [
    { name: 'Total Students', value: loading ? '…' : data.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Active Courses', value: loading ? '…' : data.activeCourses, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Avg Attendance', value: loading ? '…' : `${data.avgAttendancePct}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const lastAnomaly = data.recentSessions.some((s) => s.total_unknown > 0);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {WELCOME_BY_ROLE[userRole] || getRoleLabel(userRole)}
          </h1>
          <p className="text-slate-500 mt-1">
            {userRole === 'counselor'
              ? 'Monitor your assigned student batch — alerts, reports, and attention analytics.'
              : 'System is synchronized. All modules are reporting active.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/reports')}
            className="rounded-2xl px-6"
          >
            View Reports
          </Button>
          {canRunLive && (
            <Button
              variant="primary"
              icon={Play}
              onClick={() => navigate('/dashboard/live')}
              className="shadow-lg shadow-blue-500/20 py-6 px-8 rounded-2xl text-lg"
            >
              Start Live Session
            </Button>
          )}
          {userRole === 'counselor' && (
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard/my-batch')}
              className="shadow-lg shadow-blue-500/20 py-6 px-8 rounded-2xl text-lg"
            >
              View My Batch
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-[28px]">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center border border-current/10`}
                >
                  <stat.icon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Hero CTA */}
          {canRunLive ? (
          <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
            <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">Automated Recognition Active</h3>
                <p className="text-blue-100 mb-6 max-w-md">
                  The ML Engine is connected to your student database. Ready to process facial embeddings for today's sessions.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate('/dashboard/live')}
                    className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors"
                  >
                    Go to Live Classroom <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-3 rounded-xl border border-white/10">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    SYSTEM READY
                  </div>
                </div>
              </div>
              <Eye className="absolute right-0 bottom-0 w-64 h-64 text-white/10 -mr-10 -mb-10" />
            </div>
          </Card>
          ) : (
          <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
            <div className="p-8 bg-gradient-to-br from-slate-700 to-slate-800 text-white relative">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">Student Monitoring</h3>
                <p className="text-slate-300 mb-6 max-w-md">
                  Review at-risk students, attention trends, and attendance reports. You have read-only access as a counselor.
                </p>
                <button
                  onClick={() => navigate('/dashboard/my-batch')}
                  className="bg-white text-slate-800 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors"
                >
                  View My Batch <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Sessions */}
            <Card className="border-slate-100 shadow-sm rounded-[24px]">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h4 className="font-bold text-slate-800">Recent Sessions</h4>
                <HistoryLink onClick={() => navigate('/dashboard/reports')} />
              </div>
              <CardContent className="p-0">
                {data.recentSessions.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {data.recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{session.course_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {session.total_present} Present · {session.attendance_pct}%
                            </p>
                          </div>
                        </div>
                        <Badge variant={session.total_unknown > 0 ? 'warning' : 'success'}>
                          {session.total_unknown > 0 ? 'Alert' : 'Clean'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-slate-400 text-sm">
                      {loading ? 'Loading…' : 'No recent sessions found.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Integrity */}
            <Card className="border-slate-100 shadow-sm rounded-[24px]">
              <div className="p-6 border-b border-slate-50">
                <h4 className="font-bold text-slate-800">System Integrity</h4>
              </div>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-600">ML Connected</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase">
                      Stable
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-5 h-5 ${lastAnomaly ? 'text-amber-500' : 'text-slate-300'}`} />
                      <span className="text-sm font-medium text-slate-600">Recent Anomalies</span>
                    </div>
                    <Badge variant={lastAnomaly ? 'warning' : 'outline'}>
                      {lastAnomaly ? 'Flagged' : 'None'}
                    </Badge>
                  </div>
                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Database Health</p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="w-[98%] h-full bg-blue-600 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {/* Today's Schedule */}
          <Card className="border-slate-100 shadow-sm rounded-[24px]">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-slate-800">Courses</h4>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {data.courses.length > 0 ? (
                  data.courses.map((course) => {
                    const slot = (course.slots && course.slots[0]) || 'TBD';
                    return (
                      <div
                        key={course.id}
                        className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {slot.split(' ')[0].slice(0, 3)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                              {course.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {course.code}
                            </p>
                          </div>
                        </div>
                        <button className="text-slate-300 group-hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-all transform group-hover:translate-x-1">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    {loading ? 'Loading…' : 'No courses registered yet.'}
                  </div>
                )}
              </div>
              {canManageCourses && (
              <div className="p-4 bg-slate-50/50">
                <button
                  onClick={() => navigate('/dashboard/courses')}
                  className="w-full py-3 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest"
                >
                  Manage All Courses
                </button>
              </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance highlight */}
          <Card className="border-slate-100 shadow-sm rounded-[24px] bg-indigo-900 text-white p-6 relative overflow-hidden">
            <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">
                Overall Attendance
              </p>
              <h4 className="text-2xl font-bold mb-4">
                {loading ? '…' : `${data.avgAttendancePct}%`}
              </h4>
              <p className="text-indigo-200 text-xs leading-relaxed">
                Average across all closed sessions tracked in the system.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HistoryLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest"
    >
      Full History
    </button>
  );
}
