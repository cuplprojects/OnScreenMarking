import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  Bell,
  Shield,
  Zap,
  Sliders,
  Clock,
  Gauge,
  Timer,
  Check,
  CheckCircle2,
  Building2,
  RefreshCw,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import universitySettingService from '../services/universitySettingService';
import allocationService from '../services/allocationService';
import message from '../services/messageService';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const { userType, universityId: userUniversityId, user } = useAuth();

  const universityIdFromUrl = searchParams.get('universityId');
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : (universityIdFromUrl || userUniversityId);

  // Assignment Configuration State (Strictly 2 options: Daily Allocation or Equal Distribution)
  const [assignmentConfig, setAssignmentConfig] = useState({
    id: 0,
    type: 'Daily Allocation', // Hardcoded strictly: 'Daily Allocation' or 'Equal Distribution'
    dailyLimit: 50,
    timePerCopy: 15,
    reassignmentHours: 24,
    universityId: activeUniversityId || null,
    universityName: user?.university?.universityName || user?.universityName || 'Your Institution',
    updatedAt: null
  });

  // General Portal Preferences State
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('osm_portal_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback default
      }
    }
    return {
      emailNotifications: true,
      newScriptAlerts: true,
      dailySummary: true,
      markingSpeed: 'normal',
      scriptTimeout: 30,
      autoSave: true,
      enableAnnotations: true,
      twoFactor: false,
      allowAuditLogs: true,
      allowCoordinatorProgress: true
    };
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const handleTriggerDailyAllocation = async () => {
    const targetUniId = activeUniversityId ? parseInt(activeUniversityId, 10) : user?.universityId;
    if (!targetUniId) {
      message.error("No active university selected to run daily allocation.");
      return;
    }
    try {
      setIsAllocating(true);
      const res = await allocationService.dailyAllocateByUniversity(targetUniId);
      if (res?.success) {
        message.success(res.message || `Successfully allocated ${res.allocatedCount} scripts.`);
      } else {
        message.warning(res?.message || "Daily allocation completed with no new allocations.");
      }
    } catch (err) {
      message.error("Failed to run daily allocation: " + (err?.message || err));
    } finally {
      setIsAllocating(false);
    }
  };

  const handleTriggerReassignment = async () => {
    const targetUniId = activeUniversityId ? parseInt(activeUniversityId, 10) : user?.universityId;
    if (!targetUniId) {
      message.error("No active university selected to run reassignment.");
      return;
    }
    try {
      setIsReassigning(true);
      const res = await allocationService.reassignExpiredByUniversity(targetUniId);
      if (res?.success) {
        message.success(res.message || `Successfully reassigned ${res.reassignedCount} expired allocations.`);
      } else {
        message.warning(res?.message || "No expired allocations found.");
      }
    } catch (err) {
      message.error("Failed to run reassignment: " + (err?.message || err));
    } finally {
      setIsReassigning(false);
    }
  };

  // Fetch Assignment Configuration via GET endpoint
  const fetchAssignmentConfiguration = useCallback(async () => {
    try {
      setLoading(true);
      const targetUniId = activeUniversityId ? parseInt(activeUniversityId, 10) : null;
      const res = await universitySettingService.getAssignmentConfig(targetUniId);
      
      const data = res?.data || res;
      if (data && (data.type || data.dailyLimit)) {
        // Enforce the 2 hardcoded options
        let normalizedType = 'Daily Allocation';
        if (data.type && data.type.toLowerCase().includes('equal')) {
          normalizedType = 'Equal Distribution';
        }

        setAssignmentConfig({
          id: data.id || 0,
          type: normalizedType,
          dailyLimit: data.dailyLimit || 50,
          timePerCopy: data.timePerCopy || 15,
          reassignmentHours: data.reassignmentHours || 24,
          universityId: data.universityId || targetUniId,
          universityName: data.universityName || user?.university?.universityName || user?.universityName || 'Your Institution',
          updatedAt: data.updatedAt
        });
      }
    } catch (err) {
      console.warn('Could not load assignment configuration:', err);
    } finally {
      setLoading(false);
    }
  }, [activeUniversityId, user]);

  useEffect(() => {
    fetchAssignmentConfiguration();
  }, [fetchAssignmentConfiguration]);

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleAssignmentChange = (field, value) => {
    setAssignmentConfig(prev => ({ ...prev, [field]: value }));
  };

  // Submit configuration via POST endpoint
  const handleSave = async () => {
    try {
      setSaving(true);

      const targetUniId = activeUniversityId ? parseInt(activeUniversityId, 10) : null;

      // 1. Save Assignment Configuration to backend
      const payload = {
        universityId: targetUniId,
        type: assignmentConfig.type, // Strictly 'Daily Allocation' or 'Equal Distribution'
        dailyLimit: parseInt(assignmentConfig.dailyLimit, 10) || 50,
        timePerCopy: parseInt(assignmentConfig.timePerCopy, 10) || 15,
        reassignmentHours: parseInt(assignmentConfig.reassignmentHours, 10) || 24
      };

      const res = await universitySettingService.saveAssignmentConfig(payload);

      // 2. Persist local preferences in localStorage
      localStorage.setItem('osm_portal_preferences', JSON.stringify(preferences));

      if (res && res.data) {
        setAssignmentConfig(prev => ({
          ...prev,
          id: res.data.id || prev.id,
          updatedAt: res.data.updatedAt || new Date().toISOString()
        }));
      }

      message.success('Portal settings & assignment configuration saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      message.error(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none px-4 py-3 lg:px-8 lg:py-4">
      <div className="w-full space-y-4">
        
        {/* Header & Controls */}
        <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                Portal Settings & Preferences
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Configure evaluation allocation rules for colleges and examiners, workflow parameters, and portal security
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Institution Badge */}
              {assignmentConfig.universityName && (
                <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200/70 text-teal-900 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <Building2 size={14} className="text-teal-700" />
                  <span className="truncate max-w-[200px]">{assignmentConfig.universityName}</span>
                </div>
              )}

              <button
                onClick={fetchAssignmentConfiguration}
                disabled={loading || saving}
                className="p-2 text-gray-500 hover:text-teal-700 hover:bg-teal-50/60 border border-gray-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                title="Refresh configuration"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 1: SCRIPT ASSIGNMENT CONFIGURATION */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
                <SlidersHorizontal size={16} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight leading-tight">
                  Script Assignment Configuration
                </h2>
                <p className="text-xs text-gray-500">
                  Evaluation distribution algorithm and speed limits for examiners
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Mode:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-teal-50 border border-teal-200 text-teal-800">
                <CheckCircle2 size={13} className="text-teal-600" />
                {assignmentConfig.type}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Mode Selector Cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Assignment Mode
                </label>
                <span className="text-[11px] text-gray-400 font-medium">Click either card below to select active mode</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Option 1: Daily Allocation */}
                <div
                  onClick={() => handleAssignmentChange('type', 'Daily Allocation')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    assignmentConfig.type === 'Daily Allocation'
                      ? 'border-teal-700 bg-teal-50/40 shadow-xs ring-1 ring-teal-700/20'
                      : 'border-gray-200 hover:border-teal-200 bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                          assignmentConfig.type === 'Daily Allocation'
                            ? 'border-teal-700 bg-teal-700'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {assignmentConfig.type === 'Daily Allocation' && (
                            <Check size={12} className="text-white stroke-[3]" />
                          )}
                        </div>
                        <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                          Daily Allocation
                        </h3>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        assignmentConfig.type === 'Daily Allocation'
                          ? 'bg-teal-700 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        Capped Quota
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed pl-7.5">
                      Examiners receive scripts daily in controlled batches up to the daily quota limit. Prevents examiner burnout and ensures consistent evaluation quality.
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-gray-100/80 flex items-center gap-4 text-[11px] text-gray-500 pl-7.5">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      Batch quota control
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      Daily reset cycle
                    </span>
                  </div>
                </div>

                {/* Option 2: Equal Distribution */}
                <div
                  onClick={() => handleAssignmentChange('type', 'Equal Distribution')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    assignmentConfig.type === 'Equal Distribution'
                      ? 'border-teal-700 bg-teal-50/40 shadow-xs ring-1 ring-teal-700/20'
                      : 'border-gray-200 hover:border-teal-200 bg-white hover:bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                          assignmentConfig.type === 'Equal Distribution'
                            ? 'border-teal-700 bg-teal-700'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {assignmentConfig.type === 'Equal Distribution' && (
                            <Check size={12} className="text-white stroke-[3]" />
                          )}
                        </div>
                        <h3 className="text-sm font-extrabold text-gray-900 leading-tight">
                          Equal Distribution
                        </h3>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        assignmentConfig.type === 'Equal Distribution'
                          ? 'bg-teal-700 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        Balanced Load
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed pl-7.5">
                      Total script inventory is divided evenly and distributed concurrently across all eligible examiners. Ideal for fast turnaround and synchronized completion.
                    </p>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-gray-100/80 flex items-center gap-4 text-[11px] text-gray-500 pl-7.5">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      Even workload share
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      Concurrent evaluation
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameters Grid */}
            <div className="pt-3 border-t border-gray-100">
              <div className="mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Evaluation Parameters
                </h3>
                <p className="text-xs text-gray-400">Numerical limits and timeout thresholds for script evaluation</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Daily Limit */}
                <div className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/80">
                  <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Gauge size={14} className="text-teal-700" />
                    <span>Daily Limit</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={assignmentConfig.dailyLimit}
                      onChange={(e) => handleAssignmentChange('dailyLimit', e.target.value)}
                      className="w-full pl-3 pr-24 py-2 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                      copies / day
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Max scripts allocated per day</p>
                </div>

                {/* Time Per Copy */}
                <div className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/80">
                  <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-600" />
                    <span>Time / Copy</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={assignmentConfig.timePerCopy}
                      onChange={(e) => handleAssignmentChange('timePerCopy', e.target.value)}
                      className="w-full pl-3 pr-24 py-2 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                      minutes
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Estimated evaluation minutes</p>
                </div>

                {/* Reassign Hours */}
                <div className="bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/80">
                  <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Timer size={14} className="text-sky-600" />
                    <span>Reassign Hours</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={assignmentConfig.reassignmentHours}
                      onChange={(e) => handleAssignmentChange('reassignmentHours', e.target.value)}
                      className="w-full pl-3 pr-20 py-2 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                      hours
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">Hours before inactive recall</p>
                </div>
              </div>
            </div>

            {/* Information Callout Banner */}
            <div className="bg-teal-50/70 border border-teal-200/60 rounded-xl p-3.5 flex items-start sm:items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Info size={15} />
              </div>
              <div className="text-xs text-teal-900 font-medium leading-relaxed">
                Scripts are assigned using <strong className="font-extrabold text-teal-950">{assignmentConfig.type}</strong>.
                {assignmentConfig.type === 'Daily Allocation'
                  ? ` Examiners will be capped at ${assignmentConfig.dailyLimit} copies per day, expecting ${assignmentConfig.timePerCopy} mins per evaluation. Unmarked scripts can be recalled after ${assignmentConfig.reassignmentHours} hours of inactivity.`
                  : ` Answer scripts are partitioned equally across all eligible examiners, expecting ${assignmentConfig.timePerCopy} mins per evaluation, with a ${assignmentConfig.reassignmentHours}-hour inactive recall window.`}
              </div>
            </div>

            {/* Quick Action Triggers */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {assignmentConfig.type === 'Daily Allocation' && (
                <button
                  type="button"
                  onClick={handleTriggerDailyAllocation}
                  disabled={isAllocating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                  title="Run automatic Daily Allocation according to configured daily limit and subject match"
                >
                  {isAllocating ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Zap size={13} />
                  )}
                  <span>{isAllocating ? 'Allocating...' : 'Run Daily Allocation Now'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleTriggerReassignment}
                disabled={isReassigning}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                title="Identify unsubmitted copies past reassignment window, deactivate them (status=0), and reset to pending"
              >
                {isReassigning ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Clock size={13} />
                )}
                <span>{isReassigning ? 'Checking...' : 'Check & Reassign Inactive Copies'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: WORKSPACE & MARKING PREFERENCES */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shadow-xs">
              <Zap size={16} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900 tracking-tight leading-tight">
                Marking Interface Preferences
              </h2>
              <p className="text-xs text-gray-500">
                Evaluation workspace behavior, page transition pacing, and auto-save timers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                Marking Speed Profile
              </label>
              <select
                value={preferences.markingSpeed}
                onChange={(e) => handlePreferenceChange('markingSpeed', e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition cursor-pointer"
              >
                <option value="slow">Paced (Deep, thorough evaluation)</option>
                <option value="normal">Normal Pace (Standard rubric flow)</option>
                <option value="fast">Accelerated (Rapid evaluation mode)</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Controls transition delays between booklet pages</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                Script Session Timeout
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={preferences.scriptTimeout}
                  onChange={(e) => handlePreferenceChange('scriptTimeout', e.target.value)}
                  className="w-full pl-3 pr-20 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
                  minutes
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Automatic session pause after idle evaluation period</p>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
              <div>
                <p className="text-xs font-bold text-gray-900">Auto-save Marking Progress</p>
                <p className="text-[11px] text-gray-500">Save rubric marks and annotations continuously in background</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.autoSave}
                onClick={() => handlePreferenceChange('autoSave', !preferences.autoSave)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.autoSave ? 'bg-teal-700' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    preferences.autoSave ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
              <div>
                <p className="text-xs font-bold text-gray-900">Enable Annotation Tools</p>
                <p className="text-[11px] text-gray-500">Permit ticks, underlines, and rubric comment stamps</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.enableAnnotations}
                onClick={() => handlePreferenceChange('enableAnnotations', !preferences.enableAnnotations)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  preferences.enableAnnotations ? 'bg-teal-700' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    preferences.enableAnnotations ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: NOTIFICATIONS & SECURITY DUAL-GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Notifications */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-xs">
                <Bell size={16} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight leading-tight">
                  Notification Alerts
                </h2>
                <p className="text-xs text-gray-500">Email and system event triggers</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Enable email notifications</p>
                  <p className="text-[11px] text-gray-400">Receive system activity digests via email</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.emailNotifications}
                  onClick={() => handlePreferenceChange('emailNotifications', !preferences.emailNotifications)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.emailNotifications ? 'bg-teal-700' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      preferences.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-800">Notify when new scripts are assigned</p>
                  <p className="text-[11px] text-gray-400">Immediate alert when new batches are distributed</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.newScriptAlerts}
                  onClick={() => handlePreferenceChange('newScriptAlerts', !preferences.newScriptAlerts)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.newScriptAlerts ? 'bg-teal-700' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      preferences.newScriptAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-800">Daily evaluation summary digest</p>
                  <p className="text-[11px] text-gray-400">End-of-day summary of marked vs pending scripts</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.dailySummary}
                  onClick={() => handlePreferenceChange('dailySummary', !preferences.dailySummary)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.dailySummary ? 'bg-teal-700' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      preferences.dailySummary ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Card B: Security & Privacy */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 shadow-xs">
                <Shield size={16} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight leading-tight">
                  Security & Compliance
                </h2>
                <p className="text-xs text-gray-500">Access control and compliance logging</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Enable two-factor authentication</p>
                  <p className="text-[11px] text-gray-400">Require OTP verification upon portal sign in</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.twoFactor}
                  onClick={() => handlePreferenceChange('twoFactor', !preferences.twoFactor)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.twoFactor ? 'bg-teal-700' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      preferences.twoFactor ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div>
                  <p className="text-xs font-bold text-gray-800">Enable audit logs for compliance</p>
                  <p className="text-[11px] text-gray-400">Log all mark changes, allocations, and user sessions</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.allowAuditLogs}
                  onClick={() => handlePreferenceChange('allowAuditLogs', !preferences.allowAuditLogs)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preferences.allowAuditLogs ? 'bg-teal-700' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      preferences.allowAuditLogs ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">Account Credentials</p>
                  <p className="text-[11px] text-gray-400">Manage coordinator security</p>
                </div>
                <button
                  type="button"
                  onClick={() => message.info('Password management is handled through your organization SSO/Profile.')}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating / Sticky Save Footer Action */}
        <div className="bg-white px-5 py-3 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span>Active Assignment Mode: <strong className="text-gray-900 font-bold">{assignmentConfig.type}</strong></span>
            {assignmentConfig.updatedAt && (
              <span className="hidden sm:inline text-gray-400 text-[11px]">
                • Last updated: {new Date(assignmentConfig.updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider px-5 py-2 rounded-lg transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
