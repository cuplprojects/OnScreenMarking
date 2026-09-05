import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import departmentService from '../services/departmentService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import AddDepartmentModal from '../components/AddDepartmentModal';
import AddCourseModal from '../components/AddCourseModal';
import ColumnFilter from '../components/ColumnFilter';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  PlusCircle, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import message from '../services/messageService';

export default function DepartmentManagement() {
  const [searchParams] = useSearchParams();
  const universityId = searchParams.get('universityId');
  const { userType, universityId: userUniversityId } = useAuth();

  // For coordinators, use their university ID; for admins, use URL param
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityId;

  // Define fetch function for useTable hook
  const fetchFn = useCallback((params) => {
    if (activeUniversityId) {
      return departmentService.getDepartmentsByUniversity(activeUniversityId, params);
    }
    return departmentService.getAllDepartments(params);
  }, [activeUniversityId]);

  // Centralized hook for table states
  const {
    items: departments,
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
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />;
  };

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    universityId: activeUniversityId,
    isActive: true
  });

  
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);

  const handleEdit = (department) => {
    setFormData({
      name: department.name,
      universityId: department.universityId,
      isActive: department.isActive
    });
    setEditingId(department.departmentId);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', universityId: activeUniversityId || '', isActive: true });
    setEditingId(null);
    setShowForm(false);
    
  };

  const handleSuccess = (msg) => {
    message.success(msg);
    refresh();
    
  };

  const handleAddCourse = (department) => {
    setSelectedDepartmentId(department.departmentId);
    setShowCourseModal(true);
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none">
      <div className="w-full space-y-3">

        {/* Unified Dashboard Header & Filters Panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>Departments Management</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
              {/* Search bar */}
              <div className="flex-1 sm:w-64 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-150 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search departments..."
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
                onClick={() => setShowForm(!showForm)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow shrink-0 h-[34px]"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">{showForm ? 'Cancel' : 'Add Department'}</span>
                <span className="sm:hidden">{showForm ? 'Cancel' : 'Add'}</span>
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100">

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filters.isActive === undefined ? '' : filters.isActive}
                onChange={(e) => setFilter('isActive', e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl font-bold text-[10px] text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>

              {filters.isActive !== undefined && filters.isActive !== '' && (
                <button
                  onClick={() => setFilter('isActive', '')}
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
        <AddDepartmentModal
          isOpen={showForm}
          onClose={handleCancel}
          onSuccess={handleSuccess}
          editingId={editingId}
          initialData={formData}
          activeUniversityId={activeUniversityId}
        />

        {/* Departments List Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading && departments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span>Fetching departments...</span>
            </div>
          ) : departments.length === 0 ? (
            <div className="p-16 text-center text-slate-500 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <Building2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">No Departments Found</h3>
                <p className="text-xs text-slate-400">There are no departments matching your criteria. Add one to get started.</p>
              </div>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                >
                  Clear Filters
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
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        Department Info {getSortIcon('name')}
                        <ColumnFilter columnKey="name" currentFilter={filters.name} setFilter={setFilter} placeholder="Filter department..." />
                      </div>
                    </th>
                    <th className="px-6 py-4">Courses</th>
                    <th 
                      className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('isActive')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        Status {getSortIcon('isActive')}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {departments.map((department) => (
                    <tr key={department.departmentId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 font-extrabold shadow-sm">
                            <Building2 size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 tracking-tight block">{department.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        {department.courses && department.courses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {department.courses.map((course) => (
                              <span 
                                key={course.id}
                                className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-650 rounded-md font-bold text-[9px] uppercase tracking-wider"
                              >
                                {course.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium text-[10px]">No courses assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                          department.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${department.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {department.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAddCourse(department)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-blue-150 transition cursor-pointer text-blue-700"
                            title="Add Course"
                          >
                            <PlusCircle size={12} />
                            <span>Add Course</span>
                          </button>
                          <button
                            onClick={() => handleEdit(department)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
                            title="Edit Department"
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

        {/* Modal for adding/linking courses */}
        <AddCourseModal
          isOpen={showCourseModal}
          onClose={() => setShowCourseModal(false)}
          onSuccess={handleSuccess}
          activeUniversityId={activeUniversityId}
          departments={departments}
          initialData={{ departmentId: selectedDepartmentId }}
        />
      </div>
    </div>
  );
}
