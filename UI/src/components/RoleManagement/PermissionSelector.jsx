import React, { useState } from 'react';
import { ChevronDown, Shield, CheckSquare, Square } from 'lucide-react';

export default function PermissionSelector({ permissions, selectedPermissions, onChange }) {
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Group permissions by module (Module-wise)
  const groupedPermissions = permissions.reduce((acc, permission) => {
    let category = permission.split('_').slice(1).join('_');
    
    // Group system admin tasks together under 'SYSTEM'
    if (category === 'LOGS' || category === 'SETTINGS' || category === 'ANALYTICS') {
      category = 'SYSTEM';
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {});

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const togglePermission = (permission) => {
    const newSelected = selectedPermissions.includes(permission)
      ? selectedPermissions.filter(p => p !== permission)
      : [...selectedPermissions, permission];
    onChange(newSelected);
  };

  const toggleCategoryPermissions = (category) => {
    const categoryPermissions = groupedPermissions[category];
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p));
    
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
      'USER': 'User Management',
      'PAPER': 'Paper Management',
      'SCRIPT': 'Script Management',
      'MARKING': 'Marking & Evaluation',
      'ALLOCATION': 'Allocation Management',
      'REPORTS': 'Report Management',
      'ROLE': 'Role & Permission Management',
      'SYSTEM': 'System Administration'
    };
    return labels[category] || category;
  };

  const getPermissionLabel = (permission) => {
    if (permission === 'VIEW_LOGS') return 'View System Logs';
    if (permission === 'MANAGE_SETTINGS') return 'Manage System Settings';
    if (permission === 'VIEW_ANALYTICS') return 'View Performance Analytics';
    if (permission === 'VIEW_REPORTS') return 'View Reports';
    if (permission === 'EXPORT_REPORTS') return 'Export Reports';
    
    const action = permission.split('_')[0];
    const labels = {
      'CREATE': 'Create/Add',
      'READ': 'Read/View',
      'UPDATE': 'Update/Edit',
      'DELETE': 'Delete/Remove'
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-4 border border-slate-200 rounded-xl p-5 bg-slate-50/50 max-h-[28rem] overflow-y-auto shadow-inner">
      {Object.entries(groupedPermissions).map(([category, categoryPerms]) => {
        const allSelected = categoryPerms.every(p => selectedPermissions.includes(p));
        const someSelected = categoryPerms.some(p => selectedPermissions.includes(p)) && !allSelected;
        const selectedCount = categoryPerms.filter(p => selectedPermissions.includes(p)).length;

        return (
          <div 
            key={category} 
            className={`border rounded-xl bg-white shadow-sm transition-all duration-300 ${
              allSelected 
                ? 'border-blue-200 shadow-blue-500/5' 
                : someSelected 
                ? 'border-slate-300' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Category Header */}
            <div
              onClick={() => toggleCategory(category)}
              className="flex items-center gap-3 p-4 hover:bg-slate-50/50 cursor-pointer select-none"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategoryPermissions(category);
                }}
                className={`p-1 rounded-md transition-colors ${
                  allSelected 
                    ? 'text-blue-600 bg-blue-50' 
                    : someSelected 
                    ? 'text-blue-500 bg-blue-50/50' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                {allSelected ? (
                  <CheckSquare size={20} className="fill-current text-blue-600 text-white" />
                ) : someSelected ? (
                  <div className="w-5 h-5 flex items-center justify-center border-2 border-blue-500 rounded bg-blue-50">
                    <div className="w-2.5 h-0.5 bg-blue-500 rounded"></div>
                  </div>
                ) : (
                  <Square size={20} />
                )}
              </button>
              
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform duration-300 ${
                  expandedCategories.has(category) ? 'rotate-180' : ''
                }`}
              />
              
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm text-slate-800 tracking-tight flex items-center gap-2">
                  {getCategoryLabel(category)}
                  {allSelected && (
                    <span className="bg-blue-50 text-blue-600 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-blue-100">
                      Full Access
                    </span>
                  )}
                </span>
              </div>
              
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                selectedCount === 0 
                  ? 'bg-slate-100 text-slate-400' 
                  : selectedCount === categoryPerms.length 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'bg-amber-50 text-amber-600'
              }`}>
                {selectedCount} / {categoryPerms.length}
              </span>
            </div>

            {/* Category Permissions List */}
            {expandedCategories.has(category) && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/30 border-t border-slate-150 animate-in fade-in duration-200">
                {categoryPerms.map(permission => {
                  const isChecked = selectedPermissions.includes(permission);
                  return (
                    <label
                      key={permission}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer select-none transition-all duration-200 ${
                        isChecked
                          ? 'bg-blue-50/40 border-blue-200 text-blue-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermission(permission)}
                        className="w-4.5 h-4.5 text-blue-600 rounded-md cursor-pointer border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold leading-none">
                        {getPermissionLabel(permission)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary Footer */}
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl text-white flex items-center justify-between shadow-md shadow-blue-500/10 shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-blue-100" />
          <p className="text-xs font-semibold tracking-wide uppercase">
            Total Selected Permissions
          </p>
        </div>
        <span className="bg-white text-white font-extrabold text-sm px-3.5 py-1 rounded-lg border border-white/20">
          {selectedPermissions.length}
        </span>
      </div>
    </div>
  );
}
