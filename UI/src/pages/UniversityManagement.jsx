import React, { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import universityService from '../services/universityService';
import message from '../services/messageService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';

export default function UniversityManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    universityName: '',
    isActive: true
  });
  const [saving, setSaving] = useState(false);

  // Define fetch function for useTable to load universities with pagination
  const fetchFn = useCallback(async (params) => {
    return await universityService.getAllUniversities(params);
  }, []);

  const {
    items: universities,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loading,
    filters,
    setFilter,
    sortField,
    sortOrder,
    handleSort,
    refresh: refreshUniversities
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10 }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingId) {
        await universityService.updateUniversity(editingId, formData);
        message.success('University updated successfully');
      } else {
        await universityService.createUniversity(formData);
        message.success('University created successfully');
      }
      setFormData({ universityName: '', isActive: true });
      setEditingId(null);
      setShowForm(false);
      refreshUniversities();
    } catch (err) {
      message.error(err.message || 'Error saving university');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (university) => {
    setFormData({
      universityName: university.universityName,
      isActive: university.isActive
    });
    setEditingId(university.universityId);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (university) => {
    if (window.confirm('Are you sure you want to mark this university as inactive?')) {
      try {
        await universityService.updateUniversity(university.universityId, {
          universityName: university.universityName,
          isActive: false
        });
        message.success('University marked as inactive');
        refreshUniversities();
      } catch (err) {
        message.error('Failed to update university status');
        console.error(err);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ universityName: '', isActive: true });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none p-4 lg:p-8">
      <div className="w-full space-y-4">
        
        {/* Header & Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                Universities
              </h1>
              <p className="text-xs text-slate-500 mt-1">Manage all universities in the system</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowForm(!showForm)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow ${
                  showForm 
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Plus size={16} className={showForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
                <span>{showForm ? 'Cancel' : 'Add University'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-100 items-center justify-between">
            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-150 flex-1 w-full max-w-md">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search universities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-xs focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 select-none">
              <select
                value={filters.isActive === undefined ? '' : filters.isActive}
                onChange={(e) => setFilter('isActive', e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl font-bold text-xs text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>

              {filters.isActive !== undefined && filters.isActive !== '' && (
                <button
                  onClick={() => setFilter('isActive', '')}
                  className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-700 transition cursor-pointer ml-2"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit2 size={18} className="text-blue-600" />
              {editingId ? 'Edit University' : 'Add New University'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  University Name *
                </label>
                <input
                  type="text"
                  value={formData.universityName}
                  onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-semibold text-sm transition-all"
                  placeholder="Enter university name"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors uppercase tracking-wider">
                    Active Status
                  </span>
                </label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {saving ? 'Saving...' : editingId ? 'Update University' : 'Create University'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Universities Data Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          {loading && universities.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span>Loading universities...</span>
            </div>
          ) : universities.length === 0 ? (
            <div className="p-16 text-center text-slate-500 font-medium leading-relaxed max-w-sm mx-auto space-y-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">No Records Found</h3>
                <p className="text-[10px] text-slate-400 mt-1">There are no universities matching your filters or search terms.</p>
              </div>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition mt-4"
                >
                  Add First University
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest select-none">
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors group" onClick={() => handleSort('universityName')}>
                      <div className="flex items-center gap-1">
                        University Name 
                        {sortField === 'universityName' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-slate-300"/>}
                      </div>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors group" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-1">
                        Created On 
                        {sortField === 'createdAt' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-slate-300"/>}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('isActive')}>
                      <div className="flex items-center justify-center gap-1">
                        Status 
                        {sortField === 'isActive' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-slate-300"/>}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {universities.map((university) => (
                    <tr key={university.universityId} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        {university.universityName}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                        {new Date(university.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                          university.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${university.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                          {university.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => handleEdit(university)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(university)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                            title="Mark Inactive"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <TablePagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                setPage={setPage}
                setPageSize={setPageSize}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
