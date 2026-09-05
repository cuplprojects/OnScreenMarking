import React, { useState } from 'react';
import { Check } from 'lucide-react';

export default function PermissionSelector({ permissions, selectedPermissions, onChange }) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Group permissions by module (Module-wise)
  const groupedPermissions = permissions.reduce((acc, permission) => {
    let category = permission.split('_').slice(1).join('_');

    // Grouping aliases
    if (category === 'LOGS' || category === 'SETTINGS' || category === 'ANALYTICS') {
      category = 'SYSTEM';
    } else if (category === 'PAPERS' || category === 'SECTIONS' || category === 'QUESTIONS') {
      category = 'PAPER';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {});

  const toggleCategoryExpand = (category, e) => {
    e?.stopPropagation();
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = (permission, e) => {
    e?.stopPropagation();
    const newSelected = selectedPermissions.includes(permission)
      ? selectedPermissions.filter(p => p !== permission)
      : [...selectedPermissions, permission];
    onChange(newSelected);
  };

  const toggleCategoryAll = (category, e) => {
    e?.stopPropagation();
    const categoryPermissions = groupedPermissions[category] || [];
    const allSelected = categoryPermissions.length > 0 && categoryPermissions.every(p => selectedPermissions.includes(p));

    let newSelected;
    if (allSelected) {
      newSelected = selectedPermissions.filter(p => !categoryPermissions.includes(p));
    } else {
      newSelected = [...new Set([...selectedPermissions, ...categoryPermissions])];
    }
    onChange(newSelected);
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'UNIVERSITY': 'University Management',
      'COLLEGE': 'College Management',
      'DEPARTMENT': 'Department Management',
      'COURSE': 'Course Management',
      'SUBJECT': 'Subject Management',
      'SESSION': 'Session Management',
      'PROJECT': 'Project Management',
      'PAPER': 'Paper & Assessment',
      'SCRIPT': 'Script Management',
      'ALLOCATION': 'Script Allocation',
      'MARKING': 'Marking & Evaluation',
      'ATTENDANCE': 'Attendance Management',
      'USER': 'User Management',
      'ROLE': 'Role & Permission',
      'REPORTS': 'Report Management',
      'SYSTEM': 'System Administration'
    };
    return labels[category] || category;
  };

  const getPermissionLabel = (permission) => {
    const customLabels = {
      'VIEW_LOGS': 'View System Logs',
      'MANAGE_SETTINGS': 'Manage System Settings',
      'VIEW_ANALYTICS': 'View Performance Analytics',
      'VIEW_REPORTS': 'View Reports',
      'EXPORT_REPORTS': 'Export Reports',
      'IMPORT_PAPERS': 'Import Papers (CSV/Excel)',
      'MANAGE_SECTIONS': 'Configure Sections',
      'MANAGE_QUESTIONS': 'Configure Questions',
      'INVITE_USER': 'Invite Users'
    };

    if (customLabels[permission]) return customLabels[permission];

    const action = permission.split('_')[0];
    const moduleName = permission.split('_').slice(1).join(' ').toLowerCase();
    const actionLabels = {
      'CREATE': 'Create / Add',
      'READ': 'View / Read',
      'UPDATE': 'Edit / Update',
      'DELETE': 'Delete / Remove'
    };

    return actionLabels[action] ? `${actionLabels[action]} ${moduleName}` : permission.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-2 text-sm text-gray-800 select-none">
      {Object.entries(groupedPermissions).map(([category, categoryPerms]) => {
        const isExpanded = expandedCategories.has(category);
        const allSelected = categoryPerms.length > 0 && categoryPerms.every(p => selectedPermissions.includes(p));
        const someSelected = !allSelected && categoryPerms.some(p => selectedPermissions.includes(p));

        return (
          <div key={category} className="space-y-1">
            {/* Category Row */}
            <div className="flex items-center gap-1.5 py-0.5 hover:bg-blue-50/50 rounded px-1 group cursor-pointer">
              
              {/* Expand / Collapse Caret */}
              <button
                type="button"
                onClick={(e) => toggleCategoryExpand(category, e)}
                className="w-4 h-4 flex items-center justify-center text-blue-600 hover:text-blue-800"
              >
                {categoryPerms.length > 1 ? (
                  isExpanded ? (
                    <span className="text-[10px] leading-none transform rotate-0 font-bold">▼</span>
                  ) : (
                    <span className="text-[10px] leading-none transform rotate-0 font-bold">▶</span>
                  )
                ) : (
                  <span className="w-2.5"></span>
                )}
              </button>

              {/* Checkbox (Blue Square with White Checkmark) */}
              <button
                type="button"
                onClick={(e) => toggleCategoryAll(category, e)}
                className={`w-4 h-4 rounded-[3px] flex items-center justify-center transition-colors border ${
                  allSelected
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : someSelected
                    ? 'bg-blue-600/80 border-blue-600 text-white'
                    : 'bg-white border-gray-300 hover:border-blue-400 text-transparent'
                }`}
              >
                {allSelected && <Check size={12} strokeWidth={3.5} />}
                {someSelected && <div className="w-2 h-0.5 bg-white rounded-full"></div>}
              </button>

              {/* Category Label */}
              <span
                onClick={(e) => toggleCategoryAll(category, e)}
                className="font-normal text-gray-800 text-[13.5px] cursor-pointer hover:text-blue-900"
              >
                {getCategoryLabel(category)}
              </span>
            </div>

            {/* Sub-Permissions (when expanded) */}
            {isExpanded && (
              <div className="pl-8 space-y-1 py-0.5 border-l border-blue-100 ml-3">
                {categoryPerms.map(permission => {
                  const isChecked = selectedPermissions.includes(permission);
                  return (
                    <div
                      key={permission}
                      onClick={(e) => togglePermission(permission, e)}
                      className="flex items-center gap-2 py-0.5 hover:bg-blue-50/40 rounded px-1 cursor-pointer"
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => togglePermission(permission, e)}
                        className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center transition-colors border ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 hover:border-blue-400 text-transparent'
                        }`}
                      >
                        {isChecked && <Check size={10} strokeWidth={3.5} />}
                      </button>

                      {/* Sub-item Label */}
                      <span className="text-gray-700 text-xs hover:text-blue-900">
                        {getPermissionLabel(permission)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
