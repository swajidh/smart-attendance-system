/** Shared attention score color bands — matches backend/ml/attention_scorer.py */

export const ATTENTION_HIGH = 70;
export const ATTENTION_LOW = 40;

export function getAttentionLevel(score) {
  if (score == null || Number.isNaN(Number(score))) return 'unknown';
  const s = Number(score);
  if (s >= ATTENTION_HIGH) return 'high';
  if (s >= ATTENTION_LOW) return 'medium';
  return 'low';
}

export function getAttentionColorClass(score) {
  const level = getAttentionLevel(score);
  if (level === 'high') return 'text-emerald-700 bg-emerald-100';
  if (level === 'medium') return 'text-amber-700 bg-amber-100';
  if (level === 'low') return 'text-rose-700 bg-rose-100';
  return 'text-slate-500 bg-slate-100';
}

export default function AttentionBadge({ score, className = '' }) {
  const level = getAttentionLevel(score);
  const label = score != null && !Number.isNaN(Number(score)) ? Math.round(Number(score)) : '—';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${getAttentionColorClass(score)} ${className}`}>
      {label}{level !== 'unknown' ? '/100' : ''}
    </span>
  );
}
