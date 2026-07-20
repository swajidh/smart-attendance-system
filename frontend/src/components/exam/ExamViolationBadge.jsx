import Badge from '../ui/Badge';

const TYPE_CONFIG = {
  phone_detected: { label: 'Phone', variant: 'danger' },
  gaze_away: { label: 'Gaze Away', variant: 'warning' },
  multiple_faces: { label: 'Multiple Faces', variant: 'danger' },
  face_absent: { label: 'Face Absent', variant: 'warning' },
  unauthorized_object: { label: 'Unauthorized Object', variant: 'warning' },
  smartwatch_suspected: { label: 'Watch Suspected', variant: 'default' },
  unknown_face: { label: 'Unknown Face', variant: 'default' },
};

export const EXAM_SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-rose-700 bg-rose-100 border-rose-200' },
  high: { label: 'High', color: 'text-orange-700 bg-orange-100 border-orange-200' },
  medium: { label: 'Medium', color: 'text-amber-700 bg-amber-100 border-amber-200' },
  low: { label: 'Low', color: 'text-slate-600 bg-slate-100 border-slate-200' },
};

export default function ExamViolationBadge({ type, severity, className = '' }) {
  if (severity && EXAM_SEVERITY_CONFIG[severity]) {
    const sev = EXAM_SEVERITY_CONFIG[severity];
    return (
      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${sev.color} ${className}`}>
        {sev.label}
      </span>
    );
  }

  const cfg = TYPE_CONFIG[type] || {
    label: type?.replace(/_/g, ' ') || 'Violation',
    variant: 'default',
  };
  return (
    <Badge variant={cfg.variant} className={className}>
      {cfg.label}
    </Badge>
  );
}
