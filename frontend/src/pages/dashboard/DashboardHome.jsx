import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Eye, 
  Users, 
  BookOpen, 
  TrendingUp, 
  ArrowRight,
  Play
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function DashboardHome() {
  const navigate = useNavigate();

  const stats = [
    { name: 'Total Students', value: '124', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Active Courses', value: '6', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Avg Attendance', value: '88%', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, Instructor</h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your classes today.</p>
        </div>
        <Button 
          variant="primary" 
          icon={Play} 
          onClick={() => navigate('/dashboard/live')}
          className="shadow-lg shadow-blue-500/20 py-6 px-8 rounded-2xl text-lg"
        >
          Start Live Session
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center border border-current/10`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-0.5">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
            <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">Ready to take attendance?</h3>
                <p className="text-blue-100 mb-6 max-w-md">Our AI system detects faces in real-time. Just open the live session and let the system handle the rest.</p>
                <button 
                  onClick={() => navigate('/dashboard/live')}
                  className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors"
                >
                  Go to Live Classroom <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <Eye className="absolute right-0 bottom-0 w-64 h-64 text-white/10 -mr-10 -mb-10" />
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-100 shadow-sm rounded-[24px]">
              <div className="p-6 border-b border-slate-50">
                <h4 className="font-bold text-slate-800">Recent Sessions</h4>
              </div>
              <CardContent className="p-0">
                <div className="p-8 text-center">
                  <p className="text-slate-400 text-sm">No recent sessions found.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm rounded-[24px]">
              <div className="p-6 border-b border-slate-50">
                <h4 className="font-bold text-slate-800">System Status</h4>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">ML Backend</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      ONLINE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Database</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      STABLE
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-100 shadow-sm rounded-[24px]">
            <div className="p-6 border-b border-slate-50">
              <h4 className="font-bold text-slate-800">Upcoming Classes</h4>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {[
                  { time: '10:00 AM', name: 'Artificial Intelligence', code: 'CS-402' },
                  { time: '02:00 PM', name: 'Database Systems', code: 'CS-301' },
                ].map((item, i) => (
                  <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs uppercase">
                        {item.time.split(' ')[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.code}</p>
                      </div>
                    </div>
                    <button className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors">
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
