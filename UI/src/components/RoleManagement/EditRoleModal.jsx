import React, { useState } from 'react';
import { X } from 'lucide-react';
import PermissionSelector from './PermissionSelector';

export default function EditRoleModal({ role, permissions, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    roleName: role.roleName,
    description: role.description || '',
    permissions: role.permissionsList || []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionsChange = (selectedPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: selectedPermissions
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.roleName.trim()) {
      setError('Role name is required');
      return;
    }

    if (formData.permissions.length === 0) {
      setError('At least one permission must be selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(role.roleId, formData);
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">Edit Role</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Role Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Role ID: <span className="font-semibold">{role.roleId}</span></p>
            <p className="text-sm text-gray-600">Hierarchy Level: <span className="font-semibold">{role.hierarchyLevel}</span></p>
            <p className="text-sm text-gray-600">Status: <span className={`font-semibold ${role.isActive ? 'text-green-600' : 'text-gray-600'}`}>
              {role.isActive ? 'Active' : 'Inactive'}
            </span></p>
          </div>

          {/* Role Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Role Name *
            </label>
            <input
              type="text"
              name="roleName"
              value={formData.roleName}
              onChange={handleInputChange}
              placeholder="e.g., Admin, Coordinator, Examiner"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the purpose of this role"
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Permissions *
            </label>
            <PermissionSelector
              permissions={permissions}
              selectedPermissions={formData.permissions}
              onChange={handlePermissionsChange}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-teal-700 text-white rounded-md hover:bg-teal-800 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
