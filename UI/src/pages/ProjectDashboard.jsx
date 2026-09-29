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
  X
} from 'lucide-react';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { decryptId, encryptId } from '../utils/encryption';
import apiCall from '../services/api';
import ProjectConfigHeader from '../components/ProjectConfigHeader';
import ColumnFilter from '../components/ColumnFilter';

export default function ProjectDashboard() {
  const [searchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get('projectId');
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  
  const { userType, universityId: userUniversityId } = useAuth();
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
      const pageSizeVal = params.pageSize || 10;
      const sortFieldVal = params.sortField || '';
      const sortOrderVal = params.sortOrder || '';
      const statusFilterVal = params.statusFilter || '';
      return apiCall(`/papers/dashboard-stats?projectId=${projectId}&page=${pageVal}&pageSize=${pageSizeVal}&search=${searchVal}&sortField=${sortFieldVal}&sortOrder=${sortOrderVal}&statusFilter=${statusFilterVal}`);
    }
    return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 1 });
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
    initialParams: { pageSize: 10 }
  });

  const fetchExaminersFn = useCallback((params) => {
    if (projectId) {
      const searchVal = params.search || '';
      const pageVal = params.page || 1;
      const pageSizeVal = params.pageSize || 5;
      const statusFilterVal = params.statusFilter || 'All';
      return apiCall(`/users/project-examiners/${projectId}?page=${pageVal}&pageSize=${pageSizeVal}&search=${searchVal}&statusFilter=${statusFilterVal}`);
    }
    return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 5, totalPages: 1 });
  }, [projectId]);

  const {
    items: paginatedExaminersList,
    totalCount: totalExaminers,
    totalPages: totalExaminerPages,
    page: examinerPage,
    setPage: setExaminerPage,
    search: examinerSearch,
    setSearch: setExaminerSearch,
    filters: examinerFilters,
    setFilter: setExaminerFilter,
    loading: examinersLoading
  } = useTable({
    fetchFn: fetchExaminersFn,
    initialParams: { pageSize: 5 }
  });

  const examinerStatusFilter = examinerFilters.statusFilter || 'All';
  const setExaminerStatusFilter = (val) => setExaminerFilter('statusFilter', val);

  // Bulk Actions State
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [selectedExaminerIds, setSelectedExaminerIds] = useState([]);
  const [isSubmittingBulkAssign, setIsSubmittingBulkAssign] = useState(false);
  const [isBulkAutoAllocating, setIsBulkAutoAllocating] = useState(false);

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
    if (!window.confirm("This will automatically distribute all pending scripts across all configured papers evenly among their assigned examiners. Proceed?")) return;
    setIsBulkAutoAllocating(true);
    try {
      const res = await apiCall(`/allocations/project/${projectId}/auto-allocate`, { method: 'POST' });
      alert(res.message);
      refreshTable();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsBulkAutoAllocating(false);
    }
  };

  const handleBulkAssign = async () => {
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
          examinerIds: selectedExaminerIds
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

  useEffect(() => {
    setBreadcrumb([
      { label: 'Coordinator Dashboard', path: '/coordinator/dashboard', icon: 'LayoutDashboard' },
      { label: 'Project Stats Dashboard', path: `/project-dashboard?projectId=${encryptedProjectId}`, icon: 'Layers' }
    ]);
  }, [encryptedProjectId]);

  useEffect(() => {
    if (projectId) {
      fetchProjectStats();
    } else {
      setError("No project ID specified.");
      setLoading(false);
    }
  }, [projectId]);

  const fetchProjectStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get Current Coordinator's University & Projects
      const uniData = await apiCall('/universities/current/my-university');
      const foundProject = (uniData.projects || []).find(p => p.projectId.toString() === projectId.toString());
      
      if (!foundProject) {
        throw new Error("Project not found or you do not have permission to view it.");
      }
      setProject(foundProject);

      // 2. Fetch stats
      const countsData = await apiCall(`/stats/counts?universityId=${uniData.universityId}`);
      const projStats = (countsData.projects || []).find(p => p.projectId.toString() === projectId.toString()) || {
        papersCount: 0,
        totalScripts: 0,
        pendingScripts: 0,
        allocatedScripts: 0,
        completedScripts: 0
      };

      setStats({
        papersCount: projStats.papersCount,
        totalScripts: projStats.totalScripts,
        pendingScripts: projStats.pendingScripts,
        allocatedScripts: projStats.allocatedScripts,
        completedScripts: projStats.completedScripts,
        unconfiguredPapersCount: projStats.unconfiguredPapersCount || 0,
        completePercentage: projStats.totalScripts > 0 ? Math.round((projStats.completedScripts / projStats.totalScripts) * 100) : 0
      });

      // 3. Fetch papers to get project paper IDs for workloads
      const papersResponse = await apiCall(`/papers?projectId=${projectId}&pageSize=100`);
      const papersData = papersResponse?.items || papersResponse || [];
      const projPaperIds = (papersData || []).map(p => p.paperId);

      // Manual examiner logic removed, using useTable hook below
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-4">
        <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full border border-red-150 text-center">
          <AlertCircle size={40} className="mx-auto text-red-500 mb-4 animate-bounce" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link 
            to="/coordinator/dashboard"
            className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition"
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
          <ProjectConfigHeader completePercentage={stats.completePercentage} />
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 w-full">
        
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
          
          <Link 
            to={userType === 'admin' 
              ? `/admin/papers?projectId=${encryptedProjectId}` 
              : `/papers?projectId=${encryptedProjectId}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1 mt-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <Layers size={12} />
            Configure Subject & Papers
          </Link>
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
        </div>

        {/* In Progress */}
        <div 
          onClick={() => handleCardClick('marking')}
          className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 transition-all duration-200 cursor-pointer hover:bg-teal-50/30 flex items-center justify-between gap-2 ${
            filters.statusFilter === 'marking' ? 'bg-teal-50 shadow-[inset_0_-2px_0_0_#3b82f6]' : ''
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-0.5">In Marking</span>
            <h3 className="text-xl font-black text-teal-700">{stats.allocatedScripts}</h3>
          </div>
          <div className="p-1.5 bg-teal-50 rounded-xl text-teal-700"><Clock size={14} /></div>
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
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/40">
              <div>
                <h3 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-teal-700" />
                  <span> Subject Papers</span>
                  {filters.statusFilter && (
                    <span className="ml-2 bg-teal-50 px-2.5 py-0.5 rounded-md text-[9px] font-black text-teal-700 uppercase tracking-wide border border-teal-200">
                      Filtered: {filters.statusFilter}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-gray-500">Subject configurations, paper code, max marks, and map progress</p>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                {selectedPaperIds.length > 0 && (
                  <button 
                    onClick={() => setIsBulkAssignModalOpen(true)}
                    className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm transition-all whitespace-nowrap"
                  >
                    Bulk Assign ({selectedPaperIds.length})
                  </button>
                )}
                
                <button
                  onClick={handleAutoAllocateProject}
                  disabled={isBulkAutoAllocating}
                  className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Zap size={12} className={isBulkAutoAllocating ? "animate-pulse" : ""} />
                  {isBulkAutoAllocating ? "Allocating..." : "Auto-Allocate All"}
                </button>

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
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      <tr>
                        <th className="px-3 py-3 w-8 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 cursor-pointer"
                            checked={papers.length > 0 && selectedPaperIds.length === papers.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <SortHeader label="Code & Name" field="paperCode" hasFilter={true} className="min-w-[130px]" />
                        <SortHeader label="Subject" field="subjectName" hasFilter={true} className="min-w-[90px]" />
                        <SortHeader label="Catch No" field="catchNo" isCenter={true} className="min-w-[70px]" />
                        <SortHeader label="Total" field="totalScripts" isCenter={true} className="min-w-[50px]" />
                        <SortHeader label="Pending" field="pendingScripts" isCenter={true} className="min-w-[50px]" />
                        <SortHeader label="Allocated" field="allocatedScripts" isCenter={true} className="min-w-[55px]" />
                        <SortHeader label="Completed" field="completedScripts" isCenter={true} className="min-w-[55px]" />
                        <th className="px-2.5 py-3 text-center min-w-[90px]">Stage</th>
                        <th className="sticky right-0 z-20 bg-gray-50 px-3 py-3 text-center min-w-[210px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-gray-200/80">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                      {papers.map((paper) => {
                        // Determine current pipeline stage
                        let currentStage = 1;
                        let stageText = "1. Config Sections";
                        let stageColor = "bg-rose-50 text-rose-700 border-rose-200";

                        const isConfigured = paper.isSectionsConfigured && paper.configuredMarks === paper.maxMarks;
                        const hasExaminers = (paper.expertsCount || 0) > 0;

                        if (isConfigured) {
                          if (!hasExaminers) {
                            currentStage = 2;
                            stageText = "2. Assign Examiners";
                            stageColor = "bg-amber-50 text-amber-700 border-amber-200";
                          } else if (paper.pendingScripts > 0) {
                            currentStage = 3;
                            stageText = "3. Allocate Scripts";
                            stageColor = "bg-teal-50 text-teal-700 border-teal-200";
                          } else if (paper.totalScripts > 0) {
                            currentStage = 4;
                            stageText = "4. In Progress/Done";
                            stageColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                          } else {
                            currentStage = 3;
                            stageText = "Awaiting Scripts";
                            stageColor = "bg-gray-50 text-gray-600 border-gray-200";
                          }
                        }

                        const isAllocateDisabled = currentStage < 3 || paper.pendingScripts <= 0;
                        const isAssignDisabled = currentStage < 2;

                        return (
                          <tr key={paper.paperId} className={`group transition ${selectedPaperIds.includes(paper.paperId) ? 'bg-teal-50/40' : 'hover:bg-gray-50/60'}`}>
                            <td className="px-3 py-2.5 text-center">
                              <input 
                                type="checkbox" 
                                className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 cursor-pointer"
                                checked={selectedPaperIds.includes(paper.paperId)}
                                onChange={() => handleSelectPaper(paper.paperId)}
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-gray-900 font-extrabold">{paper.paperCode}</span>
                              <span className="text-[10px] text-gray-500 block font-medium mt-0.5 line-clamp-1">{paper.paperName}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 font-medium">
                              <span className="line-clamp-1">{paper.subjectName}</span>
                            </td>
                            <td className="px-2 py-2.5 text-center text-gray-600 font-mono text-[11px]">{paper.catchNo || 'N/A'}</td>
                            <td className="px-2 py-2.5 text-center text-gray-900">{paper.totalScripts}</td>
                            <td className="px-2 py-2.5 text-center text-amber-600">{paper.pendingScripts}</td>
                            <td className="px-2 py-2.5 text-center text-teal-700">{paper.allocatedScripts}</td>
                            <td className="px-2 py-2.5 text-center text-emerald-600">{paper.completedScripts}</td>
                            <td className="px-2 py-2.5 text-center">
                              <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold border whitespace-nowrap ${stageColor}`}>
                                {stageText}
                              </span>
                            </td>
                            <td className={`sticky right-0 z-10 px-3 py-2.5 text-center whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-gray-100 ${selectedPaperIds.includes(paper.paperId) ? 'bg-[#f4f8fc]' : 'bg-white group-hover:bg-gray-50'}`}>
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Allocate Button */}
                                {!isAllocateDisabled ? (
                                  <Link 
                                    to={userType === 'admin'
                                      ? `/admin/allocate-scripts?projectId=${encryptedProjectId}&paperId=${paper.paperId}`
                                      : `/allocate-scripts?projectId=${encryptedProjectId}&paperId=${paper.paperId}`}
                                    title="Allocate Scripts"
                                    className="inline-flex items-center gap-1 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-md shadow-sm transition-all"
                                  >
                                    <Zap size={11} />
                                    <span>Allocate</span>
                                  </Link>
                                ) : (
                                  <button
                                    disabled
                                    className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 font-extrabold text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-md cursor-not-allowed border border-gray-200"
                                    title={currentStage < 3 ? "Complete previous stages first" : "No scripts pending"}
                                  >
                                    <Zap size={11} />
                                    <span>Allocate</span>
                                  </button>
                                )}

                                {/* Configure Sections Button */}
                                <Link 
                                  to={userType === 'admin'
                                    ? `/admin/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`
                                    : `/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`}
                                  title={!isConfigured ? 'Configure Sections' : 'Edit Sections'}
                                  className={`inline-flex items-center gap-1 font-extrabold text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-md transition-all duration-200 shadow-sm ${
                                    !isConfigured
                                      ? 'bg-teal-700 hover:bg-teal-800 text-white'
                                      : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
                                  }`}
                                >
                                  <Layers size={11} />
                                  <span>Sections</span>
                                </Link>
                                
                                {/* Assign Examiner Button */}
                                {!isAssignDisabled ? (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      window.location.href = userType === 'admin' 
                                        ? `/admin/papers?projectId=${encryptedProjectId}&action=assign&paperId=${paper.paperId}`
                                        : `/papers?projectId=${encryptedProjectId}&action=assign&paperId=${paper.paperId}`;
                                    }}
                                    title="Assign Examiners"
                                    className="inline-flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-extrabold text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-md transition-all duration-200 shadow-sm"
                                  >
                                    <Users size={11} />
                                    <span>Assign</span>
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 font-extrabold text-[9px] uppercase tracking-wider px-2 py-1.5 rounded-md cursor-not-allowed border border-gray-200"
                                    title="Configure sections first"
                                  >
                                    <Users size={11} />
                                    <span>Assign</span>
                                  </button>
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

        {/* RIGHT COMPONENT - Assigned Examiners */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                  <Users size={15} className="text-teal-600" />
                  <span>Assigned Examiners Stats</span>
                </h3>
                <p className="text-[10px] text-gray-500">Active evaluators allocated to scripts within this project</p>
              </div>
              {/* Examiner Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={examinerStatusFilter}
                  onChange={(e) => {
                    setExaminerStatusFilter(e.target.value);
                    setExaminerPage(1);
                  }}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-[10px] font-bold px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Free">Free</option>
                  <option value="Busy">Busy</option>
                </select>
                <div className="max-w-[150px] flex items-center gap-2 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200 w-full shrink-0">
                  <Search size={10} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search examiners..."
                    value={examinerSearch}
                    onChange={(e) => {
                      setExaminerSearch(e.target.value);
                      setExaminerPage(1);
                    }}
                    className="w-full bg-transparent text-gray-800 placeholder-gray-400 font-semibold text-[9px] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {examinersLoading ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent"></div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Loading Examiners...</p>
              </div>
            ) : paginatedExaminersList.length === 0 ? (
              <div className="p-12 text-center text-gray-400 border border-dashed border-gray-150 rounded-xl">
                <Users size={28} className="mx-auto text-gray-200 mb-1.5" />
                <p className="text-[9px] font-bold uppercase tracking-wider">No Evaluators Mapping</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedExaminersList.map((ex) => (
                  <div key={ex.id} className="bg-gray-50/50 border border-gray-100 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-gray-900 tracking-tight text-xs block">{ex.name}</span>
                      <span className="text-[9px] text-gray-400 font-bold block">{ex.email}</span>
                      {ex.subjectExpertise && (
                        <span className="text-[9px] text-teal-700 font-bold block mt-1">
                          <BookOpen size={10} className="inline mr-1" />
                          {ex.subjectExpertise}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider mb-1 ${
                        ex.workload === 'Free' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {ex.workload}
                      </span>
                      <span className="text-[9px] text-gray-400 block font-bold">
                         <span className="text-gray-900 font-extrabold">{ex.projectAllocatedCount}</span> scripts
                      </span>
                    </div>
                  </div>
                ))}

                {/* Examiner Pagination Controls */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 select-none">
                  <span className="text-[9px] font-bold text-gray-400">
                    Page {examinerPage} of {totalExaminerPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExaminerPage(p => Math.max(1, p - 1))}
                      disabled={examinerPage === 1}
                      className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[9px] font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setExaminerPage(p => Math.min(totalExaminerPages, p + 1))}
                      disabled={examinerPage >= totalExaminerPages}
                      className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-[9px] font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
      </div>
      
      {/* Bulk Assign Modal */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Users size={20} className="text-teal-700" />
                Bulk Assign Examiners
              </h2>
              <button 
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 font-medium mb-4">
                Select examiners to assign to the <span className="font-bold text-gray-900">{selectedPaperIds.length}</span> selected papers.
              </p>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search examiners..."
                  value={examinerSearch}
                  onChange={(e) => setExaminerSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                />
              </div>

              <div className="space-y-2 border border-gray-200 rounded-xl max-h-[300px] overflow-y-auto p-2">
                {paginatedExaminersList.map(examiner => (
                  <label key={examiner.examinerId} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${selectedExaminerIds.includes(examiner.examinerId) ? 'bg-teal-50 border-teal-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                    <input 
                      type="checkbox"
                      className="rounded border-gray-300 text-teal-700 focus:ring-teal-500"
                      checked={selectedExaminerIds.includes(examiner.examinerId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedExaminerIds(prev => [...prev, examiner.examinerId]);
                        } else {
                          setSelectedExaminerIds(prev => prev.filter(id => id !== examiner.examinerId));
                        }
                      }}
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{examiner.examinerName || `Examiner ${examiner.examinerId}`}</p>
                      <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">ID: {examiner.examinerId}</p>
                    </div>
                  </label>
                ))}
                
                {paginatedExaminersList.length === 0 && (
                  <p className="p-4 text-center text-sm font-medium text-gray-500">No examiners found.</p>
                )}
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="px-5 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkAssign}
                disabled={isSubmittingBulkAssign || selectedExaminerIds.length === 0}
                className="px-6 py-2 rounded-md text-sm font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingBulkAssign ? 'Assigning...' : `Assign ${selectedExaminerIds.length} Examiners`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

