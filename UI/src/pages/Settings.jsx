import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save,
  Bell,
  Lock,
  Shield,
  Zap,
  Sliders,
  Clock,
  Gauge,
  Timer,
  Check,
  CheckCircle2,
  Building2,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
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
    <div className="w-full space-y-5 pb-12">
      {/* Breadcrumb & Header Banner */}
      <div className="bg-white px-5 py-4 rounded-xl border border-gray-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center shrink-0 border border-teal-100/60 shadow-xs">
              <Sliders size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                <span>Dashboard</span>
                <ChevronRight size={12} />
                <span className="text-teal-700 font-bold">Settings</span>
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none flex items-center gap-2">
                Portal Settings & Preferences
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Configure evaluation allocation rules for colleges and examiners, workflow parameters, and portal security.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchAssignmentConfiguration}
              disabled={loading || saving}
              className="p-2 text-gray-500 hover:text-teal-700 hover:bg-teal-50/60 border border-gray-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Refresh configuration"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column (2 Cols): Script Assignment Configuration (Primary Feature) */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* SCRIPT ASSIGNMENT CONFIGURATION CARD */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-linear-to-r from-teal-50/80 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
                  <SlidersHorizontal size={17} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">
                    Script Assignment Configuration
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Evaluation distribution algorithm and speed limits for examiners
                  </p>
                </div>
              </div>

              {/* Institution Tag */}
              <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200/80 text-teal-800 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                <Building2 size={13} className="text-teal-700" />
                <span className="truncate max-w-[180px]">{assignmentConfig.universityName}</span>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Mode Selection Cards: Strictly 2 Options (Daily Allocation vs Equal Distribution) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Assignment Mode 
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Option 1: Daily Allocation */}
                  <div
                    onClick={() => handleAssignmentChange('type', 'Daily Allocation')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                      assignmentConfig.type === 'Daily Allocation'
                        ? 'border-teal-600 bg-teal-50/30 ring-2 ring-teal-600/10 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          assignmentConfig.type === 'Daily Allocation'
                            ? 'border-teal-700 bg-teal-700'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {assignmentConfig.type === 'Daily Allocation' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">
                          Daily Allocation
                        </h4>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                        Capped Quota
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 pl-6">
                      Examiners receive scripts daily in controlled batches up to the daily quota limit.
                    </p>
                  </div>

                  {/* Option 2: Equal Distribution */}
                  <div
                    onClick={() => handleAssignmentChange('type', 'Equal Distribution')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                      assignmentConfig.type === 'Equal Distribution'
                        ? 'border-teal-600 bg-teal-50/30 ring-2 ring-teal-600/10 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          assignmentConfig.type === 'Equal Distribution'
                            ? 'border-teal-700 bg-teal-700'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {assignmentConfig.type === 'Equal Distribution' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">
                          Equal Distribution
                        </h4>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                        Balanced Load
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 pl-6">
                      Total script inventory is divided evenly and distributed concurrently across all eligible examiners.
                    </p>
                  </div>
                </div>

                {/* Form Dropdown equivalent for explicit accessibility */}
                <div className="mt-3">
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Selected Allocation Mode
                  </label>
                  <select
                    value={assignmentConfig.type}
                    onChange={(e) => handleAssignmentChange('type', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  >
                    <option value="Daily Allocation">Daily Allocation</option>
                    <option value="Equal Distribution">Equal Distribution</option>
                  </select>
                </div>
              </div>

              {/* Assignment Metric Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                {/* 1. Daily Limit */}
                <div className="space-y-1.5 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5 text-teal-800 text-xs font-bold">
                    <Gauge size={15} className="text-teal-600" />
                    <span>Daily Limit</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={assignmentConfig.dailyLimit}
                    onChange={(e) => handleAssignmentChange('dailyLimit', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                  <p className="text-[10px] text-gray-400">
                    Max scripts allocated per day
                  </p>
                </div>

                {/* 2. Time per Copy */}
                <div className="space-y-1.5 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                    <Clock size={15} className="text-amber-600" />
                    <span>Time / Copy</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={assignmentConfig.timePerCopy}
                    onChange={(e) => handleAssignmentChange('timePerCopy', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                  <p className="text-[10px] text-gray-400">
                    Estimated evaluation minutes
                  </p>
                </div>

                {/* 3. Reassignment Hours */}
                <div className="space-y-1.5 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5 text-sky-800 text-xs font-bold">
                    <Timer size={15} className="text-sky-600" />
                    <span>Reassign Hours</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={assignmentConfig.reassignmentHours}
                    onChange={(e) => handleAssignmentChange('reassignmentHours', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                  <p className="text-[10px] text-gray-400">
                    Hours before inactive recall
                  </p>
                </div>
              </div>

              {/* Status Note Banner */}
              <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-3 flex items-start gap-2.5">
                <Info size={16} className="text-teal-700 shrink-0 mt-0.5" />
                <p className="text-xs text-teal-900">
                  Scripts are assigned using <strong className="font-bold">{assignmentConfig.type}</strong>. 
                  {assignmentConfig.type === 'Daily Allocation'
                    ? ` Examiners will be capped at ${assignmentConfig.dailyLimit} copies per day, expecting ${assignmentConfig.timePerCopy} mins per evaluation.`
                    : ` All available scripts will be distributed in equal shares among eligible subject examiners.`}
                </p>
              </div>
            </div>
          </div>

          {/* MARKING & EVALUATION PREFERENCES CARD */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 shadow-xs">
                <Zap size={17} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Marking Interface Preferences</h3>
                <p className="text-[11px] text-gray-500">Evaluation workspace behavior and timeouts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Marking Speed</label>
                <select
                  value={preferences.markingSpeed}
                  onChange={(e) => handlePreferenceChange('markingSpeed', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-teal-600 focus:bg-white"
                >
                  <option value="slow">Slow (Thorough evaluation)</option>
                  <option value="normal">Normal Pace</option>
                  <option value="fast">Fast (Accelerated evaluation)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Script Session Timeout (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={preferences.scriptTimeout}
                  onChange={(e) => handlePreferenceChange('scriptTimeout', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-teal-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.autoSave}
                  onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Auto-save Marking Progress</span>
                  <span className="text-[11px] text-gray-400">Save rubric marks and annotations continuously in the background</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enableAnnotations}
                  onChange={(e) => handlePreferenceChange('enableAnnotations', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Enable Annotation Tools</span>
                  <span className="text-[11px] text-gray-400">Permit ticks, crosses, underlines, and custom comment stamps</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Notifications, Security & Quick Summary */}
        <div className="space-y-5">
          
          {/* QUICK SUMMARY CARD */}
          <div className="bg-linear-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black tracking-wider uppercase text-teal-400">
                Active Assignment Rule
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">
                {assignmentConfig.type}
              </h3>
              <p className="text-xs text-gray-300 mt-1">
                Active evaluation policy for {assignmentConfig.universityName}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Limit</p>
                <p className="text-sm font-black text-white mt-0.5">{assignmentConfig.dailyLimit}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Time</p>
                <p className="text-sm font-black text-white mt-0.5">{assignmentConfig.timePerCopy}m</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Recall</p>
                <p className="text-sm font-black text-white mt-0.5">{assignmentConfig.reassignmentHours}h</p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={14} />
              <span>{saving ? 'Updating...' : 'Save Configuration'}</span>
            </button>
          </div>

          {/* NOTIFICATIONS CARD */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Bell size={17} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Notification Alerts</h3>
                <p className="text-[11px] text-gray-500">Email and system event triggers</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-xs font-medium text-gray-700">Enable email notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.newScriptAlerts}
                  onChange={(e) => handlePreferenceChange('newScriptAlerts', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-xs font-medium text-gray-700">Notify when new scripts are assigned</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.dailySummary}
                  onChange={(e) => handlePreferenceChange('dailySummary', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-xs font-medium text-gray-700">Daily evaluation summary digest</span>
              </label>
            </div>
          </div>

          {/* SECURITY & PRIVACY CARD */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                <Shield size={17} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Security & Compliance</h3>
                <p className="text-[11px] text-gray-500">Access control and compliance</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.twoFactor}
                  onChange={(e) => handlePreferenceChange('twoFactor', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-xs font-medium text-gray-700">Enable two-factor authentication</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.allowAuditLogs}
                  onChange={(e) => handlePreferenceChange('allowAuditLogs', e.target.checked)}
                  className="w-4 h-4 text-teal-700 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-xs font-medium text-gray-700">Enable audit logs for compliance</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


