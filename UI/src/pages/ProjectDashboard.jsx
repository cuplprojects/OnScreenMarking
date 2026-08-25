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
  Search
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

  const SortHeader = ({ label, field, isCenter = false, hasFilter = false }) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-5 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group/header ${isCenter ? 'text-center' : ''}`}
      >
        <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : ''}`}>
          <span>{label}</span>
          <span className="text-[9px] text-slate-400 group-hover/header:text-slate-600 transition-colors">
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
      const papersData = await apiCall(`/papers?projectId=${projectId}`);
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-650 border-t-transparent"></div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider animate-pulse">Aggregating Project Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md w-full border border-red-150 text-center">
          <AlertCircle size={40} className="mx-auto text-red-500 mb-4 animate-bounce" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <Link 
            to="/coordinator/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition"
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
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full flex flex-col">
      
      {/* Unified Full-Width Header */}
      <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-6 mb-6 shadow-sm">
        <ProjectConfigHeader />
      </div>

      <div className="px-6 lg:px-10 flex-1">
      {/* Stats Banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        
        {/* Total Papers */}
        <div 
          onClick={() => handleCardClick('')}
          className={`flex-1 p-5 transition-all duration-200 cursor-pointer hover:bg-slate-50 flex flex-col justify-between gap-3 ${
            !filters.statusFilter ? 'bg-blue-50/50 shadow-[inset_0_-2px_0_0_#3b82f6]' : ''
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1"> Papers</span>
              <h3 className="text-2xl font-black text-slate-900">{stats.papersCount}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><FileText size={16} /></div>
          </div>
          
          <Link 
            to={userType === 'admin' 
              ? `/admin/papers?projectId=${encryptedProjectId}` 
              : `/papers?projectId=${encryptedProjectId}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 mt-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <Layers size={12} />
            Configure Subject & Papers
          </Link>
        </div>

        {/* Total Scripts */}
        <div 
          onClick={() => handleCardClick('')}
          className={`flex-1 p-5 transition-all duration-200 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3 ${
            !filters.statusFilter ? 'bg-blue-50/50 shadow-[inset_0_-2px_0_0_#3b82f6]' : ''
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Total Scripts</span>
            <h3 className="text-2xl font-black text-slate-900">{stats.totalScripts}</h3>
          </div>
          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600"><BookOpen size={16} /></div>
        </div>

        {/* Pending Allocation */}
        <div 
          onClick={() => handleCardClick('pending')}
          className={`flex-1 p-5 transition-all duration-200 cursor-pointer hover:bg-amber-50/30 flex flex-col justify-between gap-3 ${
            filters.statusFilter === 'pending' ? 'bg-amber-50 shadow-[inset_0_-2px_0_0_#f59e0b]' : ''
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Pending Assign</span>
              <h3 className="text-2xl font-black text-amber-600">{stats.pendingScripts}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600"><AlertCircle size={16} /></div>
          </div>
          
          <Link 
            to={userType === 'admin' 
              ? `/admin/allocate-scripts?projectId=${encryptedProjectId}` 
              : `/allocate-scripts?projectId=${encryptedProjectId}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 mt-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <Zap size={12} />
            Allocate Scripts
          </Link>
        </div>

        {/* In Progress */}
        <div 
          onClick={() => handleCardClick('marking')}
          className={`flex-1 p-5 transition-all duration-200 cursor-pointer hover:bg-blue-50/30 flex items-center justify-between gap-3 ${
            filters.statusFilter === 'marking' ? 'bg-blue-50 shadow-[inset_0_-2px_0_0_#3b82f6]' : ''
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">In Marking</span>
            <h3 className="text-2xl font-black text-blue-600">{stats.allocatedScripts}</h3>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Clock size={16} /></div>
        </div>

        {/* Completed */}
        <div 
          onClick={() => handleCardClick('completed')}
          className={`flex-1 p-5 transition-all duration-200 cursor-pointer hover:bg-emerald-50/30 flex items-center justify-between gap-3 ${
            filters.statusFilter === 'completed' ? 'bg-emerald-50 shadow-[inset_0_-2px_0_0_#10b981]' : ''
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Fully </span>
            <h3 className="text-2xl font-black text-emerald-600">{stats.completedScripts}</h3>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle size={16} /></div>
        </div>

        {/* Unconfigured Sections */}
        <div 
          onClick={() => handleCardClick('unconfigured')}
          className={`flex-1 p-5 transition-all duration-200 cursor-pointer hover:bg-rose-50/30 flex items-center justify-between gap-3 ${
            filters.statusFilter === 'unconfigured' ? 'bg-rose-50 shadow-[inset_0_-2px_0_0_#f43f5e]' : ''
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Unconfigured</span>
            <h3 className="text-2xl font-black text-rose-600">{stats.unconfiguredPapersCount}</h3>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600"><Layers size={16} /></div>
        </div>

      </div>

      {/* Progress Ratio Bar Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Project Completion Status</h3>
            <p className="text-[10px] text-slate-500">Overall ratio of completed script evaluations against total system scripts</p>
          </div>
          <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg">
            {stats.completePercentage}% Complete
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-500 to-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${stats.completePercentage}%` }}
          />
        </div>
      </div>

      {/* Analytics Tabs and Mappings */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT - Papers & Mapped Details */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/40">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-blue-600" />
                  <span> Subject Papers</span>
                  {filters.statusFilter && (
                    <span className="ml-2 bg-blue-55 px-2.5 py-0.5 rounded-full text-[9px] font-black text-blue-755 uppercase tracking-wide border border-blue-155">
                      Filtered: {filters.statusFilter}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-500">Subject configurations, paper code, max marks, and map progress</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {selectedPaperIds.length > 0 && (
                  <button 
                    onClick={() => setIsBulkAssignModalOpen(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all whitespace-nowrap"
                  >
                    Bulk Assign ({selectedPaperIds.length})
                  </button>
                )}
                
                <button
                  onClick={handleAutoAllocateProject}
                  disabled={isBulkAutoAllocating}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Zap size={12} className={isBulkAutoAllocating ? "animate-pulse" : ""} />
                  {isBulkAutoAllocating ? "Allocating..." : "Auto-Allocate All"}
                </button>

                {/* Search input */}
                <div className="max-w-xs flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-205 w-full shrink-0 shadow-sm">
                  <Search size={12} className="text-slate-405" />
                  <input
                    type="text"
                    placeholder="Search papers by name/code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-[10px] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {tableLoading && papers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span>Fetching papers list...</span>
              </div>
            ) : papers.length === 0 ? (
              <div className="p-16 text-center text-slate-405">
                <FileText size={36} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">No Papers </p>
                <p className="text-[10px] mt-0.5">Please add and configure papers for this project.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[950px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 w-10 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={papers.length > 0 && selectedPaperIds.length === papers.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <SortHeader label="Code & Name" field="paperCode" hasFilter={true} />
                      <SortHeader label="Subject" field="subjectName" hasFilter={true} />
                      <SortHeader label="Catch Number" field="catchNo" />
                      <SortHeader label="Total" field="totalScripts" isCenter={true} />
                      <SortHeader label="Pending" field="pendingScripts" isCenter={true} />
                      <SortHeader label="Allocated" field="allocatedScripts" isCenter={true} />
                      <SortHeader label="Completed" field="completedScripts" isCenter={true} />
                      <th className="px-5 py-3.5 text-center">Stage</th>
                      <th className="px-5 py-3.5 text-right w-[240px] min-w-[240px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
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
                          stageColor = "bg-blue-50 text-blue-700 border-blue-200";
                        } else if (paper.totalScripts > 0) {
                          currentStage = 4;
                          stageText = "4. In Progress/Done";
                          stageColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        } else {
                          currentStage = 3;
                          stageText = "Awaiting Scripts";
                          stageColor = "bg-slate-50 text-slate-600 border-slate-200";
                        }
                      }

                      const isAllocateDisabled = currentStage < 3 || paper.pendingScripts <= 0;
                      const isAssignDisabled = currentStage < 2;

                      return (
                        <tr key={paper.paperId} className={`transition ${selectedPaperIds.includes(paper.paperId) ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                          <td className="px-5 py-4 text-center">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              checked={selectedPaperIds.includes(paper.paperId)}
                              onChange={() => handleSelectPaper(paper.paperId)}
                            />
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-slate-900 font-extrabold">{paper.paperCode}</span>
                            <span className="text-[10px] text-slate-505 block font-medium mt-0.5">{paper.paperName}</span>
                          </td>
                          <td className="px-5 py-4 text-slate-600 font-medium">{paper.subjectName}</td>
                          <td className="px-5 py-4 text-slate-550 font-mono text-[11px]">{paper.catchNo || 'N/A'}</td>
                          <td className="px-5 py-4 text-center text-slate-900">{paper.totalScripts}</td>
                          <td className="px-5 py-4 text-center text-amber-600">{paper.pendingScripts}</td>
                          <td className="px-5 py-4 text-center text-blue-600">{paper.allocatedScripts}</td>
                          <td className="px-5 py-4 text-center text-emerald-600">{paper.completedScripts}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-bold border ${stageColor}`}>
                              {stageText}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Allocate Button */}
                              {!isAllocateDisabled ? (
                                <Link 
                                  to={userType === 'admin'
                                    ? `/admin/allocate-scripts?projectId=${encryptedProjectId}&paperId=${paper.paperId}`
                                    : `/allocate-scripts?projectId=${encryptedProjectId}&paperId=${paper.paperId}`}
                                  className="inline-flex items-center gap-1 bg-blue-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-sm"
                                >
                                  <Zap size={10} />
                                  Allocate
                                </Link>
                              ) : (
                                <button
                                  disabled
                                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg cursor-not-allowed border border-slate-200"
                                  title={currentStage < 3 ? "Complete previous stages first" : "No scripts pending"}
                                >
                                  <Zap size={10} />
                                  Allocate
                                </button>
                              )}

                              {/* Configure Sections Button */}
                              <Link 
                                to={userType === 'admin'
                                  ? `/admin/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`
                                  : `/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`}
                                className={`inline-flex items-center gap-1 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all duration-200 shadow-sm ${
                                  !isConfigured
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                <Layers size={10} />
                                {!isConfigured ? 'Config Sections' : 'Edit Sections'}
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
                                  className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all duration-200 shadow-sm"
                                >
                                  <Users size={10} />
                                  Assign Examiner
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg cursor-not-allowed border border-slate-200"
                                  title="Configure sections first"
                                >
                                  <Users size={10} />
                                  Assign Examiner
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Standard Centralized Table Pagination */}
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

        {/* RIGHT COMPONENT - Assigned Examiners */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Users size={15} className="text-blue-650" />
                  <span>Assigned Examiners Stats</span>
                </h3>
                <p className="text-[10px] text-slate-500">Active evaluators allocated to scripts within this project</p>
              </div>
              {/* Examiner Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={examinerStatusFilter}
                  onChange={(e) => {
                    setExaminerStatusFilter(e.target.value);
                    setExaminerPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Free">Free</option>
                  <option value="Busy">Busy</option>
                </select>
                <div className="max-w-[150px] flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-full shrink-0">
                  <Search size={10} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search examiners..."
                    value={examinerSearch}
                    onChange={(e) => {
                      setExaminerSearch(e.target.value);
                      setExaminerPage(1);
                    }}
                    className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-[9px] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {examinersLoading ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-650 border-t-transparent"></div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Loading Examiners...</p>
              </div>
            ) : paginatedExaminersList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl">
                <Users size={28} className="mx-auto text-slate-200 mb-1.5" />
                <p className="text-[9px] font-bold uppercase tracking-wider">No Evaluators Mapping</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedExaminersList.map((ex) => (
                  <div key={ex.id} className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-900 tracking-tight text-xs block">{ex.name}</span>
                      <span className="text-[9px] text-slate-400 font-bold block">{ex.email}</span>
                      {ex.subjectExpertise && (
                        <span className="text-[9px] text-blue-600 font-bold block mt-1">
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
                      <span className="text-[9px] text-slate-400 block font-bold">
                         <span className="text-slate-900 font-extrabold">{ex.projectAllocatedCount}</span> scripts
                      </span>
                    </div>
                  </div>
                ))}

                {/* Examiner Pagination Controls */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 select-none">
                  <span className="text-[9px] font-bold text-slate-400">
                    Page {examinerPage} of {totalExaminerPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExaminerPage(p => Math.max(1, p - 1))}
                      disabled={examinerPage === 1}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[9px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setExaminerPage(p => Math.min(totalExaminerPages, p + 1))}
                      disabled={examinerPage >= totalExaminerPages}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[9px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                Bulk Assign Examiners
              </h2>
              <button 
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-slate-600 font-medium mb-4">
                Select examiners to assign to the <span className="font-bold text-slate-900">{selectedPaperIds.length}</span> selected papers.
              </p>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search examiners..."
                  value={examinerSearch}
                  onChange={(e) => setExaminerSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="space-y-2 border border-slate-200 rounded-xl max-h-[300px] overflow-y-auto p-2">
                {paginatedExaminersList.map(examiner => (
                  <label key={examiner.examinerId} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${selectedExaminerIds.includes(examiner.examinerId) ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox"
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                      <p className="text-sm font-bold text-slate-900">{examiner.examinerName || `Examiner ${examiner.examinerId}`}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ID: {examiner.examinerId}</p>
                    </div>
                  </label>
                ))}
                
                {paginatedExaminersList.length === 0 && (
                  <p className="p-4 text-center text-sm font-medium text-slate-500">No examiners found.</p>
                )}
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkAssign}
                disabled={isSubmittingBulkAssign || selectedExaminerIds.length === 0}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
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
