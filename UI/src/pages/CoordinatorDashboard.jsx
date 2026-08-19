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
  X
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
    return localStorage.getItem('selectedProjectId') || '';
  });

  const [examiners, setExaminers] = useState([]);
  const [examinerSearch, setExaminerSearch] = useState('');

  const handleProjectSelect = (id) => {
    const stringId = id ? id.toString() : '';
    setSelectedProjectId(stringId);
    if (stringId) {
      localStorage.setItem('selectedProjectId', stringId);
    } else {
      localStorage.removeItem('selectedProjectId');
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

      const sessionsData = await apiCall('/session');
      setSessions(sessionsData || []);
      
      if (!selectedSessionId && sessionsData && sessionsData.length > 0) {
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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 text-white font-bold py-2.5 rounded-xl hover:shadow-lg transition-all"
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
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full px-4 lg:px-6">
      {/* Alert Bar */}
      {unassignedCount > 0 && (
        <div className="mb-4 mt-2 bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
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

      {/* Main Glass Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold mb-1">
            <LayoutDashboard size={14} />
            <span className="uppercase tracking-widest text-[9px] font-extrabold">Board </span>
          </div>
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

            {/* Micro Metrics Rows */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div 
                onClick={() => navigate('/masters')}
                className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Configured Depts</span>
                <span className="text-base font-bold text-slate-900 mt-1">{stats.departments}</span>
              </div>
              <div 
                onClick={() => navigate('/courses')}
                className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Courses</span>
                <span className="text-base font-bold text-slate-900 mt-1">{stats.courses}</span>
              </div>
              <div 
                onClick={() => navigate('/subjects')}
                className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Subjects</span>
                <span className="text-base font-bold text-slate-900 mt-1">{stats.subjects}</span>
              </div>
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
                className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between cursor-pointer hover:border-blue-400 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Exam Scripts</span>
                <span className="text-base font-bold text-slate-900 mt-1">{stats.totalScripts}</span>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-xl text-white flex flex-col justify-between shadow-md shadow-blue-100 select-none">
                <span className="text-[9px] uppercase font-bold text-blue-100 tracking-wider">Completed Marking</span>
                <span className="text-base font-bold mt-1">
                  {stats.completedScripts} <span className="text-[10px] font-normal text-blue-200">/ {stats.totalScripts}</span>
                </span>
              </div>
            </div>

            {/* Unified Evaluation Progress Slider */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-slate-700">Marking Evaluation Progress Ratio</span>
                <span className="text-[11px] font-bold text-blue-600">
                  {stats.totalScripts > 0 ? Math.round((stats.completedScripts / stats.totalScripts) * 100) : 0}% Complete
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalScripts > 0 ? (stats.completedScripts / stats.totalScripts) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Active Examination Projects as Premium Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1 select-none">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ClipboardList size={16} className="text-indigo-650" />
                <span>Academic Evaluation Projects</span>
              </h2>
              <Link to="/sessions" className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-indigo-150 transition cursor-pointer">
                <span>Configure Project</span>
              </Link>
            </div>

            {activeProjects.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-450">
                <ClipboardList size={32} className="mx-auto mb-1.5 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-wider">No active projects launched yet</p>
                <Link to="/sessions" className="text-[10px] text-blue-600 underline font-bold mt-0.5 inline-block">Create first project</Link>
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
                      className={`relative group bg-white rounded-2xl p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-md ${
                        isSelected 
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20' 
                          : 'border-slate-100/80 hover:border-indigo-300'
                      }`}
                    >
                      <div>
                        {/* Header Details */}
                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider border ${
                            project.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-slate-50 text-slate-605 border-slate-100'
                          }`}>
                            {project.isActive ? 'Active' : 'Archived'}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-2">
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

                      {/* Progress bar slider */}
                      <div className="mt-5 pt-2">
                        <div className="flex justify-between items-center mb-1 text-[9px] font-extrabold">
                          <span className="text-slate-400">MARKING RATIO</span>
                          <span className="text-indigo-600">{completePercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${completePercentage}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Clickable prompt guide instruction */}
                      <div className="mt-4 pt-2.5 border-t border-slate-100/60 text-center select-none">
                        <span className={`text-[9px] font-black uppercase tracking-wider ${
                          isSelected 
                            ? 'text-indigo-650 animate-pulse' 
                            : 'text-slate-400 group-hover:text-indigo-500'
                        }`}>
                          {isSelected ? '✓ Selected ( Unlocked)' : '💡 Click card to open project sidebar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Examiner Workload Analytics Cockpit (Visible only when project is selected) */}
          {selectedProjectId && selectedProjectInfo && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-950 tracking-wider flex items-center gap-1.5">
                    <Users size={16} className="text-indigo-600" />
                    <span>Examiner Workload Dashboard</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Real-time script allocation workloads for university evaluation project: <span className="font-extrabold text-slate-800">{selectedProjectInfo.projectName}</span>
                  </p>
                </div>
                
                {/* Search Examiners Input */}
                <div className="max-w-xs flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-150 w-full shrink-0">
                  <Search size={12} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search examiner workload..."
                    value={examinerSearch}
                    onChange={(e) => setExaminerSearch(e.target.value)}
                    className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-[10px] focus:outline-none"
                  />
                </div>
              </div>

              {filteredExaminers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold text-xs">
                  No examiners matching search term found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-2">
                  {filteredExaminers.map((examiner) => (
                    <div 
                      key={examiner.id}
                      className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-755 font-extrabold text-xs uppercase shadow-sm">
                          {examiner.name?.substring(0, 2)}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 tracking-tight text-xs block">{examiner.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold block">{examiner.email}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mb-1 ${
                          examiner.workload === 'Free' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : examiner.workload === 'Fully Allocated'
                              ? 'bg-rose-50 text-rose-700 animate-pulse'
                              : 'bg-amber-50 text-amber-700'
                        }`}>
                          {examiner.workload}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">
                          <span className="text-slate-900 font-extrabold">{examiner.allocatedCount}</span> scripts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - SLICK SIDE BAR (25% Width) */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
          {/* Quick Action Navigation Dock */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Active Evaluation</h3>
            
            <div className="flex flex-col gap-1.5">
              <SidebarLink 
                to="/masters" 
                label="Add Masters" 
                desc="Configure departments & courses" 
                icon={<Layers size={14} />} 
                color="text-emerald-600 bg-emerald-50" 
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

      {/* Premium Project Cockpit Sidebar Drawer Overlay */}
      {selectedProjectId && selectedProjectInfo && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
            onClick={() => handleProjectSelect('')}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-sm bg-white shadow-2xl border-l border-slate-100 flex flex-col justify-between h-full animate-in slide-in-from-right duration-350 z-50">
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded">Project</span>
                  <h3 className="text-xs font-black text-slate-900 mt-1 leading-tight">{selectedProjectInfo.projectName}</h3>
                </div>
                <button 
                  onClick={() => handleProjectSelect('')} 
                  className="text-slate-400 hover:text-slate-655 rounded-lg p-1.5 hover:bg-slate-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stats Breakdown */}
             

              {/* Sidebar Navigation Actions */}
              <div className="space-y-2">
                <h4 className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2">Evaluation Controls</h4>
                
                <Link
                  to={userType === 'admin' 
                    ? `/admin/project-dashboard?projectId=${encryptId(selectedProjectId)}`
                    : `/project-dashboard?projectId=${encryptId(selectedProjectId)}`}
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-xs font-bold text-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Calendar size={14} />
                    </div>
                    <span>Project Dashboard</span>
                  </div>
                  <ChevronRight size={12} className="text-slate-400" />
                </Link>

                <Link
                  to={userType === 'admin'
                    ? `/admin/allocate-scripts?projectId=${encryptId(selectedProjectId)}`
                    : `/allocate-scripts?projectId=${encryptId(selectedProjectId)}`}
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-xs font-bold text-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Zap size={14} />
                    </div>
                    <span>Script Allocation</span>
                  </div>
                  <ChevronRight size={12} className="text-slate-400" />
                </Link>

                <Link
                  to={userType === 'admin' 
                    ? `/admin/papers?projectId=${encryptId(selectedProjectId)}`
                    : `/papers?projectId=${encryptId(selectedProjectId)}`}
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-xs font-bold text-slate-700"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <FileText size={14} />
                    </div>
                    <span>Add / Configure Paper</span>
                  </div>
                  <ChevronRight size={12} className="text-slate-400" />
                </Link>
              </div>

            </div>
          </div>
        </div>
      )}
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
          🔒 Select Project
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
