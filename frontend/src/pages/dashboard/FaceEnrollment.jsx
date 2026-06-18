import React, { useState, useRef, useEffect } from 'react';
import { Camera, UploadCloud, Users, CheckCircle2, FileArchive, Loader2, AlertCircle, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import StudentRegistrationForm from '../../components/dashboard/StudentRegistrationForm';
import WebcamCapture from '../../components/dashboard/WebcamCapture';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function FaceEnrollment() {
  const [activeTab, setActiveTab] = useState('webcam');
  // Capture Flow State: 'form' -> 'active_camera'
  const [captureStep, setCaptureStep] = useState('form');
  const [currentStudent, setCurrentStudent] = useState(null);

  // Bulk Upload Flow State: 'idle' -> 'uploading'
  const [uploadState, setUploadState] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const fileInputRef = useRef(null);

  const [searchParams] = useSearchParams();
  const reEnrollId = searchParams.get('student');

  const tabs = [
    { id: 'webcam', label: 'Webcam Capture', icon: Camera },
    { id: 'upload', label: 'Bulk Upload', icon: UploadCloud }
  ];

  const [studentsList, setStudentsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    // If a specific student ID is passed to re-enroll and students list is loaded
    if (reEnrollId && studentsList.length > 0 && captureStep === 'form') {
      const studentToReEnroll = studentsList.find(
        s => s.id === reEnrollId || s.student_id === reEnrollId
      );
      if (studentToReEnroll) {
        setCurrentStudent(studentToReEnroll);
        setCaptureStep('active_camera');
        setActiveTab('webcam');
      }
    }
  }, [reEnrollId, studentsList, captureStep]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/students');
      setStudentsList(res.data);
    } catch (error) {
      console.error("Failed to fetch students:", error);
      setStudentsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = studentsList.filter(student => {
    const q = searchQuery.toLowerCase();
    return (
      student.name?.toLowerCase().includes(q) ||
      student.student_id?.toLowerCase().includes(q) ||
      student.roll_no?.toLowerCase().includes(q) ||
      student.department?.toLowerCase().includes(q)
    );
  });

  const handleRegistrationSubmit = (createdStudent) => {
    // createdStudent is the DB response from POST /students (has real UUID id)
    setCurrentStudent(createdStudent);
    setCaptureStep('active_camera');
    fetchStudents();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile({ name: file.name });
    setUploadState('uploading');
    setBulkResult(null);

    if (file.name.endsWith('.csv')) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/students/bulk-import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setBulkResult(res.data);
        toast.success(`Imported ${res.data.imported} students`);
        fetchStudents();
      } catch (err) {
        const msg = err.response?.data?.detail || 'Bulk import failed';
        toast.error(msg);
        setUploadState('idle');
      }
    } else {
      toast.error('Only .csv files are supported for bulk import. Use webcam capture for individual enrollment.');
      setUploadState('idle');
    }
  };

  const completeEnrollment = async (images) => {
    const loadingToast = toast.loading(`Enrolling ${currentStudent?.name}...`);
    try {
      const res = await api.post(
        `/students/${currentStudent.id}/enroll-face`,
        { images }
      );
      const data = res.data;
      if (data.status === 'error') {
        toast.error(data.message, { id: loadingToast });
        if (data.errors?.length) {
          data.errors.slice(0, 3).forEach(e => toast.error(e));
        }
        return;
      }
      toast.success(
        `${currentStudent?.name} enrolled! ${data.samples_accepted} samples accepted.`,
        { id: loadingToast }
      );
      if (data.samples_rejected > 0) {
        toast(`${data.samples_rejected} frames rejected (quality checks).`, { icon: '⚠️' });
      }
      setCaptureStep('form');
      setCurrentStudent(null);
      fetchStudents();
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || 'Enrollment failed';
      toast.error(msg, { id: loadingToast });
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <PageHeader 
        title="Face Enrollment" 
        description="Register structural facial data for students to enable AI attendance tracking."
        actions={
          <Button variant="outline" icon={FileText} onClick={() => toast.success('Exporting student roster data...')}>
            Export Roster
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-indigo-50/50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-50">
             <Users className="w-7 h-7" />
           </div>
           <div>
             <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Database Total</p>
             <p className="text-3xl font-semibold text-slate-900 mt-1 tracking-tight">{studentsList.length}<span className="text-sm text-slate-400 font-medium ml-2">Students</span></p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-emerald-50/50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-50">
             <CheckCircle2 className="w-7 h-7" />
           </div>
           <div>
             <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Enrollment Rate</p>
             <p className="text-3xl font-semibold text-slate-900 mt-1 tracking-tight">
               {studentsList.length > 0 ? Math.round((studentsList.filter(s => s.embedding_status === 'enrolled').length / studentsList.length) * 100) : 0}%
             </p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5">
           <div className="w-14 h-14 bg-blue-50/50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-50">
             <Loader2 className="w-7 h-7" />
           </div>
           <div>
             <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Sync Status</p>
             <p className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Up to Date</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Capture/Upload Interface */}
        <div className="lg:col-span-2 space-y-6">
          <Card noPadding className="rounded-[32px] overflow-hidden border-slate-100/60">
            <div className="px-6 pt-5 border-b border-slate-100 bg-white">
              <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(tab) => {
                setActiveTab(tab);
                if (tab === 'webcam') setCaptureStep('form');
                if (tab === 'upload') setUploadState('idle');
              }} />
            </div>
            
            <CardContent className="min-h-[500px] flex items-center justify-center bg-slate-50/50">
              {activeTab === 'webcam' && captureStep === 'form' && (
                <div className="w-full flex justify-center py-6">
                   <StudentRegistrationForm 
                     onSubmit={handleRegistrationSubmit} 
                     existingIds={studentsList.map(s => s.student_id)}
                   />
                </div>
              )}

              {activeTab === 'webcam' && captureStep === 'active_camera' && (
                <div className="w-full h-full flex flex-col py-6">
                  <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto w-full px-6">
                     <div className="text-left">
                       <h3 className="font-bold text-slate-800 text-lg">{currentStudent?.name}</h3>
                       <p className="text-slate-500 text-sm">{currentStudent?.studentId} • {currentStudent?.rollNo}</p>
                     </div>
                     <Badge variant="primary">Step 2: Capture</Badge>
                  </div>
                  
                  <WebcamCapture 
                     onCancel={() => {
                        setCaptureStep('form');
                        setCurrentStudent(null);
                     }}
                     onCaptureComplete={completeEnrollment}
                  />
                  <div className="max-w-2xl mx-auto w-full px-6 mt-4 opacity-50 hover:opacity-100 transition-opacity flex justify-center">
                    <Button variant="ghost" size="sm" onClick={() => {
                        toast.error(`Registration failed for ${currentStudent?.name}. Face not detected clearly.`);
                        setCaptureStep('form');
                    }}>Simulate Flow Failure</Button>
                  </div>
                </div>
              )}

              {/* Bulk Upload Flow */}
              {activeTab === 'upload' && (
                <div className="text-center w-full max-w-lg py-12">
                  
                  {uploadState === 'idle' && (
                    <>
                      <input 
                        type="file" 
                        accept=".csv"
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                      />
                      <div 
                        onClick={() => fileInputRef.current.click()}
                        className="border-2 border-dashed border-slate-300 rounded-3xl p-12 bg-white hover:border-[#1E5BF0] hover:bg-[#EBF3FF]/40 transition-all cursor-pointer group flex flex-col items-center shadow-sm"
                      >
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 text-slate-400 rounded-full flex items-center justify-center group-hover:text-[#1E5BF0] group-hover:bg-white group-hover:border-blue-100 group-hover:shadow-md transition-all mb-5">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2 text-xl">Bulk Import Students</h3>
                        <p className="text-slate-500 text-[14px] leading-relaxed mb-8 max-w-[280px]">
                          Upload a <span className="font-medium text-slate-700">.CSV</span> file with columns: <span className="font-medium text-slate-700">name, roll_no, student_id, email, department</span>
                        </p>
                        <Button variant="secondary" className="pointer-events-none">
                          Browse Local Files
                        </Button>
                      </div>
                    </>
                  )}

                  {uploadState === 'uploading' && !bulkResult && (
                    <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-50 text-[#1E5BF0] rounded-full flex items-center justify-center mb-6 relative">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-2 text-lg">Importing Students...</h3>
                      <p className="text-slate-500 text-sm mb-6 truncate max-w-[250px]">
                        {selectedFile?.name || 'students.csv'}
                      </p>
                    </div>
                  )}

                  {uploadState === 'uploading' && bulkResult && (
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-left">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-5">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                           <FileArchive className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">Import Complete</h3>
                          <p className="text-slate-500 text-sm">{selectedFile?.name}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-slate-700">Students Imported</span>
                          </div>
                          <span className="font-bold text-slate-900">{bulkResult.imported}</span>
                        </div>
                        {bulkResult.skipped > 0 && (
                          <div className="flex items-center justify-between p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                            <div className="flex items-center gap-3">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-medium text-slate-700">Skipped / Duplicates</span>
                            </div>
                            <span className="font-bold text-amber-600">{bulkResult.skipped}</span>
                          </div>
                        )}
                        {bulkResult.errors?.slice(0, 3).map((err, i) => (
                          <p key={i} className="text-xs text-red-500 pl-4 border-l-2 border-red-200">{err}</p>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => { setUploadState('idle'); setBulkResult(null); }}>Upload Another</Button>
                        <Button variant="primary" className="flex-1" onClick={() => { setUploadState('idle'); setBulkResult(null); setActiveTab('webcam'); fetchStudents(); }}>Done</Button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Quick Gallery / Stats (Refined) */}
        <div className="space-y-6">
          <Card className="rounded-[28px] border-slate-100">
            <CardHeader 
              title="Requirements" 
              className="px-0 pt-0 pb-4 border-b border-slate-100" 
            />
            <div className="space-y-4 mt-6 text-sm text-slate-600">
              <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                 <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-[10px] font-bold">1</div>
                 <p className="leading-relaxed">Students must look directly at the camera with good lighting.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                 <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-[10px] font-bold">2</div>
                 <p className="leading-relaxed">Remove glasses and masks for the structural face map.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                 <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-[10px] font-bold">3</div>
                 <p className="leading-relaxed">Allow processing time before testing live attendance.</p>
              </div>
            </div>
          </Card>
          
          <div className="bg-gradient-to-br from-[#1E5BF0] to-[#0A45D1] rounded-[28px] p-6 text-white overflow-hidden relative shadow-lg shadow-blue-500/20">
             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
             <div className="relative z-10">
                <h4 className="font-semibold text-lg mb-2">Pro Tip</h4>
                <p className="text-blue-100 text-sm leading-relaxed mb-4">Batch uploads with clear folder naming (Student-ID) significantly improve sync accuracy.</p>
                <div className="h-1 bg-white/20 rounded-full w-12" />
             </div>
          </div>
        </div>
      </div>

      <Card noPadding>
        <CardHeader 
          title="Student Registry & Embeddings" 
          subtitle="View all enrolled students and their facial recognition status."
          action={
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search ID, Name, Roll No, Course..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
              />
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          }
        />
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-y border-slate-100 text-[13px] font-semibold text-slate-500 uppercase tracking-widest leading-relaxed">
                <th className="px-6 py-4 font-semibold">Student</th>
                <th className="px-6 py-4 font-semibold">Student ID</th>
                <th className="px-6 py-4 font-semibold">Roll No</th>
                <th className="px-6 py-4 font-semibold text-center">Course</th>
                <th className="px-6 py-4 font-semibold">Department</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Embeddings</th>
                <th className="px-6 py-4 font-semibold">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                   <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                     Loading registry...
                   </td>
                </tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EBF3FF] text-[#1E5BF0] font-bold flex items-center justify-center text-xs shadow-sm border border-blue-100">
                        {student.image || student.name?.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-800">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.student_id}</td>
                  <td className="px-6 py-4 text-slate-600">{student.roll_no}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-tight">
                       {student.department || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{student.department || 'Unknown'}</td>
                  <td className="px-6 py-4">
                     <Badge variant={student.embedding_status === 'enrolled' ? 'success' : 'warning'}>
                       {student.embedding_status === 'enrolled' ? 'Enrolled' : 'Pending'}
                     </Badge>
                  </td>
                  <td className="px-6 py-4">
                     <Badge variant="primary">{student.embedding_status}</Badge>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                     {student.enrollment_samples > 0 ? `${student.enrollment_samples} samples` : '—'}
                  </td>
                </tr>
              ))}
              
              {!isLoading && filteredStudents.length === 0 && studentsList.length > 0 && (
                <tr>
                   <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                     No students matched your search for "{searchQuery}".
                   </td>
                </tr>
              )}
              
              {!isLoading && studentsList.length === 0 && (
                <tr>
                   <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                     No students enrolled yet. Register a student above to see them here.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tailwind specific one-off keyframes for progress bar */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}} />
    </div>
  );
}
