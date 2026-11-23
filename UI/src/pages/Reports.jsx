import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Layers,
  BookOpen,
  Briefcase,
  Calendar,
  ChevronDown,
  Filter,
  RotateCcw,
  FileSpreadsheet,
  ExternalLink,
  X,
  Zap,
  Check,
  TrendingUp,
  FolderArchive,
  FolderCheck,
  Building2,
  GraduationCap
} from 'lucide-react';
import apiCall from '../services/api';
import projectService from '../services/projectService';
import paperService from '../services/paperService';
import { useAuth } from '../context/AuthContext';
import { encryptId, decryptId } from '../utils/encryption';
import TablePagination from '../components/TablePagination';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userType, universityId: userUniversityId } = useAuth();

  const urlUniversityId = userType === 'coordinator' ? userUniversityId : searchParams.get('universityId');
  const targetUniversityId = urlUniversityId ? Number(urlUniversityId) : null;

  // ── Report Type ─────────────────────────────────────────────────────────────
  // Types: 'archive-projects' (default), 'active-projects', 'department', 'examiner'
  const initialType = searchParams.get('type') || 'archive-projects';
  const [reportType, setReportType] = useState(initialType);

  // ── Projects Dropdown State ────────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const pParam = searchParams.get('projectId');
    return pParam ? decryptId(pParam) : '';
  });

  // ── Papers State (for project evaluation report) ───────────────────────────
  const [papers, setPapers] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── Search & Filter State ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState('paperNumber');
  const [sortOrder, setSortOrder] = useState('asc');
  const [qpFilter, setQpFilter] = useState('all'); // 'all' | 'uploaded' | 'missing'
  const [sectionFilter, setSectionFilter] = useState('all'); // 'all' | 'configured' | 'missing'
  const [examinerFilter, setExaminerFilter] = useState('all'); // 'all' | 'assigned' | 'unassigned'

  // ── Modals State ───────────────────────────────────────────────────────────
  const [detailPaper, setDetailPaper] = useState(null);
  const [qpModalUrl, setQpModalUrl] = useState(null);
  const [qpModalPaper, setQpModalPaper] = useState(null);

  // ── Department & Examiner Reports State ────────────────────────────────────
  const [deptStats, setDeptStats] = useState([]);
  const [loadingDept, setLoadingDept] = useState(false);
  const [examinerStats, setExaminerStats] = useState([]);
  const [loadingExaminer, setLoadingExaminer] = useState(false);

  // ── Search Debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Sync URL Params ────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('type', reportType);
    if (selectedProjectId) {
      params.set('projectId', encryptId(selectedProjectId));
    } else {
      params.delete('projectId');
    }
    setSearchParams(params, { replace: true });
  }, [reportType, selectedProjectId]);

  // ── Fetch Projects (Inactive or Active) ─────────────────────────────────────
  const fetchProjectsList = useCallback(async () => {
    if (reportType !== 'archive-projects' && reportType !== 'active-projects') return;
    try {
      setLoadingProjects(true);
      const isArchive = reportType === 'archive-projects';
      const res = await projectService.getAllProjects(targetUniversityId, {
        isActive: !isArchive,
        pageSize: 0
      });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setProjects(items);

      // Auto-select first project if current selected is invalid
      if (items.length > 0) {
        const match = items.some(p => String(p.projectId) === String(selectedProjectId));
        if (!match) {
          setSelectedProjectId(items[0].projectId);
        }
      } else {
        setSelectedProjectId('');
      }
    } catch (err) {
      console.error('Failed to load projects list for report:', err);
      setProjects([]);
      setSelectedProjectId('');
    } finally {
      setLoadingProjects(false);
    }
  }, [reportType, targetUniversityId]);

  useEffect(() => {
    fetchProjectsList();
  }, [fetchProjectsList]);

  // ── Fetch Papers for Selected Project ──────────────────────────────────────
  const fetchPapers = useCallback(async () => {
    if (!selectedProjectId || (reportType !== 'archive-projects' && reportType !== 'active-projects')) {
      setPapers([]);
      setTotalCount(0);
      setTotalPages(1);
      return;
    }

    try {
      setLoadingPapers(true);
      const queryParams = new URLSearchParams({
        projectId: selectedProjectId,
        page,
        pageSize,
        search: debouncedSearch,
        sortField: sortField || 'paperNumber',
        sortOrder: sortOrder || 'asc',
      });

      if (qpFilter === 'uploaded') queryParams.append('qpStatus', 'uploaded');
      else if (qpFilter === 'missing') queryParams.append('qpStatus', 'missing');

      if (sectionFilter === 'configured') queryParams.append('statusFilter', 'ready_for_allocation');
      else if (sectionFilter === 'missing') queryParams.append('statusFilter', 'unconfigured');

      if (examinerFilter === 'assigned') queryParams.append('examinerFilter', 'allotted');
      else if (examinerFilter === 'unassigned') queryParams.append('examinerFilter', 'not_allotted');

      const res = await apiCall(`/papers/dashboard-stats?${queryParams.toString()}`);
      if (res) {
        setPapers(res.items || []);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load papers report:', err);
      setPapers([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoadingPapers(false);
    }
  }, [selectedProjectId, reportType, page, pageSize, debouncedSearch, sortField, sortOrder, qpFilter, sectionFilter, examinerFilter]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // ── Fetch Department Stats ─────────────────────────────────────────────────
  const fetchDeptStats = useCallback(async () => {
    if (reportType !== 'department') return;
    try {
      setLoadingDept(true);
      const res = await apiCall('/reports/department-wise');
      if (res && res.success) {
        setDeptStats(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch department stats:', err);
      setDeptStats([]);
    } finally {
      setLoadingDept(false);
    }
  }, [reportType]);

  useEffect(() => {
    fetchDeptStats();
  }, [fetchDeptStats]);

  // ── Fetch Examiner Stats ───────────────────────────────────────────────────
  const fetchExaminerStats = useCallback(async () => {
    if (reportType !== 'examiner') return;
    try {
      setLoadingExaminer(true);
      const res = await apiCall('/reports/examiner-performance');
      if (res && res.success) {
        setExaminerStats(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch examiner stats:', err);
      setExaminerStats([]);
    } finally {
      setLoadingExaminer(false);
    }
  }, [reportType]);

  useEffect(() => {
    fetchExaminerStats();
  }, [fetchExaminerStats]);

  // ── Current Selected Project Object ────────────────────────────────────────
  const currentProject = useMemo(() => {
    return projects.find(p => String(p.projectId) === String(selectedProjectId)) || null;
  }, [projects, selectedProjectId]);

  // ── Aggregate Project Summary Metrics ──────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (!papers || papers.length === 0) {
      return {
        totalPapers: totalCount,
        totalScripts: 0,
        evaluatedScripts: 0,
        allocatedScripts: 0,
        pendingScripts: 0,
        evaluatedPct: 0,
        sectionsConfiguredCount: 0,
        qpUploadedCount: 0,
        examinersAssignedCount: 0
      };
    }

    const totalScripts = papers.reduce((sum, p) => sum + (p.totalScripts || 0), 0);
    const evaluatedScripts = papers.reduce((sum, p) => sum + (p.completedScripts || 0), 0);
    const allocatedScripts = papers.reduce((sum, p) => sum + (p.allocatedScripts || 0), 0);
    const pendingScripts = papers.reduce((sum, p) => sum + (p.pendingScripts || 0), 0);
    const evaluatedPct = totalScripts > 0 ? Math.round((evaluatedScripts / totalScripts) * 100) : 0;
    const sectionsConfiguredCount = papers.filter(p => p.isSectionConfigured || p.isSectionsConfigured || p.batchId).length;
    const qpUploadedCount = papers.filter(p => !!p.questionPaperPdfUrl).length;
    const examinersAssignedCount = papers.filter(p => p.assignedExaminers && p.assignedExaminers.length > 0).length;

    return {
      totalPapers: totalCount,
      totalScripts,
      evaluatedScripts,
      allocatedScripts,
      pendingScripts,
      evaluatedPct,
      sectionsConfiguredCount,
      qpUploadedCount,
      examinersAssignedCount
    };
  }, [papers, totalCount]);

  // ── Sorting Toggle ─────────────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={11} className="text-gray-300 ml-1 inline shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={11} className="text-teal-600 ml-1 inline shrink-0" />
    ) : (
      <ArrowDown size={11} className="text-teal-600 ml-1 inline shrink-0" />
    );
  };

  // ── PDF URL Formatter ──────────────────────────────────────────────────────
  const getPdfUrl = (rawUrl) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
    return `${baseUrl}/${rawUrl.replace(/^\//, '')}`;
  };

  // ── CSV Export Function ────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!papers || papers.length === 0) return;

    const headers = [
      'Paper Code',
      'Paper Name',
      'Subject',
      'Catch No',
      'Max Marks',
      'Total Questions',
      'Section Configured',
      'Batch ID',
      'Question Paper Status',
      'Total Scripts',
      'Evaluated Scripts',
      'Allocated Scripts',
      'Pending Scripts',
      'Assigned Examiners'
    ];

    const rows = papers.map(p => {
      const examiners = (p.assignedExaminers || []).map(e => e.name || e.email || `Examiner #${e.id}`).join('; ');
      return [
        `"${p.paperCode || ''}"`,
        `"${(p.paperName || '').replace(/"/g, '""')}"`,
        `"${(p.subjectName || '').replace(/"/g, '""')}"`,
        `"${p.catchNo || ''}"`,
        p.maxMarks || 0,
        p.totalQuestions || 0,
        p.isSectionConfigured || p.isSectionsConfigured || p.batchId ? 'Yes' : 'No',
        p.batchId || 'N/A',
        p.questionPaperPdfUrl ? 'Uploaded' : 'Missing',
        p.totalScripts || 0,
        p.completedScripts || 0,
        p.allocatedScripts || 0,
        p.pendingScripts || 0,
        `"${examiners.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `${(currentProject?.projectName || 'Project').replace(/\s+/g, '_')}_Evaluation_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER (OSM Portal Standard Card) ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Identity Badge & Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shadow-xs shrink-0">
            <BarChart3 size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Reports & Analytics
              </h1>
              {reportType === 'archive-projects' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                  <FolderArchive size={11} />
                  Archive Report
                </span>
              )}
              {reportType === 'active-projects' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <FolderCheck size={11} />
                  Active Report
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-semibold truncate mt-0.5">
              Comprehensive evaluation metrics, paper configurations, and examiner allocations
            </p>
          </div>
        </div>

        {/* Right: Dropdown Controls */}
        <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 justify-start lg:justify-end">
          {/* Report Type Dropdown */}
          <div className="relative">
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setPage(1);
                setSearch('');
              }}
              className="appearance-none bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="archive-projects">Archive Projects Report</option>
              <option value="active-projects">Active Projects Report</option>
              <option value="department">Department Summary</option>
              <option value="examiner">Examiner Statistics</option>
            </select>
            <ChevronDown size={13} className="text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── ARCHIVE & ACTIVE PROJECTS EVALUATION REPORT ──────────────────── */}
      {(reportType === 'archive-projects' || reportType === 'active-projects') && (
        <>
          {loadingProjects ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-bold text-gray-500">Loading project data...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                <FolderArchive size={28} />
              </div>
              <h3 className="text-base font-black text-gray-800">
                {reportType === 'archive-projects' ? 'No Inactive Projects Found' : 'No Active Projects Found'}
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                {reportType === 'archive-projects'
                  ? 'There are currently no archived or inactive projects to generate reports for.'
                  : 'There are currently no active projects found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── PAPERS EVALUATION AUDIT TABLE CARD ────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                {/* Search & Action Bar */}
                <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white">
                  {/* Left: Search input & Project Dropdown */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap flex-1 min-w-0">
                    {/* Search input */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all w-full sm:w-72 shrink-0">
                      <Search size={14} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search paper code, name, subject, catch no..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent text-gray-800 placeholder-gray-400 font-semibold text-xs focus:outline-none"
                      />
                      {search && (
                        <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Archive Project Selection Dropdown beside Search Bar */}
                    <div className="relative shrink-0">
                      <select
                        value={selectedProjectId}
                        onChange={(e) => {
                          setSelectedProjectId(e.target.value);
                          setPage(1);
                        }}
                        disabled={loadingProjects || projects.length === 0}
                        className="appearance-none bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold pl-3 pr-8 py-2 rounded-xl border border-teal-200/90 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer shadow-2xs max-w-[260px] truncate disabled:opacity-50 disabled:cursor-not-allowed"
                        title={reportType === 'archive-projects' ? 'Select Archive Project' : 'Select Active Project'}
                      >
                          {loadingProjects ? (
                            <option value="">Loading projects...</option>
                          ) : projects.length === 0 ? (
                            <option value="">
                              {reportType === 'archive-projects' ? 'No Inactive Projects' : 'No Active Projects'}
                            </option>
                          ) : (
                            projects.map((p) => (
                              <option key={p.projectId} value={p.projectId}>
                                {p.projectName} {p.session?.sessionName ? `(${p.session.sessionName})` : ''}
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown size={13} className="text-teal-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                  {/* Right: Filters & Export */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* QP Filter */}
                    <select
                      value={qpFilter}
                      onChange={(e) => { setQpFilter(e.target.value); setPage(1); }}
                      className="bg-gray-50 text-gray-700 text-xs font-semibold px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      title="Filter by Question Paper status"
                    >
                      <option value="all">QP: All</option>
                      <option value="uploaded">QP: Uploaded</option>
                      <option value="missing">QP: Missing</option>
                    </select>

                    {/* Section Filter */}
                    <select
                      value={sectionFilter}
                      onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
                      className="bg-gray-50 text-gray-700 text-xs font-semibold px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      title="Filter by Section configuration"
                    >
                      <option value="all">Sections: All</option>
                      <option value="configured">Sections: Configured</option>
                      <option value="missing">Sections: Missing</option>
                    </select>

                    {/* Examiner Filter */}
                    <select
                      value={examinerFilter}
                      onChange={(e) => { setExaminerFilter(e.target.value); setPage(1); }}
                      className="bg-gray-50 text-gray-700 text-xs font-semibold px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      title="Filter by Examiner assignment"
                    >
                      <option value="all">Examiners: All</option>
                      <option value="assigned">Examiners: Allotted</option>
                      <option value="unassigned">Examiners: Not Allotted</option>
                    </select>

                    {/* Export to CSV */}
                    <button
                      onClick={handleExportCSV}
                      disabled={papers.length === 0}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                      title="Export this report to CSV"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Export CSV</span>
                    </button>

                    {/* Refresh */}
                    <button
                      onClick={fetchPapers}
                      className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition cursor-pointer"
                      title="Refresh Report"
                    >
                      <RotateCcw size={13} className={loadingPapers ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* ── TOP PAGINATION ── */}
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  setPage={setPage}
                  setPageSize={setPageSize}
                  position="top"
                />

                {/* Table Container */}
                <div className="overflow-x-auto whitespace-nowrap min-h-[300px]">
                  {loadingPapers ? (
                    <div className="p-16 text-center">
                      <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-xs font-bold text-gray-500">Loading paper evaluation report...</p>
                    </div>
                  ) : papers.length === 0 ? (
                    <div className="p-16 text-center space-y-2">
                      <p className="text-sm font-black text-gray-700">No papers found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search or filter options</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider select-none">
                          <th className="py-3 px-4 w-12 text-center">#</th>
                          <th className="py-3 px-4 cursor-pointer hover:text-teal-700" onClick={() => handleSort('paperCode')}>
                            Paper Code {renderSortIndicator('paperCode')}
                          </th>
                          <th className="py-3 px-4 cursor-pointer hover:text-teal-700" onClick={() => handleSort('paperName')}>
                            Paper Name {renderSortIndicator('paperName')}
                          </th>
                          <th className="py-3 px-4 cursor-pointer hover:text-teal-700" onClick={() => handleSort('subjectName')}>
                            Subject {renderSortIndicator('subjectName')}
                          </th>
                          <th className="py-3 px-4 cursor-pointer hover:text-teal-700" onClick={() => handleSort('catchNo')}>
                            Catch No {renderSortIndicator('catchNo')}
                          </th>
                          <th className="py-3 px-4 text-center cursor-pointer hover:text-teal-700" onClick={() => handleSort('maxMarks')}>
                            Max Marks / Qs {renderSortIndicator('maxMarks')}
                          </th>
                          <th className="py-3 px-4 text-center cursor-pointer hover:text-teal-700" onClick={() => handleSort('batchId')}>
                            Section Batch {renderSortIndicator('batchId')}
                          </th>
                          <th className="py-3 px-4 text-center cursor-pointer hover:text-teal-700" onClick={() => handleSort('qpStatus')}>
                            Question Paper {renderSortIndicator('qpStatus')}
                          </th>
                          <th className="py-3 px-4 text-center cursor-pointer hover:text-teal-700" onClick={() => handleSort('totalScripts')}>
                            Total Scripts {renderSortIndicator('totalScripts')}
                          </th>
                          <th className="py-3 px-4 text-center cursor-pointer hover:text-teal-700" onClick={() => handleSort('completedScripts')}>
                            Evaluated {renderSortIndicator('completedScripts')}
                          </th>
                          <th className="py-3 px-4 text-center cursor-pointer hover:text-teal-700" onClick={() => handleSort('allocatedScripts')}>
                            Allocated {renderSortIndicator('allocatedScripts')}
                          </th>
                          <th className="py-3 px-4 text-center cursor-pointer hover:text-teal-700" onClick={() => handleSort('pendingScripts')}>
                            Pending {renderSortIndicator('pendingScripts')}
                          </th>
                          <th className="py-3 px-4 text-center cursor-pointer hover:text-teal-700" onClick={() => handleSort('examiner')}>
                            Allotted Examiners {renderSortIndicator('examiner')}
                          </th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {papers.map((paper, idx) => {
                          const rowNum = (page - 1) * pageSize + idx + 1;
                          const isConfigured = paper.isSectionConfigured || paper.isSectionsConfigured || !!paper.batchId;
                          const hasQp = !!paper.questionPaperPdfUrl;
                          const evaluated = paper.completedScripts || 0;
                          const total = paper.totalScripts || 0;
                          const evalPct = total > 0 ? Math.round((evaluated / total) * 100) : 0;
                          const examiners = paper.assignedExaminers || [];

                          return (
                            <tr key={paper.paperId} className="hover:bg-teal-50/20 transition-colors">
                              {/* Row Index */}
                              <td className="py-3 px-4 text-center font-bold text-gray-400">
                                {rowNum}
                              </td>

                              {/* Paper Code */}
                              <td className="py-3 px-4 font-black text-gray-900">
                                <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-gray-800 font-mono text-[11px] border border-gray-200">
                                  {paper.paperCode || '-'}
                                </span>
                              </td>

                              {/* Paper Name */}
                              <td className="py-3 px-4 font-bold text-gray-800 max-w-[220px] truncate" title={paper.paperName}>
                                {paper.paperName || '-'}
                              </td>

                              {/* Subject */}
                              <td className="py-3 px-4 text-gray-600 font-semibold">
                                {paper.subjectName || (paper.subjectNames?.length > 0 ? paper.subjectNames.join(', ') : '-')}
                              </td>

                              {/* Catch No */}
                              <td className="py-3 px-4 font-mono text-gray-600 text-[11px]">
                                {paper.catchNo ? (
                                  <span className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded">
                                    {paper.catchNo}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>

                              {/* Max Marks / Qs */}
                              <td className="py-3 px-4 text-center">
                                <span className="font-bold text-gray-900">{paper.maxMarks || 0}m</span>
                                <span className="text-[10px] text-gray-400 font-medium block">
                                  {paper.totalQuestions || 0} Questions
                                </span>
                              </td>

                              {/* Section Batch Configured */}
                              <td className="py-3 px-4 text-center">
                                {isConfigured ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Check size={10} className="stroke-[3]" />
                                    {paper.batchId ? `Batch #${paper.batchId}` : 'Configured'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <AlertCircle size={10} />
                                    Not Configured
                                  </span>
                                )}
                              </td>

                              {/* Question Paper (QP) */}
                              <td className="py-3 px-4 text-center">
                                {hasQp ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQpModalUrl(getPdfUrl(paper.questionPaperPdfUrl));
                                      setQpModalPaper(paper);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 transition-all cursor-pointer shadow-2xs"
                                    title="Preview Question Paper PDF"
                                  >
                                    <Eye size={11} className="text-emerald-700" />
                                    <span>VIEW PDF</span>
                                  </button>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-400 border border-gray-200">
                                    No QP
                                  </span>
                                )}
                              </td>

                              {/* Total Scripts */}
                              <td className="py-3 px-4 text-center font-bold text-gray-800">
                                <span className="px-2 py-0.5 bg-gray-50 rounded-md border border-gray-200 text-gray-900 font-mono">
                                  {paper.totalScripts || 0}
                                </span>
                              </td>

                              {/* Evaluated Scripts */}
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className={`font-black text-xs ${evalPct === 100 ? 'text-emerald-700' : 'text-gray-800'}`}>
                                    {evaluated} <span className="text-[10px] text-gray-400 font-semibold">({evalPct}%)</span>
                                  </span>
                                  <div className="w-14 bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        evalPct === 100 ? 'bg-emerald-500' : evalPct > 0 ? 'bg-teal-600' : 'bg-transparent'
                                      }`}
                                      style={{ width: `${evalPct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Allocated Scripts */}
                              <td className="py-3 px-4 text-center font-semibold text-gray-700">
                                {paper.allocatedScripts || 0}
                              </td>

                              {/* Pending Scripts */}
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 font-bold ${
                                  (paper.pendingScripts || 0) > 0 ? 'text-amber-700' : 'text-gray-400'
                                }`}>
                                  {(paper.pendingScripts || 0) > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  )}
                                  {paper.pendingScripts || 0}
                                </span>
                              </td>

                              {/* Allotted Examiners */}
                              <td className="py-3 px-4 text-center">
                                {examiners.length > 0 ? (
                                  <div className="inline-flex items-center gap-1 justify-center">
                                    <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[10.5px] font-bold max-w-[120px] truncate" title={examiners[0].name || examiners[0].email}>
                                      {examiners[0].name || examiners[0].email || `Examiner #${examiners[0].id}`}
                                    </span>
                                    {examiners.length > 1 && (
                                      <span
                                        className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold border border-gray-200 cursor-pointer hover:bg-gray-200"
                                        title={examiners.map(e => e.name || e.email).join(', ')}
                                      >
                                        +{examiners.length - 1}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-medium italic">
                                    Not Allotted
                                  </span>
                                )}
                              </td>

                              {/* Standardized Actions Column */}
                              <td className="py-2.5 text-right whitespace-nowrap md:px-6 px-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setDetailPaper(paper)}
                                    className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl border border-teal-100 transition cursor-pointer"
                                    title="View Full Paper Report Details"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* ── BOTTOM PAGINATION ── */}
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  setPage={setPage}
                  setPageSize={setPageSize}
                  position="bottom"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DEPARTMENT PERFORMANCE REPORT ───────────────────────────────── */}
      {reportType === 'department' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                Department-Wise Evaluation Progress
              </h2>
              <p className="text-xs text-gray-400">Total scripts, evaluation status, and average marks across departments</p>
            </div>
            <button
              onClick={fetchDeptStats}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition cursor-pointer"
              title="Refresh Department Stats"
            >
              <RotateCcw size={13} className={loadingDept ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto whitespace-nowrap min-h-[250px]">
            {loadingDept ? (
              <div className="p-16 text-center">
                <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-bold text-gray-500">Loading department statistics...</p>
              </div>
            ) : deptStats.length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-xs">No department data available</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Total Scripts</th>
                    <th className="py-3 px-4 text-center">Evaluated</th>
                    <th className="py-3 px-4 text-center">Pending</th>
                    <th className="py-3 px-4 text-center">Avg Score</th>
                    <th className="py-3 px-4 text-center">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {deptStats.map((dept, index) => (
                    <tr key={index} className="hover:bg-teal-50/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{dept.department}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-700">{dept.total}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">{dept.evaluated}</td>
                      <td className="py-3 px-4 text-center font-bold text-amber-700">{dept.pending}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800">{dept.avgScore}%</td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-teal-600 h-full rounded-full" style={{ width: `${dept.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-600">{dept.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── EXAMINER PERFORMANCE REPORT ─────────────────────────────────── */}
      {reportType === 'examiner' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                Examiner Evaluation Performance
              </h2>
              <p className="text-xs text-gray-400">Total scripts evaluated, average score given, and accuracy</p>
            </div>
            <button
              onClick={fetchExaminerStats}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition cursor-pointer"
              title="Refresh Examiner Stats"
            >
              <RotateCcw size={13} className={loadingExaminer ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto whitespace-nowrap min-h-[250px]">
            {loadingExaminer ? (
              <div className="p-16 text-center">
                <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-bold text-gray-500">Loading examiner performance data...</p>
              </div>
            ) : examinerStats.length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-xs">No examiner performance data available</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Examiner Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Scripts Evaluated</th>
                    <th className="py-3 px-4 text-center">Avg Marks</th>
                    <th className="py-3 px-4 text-center">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {examinerStats.map((ex, index) => (
                    <tr key={index} className="hover:bg-teal-50/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{ex.examiner}</td>
                      <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">{ex.email || '-'}</td>
                      <td className="py-3 px-4 text-center font-bold text-teal-700">{ex.scriptsEvaluated}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-800">{ex.avgMarks}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">{ex.accuracy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── PAPER DETAILS MODAL ─────────────────────────────────────────── */}
      {detailPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-black">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {detailPaper.paperName || 'Paper Details'}
                  </h3>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    {detailPaper.paperCode} • Catch No: {detailPaper.catchNo || 'None'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailPaper(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Total Scripts</span>
                <p className="text-lg font-black text-gray-800 mt-1">{detailPaper.totalScripts || 0}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Evaluated</span>
                <p className="text-lg font-black text-emerald-800 mt-1">{detailPaper.completedScripts || 0}</p>
              </div>
              <div className="bg-teal-50 p-3 rounded-xl border border-teal-100">
                <span className="text-[10px] font-bold text-teal-700 uppercase">Allocated</span>
                <p className="text-lg font-black text-teal-800 mt-1">{detailPaper.allocatedScripts || 0}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Pending</span>
                <p className="text-lg font-black text-amber-800 mt-1">{detailPaper.pendingScripts || 0}</p>
              </div>
            </div>

            {/* Config & QP Info */}
            <div className="space-y-2 bg-gray-50/70 p-4 rounded-xl border border-gray-100 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-500">Subject:</span>
                <span className="font-semibold text-gray-800">{detailPaper.subjectName || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-500">Questions & Marks:</span>
                <span className="font-semibold text-gray-800">{detailPaper.totalQuestions} Questions • {detailPaper.maxMarks} Max Marks</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-500">Section Batch Configured:</span>
                <span className={`font-bold ${detailPaper.isSectionConfigured || detailPaper.batchId ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {detailPaper.isSectionConfigured || detailPaper.batchId ? `Configured (Batch #${detailPaper.batchId || 1})` : 'Not Configured'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-gray-500">Question Paper PDF:</span>
                {detailPaper.questionPaperPdfUrl ? (
                  <a
                    href={getPdfUrl(detailPaper.questionPaperPdfUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800 underline"
                  >
                    Open PDF <ExternalLink size={11} />
                  </a>
                ) : (
                  <span className="text-gray-400 font-semibold">Not Uploaded</span>
                )}
              </div>
            </div>

            {/* Assigned Examiners */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                Allotted Examiners ({detailPaper.assignedExaminers?.length || 0})
              </p>
              {detailPaper.assignedExaminers && detailPaper.assignedExaminers.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {detailPaper.assignedExaminers.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-teal-50/50 border border-teal-100 text-xs">
                      <span className="font-bold text-teal-900">{ex.name || `Examiner #${ex.id}`}</span>
                      <span className="text-gray-500 font-mono text-[11px]">{ex.email || ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No examiners allotted to this paper yet.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setDetailPaper(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUESTION PAPER PDF VIEWER MODAL ─────────────────────────────── */}
      {qpModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Question Paper: {qpModalPaper?.paperName || 'PDF Viewer'}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">{qpModalPaper?.paperCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={qpModalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition"
                  title="Open in new window"
                >
                  <ExternalLink size={12} />
                  <span>Open Tab</span>
                </a>
                <button
                  onClick={() => { setQpModalUrl(null); setQpModalPaper(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF */}
            <div className="flex-1 bg-gray-100 relative">
              <iframe
                src={qpModalUrl}
                className="w-full h-full border-none"
                title="Question Paper Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
