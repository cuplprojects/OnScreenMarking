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
  const [examiners, setExaminers] = useState([]);
  const [examinerSearch, setExaminerSearch] = useState('');
  const [examinerPage, setExaminerPage] = useState(1);
  const examinerPageSize = 5;
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

      // 4. Fetch Allocations to calculate examiner details
      let allocationsData = [];
      try {
        allocationsData = await apiCall('/allocation');
      } catch (err) {
        console.error("Failed to load allocations:", err);
      }

      // 5. Fetch Examiners and filter workload specifically for this project's scripts
      const usersData = await apiCall(`/users?universityId=${uniData.universityId}`);
      const examinersList = (usersData || []).filter(u => u.userType?.toLowerCase() === 'examiner');

      const examinersWithWorkload = examinersList.map(ex => {
        const examinerAllocations = allocationsData.filter(
          a => (a.examinerId === ex.id || a.allocatedUserId === ex.id)
        );
        
        // Find allocations specific to this project's papers
        const projAllocations = examinerAllocations.filter(a => projPaperIds.includes(a.paperId));

        let workload = 'Free';
        if (examinerAllocations.length > 20) workload = 'Fully Allocated';
        else if (examinerAllocations.length > 0) workload = 'Partially Allocated';

        return {
          ...ex,
          allocatedCount: examinerAllocations.length,
          projectAllocatedCount: projAllocations.length,
          workload
        };
      }).filter(ex => ex.projectAllocatedCount > 0 || ex.allocatedCount >= 0); // Include active or available examiners

      setExaminers(examinersWithWorkload);

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
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-650 border-t-transparent"></div>
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
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filteredExaminersList = examiners.filter(ex => 
    ex.name?.toLowerCase().includes(examinerSearch.toLowerCase()) ||
    ex.email?.toLowerCase().includes(examinerSearch.toLowerCase())
  );
  
  const totalExaminerPages = Math.ceil(filteredExaminersList.length / examinerPageSize) || 1;
  const paginatedExaminersList = filteredExaminersList.slice(
    (examinerPage - 1) * examinerPageSize,
    examinerPage * examinerPageSize
  );

  const SortHeader = ({ label, field, isCenter = false }) => {
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
        </div>
      </th>
    );
  };

  const handleCardClick = (filterVal) => {
    if (filters.statusFilter === filterVal) {
      setFilter('statusFilter', ''); // toggle off
    } else {
      setFilter('statusFilter', filterVal);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full px-6 lg:px-10">
      
      {/* Header with Navigation */}
      <div className="pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <Link 
              to="/coordinator/dashboard" 
              className="p-2.5 hover:bg-slate-105 rounded-xl border border-slate-150 bg-slate-50 text-slate-600 transition"
              title="Return to Coordinator Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[8px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                  Evaluation Control Panel
                </span>
              </div>
              <h1 className="text-lg font-black text-slate-900 mt-1 leading-tight">{project?.projectName}</h1>
              <p className="text-slate-500 text-xs mt-0.5">Comprehensive real-time scripts tracking & evaluation progress metrics</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link 
              to={userType === 'admin' 
                ? `/admin/papers?projectId=${encryptedProjectId}`
                : `/papers?projectId=${encryptedProjectId}`}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl border border-indigo-155 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <FileText size={13} />
              Configure Papers
            </Link>
            <Link 
              to={userType === 'admin'
                ? `/admin/allocate-scripts?projectId=${encryptedProjectId}`
                : `/allocate-scripts?projectId=${encryptedProjectId}`}
              className="bg-indigo-50 hover:bg-indigo-755 hover:text-white text-indigo-755 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl border border-indigo-155 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Zap size={13} />
              Allocate Scripts
            </Link>
          </div>
        </div>
      </div>
      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        
        {/* Total Papers */}
        <div 
          onClick={() => handleCardClick('')}
          className={`bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
            !filters.statusFilter ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-650">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mapped Papers</span>
            <div className="p-2 bg-indigo-50 rounded-lg"><FileText size={14} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-950">{stats.papersCount}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Configured subject question papers</p>
          </div>
        </div>

        {/* Total Scripts */}
        <div 
          onClick={() => handleCardClick('')}
          className={`bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
            !filters.statusFilter ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Scripts</span>
            <div className="p-2 bg-slate-50 rounded-lg"><BookOpen size={14} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-955">{stats.totalScripts}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Total answer sheets uploaded</p>
          </div>
        </div>

        {/* Pending Allocation */}
        <div 
          onClick={() => handleCardClick('pending')}
          className={`bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
            filters.statusFilter === 'pending' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Assign</span>
            <div className="p-2 bg-amber-50 rounded-lg"><AlertCircle size={14} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-amber-650">{stats.pendingScripts}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Awaiting examiner mapping</p>
          </div>
        </div>

        {/* In Progress */}
        <div 
          onClick={() => handleCardClick('marking')}
          className={`bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
            filters.statusFilter === 'marking' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">In Marking</span>
            <div className="p-2 bg-blue-50 rounded-lg"><Clock size={14} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-blue-650">{stats.allocatedScripts}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Currently being evaluated</p>
          </div>
        </div>

        {/* Completed */}
        <div 
          onClick={() => handleCardClick('completed')}
          className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
            filters.statusFilter === 'completed' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/10' : 'bg-white border-indigo-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/20'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fully Mapped</span>
            <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle size={14} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-emerald-655">{stats.completedScripts}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Evaluations 100% complete</p>
          </div>
        </div>

        {/* Unconfigured Sections */}
        <div 
          onClick={() => handleCardClick('unconfigured')}
          className={`bg-white p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
            filters.statusFilter === 'unconfigured' ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/10' : 'border-slate-100 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Unconfigured Sections</span>
            <div className="p-2 bg-rose-50 rounded-lg"><Layers size={14} /></div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-rose-650">{stats.unconfiguredPapersCount}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Papers without configured sections</p>
          </div>
        </div>

      </div>

      {/* Progress Ratio Bar Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Project Completion Status</h3>
            <p className="text-[10px] text-slate-500">Overall ratio of completed script evaluations against total system scripts</p>
          </div>
          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
            {stats.completePercentage}% Complete
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 border border-slate-200 overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-700 ease-out"
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
                  <FileText size={15} className="text-indigo-600" />
                  <span>Mapped Subject Papers</span>
                  {filters.statusFilter && (
                    <span className="ml-2 bg-indigo-55 px-2.5 py-0.5 rounded-full text-[9px] font-black text-indigo-755 uppercase tracking-wide border border-indigo-155">
                      Filtered: {filters.statusFilter}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-500">Subject configurations, paper code, max marks, and map progress</p>
              </div>

              {/* Search input */}
              <div className="max-w-xs flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-205 w-full shrink-0">
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

            {tableLoading && papers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span>Fetching papers list...</span>
              </div>
            ) : papers.length === 0 ? (
              <div className="p-16 text-center text-slate-405">
                <FileText size={36} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">No Papers Mapped</p>
                <p className="text-[10px] mt-0.5">Please add and configure papers for this project.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[950px]">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <tr>
                      <SortHeader label="Code & Name" field="paperCode" />
                      <SortHeader label="Subject" field="subjectName" />
                      <SortHeader label="Catch Number" field="catchNo" />
                      <SortHeader label="Total" field="totalScripts" isCenter={true} />
                      <SortHeader label="Pending" field="pendingScripts" isCenter={true} />
                      <SortHeader label="Allocated" field="allocatedScripts" isCenter={true} />
                      <SortHeader label="Completed" field="completedScripts" isCenter={true} />
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right w-[240px] min-w-[240px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {papers.map((paper) => {
                      const isAllocateDisabled = paper.pendingScripts <= 0 || !paper.isSectionsConfigured;
                      const disableTitle = !paper.isSectionsConfigured 
                        ? "Sections not configured" 
                        : "No scripts pending";

                      return (
                        <tr key={paper.paperId} className="hover:bg-slate-50/50 transition">
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
                            <span className={`inline-flex px-2 py-0.5 rounded text-[8px] uppercase tracking-wider ${
                              paper.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'
                            }`}>
                              {paper.isActive ? 'Active' : 'Inactive'}
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
                                  className="inline-flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all duration-200 shadow-sm"
                                >
                                  <Zap size={10} />
                                  Allocate
                                </Link>
                              ) : (
                                <button
                                  disabled
                                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg cursor-not-allowed border border-slate-200"
                                  title={disableTitle}
                                >
                                  <Zap size={10} />
                                  Allocate
                                </button>
                              )}

                              {/* Configure Sections Button */}
                              {!paper.isSectionsConfigured ? (
                                <Link 
                                  to={userType === 'admin'
                                    ? `/admin/subject-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`
                                    : `/subject-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`}
                                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all duration-200 shadow-sm"
                                >
                                  <Layers size={10} />
                                  Config Sections
                                </Link>
                              ) : (
                                <button
                                  disabled
                                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg cursor-not-allowed border border-slate-200"
                                  title="Sections Configured"
                                >
                                  <Layers size={10} />
                                  Configured
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
                  <Users size={15} className="text-indigo-650" />
                  <span>Assigned Examiners Stats</span>
                </h3>
                <p className="text-[10px] text-slate-500">Active evaluators allocated to scripts within this project</p>
              </div>

              {/* Examiner Search Input */}
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

            {filteredExaminersList.length === 0 ? (
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
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider mb-1 ${
                        ex.workload === 'Free' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {ex.workload}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-bold">
                        Mapped: <span className="text-slate-900 font-extrabold">{ex.projectAllocatedCount}</span> scripts
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
                      disabled={examinerPage === totalExaminerPages}
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
  );
}
