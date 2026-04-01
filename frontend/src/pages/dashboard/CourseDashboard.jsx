import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  MoreVertical, 
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock3,
  CalendarDays,
  LayoutGrid,
  List,
  Filter
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

export default function CourseDashboard() {
  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('smart_attendance_courses');
    return saved ? JSON.parse(saved) : [
      { id: '1', code: 'CS-402', name: 'Artificial Intelligence', instructor: 'Dr. Sarah Ahmed', students: 42, attendance: 85, slots: ['Mon 10:00 AM', 'Thu 02:00 PM'] },
      { id: '2', code: 'CS-301', name: 'Database Systems', instructor: 'Prof. Usman Ali', students: 38, attendance: 92, slots: ['Tue 09:00 AM', 'Fri 11:00 AM'] },
      { id: '3', code: 'SE-210', name: 'Software Requirement Eng.', instructor: 'Ms. Hiba Khan', students: 45, attendance: 78, slots: ['Wed 01:00 PM', 'Sat 10:00 AM'] }
    ];
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('smart_attendance_courses', JSON.stringify(courses));
  }, [courses]);

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCourse = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newCourse = {
      id: Math.random().toString(36).substr(2, 9),
      code: formData.get('code'),
      name: formData.get('name'),
      instructor: 'Current Instructor',
      students: 0,
      attendance: 0,
      slots: formData.get('slots').split(',').map(s => s.trim())
    };
    setCourses([...courses, newCourse]);
    setIsAddModalOpen(false);
    toast.success('Course added successfully!');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <PageHeader 
        title="Course Management" 
        description="Oversee your academic modules, schedules, and student enrollment."
        actions={
          <div className="flex gap-3">
             <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button 
                   onClick={() => setViewMode('list')}
                   className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="w-5 h-5" />
                </button>
             </div>
             <Button variant="primary" icon={Plus} onClick={() => setIsAddModalOpen(true)}>
               Add New Course
             </Button>
          </div>
        }
      />

      {/* Stats Quick Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-blue-50/50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-50">
             <BookOpen className="w-7 h-7" />
           </div>
           <div>
             <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Active Courses</p>
             <p className="text-3xl font-semibold text-slate-900 mt-1 tracking-tight">{courses.length}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-emerald-50/50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-50">
             <Users className="w-7 h-7" />
           </div>
           <div>
             <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Enrolled Students</p>
             <p className="text-3xl font-semibold text-slate-900 mt-1 tracking-tight">{courses.reduce((acc, c) => acc + c.students, 0)}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-amber-50/50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 border border-amber-50">
             <TrendingUp className="w-7 h-7" />
           </div>
           <div>
             <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Avg. Attendance</p>
             <p className="text-3xl font-semibold text-slate-900 mt-1 tracking-tight">
               {Math.round(courses.reduce((acc, c) => acc + c.attendance, 0) / courses.length)}%
             </p>
           </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <input 
            type="text" 
            placeholder="Search by course name or code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm text-sm"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
        </div>
        <Button variant="outline" icon={Filter} className="w-full sm:w-auto">
          Advanced Filters
        </Button>
      </div>

      {/* Courses Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div 
              key={course.id} 
              onClick={() => setSelectedCourse(course)}
              className="group bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                   <Badge variant="primary" className="mb-1">{course.code}</Badge>
                   <h3 className="font-semibold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">{course.name}</h3>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                   <Clock3 className="w-4 h-4" />
                   <span>{course.slots[0]}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                   <Users className="w-4 h-4" />
                   <span>{course.students} Registered Students</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Weekly Attendance</p>
                    <div className="flex items-center gap-2">
                       <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                             className={`h-full rounded-full ${course.attendance > 90 ? 'bg-emerald-500' : course.attendance > 80 ? 'bg-blue-500' : 'bg-amber-500'}`}
                             style={{ width: `${course.attendance}%` }}
                          />
                       </div>
                       <span className="text-sm font-semibold text-slate-700">{course.attendance}%</span>
                    </div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                    <ArrowRight className="w-4 h-4" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card noPadding>
           <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-y border-slate-100 text-[13px] font-semibold text-slate-500 uppercase tracking-widest leading-relaxed">
                  <th className="px-6 py-4 font-semibold">Course Details</th>
                  <th className="px-6 py-4 font-semibold">Schedule</th>
                  <th className="px-6 py-4 font-semibold">Enrolled</th>
                  <th className="px-6 py-4 font-semibold">Attendance</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => setSelectedCourse(course)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center shadow-sm border border-blue-100 shrink-0 uppercase">
                          {course.code.split('-')[0]}
                        </div>
                        <div>
                           <p className="font-semibold text-slate-800">{course.name}</p>
                           <p className="text-xs text-slate-500 font-medium">{course.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          {course.slots.map((slot, i) => (
                            <div key={i} className="flex items-center gap-2 text-slate-600 text-xs">
                               <CalendarDays className="w-3 h-3 text-slate-400" />
                               {slot}
                            </div>
                          ))}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-700">{course.students}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <Badge variant={course.attendance > 85 ? 'success' : 'primary'}>{course.attendance}% Avg</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="sm">Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Course Modal (Simplified for now) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl p-8 transform transition-all animate-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-semibold text-slate-900 tracking-tight">Create New Course</h3>
                    <p className="text-slate-500 text-sm mt-1">Fill in the basic parameters for the new module.</p>
                 </div>
                 <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                    <XCircle className="w-6 h-6" />
                 </button>
              </div>

              <form onSubmit={handleAddCourse} className="space-y-5">
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Course Name</label>
                    <input name="name" required placeholder="e.g. Machine Learning" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-700">Course Code</label>
                       <input name="code" required placeholder="CS-101" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase placeholder:text-slate-400 text-sm" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-slate-700">Credit Hours</label>
                       <input name="credits" type="number" defaultValue="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Time Slots (Comma separated)</label>
                    <input name="slots" required placeholder="Mon 10:00 AM, Wed 10:00 AM" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm" />
                 </div>
                 
                 <div className="pt-4 flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="primary" className="flex-1">Create Course</Button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Course Detail Overlay (Simplified) */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex justify-end">
           <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col transform transition-all animate-in slide-in-from-right duration-500">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedCourse(null)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                       <XCircle className="w-6 h-6 text-slate-400" />
                    </button>
                    <div>
                       <Badge variant="primary">{selectedCourse.code}</Badge>
                       <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{selectedCourse.name}</h2>
                    </div>
                 </div>
                 <Button variant="outline">Edit Course</Button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                 {/* Detail Stats */}
                 <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance</p>
                       <p className="text-2xl font-bold text-emerald-600">{selectedCourse.attendance}%</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Late Rate</p>
                       <p className="text-2xl font-bold text-blue-600">4%</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Absence</p>
                       <p className="text-2xl font-bold text-red-500">11%</p>
                    </div>
                 </div>

                 {/* Registered Students Section */}
                 <div>
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" />
                          Registered Students
                       </h3>
                       <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{selectedCourse.students} Total</span>
                    </div>
                    
                    <div className="space-y-4">
                       {/* Mock student list with detail metrics */}
                       {[
                         { id: '1', name: 'Ali Hamza', studentId: 'STU-001', attendance: 95, present: 19, absent: 1 },
                         { id: '2', name: 'Ayesha Bibi', studentId: 'STU-014', attendance: 82, present: 16, absent: 4 },
                         { id: '3', name: 'Zainab Ahmed', studentId: 'STU-022', attendance: 64, present: 12, absent: 8 },
                       ].map(student => (
                         <div key={student.id} className="p-5 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/5 transition-all group relative">
                            <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs">
                                     {student.name.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                     <p className="font-semibold text-slate-800 text-[15px]">{student.name}</p>
                                     <p className="text-xs text-slate-400 font-medium">{student.studentId}</p>
                                  </div>
                               </div>
                               <Badge variant={student.attendance > 80 ? 'success' : 'warning'} className="font-bold">
                                  {student.attendance}% Rate
                               </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                               <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/50 flex flex-col items-center justify-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Present</span>
                                  <span className="text-lg font-bold text-emerald-600">{student.present}</span>
                               </div>
                               <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/50 flex flex-col items-center justify-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Absent</span>
                                  <span className="text-lg font-bold text-red-500">{student.absent}</span>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Scheduling Detail */}
                 <div className="bg-blue-600 rounded-3xl p-6 text-white overflow-hidden relative">
                    <Calendar className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                       <Clock className="w-5 h-5" />
                       Class Schedule
                    </h3>
                    <div className="space-y-3 relative z-10">
                       {selectedCourse.slots.map((slot, i) => (
                         <div key={i} className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
                            <span className="font-medium">{slot.split(' ')[0]}</span>
                            <span className="font-bold">{slot.split(' ').slice(1).join(' ')}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
              
              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                 <Button variant="primary" className="w-full py-4 text-base" onClick={() => toast.success('Sending attendance reminder to students...')}>
                    Send Module Reports
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
