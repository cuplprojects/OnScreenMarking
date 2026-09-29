import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfigHeader } from '../context/ConfigHeaderContext';
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
    if (filters.sortField !== field) return <ArrowUpDown size={12} className="text-gray-300" />;
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />;
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

  // Register into the unified header bar
  const { setConfigHeader } = useConfigHeader();
  useEffect(() => {
    setConfigHeader({
      title: 'Courses Management',
      search,
      setSearch,
      searchPlaceholder: 'Search courses…',
      actionLabel: 'Add New Course',
      onAction: handleOpenAddModal,
    });
    return () => setConfigHeader(null);
  }, [search, setSearch, setConfigHeader]);

  return (
    <div className="w-full space-y-3">


        {/* Main List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading && courses.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <span>Fetching courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-16 text-center text-gray-500 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 mx-auto">
                <GraduationCap size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">No Courses Configured</h3>
                <p className="text-xs text-gray-400">Establish degrees or branches of study to associate with subjects.</p>
              </div>
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition cursor-pointer"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition cursor-pointer"
                >
                  Create Your First Course
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-450 uppercase tracking-widest select-none">
                    <th 
                      className="px-6 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        Course Info {getSortIcon('name')}
                        <ColumnFilter columnKey="name" currentFilter={filters.name} setFilter={setFilter} placeholder="Filter course info..." />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('departmentId')}
                    >
                      <div className="flex items-center gap-1.5">
                        Department {getSortIcon('departmentId')}
                        <ColumnFilter 
                          columnKey="departmentId" 
                          currentFilter={filters.departmentId} 
                          setFilter={setFilter}
                          options={departments.map(dept => ({ label: dept.name, value: dept.departmentId }))}
                        />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1.5">
                        Level {getSortIcon('type')}
                        <ColumnFilter 
                          columnKey="type" 
                          currentFilter={filters.type} 
                          setFilter={setFilter}
                          options={[
                            { label: 'UG', value: 'UG' },
                            { label: 'PG', value: 'PG' },
                            { label: 'Diploma', value: 'Diploma' }
                          ]}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-2.5">Subjects Mapping</th>
                    <th 
                      className="px-6 py-2.5 text-center cursor-pointer hover:bg-gray-100 transition-colors group"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        Status {getSortIcon('status')}
                        <ColumnFilter 
                          columnKey="isActive" 
                          currentFilter={filters.isActive} 
                          setFilter={setFilter}
                          options={[
                            { label: 'Active', value: 'true' },
                            { label: 'Inactive', value: 'false' }
                          ]}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600 font-extrabold shadow-sm">
                            <GraduationCap size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 tracking-tight block">{course.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-2.5">
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md font-bold text-[10px] uppercase tracking-wide">
                          {course.department?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-2.5">
                        <span className={`px-2 py-1.5 rounded-lg font-extrabold text-[10px] uppercase ${
                          course.type === 'PG' 
                            ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                            : course.type === 'Diploma' 
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-teal-50 text-teal-700 border border-teal-100'
                        }`}>
                          {course.type || 'UG'}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 max-w-xs">
                        {course.courseSubjects && course.courseSubjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {course.courseSubjects.map((cs, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-teal-50 border border-teal-100 text-teal-700 rounded-md font-bold text-[9px] uppercase tracking-wider"
                              >
                                {cs.subject?.subCode || cs.subject?.subName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium text-[10px]">No subjects mapped</span>
                        )}
                      </td>
                      <td className="px-6 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                          course.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${course.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {course.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAddSubject(course)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 hover:text-teal-800 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-teal-100 transition cursor-pointer text-teal-700"
                            title="Add Subject to Course"
                          >
                            <BookOpen size={12} />
                            <span>Add Subject</span>
                          </button>
                          <button
                            onClick={() => handleEdit(course)}
                            className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition cursor-pointer"
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

