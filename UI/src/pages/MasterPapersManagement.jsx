import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfigHeader } from '../context/ConfigHeaderContext';
import paperService from '../services/paperService';
import subjectService from '../services/subjectService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import {
  FileText,
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-100 shadow-2xl flex flex-col animate-scale-up">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">
              {initialData ? 'Edit Academic Paper' : 'Add New Academic Paper'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 rounded-md transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form id="master-paper-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Paper Code *</label>
              <input
                type="text"
                required
                value={formData.paperCode}
                onChange={e => setFormData({ ...formData, paperCode: e.target.value })}
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
                placeholder="e.g. MATH-101"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Paper Name *</label>
              <input
                type="text"
                required
                value={formData.paperName}
                onChange={e => setFormData({ ...formData, paperName: e.target.value })}
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
                placeholder="e.g. Calculus I"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Paper No.</label>
              <input
                type="number"
                min="1"
                required
                value={formData.paperNumber}
                onChange={e => setFormData({ ...formData, paperNumber: parseInt(e.target.value) })}
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Max Marks</label>
              <input
                type="number"
                min="1"
                required
                value={formData.maxMarks}
                onChange={e => setFormData({ ...formData, maxMarks: parseInt(e.target.value) })}
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Total Qs</label>
              <input
                type="number"
                min="1"
                required
                value={formData.totalQuestions}
                onChange={e => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })}
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Associated Subjects *</label>
            <div
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium flex flex-wrap gap-1 p-1.5 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-600 transition min-h-[42px] cursor-text"
              onClick={() => setIsDropdownOpen(true)}
            >
              {formData.subjectIds.map(subId => {
                const sub = subjects.find(s => s.subjectId === subId);
                if (!sub) return null;
                return (
                  <span key={subId} className="bg-teal-100 text-teal-700 px-2 py-1 rounded-md text-xs flex items-center gap-1 font-bold">
                    {sub.subCode}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSubject(subId); }}
                      className="hover:text-teal-900 transition ml-0.5 bg-teal-200/50 rounded-full p-0.5 cursor-pointer"
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
                className="flex-1 min-w-[100px] bg-transparent outline-none px-1 text-xs text-gray-900"
                placeholder={formData.subjectIds.length === 0 ? "Search subjects..." : ""}
              />
            </div>

            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto top-full custom-scrollbar py-1">
                {subjects
                  .filter(s => s.subName.toLowerCase().includes(subjectSearch.toLowerCase()) || s.subCode.toLowerCase().includes(subjectSearch.toLowerCase()))
                  .map(sub => (
                    <div
                      key={sub.subjectId}
                      onClick={() => toggleSubject(sub.subjectId)}
                      className={`px-4 py-2.5 cursor-pointer text-xs font-semibold hover:bg-gray-50 transition flex items-center justify-between ${formData.subjectIds.includes(sub.subjectId) ? 'bg-teal-50/50 text-teal-700' : 'text-gray-700'}`}
                    >
                      <span>{sub.subCode} - {sub.subName}</span>
                      {formData.subjectIds.includes(sub.subjectId) && <Check size={14} className="text-teal-700" />}
                    </div>
                  ))}
                {subjects.filter(s => s.subName.toLowerCase().includes(subjectSearch.toLowerCase()) || s.subCode.toLowerCase().includes(subjectSearch.toLowerCase())).length === 0 && (
                  <div className="px-4 py-3 text-xs text-gray-500 font-medium text-center">No subjects found</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Status *</label>
            <div className="flex items-center gap-6 text-xs text-gray-700 bg-gray-50/50 border border-gray-200 px-4 py-2 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={formData.isActive === true}
                  onChange={() => setFormData({ ...formData, isActive: true })}
                  className="w-3.5 h-3.5 text-teal-700 focus:ring-teal-500 accent-teal-600"
                />
                <span className="font-semibold">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={formData.isActive === false}
                  onChange={() => setFormData({ ...formData, isActive: false })}
                  className="w-3.5 h-3.5 text-teal-700 focus:ring-teal-500 accent-teal-600"
                />
                <span className="font-semibold">Inactive</span>
              </label>
            </div>
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-md font-bold text-xs cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="master-paper-form"
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-xs cursor-pointer shadow transition"
          >
            {initialData ? 'Update Paper' : 'Create Paper'}
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
  const { setConfigHeader } = useConfigHeader();
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
    if (filters.sortField !== field) return <ArrowUpDown size={12} className="text-gray-300" />;
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />;
  };

  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState(null);

  // Register header extras into the unified UniversityConfigHeader bar
  useEffect(() => {
    setConfigHeader({
      title: 'Academic Papers Management',
      search,
      setSearch,
      searchPlaceholder: 'Search papers by code or name…',
      actionLabel: 'Add Academic Paper',
      onAction: () => setShowForm(true),
    });
    return () => setConfigHeader(null);
  }, [search, setSearch, setConfigHeader]);

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
    <div className="w-full space-y-3">
      {/* Modal for adding/editing master paper */}
      <MasterPaperModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingData(null); }}
        onSubmit={handleSubmit}
        initialData={editingData}
        subjects={subjects}
      />

      {/* Papers List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading && papers.length === 0 ? (
            <div className="p-12 text-center text-gray-450 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <span>Loading papers...</span>
            </div>
          ) : papers.length === 0 ? (
            <div className="p-16 text-center text-gray-555 leading-relaxed max-w-sm mx-auto space-y-3">
              <FileText className="mx-auto text-gray-400" size={32} />
              <div>
                <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">No Academic Papers</h3>
                <p className="text-[10px] text-gray-400 mt-1">Create academic papers to be imported into evaluation projects.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-450 uppercase tracking-widest select-none">
                    <th
                      className="px-6 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('paperCode')}
                    >
                      <div className="flex items-center gap-1.5">Paper Code {getSortIcon('paperCode')}
                        <React.Suspense fallback={null}><ColumnFilter columnKey="paperCode" currentFilter={filters.paperCode} setFilter={setFilter} placeholder="Filter code..." /></React.Suspense>
                      </div>
                    </th>
                    <th
                      className="px-6 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('paperName')}
                    >
                      <div className="flex items-center gap-1.5">Paper Name {getSortIcon('paperName')}
                        <React.Suspense fallback={null}><ColumnFilter columnKey="paperName" currentFilter={filters.paperName} setFilter={setFilter} placeholder="Filter name..." /></React.Suspense>
                      </div>
                    </th>
                    <th
                      className="px-6 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('paperNumber')}
                    >
                      <div className="flex items-center gap-1.5">Paper Number {getSortIcon('paperNumber')}</div>
                    </th>
                    <th className="px-6 py-2.5">Linked Subjects</th>
                    <th className="px-6 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        Status
                        <React.Suspense fallback={null}><ColumnFilter columnKey="isActive" currentFilter={filters.isActive} setFilter={setFilter} options={[{ label: 'Active', value: 'true' }, { label: 'Inactive', value: 'false' }]} /></React.Suspense>
                      </div>
                    </th>
                    <th className="px-6 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {papers.map(paper => (
                    <tr key={paper.paperId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-2.5">
                        <span className="font-extrabold text-gray-900">{paper.paperCode}</span>
                      </td>
                      <td className="px-6 py-2.5 font-bold text-gray-700">{paper.paperName}</td>
                      <td className="px-6 py-2.5 text-gray-500 font-medium">
                        {paper.paperNumber}
                      </td>
                      <td className="px-6 py-2.5 text-gray-500 font-medium">
                        {paper.subjectNames?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {paper.subjectNames.map((name, i) => (
                              <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${paper.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${paper.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                          {paper.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 text-right">
                        <button
                          onClick={() => handleEdit(paper)}
                          className="p-2 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 text-gray-600 rounded-xl border border-gray-200 hover:border-teal-200 transition-all cursor-pointer shadow-sm group"
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
  );
}

