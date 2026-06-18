import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  Trash2, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Filter,
  Download,
  Camera
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [bulkUploadError, setBulkUploadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNo: '',
    email: '',
    courseId: '',
    department: 'computer'
  });

  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        api.get('/students').catch(() => null),
        api.get('/courses').catch(() => null),
      ]);
      setStudents(studentsRes?.data ?? []);
      setCourses(coursesRes?.data ?? []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateRollNo = (rollNo) => /^[a-zA-Z0-9-]+$/.test(rollNo);

  const handleAddStudent = async (e) => {
    e.preventDefault();

    if (!newStudent.name || !newStudent.rollNo || !newStudent.email || !newStudent.courseId) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!validateEmail(newStudent.email)) {
      toast.error("Invalid email format");
      return;
    }
    if (!validateRollNo(newStudent.rollNo)) {
      toast.error("Invalid roll number format (use alphanumeric and hyphens)");
      return;
    }

    try {
      await api.post('/students', {
        name: newStudent.name,
        roll_no: newStudent.rollNo,
        student_id: `STU-${newStudent.rollNo.toUpperCase()}`,
        email: newStudent.email,
        department: newStudent.department,
      });
      toast.success("Student created successfully");
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to create student';
      toast.error(msg);
    }

    setNewStudent({ name: '', rollNo: '', email: '', courseId: '', department: 'computer' });
    setIsAddModalOpen(false);
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { imported, skipped, errors } = res.data;
      toast.success(`Imported ${imported} students${skipped > 0 ? `, ${skipped} skipped` : ''}`);
      if (errors?.length) setBulkUploadError(errors);
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Bulk import failed';
      toast.error(msg);
    }
    e.target.value = '';
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm("Are you sure you want to remove this student?")) {
      try {
        await api.delete(`/students/${id}`);
        toast.success("Student removed");
        fetchData();
      } catch (error) {
        const msg = error.response?.data?.detail || 'Failed to delete student';
        toast.error(msg);
      }
    }
  };

  const handleReEnroll = (studentId) => {
    // Navigate to enrollment page with the student ID selected
    navigate(`/dashboard/enrollment?student=${studentId}`);
  };

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.roll_no?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <PageHeader 
        title="Student Management" 
        description="Maintain the central student database, handle bulk registrations, and course assignments."
        actions={
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              icon={Download} 
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8,name,roll_no,student_id,email,department\nJohn Doe,CS-21-001,STU-CS-21-001,john@example.com,Computer Science";
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "student_template.csv");
                document.body.appendChild(link);
                link.click();
              }}
            >
              Download Template
            </Button>
            <Button variant="primary" icon={UserPlus} onClick={() => setIsAddModalOpen(true)}>
              Add Student
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stats Summary */}
        <Card className="lg:col-span-1 border-slate-100 shadow-sm h-fit">
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Students</p>
              <h3 className="text-3xl font-bold text-slate-900">{students.length}</h3>
            </div>
            <div className="pt-4 border-t border-slate-50">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Unique Courses</p>
              <h3 className="text-xl font-bold text-slate-800">
                {[...new Set(students.map(s => s.courseId).filter(Boolean))].length}
              </h3>
            </div>
            <div className="pt-6">
               <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleCSVUpload} 
                className="hidden" 
                accept=".csv"
               />
               <button 
                onClick={() => fileInputRef.current.click()}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
               >
                 <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                 <span className="text-sm font-bold text-slate-600 group-hover:text-blue-700">Bulk CSV Upload</span>
               </button>
            </div>
          </CardContent>
        </Card>

        {/* Main List */}
        <div className="lg:col-span-3 space-y-6">
          {bulkUploadError && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-red-800">CSV Parsing Errors</h4>
                <div className="mt-1 text-xs text-red-600 max-h-24 overflow-y-auto">
                  {bulkUploadError.map((err, i) => <p key={i}>{err}</p>)}
                </div>
              </div>
            </div>
          )}

          <Card noPadding className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader 
              title="Student Registry" 
              subtitle="All registered students across the system."
              action={
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search students..." 
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Roll Number</th>
                    <th className="px-6 py-4">Email Address</th>
                    <th className="px-6 py-4">Course ID</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Enrolled Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                        Loading students...
                      </td>
                    </tr>
                  ) : filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-[11px] border border-blue-100">
                            {student.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                            <p className="text-xs text-slate-400">{student.student_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{student.roll_no}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{student.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant="primary" className="uppercase">{student.department || 'N/A'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {student.embedding_status === 'enrolled' ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Enrolled ({student.enrollment_samples} samples)
                          </div>
                        ) : student.embedding_status === 'failed' ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Failed
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Pending Enrollment
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {student.enrollment_date
                          ? new Date(student.enrollment_date).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleReEnroll(student.id)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Re-enroll Face"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(student.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Student Modal (Simplified for demo) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader title="Add New Student" />
            <form onSubmit={handleAddStudent} className="p-6 pt-0 space-y-4">
              <Input 
                label="Full Name" 
                placeholder="e.g. Hashir Mehboob" 
                value={newStudent.name}
                onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Roll Number" 
                  placeholder="e.g. CS-21-140" 
                  value={newStudent.rollNo}
                  onChange={(e) => setNewStudent({...newStudent, rollNo: e.target.value})}
                  required
                />
                <Select 
                  label="Assign Course" 
                  value={newStudent.courseId}
                  onChange={(e) => setNewStudent({...newStudent, courseId: e.target.value})}
                  required
                  options={[
                    { value: '', label: 'Select a Course' },
                    ...courses.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))
                  ]}
                />
              </div>
              <Input 
                label="Email Address" 
                type="email"
                placeholder="student@university.edu" 
                value={newStudent.email}
                onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                required
              />
              <Select 
                label="Department"
                value={newStudent.department}
                onChange={(e) => setNewStudent({...newStudent, department: e.target.value})}
                options={[
                  { value: 'computer', label: 'Computer Science' },
                  { value: 'software', label: 'Software Engineering' },
                  { value: 'electrical', label: 'Electrical Engineering' }
                ]}
              />
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit" className="flex-1">Create Record</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
