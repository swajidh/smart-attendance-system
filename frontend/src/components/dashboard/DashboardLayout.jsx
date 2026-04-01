import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex overflow-hidden font-sans text-slate-800">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <div className={`flex-1 transition-all duration-300 flex flex-col h-screen ${isSidebarCollapsed ? 'ml-0' : 'ml-[240px]'}`}>
        <Topbar onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
