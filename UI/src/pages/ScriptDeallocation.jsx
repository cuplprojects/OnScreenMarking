import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Save,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  Zap,
  BookOpen,
  ArrowLeft,
  Sliders,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { decryptId, encryptId } from '../utils/encryption';
import apiCall from '../services/api';
import allocationService from '../services/allocationService';
import ProjectConfigHeader from '../components/ProjectConfigHeader';
import message from '../services/messageService';

export default function ScriptDeallocation() {
  const [searchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get('projectId');
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;

  const { userType } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const [papers, setPapers] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    setBreadcrumb([
      { label: 'Coordinator Dashboard', path: '/coordinator/dashboard', icon: 'LayoutDashboard' },
      { label: 'Project Dashboard', path: `/project-dashboard?projectId=${encryptedProjectId}`, icon: 'Layers' },
      { label: 'Script Deallocation & Overwrite', path: `/deallocate-scripts?projectId=${encryptedProjectId}`, icon: 'Sliders' }
    ]);
  }, [encryptedProjectId]);

  // Load project papers for dropdown
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
      const res = await allocationService.getDeallocationStats(projectId, selectedPaperId || null);
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
  }, [projectId, selectedPaperId]);

  useEffect(() => {
    fetchDeallocationData();
  }, [fetchDeallocationData]);

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

  // Filter examiner list by search query
  const filteredList = examinerList.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.examinerName && item.examinerName.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q)) ||
      (item.paperCode && item.paperCode.toLowerCase().includes(q)) ||
      (item.paperName && item.paperName.toLowerCase().includes(q))
    );
  });

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

        {/* Filter Bar & Controls */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Paper Filter Dropdown */}
            <div className="w-full sm:w-64">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Filter By Paper
              </label>
              <select
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
              >
                <option value="">All Project Papers ({papers.length})</option>
                {papers.map(p => (
                  <option key={p.paperId} value={p.paperId}>
                    {p.paperCode} - {p.paperName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Box */}
            <div className="w-full sm:w-72">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
                Search Examiners
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Search examiner name, code, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Refresh Button */}
            <div className="w-full sm:w-auto mt-1 sm:mt-5">
              <button
                onClick={fetchDeallocationData}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all h-[36px]"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh Stats
              </button>
            </div>
          </div>
        </div>

        {/* Assigned Examiners Table View */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-2">
              <Users size={16} className="text-teal-700" />
              <span>Assigned Examiners & Allocation Workload</span>
              <span className="bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border border-teal-200">
                {filteredList.length} Examiners
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-xs font-bold text-gray-500 animate-pulse">Loading Examiner Stats...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center bg-gray-50/50">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600">No assigned examiners found</p>
              <p className="text-xs text-gray-400 mt-1">Try selecting a different paper or clearing search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className=" block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3.5">Examiner Name & Info</th>
                    <th className="px-4 py-3.5">Paper Code / Name</th>
                    <th className="px-4 py-3.5 text-center">Paper Pending</th>
                    <th className="px-4 py-3.5 text-center">Current Allocated</th>
                    <th className="px-4 py-3.5 text-center">Completed</th>
                    <th className="px-4 py-3.5 text-center">Total Assigned</th>
                    <th className="px-4 py-3.5 text-center">Allocation Count</th>
                    <th className="px-4 py-3.5 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredList.map((item) => {
                    const key = `${item.paperId}_${item.examinerId}`;
                    const currentInputVal = editedCounts[key] !== undefined ? editedCounts[key] : item.allocatedCount;
                    const isSaving = updatingId === key;
                    const isChanged = currentInputVal !== item.allocatedCount;

                    return (
                      <tr key={key} className="hover:bg-teal-50/20 transition-colors group">
                        {/* Examiner Info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                              {(item.examinerName || 'E').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-xs">{item.examinerName}</p>
                              <p className="text-[10px] text-gray-400">{item.email || `ID: ${item.examinerId}`}</p>
                            </div>
                          </div>
                        </td>

                        {/* Paper Code & Name */}
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-black rounded uppercase tracking-wider mb-0.5">
                            {item.paperCode}
                          </span>
                          <p className="text-[11px] font-semibold text-gray-700 truncate max-w-[200px]">
                            {item.paperName}
                          </p>
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
