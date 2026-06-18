import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Calendar, Clock, Users, BookOpen, MoreVertical,
  ArrowRight, TrendingUp, XCircle, Clock3, CalendarDays,
  LayoutGrid, List, Filter, AlertCircle, RefreshCw, Edit2, Trash2,
  UserPlus, UserMinus, CheckCircle2,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function CourseDashboard() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]); // all students (for enrollment picker)
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCourse, setSelectedCourse] = useState(null); // detail panel
  const [courseDetail, setCourseDetail] = useState(null);     // detail data
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollPickerOpen, setEnrollPickerOpen] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState('');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/courses');
      setCourses(res.data);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchStudents();
    // Retire localStorage key if present
    localStorage.removeItem('smart_attendance_courses');
  }, [fetchCourses, fetchStudents]);

  const openDetail = async (course) => {
    setSelectedCourse(course);
    setDetailLoading(true);
    setCourseDetail(null);
    try {
      const res = await api.get(`/courses/${course.id}/detail`);
      setCourseDetail(res.data);
    } catch {
      toast.error('Failed to load course detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredCourses = courses.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Add course ──────────────────────────────────────────────────────────────
  const handleAddCourse = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const slotsRaw = fd.get('slots') || '';
    const slotsArr = slotsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      code: fd.get('code'),
      name: fd.get('name'),
      description: fd.get('description') || null,
      slots: slotsArr,
    };
    try {
      const res = await api.post('/courses', payload);
      setCourses(prev => [...prev, res.data]);
      setIsAddModalOpen(false);
      e.target.reset();
      toast.success('Course created');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create course');
    }
  };

  // ── Edit course ─────────────────────────────────────────────────────────────
  const handleEditCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;
    const fd = new FormData(e.target);
    const slotsRaw = fd.get('slots') || '';
    const slotsArr = slotsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      name: fd.get('name'),
      description: fd.get('description') || null,
      slots: slotsArr,
    };
    try {
      const res = await api.put(`/courses/${editingCourse.id}`, payload);
      setCourses(prev => prev.map(c => c.id === editingCourse.id ? res.data : c));
      setIsEditModalOpen(false);
      setEditingCourse(null);
      if (selectedCourse?.id === editingCourse.id) openDetail(res.data);
      toast.success('Course updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update course');
    }
  };

  // ── Delete course ───────────────────────────────────────────────────────────
  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Delete this course? All sessions and records will be lost.')) return;
    try {
      await api.delete(`/courses/${id}`);
      setCourses(prev => prev.filter(c => c.id !== id));
      if (selectedCourse?.id === id) { setSelectedCourse(null); setCourseDetail(null); }
      toast.success('Course deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete course');
    }
  };

  // ── Enroll student ──────────────────────────────────────────────────────────
  const handleEnroll = async (studentId) => {
    if (!selectedCourse) return;
    try {
      await api.post(`/courses/${selectedCourse.id}/enroll`, { student_id: studentId });
      toast.success('Student enrolled');
      openDetail(selectedCourse);
      setEnrollPickerOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to enroll student');
    }
  };

  const handleUnenroll = async (studentId) => {
    if (!selectedCourse) return;
    if (!window.confirm('Remove this student from the course?')) return;
    try {
      await api.delete(`/courses/${selectedCourse.id}/enroll/${studentId}`);
      toast.success('Student removed');
      openDetail(selectedCourse);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove student');
    }
  };

  // ── Derived stats ───────────────────────────────────────────────────────────
  const totalStudents = courseDetail?.total_students ?? 0;
  const avgAtt = courseDetail?.avg_attendance ?? 0;

  // Students not yet enrolled in the selected course
  const enrolledIds = new Set(courseDetail?.students?.map(s => s.id) ?? []);
  const unenrolledStudents = students.filter(
    s => !enrolledIds.has(s.id) &&
         (s.name.toLowerCase().includes(enrollSearch.toLowerCase()) ||
          (s.roll_no || '').toLowerCase().includes(enrollSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <PageHeader
        title="Course Management"
        description="Manage academic modules, schedules, and student enrollment."
        actions={
          <div className="flex gap-3">
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <List className="w-5 h-5" />
              </button>
            </div>
            <Button variant="outline" icon={RefreshCw} onClick={fetchCourses} disabled={loading}>
              Refresh
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
              Add Course
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={BookOpen} label="Active Courses" value={courses.length} color="blue" />
        <StatCard icon={Users} label="Total Enrolled"
          value={courses.reduce((acc, c) => acc + (c._student_count ?? 0), 0)} color="emerald" />
        <StatCard icon={TrendingUp} label="Avg Attendance" value="—" color="amber" />
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <input type="text" placeholder="Search by name or code…"
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm text-sm" />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20 text-slate-400 text-sm">Loading courses…</div>
      )}

      {/* Empty */}
      {!loading && filteredCourses.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No courses found.</p>
          <p className="text-slate-300 text-sm mt-1">Create your first course to get started.</p>
        </div>
      )}

      {/* Grid view */}
      {!loading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div key={course.id} onClick={() => openDetail(course)}
              className="group bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-4 right-4 flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setEditingCourse(course); setIsEditModalOpen(true); }}
                  className="p-2 rounded-xl text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteCourse(course.id)}
                  className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-6 pr-16">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="primary" className="mb-1">{course.code}</Badge>
                  <h3 className="font-semibold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">{course.name}</h3>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {(course.slots || []).slice(0, 2).map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-500 text-sm">
                    <Clock3 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{typeof slot === 'object' ? `${slot.day} ${slot.time}` : slot}</span>
                  </div>
                ))}
                {!course.slots?.length && (
                  <p className="text-xs text-slate-300 italic">No schedule set</p>
                )}
              </div>
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-semibold">{course.code}</p>
                <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && viewMode === 'list' && (
        <Card noPadding className="border-slate-100 shadow-sm rounded-[28px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Schedule</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map(course => (
                  <tr key={course.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => openDetail(course)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center uppercase">
                          {course.code.split('-')[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{course.name}</p>
                          <p className="text-xs text-slate-400 font-bold">{course.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(course.slots || []).map((slot, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                          <CalendarDays className="w-3 h-3 text-slate-300" />
                          {typeof slot === 'object' ? `${slot.day} ${slot.time}` : slot}
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditingCourse(course); setIsEditModalOpen(true); }}
                          className="text-xs font-bold text-blue-500 hover:text-blue-700">Edit</button>
                        <button onClick={() => handleDeleteCourse(course.id)}
                          className="text-xs font-bold text-rose-400 hover:text-rose-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Add Course Modal ──────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <CourseFormModal
          title="Create New Course"
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddCourse}
        />
      )}

      {/* ── Edit Course Modal ─────────────────────────────────────────────────── */}
      {isEditModalOpen && editingCourse && (
        <CourseFormModal
          title="Edit Course"
          initial={editingCourse}
          onClose={() => { setIsEditModalOpen(false); setEditingCourse(null); }}
          onSubmit={handleEditCourse}
          readonlyCode
        />
      )}

      {/* ── Course Detail Slide-over ──────────────────────────────────────────── */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => { setSelectedCourse(null); setCourseDetail(null); }}
                  className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
                <div>
                  <Badge variant="primary">{selectedCourse.code}</Badge>
                  <h2 className="text-2xl font-semibold text-slate-900 mt-1">{selectedCourse.name}</h2>
                </div>
              </div>
              <Button variant="outline" icon={Edit2} onClick={() => { setEditingCourse(selectedCourse); setIsEditModalOpen(true); }}>
                Edit
              </Button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {detailLoading ? (
                <div className="text-center py-20 text-slate-400 text-sm">Loading detail…</div>
              ) : courseDetail ? (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Students</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{courseDetail.total_students}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Sessions</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">{courseDetail.total_sessions}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Attendance</p>
                      <p className={`text-2xl font-bold mt-1 ${courseDetail.avg_attendance < 75 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {courseDetail.avg_attendance}%
                      </p>
                    </div>
                  </div>

                  {/* Enroll students */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" /> Enrolled Students
                        <span className="text-xs text-slate-400 font-normal">({courseDetail.total_students})</span>
                      </h3>
                      <button onClick={() => setEnrollPickerOpen(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Enroll Student
                      </button>
                    </div>

                    {/* Enroll picker */}
                    {enrollPickerOpen && (
                      <div className="mb-4 border border-blue-100 rounded-2xl p-4 bg-blue-50/30 space-y-3">
                        <input type="text" placeholder="Search students to enroll…"
                          value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {unenrolledStudents.slice(0, 20).map(s => (
                            <button key={s.id} onClick={() => handleEnroll(s.id)}
                              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white text-left text-sm transition-colors">
                              <span className="font-medium text-slate-800">{s.name}</span>
                              <span className="text-xs text-slate-400">{s.roll_no}</span>
                            </button>
                          ))}
                          {unenrolledStudents.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-3">No matching students to enroll</p>
                          )}
                        </div>
                        <button onClick={() => setEnrollPickerOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {courseDetail.students.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No students enrolled yet.</p>
                      ) : courseDetail.students.map(s => (
                        <div key={s.id} className={`p-4 border rounded-2xl hover:border-blue-100 transition-all group ${s.attendance_pct < 75 && s.present + s.absent > 0 ? 'border-rose-100 bg-rose-50/20' : 'border-slate-100'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs">
                                {s.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                                <p className="text-xs text-slate-400">{s.roll_no}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={s.attendance_pct < 75 ? 'error' : s.attendance_pct > 85 ? 'success' : 'warning'}>
                                {s.attendance_pct}%
                              </Badge>
                              <button onClick={() => handleUnenroll(s.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-rose-400 hover:bg-rose-50 transition-all">
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-slate-50 rounded-xl py-2 border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Present</p>
                              <p className="text-base font-bold text-emerald-600">{s.present}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl py-2 border border-slate-100">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Absent</p>
                              <p className="text-base font-bold text-rose-500">{s.absent}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Schedule */}
                  {(courseDetail.slots || []).length > 0 && (
                    <div className="bg-blue-600 rounded-3xl p-6 text-white overflow-hidden relative">
                      <Calendar className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Class Schedule
                      </h3>
                      <div className="space-y-2 relative z-10">
                        {courseDetail.slots.map((slot, i) => {
                          const s = typeof slot === 'object' ? `${slot.day} ${slot.time}${slot.room ? ' · ' + slot.room : ''}` : slot;
                          return (
                            <div key={i} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                              <span className="font-medium">{s.split(' ')[0]}</span>
                              <span className="font-bold">{s.split(' ').slice(1).join(' ')}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-50',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-50',
    amber: 'bg-amber-50 text-amber-600 border-amber-50',
  };
  return (
    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${colorMap[color]}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-semibold text-slate-900 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function CourseFormModal({ title, initial = null, onClose, onSubmit, readonlyCode = false }) {
  const slotsStr = initial?.slots
    ? initial.slots.map(s => typeof s === 'object' ? `${s.day} ${s.time}` : s).join(', ')
    : '';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl p-8 animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h3>
            <p className="text-slate-500 text-sm mt-1">Fill in the course details below.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Course Name</label>
            <input name="name" required defaultValue={initial?.name || ''}
              placeholder="e.g. Machine Learning"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Course Code</label>
              <input name="code" required defaultValue={initial?.code || ''}
                readOnly={readonlyCode} placeholder="CS-101"
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none uppercase text-sm ${readonlyCode ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <input name="description" defaultValue={initial?.description || ''}
                placeholder="Optional"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Time Slots (comma-separated)</label>
            <input name="slots" defaultValue={slotsStr}
              placeholder="Mon 10:00 AM, Wed 10:00 AM"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm" />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1">
              {initial ? 'Save Changes' : 'Create Course'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
