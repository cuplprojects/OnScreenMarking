import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  ChevronRight,
  TrendingUp,
  LayoutDashboard,
  Activity,
  AlertCircle,
  Zap,
  ArrowUpRight,
  Layers,
  Users,
  CheckCircle,
  FileSpreadsheet,
  Clock,
  UserCheck,
  Award,
  Search,
  X,
  Briefcase,
  PlayCircle,
  Shield,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';
import { encryptId } from '../utils/encryption';

export default function CoordinatorDashboard() {
  const navigate = useNavigate();
  const { userType, universityId: userUniversityId } = useAuth();
  const [university, setUniversity] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const [stats, setStats] = useState({
    departments: 0,
    courses: 0,
    subjects: 0,
    projects: 0,
    totalScripts: 0,
    assignedScripts: 0,
    completedScripts: 0,
    users: 0
  });

  const [activeProjects, setActiveProjects] = useState([]);
  const [projectStats, setProjectStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    return sessionStorage.getItem('selectedProjectId') || '';
  });

  const [examiners, setExaminers] = useState([]);
  const [examinerSearch, setExaminerSearch] = useState('');

  const handleProjectSelect = (id) => {
    const stringId = id ? id.toString() : '';
    if (stringId) {
      sessionStorage.setItem('selectedProjectId', stringId);
      navigate(userType === 'admin' 
        ? `/admin/project-dashboard?projectId=${encryptId(stringId)}` 
        : `/project-dashboard?projectId=${encryptId(stringId)}`);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (university && selectedSessionId) {
      fetchDynamicData();
    }
  }, [selectedSessionId, university]);

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const uniData = await apiCall('/universities/current/my-university');
      setUniversity(uniData);

      const sessionsRes = await apiCall('/session?pageSize=0');
      const sessionsData = sessionsRes.items || [];
      setSessions(sessionsData);

      if (!selectedSessionId && sessionsData.length > 0) {
        const active = sessionsData.find(s => s.isActive) || sessionsData[0];
        setSelectedSessionId(active.sessionId.toString());
      }
    } catch (err) {
      console.error('Failed to fetch base data:', err);
      setError(err.message || 'Failed to load university data');
      setLoading(false);
    }
  };

  const fetchDynamicData = async () => {
    if (!university) return;

    try {
      setLoading(true);

      // Fetch consolidated counts
      let countsData = { departments: 0, courses: 0, subjects: 0, scripts: 0, completedMarking: 0 };
      try {
        countsData = await apiCall(`/stats/counts?universityId=${university.universityId}`);
      } catch (statsErr) {
        console.error('Failed to fetch counts from stats API:', statsErr);
      }

      // Calculate project-wise statistics
      const statsMap = {};
      const apiProjectsStats = countsData.projects || [];
      apiProjectsStats.forEach(p => {
        statsMap[p.projectId] = {
          papersCount: p.papersCount,
          totalScripts: p.totalScripts,
          pendingScripts: p.pendingScripts,
          allocatedScripts: p.allocatedScripts,
          completedScripts: p.completedScripts
        };
      });
      setProjectStats(statsMap);

      setUnassignedCount(countsData.unassignedScriptsCount);

      // Load examiners workload
      let examinersWithWorkload = [];
      try {
        const workloadData = await apiCall(`/users/examiners/workload?universityId=${university.universityId}`);
        examinersWithWorkload = (workloadData || []).map(ex => {
          const count = ex.allocatedCount || 0;
          let workload = 'Free';
          if (count > 20) workload = 'Fully Allocated';
          else if (count > 0) workload = 'Partially Allocated';

          return { ...ex, workload };
        });
      } catch (workloadErr) {
        console.error('Failed to fetch examiners workload:', workloadErr);
      }

      setExaminers(examinersWithWorkload);

      // Filter projects locally
      const rawProjects = university.projects || [];
      const sessIdNum = parseInt(selectedSessionId || '0', 10);
      const filteredProj = sessIdNum
        ? rawProjects.filter(p => p.sessionId === sessIdNum)
        : rawProjects;
      setActiveProjects(filteredProj);

      setStats({
        departments: countsData.departments,
        courses: countsData.courses,
        subjects: countsData.subjects,
        projects: filteredProj.length,
        totalScripts: countsData.scripts,
        assignedScripts: 0,
        completedScripts: countsData.completedMarking,
        users: examinersWithWorkload.length
      });

    } catch (err) {
      console.error('Failed to fetch dynamic data:', err);
      setError(err.message || 'Failed to load dynamic data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !university) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-650 border-t-transparent"></div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider animate-pulse">Synchronizing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full border border-red-100">
          <div className="flex items-center gap-3 mb-4 text-red-600">
            <AlertCircle size={28} />
            <h2 className="text-lg font-bold"> Synch Failure</h2>
          </div>
          <p className="text-slate-605 text-sm mb-6">{error}</p>
          <button
            onClick={fetchUniversityData}
            className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:shadow-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const selectedProjectInfo = activeProjects.find(p => p.projectId.toString() === selectedProjectId);
  const selectedProjStats = projectStats[selectedProjectId] || { papersCount: 0, totalScripts: 0, pendingScripts: 0, allocatedScripts: 0, completedScripts: 0 };

  const filteredExaminers = examiners.filter(ex =>
    ex.name?.toLowerCase().includes(examinerSearch.toLowerCase()) ||
    ex.email?.toLowerCase().includes(examinerSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full flex flex-col">
      
      {/* Main Glass Header - Full Width */}
      <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-5 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {university?.universityName} Portal
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Academic Session Selector */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-150">
              <span className="text-[9px] uppercase font-bold text-slate-400">Academic Session:</span>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Sessions</option>
                {sessions.map(s => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.sessionName} {s.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-10 flex-1">
        {/* Alert Bar */}
        {unassignedCount > 0 && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Attention Required</h3>
                <p className="text-xs text-amber-800 mt-0.5">There are <span className="font-bold text-red-600">{unassignedCount}</span> scripts pending examiner allocation. Please assign them immediately.</p>
              </div>
            </div>
            <Link
              to="/allocate-scripts"
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
            >
              Allocate Scripts
            </Link>
          </div>
        )}

        {/* Main Dashboard Layout */}
      <div className="grid grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN - MAIN ANALYTICS AND DETAILS (75% Width) */}
        <div className="col-span-12 lg:col-span-9 space-y-6">

          {/* Real-time Evaluations Performance Cockpit Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Marking Status & Metric Board</h2>
                <p className="text-[11px] text-slate-500">Real-time script evaluations status for university projects</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Departments Card */}
              <div
                onClick={() => navigate('/departments')}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer hover:-translate-y-1 group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <Building2 size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{stats.departments}</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Departments</p>
                </div>
              </div>

              {/* Courses Card */}
              <div
                onClick={() => navigate('/courses')}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer hover:-translate-y-1 group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <BookOpen size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{stats.courses}</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Courses</p>
                </div>
              </div>

              {/* Subjects Card */}
              <div
                onClick={() => navigate('/subjects')}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all cursor-pointer hover:-translate-y-1 group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                    <FileText size={18} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{stats.subjects}</h3>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Subjects</p>
                </div>
              </div>

              {/* Marking Analytics Dark Card */}
              <div
                onClick={() => {
                  const activeProjId = selectedProjectId || (activeProjects.length > 0 ? activeProjects[0].projectId.toString() : null);
                  if (activeProjId) {
                    navigate(userType === 'admin'
                      ? `/admin/project-dashboard?projectId=${encryptId(activeProjId)}`
                      : `/project-dashboard?projectId=${encryptId(activeProjId)}`
                    );
                  }
                }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl shadow-md cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden border border-slate-800 flex flex-col justify-between"
              >
                {/* Decorative background element */}
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-400/30 group-hover:scale-150 transition-all duration-700"></div>

                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Evaluation</p>
                    <h4 className="text-white text-xs font-semibold mt-0.5">Marking Progress</h4>
                  </div>
                  <div className="p-2 bg-white/10 text-white rounded-xl backdrop-blur-sm group-hover:bg-blue-500 transition-colors">
                    <Activity size={16} />
                  </div>
                </div>

                <div className="relative z-10 mt-2">
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Completed</p>
                      <p className="text-xl font-black text-emerald-400 leading-none">
                        {stats.completedScripts} <span className="text-[10px] font-bold text-slate-500">/ {stats.totalScripts}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">
                        {stats.totalScripts > 0 ? Math.round((stats.completedScripts / stats.totalScripts) * 100) : 0}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-1000 ease-out relative"
                      style={{ width: `${stats.totalScripts > 0 ? (stats.completedScripts / stats.totalScripts) * 100 : 0}%` }}
                    >
                      <div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Examination Projects as Premium Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1 select-none">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ClipboardList size={16} className="text-blue-650" />
                <span>Academic Evaluation Projects</span>
              </h2>
              <Link to="/projects" className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-750 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-blue-150 transition cursor-pointer">
                <span>Manage Projects</span>
              </Link>
            </div>

            {activeProjects.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-450">
                <ClipboardList size={32} className="mx-auto mb-1.5 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-wider">No active projects launched yet</p>
                <Link to="/projects" className="text-[10px] text-blue-600 underline font-bold mt-0.5 inline-block">Create first project</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeProjects.map((project) => {
                  const pStat = projectStats[project.projectId] || { papersCount: 0, totalScripts: 0, pendingScripts: 0, allocatedScripts: 0, completedScripts: 0 };
                  const isSelected = selectedProjectId === project.projectId.toString();
                  const completePercentage = pStat.totalScripts > 0 ? Math.round((pStat.completedScripts / pStat.totalScripts) * 100) : 0;

                  return (
                    <div
                      key={project.projectId}
                      onClick={() => handleProjectSelect(project.projectId)}
                      className={`relative group bg-white rounded-2xl p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-md ${isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/20'
                          : 'border-slate-100/80 hover:border-blue-300'
                        }`}
                    >
                      <div>
                        {/* Header Details */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border ${project.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-slate-50 text-slate-605 border-slate-100'
                            }`}>
                            {project.isActive ? 'Active' : 'Archived'}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 transition-colors leading-tight mb-2">
                          {project.projectName}
                        </h3>

                        {/* Script statistics breakdown */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-500">
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[8px] block">Total Papers</span>
                            <span className="text-slate-900 font-extrabold text-xs block">{pStat.papersCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[8px] block">Pending scripts</span>
                            <span className="text-amber-600 font-extrabold text-xs block">{pStat.pendingScripts}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[8px] block">Allocated scripts</span>
                            <span className="text-blue-600 font-extrabold text-xs block">{pStat.allocatedScripts}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider text-[8px] block">Completed Scripts</span>
                            <span className="text-emerald-600 font-extrabold text-xs block">{pStat.completedScripts} / {pStat.totalScripts}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions (Direct Navigation) */}
                      <div className="mt-5 flex gap-2">
                        <Link 
                          to={userType === 'admin' 
                            ? `/admin/papers?projectId=${encryptId(project.projectId.toString())}` 
                            : `/papers?projectId=${encryptId(project.projectId.toString())}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            sessionStorage.setItem('selectedProjectId', project.projectId.toString());
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-200 transition-colors"
                        >
                          <FileText size={12} />
                          Add Paper
                        </Link>
                        <Link 
                          to={userType === 'admin' 
                            ? `/admin/allocate-scripts?projectId=${encryptId(project.projectId.toString())}` 
                            : `/allocate-scripts?projectId=${encryptId(project.projectId.toString())}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            sessionStorage.setItem('selectedProjectId', project.projectId.toString());
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-200 transition-colors"
                        >
                          <Zap size={12} />
                          Allocate
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Examiner Workload Analytics Cockpit (Visible only when project is selected) */}
        </div>

        {/* RIGHT COLUMN - SLICK SIDE BAR (25% Width) */}
        <div className="col-span-12 lg:col-span-3 space-y-6">

          {/* Quick Action Navigation Dock */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</h3>

            <div className="flex flex-col gap-1.5">
              <SidebarLink
                to="/departments"
                label="Academic Setup"
                desc="Configure academic"
                icon={<Layers size={14} />}
                color="text-emerald-600 bg-emerald-50"
                disabled={false}
              />
              <SidebarLink
                to="/projects"
                label="Manage Projects"
                desc="Manage evaluation projects"
                icon={<Plus size={14} />}
                color="text-blue-600 bg-blue-50"
                disabled={false}
              />
              <SidebarLink
                to="/admin/users"
                label="Manage Users"
                desc="Manage coordinators and examiners"
                icon={<Users size={14} />}
                color="text-orange-600 bg-orange-50"
                disabled={false}
              />
            </div>
          </div>

          {/* Compact Metadata Details Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">University Profile</h3>
            <div className="space-y-3">
              <div className="border-b border-slate-50 pb-2">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">University Name</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{university?.universityName}</p>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none">Active Configs</span>
                <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                  {stats.departments} Departments | {stats.subjects} Subjects
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>


      </div>
    </div>
  );
}

const SidebarLink = ({ to, label, desc, icon, color, disabled }) => {
  if (disabled) {
    return (
      <div
        className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed"
        title="Requires Active Project Selection"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-slate-200 text-slate-400 shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-bold text-slate-400 truncate">{label}</h4>
            <p className="text-[9px] text-slate-400 mt-0.5 truncate">{desc}</p>
          </div>
        </div>
        <span className="text-[8px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5 shrink-0 uppercase tracking-wider">
          ðŸ”’ Select Project
        </span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/20 transition-all duration-300"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`p-2 rounded-lg ${color} shrink-0 group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="text-[11px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{label}</h4>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">{desc}</p>
        </div>
      </div>
      <ChevronRight size={12} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
};
