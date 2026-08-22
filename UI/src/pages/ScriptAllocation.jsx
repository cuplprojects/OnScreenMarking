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
      const scriptsData = await apiCall(`/scripts?paperId=${paper.paperId}`);
      const paperScripts = (scriptsData || []).map(s => ({...s, paperId: paper.paperId, paperName: paper.paperName}));
      setScripts(paperScripts);

      const allocation = {};
      paperScripts.forEach(script => {
        allocation[script.Id] = null;
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

  const pendingCount = scripts.filter(s => !allocationData[s.Id]).length;
  const allocatedCount = scripts.filter(s => allocationData[s.Id]).length;

  const filteredScripts = scripts.filter(script =>
    script.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    script.rollNo?.includes(searchQuery)
  );

  const openBulkModal = () => {
    // Legacy function, no longer opens a modal, since the pane IS the modal.
  };

  const calculateEvenDistribution = () => {
    const pendingScripts = scripts.filter(s => !allocationData[s.Id]);
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
      const pendingScripts = scripts.filter(s => !allocationData[s.Id]);
      
      if (pendingScripts.length === 0) {
        message.warning('No pending scripts to allocate');
        return;
      }

      const totalAllocated = Object.values(examinerCounts).reduce((sum, count) => sum + count, 0);
      if (totalAllocated !== pendingScripts.length) {
        message.warning(`Total allocation (${totalAllocated}) must equal pending scripts (${pendingScripts.length})`);
        return;
      }

      // Create a pool of examiners with their requested allocation counts
      let examinerPool = Object.entries(examinerCounts)
        .map(([examinerId, count]) => ({ examinerId: parseInt(examinerId), remainingCount: count }))
        .filter(ex => ex.remainingCount > 0);

      // Perform bulk allocation for the single paper
      const allocations = examinerPool.map(ex => ({
        examinerId: ex.examinerId,
        count: ex.remainingCount
      }));

      const response = await allocationService.bulkAllocateScripts(activePaper.paperId, allocations);

      const newAllocationData = { ...allocationData };
      if (response && response.results) {
        response.results.forEach(res => {
          newAllocationData[res.scriptId] = res.examinerId;
        });
      }
      setAllocationData(newAllocationData);

      message.success(`Successfully allocated scripts`);
      
      // Update the table by refetching stats
      refreshTable();
    } catch (err) {
      message.error('Failed to perform bulk allocation');
      console.error(err);
    } finally {
      setBulkLoading(false);
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

      <div className="px-6 lg:px-10 w-full max-w-[1600px] mx-auto flex flex-col xl:flex-row gap-8 items-start">

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
            <div className="p-6 bg-gradient-to-r from-blue-50 to-white border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    Bulk Allocate Scripts
                  </h2>
                  <p className="text-sm font-semibold text-slate-500 mt-1 ml-8">
                    {activePaper.paperName} ({activePaper.paperCode})
                  </p>
                </div>
                <button 
                  onClick={() => openAllocationPane(activePaper)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
                >
                  <X size={20} />
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
                  {/* Mode Selection */}
                  <div className="mb-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Allocation Mode</p>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        onClick={() => setBulkMode('even')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          bulkMode === 'even'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Even Distribution
                      </button>
                      <button
                        onClick={() => setBulkMode('custom')}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          bulkMode === 'custom'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Custom Distribution
                      </button>
                    </div>
                  </div>

                  {/* Even Distribution */}
                  {bulkMode === 'even' && (
                    <div className="mb-8 p-5 bg-blue-50/50 rounded-xl border border-blue-100">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                          <Zap size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 mb-1">Automatic Distribution</p>
                          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                            Distribute <span className="font-bold text-slate-900">{scripts.filter(s => !allocationData[s.Id]).length}</span> pending scripts evenly among <span className="font-bold text-slate-900">{examiners.length}</span> available examiners.
                          </p>
                          <button
                            onClick={calculateEvenDistribution}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            Calculate Distribution
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Examiner List */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Examiners Pool</p>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {examiners.length} Available
                      </span>
                    </div>
                    
                    {examiners.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Users className="mx-auto text-slate-300 mb-2" size={24} />
                        <p className="text-sm font-semibold text-slate-500">No subject experts assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {examiners.map(examiner => (
                          <div key={examiner.examinerId} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                                {(examiner.examinerName || 'E').charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 leading-none">{examiner.examinerName || 'Unknown Examiner'}</p>
                                <p className="text-[10px] text-slate-500 mt-1">ID: {examiner.examinerId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">Allocate</span>
                              <input
                                type="number"
                                min="0"
                                max={scripts.length}
                                value={examinerCounts[examiner.examinerId] || 0}
                                onChange={(e) => updateExaminerCount(examiner.examinerId, parseInt(e.target.value) || 0)}
                                className="w-20 px-3 py-1.5 text-center text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                    <button
                      onClick={() => openAllocationPane(activePaper)}
                      className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkAllocate}
                      disabled={bulkLoading || examiners.length === 0}
                      className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {bulkLoading ? <Loader className="animate-spin" size={16} /> : <Zap size={16} />}
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
    </div>
  );
}
