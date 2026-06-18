import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function WebcamCapture({ onCaptureComplete, onCancel }) {
  const webcamRef = useRef(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [realtimeWarning, setRealtimeWarning] = useState(null);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);

  const TARGET_SAMPLES = 15;
  const guides = [
    "Look straight into the camera",
    "Turn your head slightly Left",
    "Turn your head slightly Right",
    "Tilt your head Up",
    "Tilt your head Down",
    "Smile naturally",
    "Neutral expression",
    "Blink your eyes",
    "Look at the top-left corner",
    "Look at the top-right corner",
    "Step slightly back",
    "Move slightly closer",
    "Tilt head to the side",
    "Final front view",
    "Hold still for calibration"
  ];

  // Real-time quality polling — check every 2.5s while camera is live
  useEffect(() => {
    if (cameraError || capturedImages.length >= TARGET_SAMPLES) return;

    const interval = setInterval(async () => {
      if (!webcamRef.current || isCheckingQuality) return;
      const frame = webcamRef.current.getScreenshot();
      if (!frame) return;

      try {
        setIsCheckingQuality(true);
        const res = await api.post('/students/validate-frame', { image: frame });
        const { quality, message } = res.data;
        if (quality === 'ok' || quality === 'multiple_faces') {
          setRealtimeWarning(quality === 'multiple_faces' ? message : null);
        } else {
          setRealtimeWarning(message);
        }
      } catch {
        // silently ignore — don't surface network errors during live feed
        setRealtimeWarning(null);
      } finally {
        setIsCheckingQuality(false);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [cameraError, capturedImages.length, isCheckingQuality]);

  const capture = useCallback(async () => {
    if (capturedImages.length >= TARGET_SAMPLES || !webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    if (realtimeWarning) {
      toast.error(`Cannot capture: ${realtimeWarning}. Please adjust.`);
      return;
    }

    // Final quality check on this exact frame before accepting
    try {
      const res = await api.post('/students/validate-frame', { image: imageSrc });
      const { quality, message } = res.data;
      if (quality !== 'ok') {
        toast.error(`Frame rejected: ${message}`);
        return;
      }
    } catch {
      // If quality check endpoint is down, allow capture anyway
    }

    setIsCapturing(true);
    setCapturedImages(prev => [...prev, imageSrc]);
    setTimeout(() => setIsCapturing(false), 150);
  }, [webcamRef, capturedImages.length, realtimeWarning]);

  const handleFinish = () => {
    if (capturedImages.length >= TARGET_SAMPLES) {
      onCaptureComplete(capturedImages);
    }
  };

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: "user"
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      
      {/* Variation Guide Prompt */}
      {!cameraError && capturedImages.length < TARGET_SAMPLES && (
        <div className="w-full mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                   {capturedImages.length + 1}
                 </div>
                 <p className="font-semibold">{guides[capturedImages.length]}</p>
              </div>
              <Badge className="bg-white/20 text-white border-transparent">Target: 15 Samples</Badge>
           </div>
        </div>
      )}

      {/* Camera Viewfinder */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[32px] w-full aspect-[4/3] shadow-inner border-4 border-slate-100 mb-6 group">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMediaError={() => setCameraError(true)}
          className={`w-full h-full object-cover transition-opacity duration-200 ${isCapturing ? 'opacity-50' : 'opacity-100'} ${cameraError ? 'hidden' : 'block'}`}
          mirrored={true}
        />

        {/* Realtime Feedback Overlay */}
        {realtimeWarning && capturedImages.length < TARGET_SAMPLES && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 animate-in fade-in zoom-in duration-200">
             <div className="bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-red-400">
               <AlertTriangle className="w-4 h-4" />
               <span className="text-sm font-bold">{realtimeWarning}</span>
             </div>
          </div>
        )}

        {/* Guides Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <div className={`w-56 h-72 border-2 border-dashed rounded-[60px] transition-all duration-300 ${capturedImages.length >= TARGET_SAMPLES ? 'border-emerald-400 bg-emerald-400/10' : realtimeWarning ? 'border-red-400/50 bg-red-500/10' : 'border-white/30 group-hover:border-white/50'}`} />
        </div>

        {/* Progress Float */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
           <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-3">
              <span className="text-blue-400">{capturedImages.length} / 15</span>
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                 <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${(capturedImages.length / 15) * 100}%` }} />
              </div>
           </div>
        </div>

        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <p className="text-white/60 text-sm">Camera unavailable</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex gap-1.5 flex-wrap max-w-sm">
          {[...Array(TARGET_SAMPLES)].map((_, idx) => (
            <div 
              key={idx} 
              className={`w-8 h-8 rounded-md border overflow-hidden flex items-center justify-center bg-slate-50 transition-colors ${capturedImages[idx] ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 border-dashed'}`}
            >
              {capturedImages[idx] ? (
                <img src={capturedImages[idx]} alt={`Sample ${idx+1}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-300 text-[10px] font-bold">{idx + 1}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isCapturing}>Cancel</Button>
          {capturedImages.length < TARGET_SAMPLES ? (
             <Button
               variant="primary"
               icon={Camera}
               onClick={capture}
               disabled={cameraError || !!realtimeWarning || isCapturing}
             >
               Capture Sample
             </Button>
          ) : (
             <Button
               variant="success"
               className="bg-emerald-600 text-white hover:bg-emerald-700"
               icon={CheckCircle2}
               onClick={handleFinish}
             >
               Sync & Enroll
             </Button>
          )}
        </div>
      </div>
    </div>
  );
}
