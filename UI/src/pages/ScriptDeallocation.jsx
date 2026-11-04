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
  X
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

  const { userType } = useAuth();
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

  // Sorting & Filtering states
  const [sortField, setSortField] = useState('paperCode');
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

  // Load deallocation stats
  const fetchDeallocationData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await allocationService.getDeallocationStats(projectId, null);
      if (res.success) {
        setSummary(res.summary || { pendingScripts: 0, allocatedScripts: 0, completedScripts: 0, totalScripts: 0 });
        const list = res.examiners || [];
        setExaminerList(list);

        // Initialize local counts mapping
        const counts = {};
        list.forEach(item => {
          const key = `${item.paperId}_${item.examinerId}`;
          counts[key] = item.allocatedCount;
        });
        setEditedCounts(counts);
      }
    } catch (err) {
      console.error("Error fetching deallocation stats:", err);
      message.error(err.message || "Failed to load deallocation stats");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

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
    examinerList.forEach(e => { if (e.paperCode) codes.add(e.paperCode); });
    return Array.from(codes).sort().map(code => ({ label: code, value: code }));
  }, [papers, examinerList]);

  // Filter and sort the examiner list in-memory
  const filteredAndSortedList = useMemo(() => {
    let list = [...examinerList];

    // Filters
    if (filters.examiner) {
      const q = filters.examiner.toLowerCase().trim();
      list = list.filter(item => 
        (item.examinerName && item.examinerName.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q))
      );
    }
    if (filters.paperCode) {
      const q = filters.paperCode.toLowerCase().trim();
      list = list.filter(item => item.paperCode && item.paperCode.toLowerCase().includes(q));
    }
    if (filters.paperName) {
      const q = filters.paperName.toLowerCase().trim();
      list = list.filter(item => item.paperName && item.paperName.toLowerCase().includes(q));
    }
    if (filters.catchNo) {
      const q = filters.catchNo.toLowerCase().trim();
      list = list.filter(item => (item.catchNo || '').toLowerCase().includes(q));
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

  const handleCountChange = (paperId, examinerId, val) => {
    const key = `${paperId}_${examinerId}`;
    setEditedCounts(prev => ({
      ...prev,
      [key]: val === '' ? '' : parseInt(val, 10) || 0
    }));
  };

  const handleSaveCount = async (item) => {
    const key = `${item.paperId}_${item.examinerId}`;
    const targetCount = editedCounts[key];

    if (targetCount === undefined || targetCount < 0) {
      message.error("Please enter a valid count greater than or equal to 0");
      return;
    }

    if (targetCount > item.totalAllocatedCount) {
      message.error(`Allocation count cannot exceed total assigned scripts (${item.totalAllocatedCount})`);
      return;
    }

    setUpdatingId(key);
    try {
      const res = await allocationService.overwriteExaminerCount(item.paperId, item.examinerId, targetCount);
      message.success(res.message || "Examiner allocation count updated successfully");
      setEditingRowKey(null);
      fetchDeallocationData();
    } catch (err) {
      message.error(err.message || "Failed to update examiner count");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleResetToZero = async (item) => {
    const key = `${item.paperId}_${item.examinerId}`;
    setUpdatingId(key);
    try {
      const res = await allocationService.overwriteExaminerCount(item.paperId, item.examinerId, 0);
      message.success(res.message || "Deallocated all active scripts for this examiner");
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
            subtitle="View assigned examiner script stats and overwrite target allocation counts paper-wise"
          />
        </div>

        {/* Assigned Examiners Table View */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
              <Users size={16} className="text-teal-700" />
              <span>Assigned Examiners & Allocation Workload</span>
              <span className="bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-teal-200">
                {hasActiveFilters ? `${filteredAndSortedList.length} of ${examinerList.length}` : examinerList.length} Examiners
              </span>
            </h2>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold border border-gray-200 transition-colors shadow-sm cursor-pointer"
              >
                <X size={12} className="text-red-500" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-xs font-bold text-gray-500 animate-pulse">Loading Examiner Stats...</p>
            </div>
          ) : filteredAndSortedList.length === 0 ? (
            <div className="p-12 text-center bg-gray-50/50">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600">
                {examinerList.length === 0 ? "No assigned examiners found" : "No examiners match the active filters"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {examinerList.length === 0 ? "Examiners have not been assigned to papers in this project yet." : "Try adjusting or clearing your column filters."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold border border-teal-200 transition-colors"
                >
                  <X size={12} />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    {/* Examiner Name & Info */}
                    <th className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <span 
                          onClick={() => handleSort('examinerName')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Examiner Name & Info
                          {sortField === 'examinerName' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                        <ColumnFilter 
                          columnKey="examiner"
                          currentFilter={filters.examiner}
                          setFilter={setFilter}
                          placeholder="Filter examiner / email..."
                        />
                      </div>
                    </th>

                    {/* Paper Code */}
                    <th className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <span 
                          onClick={() => handleSort('paperCode')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Paper Code
                          {sortField === 'paperCode' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                        <ColumnFilter 
                          columnKey="paperCode"
                          currentFilter={filters.paperCode}
                          setFilter={setFilter}
                          options={paperCodeOptions}
                        />
                      </div>
                    </th>

                    {/* Paper Name */}
                    <th className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <span 
                          onClick={() => handleSort('paperName')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Paper Name
                          {sortField === 'paperName' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                        <ColumnFilter 
                          columnKey="paperName"
                          currentFilter={filters.paperName}
                          setFilter={setFilter}
                          placeholder="Filter paper name..."
                        />
                      </div>
                    </th>

                    {/* Catch No */}
                    <th className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <span 
                          onClick={() => handleSort('catchNo')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Catch No
                          {sortField === 'catchNo' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                        <ColumnFilter 
                          columnKey="catchNo"
                          currentFilter={filters.catchNo}
                          setFilter={setFilter}
                          placeholder="Filter catch no..."
                        />
                      </div>
                    </th>

                    {/* Paper Pending */}
                    <th className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span 
                          onClick={() => handleSort('pendingScripts')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Paper Pending
                          {sortField === 'pendingScripts' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                      </div>
                    </th>

                    {/* Current Allocated */}
                    <th className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span 
                          onClick={() => handleSort('allocatedCount')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Current Allocated
                          {sortField === 'allocatedCount' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                      </div>
                    </th>

                    {/* Completed */}
                    <th className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span 
                          onClick={() => handleSort('completedCount')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Completed
                          {sortField === 'completedCount' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                      </div>
                    </th>

                    {/* Total Assigned */}
                    <th className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span 
                          onClick={() => handleSort('totalAllocatedCount')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Total Assigned
                          {sortField === 'totalAllocatedCount' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                      </div>
                    </th>

                    {/* Allocation Count */}
                    <th className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span 
                          onClick={() => handleSort('allocatedCount')}
                          className="cursor-pointer hover:text-gray-900 transition-colors inline-flex items-center gap-1 select-none"
                        >
                          Allocation Count
                          {sortField === 'allocatedCount' ? (
                            sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />
                          ) : (
                            <ArrowUpDown size={12} className="text-gray-300" />
                          )}
                        </span>
                      </div>
                    </th>

                    {/* Action */}
                    <th className="px-4 py-3.5 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredAndSortedList.map((item) => {
                    const key = `${item.paperId}_${item.examinerId}`;
                    const currentInputVal = editedCounts[key] !== undefined ? editedCounts[key] : item.allocatedCount;
                    const isSaving = updatingId === key;

                    return (
                      <tr key={key} className="hover:bg-teal-50/20 transition-colors group">
                        {/* Examiner Info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {(item.examinerName || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-xs truncate">{item.examinerName}</p>
                              <p className="text-[10px] text-gray-400 truncate">{item.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Paper Code */}
                        <td className="px-4 py-3 font-semibold text-gray-800">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-black rounded uppercase tracking-wider">
                            {item.paperCode || '—'}
                          </span>
                        </td>

                        {/* Paper Name */}
                        <td className="px-4 py-3">
                          <p className="text-[11px] font-semibold text-gray-700 truncate max-w-[220px]" title={item.paperName}>
                            {item.paperName || '—'}
                          </p>
                        </td>

                        {/* Catch No */}
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold text-gray-600">
                            {item.catchNo || '—'}
                          </span>
                        </td>

                        {/* Paper Pending */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">
                            {item.pendingScripts}
                          </span>
                        </td>

                        {/* Current Allocated */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold border border-teal-200">
                            {item.allocatedCount}
                          </span>
                        </td>

                        {/* Completed */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                            {item.completedCount}
                          </span>
                        </td>

                        {/* Total Assigned */}
                        <td className="px-4 py-3 text-center font-extrabold text-gray-800">
                          {item.totalAllocatedCount}
                        </td>

                        {/* Allocation Count */}
                        <td className="px-4 py-3 text-center">
                          {editingRowKey === key ? (
                            <input
                              type="number"
                              min="0"
                              max={item.totalAllocatedCount}
                              value={currentInputVal}
                              onChange={(e) => handleCountChange(item.paperId, item.examinerId, e.target.value)}
                              className="w-20 px-2.5 py-1.5 text-center text-xs font-bold border border-teal-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-teal-500"
                              autoFocus
                            />
                          ) : (
                            <span className="inline-flex items-center justify-center min-w-[32px] h-8 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">
                              {item.allocatedCount}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right pr-6">
                          {editingRowKey === key ? (
                            <div className="flex items-center justify-end gap-2">
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
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                              >
                                <X size={13} />
                                <span>Cancel</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveCount(item)}
                                disabled={isSaving}
                                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                              >
                                <Check size={13} />
                                <span>{isSaving ? 'Saving...' : 'Save'}</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRowKey(key);
                                setEditedCounts(prev => ({
                                  ...prev,
                                  [key]: item.allocatedCount
                                }));
                              }}
                              className="px-4 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold transition-colors border border-teal-200 inline-flex items-center gap-1.5 shadow-sm"
                              title="Edit Target Allocation Count"
                            >
                              <Edit2 size={13} />
                            </button>
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

      </div>
    </div>
  );
}