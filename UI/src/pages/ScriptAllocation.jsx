import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import universitySettingService from '../services/universitySettingService';
import { decryptId } from '../utils/encryption';
import ProjectConfigHeader from '../components/ProjectConfigHeader';
import TablePagination from '../components/TablePagination';
import ColumnFilter from '../components/ColumnFilter';
import { useTable } from '../services/tableService';

const ALL_STRATEGIES = [
  { id: 'even', label: 'Even Distribution' },
  { id: 'daily', label: 'Daily Allocation' },
  { id: 'custom', label: 'Custom Ratio' },
];

const getStrategyFromAssignmentType = (typeStr) => {
  if (!typeStr) return null;
  const lower = typeStr.toLowerCase().trim();
  if (lower.includes('daily') || lower.includes('quota') || lower.includes('limit')) {
    return 'daily';
  }
  if (lower.includes('equal') || lower.includes('even') || lower.includes('single') || lower.includes('double')) {
    return 'even';
  }
  if (lower.includes('custom') || lower.includes('ratio') || lower.includes('manual')) {
    return 'custom';
  }
  return null;
};

export default function ScriptAllocation({ isTab = false }) {
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
  // Per-paper data for multi-paper allocation (paperId -> { examiners, pendingCount })
  const [perPaperData, setPerPaperData] = useState({});

  // University Assignment Configuration State
  const [configuredAssignmentSetting, setConfiguredAssignmentSetting] = useState(null);

  const configuredStrategyKey = getStrategyFromAssignmentType(configuredAssignmentSetting?.assignmentType);

  const visibleStrategies = useMemo(() => {
    if (configuredStrategyKey) {
      return [{
        id: configuredStrategyKey,
        label: configuredAssignmentSetting?.assignmentType || (
          configuredStrategyKey === 'daily' ? 'Daily Allocation' :
          configuredStrategyKey === 'even' ? 'Equal Distribution' : 'Custom Ratio'
        )
      }];
    }
    return ALL_STRATEGIES;
  }, [configuredStrategyKey, configuredAssignmentSetting]);

  const totalToAllocate = useMemo(() => {
    return Object.values(examinerCounts).reduce((a, b) => a + (Number(b) || 0), 0);
  }, [examinerCounts]);

  useEffect(() => {
    if (configuredStrategyKey && bulkMode !== configuredStrategyKey) {
      setBulkMode(configuredStrategyKey);
    }
  }, [configuredStrategyKey, bulkMode]);

  const fetchAssignmentConfig = useCallback(async (forcedUniId = null) => {
    try {
      let targetUniId = forcedUniId || activeUniversityId;
      if (!targetUniId && projectId) {
        try {
          const pData = await apiCall(`/project/${projectId}`);
          if (pData?.universityId) targetUniId = pData.universityId;
        } catch (e) {
          // ignore
        }
      }

      const res = await universitySettingService.getSettings(targetUniId ? parseInt(targetUniId, 10) : null);
      const list = Array.isArray(res) ? res : (res?.data || res?.items || (res?.universityId ? [res] : []));
      if (list.length > 0) {
        const matched = targetUniId ? list.find(u => u.universityId === parseInt(targetUniId, 10)) || list[0] : list[0];
        if (matched) {
          setConfiguredAssignmentSetting(matched);
          if (matched.dailyLimit && matched.dailyLimit > 0) {
            setDailyQuotaLimit(matched.dailyLimit);
          }
          const strat = getStrategyFromAssignmentType(matched.assignmentType);
          if (strat) {
            setBulkMode(strat);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch university assignment settings:', err);
    }
  }, [activeUniversityId, projectId]);

  useEffect(() => {
    fetchAssignmentConfig();
  }, [fetchAssignmentConfig]);

  // Automatically calculate distribution counts according to configured strategy / daily limit
  useEffect(() => {
    if (examiners.length > 0 && scriptCounts.pending > 0) {
      const strat = getStrategyFromAssignmentType(configuredAssignmentSetting?.assignmentType) || bulkMode;
      const limit = configuredAssignmentSetting?.dailyLimit || dailyQuotaLimit || 2;

      const counts = {};
      if (strat === 'daily') {
        let remaining = scriptCounts.pending;
        examiners.forEach((examiner) => {
          const quota = Math.min(remaining, limit);
          counts[examiner.examinerId] = quota;
          remaining -= quota;
        });
      } else if (strat === 'even') {
        const baseShare = Math.floor(scriptCounts.pending / examiners.length);
        const remainder = scriptCounts.pending % examiners.length;
        examiners.forEach((examiner, idx) => {
          counts[examiner.examinerId] = baseShare + (idx < remainder ? 1 : 0);
        });
      }
      if (strat === 'daily' || strat === 'even') {
        setExaminerCounts(counts);
      }
    }
  }, [configuredAssignmentSetting, examiners, scriptCounts.pending, bulkMode, dailyQuotaLimit]);

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
  const fetchFn = useCallback(async (params) => {
    if (projectId) {
      const searchVal = params.search || '';
      const pageVal = params.page || 1;
      const pageSizeVal = params.pageSize || 10;
      const sortFieldVal = params.sortField || '';
      const sortOrderVal = params.sortOrder || '';
      const uniQuery = activeUniversityId ? `&universityId=${activeUniversityId}` : '';

      // try {
      //   const res = await apiCall(`/papers/dashboard-stats?projectId=${projectId}&page=${pageVal}&pageSize=${pageSizeVal}&search=${searchVal}&sortField=${sortFieldVal}&sortOrder=${sortOrderVal}&statusFilter=ready_for_allocation${uniQuery}`);
      //   if (res && res.items && res.items.length > 0) {
      //     return res;
      //   }
      // } catch (e) {
      //   console.warn('dashboard-stats query failed, checking pending endpoint:', e);
      // }

      // University-wise pending scripts endpoint fallback
      try {
        const pendingRes = await apiCall(`/scripts/pending?projectId=${projectId}&page=${pageVal}&pageSize=${pageSizeVal}&search=${searchVal}${uniQuery}`);
        if (pendingRes && pendingRes.papers && pendingRes.papers.length > 0) {
          if (pendingRes.universityId && !configuredAssignmentSetting) {
            fetchAssignmentConfig(pendingRes.universityId);
          }
          return {
            items: pendingRes.papers,
            totalCount: pendingRes.papers.length,
            page: pageVal,
            pageSize: pageSizeVal,
            totalPages: 1
          };
        }
      } catch (err) {
        console.warn('pending endpoint query error:', err);
      }
    }
    return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 1 };
  }, [projectId, activeUniversityId]);

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
    const allocatablePapers = papers.filter(p => p.pendingScripts > 0);
    if (selectedPaperIds.length === allocatablePapers.length) {
      setSelectedPaperIds([]);
    } else {
      setSelectedPaperIds(allocatablePapers.map(p => p.paperId));
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
    if (!paper.questionPaperPdfUrl) {
      message.info(`Note: Paper "${paper.paperName}" does not have a Question Paper PDF uploaded yet.`);
    }

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
      // Check ProjectPaperSections first, falling back to master sections
      let sectionsData = null;
      if (paper.projectPaperId) {
        sectionsData = await sectionService.getProjectPaperSections({ projectPaperId: paper.projectPaperId });
      }
      if (!sectionsData || sectionsData.length === 0) {
        sectionsData = await sectionService.getProjectPaperSections({ projectId, paperId: paper.paperId });
      }
      if (!sectionsData || sectionsData.length === 0) {
        sectionsData = await sectionService.getAllSections(paper.paperId);
      }

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

      const examinersData = await apiCall(
        paper.projectPaperId 
          ? `/PaperExaminers/project-paper/${paper.projectPaperId}` 
          : `/PaperExaminers/paper/${paper.paperId}${projectId ? `?projectId=${projectId}` : ''}`
      );
      setExaminers(examinersData || []);

      // Strategy-based distribution counts
      const counts = {};
      const activeEx = (examinersData || []);
      const currentStrategy = getStrategyFromAssignmentType(configuredAssignmentSetting?.assignmentType) || bulkMode;
      const currentLimit = configuredAssignmentSetting?.dailyLimit || dailyQuotaLimit || 50;

      if (currentStrategy === 'daily') {
        let remaining = pendingCount;
        activeEx.forEach((ex) => {
          const quota = Math.min(remaining, currentLimit);
          counts[ex.examinerId] = quota;
          remaining -= quota;
        });
      } else {
        const baseShare = activeEx.length > 0 ? Math.floor(pendingCount / activeEx.length) : 0;
        const remainder = activeEx.length > 0 ? pendingCount % activeEx.length : 0;

        activeEx.forEach((ex, idx) => {
          counts[ex.examinerId] = baseShare + (idx < remainder ? 1 : 0);
        });
      }
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

    const selectedPapersData = papers.filter(p => selectedPaperIds.includes(p.paperId));
    const missingQpPapers = selectedPapersData.filter(p => !p.questionPaperPdfUrl);
    if (missingQpPapers.length > 0) {
      const names = missingQpPapers.map(p => p.paperName).join(', ');
      message.info(`Note: The following papers do not have a Question Paper PDF uploaded yet: ${names}`);
    }

    setIsMultiPaperMode(true);
    setActivePaper(null);
    setLoading(true);

    try {
      const currentStrategy = getStrategyFromAssignmentType(configuredAssignmentSetting?.assignmentType) || bulkMode;
      const currentLimit = configuredAssignmentSetting?.dailyLimit || dailyQuotaLimit || 50;

      let totalPending = 0;
      let totalAllocated = 0;
      let totalScriptsSum = 0;
      let combinedExaminersMap = new Map();
      const newPerPaperData = {};

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

        const paperPending = pCounts?.pendingScripts ?? p.pendingScripts ?? 0;
        totalPending += paperPending;
        totalAllocated += (pCounts?.allocatedScripts ?? p.allocatedScripts ?? 0);
        totalScriptsSum += (pCounts?.totalScripts ?? p.totalScripts ?? 0);

        const exData = await apiCall(
          p.projectPaperId
            ? `/PaperExaminers/project-paper/${p.projectPaperId}`
            : `/PaperExaminers/paper/${p.paperId}${projectId ? `?projectId=${projectId}` : ''}`
        );
        const paperExaminers = Array.isArray(exData) ? exData : [];

        // Compute per-paper distribution independently based on this paper's examiners + pending count
        const paperCounts = {};
        if (currentStrategy === 'daily') {
          let remaining = paperPending;
          paperExaminers.forEach((ex) => {
            const quota = Math.min(remaining, currentLimit);
            paperCounts[ex.examinerId] = quota;
            remaining -= quota;
          });
        } else {
          // Even/equal distribution: divide pending scripts equally among this paper's examiners
          const n = paperExaminers.length;
          if (n > 0) {
            const baseShare = Math.floor(paperPending / n);
            const rem = paperPending % n;
            paperExaminers.forEach((ex, idx) => {
              paperCounts[ex.examinerId] = baseShare + (idx < rem ? 1 : 0);
            });
          }
        }

        newPerPaperData[p.paperId] = { examiners: paperExaminers, pending: paperPending, counts: paperCounts };

        paperExaminers.forEach(ex => {
          if (!combinedExaminersMap.has(ex.examinerId)) {
            combinedExaminersMap.set(ex.examinerId, ex);
          }
        });
      }

      setPerPaperData(newPerPaperData);

      setScriptCounts({
        pending: totalPending,
        allocated: totalAllocated,
        total: totalScriptsSum,
        experts: combinedExaminersMap.size
      });

      const uniqueExaminers = Array.from(combinedExaminersMap.values());
      setExaminers(uniqueExaminers);

      // Show combined totals per examiner in the UI (sum across all papers they are assigned to)
      const combinedCounts = {};
      Object.values(newPerPaperData).forEach(({ counts }) => {
        Object.entries(counts).forEach(([exId, cnt]) => {
          combinedCounts[exId] = (combinedCounts[exId] || 0) + cnt;
        });
      });
      setExaminerCounts(combinedCounts);

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
    const limit = dailyQuotaLimit > 0 ? dailyQuotaLimit : (configuredAssignmentSetting?.dailyLimit || 2);

    examiners.forEach((examiner) => {
      const quota = Math.min(remaining, limit);
      counts[examiner.examinerId] = quota;
      remaining -= quota;
    });

    setExaminerCounts(counts);
    message.info(`Applied daily quota limit of ${limit} scripts/examiner.`);
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
        // Allocate per paper using per-paper examiner lists and independently computed counts
        const targetPapers = papers.filter(p => selectedPaperIds.includes(p.paperId));
        let successCount = 0;

        for (const paper of targetPapers) {
          const ppData = perPaperData[paper.paperId];
          const pendingCount = ppData?.pending ?? paper.pendingScripts ?? 0;
          if (pendingCount === 0) continue;

          // Use per-paper examiners and their independently calculated counts
          const paperAllocations = (ppData?.examiners || []).map(e => {
            const count = ppData?.counts?.[e.examinerId] || 0;
            return { examinerId: e.examinerId, count };
          }).filter(a => a.count > 0);

          if (paperAllocations.length > 0) {
            await allocationService.bulkAllocateScripts(paper.paperId, paperAllocations);
            successCount++;
          }
        }

        message.success(`Bulk allocation completed across ${successCount} papers!`);
        setIsMultiPaperMode(false);
        setSelectedPaperIds([]);
        setPerPaperData({});
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
      {!isTab && <ProjectConfigHeader />}
      
      <div className="w-full space-y-4 mt-4">
        
        {/* Main Header Card (Removed as per user request to avoid redundancy) */}


      {(!projectId && !isTab) ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-black text-gray-900 mb-2">Select a Project</h3>
          <p className="text-sm font-semibold text-gray-500">
            Please select a project from the dropdown above to view script allocations.
          </p>
        </div>
      ) : (
        <>
        {/* Header content moved to ProjectConfigHeader */}

        {/* TAB 1: ALLOCATION WORKFLOW */}
        {activeMainTab === 'allocate' && (
          <div className="w-full flex flex-col gap-4 items-start">

            {/* Papers List & Multi-Select */}
            <div className="w-full flex flex-col transition-all duration-300">
              {tableLoading && papers.length === 0 ? (
                <div className="space-y-3">
                  <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-md flex items-center justify-center font-bold text-xs">1</div>
                    Select Papers to Allocate
                  </h2>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-12 text-center flex flex-col items-center gap-3">
                    <Loader className="animate-spin text-teal-700" size={32} />
                    <span className="text-xs font-bold text-gray-400">Loading papers...</span>
                  </div>
                </div>
              ) : papers.length === 0 ? (
                <div className="space-y-3">
                  <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-md flex items-center justify-center font-bold text-xs">1</div>
                    Select Papers to Allocate
                  </h2>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-16 text-center text-gray-500 font-medium leading-relaxed max-w-sm mx-auto space-y-3">
                    <FileText className="mx-auto text-gray-400" size={32} />
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">No Papers Found</h3>
                      <p className="text-[10px] text-gray-400 mt-1">There are no papers found for this project.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-fade-in">
                  <div className="p-3 border-b border-gray-100 bg-white flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* Left: Heading */}
                    <h2 className="text-base font-black text-gray-900 flex items-center gap-2 whitespace-nowrap pl-1">
                      <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-md flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      Select Papers to Allocate
                    </h2>

                    {/* Right: Search, Count, Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto">
                      {/* Search Bar */}
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all min-w-[220px]">
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

                      {/* Action buttons */}
                      {selectedPaperIds.length > 0 && (
                        <button
                          onClick={openMultiPaperPane}
                          className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
                        >
                          <Zap size={13} />
                          Allocate Selected ({selectedPaperIds.length})
                        </button>
                      )}
                      {projectId && (
                        <div className="relative group/tooltip inline-block">
                          <button
                            onClick={handleAutoAllocateProject}
                            disabled={autoProjectLoading || !papers.some(p => p.pendingScripts > 0)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm shrink-0 cursor-pointer ${
                              !papers.some(p => p.pendingScripts > 0)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none'
                                : 'bg-teal-700 hover:bg-teal-800 text-white hover:shadow disabled:opacity-50'
                            }`}
                          >
                            {autoProjectLoading ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />}
                            {autoProjectLoading ? "Allocating..." : "Auto-Allocate All"}
                          </button>
                          {!papers.some(p => p.pendingScripts > 0) && papers.length > 0 && (
                            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded shadow-sm opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50">
                              All scripts are already allocated
                              <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className=" block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest select-none">
                          <th className="px-4 py-2.5 text-center w-10">
                            <input
                              type="checkbox"
                              checked={selectedPaperIds.length > 0 && selectedPaperIds.length === papers.filter(p => p.pendingScripts > 0).length}
                              onChange={toggleSelectAllPapers}
                              disabled={papers.filter(p => p.pendingScripts > 0).length === 0}
                              className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  disabled={paper.pendingScripts === 0}
                                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <div className="relative group/tooltip inline-block">
                                  <button
                                    onClick={() => openAllocationPane(paper)}
                                    disabled={paper.pendingScripts === 0}
                                    className={`p-1.5 rounded-lg transition-all block border ${
                                      paper.pendingScripts === 0
                                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                                        : 'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-700 hover:text-white hover:border-teal-700'
                                    }`}
                                  >
                                    <Zap size={14} />
                                  </button>
                                  <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded shadow-sm opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50">
                                    {paper.pendingScripts === 0 ? "Already Fully Allocated" : "Allocate Scripts"}
                                    <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
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

            {/* Modal: Allocation Configuration Pane (Single or Multi Paper) */}
            {(activePaper || isMultiPaperMode) && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                  
                  {/* Modal Header */}
                  <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                        <Zap size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
                          {isMultiPaperMode ? `Batch Allocation (${selectedPaperIds.length} ${selectedPaperIds.length === 1 ? 'Paper' : 'Papers'})` : `Allocate: ${activePaper.paperName}`}
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">
                          {isMultiPaperMode ? "Assign scripts across selected papers" : `Paper Code: ${activePaper.paperCode}`}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setActivePaper(null); setIsMultiPaperMode(false); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
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
                        {/* Policy Banner (One sleek, non-repetitive bar) */}
                        {configuredStrategyKey ? (
                          <div className="bg-gradient-to-r from-teal-50/90 via-teal-50/40 to-emerald-50/50 border border-teal-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Clock size={17} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-extrabold text-gray-900 tracking-tight">
                                    {configuredAssignmentSetting?.assignmentType || "Daily Allocation"}
                                  </span>
                                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-full">
                                    Auto-applied
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Allocating <span className="font-extrabold text-teal-900">{configuredAssignmentSetting?.dailyLimit || dailyQuotaLimit} scripts / examiner</span> automatically according to university policy.
                                </p>
                              </div>
                            </div>

                            <div className="px-3.5 py-1.5 bg-white border border-teal-200/80 rounded-xl text-right shrink-0 shadow-2xs">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">Total to Allocate</span>
                              <span className="text-sm font-black text-teal-800">
                                {totalToAllocate} <span className="text-xs font-semibold text-gray-400">/ {scriptCounts.pending} pending</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Manual Strategy Selection (Only if university has no configured strategy) */
                          <div className="space-y-3">
                            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">
                              Select Distribution Strategy
                            </p>
                            <div className="grid gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200 sm:grid-cols-3 grid-cols-1">
                              {visibleStrategies.map(strat => (
                                <button
                                  key={strat.id}
                                  type="button"
                                  onClick={() => setBulkMode(strat.id)}
                                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                    bulkMode === strat.id
                                      ? 'bg-white text-teal-800 shadow-xs border border-gray-200'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  {strat.label}
                                </button>
                              ))}
                            </div>

                            {bulkMode === 'even' && (
                              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between gap-4">
                                <div>
                                  <h4 className="text-xs font-bold text-teal-900">Equal Distribution Across Examiners</h4>
                                  <p className="text-[11px] text-teal-700 mt-0.5">
                                    Automatically splits <span className="font-bold">{scriptCounts.pending}</span> pending scripts among <span className="font-bold">{examiners.length}</span> assigned examiners.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={calculateEvenDistribution}
                                  className="px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition-all shrink-0"
                                >
                                  Calculate
                                </button>
                              </div>
                            )}

                            {bulkMode === 'daily' && (
                              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between gap-4">
                                <div>
                                  <h4 className="text-xs font-bold text-teal-900">Daily Allotment Limit</h4>
                                  <p className="text-[11px] text-teal-700 mt-0.5">
                                    Set maximum scripts allotted per examiner per day.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={dailyQuotaLimit}
                                    onChange={(e) => setDailyQuotaLimit(parseInt(e.target.value) || 1)}
                                    className="w-16 px-2 py-1 border border-teal-300 rounded-md text-xs font-bold text-center bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={calculateDailyQuotaDistribution}
                                    className="px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition-all shrink-0"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Examiners List */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Assigned Examiners ({examiners.length})
                            </h3>
                            {!configuredStrategyKey && (
                              <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-md">
                                Total: <span className="text-teal-700 font-extrabold">{totalToAllocate}</span> / {scriptCounts.pending} pending
                              </span>
                            )}
                          </div>

                          {examiners.length === 0 ? (
                            <div className="text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8">
                              <Users className="mx-auto text-gray-300 mb-2" size={28} />
                              <p className="text-xs font-bold text-gray-500">No examiners assigned for selected scope</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                              {examiners.map(examiner => (
                                <div key={examiner.examinerId} className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-xl hover:border-teal-200 hover:shadow-2xs transition-all">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                                      {(examiner.examiner?.name || 'E').charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-900">{examiner.examiner?.name || 'Examiner'}</p>
                                      {examiner.examiner?.email && (
                                        <p className="text-[11px] text-gray-400 font-medium">{examiner.examiner.email}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {configuredStrategyKey ? (
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50/70 border border-teal-200/70 rounded-lg text-teal-900 shadow-2xs">
                                        <span className="text-xs font-black">{examinerCounts[examiner.examinerId] || 0}</span>
                                        <span className="text-[11px] font-semibold text-teal-700">scripts</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="number"
                                          min="0"
                                          max={scriptCounts.pending || 0}
                                          value={examinerCounts[examiner.examinerId] || 0}
                                          onChange={(e) => updateExaminerCount(examiner.examinerId, parseInt(e.target.value) || 0)}
                                          className="w-20 px-2.5 py-1.5 text-center text-xs font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-gray-50 focus:bg-white"
                                        />
                                        <span className="text-xs text-gray-400 font-medium">scripts</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Submit Action Buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500 font-medium">
                            {totalToAllocate > 0 ? (
                              <span>Assigning <strong className="text-gray-900">{totalToAllocate} scripts</strong> to <strong className="text-gray-900">{examiners.filter(e => (examinerCounts[e.examinerId] || 0) > 0).length} examiners</strong></span>
                            ) : (
                              <span className="text-amber-600 font-medium">No scripts ready to allocate</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => { setActivePaper(null); setIsMultiPaperMode(false); }}
                              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-2xs"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleBulkAllocate}
                              disabled={bulkLoading || examiners.length === 0 || totalToAllocate === 0}
                              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {bulkLoading ? <Loader className="animate-spin" size={14} /> : <Zap size={14} />}
                              {bulkLoading ? 'Allocating...' : 'Confirm Allocation'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </>
      )}
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 relative space-y-4 p-4 md:p-6">
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
                    {ex.fullName || ex.examinerName || ex.userName}
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
