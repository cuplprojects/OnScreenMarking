import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  Bell,
  Shield,
  Zap,
  Clock,
  Gauge,
  Timer,
  Calendar,
  Building2,
  RefreshCw,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import universitySettingService from '../services/universitySettingService';
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
    completionDate: '',
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

  // Fetch Assignment Configuration via GET endpoint
  const fetchAssignmentConfiguration = useCallback(async () => {
    try {
      setLoading(true);
      const targetUniId = activeUniversityId ? parseInt(activeUniversityId, 10) : null;
      const res = await universitySettingService.getAssignmentConfig(targetUniId);
      
      const data = res?.data || res;
      if (data && (data.type || data.dailyLimit || data.completionDate)) {
        // Enforce the 2 hardcoded options
        let normalizedType = 'Daily Allocation';
        if (data.type && data.type.toLowerCase().includes('equal')) {
          normalizedType = 'Equal Distribution';
        }

        const isEqual = normalizedType === 'Equal Distribution';
        setAssignmentConfig({
          id: data.id || 0,
          type: normalizedType,
          dailyLimit: isEqual ? 0 : (data.dailyLimit !== undefined && data.dailyLimit !== null ? data.dailyLimit : 50),
          timePerCopy: data.timePerCopy || 15,
          reassignmentHours: isEqual ? '' : (data.reassignmentHours !== undefined && data.reassignmentHours !== null ? data.reassignmentHours : 24),
          completionDate: data.completionDate ? data.completionDate.split('T')[0] : '',
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
      const isEqual = assignmentConfig.type === 'Equal Distribution';

      if (isEqual && !assignmentConfig.completionDate) {
        message.warning("Please choose a completion date for Equal Distribution.");
        setSaving(false);
        return;
      }

      // 1. Save Assignment Configuration to backend
      const payload = {
        universityId: targetUniId,
        type: assignmentConfig.type, // Strictly 'Daily Allocation' or 'Equal Distribution'
        dailyLimit: isEqual ? 0 : (parseInt(assignmentConfig.dailyLimit, 10) || 50),
        timePerCopy: parseInt(assignmentConfig.timePerCopy, 10) || 15,
        reassignmentHours: isEqual ? null : (parseInt(assignmentConfig.reassignmentHours, 10) || 24),
        completionDate: isEqual && assignmentConfig.completionDate ? `${assignmentConfig.completionDate}T23:59:59` : null
      };

      const res = await universitySettingService.saveAssignmentConfig(payload);

      // 2. Persist local preferences in localStorage
      localStorage.setItem('osm_portal_preferences', JSON.stringify(preferences));

      if (res && res.data) {
        setAssignmentConfig(prev => ({
          ...prev,
          id: res.data.id || prev.id,
          dailyLimit: isEqual ? 0 : (res.data.dailyLimit ?? prev.dailyLimit),
          reassignmentHours: isEqual ? '' : (res.data.reassignmentHours ?? prev.reassignmentHours),
          completionDate: res.data.completionDate ? res.data.completionDate.split('T')[0] : (isEqual ? prev.completionDate : ''),
          updatedAt: res.data.updatedAt || new Date().toISOString()
        }));
      }

      if (res?.message) {
        message.success(res.message);
      } else {
        message.success('Portal settings & assignment configuration saved successfully!');
      }
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
                {assignmentConfig.updatedAt && (
                  <span className="text-gray-400 text-[11px] ml-2">
                    • Last updated: {new Date(assignmentConfig.updatedAt).toLocaleDateString()}
                  </span>
                )}
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

        {/* 2-COLUMN GRID WITH 4 DIVS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* DIV 1: SCRIPT ASSIGNMENT CONFIGURATION */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {/* Header with Dropdown to the absolute right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 tracking-tight leading-tight">
                    Script Assignment Configuration
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Evaluation distribution algorithm and speed limits for examiners
                  </p>
                </div>
              </div>

              {/* Dropdown at the absolute right of the card */}
              <div className="shrink-0">
                <select
                  value={assignmentConfig.type}
                  onChange={(e) => handleAssignmentChange('type', e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:border-teal-500 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition cursor-pointer shadow-xs"
                >
                  <option value="Daily Allocation">Daily Allocation</option>
                  <option value="Equal Distribution">Equal Distribution</option>
                </select>
              </div>
            </div>

            {/* Evaluation Parameters - dynamic by mode */}
            {assignmentConfig.type === 'Daily Allocation' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Daily Limit */}
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200/80">
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Gauge size={13} className="text-teal-700" />
                    <span>Daily Limit</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={assignmentConfig.dailyLimit}
                      onChange={(e) => handleAssignmentChange('dailyLimit', e.target.value)}
                      className="w-full pl-2.5 pr-14 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                      copies
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Max daily quota</p>
                </div>

                {/* Time Per Copy */}
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200/80">
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-600" />
                    <span>Time / Copy</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={assignmentConfig.timePerCopy}
                      onChange={(e) => handleAssignmentChange('timePerCopy', e.target.value)}
                      className="w-full pl-2.5 pr-14 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                      mins
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Min eval time</p>
                </div>

                {/* Reassign Hours */}
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200/80">
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Timer size={13} className="text-sky-600" />
                    <span>Reassign</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={assignmentConfig.reassignmentHours}
                      onChange={(e) => handleAssignmentChange('reassignmentHours', e.target.value)}
                      className="w-full pl-2.5 pr-12 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                      hrs
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Inactive recall</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Time Per Copy */}
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200/80">
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-600" />
                    <span>Time / Copy</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={assignmentConfig.timePerCopy}
                      onChange={(e) => handleAssignmentChange('timePerCopy', e.target.value)}
                      className="w-full pl-2.5 pr-14 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                      mins
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Mandatory minimum minutes per copy evaluation</p>
                </div>

                {/* Completion Date */}
                <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200/80">
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-teal-700" />
                    <span>Completion Date</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={assignmentConfig.completionDate || ''}
                      onChange={(e) => handleAssignmentChange('completionDate', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition cursor-pointer"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Target deadline date for examiners to complete evaluation</p>
                </div>
              </div>
            )}

            {/* Information Callout Banner */}
            <div className="bg-teal-50/70 border border-teal-200/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-teal-900">
              <Info size={14} className="text-teal-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                Scripts are assigned using <strong className="font-extrabold text-teal-950">{assignmentConfig.type}</strong>.
                {assignmentConfig.type === 'Daily Allocation'
                  ? ` Grouped subject-wise up to ${assignmentConfig.dailyLimit} copies/day (${assignmentConfig.timePerCopy} mins/copy). Inactive copies recall after ${assignmentConfig.reassignmentHours} hrs.`
                  : ` Partitioned equally across eligible examiners (${assignmentConfig.timePerCopy} mins/copy) with deadline of ${assignmentConfig.completionDate ? new Date(assignmentConfig.completionDate).toLocaleDateString() : 'selected date'}.`}
              </div>
            </div>
          </div>

          {/* DIV 2: MARKING INTERFACE PREFERENCES */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shadow-xs shrink-0">
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

          {/* DIV 3: NOTIFICATION ALERTS */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-xs shrink-0">
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

          {/* DIV 4: SECURITY & COMPLIANCE */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 shadow-xs shrink-0">
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



      </div>
    </div>
  );
}
