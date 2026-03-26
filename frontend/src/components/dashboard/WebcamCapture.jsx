import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

export default function WebcamCapture({ onCaptureComplete, onCancel }) {
  const webcamRef = useRef(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const TARGET_SAMPLES = 5;

  const capture = useCallback(() => {
    if (capturedImages.length >= TARGET_SAMPLES) return;

    setIsCapturing(true);
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (imageSrc) {
      setCapturedImages((prev) => [...prev, imageSrc]);
    }

    setTimeout(() => setIsCapturing(false), 200); // Visual flash delay
  }, [webcamRef, capturedImages.length]);

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
      
      {/* Camera Error State */}
      {cameraError && (
        <div className="w-full p-4 mb-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">Cannot access the camera. Please ensure you have granted browser permissions and that no other application is using it.</p>
        </div>
      )}

      {/* Viewfinder Container */}
      <div className="relative overflow-hidden bg-slate-900 rounded-2xl w-full aspect-[4/3] shadow-inner border-4 border-slate-100 mb-6">
        
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMediaError={() => setCameraError(true)}
          className={`w-full h-full object-cover transition-opacity duration-200 ${isCapturing ? 'opacity-50' : 'opacity-100'} ${cameraError ? 'hidden' : 'block'}`}
          mirrored={true}
        />

        {/* Bounding Box Guide Overlay */}
        {!cameraError && (
          <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
            {/* Outline Box */}
            <div className={`w-48 h-64 border-2 border-dashed rounded-[40px] transition-colors duration-300 ${capturedImages.length >= TARGET_SAMPLES ? 'border-emerald-400 bg-emerald-400/10' : 'border-blue-400 bg-blue-400/10'}`}>
            </div>
            
            {/* Feedback/Instructions */}
            <div className="absolute bottom-6 left-0 w-full text-center">
               <span className="bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full text-white text-xs font-medium tracking-wide border border-white/10 shadow-sm">
                 {capturedImages.length >= TARGET_SAMPLES ? 'Capture Complete' : 'Position face inside the frame'}
               </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls & Mini Gallery */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Thumbnails */}
        <div className="flex gap-2.5 flex-wrap">
          {[...Array(TARGET_SAMPLES)].map((_, idx) => (
            <div 
              key={idx} 
              className={`w-12 h-12 rounded-lg border-2 overflow-hidden flex items-center justify-center bg-slate-50 transition-colors ${capturedImages[idx] ? 'border-emerald-500' : 'border-slate-200 border-dashed'}`}
            >
              {capturedImages[idx] ? (
                <img src={capturedImages[idx]} alt={`Sample ${idx+1}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-300 text-xs font-bold">{idx + 1}</span>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isCapturing}>
            Cancel
          </Button>
          
          {capturedImages.length < TARGET_SAMPLES ? (
             <Button variant="primary" icon={Camera} onClick={capture} disabled={cameraError}>
               Take Photo ({capturedImages.length}/{TARGET_SAMPLES})
             </Button>
          ) : (
             <Button variant="success" className="bg-emerald-600 text-white hover:bg-emerald-700" icon={CheckCircle2} onClick={handleFinish}>
               Finish Enrollment
             </Button>
          )}
        </div>
      </div>
    </div>
  );
}
