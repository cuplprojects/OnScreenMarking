import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Layers, 
  FileText, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  BookOpen,
  Zap,
  Search,
  Sliders,
  X,
  PieChart
} from 'lucide-react';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { decryptId, encryptId } from '../utils/encryption';
import apiCall from '../services/api';
import ProjectConfigHeader from '../components/ProjectConfigHeader';
import ColumnFilter from '../components/ColumnFilter';
import message from '../services/messageService';
import PapersManagement from './PapersManagement';
import ScriptAllocation from './ScriptAllocation';
import Attendance from './Attendance';

const getInitialsAvatar = (name) => {
  const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const colors = ['%23F97316', '%230D9488', '%233B82F6', '%238B5CF6', '%23EC4899', '%2310B981'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="${color}"/><text x="50%" y="54%" font-size="28" font-family="sans-serif" font-weight="600" fill="%23ffffff" dominant-baseline="middle" text-anchor="middle">${encodeURIComponent(initial)}</text></svg>`;
};

export default function ProjectDashboard() {
  const [searchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get('projectId');
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  
  const { userType, universityId: userUniversityId, hasPermission } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const activeUniversityId = userUniversityId;

  const [project, setProject] = useState(null);
  const [stats, setStats] = useState({
    papersCount: 0,
    totalScripts: 0,
    pendingScripts: 0,
    allocatedScripts: 0,
    completedScripts: 0,
    unconfiguredPapersCount: 0,
    completePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define fetch function for useTable table service
  const fetchFn = useCallback((params) => {
    if (projectId) {
      const searchVal = params.search || '';
      const pageVal = params.page || 1;
      const pageSizeVal = params.pageSize || 5;
      const sortFieldVal = params.sortField || '';
      const sortOrderVal = params.sortOrder || '';
      const statusFilterVal = params.statusFilter || '';
      return apiCall(`/papers/dashboard-stats?projectId=${projectId}&page=${pageVal}&pageSize=${pageSizeVal}&search=${searchVal}&sortField=${sortFieldVal}&sortOrder=${sortOrderVal}&statusFilter=${statusFilterVal}`);
    }
    return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 5, totalPages: 1 });
  }, [projectId]);

  const {
    items: papers,
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
    initialParams: { pageSize: 5 }
  });




  // Selected Paper for Interactive Right Charts
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [isBulkAutoAllocating, setIsBulkAutoAllocating] = useState(false);

  // Synced active paper with freshest data from papers list
  const activePaper = selectedPaper ? (papers.find(p => p.paperId === selectedPaper.paperId) || selectedPaper) : null;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPaperIds(papers.map(p => p.paperId));
    } else {
      setSelectedPaperIds([]);
    }
  };

  const handleSelectPaper = (paperId) => {
    setSelectedPaperIds(prev => 
      prev.includes(paperId) 
        ? prev.filter(id => id !== paperId)
        : [...prev, paperId]
    );
  };

  const handleAutoAllocateProject = async () => {
    if (!projectId) return;
    if (project?.isActive === false) {
      message.warning("This project is inactive. Script allocation is not permitted.");
      return;
    }
    setIsBulkAutoAllocating(true);
    try {
      const res = await apiCall(`/allocation/project/${projectId}/auto-allocate`, { method: 'POST' });
      message.success(res.message || "Project auto-allocated successfully");
      refreshTable();
    } catch (err) {
      message.error("Error: " + (err.message || "Failed to auto-allocate project"));
    } finally {
      setIsBulkAutoAllocating(false);
    }
  };

  const handleBulkAssign = async () => {
    if (project?.isActive === false) {
      message.warning("This project is inactive. Examiner assignment is not permitted.");
      return;
    }
    if (selectedExaminerIds.length === 0) {
      alert("Please select at least one examiner.");
      return;
    }
    setIsSubmittingBulkAssign(true);
    try {
      const res = await apiCall('/paperexaminers/bulk-assign', {
        method: 'POST',
        body: {
          paperIds: selectedPaperIds,
          examinerIds: selectedExaminerIds,
          projectId: projectId
        }
      });
      alert(res.message);
      setIsBulkAssignModalOpen(false);
      setSelectedExaminerIds([]);
      setSelectedPaperIds([]);
      refreshTable();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmittingBulkAssign(false);
    }
  };

  const SortHeader = ({ label, field, isCenter = false, hasFilter = false, className = '' }) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-3 py-3 cursor-pointer hover:bg-gray-100/80 transition-colors select-none group/header ${isCenter ? 'text-center' : ''} ${className}`}
      >
        <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : ''}`}>
          <span className="whitespace-nowrap">{label}</span>
          <span className="text-[9px] text-gray-400 group-hover/header:text-gray-600 transition-colors">
            {isSorted ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
          </span>
          {hasFilter && (
            <ColumnFilter columnKey={field} currentFilter={filters[field]} setFilter={setFilter} placeholder={`Filter ${label.toLowerCase()}...`} />
          )}
        </div>
      </th>
    );
  };

  const activeTab = searchParams.get('tab') || 'project-dashboard';

  useEffect(() => {
    let tabLabel = 'Project Stats Dashboard';
    let tabIcon = 'Layers';
    if (activeTab === 'papers') { tabLabel = 'Papers & Sections'; tabIcon = 'FileText'; }
    else if (activeTab === 'allocations') { tabLabel = 'Script Allocations'; tabIcon = 'Zap'; }
    else if (activeTab === 'attendance') { tabLabel = 'Attendance & Logs'; tabIcon = 'Zap'; }

    const crumbs = [
      { label: 'Coordinator Dashboard', path: '/coordinator/dashboard', icon: 'LayoutDashboard' },
      { label: 'Project Dashboard', path: `/project-dashboard?projectId=${encryptedProjectId}`, icon: 'Layers' }
    ];
    if (activeTab !== 'project-dashboard') {
      crumbs.push({ label: tabLabel, path: `/project-dashboard?projectId=${encryptedProjectId}&tab=${activeTab}`, icon: tabIcon });
    }
    setBreadcrumb(crumbs);
  }, [encryptedProjectId, activeTab, setBreadcrumb]);

  useEffect(() => {
    if (projectId) {
      fetchProjectStats();
    } else {
      setError(null);
      setLoading(false);
    }
  }, [projectId]);

  const fetchProjectStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const projStats = await apiCall(`/stats/project-counts/${projectId}`);
      
      setProject({
        projectId: projStats.projectId,
        projectName: projStats.projectName,
        description: projStats.description,
        isActive: projStats.isActive !== false
      });

      setStats({
        papersCount: projStats.papersCount,
        totalScripts: projStats.totalScripts,
        pendingScripts: projStats.pendingScripts,
        allocatedScripts: projStats.allocatedScripts,
        completedScripts: projStats.completedScripts,
        unconfiguredPapersCount: projStats.unconfiguredPapersCount || 0,
        completePercentage: projStats.totalScripts > 0 ? Math.round((projStats.completedScripts / projStats.totalScripts) * 100) : 0
      });
    } catch (err) {
      console.error("Failed to load project dashboard stats:", err);
      setError(err.message || "Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent"></div>
        <p className="text-gray-500 font-bold text-xs uppercase tracking-wider animate-pulse">Aggregating Project Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-4 md:px-6 px-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-red-150 text-center p-4 md:p-8">
          <AlertCircle size={40} className="mx-auto text-red-500 mb-4 animate-bounce" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link 
            to="/coordinator/dashboard"
            className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition md:px-6 px-4"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }



  const handleCardClick = (filterVal) => {
    if (filters.statusFilter === filterVal) {
      setFilter('statusFilter', ''); // toggle off
    } else {
      setFilter('statusFilter', filterVal);
    }
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none px-4 py-3 lg:px-8 lg:py-4">
      <div className="w-full space-y-4">
        
        {/* Unified Card Header */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <ProjectConfigHeader 
            completePercentage={stats?.completePercentage || 0}
            initialProjectName={project?.projectName}
            title={
              activeTab === 'papers' ? "Papers & Sections Management" :
              activeTab === 'allocations' ? "Script Allocation" :
              activeTab === 'attendance' ? "Attendance & Logs" :
              "Project Stats Dashboard"
            }
            subtitle={activeTab === 'allocations'}
            titleIcon={
              activeTab === 'papers' ? <FileText size={18} /> :
              (activeTab === 'allocations' || activeTab === 'attendance') ? <Zap size={18} /> :
              <Layers size={18} />
            }
          />
        </div>

        {!projectId ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
            <Layers size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-xl font-black text-gray-900 mb-2">Select a Project</h3>
            <p className="text-sm font-semibold text-gray-500">
              Please select a project from the dropdown above to view its dashboard.
            </p>
          </div>
        ) : (
          <>
            {project?.isActive === false && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Project is Inactive (Read-Only)</p>
                    <p className="text-xs text-amber-700">This project is inactive. No new papers, sections, scripts, or examiner allocations can be added or updated.</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-200 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Inactive
                </span>
              </div>
            )}
            {activeTab === 'project-dashboard' && (
              <>
                {/* Stats Banner */}
                <div className="grid lg:grid-cols-6 gap-3 w-full grid-cols-1 md:grid-cols-2">
            
            {/* Total Papers */}
            <div 
              onClick={() => handleCardClick('')}
              className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 transition-all duration-200 cursor-pointer hover:bg-gray-50 flex flex-col justify-between gap-2 ${
                !filters.statusFilter ? 'bg-teal-50/50 shadow-[inset_0_-2px_0_0_#3b82f6]' : ''
              }`}
            >
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5"> Papers</span>
              <h3 className="text-xl font-black text-gray-900">{stats.papersCount}</h3>
            </div>
            <div className="p-1.5 bg-teal-50 rounded-xl text-teal-700"><FileText size={14} /></div>
          </div>
          
          {(stats.papersCount === 0 || stats.unconfiguredPapersCount > 0) && (hasPermission('CREATE_PAPER') || hasPermission('MANAGE_SECTIONS')) && (
            <Link 
              to={userType === 'admin' 
                ? `/admin/project-dashboard?projectId=${encryptedProjectId}&tab=papers` 
                : `/project-dashboard?projectId=${encryptedProjectId}&tab=papers`}
              onClick={(e) => e.stopPropagation()}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1 mt-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              <Layers size={12} />
              Configure Sections & Papers
            </Link>
          )}
        </div>

        {/* Total Scripts */}
        <div 
          onClick={() => handleCardClick('')}
          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 transition-all duration-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between gap-2 ${
            !filters.statusFilter ? 'bg-teal-50/50 shadow-[inset_0_-2px_0_0_#3b82f6]' : ''
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">Total Scripts</span>
            <h3 className="text-xl font-black text-gray-900">{stats.totalScripts}</h3>
          </div>
          <div className="p-1.5 bg-gray-100 rounded-xl text-gray-600"><BookOpen size={14} /></div>
        </div>

        {/* Pending Allocation */}
        <div 
          onClick={() => handleCardClick('pending')}
          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 transition-all duration-200 cursor-pointer hover:bg-amber-50/30 flex flex-col justify-between gap-2 ${
            filters.statusFilter === 'pending' ? 'bg-amber-50 shadow-[inset_0_-2px_0_0_#f59e0b]' : ''
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">Pending Assign</span>
              <h3 className="text-xl font-black text-amber-600">{stats.pendingScripts}</h3>
            </div>
            <div className="p-1.5 bg-amber-50 rounded-xl text-amber-600"><AlertCircle size={14} /></div>
          </div>
          
          {stats.pendingScripts > 0 && hasPermission('CREATE_ALLOCATION') && (
            <Link 
              to={userType === 'admin' 
                ? `/admin/allocate-scripts?projectId=${encryptedProjectId}` 
                : `/allocate-scripts?projectId=${encryptedProjectId}`}
              onClick={(e) => e.stopPropagation()}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1 mt-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
            >
              <Zap size={12} />
              Allocate Scripts
            </Link>
          )}
        </div>

        {/* In Progress */}
        <div 
          onClick={() => handleCardClick('marking')}
          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 transition-all duration-200 cursor-pointer hover:bg-teal-50/30 flex flex-col justify-between gap-2 ${
            filters.statusFilter === 'marking' ? 'bg-teal-50 shadow-[inset_0_-2px_0_0_#3b82f6]' : ''
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">In Marking</span>
              <h3 className="text-xl font-black text-teal-700">{stats.allocatedScripts}</h3>
            </div>
            <div className="p-1.5 bg-teal-50 rounded-xl text-teal-700"><Clock size={14} /></div>
          </div>

          <Link 
            to={userType === 'admin' 
              ? `/admin/deallocate-scripts?projectId=${encryptedProjectId}` 
              : `/deallocate-scripts?projectId=${encryptedProjectId}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1 mt-1 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <Sliders size={12} />
            Deallocate & Overwrite
          </Link>
        </div>

        {/* Completed */}
        <div 
          onClick={() => handleCardClick('completed')}
          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 transition-all duration-200 cursor-pointer hover:bg-emerald-50/30 flex items-center justify-between gap-2 ${
            filters.statusFilter === 'completed' ? 'bg-emerald-50 shadow-[inset_0_-2px_0_0_#10b981]' : ''
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">Fully </span>
            <h3 className="text-xl font-black text-emerald-600">{stats.completedScripts}</h3>
          </div>
          <div className="p-1.5 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle size={14} /></div>
        </div>

        {/* Unconfigured Sections */}
        <div 
          onClick={() => handleCardClick('unconfigured')}
          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 transition-all duration-200 cursor-pointer hover:bg-rose-50/30 flex items-center justify-between gap-2 ${
            filters.statusFilter === 'unconfigured' ? 'bg-rose-50 shadow-[inset_0_-2px_0_0_#f43f5e]' : ''
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">Unconfigured</span>
            <h3 className="text-xl font-black text-rose-600">{stats.unconfiguredPapersCount}</h3>
          </div>
          <div className="p-1.5 bg-rose-50 rounded-xl text-rose-600"><Layers size={14} /></div>
        </div>

      </div>



      {/* Analytics Tabs and Mappings */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT - Papers & Mapped Details */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/40">
              <div>
                <h3 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-teal-700" />
                  <span> Sections & Papers</span>
                  {filters.statusFilter && (
                    <span className="ml-2 bg-teal-50 px-2.5 py-0.5 rounded-md text-[9px] font-black text-teal-700 uppercase tracking-wide border border-teal-200">
                      Filtered: {filters.statusFilter}
                    </span>
                  )}
                  {activePaper ? (
                    <span className="ml-2 bg-teal-100 text-teal-900 border border-teal-300 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                      Viewing: {activePaper.paperCode}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPaper(null);
                        }}
                        className="hover:text-red-600 transition-colors ml-0.5 cursor-pointer"
                        title="Show overall project stats"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ) : (
                    ""
                  )}
                </h3>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                
                
                {stats.pendingScripts > 0 && project?.isActive !== false && (
                  <button
                    onClick={handleAutoAllocateProject}
                    disabled={isBulkAutoAllocating}
                    className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <Zap size={12} className={isBulkAutoAllocating ? "animate-pulse" : ""} />
                    {isBulkAutoAllocating ? "Allocating..." : "Auto-Allocate All"}
                  </button>
                )}

                {/* Search input */}
                <div className="relative flex items-center bg-white px-3 py-2 rounded-xl border border-gray-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 shadow-sm w-full sm:w-64 min-w-[200px] transition-all">
                  <Search size={14} className="text-gray-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    placeholder="Search papers by name/code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-gray-800 placeholder-gray-400 font-medium text-xs focus:outline-none"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 ml-1">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {tableLoading && papers.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-bold text-xs flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <span>Fetching papers list...</span>
              </div>
            ) : papers.length === 0 ? (
              <div className="p-16 text-center text-gray-405">
                <FileText size={36} className="mx-auto text-gray-200 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">No Papers </p>
                <p className="text-[10px] mt-0.5">Please add and configure papers for this project.</p>
              </div>
            ) : (
              <>
                {/* Standard Centralized Table Pagination (Top) */}
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  setPage={setPage}
                  setPageSize={setPageSize}
                  position="top"
                />

                <div className="overflow-x-auto">
                  <table className=" block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      <tr>

                        <SortHeader label="Code & Name" field="paperCode" hasFilter={true} className="min-w-[130px]" />
                        <SortHeader label="Subject" field="subjectName" hasFilter={true} className="min-w-[90px]" />
                        <SortHeader label="Catch No" field="catchNo" isCenter={true} className="min-w-[70px]" />
                        <SortHeader label="Total" field="totalScripts" isCenter={true} className="min-w-[50px]" />
                        <SortHeader label="Pending" field="pendingScripts" isCenter={true} className="min-w-[50px]" />
                        <SortHeader label="Allocated" field="allocatedScripts" isCenter={true} className="min-w-[55px]" />
                        <SortHeader label="Completed" field="completedScripts" isCenter={true} className="min-w-[55px]" />
                        <SortHeader label="Assigned Examiner" field="examiners" isCenter={true} className="min-w-[140px]" />
                        <th className="sticky right-0 z-20 bg-gray-50 px-3 py-3 text-center w-28 min-w-[110px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-gray-200/80">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                      {papers.map((paper, index) => {
                        const isTopRow = index < 2;
                        const examiners = Array.isArray(paper.assignedExaminers) && paper.assignedExaminers.length > 0 
                          ? paper.assignedExaminers 
                          : (paper.expertsCount > 0 ? [{ id: 1, name: `${paper.expertsCount} Assigned` }] : []);

                        // Determine current pipeline stage
                        let currentStage = 1;
                        const isConfigured = paper.isSectionsConfigured && paper.configuredMarks === paper.maxMarks;
                        const hasExaminers = (paper.expertsCount || 0) > 0;

                        if (isConfigured) {
                          if (!hasExaminers) {
                            currentStage = 2;
                          } else if (paper.pendingScripts > 0) {
                            currentStage = 3;
                          } else if (paper.totalScripts > 0) {
                            currentStage = paper.completedScripts === paper.totalScripts ? 5 : 4;
                          } else {
                            currentStage = 3;
                          }
                        }

                        const isAllocateDisabled = currentStage < 3 || paper.pendingScripts <= 0;
                        const isAssignDisabled = currentStage < 2;

                        return (
                          <tr 
                            key={paper.paperId} 
                            onClick={() => setSelectedPaper(prev => prev?.paperId === paper.paperId ? null : paper)}
                            className={`group transition hover:z-30 cursor-pointer ${activePaper?.paperId === paper.paperId ? 'bg-teal-50/80 border-l-4 border-l-teal-600 shadow-2xs' : 'hover:bg-gray-50/70'}`}
                            title="Click to view charts for this paper"
                          >
                            <td className="px-3 py-2.5">
                              <span className="text-gray-900 font-extrabold">{paper.paperCode}</span>
                              <span className="text-sm text-gray-800 block font-semibold mt-0.5 line-clamp-1">{paper.paperName}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 font-medium">
                              <span className="line-clamp-1">{paper.subjectName}</span>
                            </td>
                            <td className="px-2 py-2.5 text-center text-gray-600 font-mono text-[11px]">{paper.catchNo}</td>
                            <td className="px-2 py-2.5 text-center text-gray-900">{paper.totalScripts}</td>
                            <td className="px-2 py-2.5 text-center text-amber-600">{paper.pendingScripts}</td>
                            <td className="px-2 py-2.5 text-center text-teal-700">{paper.allocatedScripts}</td>
                            <td className="px-2 py-2.5 text-center text-emerald-600">{paper.completedScripts}</td>
                            <td className="px-3 py-2.5 text-center relative hover:z-40 focus-within:z-40">
                              {examiners.length > 0 ? (
                                <div className="relative group/examiners inline-flex items-center gap-1 justify-center">
                                  <span 
                                    className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[10.5px] font-bold max-w-[130px] truncate inline-block cursor-default" 
                                  >
                                    {examiners[0].name || examiners[0].email || `Examiner #${examiners[0].id}`}
                                  </span>
                                  {examiners.length > 1 && (
                                    <span
                                      className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                                    >
                                      +{examiners.length - 1}
                                    </span>
                                  )}

                                  {/* Tooltip popover showing all assigned examiners with avatar, name & email */}
                                  <div
                                    className={`absolute ${isTopRow ? 'top-full mt-2' : 'bottom-full mb-2'} right-0 hidden group-hover/examiners:flex flex-col w-max min-w-[220px] max-w-xs bg-white/95 backdrop-blur-md text-gray-800 rounded-xl shadow-xl shadow-blue-900/10 p-3 border border-gray-200/90 z-50 pointer-events-none text-left animate-in fade-in zoom-in-95 duration-150`}
                                  >
                                    <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-gray-100">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                                        <Users size={12} className="text-teal-600" />
                                        All Assigned Examiners ({examiners.length})
                                      </span>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                      {examiners.map((ex, idx) => {
                                        const exName = ex.name || ex.email || `Examiner #${ex.id}`;
                                        const exEmail = ex.email || '';
                                        const exImg = ex.profileImage || getInitialsAvatar(exName);
                                        return (
                                          <div key={ex.id || idx} className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-gray-50/80 transition-colors">
                                            <img src={exImg} alt="" className="w-6 h-6 rounded-full object-cover border border-teal-200 shadow-2xs shrink-0" />
                                            <div className="min-w-0 flex-1">
                                              <p className="font-bold text-gray-800 truncate text-[11px] leading-tight">
                                                {exName}
                                              </p>
                                              {exEmail && (
                                                <p className="text-[10px] text-gray-500 truncate leading-tight mt-0.5 font-medium">
                                                  {exEmail}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {/* Tooltip arrow */}
                                    <div
                                      className={`absolute ${isTopRow ? 'bottom-full border-b-white drop-shadow-[0_-1px_1px_rgba(0,0,0,0.06)]' : 'top-full border-t-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.06)]'} right-3 border-4 border-transparent`}
                                    ></div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400 font-medium italic">Not Assigned</span>
                              )}
                            </td>
                            <td onClick={(e) => e.stopPropagation()} className={`sticky right-0 z-10 group-hover:z-30 hover:z-30 focus-within:z-30 px-3 py-2.5 text-center whitespace-nowrap w-28 min-w-[110px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-gray-100 ${activePaper?.paperId === paper.paperId ? 'bg-teal-50/80' : 'bg-white group-hover:bg-gray-50'}`}>
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Allocate Scripts Button */}
                                <div className="relative group/tooltip inline-block">
                                  {!isAllocateDisabled ? (
                                    <Link 
                                      to={userType === 'admin'
                                        ? `/admin/allocate-scripts?projectId=${encryptedProjectId}&paperId=${encryptId(paper.paperId)}`
                                        : `/allocate-scripts?projectId=${encryptedProjectId}&paperId=${encryptId(paper.paperId)}`}
                                      
                                      className="p-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-all block shadow-2xs"
                                    >
                                      <Zap size={14} />
                                    </Link>
                                  ) : (
                                    <button
                                      disabled
                                      className="p-1.5 text-gray-300 bg-gray-50 border border-gray-200/60 rounded-lg cursor-not-allowed block shadow-2xs"
                                      
                                    >
                                      <Zap size={14} />
                                    </button>
                                  )}
                                  <div className={`absolute ${isTopRow ? "top-full mt-2" : "bottom-full mb-2"} right-0 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50 pointer-events-none text-left`}>
                                    <div className="font-bold text-gray-100 flex items-center gap-1">
                                      <Zap size={10} className="text-teal-400" /> Allocate Scripts
                                    </div>
                                    <div className="text-[9px] text-gray-300 font-normal mt-0.5">
                                      {!isAllocateDisabled
                                        ? (paper.pendingScripts > 0 ? `Allocate ${paper.pendingScripts} pending script${paper.pendingScripts > 1 ? 's' : ''}` : "Allocate scripts to examiners")
                                        : (currentStage < 3 ? "Complete previous stages first" : "No pending scripts to allocate")}
                                    </div>
                                    <div className={`absolute ${isTopRow ? "bottom-full border-b-gray-900" : "top-full border-t-gray-900"} right-3 border-4 border-transparent`}></div>
                                  </div>
                                </div>

                                {/* Configure Sections Button */}
                                {hasPermission('MANAGE_SECTIONS') && (
                                  <div className="relative group/tooltip inline-block">
                                    <Link 
                                      to={userType === 'admin'
                                        ? `/admin/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`
                                        : `/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`}
                                      
                                      className="p-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-all block shadow-2xs"
                                    >
                                      <Layers size={14} />
                                    </Link>
                                    <div className={`absolute ${isTopRow ? "top-full mt-2" : "bottom-full mb-2"} right-0 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50 pointer-events-none text-left`}>
                                      <div className="font-bold text-gray-100 flex items-center gap-1">
                                        <Layers size={10} className="text-indigo-400" /> {!isConfigured ? "Configure Sections" : "Edit Sections"}
                                      </div>
                                      <div className="text-[9px] text-gray-300 font-normal mt-0.5">
                                        {!isConfigured
                                          ? (!paper.isSectionsConfigured ? "Create sections & set max marks" : `Balance marks: ${paper.configuredMarks}/${paper.maxMarks}`)
                                          : `Sections configured (${paper.configuredMarks} marks)`}
                                      </div>
                                      <div className={`absolute ${isTopRow ? "bottom-full border-b-gray-900" : "top-full border-t-gray-900"} right-3 border-4 border-transparent`}></div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Assign Examiners Button */}
                                {hasPermission('CREATE_ALLOCATION') && (
                                  <div className="relative group/tooltip inline-block">
                                    {!isAssignDisabled ? (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          window.location.href = userType === 'admin' 
                                            ? `/admin/papers?projectId=${encryptedProjectId}&action=assign&paperId=${encryptId(paper.paperId)}`
                                            : `/papers?projectId=${encryptedProjectId}&action=assign&paperId=${encryptId(paper.paperId)}`;
                                        }}
                                        
                                        className="p-1.5 text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 rounded-lg transition-all block shadow-2xs cursor-pointer"
                                      >
                                        <Users size={14} />
                                      </button>
                                    ) : (
                                      <button
                                        disabled
                                        className="p-1.5 text-gray-300 bg-gray-50 border border-gray-200/60 rounded-lg cursor-not-allowed block shadow-2xs"
                                        
                                      >
                                        <Users size={14} />
                                      </button>
                                    )}
                                    <div className={`absolute ${isTopRow ? "top-full mt-2" : "bottom-full mb-2"} right-0 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50 pointer-events-none text-left`}>
                                      <div className="font-bold text-gray-100 flex items-center gap-1">
                                        <Users size={10} className="text-orange-400" /> Assign Examiners
                                      </div>
                                      <div className="text-[9px] text-gray-300 font-normal mt-0.5">
                                        {!isAssignDisabled
                                          ? ((paper.expertsCount || 0) > 0 ? `${paper.expertsCount} examiner${paper.expertsCount > 1 ? 's' : ''} assigned` : "Assign examiners to paper")
                                          : "Configure sections first"}
                                      </div>
                                      <div className={`absolute ${isTopRow ? "bottom-full border-b-gray-900" : "top-full border-t-gray-900"} right-3 border-4 border-transparent`}></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Standard Centralized Table Pagination (outside overflow-x-auto) */}
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  setPage={setPage}
                  setPageSize={setPageSize}
                />
              </>
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT - Interactive Visual Charts & Analytics */}
        <div className="col-span-12 xl:col-span-4 space-y-6">
          {(() => {
            const currentTotal = activePaper ? (activePaper.totalScripts || 0) : stats.totalScripts;
            const currentCompleted = activePaper ? (activePaper.completedScripts || 0) : stats.completedScripts;
            const currentAllocated = activePaper ? (activePaper.allocatedScripts || 0) : stats.allocatedScripts;
            const currentPending = activePaper ? (activePaper.pendingScripts || 0) : stats.pendingScripts;
            const currentPct = currentTotal > 0 ? Math.round((currentCompleted / currentTotal) * 100) : 0;

            return (
              <>
                {/* Chart 1: Script Evaluation Status (Donut Chart) */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 transition-all">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${activePaper ? 'bg-teal-100 text-teal-800' : 'bg-teal-50 text-teal-700'}`}>
                        <PieChart size={15} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider truncate">
                          {activePaper ? `${activePaper.paperCode} Evaluation` : "Evaluation Breakdown"}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-medium truncate">
                          {activePaper ? (activePaper.paperName || activePaper.subjectName) : "Script marking lifecycle"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {activePaper ? (
                        <button
                          onClick={() => setSelectedPaper(null)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition flex items-center gap-1 cursor-pointer"
                          title="Return to overall project stats"
                        >
                          <span>Overall</span>
                          <X size={10} />
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                          Overall
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {currentTotal} Scripts
                      </span>
                    </div>
                  </div>

                  {/* SVG Donut Chart */}
                  <div className="flex flex-col items-center justify-center pt-2 pb-2">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
                        {/* Background track */}
                        <circle
                          cx="60"
                          cy="60"
                          r="48"
                          stroke="#f3f4f6"
                          strokeWidth="12"
                          fill="transparent"
                        />
                        {/* Pending segment (Amber) */}
                        {currentTotal > 0 && currentPending > 0 && (
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            stroke="#f59e0b"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={`${(currentPending / currentTotal) * 301.6} 301.6`}
                            strokeDashoffset={`-${((currentCompleted + currentAllocated) / currentTotal) * 301.6}`}
                            className="transition-all duration-700"
                          />
                        )}
                        {/* In Marking segment (Teal) */}
                        {currentTotal > 0 && currentAllocated > 0 && (
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            stroke="#0d9488"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={`${(currentAllocated / currentTotal) * 301.6} 301.6`}
                            strokeDashoffset={`-${(currentCompleted / currentTotal) * 301.6}`}
                            className="transition-all duration-700"
                          />
                        )}
                        {/* Completed segment (Emerald) */}
                        {currentTotal > 0 && currentCompleted > 0 && (
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            stroke="#10b981"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={`${(currentCompleted / currentTotal) * 301.6} 301.6`}
                            strokeDashoffset="0"
                            className="transition-all duration-700"
                          />
                        )}
                      </svg>
                      {/* Center text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                          {currentPct}%
                        </span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-wider">
                          Completed
                        </span>
                      </div>
                    </div>

                    {/* Legend items */}
                    <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center">
                      <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
                        </div>
                        <span className="text-sm font-black text-emerald-900 mt-0.5 block">{currentCompleted}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-teal-50/50 border border-teal-100">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-teal-800">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span> In Marking
                        </div>
                        <span className="text-sm font-black text-teal-900 mt-0.5 block">{currentAllocated}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-800">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Pending
                        </div>
                        <span className="text-sm font-black text-amber-900 mt-0.5 block">{currentPending}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
              </>
            )}

            {activeTab === 'papers' && <PapersManagement isTab={true} />}
            {activeTab === 'allocations' && <ScriptAllocation isTab={true} />}
            {activeTab === 'attendance' && <Attendance isTab={true} />}
          </>
        )}
      </div>
    </div>
  );
}
