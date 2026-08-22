import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building2, 
  BookOpen, 
  Calendar, 
  ClipboardList, 
  FileText, 
  Users, 
  ChevronRight,
  ArrowLeft,
  LayoutDashboard,
  Activity,
  School
} from 'lucide-react';
import apiCall from '../services/api';

export default function UniversityDashboard() {
  const { universityId } = useParams();
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    departments: 0,
    subjects: 0,
    papers: 0,
    users: 0
  });

  useEffect(() => {
    fetchUniversityData();
  }, [universityId]);

  const fetchUniversityData = async () => {
    try {
      setLoading(true);
      const uniData = await apiCall(`/universities/${universityId}`);
      setUniversity(uniData);
      
      // In a real app, you'd fetch these from endpoints filtered by universityId
      // For now using placeholders or mock data
      setStats({
        departments: 5,
        subjects: 12,
        papers: 45,
        users: 28
      });
    } catch (err) {
      console.error('Failed to fetch university data:', err);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      id: 'departments',
      title: 'Departments',
      description: 'Manage academic departments',
      icon: <Building2 size={24} />,
      path: `/admin/masters?universityId=${universityId}`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-500/20'
    },
    {
      id: 'subjects',
      title: 'Subjects',
      description: 'Configure course subjects',
      icon: <BookOpen size={24} />,
      path: `/admin/subjects?universityId=${universityId}`,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-500/20'
    },
    {
      id: 'sessions',
      title: 'Sessions',
      description: 'Manage exam sessions',
      icon: <Calendar size={24} />,
      path: `/admin/sessions?universityId=${universityId}`,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-500/20'
    },
    {
      id: 'projects',
      title: 'Projects',
      description: 'Organize marking projects',
      icon: <ClipboardList size={24} />,
      path: `/admin/projects?universityId=${universityId}`,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-500/20'
    },
    {
      id: 'papers',
      title: 'Papers',
      description: 'Configure exam papers',
      icon: <FileText size={24} />,
      path: `/admin/papers?universityId=${universityId}`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-500/20'
    },
    {
      id: 'users',
      title: 'Users',
      description: 'Manage university staff',
      icon: <Users size={24} />,
      path: `/admin/users?universityId=${universityId}`,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      borderColor: 'border-orange-500/20'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
         <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 relative z-10">
        {/* Header Section */}
        <div className="py-16 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="flex items-center gap-8">
            <Link 
              to="/admin/dashboard" 
              className="p-4 bg-white hover:bg-slate-50 text-slate-400 hover:text-blue-600 rounded-2xl border border-slate-200 transition-all active:scale-95 shadow-sm group"
            >
              <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <div className="flex items-center gap-3 text-blue-600 font-black mb-3">
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <School size={16} />
                </div>
                <span className="uppercase tracking-[0.3em] text-[10px]">Institutional Control Terminal</span>
              </div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">
                {university?.universityName || 'University Dashboard'}
              </h1>
              <p className="text-slate-500 font-medium text-lg max-w-xl">
                Integrated management of academic faculties, assessment frameworks, and personnel for this institution.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xl">
            <div className={`px-6 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] flex items-center gap-3 ${university?.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
               <div className={`w-2 h-2 rounded-full ${university?.isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></div>
               {university?.isActive ? 'OPERATIONAL' : 'INACTIVE'}
            </div>
          </div>
        </div>

        {/* Scoped Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <QuickStat label="Departments" value={stats.departments} color="text-blue-600" />
          <QuickStat label="Subjects" value={stats.subjects} color="text-blue-600" />
          <QuickStat label="Active Papers" value={stats.papers} color="text-blue-600" />
          <QuickStat label="Staff Users" value={stats.users} color="text-emerald-600" />
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module) => (
            <Link
              key={module.id}
              to={module.path}
              className="group relative bg-white hover:bg-slate-50 p-10 rounded-[3.5rem] border border-slate-200 hover:border-blue-500/30 transition-all duration-500 shadow-xl flex flex-col justify-between min-h-[340px] overflow-hidden"
            >
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-slate-50 text-slate-400 group-hover:text-blue-600 rounded-3xl flex items-center justify-center border border-slate-100 group-hover:border-blue-500/20 group-hover:scale-110 transition-all duration-500 shadow-inner mb-8">
                  {module.icon}
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-3 group-hover:text-blue-600 transition-colors">{module.title}</h3>
                <p className="text-slate-500 font-medium text-lg leading-relaxed">{module.description}</p>
              </div>
              
              <div className="relative z-10 pt-8 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-400 group-hover:text-blue-600 font-black text-xs uppercase tracking-widest transition-all">
                  <span>Enter Module</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm">
                   <Activity size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, color }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl group hover:border-blue-500/30 transition-all duration-500">
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.3em]">{label}</p>
        <div className="w-1.5 h-1.5 bg-slate-100 group-hover:bg-blue-600 rounded-full transition-colors"></div>
      </div>
      <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}
