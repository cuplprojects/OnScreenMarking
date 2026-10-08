import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FileText,
  X,
  Search,
  CheckCircle2,
  ChevronLeft,
  Users,
  Clock,
  AlertCircle,
  Loader,
  Zap,
  Calendar,
  ArrowRightLeft,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  RefreshCw,
  Sliders,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';
import allocationService from '../services/allocationService';
import sectionService from '../services/sectionService';
import userService from '../services/userService';
import message from '../services/messageService';
import { decryptId } from '../utils/encryption';
import ProjectConfigHeader from '../components/ProjectConfigHeader';
import TablePagination from '../components/TablePagination';
import ColumnFilter from '../components/ColumnFilter';
import { useTable } from '../services/tableService';

export default function ScriptAllocation() {
  const [searchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get('projectId');
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  const universityIdFromUrl = searchParams.get('universityId');
  const { userType, universityId: userUniversityId } = useAuth();
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityIdFromUrl;

  // Global Page View State
  const [activeMainTab, setActiveMainTab] = useState('allocate'); // 'allocate' | 'manage'

  // Multi-paper selection state
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);

  // Active Pane / Modal State
  const [activePaper, setActivePaper] = useState(null); // Paper being configured in right pane (if single mode)
  const [isMultiPaperMode, setIsMultiPaperMode] = useState(false);
  const [scriptCounts, setScriptCounts] = useState({ pending: 0, allocated: 0, total: 0, experts: 0 });
  const [examiners, setExaminers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Bulk Allocation Strategy State
  const [bulkMode, setBulkMode] = useState('even'); // 'even' | 'daily' | 'custom'
  const [dailyQuotaLimit, setDailyQuotaLimit] = useState(50);
  const [examinerCounts, setExaminerCounts] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [autoProjectLoading, setAutoProjectLoading] = useState(false);

  // Manage Tab & Reallocation State
  const [allocationsList, setAllocationsList] = useState([]);
  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [selectedAllocationIds, setSelectedAllocationIds] = useState([]);
  const [allExaminersList, setAllExaminersList] = useState([]);
  const [targetReassignExaminerId, setTargetReassignExaminerId] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [managePaperFilter, setManagePaperFilter] = useState('');
  const [manageExaminerFilter, setManageExaminerFilter] = useState('');
  const [manageSearchQuery, setManageSearchQuery] = useState('');

  // -------------------------------------------------------------
  // Table Fetch Function for Papers
  // -------------------------------------------------------------
  const fetchFn = useCallback((params) => {
    if (projectId) {
      const searchVal = params.search || '';
      const pageVal = params.page || 1;
      const pageSizeVal = params.pageSize || 10;
      const sortFieldVal = params.sortField || '';
      const sortOrderVal = params.sortOrder || '';
      return apiCall(`/papers/dashboard-stats?projectId=${projectId}&page=${pageVal}&pageSize=${pageSizeVal}&search=${searchVal}&sortField=${sortFieldVal}&sortOrder=${sortOrderVal}`);
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
    search: paperSearchQuery,
    setSearch: setPaperSearchQuery,
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

  // Fetch all examiners for management dropdown
  useEffect(() => {
    if (activeUniversityId) {
      userService.getExaminers(activeUniversityId)
        .then(res => {
          setAllExaminersList(Array.isArray(res) ? res : res?.items || []);
        })
        .catch(err => console.error("Failed to load examiners list", err));
    }
  }, [activeUniversityId]);

  // Load active allocations when entering Manage tab
  useEffect(() => {
    if (activeMainTab === 'manage' && projectId) {
      fetchAllocationsList();
    }
  }, [activeMainTab, projectId, managePaperFilter, manageExaminerFilter]);

  const fetchAllocationsList = async () => {
    setAllocationsLoading(true);
    try {
      let url = `/allocations?limit=1000`;
      if (manageExaminerFilter) url += `&examinerId=${manageExaminerFilter}`;
      const data = await apiCall(url);
      setAllocationsList(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error("Failed to fetch allocations", err);
      message.error("Failed to fetch allocations list");
    } finally {
      setAllocationsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Selection Handlers
  // -------------------------------------------------------------
  const toggleSelectAllPapers = () => {
    if (selectedPaperIds.length === papers.length) {
      setSelectedPaperIds([]);
    } else {
      setSelectedPaperIds(papers.map(p => p.paperId));
    }
  };

  const toggleSelectPaper = (id) => {
    setSelectedPaperIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  // -------------------------------------------------------------
  // Open Single Paper Allocation Pane
  // -------------------------------------------------------------
  const openAllocationPane = async (paper) => {
    if (activePaper?.paperId === paper.paperId && !isMultiPaperMode) {
      // Toggle off
      setActivePaper(null);
      setScriptCounts({ pending: 0, allocated: 0, total: 0, experts: 0 });
      setExaminers([]);
      return;
    }

    setIsMultiPaperMode(false);
    setActivePaper(paper);
    setLoading(true);
    try {
      const sectionsData = await sectionService.getAllSections(paper.paperId);
      if (!sectionsData || sectionsData.length === 0) {
        message.warning(`Paper "${paper.paperName}" does not have sections configured yet.`);
        setActivePaper(null);
        setLoading(false);
        return;
      }

      // Fetch lightweight paper script counts instead of 1000 heavy script objects
      let countsData = null;
      try {
        countsData = await apiCall(`/scripts/paper-counts?paperId=${paper.paperId}`);
      } catch (err) {
        countsData = {
          pendingScripts: paper.pendingScripts || 0,
          allocatedScripts: paper.allocatedScripts || 0,
          totalScripts: paper.totalScripts || 0,
          expertsCount: paper.expertsCount || 0
        };
      }

      const pendingCount = countsData?.pendingScripts ?? paper.pendingScripts ?? 0;
      setScriptCounts({
        pending: pendingCount,
        allocated: countsData?.allocatedScripts ?? paper.allocatedScripts ?? 0,
        total: countsData?.totalScripts ?? paper.totalScripts ?? 0,
        experts: countsData?.expertsCount ?? paper.expertsCount ?? 0
      });

      const examinersData = await apiCall(`/PaperExaminers/paper/${paper.paperId}`);
      setExaminers(examinersData || []);

      // Default distribution counts
      const counts = {};
      const activeEx = (examinersData || []);
      const baseShare = activeEx.length > 0 ? Math.floor(pendingCount / activeEx.length) : 0;
      const remainder = activeEx.length > 0 ? pendingCount % activeEx.length : 0;

      activeEx.forEach((ex, idx) => {
        counts[ex.examinerId] = baseShare + (idx < remainder ? 1 : 0);
      });
      setExaminerCounts(counts);

    } catch (err) {
      message.error('Failed to fetch paper allocation details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Open Multi-Paper Allocation Pane
  // -------------------------------------------------------------
  const openMultiPaperPane = async () => {
    if (selectedPaperIds.length === 0) return message.warning("Please select at least one paper");

    setIsMultiPaperMode(true);
    setActivePaper(null);
    setLoading(true);

    try {
      const selectedPapersData = papers.filter(p => selectedPaperIds.includes(p.paperId));
      
      let totalPending = 0;
      let totalAllocated = 0;
      let totalScriptsSum = 0;
      let combinedExaminersMap = new Map();

      for (const p of selectedPapersData) {
        let pCounts = null;
        try {
          pCounts = await apiCall(`/scripts/paper-counts?paperId=${p.paperId}`);
        } catch (e) {
          pCounts = {
            pendingScripts: p.pendingScripts || 0,
            allocatedScripts: p.allocatedScripts || 0,
            totalScripts: p.totalScripts || 0
          };
        }

        totalPending += (pCounts?.pendingScripts ?? p.pendingScripts ?? 0);
        totalAllocated += (pCounts?.allocatedScripts ?? p.allocatedScripts ?? 0);
        totalScriptsSum += (pCounts?.totalScripts ?? p.totalScripts ?? 0);

        const exData = await apiCall(`/PaperExaminers/paper/${p.paperId}`);
        if (Array.isArray(exData)) {
          exData.forEach(ex => {
            if (!combinedExaminersMap.has(ex.examinerId)) {
              combinedExaminersMap.set(ex.examinerId, ex);
            }
          });
        }
      }

      setScriptCounts({
        pending: totalPending,
        allocated: totalAllocated,
        total: totalScriptsSum,
        experts: combinedExaminersMap.size
      });

      const uniqueExaminers = Array.from(combinedExaminersMap.values());
      setExaminers(uniqueExaminers);

      // Distribute pending scripts across examiners
      const counts = {};
      const baseShare = uniqueExaminers.length > 0 ? Math.floor(totalPending / uniqueExaminers.length) : 0;
      const remainder = uniqueExaminers.length > 0 ? totalPending % uniqueExaminers.length : 0;

      uniqueExaminers.forEach((ex, idx) => {
        counts[ex.examinerId] = baseShare + (idx < remainder ? 1 : 0);
      });
      setExaminerCounts(counts);

    } catch (err) {
      message.error('Failed to load multi-paper allocation details');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Allocation Calculation Helpers
  // -------------------------------------------------------------
  const calculateEvenDistribution = () => {
    const pendingCount = scriptCounts.pending;
    if (examiners.length === 0 || pendingCount === 0) {
      message.warning('No pending scripts or examiners available');
      return;
    }

    const counts = {};
    const baseCount = Math.floor(pendingCount / examiners.length);
    const remainder = pendingCount % examiners.length;

    examiners.forEach((examiner, index) => {
      counts[examiner.examinerId] = baseCount + (index < remainder ? 1 : 0);
    });

    setExaminerCounts(counts);
    message.info(`Evenly distributed ${pendingCount} pending scripts across ${examiners.length} examiners.`);
  };

  const calculateDailyQuotaDistribution = () => {
    const pendingCount = scriptCounts.pending;
    if (examiners.length === 0 || pendingCount === 0) {
      message.warning('No pending scripts or examiners available');
      return;
    }

    const counts = {};
    let remaining = pendingCount;

    examiners.forEach((examiner) => {
      const quota = Math.min(remaining, dailyQuotaLimit);
      counts[examiner.examinerId] = quota;
      remaining -= quota;
    });

    setExaminerCounts(counts);
    message.info(`Applied daily quota limit of ${dailyQuotaLimit} scripts/examiner.`);
  };

  const updateExaminerCount = (examinerId, count) => {
    setExaminerCounts(prev => ({
      ...prev,
      [examinerId]: Math.max(0, count)
    }));
  };

  // -------------------------------------------------------------
  // Perform Bulk Allocation
  // -------------------------------------------------------------
  const handleBulkAllocate = async () => {
    try {
      setBulkLoading(true);

      if (isMultiPaperMode) {
        // Allocate per paper across selected papers
        const targetPapers = papers.filter(p => selectedPaperIds.includes(p.paperId));
        let successCount = 0;

        for (const paper of targetPapers) {
          const pendingCount = paper.pendingScripts || 0;
          if (pendingCount === 0) continue;

          // Scale examiner counts proportionally for this paper
          const paperAllocations = examiners.map(e => {
            const requested = examinerCounts[e.examinerId] || 0;
            return { examinerId: e.examinerId, count: Math.min(requested, pendingCount) };
          }).filter(a => a.count > 0);

          if (paperAllocations.length > 0) {
            await allocationService.bulkAllocateScripts(paper.paperId, paperAllocations);
            successCount++;
          }
        }

        message.success(`Bulk allocation completed across ${successCount} papers!`);
        setIsMultiPaperMode(false);
        setSelectedPaperIds([]);
      } else if (activePaper) {
        const payload = examiners.map(e => ({
          examinerId: e.examinerId,
          count: examinerCounts[e.examinerId] || 0
        })).filter(a => a.count > 0);

        const res = await allocationService.bulkAllocateScripts(activePaper.paperId, payload);
        message.success(res.message || 'Bulk allocation completed successfully');
        openAllocationPane(activePaper);
      }

      refreshTable();
    } catch (err) {
      message.error(err.message || 'Failed to perform bulk allocation');
    } finally {
      setBulkLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Auto-Allocate Entire Project
  // -------------------------------------------------------------
  const handleAutoAllocateProject = async () => {
    if (!projectId) return;

    setAutoProjectLoading(true);
    try {
      const res = await allocationService.autoAllocateProject(projectId);
      message.success(res.message || "Project-wide auto allocation completed!");
      refreshTable();
      if (activeMainTab === 'manage') fetchAllocationsList();
    } catch (err) {
      message.error("Failed to auto-allocate project: " + (err.response?.data?.message || err.message));
    } finally {
      setAutoProjectLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Reassign & Revoke Handlers (Manage Tab)
  // -------------------------------------------------------------
  const toggleSelectAllocation = (id) => {
    setSelectedAllocationIds(prev =>
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllAllocations = () => {
    const filtered = getFilteredAllocations();
    if (selectedAllocationIds.length === filtered.length) {
      setSelectedAllocationIds([]);
    } else {
      setSelectedAllocationIds(filtered.map(a => a.allocationId));
    }
  };

  const getFilteredAllocations = () => {
    return allocationsList.filter(alloc => {
      const matchesSearch = !manageSearchQuery || 
        alloc.script?.rollNo?.toLowerCase().includes(manageSearchQuery.toLowerCase()) ||
        alloc.examiner?.fullName?.toLowerCase().includes(manageSearchQuery.toLowerCase()) ||
        alloc.allocationId.toString().includes(manageSearchQuery);
      return matchesSearch;
    });
  };

  const handleReassignSelected = async () => {
    if (selectedAllocationIds.length === 0) return message.warning("Please select at least one allocation to reassign");
    if (!targetReassignExaminerId) return message.warning("Please select a target examiner");

    setReassignLoading(true);
    try {
      const res = await allocationService.reassignAllocations(
        selectedAllocationIds,
        parseInt(targetReassignExaminerId, 10)
      );
      message.success(res.message || "Allocations reassigned successfully");
      setSelectedAllocationIds([]);
      setShowReassignModal(false);
      fetchAllocationsList();
      refreshTable();
    } catch (err) {
      message.error(err.message || "Failed to reassign allocations");
    } finally {
      setReassignLoading(false);
    }
  };

  const handleRevokeSelected = async () => {
    if (selectedAllocationIds.length === 0) return message.warning("Please select allocations to revoke");

    try {
      const res = await allocationService.revokeAllocations(selectedAllocationIds);
      message.success(res.message || "Selected allocations revoked successfully");
      setSelectedAllocationIds([]);
      fetchAllocationsList();
      refreshTable();
    } catch (err) {
      message.error(err.message || "Failed to revoke allocations");
    }
  };

  const handleRevokeAllForPaper = async (paperId) => {
    try {
      const res = await apiCall(`/allocation/paper/${paperId}/revoke-all`, { method: 'POST' });
      message.success(res.message || "Paper allocations revoked");
      refreshTable();
      if (activePaper?.paperId === paperId) openAllocationPane(activePaper);
      if (activeMainTab === 'manage') fetchAllocationsList();
    } catch (err) {
      message.error("Failed to revoke paper allocations");
    }
  };

  // Helper Header Component for Sorting
  const SortHeader = ({ label, field, isCenter = false, hasFilter = false }) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-3 py-3 cursor-pointer hover:bg-gray-100/80 transition-colors select-none group/header ${isCenter ? 'text-center' : ''}`}
      >
        <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : ''}`}>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{label}</span>
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

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none px-4 py-3 lg:px-8 lg:py-4">
      <ProjectConfigHeader />
      
      <div className="w-full space-y-4 mt-4">
        
        {/* Main Header Card */}
        <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm sticky top-0 z-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center font-bold shadow-xs">
                <Zap size={16} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none flex items-center gap-2">
                  Examiner & Script Allocation System
                </h2>
              </div>
            </div>

            {/* Quick Actions & Navigation Tabs */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleAutoAllocateProject}
                disabled={autoProjectLoading}
                className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md shadow-teal-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {autoProjectLoading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {autoProjectLoading ? "Auto-Allocating..." : "Auto-Allocate All Papers"}
              </button>

              <div className="flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                <button
                  onClick={() => setActiveMainTab('allocate')}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                    activeMainTab === 'allocate' 
                      ? 'bg-white text-teal-800 shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Allocate Papers
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: ALLOCATION WORKFLOW */}
        {activeMainTab === 'allocate' && (
          <div className="w-full flex flex-col xl:flex-row gap-4 items-start">

            {/* Left Column: Papers List & Multi-Select */}
            <div className={`w-full ${(activePaper || isMultiPaperMode) ? 'xl:w-[50%]' : 'xl:w-full'} flex flex-col transition-all duration-300`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-md flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  Select Papers to Allocate
                </h2>
                {selectedPaperIds.length > 0 && (
                  <button
                    onClick={openMultiPaperPane}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Zap size={13} />
                    Allocate Selected ({selectedPaperIds.length} Papers)
                  </button>
                )}
              </div>

              {tableLoading && papers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-12 text-center flex flex-col items-center gap-3">
                  <Loader className="animate-spin text-teal-700" size={32} />
                  <span className="text-xs font-bold text-gray-400">Loading papers...</span>
                </div>
              ) : papers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-16 text-center text-gray-500 font-medium leading-relaxed max-w-sm mx-auto space-y-3">
                  <FileText className="mx-auto text-gray-400" size={32} />
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">No Papers Found</h3>
                    <p className="text-[10px] text-gray-400 mt-1">There are no papers found for this project.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-fade-in">
                  <div className="p-3.5 border-b border-gray-100 bg-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all w-full max-w-md">
                      <Search size={13} className="text-gray-400 shrink-0" />
                      <input 
                        type="text" 
                        placeholder="Search papers by code or name..." 
                        className="w-full bg-transparent text-gray-800 placeholder-gray-400 font-semibold text-[11px] focus:outline-none"
                        value={paperSearchQuery}
                        onChange={(e) => setPaperSearchQuery(e.target.value)}
                      />
                      {paperSearchQuery && (
                        <button onClick={() => setPaperSearchQuery('')} className="text-gray-300 hover:text-gray-500 transition">
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] font-bold text-gray-500">
                      {selectedPaperIds.length} of {papers.length} selected
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest select-none">
                          <th className="px-4 py-2.5 text-center w-10">
                            <input
                              type="checkbox"
                              checked={selectedPaperIds.length > 0 && selectedPaperIds.length === papers.length}
                              onChange={toggleSelectAllPapers}
                              className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-gray-300 cursor-pointer"
                            />
                          </th>
                          <SortHeader label="Code" field="paperCode" hasFilter={true} />
                          <SortHeader label="Paper Name" field="paperName" hasFilter={true} />
                          <th className="px-4 py-2.5 text-center">Pending</th>
                          <th className="px-4 py-2.5 text-center">Allocated</th>
                          <th className="px-4 py-2.5 text-center">Experts</th>
                          <th className="px-4 py-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {papers.map(paper => {
                          const isSelected = selectedPaperIds.includes(paper.paperId);
                          const isActive = activePaper?.paperId === paper.paperId;
                          return (
                            <tr 
                              key={paper.paperId} 
                              className={`hover:bg-gray-50/70 transition-colors ${
                                isActive ? 'bg-teal-50/40 font-semibold' : isSelected ? 'bg-indigo-50/30' : ''
                              }`}
                            >
                              <td className="px-4 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectPaper(paper.paperId)}
                                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-gray-300 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-2.5 font-extrabold text-gray-900">{paper.paperCode}</td>
                              <td className="px-4 py-2.5 text-gray-600 font-medium">{paper.paperName}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-yellow-100">
                                  <Clock size={11} />
                                  {paper.pendingScripts}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                  <CheckCircle2 size={11} />
                                  {paper.allocatedScripts}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-teal-100">
                                  <Users size={11} />
                                  {paper.expertsCount || 0}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => openAllocationPane(paper)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-xs inline-flex items-center justify-center gap-1.5 ${
                                    isActive 
                                      ? 'bg-teal-700 text-white hover:bg-teal-800' 
                                      : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700'
                                  }`}
                                >
                                  <Zap size={11} />
                                  {isActive ? 'Close' : 'Allocate'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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

            {/* Right Column: Allocation Configuration Pane (Single or Multi Paper) */}
            {(activePaper || isMultiPaperMode) && (
              <div className="w-full xl:w-[50%] flex flex-col animate-in slide-in-from-right-4 duration-300">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col overflow-hidden">
                  
                  {/* Pane Header */}
                  <div className="p-5 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center font-bold text-sm">
                          2
                        </div>
                        <div>
                          <h2 className="text-base font-black text-gray-900 tracking-tight">
                            {isMultiPaperMode ? `Multi-Paper Allocation (${selectedPaperIds.length} Papers)` : `Allocate: ${activePaper.paperName}`}
                          </h2>
                          <p className="text-xs text-gray-500 font-medium">
                            {isMultiPaperMode ? "Configure batch allocation across selected papers" : `Paper Code: ${activePaper.paperCode}`}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setActivePaper(null); setIsMultiPaperMode(false); }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 overflow-y-auto max-h-[750px] space-y-5">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader className="animate-spin text-teal-700" size={32} />
                      </div>
                    ) : scriptCounts.total === 0 && scriptCounts.pending === 0 ? (
                      <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center">
                        <FileText className="mx-auto text-gray-300 mb-3" size={36} />
                        <p className="text-xs font-bold text-gray-500">No scripts available for allocation</p>
                      </div>
                    ) : (
                      <>
                        {/* Allocation Strategy Tabs */}
                        <div>
                          <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">
                            Select Distribution Strategy
                          </p>
                          <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                            <button
                              type="button"
                              onClick={() => setBulkMode('even')}
                              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                bulkMode === 'even'
                                  ? 'bg-white text-teal-800 shadow-xs border border-gray-200'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Even Distribution
                            </button>
                            <button
                              type="button"
                              onClick={() => setBulkMode('daily')}
                              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                bulkMode === 'daily'
                                  ? 'bg-white text-teal-800 shadow-xs border border-gray-200'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Daily Quota / Limit
                            </button>
                            <button
                              type="button"
                              onClick={() => setBulkMode('custom')}
                              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                bulkMode === 'custom'
                                  ? 'bg-white text-teal-800 shadow-xs border border-gray-200'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Custom Ratio
                            </button>
                          </div>
                        </div>

                        {/* Strategy Details Box */}
                        {bulkMode === 'even' && (
                          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-teal-900">Equal Distribution Across Examiners</h4>
                              <p className="text-[11px] text-teal-700 mt-0.5">
                                Automatically splits <span className="font-bold">{scriptCounts.pending}</span> pending scripts among <span className="font-bold">{examiners.length}</span> assigned examiners.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={calculateEvenDistribution}
                              className="px-3.5 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition-all shrink-0"
                            >
                              Calculate
                            </button>
                          </div>
                        )}

                        {bulkMode === 'daily' && (
                          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <h4 className="text-xs font-bold text-indigo-900">Daily Allotment Limit</h4>
                                <p className="text-[11px] text-indigo-700 mt-0.5">
                                  Set maximum scripts allotted per examiner per day.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-gray-600">Quota:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="200"
                                  value={dailyQuotaLimit}
                                  onChange={(e) => setDailyQuotaLimit(parseInt(e.target.value) || 10)}
                                  className="w-16 px-2 py-1 border border-indigo-300 rounded-md text-xs font-bold text-center bg-white"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={calculateDailyQuotaDistribution}
                                className="px-3.5 py-1.5 bg-indigo-700 text-white rounded-lg text-xs font-bold hover:bg-indigo-800 transition-all"
                              >
                                Apply Daily Limit
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Examiners List & Allocation Input */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                              Assigned Examiners ({examiners.length})
                            </p>
                          </div>

                          {examiners.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                              <Users className="mx-auto text-gray-300 mb-2" size={28} />
                              <p className="text-xs font-bold text-gray-500">No examiners assigned for selected scope</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                              {examiners.map(examiner => (
                                <div key={examiner.examinerId} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-teal-300 transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs uppercase">
                                      {(examiner.examinerName || 'E').charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-900">{examiner.examinerName || 'Examiner'}</p>
                                      <p className="text-[10px] text-gray-400 font-medium">ID: {examiner.examinerId}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Count</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max={scriptCounts.pending || 0}
                                      value={examinerCounts[examiner.examinerId] || 0}
                                      onChange={(e) => updateExaminerCount(examiner.examinerId, parseInt(e.target.value) || 0)}
                                      className="w-20 px-2.5 py-1.5 text-center text-xs font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-gray-50 focus:bg-white"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>


                        {/* Submit Action Buttons */}
                        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => { setActivePaper(null); setIsMultiPaperMode(false); }}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkAllocate}
                            disabled={bulkLoading || examiners.length === 0}
                            className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {bulkLoading ? <Loader className="animate-spin" size={14} /> : <Zap size={14} />}
                            {bulkLoading ? 'Allocating...' : 'Confirm Allocation'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-teal-700" />
                Reassign Selected Allocations
              </h3>
              <button 
                onClick={() => setShowReassignModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Reassign <span className="font-bold text-gray-900">{selectedAllocationIds.length}</span> selected script allocation(s) to a new examiner:
            </p>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">
                Target Examiner <span className="text-red-500">*</span>
              </label>
              <select
                value={targetReassignExaminerId}
                onChange={(e) => setTargetReassignExaminerId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-xs px-3 py-2 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-medium text-gray-800"
              >
                <option value="">Select Examiner...</option>
                {allExaminersList.map(ex => (
                  <option key={ex.examinerId || ex.id} value={ex.examinerId || ex.id}>
                    {ex.fullName || ex.examinerName || ex.userName} (ID: {ex.examinerId || ex.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignSelected}
                disabled={reassignLoading || !targetReassignExaminerId}
                className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {reassignLoading ? <Loader className="animate-spin" size={14} /> : <ArrowRightLeft size={14} />}
                {reassignLoading ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
