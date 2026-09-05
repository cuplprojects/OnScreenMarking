import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import roleService from '../../services/roleService';

export default function AssignRoleModal({ user, onClose, onSubmit }) {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(user.roleId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await roleService.getAllRoles();
      const rolesList = data.data || [];
      setRoles(rolesList);
      
      // Auto-select the matching role based on user.userType (case-insensitive)
      if (user && user.userType && rolesList.length > 0) {
        const matchingRole = rolesList.find(
          r => r.roleName.toLowerCase() === user.userType.toLowerCase()
        );
        if (matchingRole) {
          setSelectedRoleId(matchingRole.roleId);
        }
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(selectedRoleId);
    } catch (err) {
      setError(err.message || 'Failed to assign role');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Assign Role</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* User Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">User: <span className="font-semibold">{user.name}</span></p>
            <p className="text-sm text-gray-600">Email: <span className="font-semibold">{user.email}</span></p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Role *
            </label>
            <select
              value={selectedRoleId || ''}
              onChange={(e) => setSelectedRoleId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Role --</option>
              {roles.map(role => (
                <option key={role.roleId} value={role.roleId}>
                  {role.roleName} ({role.permissionsList?.length || 0} permissions)
                </option>
              ))}
            </select>
          </div>

          {/* Role Details */}
          {selectedRoleId && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              {(() => {
                const selectedRole = roles.find(r => r.roleId === selectedRoleId);
                return selectedRole ? (
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-2">{selectedRole.roleName}</p>
                    <p className="text-sm text-blue-800 mb-3">{selectedRole.description || 'No description'}</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedRole.permissionsList?.slice(0, 5).map(perm => (
                        <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {perm.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {selectedRole.permissionsList?.length > 5 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          +{selectedRole.permissionsList.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : 'Assign Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
