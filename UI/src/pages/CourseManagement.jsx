import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import courseService from '../services/courseService';
import departmentService from '../services/departmentService';
import subjectService from '../services/subjectService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import AddCourseModal from '../components/AddCourseModal';
import AddSubjectModal from '../components/AddSubjectModal';
import ColumnFilter from '../components/ColumnFilter';
import { 
  GraduationCap, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Trash2, 
  Plus, 
  BookOpen, 
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import message from '../services/messageService';

export default function CourseManagement() {
  const [searchParams] = useSearchParams();
  const universityId = searchParams.get('universityId');
  const { userType, universityId: userUniversityId } = useAuth();
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityId;

  const [departments, setDepartments] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  

  // Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'UG',
    departmentId: '',
    isActive: true
  });

  // Subject Mapping State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  
  // Add Subject Modal State
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // Define fetch function for paginated courses
  const fetchFn = useCallback((params) => {
    return courseService.getAllCourses(params.departmentId || null, activeUniversityId, params);
  }, [activeUniversityId]);

  // Centralized hook for table states
  const {
    items: courses,
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

  // Load static departments and subjects for selects with pageSize: 0 (return all)
  useEffect(() => {
    if (activeUniversityId) {
      const loadStaticData = async () => {
        try {
          const depts = await departmentService.getDepartmentsByUniversity(activeUniversityId, { pageSize: 0 });
          setDepartments(depts?.items || depts || []);

          const subjects = await subjectService.getSubjectByUniversity(activeUniversityId, { pageSize: 0 });
          setAllSubjects(subjects?.items || subjects || []);
        } catch (err) {
          console.error('Failed to load static selections:', err);
        }
      };
      loadStaticData();
    }
  }, [activeUniversityId]);

  const handleEdit = (course) => {
    setFormData({
      name: course.name,
      type: course.type || 'UG',
      departmentId: course.departmentId,
      isActive: course.isActive
    });
    setEditingId(course.id);
    setShowFormModal(true);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'UG',
      departmentId: departments[0]?.departmentId || '',
      isActive: true
    });
    setShowFormModal(true);
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? All associated data will be removed.')) {
      return;
    }

    try {
      
      await courseService.deleteCourse(courseId);
      message.success('Course deleted successfully!');
      refresh();
      
    } catch (err) {
      console.error(err);
      setError('Failed to delete course.');
    }
  };

  const handleOpenAddSubject = (course) => {
    setSelectedDepartmentId(course.departmentId);
    setSelectedCourseId(course.id);
    setShowAddSubjectModal(true);
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none">
      <div className="w-full space-y-3">

        {/* Unified Dashboard Header & Filters Panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>Courses Management</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
              {/* Search bar */}
              <div className="flex-1 sm:w-64 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-150 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search courses by name..."
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

              <button
                onClick={handleOpenAddModal}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow shrink-0 h-[34px]"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Add New Course</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100">

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Department Filter */}
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

              {/* Level Filter */}
              <select
                value={filters.type || ''}
                onChange={(e) => setFilter('type', e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl font-bold text-[10px] text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Levels</option>
                <option value="UG">UG</option>
                <option value="PG">PG</option>
                <option value="Diploma">Diploma</option>
              </select>

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

              {(filters.departmentId || filters.type || filters.isActive) && (
                <button
                  onClick={() => {
                    setFilter('departmentId', '');
                    setFilter('type', '');
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

        {/* Main List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading && courses.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span>Fetching courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-16 text-center text-slate-500 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <GraduationCap size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">No Courses Configured</h3>
                <p className="text-xs text-slate-400">Establish degrees or branches of study to associate with subjects.</p>
              </div>
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                >
                  Create Your First Course
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
                        Course Info {getSortIcon('name')}
                        <ColumnFilter columnKey="name" currentFilter={filters.name} setFilter={setFilter} placeholder="Filter course info..." />
                      </div>
                    </th>
                    <th className="px-6 py-4">Department</th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1.5">
                        Level {getSortIcon('type')}
                        <ColumnFilter columnKey="type" currentFilter={filters.type} setFilter={setFilter} placeholder="Filter level..." />
                      </div>
                    </th>
                    <th className="px-6 py-4">Subjects Mapping</th>
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
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 font-extrabold shadow-sm">
                            <GraduationCap size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 tracking-tight block">{course.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-[10px] uppercase tracking-wide">
                          {course.department?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1.5 rounded-lg font-extrabold text-[10px] uppercase ${
                          course.type === 'PG' 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                            : course.type === 'Diploma' 
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {course.type || 'UG'}
                        </span>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        {course.courseSubjects && course.courseSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {course.courseSubjects.map((cs, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-md font-bold text-[9px] uppercase tracking-wider"
                              >
                                {cs.subject?.subCode || cs.subject?.subName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium text-[10px]">No subjects mapped</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                          course.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${course.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAddSubject(course)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-blue-150 transition cursor-pointer text-blue-700"
                            title="Add Subject to Course"
                          >
                            <BookOpen size={12} />
                            <span>Add Subject</span>
                          </button>
                          <button
                            onClick={() => handleEdit(course)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
                            title="Edit Course"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition cursor-pointer"
                            title="Delete Course"
                          >
                            <Trash2 size={13} />
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

      {/* Course Modal Form */}
      <AddCourseModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={(msg) => {
          message.success(msg);
          refresh();
          
        }}
        editingId={editingId}
        initialData={formData}
        activeUniversityId={activeUniversityId}
        departments={departments}
      />

      {/* Add Subject Modal */}
      <AddSubjectModal
        isOpen={showAddSubjectModal}
        onClose={() => setShowAddSubjectModal(false)}
        onSuccess={(msg) => {
          message.success(msg);
          refresh();
          
        }}
        activeUniversityId={activeUniversityId}
        departments={departments}
        initialData={{ departmentId: selectedDepartmentId, courseId: selectedCourseId }}
      />
    </div>
  );
}
