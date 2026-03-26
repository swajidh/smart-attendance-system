import React, { forwardRef } from 'react';

const Select = forwardRef(({ label, options, error, helperText, className = '', id, ...props }, ref) => {
  const selectId = id || React.useId();
  
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`px-3.5 py-2.5 border rounded-xl text-[14.5px] bg-slate-50 border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E5BF0]/20 focus:border-[#1E5BF0] transition-all disabled:opacity-50 disabled:bg-slate-100 ${
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50/30' : ''
        }`}
        {...props}
      >
        <option value="" disabled className="text-slate-400">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-500 font-medium mt-0.5">{error}</p>}
      {!error && helperText && <p className="text-sm text-slate-500 mt-0.5">{helperText}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
