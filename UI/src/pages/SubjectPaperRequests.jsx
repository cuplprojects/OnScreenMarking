import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileCheck,
  Search,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  Trash2,
  User,
  BookOpen,
  FileText,
  AlertCircle,
  Building2,
  Sparkles,
  Layers,
  ArrowRight,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import paperService from '../services/paperService';
import message from '../services/messageService';
import { encryptId } from '../utils/encryption';

export default function SubjectPaperRequests() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userType, universityId: userUniversityId, user } = useAuth();

  const universityIdFromUrl = searchParams.get('universityId');
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityIdFromUrl;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Quick Allocate Modal State
  const [allocateModalRequest, setAllocateModalRequest] = useState(null);
  const [allocateCount, setAllocateCount] = useState(1);
  const [allocating, setAllocating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'fulfilled'

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await paperService.getSubjectPaperRequests(activeUniversityId || null);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load subject paper requests:', err);
      message.error(err?.message || 'Failed to fetch paper requests');
    } finally {
      setLoading(false);
    }
  }, [activeUniversityId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle Toggle Status
  const handleToggleStatus = async (request) => {
    try {
      setActionLoadingId(request.id);
      const res = await paperService.toggleSubjectPaperRequestStatus(request.id);
      if (res?.success) {
        message.success(request.requested ? 'Request marked as fulfilled.' : 'Request marked as pending.');
        setRequests(prev =>
          prev.map(r => (r.id === request.id ? { ...r, requested: !r.requested, updatedAt: new Date().toISOString() } : r))
        );
      } else {
        message.error(res?.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      message.error(err?.message || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Request
  const handleDeleteRequest = async (request) => {
    if (!window.confirm(`Are you sure you want to remove the request from ${request.examinerName || 'examiner'} for paper "${request.paperCode || request.paperName}"?`)) {
      return;
    }
    try {
      setActionLoadingId(request.id);
      const res = await paperService.deleteSubjectPaperRequest(request.id);
      if (res?.success) {
        message.success('Paper request deleted successfully.');
        setRequests(prev => prev.filter(r => r.id !== request.id));
      } else {
        message.error(res?.message || 'Failed to delete request');
      }
    } catch (err) {
      console.error('Error deleting request:', err);
      message.error(err?.message || 'Failed to delete request');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Navigate to allocation page
  const handleGoToAllocation = (request) => {
    const basePath = userType === 'admin' ? '/admin/project-dashboard' : '/project-dashboard';
    const univParam = activeUniversityId ? `&universityId=${activeUniversityId}` : '';
    navigate(`${basePath}?tab=allocations${univParam}`);
  };

  // Open Quick Allocate Modal
  const handleOpenAllocateModal = (request) => {
    setAllocateModalRequest(request);
    const available = request.availableScriptsCount || 0;
    setAllocateCount(available > 0 ? Math.min(available, 5) : 1);
  };

  // Execute allocate & fulfill at the same time
  const handleConfirmAllocateAndFulfill = async (e) => {
    if (e) e.preventDefault();
    if (!allocateModalRequest) return;
    const count = parseInt(allocateCount, 10);
    if (!count || count <= 0) {
      message.error('Please specify a valid script count greater than 0');
      return;
    }
    const maxAvailable = allocateModalRequest.availableScriptsCount || 0;
    if (maxAvailable > 0 && count > maxAvailable) {
      message.error(`Cannot allocate more than ${maxAvailable} available scripts.`);
      return;
    }

    try {
      setAllocating(true);
      const res = await paperService.allocateAndFulfillPaperRequest(allocateModalRequest.id, count);
      if (res?.success) {
        const actualAllocated = res.allocatedCount || count;
        message.success(res.message || `Allocated ${actualAllocated} script(s) and marked request as fulfilled!`);

        // Update local state: requested = false (0), available scripts decreases, examiner allocated increases
        setRequests(prev =>
          prev.map(r => {
            if (r.id === allocateModalRequest.id) {
              return {
                ...r,
                requested: false,
                availableScriptsCount: Math.max(0, (r.availableScriptsCount || 0) - actualAllocated),
                allocatedToExaminerCount: (r.allocatedToExaminerCount || 0) + actualAllocated,
                updatedAt: new Date().toISOString()
              };
            }
            return r;
          })
        );
        setAllocateModalRequest(null);
      } else {
        message.error(res?.message || 'Failed to allocate scripts');
      }
    } catch (err) {
      console.error('Error allocating scripts:', err);
      message.error(err?.message || 'Failed to allocate scripts');
    } finally {
      setAllocating(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // Status filter
      if (statusFilter === 'pending' && !r.requested) return false;
      if (statusFilter === 'fulfilled' && r.requested) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchExaminer = (r.examinerName || '').toLowerCase().includes(q) ||
                            (r.examinerEmail || '').toLowerCase().includes(q) ||
                            (r.examinerEmpId || '').toLowerCase().includes(q);
      const matchPaper = (r.paperCode || '').toLowerCase().includes(q) ||
                         (r.paperName || '').toLowerCase().includes(q);
      const matchSubject = (r.subjectCode || '').toLowerCase().includes(q) ||
                           (r.subjectName || '').toLowerCase().includes(q);

      return matchExaminer || matchPaper || matchSubject;
    });
  }, [requests, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.requested).length;
    const fulfilled = requests.filter(r => !r.requested).length;
    const totalAvailableScripts = requests.reduce((acc, r) => acc + (r.availableScriptsCount || 0), 0);
    return { total, pending, fulfilled, totalAvailableScripts };
  }, [requests]);

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <div className="bg-white px-5 py-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center shrink-0 border border-teal-100/60 shadow-xs">
              <FileCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none flex items-center gap-2">
                Subject Paper Requests
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {userType === 'coordinator' ? 'Coordinator View' : 'Admin View'}
                </span>
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Examiner requests for copies and script allocation for papers under your university
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-bold text-xs transition cursor-pointer disabled:opacity-50"
              title="Refresh requests"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => handleGoToAllocation()}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
            >
              <Zap size={14} />
              <span>Script Allocation</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Requests</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{stats.total}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Requests</p>
            <h3 className="text-2xl font-black text-amber-700 mt-0.5">{stats.pending}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Processed / Fulfilled</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{stats.fulfilled}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-600">Available Scripts</p>
            <h3 className="text-2xl font-black text-teal-800 mt-0.5">{stats.totalAvailableScripts}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search examiner, paper, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Status Tab Filter */}
        <div className="flex items-center gap-1.5 self-stretch md:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Requests', count: stats.total },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'fulfilled', label: 'Fulfilled', count: stats.fulfilled },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id ? 'bg-teal-800 text-teal-100' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-gray-500 tracking-wide uppercase">Loading paper requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center text-gray-500 max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto border border-gray-100">
              <FileCheck size={28} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">
                No Paper Requests Found
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {searchQuery || statusFilter !== 'all'
                  ? 'No requests match your current filters. Try resetting the search or filter.'
                  : 'Examiners have not requested any copies yet for papers belonging to this university.'}
              </p>
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Examiner</th>
                  <th className="py-3 px-4">Paper Details</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Scripts & Marking</th>
                  <th className="py-3 px-4">Request Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredRequests.map(r => (
                  <tr key={r.id} className="hover:bg-teal-50/20 transition-colors">
                    {/* Examiner Details */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                          {(r.examinerName || 'E').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-extrabold text-gray-900 leading-tight">
                            {r.examinerName || 'Unknown Examiner'}
                          </div>
                          <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <span>{r.examinerEmail}</span>
                            {r.examinerEmpId && (
                              <span className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded text-[10px]">
                                {r.examinerEmpId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Paper Details */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded text-[11px] border border-teal-100">
                            {r.paperCode || `Paper #${r.paperId}`}
                          </span>
                        </div>
                        <div className="font-medium text-gray-700 text-xs line-clamp-1">
                          {r.paperName || 'Untitled Paper'}
                        </div>
                        {r.universityName && (
                          <div className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Building2 size={11} />
                            <span>{r.universityName}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Subject Details */}
                    <td className="py-3 px-4">
                      {r.subjectCode || r.subjectName ? (
                        <div className="space-y-0.5">
                          <div className="font-mono text-[11px] font-semibold text-gray-700">
                            {r.subjectCode || '-'}
                          </div>
                          <div className="text-[11px] text-gray-500 line-clamp-1">
                            {r.subjectName}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Not mapped</span>
                      )}
                    </td>

                    {/* Script Pool Status */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="text-gray-400 font-medium">Available in Pool:</span>
                          <span className="font-extrabold text-teal-700 font-mono">
                            {r.availableScriptsCount || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="text-gray-400 font-medium">Assigned to Examiner:</span>
                          <span className="font-extrabold text-gray-700 font-mono">
                            {r.allocatedToExaminerCount || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <span className="text-gray-400 font-medium">Submitted:</span>
                          <span className="font-extrabold text-emerald-600 font-mono">
                            {r.submittedByExaminerCount || 0}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Request Date */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-gray-800 font-medium text-xs">
                        {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : '-'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {r.requestedAt ? new Date(r.requestedAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : ''}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {r.requested ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={12} />
                          Pending Request
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Fulfilled
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Allocate scripts icon button with tooltip */}
                        <div className="relative group flex items-center justify-center">
                          <button
                            onClick={() => handleOpenAllocateModal(r)}
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center"
                            title="Allocate scripts & fulfill request"
                          >
                            <Zap size={15} />
                          </button>
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                            <span className="whitespace-nowrap px-2 py-1 text-[10px] font-bold text-white bg-gray-900 rounded-md shadow-md">
                              Allocate scripts & fulfill request
                            </span>
                            <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5"></div>
                          </div>
                        </div>

                        {/* Delete Request icon button with tooltip */}
                        <div className="relative group flex items-center justify-center">
                          <button
                            onClick={() => handleDeleteRequest(r)}
                            disabled={actionLoadingId === r.id}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center"
                            title="Delete request"
                          >
                            <Trash2 size={15} />
                          </button>
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                            <span className="whitespace-nowrap px-2 py-1 text-[10px] font-bold text-white bg-gray-900 rounded-md shadow-md">
                              Delete request
                            </span>
                            <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 -mt-0.5"></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Allocate & Fulfill Modal */}
      {allocateModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-teal-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                    Allocate Scripts & Fulfill Request
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Assign copies to examiner and mark request as completed (Requested = 0)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllocateModalRequest(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleConfirmAllocateAndFulfill} className="p-5 space-y-4">
              {/* Info summary banner */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Examiner:</span>
                  <span className="font-extrabold text-gray-900">
                    {allocateModalRequest.examinerName || 'Examiner'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Paper:</span>
                  <span className="font-bold text-teal-800 font-mono bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                    {allocateModalRequest.paperCode} - {allocateModalRequest.paperName}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-200/70">
                  <span className="text-gray-500 font-medium">Available in Pool:</span>
                  <span className="font-black text-teal-700 font-mono text-sm">
                    {allocateModalRequest.availableScriptsCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Currently Assigned:</span>
                  <span className="font-bold text-gray-700 font-mono">
                    {allocateModalRequest.allocatedToExaminerCount || 0}
                  </span>
                </div>
              </div>

              {/* Number to allocate */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Scripts to Allocate</span>
                  <span className="text-[11px] text-gray-400 font-normal">
                    Max: {allocateModalRequest.availableScriptsCount || 0}
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={allocateModalRequest.availableScriptsCount || 1}
                  value={allocateCount}
                  onChange={(e) => setAllocateCount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  required
                />

                {/* Preset quick buttons */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 5, 10].map(val => (
                    val <= (allocateModalRequest.availableScriptsCount || 0) && (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAllocateCount(val)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded border transition cursor-pointer ${
                          parseInt(allocateCount, 10) === val
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {val}
                      </button>
                    )
                  ))}
                  {(allocateModalRequest.availableScriptsCount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setAllocateCount(allocateModalRequest.availableScriptsCount)}
                      className={`px-2 py-0.5 text-[11px] font-bold rounded border transition cursor-pointer ${
                        parseInt(allocateCount, 10) === allocateModalRequest.availableScriptsCount
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      All ({allocateModalRequest.availableScriptsCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    const req = allocateModalRequest;
                    setAllocateModalRequest(null);
                    handleGoToAllocation(req);
                  }}
                  className="text-[11px] text-gray-400 hover:text-teal-700 font-semibold underline underline-offset-2 transition cursor-pointer"
                >
                  Full Allocation Studio →
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocateModalRequest(null)}
                    disabled={allocating}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={allocating || (allocateModalRequest.availableScriptsCount || 0) <= 0}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap size={14} className={allocating ? 'animate-spin' : ''} />
                    <span>{allocating ? 'Allocating...' : 'Allocate & Mark Done'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
