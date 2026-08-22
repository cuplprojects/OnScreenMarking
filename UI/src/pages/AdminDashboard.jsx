import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  School, 
  Building2, 
  BookOpen, 
  ClipboardList, 
  Users, 
  ChevronRight,
  ShieldCheck,
  Plus,
  Settings,
  AlertCircle,
  Zap,
  Activity,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [universities, setUniversities] = useState([]);
  const [stats, setStats] = useState({
    totalUniversities: 0,
    totalUsers: 0,
    totalProjects: 0,
    totalScripts: 0,
    completedScripts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unassignedCount, setUnassignedCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const uniData = await apiCall('/universities');
      setUniversities(uniData);

      // Fetch all users to get active user counts
      let usersCount = 0;
      try {
        const users = await apiCall('/users');
        usersCount = users.length;
      } catch (uErr) {
        console.error('Failed to fetch users count:', uErr);
      }

      // Fetch all scripts to compute global evaluations progress
      let pendingCount = 0;
      let totalCount = 0;
      let completedCount = 0;
      try {
        const scripts = await apiCall('/scripts?limit=5000');
        totalCount = scripts.length;
        pendingCount = scripts.filter(s => s.status === 'pending').length;
        completedCount = scripts.filter(s => s.status === 'completed').length;
        setUnassignedCount(pendingCount);
      } catch (sErr) {
        console.error('Failed to fetch scripts progress:', sErr);
      }

      setStats({
        totalUniversities: uniData.length,
        totalUsers: usersCount,
        totalProjects: uniData.reduce((sum, u) => sum + (u.projects?.length || 0), 0),
        totalScripts: totalCount,
        completedScripts: completedCount
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load dashboard universities');
    } finally {
      setLoading(false);
    }
  };

  const systemModules = [
    {
      id: 'attendance',
      title: 'Attendance Audit',
      description: 'Review logs',
      icon: <Activity size={16} />,
      path: '/admin/attendance',
      color: 'text-emerald-600 bg-emerald-50'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider animate-pulse">Initializing Board Admin Console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full px-6 lg:px-10">
      
      {/* Dynamic Unallocated Alert Warning Banner */}
      <div className="pt-6">
        {unassignedCount > 0 && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Unallocated Scripts Alert</h3>
                <p className="text-xs text-amber-800 mt-0.5">There are currently <span className="font-bold text-red-600">{unassignedCount}</span> scripts that have not been assigned to any examiner.</p>
              </div>
            </div>
            <Link 
              to="/admin/allocate-scripts" 
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
            >
              Allocate Scripts
            </Link>
          </div>
        )}
      </div>

      {/* Main Glass Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold mb-1">
            <ShieldCheck size={14} />
            <span className="uppercase tracking-widest text-[9px] font-extrabold">Administrator Cockpit</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            OSM Admin Console
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Global System Configurations & Evaluation Monitor Room</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:bg-blue-700 cursor-pointer"
          >
            <Users size={14} />
            Manage Users
          </Link>
          <Link
            to="/admin/role-management"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:bg-blue-700 cursor-pointer"
          >
            <ShieldCheck size={14} />
            Manage Roles
          </Link>
          <Link
            to="/admin/universities"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:bg-blue-700 cursor-pointer"
          >
            <Plus size={14} />
            Add University
          </Link>
        </div>
      </div>

      {/* Grid Layout utilizing entire viewport */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN - STATS & REGISTERED UNIVERSITIES (75% Width) */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* Global Statistics Metric Board */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Global Statistics</h2>
                <p className="text-[11px] text-slate-500">Global examination status across all linked boards</p>
              </div>
              <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-100">
                Performance metrics
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Universities</span>
                <span className="text-base font-bold text-slate-900 mt-1">{stats.totalUniversities}</span>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Registered Users</span>
                <span className="text-base font-bold text-slate-900 mt-1">{stats.totalUsers}</span>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Active Projects</span>
                <span className="text-base font-bold text-slate-900 mt-1">{stats.totalProjects}</span>
              </div>
              <div className="bg-blue-600 p-3 rounded-xl text-white flex flex-col justify-between shadow-md">
                <span className="text-[9px] uppercase font-bold text-blue-100 tracking-wider">Global Completion</span>
                <span className="text-base font-bold mt-1">
                  {stats.completedScripts} <span className="text-[10px] font-normal text-blue-200">/ {stats.totalScripts}</span>
                </span>
              </div>
            </div>

            {/* Overall Progress Slider */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-slate-700">Global Answer Sheets Progress Ratio</span>
                <span className="text-[11px] font-bold text-blue-600">
                  {stats.totalScripts > 0 ? Math.round((stats.completedScripts / stats.totalScripts) * 100) : 0}% Evaluated
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalScripts > 0 ? (stats.completedScripts / stats.totalScripts) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Registered Boards Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Affiliated Universities</h2>
                <p className="text-[11px] text-slate-500">Live configuration and operations across affiliated networks</p>
              </div>
              <Link to="/admin/universities" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                Manage Universities <ArrowUpRight size={12} />
              </Link>
            </div>

            {error ? (
              <div className="p-6 text-center text-red-600">
                <AlertCircle className="mx-auto mb-1.5" size={24} />
                <p className="text-xs font-semibold">{error}</p>
              </div>
            ) : universities.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <School size={32} className="mx-auto mb-1.5 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-wider">No university boards registered</p>
                <Link to="/admin/universities" className="text-[10px] text-blue-600 underline font-bold mt-0.5 inline-block">Add first board</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Board name</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Config</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {universities.map((uni) => (
                      <tr key={uni.universityId} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                              {uni.universityName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-900 leading-none">{uni.universityName}</p>
                              <p className="text-[9px] text-slate-400 uppercase font-bold mt-1 tracking-wider">Code: UNIV-{uni.universityId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            {uni.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[11px] font-bold text-slate-800">
                            {uni.departments?.length || 0} Depts | {uni.projects?.length || 0} Projects
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Link 
                              to={`/admin/departments?universityId=${uni.universityId}`}
                              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all"
                            >
                              Config Departments
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - SLICK SIDE BAR (25% Width) */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
          {/* Quick Action Navigation Dock */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Board Admin Control</h3>
            <div className="flex flex-col gap-1.5">
              {systemModules.map((module) => (
                <Link
                  key={module.id}
                  to={module.path}
                  className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${module.color} shrink-0 group-hover:scale-105 transition-transform`}>
                      {module.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{module.title}</h4>
                      <p className="text-[9px] text-slate-400 mt-0.5 truncate">{module.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Compact Metadata Details Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">System Status</h3>
            <div className="space-y-3">
              <div className="border-b border-slate-50 pb-2">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Security Environment</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">Authorized Admins Only</p>
              </div>
              <div className="border-b border-slate-50 pb-2">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Global Server Node</span>
                <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active / Optimal
                </p>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Total System Capacity</span>
                <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                  {stats.totalUniversities} Affiliated | {stats.totalUsers} Active Personnel
                </p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
