import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, X } from 'lucide-react';
import roleService from '../services/roleService';
import PermissionSelector from '../components/RoleManagement/PermissionSelector';
import { useAuth } from '../context/AuthContext';
import message from '../services/messageService';

export default function RoleManagement() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    roleName: '',
    description: '',
    hierarchyLevel: 1,
    isActive: true,
    permissions: []
  });

  // Fetch roles and permissions
  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        roleService.getAllRoles(),
        roleService.getAllPermissions()
      ]);
      setRoles(rolesData.data || []);
      setPermissions(permissionsData.data || []);
      setError(null);
    } catch (err) {
      const errMsg = err.message || 'Failed to fetch roles and permissions';
      setError(errMsg);
      message.error(errMsg);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewModal = () => {
    setEditingRole(null);
    setFormValues({
      roleName: '',
      description: '',
      hierarchyLevel: roles.length + 1,
      isActive: true,
      permissions: []
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role) => {
    setEditingRole(role);
    setFormValues({
      roleName: role.roleName,
      description: role.description || '',
      hierarchyLevel: role.hierarchyLevel || 1,
      isActive: role.isActive ?? true,
      permissions: role.permissionsList || []
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormValues({
      roleName: '',
      description: '',
      hierarchyLevel: 1,
      isActive: true,
      permissions: []
    });
    setError(null);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formValues.roleName.trim()) {
      const msg = 'Role name is required';
      setError(msg);
      message.error(msg);
      return;
    }

    if (formValues.permissions.length === 0) {
      const msg = 'At least one permission must be selected';
      setError(msg);
      message.error(msg);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        roleName: formValues.roleName.trim(),
        description: formValues.description?.trim() || '',
        hierarchyLevel: formValues.hierarchyLevel || 1,
        isActive: formValues.isActive,
        permissions: formValues.permissions
      };

      if (editingRole) {
        await roleService.updateRole(editingRole.roleId, payload);
        message.success(`Role "${formValues.roleName}" updated successfully`);
      } else {
        await roleService.createRole(payload);
        message.success(`Role "${formValues.roleName}" created successfully`);
      }

      handleCloseModal();
      await fetchRolesAndPermissions();
    } catch (err) {
      const errMsg = err.message || 'Failed to save role';
      setError(errMsg);
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (window.confirm(`Are you sure you want to delete role "${roleName}"?`)) {
      try {
        setError(null);
        await roleService.deleteRole(roleId);
        message.success(`Role "${roleName}" deleted successfully`);
        await fetchRolesAndPermissions();
      } catch (err) {
        const errMsg = err.message || 'Failed to delete role';
        setError(errMsg);
        message.error(errMsg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Notifications */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700 shadow-sm">
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Main Card Container Matching Image */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Card Top Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800 tracking-tight">
              Role List
            </h2>
            
            {hasPermission('CREATE_ROLE') && (
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-5 py-1.5 rounded transition-all duration-150 shadow-sm"
              >
                New
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-800 text-sm font-medium">
                  <th className="py-3.5 px-6 font-semibold w-24">ID</th>
                  <th className="py-3.5 px-6 font-semibold">Name</th>
                  <th className="py-3.5 px-6 font-semibold w-48">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {loading && roles.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-gray-400">
                      <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent mb-2"></div>
                      <p>Loading roles...</p>
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-gray-400 font-normal">
                      No roles found
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.roleId} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-4 px-6 text-gray-800 font-normal">
                        {role.roleId}
                      </td>
                      <td className="py-4 px-6 text-gray-800 font-normal">
                        {role.roleName}
                      </td>
                      <td className="py-4 px-6 text-gray-700 font-normal">
                        {role.isActive ? 'Enable' : 'Disable'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-3.5">
                          {hasPermission('UPDATE_ROLE') && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(role)}
                              title="Edit Role"
                              className="text-slate-500 hover:text-blue-600 transition-colors p-1"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {hasPermission('DELETE_ROLE') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role.roleId, role.roleName)}
                              title="Delete Role"
                              className="text-[#e74c3c] hover:text-red-700 transition-colors p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Role Creation / Edit Modal Dialog Matching Blue Theme */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                {editingRole ? 'Edit' : 'New'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              
              {/* Name Row */}
              <div className="flex items-center">
                <label className="w-28 text-sm text-gray-700 text-right pr-4 shrink-0 font-normal">
                  <span className="text-red-500 mr-1">*</span>Name :
                </label>
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    value={formValues.roleName}
                    onChange={(e) => setFormValues({ ...formValues, roleName: e.target.value })}
                    placeholder="Role name"
                    className="w-full bg-white border border-gray-300 text-gray-800 text-sm px-3 py-1.5 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Status Row */}
              <div className="flex items-center">
                <label className="w-28 text-sm text-gray-700 text-right pr-4 shrink-0 font-normal">
                  <span className="text-red-500 mr-1">*</span>Status :
                </label>
                <div className="flex items-center gap-6 text-sm text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="roleStatus"
                      checked={formValues.isActive === true}
                      onChange={() => setFormValues({ ...formValues, isActive: true })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 accent-blue-600"
                    />
                    <span>Enable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="roleStatus"
                      checked={formValues.isActive === false}
                      onChange={() => setFormValues({ ...formValues, isActive: false })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 accent-blue-600"
                    />
                    <span>Disable</span>
                  </label>
                </div>
              </div>

              {/* Permission Row */}
              <div className="flex items-start">
                <label className="w-28 text-sm text-gray-700 text-right pr-4 shrink-0 pt-0.5 font-normal">
                  Permission :
                </label>
                <div className="flex-1 min-w-0">
                  <PermissionSelector
                    permissions={permissions}
                    selectedPermissions={formValues.permissions}
                    onChange={(selectedPerms) => setFormValues({ ...formValues, permissions: selectedPerms })}
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-1.5 rounded border border-gray-300 bg-white text-gray-700 text-sm font-normal hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? '...' : 'OK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
