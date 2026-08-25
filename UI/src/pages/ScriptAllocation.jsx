import { useState, useEffect, useCallback } from 'react';
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
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';
import paperService from '../services/paperService';
import allocationService from '../services/allocationService';
import sectionService from '../services/sectionService';
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
  const sessionId = searchParams.get('sessionId');
  const paperIdFromUrl = searchParams.get('paperId');
  const { userType, universityId: userUniversityId } = useAuth();
  const universityIdFromUrl = searchParams.get('universityId');
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityIdFromUrl;

  const [activePaper, setActivePaper] = useState(null); // The paper currently selected for bulk allocation
  const [scripts, setScripts] = useState([]);
  const [examiners, setExaminers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allocationData, setAllocationData] = useState({});
  
  // Bulk allocation state
  const [bulkMode, setBulkMode] = useState('even'); // 'even' or 'custom'
  const [examinerCounts, setExaminerCounts] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('allocate'); // 'allocate' | 'manage'

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

  const SortHeader = ({ label, field, isCenter = false, hasFilter = false }) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group/header ${isCenter ? 'text-center' : ''}`}
      >
        <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : ''}`}>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
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

  const openAllocationPane = async (paper) => {
    if (activePaper?.paperId === paper.paperId) {
      // Toggle off
      setActivePaper(null);
      setScripts([]);
      setExaminers([]);
      setAllocationData({});
      return;
    }

    setActivePaper(paper);
    setLoading(true);
    try {
      // Verify sections
      const sectionsData = await sectionService.getAllSections(paper.paperId);
      if (!sectionsData || sectionsData.length === 0) {
        message.warning(`Paper "${paper.paperName}" does not have sections configured yet.`);
        setActivePaper(null);
        setLoading(false);
        return;
      }

      // Fetch scripts
      const scriptsData = await apiCall(`/scripts?paperId=${paper.paperId}&limit=1000`);
      const paperScripts = (scriptsData || []).map(s => ({...s, paperId: paper.paperId, paperName: paper.paperName}));
      setScripts(paperScripts);

      const allocation = {};
      paperScripts.forEach(script => {
        // Also fallback to consider it pending if it has no allocationId and is not completed
        const isPending = script.status?.toLowerCase() === 'pending' || (script.status?.toLowerCase() !== 'completed' && !script.allocationId);
        allocation[script.id] = isPending ? null : (script.allocationId || 'allocated');
      });
      setAllocationData(allocation);

      // Fetch examiners
      const examinersData = await apiCall(`/PaperExaminers/paper/${paper.paperId}`);
      setExaminers(examinersData || []);

      // Initialize examiner counts for bulk allocation
      const counts = {};
      (examinersData || []).forEach(examiner => {
        counts[examiner.examinerId] = 0;
      });
      setExaminerCounts(counts);

    } catch (err) {
      message.error('Failed to fetch paper details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateScript = async (Id, examinerId) => {
    try {
      await allocationService.createAllocation(Id, examinerId);

      setAllocationData(prev => ({
        ...prev,
        [Id]: examinerId
      }));

      message.success('Script allocated successfully');
    } catch (err) {
      message.error('Failed to allocate script');
      console.error(err);
    }
  };

  const handleRemoveAllocation = async (Id) => {
    try {
      // Get the allocation ID first
      const allocation = await allocationService.getScriptAllocation(Id);
      if (allocation && allocation.id) {
        await allocationService.cancelAllocation(allocation.id);
      }

      setAllocationData(prev => ({
        ...prev,
        [Id]: null
      }));

      message.success('Allocation removed successfully');
    } catch (err) {
      message.error('Failed to remove allocation');
      console.error(err);
    }
  };

  const pendingCount = scripts.filter(s => !allocationData[s.id]).length;
  const allocatedCount = scripts.filter(s => allocationData[s.id]).length;

  const filteredScripts = scripts.filter(script =>
    script.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    script.rollNo?.includes(searchQuery)
  );

  const openBulkModal = () => {
    // Legacy function, no longer opens a modal, since the pane IS the modal.
  };

  const calculateEvenDistribution = () => {
    const pendingScripts = scripts.filter(s => !allocationData[s.id]);
    const activeExaminers = examiners.filter(e => e.examinerId);
    
    if (activeExaminers.length === 0 || pendingScripts.length === 0) {
      message.warning('No pending scripts or examiners available');
      return;
    }

    const counts = {};
    const baseCount = Math.floor(pendingScripts.length / activeExaminers.length);
    const remainder = pendingScripts.length % activeExaminers.length;

    activeExaminers.forEach((examiner, index) => {
      counts[examiner.examinerId] = baseCount + (index < remainder ? 1 : 0);
    });

    setExaminerCounts(counts);
  };

  const handleBulkAllocate = async () => {
    try {
      setBulkLoading(true);
      const pendingScripts = scripts.filter(s => !allocationData[s.id]);
      
      const payload = {
        paperId: activePaper.paperId,
        allocations: examiners.map(e => ({
          examinerId: e.examinerId,
          count: examinerCounts[e.examinerId] || 0
        })).filter(a => a.count > 0)
      };
      
      const res = await apiCall('/allocations/bulk-allocate', {
        method: 'POST',
        body: payload
      });
      
      message.success(res.message || 'Bulk allocation completed successfully');
      openAllocationPane(activePaper); // refresh
    } catch (err) {
      message.error(err.message || 'Failed to perform bulk allocation');
    } finally {
      setBulkLoading(false);
    }
  };

  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const handleRevokeAll = async () => {
    if (!window.confirm("Are you sure you want to revoke ALL allocations for this paper? This will return all assigned scripts back to the pending pool.")) return;
    setIsRevokingAll(true);
    try {
      const res = await apiCall(`/allocations/paper/${activePaper.paperId}/revoke-all`, { method: 'POST' });
      message.success(res.message);
      openAllocationPane(activePaper); // refresh
    } catch (err) {
      message.error(err.message || 'Failed to revoke allocations');
    } finally {
      setIsRevokingAll(false);
    }
  };

  const updateExaminerCount = (examinerId, count) => {
    setExaminerCounts(prev => ({
      ...prev,
      [examinerId]: Math.max(0, count)
    }));
  };



  return (
    <div className="min-h-screen bg-white pb-12 w-full">
      {/* Unified Full-Width Header */}
      <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-6 mb-8 shadow-sm sticky top-0 z-20">
        <ProjectConfigHeader />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="p-2.5 hover:bg-slate-100 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition" title="Return to Dashboard">
              <ChevronLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                  Allocation
                </span>
              </div>
              <h1 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2 leading-tight">
                <FileText className="text-blue-600" size={18} />
                Script Allocation
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5">Allocate answer scripts to examiners</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-10 w-full flex flex-col xl:flex-row gap-8 items-start">

        {/* Left Column: Master List */}
        <div className={`w-full ${activePaper ? 'xl:w-[50%]' : 'xl:w-full'} flex flex-col transition-all duration-300`}>
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center font-bold text-xs">
                1
              </div>
              Select Paper
            </h2>
          </div>

          {tableLoading && papers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-blue-600" size={24} />
            </div>
          ) : papers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-600 font-medium">No papers found for this project</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                <Search size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search papers by code or name..." 
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
                  value={paperSearchQuery}
                  onChange={(e) => setPaperSearchQuery(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <SortHeader label="Code" field="paperCode" hasFilter={true} />
                      <SortHeader label="Paper Name" field="paperName" hasFilter={true} />
                      <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Pending</th>
                      <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Allocated</th>
                      <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Experts</th>
                      <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {papers.map(paper => (
                      <tr 
                        key={paper.paperId} 
                        className={`border-b border-slate-50 hover:bg-blue-50/50 transition ${activePaper?.paperId === paper.paperId ? 'bg-blue-50' : ''}`}
                      >
                        <td className="p-3 text-sm font-bold text-slate-700">{paper.paperCode}</td>
                        <td className="p-3 text-sm font-semibold text-slate-900">{paper.paperName}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-yellow-100">
                            <Clock size={12} />
                            {paper.pendingScripts}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-green-100">
                            <CheckCircle2 size={12} />
                            {paper.allocatedScripts}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md text-xs font-bold border border-blue-100">
                            <Users size={12} />
                            {paper.expertsCount || 0}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openAllocationPane(paper)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto ${activePaper?.paperId === paper.paperId ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}
                          >
                            <Zap size={14} />
                            {activePaper?.paperId === paper.paperId ? 'Close' : 'Bulk Allocate'}
                          </button>
                        </td>
                      </tr>
                    ))}
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

        {/* Right Column: Detail View */}
        {activePaper && (
        <div className="w-full xl:w-[50%] flex flex-col animate-in slide-in-from-right-4 duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      Bulk Allocate Scripts
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 ml-10">
                    <p className="text-sm font-semibold text-slate-600">
                      {activePaper.paperName}
                    </p>
                    <span className="text-xs font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-md">
                      {activePaper.paperCode}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => openAllocationPane(activePaper)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 flex gap-4 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('allocate')}
                  className={`pb-2 text-sm font-bold transition-all border-b-2 ${
                    activeTab === 'allocate' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Allocate Scripts
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`pb-2 text-sm font-bold transition-all border-b-2 ${
                    activeTab === 'manage' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Manage Allocations
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[800px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="animate-spin text-blue-600" size={32} />
                </div>
              ) : scripts.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                  <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-slate-500 font-bold">No scripts available for allocation</p>
                </div>
              ) : (
                <>
                  {activeTab === 'allocate' ? (
                    <>
                      {/* Mode Selection */}
                  <div className="mb-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Allocation Strategy</p>
                    <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200/60">
                      <button
                        onClick={() => setBulkMode('even')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          bulkMode === 'even'
                            ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Even Distribution
                      </button>
                      <button
                        onClick={() => setBulkMode('custom')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          bulkMode === 'custom'
                            ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Custom Distribution
                      </button>
                    </div>
                  </div>

                  {/* Even Distribution */}
                  {bulkMode === 'even' && (
                    <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-2xl border border-blue-100/60 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none">
                        <Zap size={120} />
                      </div>
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600 ring-1 ring-black/5">
                          <Zap size={22} className="fill-blue-600/20" />
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-black text-slate-900 mb-1 tracking-tight">Automatic Distribution</p>
                          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                            Distribute <span className="font-bold text-slate-900 px-1">{scripts.filter(s => !allocationData[s.id]).length}</span> pending scripts evenly among <span className="font-bold text-slate-900 px-1">{examiners.length}</span> available examiners.
                          </p>
                          <button
                            onClick={calculateEvenDistribution}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 transition-all active:translate-y-0"
                          >
                            Calculate Distribution
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Examiner List */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Examiners Pool</p>
                      <span className="text-[10px] font-black text-blue-700 bg-blue-100/50 px-2.5 py-1 rounded-full border border-blue-200/50 uppercase tracking-wide shadow-sm">
                        {examiners.length} Available
                      </span>
                    </div>
                    
                    {examiners.length === 0 ? (
                      <div className="p-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <Users className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-sm font-bold text-slate-500">No subject experts assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {examiners.map(examiner => (
                          <div key={examiner.examinerId} className="flex items-center justify-between p-4 bg-white border border-slate-200/75 rounded-2xl hover:border-blue-300 hover:shadow-md hover:bg-blue-50/20 transition-all duration-300 group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-700 flex items-center justify-center font-black text-sm uppercase shadow-sm border border-blue-100/50 group-hover:scale-110 transition-transform duration-300">
                                {(examiner.examinerName || 'E').charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">{examiner.examinerName || 'Unknown Examiner'}</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-wider uppercase">ID: {examiner.examinerId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">Allocate</span>
                              <input
                                type="number"
                                min="0"
                                max={scripts.length}
                                value={examinerCounts[examiner.examinerId] || 0}
                                onChange={(e) => updateExaminerCount(examiner.examinerId, parseInt(e.target.value) || 0)}
                                className="w-24 px-3 py-2 text-center text-sm font-black border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm group-hover:border-blue-200 bg-slate-50 focus:bg-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-sm pb-2">
                    <button
                      onClick={() => openAllocationPane(activePaper)}
                      className="px-6 py-2.5 text-sm font-black text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkAllocate}
                      disabled={bulkLoading || examiners.length === 0}
                      className="px-8 py-2.5 text-sm font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {bulkLoading ? <Loader className="animate-spin" size={18} /> : <Zap size={18} />}
                      {bulkLoading ? 'Allocating...' : 'Confirm Allocation'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200/60 shadow-sm">
                    <h3 className="text-sm font-black text-amber-900 mb-2 flex items-center gap-2">
                      <AlertCircle size={16} /> Danger Zone
                    </h3>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed mb-6">
                      Revoking allocations will immediately remove scripts from all examiners assigned to <span className="font-bold">{activePaper.paperCode}</span> and return them to the "Pending" pool. Examiners will lose access to mark these scripts.
                    </p>
                    <button 
                      onClick={handleRevokeAll}
                      disabled={isRevokingAll || scripts.filter(s => allocationData[s.id]).length === 0}
                      className="px-5 py-2.5 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full flex items-center justify-center gap-2"
                    >
                      {isRevokingAll ? <Loader className="animate-spin" size={16} /> : <X size={16} />}
                      {isRevokingAll ? 'Revoking...' : `Revoke All Allocations (${scripts.filter(s => allocationData[s.id]).length} active)`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
