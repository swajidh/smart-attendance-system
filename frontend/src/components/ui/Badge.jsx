import React from 'react';

export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/50",
    danger: "bg-red-50 text-red-700 border border-red-200/50",
    primary: "bg-[#EBF3FF] text-[#1E5BF0] border border-blue-200/50",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
