import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sliders,
  RefreshCw,
  Clock,
  Gauge,
  Layers,
  Building2,
  CheckCircle2,
  Plus,
  X,
  Tag,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import universitySettingService from '../services/universitySettingService';
import apiCall from '../services/api';
import message from '../services/messageService';

export default function UniversitySettings() {
  const [searchParams] = useSearchParams();
  const { userType, universityId: userUniversityId, user } = useAuth();

  const universityIdFromUrl = searchParams.get('universityId');
  const initialUniId = universityIdFromUrl || (userType === 'coordinator' ? userUniversityId : '') || '';

  const [selectedUniversityId, setSelectedUniversityId] = useState(initialUniId);
  const [universities, setUniversities] = useState([]);
  const [currentUniversity, setCurrentUniversity] = useState(null);
  const [assignmentTypes, setAssignmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // New Type Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState({
    type: '',
    dailyLimit: 50,
    timePerCopy: 15
  });

  // Fetch list of universities (for Admin dropdown)
  const fetchUniversities = useCallback(async () => {
    if (userType !== 'admin') return;
    try {
      const res = await apiCall('/Universities?page=0');
      const list = Array.isArray(res) ? res : (res?.items || []);
      setUniversities(list);
      if (!selectedUniversityId && list.length > 0) {
        setSelectedUniversityId(String(list[0].universityId));
      }
    } catch (err) {
      console.warn('Could not load universities list:', err);
    }
  }, [userType, selectedUniversityId]);

  // Fetch all assignment types
  const fetchAssignmentTypes = useCallback(async () => {
    try {
      const raw = await universitySettingService.getAssignmentTypes();
      const list = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []);
      setAssignmentTypes(list);
      return list;
    } catch (err) {
      console.error('Failed to load assignment types:', err);
      message.error(err?.message || 'Failed to fetch assignment types');
      return [];
    }
  }, []);

  // Fetch the university's assignment details
  const fetchUniversityConfig = useCallback(async () => {
    try {
      setLoading(true);
      const targetId = selectedUniversityId || (userType === 'coordinator' ? userUniversityId : null);
      const data = await universitySettingService.getSettings(targetId ? parseInt(targetId, 10) : null);
      
      if (Array.isArray(data) && data.length > 0) {
        setCurrentUniversity(data[0]);
      } else if (data && !Array.isArray(data) && data.universityId) {
        setCurrentUniversity(data);
      } else {
        // Fallback info from logged-in user or active selection
        setCurrentUniversity({
          universityId: targetId ? parseInt(targetId, 10) : (user?.universityId || null),
          universityName: user?.university?.universityName || user?.universityName || 'Your University',
          assignmentTypeId: null,
          assignmentType: null,
          dailyLimit: 0,
          timePerCopy: 0
        });
      }
    } catch (err) {
      console.error('Failed to load university assignment details:', err);
      // Fallback to minimal object so page is never broken
      setCurrentUniversity({
        universityId: selectedUniversityId ? parseInt(selectedUniversityId, 10) : (user?.universityId || null),
        universityName: user?.university?.universityName || user?.universityName || 'Your University',
        assignmentTypeId: null,
        assignmentType: null,
        dailyLimit: 0,
        timePerCopy: 0
      });
    } finally {
      setLoading(false);
    }
  }, [selectedUniversityId, userType, userUniversityId, user]);

  const loadAll = useCallback(async () => {
    await Promise.all([
      fetchAssignmentTypes(),
      fetchUniversityConfig(),
      fetchUniversities()
    ]);
  }, [fetchAssignmentTypes, fetchUniversityConfig, fetchUniversities]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // When selected university changes in Admin dropdown
  useEffect(() => {
    if (selectedUniversityId) {
      fetchUniversityConfig();
    }
  }, [selectedUniversityId, fetchUniversityConfig]);

  // 1-Click Update assignmentTypeId in universities table
  const handleApplyAssignmentType = async (typeId) => {
    const targetUniId = selectedUniversityId || currentUniversity?.universityId || userUniversityId;
    
    try {
      setSavingId(typeId);
      await universitySettingService.saveSetting({
        universityId: targetUniId ? parseInt(targetUniId, 10) : null,
        assignmentTypeId: typeId
      });
      message.success('University assignment type updated successfully!');
      await fetchUniversityConfig();
      await fetchAssignmentTypes();
    } catch (err) {
      console.error('Failed to apply assignment type:', err);
      message.error(err?.message || 'Failed to update assignment type in Universities table');
    } finally {
      setSavingId(null);
    }
  };

  // Create new Assignment Type
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newType.type.trim()) {
      message.error('Assignment type name is required');
      return;
    }

    try {
      setCreating(true);
      await universitySettingService.createAssignmentType({
        type: newType.type.trim(),
        dailyLimit: parseInt(newType.dailyLimit, 10) || 50,
        timePerCopy: parseInt(newType.timePerCopy, 10) || 15
      });
      message.success('New assignment type created successfully!');
      setShowAddModal(false);
      setNewType({ type: '', dailyLimit: 50, timePerCopy: 15 });
      await fetchAssignmentTypes();
    } catch (err) {
      console.error('Failed to create assignment type:', err);
      message.error(err?.message || 'Failed to create assignment type');
    } finally {
      setCreating(false);
    }
  };

  // Resolve currently active assignment type object
  const activeAssignmentType = useMemo(() => {
    if (!currentUniversity?.assignmentTypeId) return null;
    return assignmentTypes.find(t => t.id === currentUniversity.assignmentTypeId) || {
      id: currentUniversity.assignmentTypeId,
      type: currentUniversity.assignmentType || `Type #${currentUniversity.assignmentTypeId}`,
      dailyLimit: currentUniversity.dailyLimit,
      timePerCopy: currentUniversity.timePerCopy
    };
  }, [currentUniversity, assignmentTypes]);

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-white px-5 py-4 rounded-xl border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center shrink-0 border border-teal-100/60 shadow-xs">
              <Sliders size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none flex items-center gap-2">
                Assignment Types
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                View evaluation assignment types and set the active rule for your university
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Admin University Switcher */}
            {userType === 'admin' && universities.length > 0 && (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                <Building2 size={14} className="text-teal-700 shrink-0" />
                <select
                  value={selectedUniversityId}
                  onChange={(e) => setSelectedUniversityId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  {universities.map(u => (
                    <option key={u.universityId} value={u.universityId}>
                      {u.universityName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={loadAll}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-bold text-xs transition cursor-pointer disabled:opacity-50"
              title="Refresh assignment types and university status"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
            >
              <Plus size={15} />
              <span>New Type</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected University's Active Assignment Details Card */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-teal-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-radial from-teal-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* University Info & Active Type Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold tracking-wide uppercase">
              <Building2 size={15} className="text-teal-300" />
              <span>
                {currentUniversity?.universityName || user?.universityName || 'Your University'}
              </span>
              <span className="text-teal-400/60">•</span>
              <span className="text-teal-300 font-mono text-[11px]">
                University ID: {currentUniversity?.universityId || userUniversityId || '-'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                Selected Assignment Type:
              </span>
              {activeAssignmentType ? (
                <span className="inline-flex items-center gap-1.5 bg-white text-teal-900 text-sm font-black px-3.5 py-1.5 rounded-lg shadow-sm">
                  <CheckCircle2 size={16} className="text-teal-600" />
                  {activeAssignmentType.type || activeAssignmentType.Type}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-950 text-xs font-black px-3 py-1 rounded-lg">
                  <AlertCircle size={14} />
                  Not Selected (AssignmentTypeId is NULL)
                </span>
              )}
            </div>

            <p className="text-xs text-teal-100/70 pt-1">
              {activeAssignmentType
                ? `Evaluation parameters configured directly in Universities table for this institution.`
                : `Select any assignment type below to update the AssignmentTypeId in the Universities table.`}
            </p>
          </div>

          {/* Active Configuration Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Daily Limit Metric */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 min-w-[140px]">
              <div className="flex items-center gap-1.5 text-teal-200 text-[10px] font-bold uppercase tracking-wider">
                <Gauge size={14} className="text-teal-300" />
                <span>Daily Limit</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">
                  {activeAssignmentType ? (activeAssignmentType.dailyLimit ?? activeAssignmentType.DailyLimit ?? 0) : 0}
                </span>
                <span className="text-[11px] text-teal-200/80 font-medium">copies / day</span>
              </div>
            </div>

            {/* Time Per Copy Metric */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 min-w-[140px]">
              <div className="flex items-center gap-1.5 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                <Clock size={14} className="text-amber-300" />
                <span>Time / Copy</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">
                  {activeAssignmentType ? (activeAssignmentType.timePerCopy ?? activeAssignmentType.TimePerCopy ?? 0) : 0}
                </span>
                <span className="text-[11px] text-amber-200/80 font-medium">minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Assignment Types Grid */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Layers size={17} className="text-teal-700" />
              <span>Available Assignment Types</span>
            </h2>
            <p className="text-xs text-gray-500">
              Select any assignment type below to update the university's assignment rule in the database
            </p>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {assignmentTypes.length} Available
          </span>
        </div>

        {loading && assignmentTypes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Loading assignment types...</p>
          </div>
        ) : assignmentTypes.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center space-y-3">
            <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center mx-auto">
              <Tag size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">No assignment types found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Create your first assignment type with Daily Limit and Time Per Copy to assign it to universities.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs transition cursor-pointer"
            >
              Add First Assignment Type
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignmentTypes.map(t => {
              const isSelected = currentUniversity?.assignmentTypeId === t.id;
              const isSaving = savingId === t.id;

              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-teal-600 shadow-md ring-2 ring-teal-600/20 bg-teal-50/10'
                      : 'border-gray-200 hover:border-teal-400 shadow-xs'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-teal-700 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-lg tracking-wider flex items-center gap-1 shadow-xs">
                      <Check size={12} /> Currently Selected
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-mono">
                        ID: #{t.id}
                      </span>
                      <h3 className="text-base font-black text-gray-900">
                        {t.type || t.Type}
                      </h3>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                      <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-1 text-teal-700 text-[10px] font-bold uppercase tracking-wider">
                          <Gauge size={13} /> Daily Limit
                        </div>
                        <p className="text-lg font-black text-gray-900 mt-1">
                          {t.dailyLimit ?? t.DailyLimit ?? 50}
                          <span className="text-[10px] text-gray-400 font-semibold ml-1">copies</span>
                        </p>
                      </div>

                      <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-1 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                          <Clock size={13} /> Time / Copy
                        </div>
                        <p className="text-lg font-black text-gray-900 mt-1">
                          {t.timePerCopy ?? t.TimePerCopy ?? 15}
                          <span className="text-[10px] text-gray-400 font-semibold ml-1">mins</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button: Update assignmentId in Universities table */}
                  <div className="pt-4 mt-2">
                    {isSelected ? (
                      <div className="w-full py-2.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 select-none">
                        <CheckCircle2 size={16} className="text-teal-700" />
                        <span>Active for This University</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyAssignmentType(t.id)}
                        disabled={isSaving || savingId !== null}
                        className="w-full py-2.5 bg-gray-900 hover:bg-teal-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Select as Active Type</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create New Assignment Type Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-teal-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                    Add Assignment Type
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Define evaluation limit and time per copy
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Type Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Single Evaluation, Double Evaluation"
                  value={newType.type}
                  onChange={(e) => setNewType({ ...newType, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Daily Limit (copies)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newType.dailyLimit}
                    onChange={(e) => setNewType({ ...newType, dailyLimit: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Time / Copy (mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={newType.timePerCopy}
                    onChange={(e) => setNewType({ ...newType, timePerCopy: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={creating}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {creating ? 'Saving...' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
