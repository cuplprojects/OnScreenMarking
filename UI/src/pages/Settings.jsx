import { Save, Bell, Lock, User, Shield, Eye, Zap } from 'lucide-react';
import { useState } from 'react';
import message from '../services/messageService';

export default function Settings() {
  const [settings, setSettings] = useState({
    email: 'examiner@cbse.gov.in',
    notifications: true,
    twoFactor: false,
    autoSave: true,
    markingSpeed: 'normal',
    theme: 'light',
    scriptTimeout: 30,
    enableAnnotations: true,
  });

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    message.success('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your OSM portal preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {/* Account Settings */}
        

        {/* Notifications */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-green-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleChange('notifications', e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-gray-700">Enable email notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-gray-700">Notify when new scripts are assigned</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-gray-700">Daily evaluation summary</span>
            </label>
          </div>
        </div>

        {/* Marking Preferences */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-yellow-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Marking Preferences</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marking Speed</label>
              <select
                value={settings.markingSpeed}
                onChange={(e) => handleChange('markingSpeed', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="slow">Slow (More time per script)</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast (Quick evaluation)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Script Timeout (minutes)</label>
              <input
                type="number"
                value={settings.scriptTimeout}
                onChange={(e) => handleChange('scriptTimeout', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => handleChange('autoSave', e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-gray-700">Auto-save marking progress</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enableAnnotations}
                onChange={(e) => handleChange('enableAnnotations', e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-gray-700">Enable annotation tools (tick, circle, underline)</span>
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="text-red-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Security</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.twoFactor}
                onChange={(e) => handleChange('twoFactor', e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-gray-700">Enable two-factor authentication</span>
            </label>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              Change Password
            </button>
          </div>
        </div>

        {/* Privacy & Access Control */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-blue-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Privacy & Access</h2>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-gray-700">Allow coordinator to view my evaluation progress</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-500 rounded"
              />
              <span className="text-gray-700">Allow audit logs for compliance</span>
            </label>
          </div>
        </div>

        {/* Display Settings */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="text-blue-500" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Display Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-lg"
      >
        <Save size={20} />
        Save Changes
      </button>
    </div>
  );
}

