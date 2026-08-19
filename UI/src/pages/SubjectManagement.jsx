import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import subjectService from '../services/subjectService';
import departmentService from '../services/departmentService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import AddSubjectModal from '../components/AddSubjectModal';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit2, 
  XCircle, 
  CheckCircle2, 
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import message from '../services/messageService';

export default function SubjectManagement() {
  const [searchParams] = useSearchParams();
  const departmentId = searchParams.get('departmentId');
  const universityId = searchParams.get('universityId');
  const { userType, universityId: userUniversityId } = useAuth();
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityId;

  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    subName: '',
    subCode: '',
    status: true
  });

  

  // Define fetch function for paginated subjects
  const fetchFn = useCallback((params) => {
    const selectedDeptId = params.departmentId || departmentId;
    if (selectedDeptId) {
      return subjectService.getSubjectsByDepartment(selectedDeptId, params);
    }
    if (activeUniversityId) {
      return subjectService.getSubjectByUniversity(activeUniversityId, params);
    }
    return subjectService.getAllSubjects(params);
  }, [departmentId, activeUniversityId]);

  // Centralized hook for table states
  const {
    items: subjects,
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
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10 }
  });

  useEffect(() => {
    if (error) {
      message.error(error);
      setError('');
    }
  }, [error, setError]);

  const handleSort = (field) => {
    if (filters.sortField === field) {
      if (filters.sortOrder === 'asc') {
        setFilter('sortOrder', 'desc');
      } else if (filters.sortOrder === 'desc') {
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
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />;
  };

  // Load static departments for dropdown selects (pageSize: 0 retrieves all)
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = activeUniversityId
          ? await departmentService.getDepartmentsByUniversity(activeUniversityId, { pageSize: 0 })
          : await departmentService.getAllDepartments({ pageSize: 0 });
        setDepartments(data?.items || data || []);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepartments();
  }, [activeUniversityId]);

  const fetchSubjectDepartments = async (subjectId) => {
    try {
      const data = await subjectService.getSubjectDepartments(subjectId, activeUniversityId);
      return data;
    } catch (err) {
      console.error('Failed to fetch subject departments:', err);
      return [];
    }
  };

  const handleEdit = async (subject) => {
    const depts = await fetchSubjectDepartments(subject.subjectId);

    // If the subject has departments, ensure we sync the selected departments list
    const subjectUniId = depts[0]?.universityId;
    if (subjectUniId) {
      try {
        const uniDepts = await departmentService.getDepartmentsByUniversity(subjectUniId, { pageSize: 0 });
        setDepartments(uniDepts?.items || uniDepts || []);
      } catch (err) {
        console.error('Failed to fetch university departments on edit:', err);
      }
    }

    setFormData({
      subName: subject.subName,
      subCode: subject.subCode || '',
      status: subject.status,
      departmentId: depts[0]?.departmentId || ''
    });
    setEditingId(subject.subjectId);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ subName: '', subCode: '', status: true });
    setEditingId(null);
    setShowForm(false);
    
  };

  const handleSuccess = (msg) => {
    message.success(msg);
    refresh();
    
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none">
      <div className="w-full space-y-3">

        {/* Unified Dashboard Header & Filters Panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>Subjects Management</span>
              </h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow self-start sm:self-center shrink-0"
            >
              <Plus size={14} />
              <span>{showForm ? 'Cancel' : 'Add Subject'}</span>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100">
            {/* Search bar */}
            <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-150">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search subjects by name or subject code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-[11px] focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-655 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Department Filter (Only if departmentId is not forced by URL query) */}
              {!departmentId && (
                <select
                  value={filters.departmentId || ''}
                  onChange={(e) => setFilter('departmentId', e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl font-bold text-[10px] text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.departmentId} value={dept.departmentId}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Status Filter */}
              <select
                value={filters.isActive === undefined ? '' : filters.isActive}
                onChange={(e) => setFilter('isActive', e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl font-bold text-[10px] text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>

              {(filters.departmentId || filters.isActive) && (
                <button
                  onClick={() => {
                    setFilter('departmentId', '');
                    setFilter('isActive', '');
                  }}
                  className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-700 transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        
        

        {/* Form Modal */}
        <AddSubjectModal
          isOpen={showForm}
          onClose={handleCancel}
          onSuccess={handleSuccess}
          editingId={editingId}
          initialData={formData}
          activeUniversityId={activeUniversityId}
          departments={departments}
        />

        {/* Subjects List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading && subjects.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span>Fetching subjects...</span>
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-16 text-center text-slate-500 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <BookOpen size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">No Subjects Found</h3>
                <p className="text-xs text-slate-400">There are no syllabus subjects configured. Add your first subject to populate the curriculum database.</p>
              </div>
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                >
                  Create First Subject
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest select-none">
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('subName')}
                    >
                      <div className="flex items-center gap-1.5">
                        Subject Info {getSortIcon('subName')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('subCode')}
                    >
                      <div className="flex items-center gap-1.5">
                        Subject Code {getSortIcon('subCode')}
                      </div>
                    </th>
                    <th className="px-6 py-4">Departments</th>
                    <th className="px-6 py-4">Courses</th>
                    <th 
                      className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        Status {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {subjects.map((subject) => (
                    <tr key={subject.subjectId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 font-extrabold shadow-sm">
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 tracking-tight block">{subject.subName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-bold text-[10px] tracking-wide">
                          {subject.subCode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        {subject.departmentSubjects && subject.departmentSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subject.departmentSubjects.map((ds) => ds.department?.name).filter(Boolean).map((name, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-750 rounded-md font-bold text-[9px] uppercase tracking-wider"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium text-[10px]">No departments assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        {subject.courseSubjects && subject.courseSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subject.courseSubjects.map((cs) => cs.course?.name).filter(Boolean).map((name, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 bg-amber-55 border border-amber-100 text-amber-700 rounded-md font-bold text-[9px] uppercase tracking-wider animate-fade-in"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium text-[10px]">No courses mapped</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                          subject.status 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${subject.status ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {subject.status ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(subject)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
                            title="Edit Subject"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Standard Centralized Table Pagination */}
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
