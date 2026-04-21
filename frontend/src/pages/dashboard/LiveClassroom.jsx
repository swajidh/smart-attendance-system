import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import Card, { CardContent } from '../../components/ui/Card';
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LiveClassroom() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [faces, setFaces] = useState([]);
  
  // Mock roster for APM-05 and APM-06
  const [roster, setRoster] = useState([
    { id: 'STU-1001', name: 'Ali Hamza', status: 'Absent', confidence: 0 },
    { id: 'STU-1002', name: 'Ayesha Bibi', status: 'Absent', confidence: 0 },
    { id: 'STU-1003', name: 'Zainab Ahmed', status: 'Absent', confidence: 0 },
    { id: 'STU-1004', name: 'Bilal Khan', status: 'Absent', confidence: 0 },
  ]);

  const [stats, setStats] = useState({ present: 0, unknown: 0 });
  const [isConnected, setIsConnected] = useState(false);

  // Handle manual override
  const toggleAttendance = (studentId) => {
    setRoster(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, status: student.status === 'Present' ? 'Absent' : 'Present' }
        : student
    ));
  };

  // Initialize WebSocket connection
  useEffect(() => {
    // Connect to the FastAPI WebSocket endpoint
    const ws = new WebSocket('ws://localhost:8000/api/v1/attendance/ws/detect');
    
    ws.onopen = () => {
      console.log('Connected to ML backend');
      setIsConnected(true);
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'success') {
        setFaces(data.faces);
        
        let unknownCount = 0;
        
        // Auto-mark present based on face ID
        setRoster(prevRoster => {
          let updated = [...prevRoster];
          data.faces.forEach(face => {
             if (face.status === 'Present' && face.studentId) {
                // Find in roster and mark present
                const index = updated.findIndex(s => s.id === face.studentId);
                if (index !== -1 && updated[index].status !== 'Present') {
                   updated[index] = { ...updated[index], status: 'Present', confidence: face.confidence };
                }
             } else if (face.status === 'Unknown') {
                unknownCount++;
             }
          });
          return updated;
        });

        setStats(prev => ({ ...prev, unknown: unknownCount }));
        setIsProcessing(false);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from ML backend');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  // Update Present count when roster changes
  useEffect(() => {
    const presentCount = roster.filter(s => s.status === 'Present').length;
    setStats(prev => ({ ...prev, present: presentCount }));
  }, [roster]);

  // Frame processing loop
  const captureAndSendFrame = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (isProcessing) return; // Wait for the previous frame to finish

    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setIsProcessing(true);
      wsRef.current.send(imageSrc);
    }
  }, [isProcessing]);

  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(captureAndSendFrame, 200); // 5 FPS to keep load light
    }
    return () => clearInterval(interval);
  }, [captureAndSendFrame, isConnected]);

  // Draw bounding boxes
  useEffect(() => {
    if (!canvasRef.current || !webcamRef.current || !webcamRef.current.video) return;

    const canvas = canvasRef.current;
    const video = webcamRef.current.video;
    const ctx = canvas.getContext('2d');

    // Match canvas dimensions to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach(face => {
      // Calculate absolute positions based on percentages
      const x = (face.x / 100) * canvas.width;
      const y = (face.y / 100) * canvas.height;
      const width = (face.width / 100) * canvas.width;
      const height = (face.height / 100) * canvas.height;

      // Draw bounding box
      ctx.lineWidth = 3;
      if (face.status === 'Present') {
        ctx.strokeStyle = '#22c55e'; // Green
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      } else {
        ctx.strokeStyle = '#ef4444'; // Red
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      }

      // Box
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 8);
      ctx.stroke();
      ctx.fill();

      // Label
      ctx.fillStyle = face.status === 'Present' ? '#22c55e' : '#ef4444';
      const labelText = face.status === 'Present' ? `✓ ${face.studentId}` : '⚠ Unknown';
      
      // Background for text
      ctx.fillRect(x, y - 30, ctx.measureText(labelText).width + 20, 24);
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(labelText, x + 10, y - 13);
    });
  }, [faces]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Classroom</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time attendance tracking via facial recognition</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {isConnected ? 'Camera Active & ML Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Camera Feed */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden border-slate-100 shadow-sm relative rounded-[24px]">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                LIVE
              </div>
            </div>

            <CardContent className="p-0 relative bg-slate-950 aspect-video flex items-center justify-center overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Real-time Stats & Roster */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <Card className="border-emerald-100 shadow-sm rounded-2xl bg-emerald-50/30">
               <CardContent className="p-4">
                 <div className="flex items-center gap-2 mb-1">
                   <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                     <CheckCircle2 className="w-4 h-4" />
                   </div>
                   <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest">Present</p>
                 </div>
                 <p className="text-2xl font-bold text-emerald-700 ml-1">{stats.present}</p>
               </CardContent>
             </Card>

             <Card className="border-rose-100 shadow-sm rounded-2xl bg-rose-50/30">
               <CardContent className="p-4">
                 <div className="flex items-center gap-2 mb-1">
                   <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                     <AlertCircle className="w-4 h-4" />
                   </div>
                   <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-widest">Unknown</p>
                 </div>
                 <p className="text-2xl font-bold text-rose-700 ml-1">{stats.unknown}</p>
               </CardContent>
             </Card>
          </div>

          <Card className="border-slate-100 shadow-sm rounded-[24px]">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-[24px]">
                <h3 className="font-semibold text-slate-800">Session Roster</h3>
                <p className="text-xs text-slate-500">Live attendance status</p>
             </div>
             <div className="max-h-[300px] overflow-y-auto p-2">
                {roster.map(student => (
                   <div key={student.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                      <div>
                         <p className="font-semibold text-sm text-slate-800">{student.name}</p>
                         <p className="text-xs text-slate-400">{student.id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={`text-xs font-semibold px-2 py-1 rounded-md ${student.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {student.status}
                         </span>
                         {/* Manual Override Toggle */}
                         <button 
                            onClick={() => toggleAttendance(student.id)}
                            className={`w-10 h-6 rounded-full relative transition-colors ${student.status === 'Present' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                         >
                            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${student.status === 'Present' ? 'translate-x-4' : 'translate-x-0'}`} />
                         </button>
                      </div>
                   </div>
                ))}
             </div>
          </Card>
          
          <div className="pt-2">
            <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-all shadow-sm">
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
