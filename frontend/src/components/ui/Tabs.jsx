import React from 'react';

export default function Tabs({ tabs, activeTab, onTabChange, className = '' }) {
  return (
    <div className={`border-b border-slate-200 ${className}`}>
      <nav className="-mb-px flex space-x-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-medium text-[14px] transition-colors
              ${activeTab === tab.id
                ? 'border-[#1E5BF0] text-[#1E5BF0]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}
