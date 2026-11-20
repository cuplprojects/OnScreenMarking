import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Users, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  Sliders, 
  Edit2, 
  Check, 
  X,
  FileText,
  Clock,
  CheckCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Search,
  ChevronsUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { decryptId } from '../utils/encryption';
import apiCall from '../services/api';
import allocationService from '../services/allocationService';
import ProjectConfigHeader from '../components/ProjectConfigHeader';
import ColumnFilter from '../components/ColumnFilter';
import message from '../services/messageService';

export default function ScriptDeallocation() {
  const [searchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get('projectId');
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;

  const { userType, hasPermission } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [summary, setSummary] = useState({
    pendingScripts: 0,
    allocatedScripts: 0,
    completedScripts: 0,
    totalScripts: 0
  });
  const [examinerList, setExaminerList] = useState([]);
  const [editedCounts, setEditedCounts] = useState({});
  const [editingRowKey, setEditingRowKey] = useState(null);
  const [expandedExaminers, setExpandedExaminers] = useState(new Set());

  // Sorting & Filtering states
  const [sortField, setSortField] = useState('examinerName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState({});

  useEffect(() => {
    setBreadcrumb([
      { label: 'Coordinator Dashboard', path: '/coordinator/dashboard', icon: 'LayoutDashboard' },
      { label: 'Project Dashboard', path: `/project-dashboard?projectId=${encryptedProjectId}`, icon: 'Layers' },
      { label: 'Script Deallocation & Overwrite', path: `/deallocate-scripts?projectId=${encryptedProjectId}`, icon: 'Sliders' }
    ]);
  }, [encryptedProjectId]);

  // Load project papers for dropdown filter options
  useEffect(() => {
    if (projectId) {
      apiCall(`/papers/options?projectId=${projectId}`)
        .then(res => {
          const items = Array.isArray(res) ? res : res?.items || [];
          setPapers(items);
        })
        .catch(err => console.error("Failed to load paper options", err));
    }
  }, [projectId]);

  // Normalize raw API data to examiner-wise accordion structure with papers
  const normalizeExaminerData = useCallback((rawList) => {
    if (!Array.isArray(rawList)) return [];

    // Case 1: Backend returned grouped examiners
    if (rawList.length > 0 && Array.isArray(rawList[0]?.papers)) {
      return rawList
        .map(ex => ({
          ...ex,
          papers: (ex.papers || []).filter(p => (p.allocatedCount > 0 || p.completedCount > 0 || p.totalAllocatedCount > 0))
        }))
        .filter(ex => ex.papers.length > 0);
    }

    // Case 2: Backend returned flat list of paper rows -> group by examinerId
    const groupsMap = new Map();
    rawList.forEach(item => {
      // Exclude papers where no scripts are allocated to this examiner
      if ((item.allocatedCount || 0) === 0 && (item.completedCount || 0) === 0 && (item.totalAllocatedCount || 0) === 0) {
        return;
      }

      if (!groupsMap.has(item.examinerId)) {
        groupsMap.set(item.examinerId, {
          examinerId: item.examinerId,
          examinerName: item.examinerName,
          email: item.email,
          totalPending: 0,
          totalAllocated: 0,
          totalCompleted: 0,
          totalAssigned: 0,
          papers: []
        });
      }

      const ex = groupsMap.get(item.examinerId);
      ex.totalPending += (item.pendingScripts || 0);
      ex.totalAllocated += (item.allocatedCount || 0);
      ex.totalCompleted += (item.completedCount || 0);
      ex.totalAssigned += (item.totalAllocatedCount || 0);
      ex.papers.push(item);
    });

    return Array.from(groupsMap.values()).map(ex => ({
      ...ex,
      papersCount: ex.papers.length
    }));
  }, []);

  // Load deallocation stats
  const fetchDeallocationData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await allocationService.getDeallocationStats(projectId, null);
      if (res.success) {
        setSummary(res.summary || { pendingScripts: 0, allocatedScripts: 0, completedScripts: 0, totalScripts: 0 });
        const list = normalizeExaminerData(res.examiners || []);
        setExaminerList(list);

        // Expand all examiners by default so user can see allocations right away
        setExpandedExaminers(new Set(list.map(e => e.examinerId)));

        // Initialize local counts mapping
        const counts = {};
        list.forEach(ex => {
          (ex.papers || []).forEach(p => {
            const key = `${p.projectPaperId || p.paperId}_${p.examinerId}`;
            counts[key] = p.allocatedCount;
          });
        });
        setEditedCounts(counts);
      }
    } catch (err) {
      console.error("Error fetching deallocation stats:", err);
      message.error(err.message || "Failed to load deallocation stats");
    } finally {
      setLoading(false);
    }
  }, [projectId, normalizeExaminerData]);

  useEffect(() => {
    fetchDeallocationData();
  }, [fetchDeallocationData]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const setFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Derive paper code dropdown options
  const paperCodeOptions = useMemo(() => {
    const codes = new Set();
    papers.forEach(p => { if (p.paperCode) codes.add(p.paperCode); });
    examinerList.forEach(e => {
      (e.papers || []).forEach(p => { if (p.paperCode) codes.add(p.paperCode); });
    });
    return Array.from(codes).sort().map(code => ({ label: code, value: code }));
  }, [papers, examinerList]);

  // Filter and sort the examiner list in-memory
  const filteredAndSortedList = useMemo(() => {
    let list = [...examinerList];

    // Filter by examiner name or email
    if (filters.examiner) {
      const q = filters.examiner.toLowerCase().trim();
      list = list.filter(ex => 
        (ex.examinerName && ex.examinerName.toLowerCase().includes(q)) ||
        (ex.email && ex.email.toLowerCase().includes(q))
      );
    }

    // Filter by paper code
    if (filters.paperCode) {
      const q = filters.paperCode.toLowerCase().trim();
      list = list
        .map(ex => ({
          ...ex,
          papers: ex.papers.filter(p => p.paperCode && p.paperCode.toLowerCase().includes(q))
        }))
        .filter(ex => ex.papers.length > 0);
    }

    // Filter by paper name
    if (filters.paperName) {
      const q = filters.paperName.toLowerCase().trim();
      list = list
        .map(ex => ({
          ...ex,
          papers: ex.papers.filter(p => p.paperName && p.paperName.toLowerCase().includes(q))
        }))
        .filter(ex => ex.papers.length > 0);
    }

    // Filter by catch no
    if (filters.catchNo) {
      const q = filters.catchNo.toLowerCase().trim();
      list = list
        .map(ex => ({
          ...ex,
          papers: ex.papers.filter(p => (p.catchNo || '').toLowerCase().includes(q))
        }))
        .filter(ex => ex.papers.length > 0);
    }

    // Sorting
    if (sortField) {
      list.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string' || typeof valB === 'string') {
          valA = (valA || '').toString().toLowerCase();
          valB = (valB || '').toString().toLowerCase();
          const cmp = valA.localeCompare(valB);
          return sortOrder === 'asc' ? cmp : -cmp;
        }

        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
    }

    return list;
  }, [examinerList, filters, sortField, sortOrder]);

  const toggleExaminer = (exId) => {
    setExpandedExaminers(prev => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedExaminers(new Set(filteredAndSortedList.map(e => e.examinerId)));
  };

  const collapseAll = () => {
    setExpandedExaminers(new Set());
  };

  const areAllExpanded = filteredAndSortedList.length > 0 && 
    filteredAndSortedList.every(e => expandedExaminers.has(e.examinerId));

  const handleCountChange = (rowKey, val) => {
    setEditedCounts(prev => ({
      ...prev,
      [rowKey]: val === '' ? '' : parseInt(val, 10) || 0
    }));
  };

  const handleSaveCount = async (paper) => {
    const key = `${paper.projectPaperId || paper.paperId}_${paper.examinerId}`;
    const targetCount = editedCounts[key];

    if (targetCount === undefined || targetCount < 0) {
      message.error("Please enter a valid count greater than or equal to 0");
      return;
    }

    const availableLimit = paper.totalAllocatedCount + (paper.pendingScripts || 0);
    if (targetCount > availableLimit) {
      message.error(`Allocation count cannot exceed available scripts (${availableLimit})`);
      return;
    }

    setUpdatingId(key);
    try {
      const res = await allocationService.overwriteExaminerCount(paper.paperId, paper.examinerId, targetCount, projectId, paper.projectPaperId);
      message.success(res.message || "Examiner allocation count updated successfully");
      setEditingRowKey(null);
      fetchDeallocationData();
    } catch (err) {
      message.error(err.message || "Failed to update examiner count");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetToZero = async (paper) => {
    const key = `${paper.projectPaperId || paper.paperId}_${paper.examinerId}`;
    setUpdatingId(key);
    try {
      const res = await allocationService.overwriteExaminerCount(paper.paperId, paper.examinerId, 0, projectId, paper.projectPaperId);
      message.success(res.message || `Deallocated all active scripts for ${paper.paperCode || 'paper'}`);
      fetchDeallocationData();
    } catch (err) {
      message.error(err.message || "Failed to deallocate scripts");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 w-full px-4 py-4 lg:px-8 lg:py-6">
      <div className="w-full space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm">
          <ProjectConfigHeader 
            title="Script Deallocation & Overwrite Manager"
            titleIcon={<Sliders size={18} />}
          />
        </div>

        {/* Project-Wise KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Scripts in Project */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Project Total Scripts</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{summary.totalScripts}</h3>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">All scripts across project</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
          </div>

          {/* Project Pending Scripts */}
          <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-amber-50/30">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Project Pending</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{summary.pendingScripts}</h3>
              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Unallocated scripts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
          </div>

          {/* In Marking / Allocated */}
          <div className="bg-white rounded-2xl border border-teal-200/80 p-4 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-teal-50/30">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-teal-700">In Marking</p>
              <h3 className="text-2xl font-black text-teal-700 mt-1">{summary.allocatedScripts}</h3>
              <p className="text-[10px] text-teal-600 font-semibold mt-0.5">Currently assigned</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Sliders size={20} />
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/30">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Completed Scripts</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">{summary.completedScripts}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Marked & submitted</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        {/* Assigned Examiners Accordion View */}
        <div className="space-y-4">
          {/* Section Toolbar */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <Users size={16} className="text-teal-700" />
                <span>Assigned Examiners & Allocation Workload</span>
              </h2>
             
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Examiner search filter */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter examiner / email..."
                  value={filters.examiner || ''}
                  onChange={(e) => setFilter('examiner', e.target.value)}
                  className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none w-44 bg-gray-50 focus:bg-white"
                />
                <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
              </div>

              {/* Paper Code Filter */}
              <div className="flex items-center">
                <ColumnFilter 
                  columnKey="paperCode"
                  currentFilter={filters.paperCode}
                  setFilter={setFilter}
                  options={paperCodeOptions}
                />
              </div>

              {/* Expand / Collapse All Toggle */}
              {/* {filteredAndSortedList.length > 0 && (
                <button
                  type="button"
                  onClick={areAllExpanded ? collapseAll : expandAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition-colors shadow-2xs"
                >
                  <ChevronsUpDown size={13} className="text-teal-700" />
                  <span>{areAllExpanded ? 'Collapse All' : 'Expand All'}</span>
                </button>
              )} */}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold border border-gray-200 transition-colors shadow-2xs cursor-pointer"
                >
                  <X size={12} className="text-red-500" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-xs font-bold text-gray-500 animate-pulse">Loading Examiner Stats...</p>
            </div>
          ) : filteredAndSortedList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-sm">
              <Users size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">
                {examinerList.length === 0 ? "No active script allocations found" : "No examiners match the active filters"}
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                {examinerList.length === 0 
                  ? "There are currently no scripts allocated to examiners in this project." 
                  : "Try adjusting or clearing your active filters."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold border border-teal-200 transition-colors"
                >
                  <X size={12} />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>
          ) : (
            /* Accordion List Examiner-Wise */
            <div className="space-y-3">
              {filteredAndSortedList.map((ex) => {
                const isExpanded = expandedExaminers.has(ex.examinerId);

                return (
                  <div 
                    key={ex.examinerId} 
                    className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:border-gray-300"
                  >
                    {/* Accordion Header */}
                    <div 
                      onClick={() => toggleExaminer(ex.examinerId)}
                      className="p-4 bg-gray-50/60 hover:bg-gray-100/70 cursor-pointer flex flex-wrap items-center justify-between gap-3 select-none transition-colors border-b border-gray-100"
                    >
                      {/* Left: Expand Icon + Avatar + Info + Papers Badge */}
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-white border border-gray-200 text-gray-500 flex items-center justify-center transition-transform">
                          {isExpanded ? <ChevronDown size={14} className="text-teal-700" /> : <ChevronRight size={14} />}
                        </div>
                        <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm flex-shrink-0 shadow-2xs">
                          {(ex.examinerName || 'E').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-sm">{ex.examinerName}</h3>
                            <span className="bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-teal-200">
                              {ex.papers.length} {ex.papers.length === 1 ? 'Paper' : 'Papers'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium">{ex.email || 'No email registered'}</p>
                        </div>
                      </div>

                      {/* Right: Examiner Totals (Pending, Allocated, Completed, Total) */}
                      <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {/* Pending */}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-xs font-bold" title="Pending scripts for examiner papers">
                          <Clock size={13} className="text-amber-600" />
                          <span className="text-[10px] uppercase font-bold text-amber-600">Pending:</span>
                          <span className="font-black text-amber-900">{ex.totalPending}</span>
                        </div>

                        {/* Allocated / In Marking */}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-xl border border-teal-200 text-xs font-bold" title="Scripts currently allocated to this examiner">
                          <Sliders size={13} className="text-teal-600" />
                          <span className="text-[10px] uppercase font-bold text-teal-600">In Marking:</span>
                          <span className="font-black text-teal-900">{ex.totalAllocated}</span>
                        </div>

                        {/* Completed */}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 text-xs font-bold" title="Scripts marked & completed by this examiner">
                          <CheckCircle size={13} className="text-emerald-600" />
                          <span className="text-[10px] uppercase font-bold text-emerald-600">Completed:</span>
                          <span className="font-black text-emerald-900">{ex.totalCompleted}</span>
                        </div>

                        {/* Total Assigned */}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200 text-xs font-bold" title="Total scripts assigned to this examiner in project">
                          <Layers size={13} className="text-indigo-600" />
                          <span className="text-[10px] uppercase font-bold text-indigo-600">Total:</span>
                          <span className="font-black text-indigo-900">{ex.totalAssigned}</span>
                        </div>

                        {/* Toggle button */}
                        <button
                          type="button"
                          onClick={() => toggleExaminer(ex.examinerId)}
                          className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors ml-1"
                          title={isExpanded ? "Collapse paper details" : "Expand paper details"}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Accordion Body: Paper-Wise Table */}
                    {isExpanded && (
                      <div className="overflow-x-auto bg-white">
                        <table className="block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50/80 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                              <th className="px-4 py-3">Paper Code</th>
                              <th className="px-4 py-3">Paper Name</th>
                              <th className="px-4 py-3">Catch No</th>
                              <th className="px-4 py-3 text-center">Paper Pending</th>
                              <th className="px-4 py-3 text-center">Current Allocated</th>
                              <th className="px-4 py-3 text-center">Completed</th>
                              <th className="px-4 py-3 text-center">Total Assigned</th>
                              <th className="px-4 py-3 text-center">Target Allocation</th>
                              <th className="px-4 py-3 text-right pr-6">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {ex.papers.map((paper) => {
                              const key = `${paper.projectPaperId || paper.paperId}_${paper.examinerId}`;
                              const currentInputVal = editedCounts[key] !== undefined ? editedCounts[key] : paper.allocatedCount;
                              const isSaving = updatingId === key;
                              const maxAllowed = paper.totalAllocatedCount + (paper.pendingScripts || 0);

                              return (
                                <tr key={key} className="hover:bg-teal-50/20 transition-colors">
                                  {/* Paper Code */}
                                  <td className="px-4 py-3 font-semibold text-gray-800">
                                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-black rounded uppercase tracking-wider">
                                      {paper.paperCode || '—'}
                                    </span>
                                  </td>

                                  {/* Paper Name */}
                                  <td className="px-4 py-3">
                                    <p className="text-[11px] font-semibold text-gray-700 truncate max-w-[240px]" title={paper.paperName}>
                                      {paper.paperName || '—'}
                                    </p>
                                  </td>

                                  {/* Catch No */}
                                  <td className="px-4 py-3">
                                    <span className="text-[11px] font-bold text-gray-600">
                                      {paper.catchNo || '—'}
                                    </span>
                                  </td>

                                  {/* Paper Pending */}
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200" title={`Pending in project for ${paper.paperCode}`}>
                                      {paper.pendingScripts}
                                    </span>
                                  </td>

                                  {/* Current Allocated */}
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold border border-teal-200">
                                      {paper.allocatedCount}
                                    </span>
                                  </td>

                                  {/* Completed */}
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                                      {paper.completedCount}
                                    </span>
                                  </td>

                                  {/* Total Assigned */}
                                  <td className="px-4 py-3 text-center font-extrabold text-gray-800">
                                    {paper.totalAllocatedCount}
                                  </td>

                                  {/* Target Allocation Count */}
                                  <td className="px-4 py-3 text-center">
                                    {editingRowKey === key ? (
                                      <input
                                        type="number"
                                        min="0"
                                        max={maxAllowed}
                                        value={currentInputVal}
                                        onChange={(e) => handleCountChange(key, e.target.value)}
                                        className="w-20 px-2.5 py-1.5 text-center text-xs font-bold border border-teal-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-teal-500"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="inline-flex items-center justify-center min-w-[32px] h-8 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">
                                        {paper.allocatedCount}
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="px-4 py-3 text-right pr-6">
                                    {editingRowKey === key ? (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingRowKey(null);
                                            setEditedCounts(prev => {
                                              const next = { ...prev };
                                              delete next[key];
                                              return next;
                                            });
                                          }}
                                          disabled={isSaving}
                                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                                        >
                                          <X size={12} />
                                          <span>Cancel</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveCount(paper)}
                                          disabled={isSaving}
                                          className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 shadow-2xs"
                                        >
                                          <Check size={12} />
                                          <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingRowKey(key);
                                            setEditedCounts(prev => ({
                                              ...prev,
                                              [key]: paper.allocatedCount
                                            }));
                                          }}
                                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold transition-colors border border-teal-200 inline-flex items-center gap-1 shadow-2xs"
                                          title="Edit Target Allocation Count"
                                        >
                                          <Edit2 size={12} />
                                          <span>Edit</span>
                                        </button>
                                        {paper.allocatedCount > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => handleResetToZero(paper)}
                                            disabled={isSaving}
                                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors border border-red-200 inline-flex items-center gap-1 shadow-2xs"
                                            title="Deallocate all active scripts for this paper"
                                          >
                                            <RotateCcw size={12} />
                                            <span>Deallocate</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
