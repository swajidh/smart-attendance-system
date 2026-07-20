import { Loader2, ScanEye } from 'lucide-react';
import Button from '../ui/Button';

export default function ExamCalibrationModal({
  open,
  secondsLeft,
  onFinalize,
  isFinalizing,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-8 animate-in zoom-in duration-200 text-center">
        <div className="flex justify-end mb-2">
          <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mx-auto -mt-2">
            <ScanEye className="w-5 h-5" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">Calibrating Exam Hall</h2>
        <p className="text-slate-500 text-sm mb-6">
          Ask students to look at their exam paper. The system captures baseline head pose for this room.
        </p>
        <div className="text-5xl font-bold text-rose-600 tabular-nums mb-2">{secondsLeft}s</div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
          Calibration in progress
        </p>
        <Button
          variant="primary"
          className="w-full rounded-xl"
          onClick={onFinalize}
          disabled={isFinalizing || secondsLeft > 5}
          isLoading={isFinalizing}
        >
          Finish Calibration &amp; Start Monitoring
        </Button>
        {secondsLeft > 5 && (
          <p className="text-xs text-slate-400 mt-3">
            Please wait {secondsLeft - 5} more second{secondsLeft - 5 === 1 ? '' : 's'} before finishing early
          </p>
        )}
      </div>
    </div>
  );
}
