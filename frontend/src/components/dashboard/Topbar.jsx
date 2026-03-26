import { PanelLeft } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="h-[72px] bg-white flex items-center justify-between px-6 sticky top-0 z-10 w-full border-b border-transparent shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      {/* Left side: Toggle & Breadcrumb */}
      <div className="flex items-center gap-4">
        <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors">
          <PanelLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <span className="text-[17px] font-semibold text-slate-800 tracking-tight">
          Dashboard
        </span>
      </div>

      {/* Right Side: Profile Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <button className="flex rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E5BF0] transition-shadow">
            <span className="sr-only">Open user menu</span>
            <div className="h-9 w-9 rounded-full bg-[#EBF3FF] flex items-center justify-center text-[#1E5BF0] font-bold text-sm tracking-wide">
              AR
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
