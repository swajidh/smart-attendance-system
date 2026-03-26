import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#F8F9FC] flex overflow-hidden font-sans text-slate-800">
      <Sidebar />
      <div className="flex-1 ml-[240px] flex flex-col h-screen">
        <Topbar />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
