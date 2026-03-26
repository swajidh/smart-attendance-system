import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, Users, CheckCircle2, FileArchive, Loader2, AlertCircle, FileText } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import StudentRegistrationForm from '../../components/dashboard/StudentRegistrationForm';
import WebcamCapture from '../../components/dashboard/WebcamCapture';
import toast from 'react-hot-toast';

export default function FaceEnrollment() {
  const [activeTab, setActiveTab] = useState('webcam');
  // Capture Flow State: 'form' -> 'active_camera'
  const [captureStep, setCaptureStep] = useState('form');
  const [currentStudent, setCurrentStudent] = useState(null);

  // Bulk Upload Flow State: 'idle' -> 'uploading' -> 'review'
  const [uploadState, setUploadState] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const tabs = [
    { id: 'webcam', label: 'Webcam Capture', icon: Camera },
    { id: 'upload', label: 'Bulk Upload', icon: UploadCloud }
  ];

  const loadSavedStudents = () => {
    const saved = localStorage.getItem('smart_attendance_enrolled_students');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  };

  // Dynamic state for enrolled students table, reading from localStorage
  const [studentsList, setStudentsList] = useState(loadSavedStudents);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = studentsList.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRegistrationSubmit = (formData) => {
    setCurrentStudent(formData);
    setCaptureStep('active_camera');
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const isMultiple = files.length > 1;
      const fileLabel = isMultiple ? `${files.length} images/files selected` : files[0].name;
      
      setSelectedFile({ name: fileLabel });
      setUploadState('uploading');
      
      setTimeout(() => {
        setUploadState('review');
      }, 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      <PageHeader 
        title="Face Enrollment" 
        description="Register structural facial data for students to enable AI attendance tracking."
        actions={
          <Button variant="outline" icon={FileText}>
            Export Roster
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Capture/Upload Interface */}
        <div className="lg:col-span-2 space-y-6">
          <Card noPadding>
            <div className="px-5 pt-4 border-b border-slate-100 bg-white">
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
                     existingIds={studentsList.map(s => s.studentId)}
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
                     onCancel={() => setCaptureStep('form')}
                     onCaptureComplete={(images) => {
                       // Successfully captured, notify user and reset form
                       toast.success(`Successfully enrolled student ${currentStudent?.name}!`);
                       
                       // Add to dynamic table state!
                       const newStudent = {
                         id: Math.random().toString(36).substr(2, 9),
                         name: currentStudent.name,
                         studentId: currentStudent.studentId,
                         rollNo: currentStudent.rollNo,
                         department: currentStudent.department,
                         status: 'Enrolled',
                         embeddings: 'Generated',
                         attendance: '-',
                         image: currentStudent.name.substring(0,2).toUpperCase()
                       };
                       
                       const updatedList = [newStudent, ...studentsList];
                       setStudentsList(updatedList);
                       localStorage.setItem('smart_attendance_enrolled_students', JSON.stringify(updatedList));
                       
                       setCaptureStep('form');
                       setCurrentStudent(null);
                     }}
                  />
                  {/* Provide a simulate failure button during dev so you can test error states */}
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
                        accept=".zip,.rar,.7z,.jpg,.jpeg,.png" 
                        multiple
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
                        <h3 className="font-bold text-slate-800 mb-2 text-xl">Upload Class Batch</h3>
                        <p className="text-slate-500 text-[14px] leading-relaxed mb-8 max-w-[280px]">
                          Upload high-quality <span className="font-medium text-slate-700">.JPG / .PNG</span> images directly, or a <span className="font-medium text-slate-700">.ZIP</span> folder mapped to Student IDs.
                        </p>
                        <Button variant="secondary" className="pointer-events-none">
                          Browse Local Files
                        </Button>
                      </div>
                    </>
                  )}

                  {uploadState === 'uploading' && (
                    <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-50 text-[#1E5BF0] rounded-full flex items-center justify-center mb-6 relative">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                      <h3 className="font-bold text-slate-800 mb-2 text-lg">Extracting & Processing...</h3>
                      <p className="text-slate-500 text-sm mb-6 truncate max-w-[250px]">
                        {selectedFile?.name || 'batch-upload.zip'}
                      </p>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                         <div className="bg-[#1E5BF0] h-2 rounded-full animate-[progress_3s_ease-in-out_forwards]"></div>
                      </div>
                      <p className="text-slate-400 text-xs text-left w-full">Preserving raw image quality for embeddings</p>
                    </div>
                  )}

                  {uploadState === 'review' && (
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-left">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-5">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                           <FileArchive className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg">Batch Processed</h3>
                          <p className="text-slate-500 text-sm">{selectedFile?.name} • 14MB</p>
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-slate-700">Valid Dirs (Matched IDs)</span>
                          </div>
                          <span className="font-bold text-slate-900">24</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-lg">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-slate-700">Invalid Dirs / No Faces</span>
                          </div>
                          <span className="font-bold text-red-600">2</span>
                        </div>
                        
                        <div className="pl-4 border-l-2 border-red-200 ml-4 space-y-1">
                           <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">STU-XYZ/</span> - No faces detected in images</p>
                           <p className="text-xs text-slate-500"><span className="font-medium text-slate-700">Unknown_Folder/</span> - ID not recognized in DB</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setUploadState('idle')}>Upload Another</Button>
                        <Button variant="primary" className="flex-1 border border-blue-600" onClick={() => {
                          const mockBulk = Array.from({ length: 24 }).map((_, i) => ({
                            id: Math.random().toString(36).substr(2, 9),
                            name: `Batch Student ${i+1}`,
                            studentId: `STU-1${(i+1).toString().padStart(2, '0')}`,
                            rollNo: `CS-21-1${(i+1).toString().padStart(2, '0')}`,
                            department: 'Computer Science',
                            status: 'Enrolled',
                            embeddings: 'Generated',
                            attendance: '-',
                            image: 'BS'
                          }));
                          const updatedList = [...mockBulk, ...studentsList];
                          setStudentsList(updatedList);
                          localStorage.setItem('smart_attendance_enrolled_students', JSON.stringify(updatedList));
                          toast.success('Successfully synchronized 24 student embeddings from bulk upload!');
                          setUploadState('idle');
                          setActiveTab('webcam');
                        }}>Sync 24 Embeddings</Button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Quick Gallery / Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Enrollment Overview" className="px-0 pt-0 pb-4" />
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Database</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{studentsList.length}<span className="text-base font-semibold text-slate-400 ml-1">Total</span></p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-2xl shadow-sm">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader 
              title="Requirements" 
              className="px-0 pt-0 pb-4" 
            />
            <div className="space-y-3 mt-2 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                 <p>Students must look directly at the camera with good lighting.</p>
              </div>
              <div className="flex items-start gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                 <p>Remove glasses and masks for the structural face map.</p>
              </div>
              <div className="flex items-start gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                 <p>Allow processing time before testing live attendance.</p>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* NEW: Full Width Datatable for Enrolled Registry (FEM-05) */}
      <Card noPadding>
        <CardHeader 
          title="Student Registry & Embeddings" 
          subtitle="View all enrolled students and their facial recognition status."
          action={
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search ID, Name, Roll No..." 
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
                <th className="px-6 py-4 font-semibold">Department</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Embeddings</th>
                <th className="px-6 py-4 font-semibold">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#EBF3FF] text-[#1E5BF0] font-bold flex items-center justify-center text-xs shadow-sm border border-blue-100">
                        {student.image}
                      </div>
                      <span className="font-semibold text-slate-800">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{student.studentId}</td>
                  <td className="px-6 py-4 text-slate-600">{student.rollNo}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{student.department}</td>
                  <td className="px-6 py-4">
                     <Badge variant="success">Enrolled</Badge>
                  </td>
                  <td className="px-6 py-4">
                     <Badge variant="primary">{student.embeddings}</Badge>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                     {student.attendance}
                  </td>
                </tr>
              ))}
              
              {filteredStudents.length === 0 && studentsList.length > 0 && (
                <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                     No students matched your search for "{searchQuery}".
                   </td>
                </tr>
              )}
              
              {studentsList.length === 0 && (
                <tr>
                   <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
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
