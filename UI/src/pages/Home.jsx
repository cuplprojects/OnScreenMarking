import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Zap, 
  TrendingUp, 
  Award,
  ChevronRight,
  Search,
  Sparkles,
  Calendar,
  X,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';

const Home = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalScripts: 0,
    evaluated: 0,
    pending: 0,
    inProgress: 0,
    averageScore: 0,
  });
  const [subjectWorkloads, setSubjectWorkloads] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const tableRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: "Good Morning", icon: "🌅" };
    if (hour < 17) return { text: "Good Afternoon", icon: "☀️" };
    return { text: "Good Evening", icon: "🌙" };
  };

  const handleStartMarking = (script) => {
    const queryParams = new URLSearchParams({
      scriptId: script.id,
      paperId: script.paperId || '',
      barCode: script.generatedBarcode || '',
      allocationId: script.allocationId || '',
      examinerId: user?.id || '',
      cleanPdfUrl: script.cleanPdfUrl || script.answerSheetPdfUrl || ''
    }).toString();

    navigate(`/marking?${queryParams}`, {
      state: {
        scriptId: script.id,
        paperId: script.paperId,
        barCode: script.generatedBarcode,
        allocationId: script.allocationId,
        cleanPdfUrl: script.cleanPdfUrl || script.answerSheetPdfUrl || ''
      }
    });
  };

  const fetchFn = useCallback(async (params) => {
    if (!user?.id) {
      return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 1 };
    }
    const searchVal = params.search || '';
    const pageVal = params.page || 1;
    const pageSizeVal = params.pageSize || 10;
    const statusFilterVal = params.statusFilter || 'all';
    const subjectFilterVal = params.subjectFilter || '';
    const sortFieldVal = params.sortField || '';
    const sortOrderVal = params.sortOrder || '';

    // Fetch paginated data for the table
    const queryParams = new URLSearchParams();
    queryParams.append('page', pageVal);
    queryParams.append('pageSize', pageSizeVal);
    if (searchVal) queryParams.append('search', searchVal);
    if (sortFieldVal) queryParams.append('sortField', sortFieldVal);
    if (sortOrderVal) queryParams.append('sortOrder', sortOrderVal);
    if (statusFilterVal && statusFilterVal !== 'all') queryParams.append('statusFilter', statusFilterVal);
    if (subjectFilterVal) queryParams.append('subjectFilter', subjectFilterVal);

    const response = await apiCall(`/scripts/examiner/${user.id}?${queryParams.toString()}`);
    
    return {
      items: response.items || [],
      totalCount: response.totalCount || 0,
      page: response.page || 1,
      pageSize: response.pageSize || 10,
      totalPages: response.totalPages || 1
    };
  }, [user]);

  // Separate effect to load all scripts for dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      if (!user?.id) return;
      try {
        // Fetch all scripts for stats
        const allScriptsResponse = await apiCall(`/scripts/examiner/${user.id}?pageSize=0`);
        const allScripts = allScriptsResponse.items || [];

        const expertiseIds = [user?.subjectId1, user?.subjectId2, user?.subjectId3].filter(id => id && id > 0);
        let subjectsData = [];
        if (expertiseIds.length > 0) {
          subjectsData = await Promise.all(
            expertiseIds.map(id => apiCall(`/subject/${id}`))
          );
        }

        const total = allScripts.length;
        const evaluatedCount = allScripts.filter(s => s.status === 'completed').length;
        const markingCount = allScripts.filter(s => s.status === 'marking').length;
        const pendingCount = allScripts.filter(s => s.status === 'allocated' || s.status === 'pending').length;
        const completedScripts = allScripts.filter(s => s.status === 'completed' && s.totalMarks !== null);
        const sumMarks = completedScripts.reduce((sum, s) => sum + parseFloat(s.totalMarks), 0);
        const avgScore = completedScripts.length > 0 ? (sumMarks / completedScripts.length) : 0;

        setStats({
          totalScripts: total,
          evaluated: evaluatedCount,
          inProgress: markingCount,
          pending: pendingCount,
          averageScore: parseFloat(avgScore.toFixed(1)),
        });

        // Calculate subject workloads based on user's expertise subjects and group papers under them
        const workloads = subjectsData.map(sub => {
          const subjectScripts = allScripts.filter(s => s.subjectId === sub.subjectId);
          
          const papersMap = {};
          subjectScripts.forEach(s => {
            const pKey = s.paperId;
            if (!papersMap[pKey]) {
              papersMap[pKey] = {
                paperId: s.paperId,
                paperName: s.paperName,
                paperCode: s.paperCode || '',
                count: 0
              };
            }
            papersMap[pKey].count += 1;
          });

          return {
            subjectId: sub.subjectId,
            subjectName: sub.subjectName || sub.subName,
            totalCount: subjectScripts.length,
            papers: Object.values(papersMap)
          };
        });
        setSubjectWorkloads(workloads);
      } catch (err) {
        console.error("Failed to load stats:", err);
      }
    };
    loadStats();
  }, [user]);

  const {
    items: scripts,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    filters,
    setFilter,
    sortField,
    sortOrder,
    handleSort,
    loading: tableLoading,
    refresh: refreshTable
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10, statusFilter: 'all', subjectFilter: '' }
  });

  const handleCardClick = (filterVal) => {
    setFilter('statusFilter', filterVal);
    // Smooth scroll and focus table registry
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubjectClick = (subjectId) => {
    const stringId = subjectId ? subjectId.toString() : '';
    if (filters.subjectFilter === stringId) {
      setFilter('subjectFilter', '');
    } else {
      setFilter('subjectFilter', stringId);
    }
    // Smooth scroll and focus table registry
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const SortHeader = ({ label, field, isCenter = false }) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-5 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group/header ${isCenter ? 'text-center' : ''}`}
      >
        <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : ''}`}>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
          <span className="text-[9px] text-slate-400 group-hover/header:text-slate-655 transition-colors">
            {isSorted ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
          </span>
        </div>
      </th>
    );
  };

  const greeting = getGreeting();

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="space-y-6 pb-12 transition-all duration-300">
      
      {/* Dynamic Greetings & Info Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-850 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide">
              <Sparkles size={13} className="text-amber-300 animate-pulse" />
              <span>{greeting.icon} {greeting.text}</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome Back, <span className="text-amber-300 font-black">{user?.name || "Examiner"}</span>
            </h1>
            <p className="text-blue-100 text-xs max-w-xl leading-relaxed">
              Your active session is fully authenticated. Let's make marking swift, accurate, and fair today!
            </p>
          </div>

          <div className="flex flex-row sm:flex-row items-center gap-4 bg-white/10 backdrop-blur-lg border border-white/10 p-4 rounded-2xl self-start lg:self-center shrink-0">
            <div className="p-2 bg-white/10 rounded-xl text-center shrink-0">
              <Calendar size={18} className="mx-auto text-amber-300 mb-0.5" />
              <span className="block text-[8px] font-black uppercase text-blue-200">Date</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-black tracking-wide text-blue-100">{formattedDate}</p>
              <p className="text-lg font-black tracking-tight text-white font-mono">{formattedTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Single Row Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => handleCardClick('all')}
          className={`cursor-pointer transition-all duration-205 ${
            filters.statusFilter === 'all' ? 'ring-2 ring-blue-500 rounded-2xl shadow-md' : ''
          }`}
        >
          <StatCard
            title="Total Assigned"
            value={stats.totalScripts}
            icon={<FileText className="text-blue-600" />}
            bgColor="bg-blue-50"
            borderClass="border-l-4 border-blue-600 shadow-blue-50"
            subtitle="allocated sheets"
          />
        </div>
        <div 
          onClick={() => handleCardClick('pending')}
          className={`cursor-pointer transition-all duration-205 ${
            filters.statusFilter === 'pending' ? 'ring-2 ring-rose-500 rounded-2xl shadow-md' : ''
          }`}
        >
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<AlertCircle className="text-rose-600" />}
            bgColor="bg-rose-50"
            borderClass="border-l-4 border-rose-600 shadow-rose-50"
            subtitle="awaiting evaluation"
          />
        </div>
        <div 
          onClick={() => handleCardClick('marking')}
          className={`cursor-pointer transition-all duration-205 ${
            filters.statusFilter === 'marking' ? 'ring-2 ring-amber-500 rounded-2xl shadow-md' : ''
          }`}
        >
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={<Clock className="text-amber-600" />}
            bgColor="bg-amber-50"
            borderClass="border-l-4 border-amber-500 shadow-amber-50"
            subtitle="currently editing"
          />
        </div>
        <div 
          onClick={() => handleCardClick('completed')}
          className={`cursor-pointer transition-all duration-205 ${
            filters.statusFilter === 'completed' ? 'ring-2 ring-emerald-500 rounded-2xl shadow-md' : ''
          }`}
        >
          <StatCard
            title="Completed"
            value={stats.evaluated}
            icon={<CheckCircle className="text-emerald-600" />}
            bgColor="bg-emerald-50"
            borderClass="border-l-4 border-emerald-600 shadow-emerald-50"
            subtitle="successfully marked"
          />
        </div>
      </div>

      {/* Progress Visualizer */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              <Award size={14} className="text-blue-600 animate-bounce" />
              Marking Progress Velocity
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Real-time percentage overview of your workload (Average Evaluated Score: <span className="text-blue-700 font-extrabold">{stats.averageScore} marks</span>)</p>
          </div>
          <span className="text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
            {stats.totalScripts > 0 ? Math.round((stats.evaluated / stats.totalScripts) * 100) : 0}% Done
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-100 flex p-0.5">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-700"
              style={{ width: `${stats.totalScripts > 0 ? (stats.evaluated / stats.totalScripts) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[9px] font-bold text-gray-400">
            <span>0% Start</span>
            <span>{stats.evaluated} of {stats.totalScripts} Evaluated</span>
            <span>100% Target</span>
          </div>
        </div>
      </div>

      {/* Subject Expertise & Workload Section */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
          <Award size={13} className="text-indigo-650" />
          <span>Subject Expertise & Script Allocation</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subjectWorkloads.map((sw) => (
            <div 
              key={sw.subjectId} 
              onClick={() => handleSubjectClick(sw.subjectId)}
              className={`bg-slate-50 border p-3 rounded-xl flex flex-col justify-between hover:border-indigo-400 transition-all duration-300 shadow-sm cursor-pointer ${
                filters.subjectFilter === sw.subjectId.toString() ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200/50'
              }`}
            >
              <div className="space-y-2.5">
                <div>
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Expertise Subject</span>
                  <h4 className="font-extrabold text-xs text-slate-900 mt-0.5 leading-tight">{sw.subjectName}</h4>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Allocated Papers</span>
                  {sw.papers.length > 0 ? (
                    <div className="space-y-1">
                      {sw.papers.map(p => (
                        <div key={p.paperId} className="flex justify-between items-center bg-white px-2.5 py-1 rounded-lg border border-slate-150 shadow-sm">
                          <div className="max-w-[70%]">
                            <span className="text-[9px] font-extrabold text-slate-800 block truncate leading-tight">{p.paperName}</span>
                            {p.paperCode && <span className="text-[8px] text-slate-400 font-mono block truncate">{p.paperCode}</span>}
                          </div>
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                            {p.count} scr
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-400 italic block">No scripts allocated for this subject</span>
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-2.5 border-t border-slate-205 flex justify-between items-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Total Workload</span>
                <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                  {sw.totalCount} scripts
                </span>
              </div>
            </div>
          ))}
          {subjectWorkloads.length === 0 && (
            <div className="col-span-3 text-center py-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider border border-dashed border-slate-200 rounded-xl">
              No Expertise Subjects configured for your profile
            </div>
          )}
        </div>
      </div>

      {/* Interactive Script Control Cockpit */}
      <div ref={tableRef} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-6">
        <div className="p-5 border-b border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-800">Allocated Scripts Registry</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Filter, search, and jump directly into evaluating your papers</p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button 
                onClick={refreshTable}
                title="Refresh Registry"
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-slate-50 border border-gray-200 rounded-xl transition-all cursor-pointer shrink-0"
              >
                <RefreshCw size={14} />
              </button>
              <Link to="/scripts" className="text-[10px] font-black text-blue-650 bg-blue-50 border border-blue-100 hover:bg-blue-100/70 px-3.5 py-2 rounded-xl transition-all shrink-0">
                Open Script Manager
              </Link>
            </div>
          </div>

          {/* Interactive Filter and Search Bar */}
          <div className="flex flex-col md:flex-row gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-405" size={14} />
              <input
                type="text"
                placeholder="Search by Barcode, Paper or Subject name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-550 focus:border-transparent bg-slate-50/50 hover:bg-white transition-all text-gray-800 font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-455 hover:text-gray-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Status Tabs */}
            <div className="flex bg-slate-100/80 p-1 rounded-xl self-start border border-slate-200/50 shrink-0">
              {[
                { key: 'all', label: 'All Statuses' },
                { key: 'pending', label: 'Pending' },
                { key: 'marking', label: 'In Progress' },
                { key: 'completed', label: 'Completed' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter('statusFilter', tab.key)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    filters.statusFilter === tab.key
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/40'
                      : 'text-gray-555 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Badges */}
          {(filters.statusFilter !== 'all' || filters.subjectFilter) && (
            <div className="flex flex-wrap gap-2 pt-1.5 border-t border-slate-100">
              {filters.statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[9px] font-black px-2.5 py-1 rounded-lg border border-blue-150">
                  Status: {filters.statusFilter}
                  <X size={10} className="cursor-pointer" onClick={() => setFilter('statusFilter', 'all')} />
                </span>
              )}
              {filters.subjectFilter && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[9px] font-black px-2.5 py-1 rounded-lg border border-indigo-150">
                  Subject: {subjectWorkloads.find(sw => sw.subjectId.toString() === filters.subjectFilter)?.subjectName || 'Selected Subject'}
                  <X size={10} className="cursor-pointer" onClick={() => setFilter('subjectFilter', '')} />
                </span>
              )}
            </div>
          )}
        </div>
        
        {tableLoading && scripts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650 animate-pulse"></div>
            <span>Fetching allocated scripts...</span>
          </div>
        ) : scripts.length === 0 ? (
          <div className="py-12 text-center text-gray-450 space-y-2">
            <FileText size={38} className="mx-auto text-gray-305 opacity-80" />
            <p className="text-xs font-bold uppercase tracking-wider">No matching scripts found</p>
            <p className="text-[10px] text-gray-400">Try adjusting your search query or status filter above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-50/70 border-b border-gray-100">
                <tr>
                  <SortHeader label="Barcode / Script ID" field="barcode" />
                  <SortHeader label="Subject" field="subjectName" />
                  <SortHeader label="Paper Name" field="paperName" />
                  <SortHeader label="Status" field="status" />
                  <SortHeader label="Marks Obtained" field="totalMarks" />
                  <SortHeader label="Last Activity" field="submittedAt" />
                  <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Interactive Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/70">
                {scripts.map((script) => (
                  <tr key={script.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-5 py-3 font-bold text-xs text-gray-950">
                      {script.generatedBarcode || `SCR-${script.id}`}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-650 font-medium">
                      {script.subjectName || 'General Subject'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-700 font-semibold">
                      {script.paperName}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          script.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : script.status === 'marking'
                            ? 'bg-amber-50 text-amber-705 border-amber-100 animate-pulse'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${
                          script.status === 'completed' ? 'bg-emerald-500' : script.status === 'marking' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></span>
                        {script.status === 'completed' ? 'Completed' : script.status === 'marking' ? 'In Progress' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-black text-xs text-gray-900">
                      {script.totalMarks !== null ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                          {script.totalMarks} marks
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Not evaluated</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[10px] text-gray-505 font-medium">
                      {new Date(script.submittedAt || script.createdAt).toLocaleDateString()} at {new Date(script.submittedAt || script.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {script.status === 'completed' ? (
                        <button
                          onClick={() => handleStartMarking(script)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer group-hover:scale-105"
                        >
                          <Eye size={10} />
                          Review Marks
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartMarking(script)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-extrabold text-[9px] uppercase tracking-wider transition-all shadow-md cursor-pointer animate-pulse hover:scale-105"
                        >
                          <Zap size={10} className="fill-white" />
                          Evaluate Script
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Standard centralized pagination service */}
            <TablePagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              setPage={setPage}
              setPageSize={setPageSize}
            />
          </div>
        )}
      </div>

    </div>
  );
};

const StatCard = ({ title, value, icon, bgColor, borderClass, subtitle }) => {
  return (
    <div className={`bg-white rounded-2xl p-3 shadow-sm border border-gray-100 ${borderClass} hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between group h-full`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[8px] uppercase font-black text-gray-405 tracking-wider">{title}</span>
        <div className={`p-1.5 ${bgColor} rounded-lg group-hover:scale-110 transition-transform`}>
          {icon ? <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span> : null}
        </div>
      </div>
      <div>
        <p className="text-base font-black text-gray-955 tracking-tight">{value}</p>
        {subtitle && <p className="text-[8px] text-gray-450 font-bold mt-0.5 leading-tight">{subtitle}</p>}
      </div>
    </div>
  );
};

export default Home;
