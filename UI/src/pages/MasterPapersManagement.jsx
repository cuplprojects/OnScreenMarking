import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import paperService from '../services/paperService';
import subjectService from '../services/subjectService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import {
  FileText,
  Plus,
  Search,
  Edit2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Check
} from 'lucide-react';
import message from '../services/messageService';
import { useBreadcrumb } from '../context/BreadcrumbContext';

// Modal for adding a master paper
function MasterPaperModal({ isOpen, onClose, onSubmit, initialData = null, subjects = [] }) {
  const [formData, setFormData] = useState({
    paperCode: '',
    paperName: '',
    paperNumber: 1,
    maxMarks: 100,
    totalQuestions: 10,
    subjectIds: [],
    isActive: true
  });

  const [subjectSearch, setSubjectSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        paperCode: '',
        paperName: '',
        paperNumber: 1,
        maxMarks: 100,
        totalQuestions: 10,
        subjectIds: [],
        isActive: true
      });
    }
    setSubjectSearch('');
    setIsDropdownOpen(false);
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.subjectIds.length === 0) {
      message.error("Please select at least one subject");
      return;
    }
    onSubmit(formData);
  };

  const toggleSubject = (subId) => {
    setFormData(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subId)
        ? prev.subjectIds.filter(id => id !== subId)
        : [...prev.subjectIds, subId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600" size={18} />
            {initialData ? 'Edit Academic Paper' : 'Create Academic Paper'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="master-paper-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Paper Code *</label>
                <input
                  type="text"
                  required
                  value={formData.paperCode}
                  onChange={e => setFormData({ ...formData, paperCode: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="e.g. MATH-101"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Paper Name *</label>
                <input
                  type="text"
                  required
                  value={formData.paperName}
                  onChange={e => setFormData({ ...formData, paperName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="e.g. Calculus I"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Paper No.</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.paperNumber}
                  onChange={e => setFormData({ ...formData, paperNumber: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Max Marks</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.maxMarks}
                  onChange={e => setFormData({ ...formData, maxMarks: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Total Qs</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.totalQuestions}
                  onChange={e => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Associated Subjects *</label>
              <div
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold flex flex-wrap gap-1 p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all min-h-[42px] cursor-text"
                onClick={() => setIsDropdownOpen(true)}
              >
                {formData.subjectIds.map(subId => {
                  const sub = subjects.find(s => s.subjectId === subId);
                  if (!sub) return null;
                  return (
                    <span key={subId} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs flex items-center gap-1 font-bold">
                      {sub.subCode}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleSubject(subId); }}
                        className="hover:text-blue-900 transition-colors ml-0.5 bg-blue-200/50 rounded-full p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })}
                <input
                  type="text"
                  value={subjectSearch}
                  onChange={e => { setSubjectSearch(e.target.value); setIsDropdownOpen(true); }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  className="flex-1 min-w-[100px] bg-transparent outline-none px-1 text-sm text-slate-700"
                  placeholder={formData.subjectIds.length === 0 ? "Search subjects..." : ""}
                />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto top-full custom-scrollbar py-1">
                  {subjects
                    .filter(s => s.subName.toLowerCase().includes(subjectSearch.toLowerCase()) || s.subCode.toLowerCase().includes(subjectSearch.toLowerCase()))
                    .map(sub => (
                      <div
                        key={sub.subjectId}
                        onClick={() => toggleSubject(sub.subjectId)}
                        className={`px-4 py-2.5 cursor-pointer text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between ${formData.subjectIds.includes(sub.subjectId) ? 'bg-blue-50/50 text-blue-700' : 'text-slate-700'}`}
                      >
                        <span>{sub.subCode} - {sub.subName}</span>
                        {formData.subjectIds.includes(sub.subjectId) && <Check size={14} className="text-blue-600" />}
                      </div>
                    ))}
                  {subjects.filter(s => s.subName.toLowerCase().includes(subjectSearch.toLowerCase()) || s.subCode.toLowerCase().includes(subjectSearch.toLowerCase())).length === 0 && (
                    <div className="px-4 py-3 text-xs text-slate-500 font-medium text-center">No subjects found</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Active Status</label>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="master-paper-form"
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Check size={14} /> {initialData ? 'Update Paper' : 'Create Paper'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MasterPapersManagement() {
  const [searchParams] = useSearchParams();
  const { userType, universityId: userUniversityId } = useAuth();
  const universityIdFromUrl = searchParams.get('universityId');
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityIdFromUrl;
  const { setBreadcrumb } = useBreadcrumb();
  const ColumnFilter = React.lazy(() => import('../components/ColumnFilter'));

  useEffect(() => {
    const routePath = userType === 'admin' ? '/admin/master-papers' : '/master-papers';
    setBreadcrumb([
      { label: 'Academic Papers', path: routePath, icon: 'FileText' }
    ]);
  }, [userType, setBreadcrumb]);

  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await subjectService.getSubjectByUniversity(activeUniversityId, { pageSize: 0 });
        setSubjects(res.items || res || []);
      } catch (err) {
        console.error(err);
      }
    };
    if (activeUniversityId) fetchSubjects();
  }, [activeUniversityId]);

  const fetchFn = useCallback((params) => {
    // Inject isMaster=true flag
    return paperService.getPapers({ ...params, universityId: activeUniversityId, isMaster: true });
  }, [activeUniversityId]);

  const {
    items: papers,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loading,
    error,
    setError,
    filters,
    setFilter,
    refresh
  } = useTable({ fetchFn, initialParams: { pageSize: 10 } });

  useEffect(() => {
    if (error) {
      message.error(error);
      setError('');
    }
  }, [error, setError]);

  const handleSort = (field) => {
    if (filters.sortField === field) {
      if (filters.sortOrder === 'asc') setFilter('sortOrder', 'desc');
      else if (filters.sortOrder === 'desc') {
        setFilter('sortField', '');
        setFilter('sortOrder', '');
      }
    } else {
      setFilter('sortField', field);
      setFilter('sortOrder', 'asc');
    }
  };

  const getSortIcon = (field) => {
    if (filters.sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />;
  };

  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const handleEdit = (paper) => {
    setEditingData({
      paperId: paper.paperId,
      paperCode: paper.paperCode,
      paperName: paper.paperName,
      paperNumber: paper.paperNumber,
      maxMarks: paper.maxMarks,
      totalQuestions: paper.totalQuestions,
      subjectIds: paper.subjectIds || [],
      isActive: paper.isActive
    });
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    try {
      if (editingData) {
        await paperService.updatePaper(editingData.paperId, data);
        message.success("Paper updated successfully!");
      } else {
        await paperService.createPaper({
          ...data,
          universityId: parseInt(activeUniversityId, 10),
          projectId: null // Ensure it's an academic paper
        });
        message.success("Academic paper created successfully!");
      }
      refresh();
      setShowForm(false);
      setEditingData(null);
    } catch (err) {
      message.error(err.message || 'Error saving paper');
    }
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none">
      <div className="w-full space-y-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>Academic Papers</span>
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-1">Manage global academic papers available for project import.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="flex-1 sm:w-64 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-150 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search papers by code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-[11px] focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setEditingData(null);
                  setShowForm(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer shrink-0 h-[34px]"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Add Academic Paper</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>

        <MasterPaperModal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditingData(null); }}
          onSubmit={handleSubmit}
          initialData={editingData}
          subjects={subjects}
        />

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading && papers.length === 0 ? (
            <div className="p-12 text-center text-slate-450 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-650"></div>
              <span>Loading papers...</span>
            </div>
          ) : papers.length === 0 ? (
            <div className="p-16 text-center text-slate-555 leading-relaxed max-w-sm mx-auto space-y-3">
              <FileText className="mx-auto text-slate-400" size={32} />
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">No Academic Papers</h3>
                <p className="text-[10px] text-slate-400 mt-1">Create academic papers to be imported into evaluation projects.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest select-none">
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('paperCode')}
                    >
                      <div className="flex items-center gap-1.5">Paper Code {getSortIcon('paperCode')}
                        <React.Suspense fallback={null}><ColumnFilter columnKey="paperCode" currentFilter={filters.paperCode} setFilter={setFilter} placeholder="Filter code..." /></React.Suspense>
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('paperName')}
                    >
                      <div className="flex items-center gap-1.5">Paper Name {getSortIcon('paperName')}
                        <React.Suspense fallback={null}><ColumnFilter columnKey="paperName" currentFilter={filters.paperName} setFilter={setFilter} placeholder="Filter name..." /></React.Suspense>
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('paperNumber')}
                    >
                      <div className="flex items-center gap-1.5">Paper Number {getSortIcon('paperNumber')}</div>
                    </th>
                    <th className="px-6 py-4">Linked Subjects</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {papers.map(paper => (
                    <tr key={paper.paperId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <span className="font-extrabold text-slate-900">{paper.paperCode}</span>
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-700">{paper.paperName}</td>
                      <td className="px-6 py-5 text-slate-500 font-medium">
                        {paper.paperNumber}
                      </td>
                      <td className="px-6 py-5 text-slate-500 font-medium">
                        {paper.subjectNames?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {paper.subjectNames.map((name, i) => (
                              <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${paper.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${paper.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                          {paper.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleEdit(paper)}
                          className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl border border-slate-200 hover:border-blue-200 transition-all cursor-pointer shadow-sm group"
                          title="Edit Paper"
                        >
                          <Edit2 size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
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
