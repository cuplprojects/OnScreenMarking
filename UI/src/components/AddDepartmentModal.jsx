import { useState, useEffect } from 'react';
import { X, ChevronDown, Search, Check } from 'lucide-react';
import departmentService from '../services/departmentService';
import courseService from '../services/courseService';

export default function AddDepartmentModal({
  isOpen,
  onClose,
  onSuccess,
  editingId,
  initialData,
  activeUniversityId
}) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [initialCourses, setInitialCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()));

  useEffect(() => {
    const loadModalData = async () => {
      if (!isOpen || !activeUniversityId) return;

      try {
        setLoading(true);
        setError('');

        // 1. Fetch all courses for this university
        const response = await courseService.getAllCourses(null, activeUniversityId);
        setCourses(response?.items || response || []);

        if (editingId) {
          setName(initialData?.name || '');
          setIsActive(initialData?.isActive !== undefined ? initialData.isActive : true);

          // Fetch full department details to get mapped courses
          const dept = await departmentService.getDepartmentById(editingId);
          
          // Find courses belonging to this department
          const mappedCourseIds = dept.courses ? dept.courses.map(c => c.id) : [];
          setSelectedCourses(mappedCourseIds);
          setInitialCourses(mappedCourseIds);
        } else {
          setName('');
          setIsActive(true);
          setSelectedCourses([]);
          setInitialCourses([]);
        }
      } catch (err) {
        console.error('Failed to load department modal options:', err);
        setError('Failed to load courses for selection');
      } finally {
        setLoading(false);
      }
    };

    loadModalData();
  }, [editingId, initialData, isOpen, activeUniversityId]);

  if (!isOpen) return null;

  const toggleCourse = (courseId) => {
    setSelectedCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Department name is required');
      return;
    }
    if (!activeUniversityId) {
      setError('No active university selected');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const payload = {
        name: name.trim(),
        universityId: parseInt(activeUniversityId, 10),
        isActive,
        departmentSubjects: []
      };

      let responseDept;
      if (editingId) {
        responseDept = await departmentService.updateDepartment(editingId, payload);
      } else {
        responseDept = await departmentService.createDepartment(payload);
      }

      const deptId = editingId || responseDept?.departmentId || responseDept?.id;

      if (deptId) {
        // Sync Mapped Courses
        
        // Add new courses mapped to this department
        for (const courseId of selectedCourses) {
          if (!initialCourses.includes(courseId)) {
            await departmentService.addCourseToDepartment(deptId, courseId);
          }
        }
        
        // Delete courses that were unmapped
        for (const courseId of initialCourses) {
          if (!selectedCourses.includes(courseId)) {
            await departmentService.removeCourseFromDepartment(deptId, courseId);
          }
        }
      }

      onSuccess(editingId ? 'Department updated successfully' : 'Department created successfully');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-100 shadow-2xl flex flex-col animate-scale-up">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">
              {editingId ? 'Edit Department' : 'Add New Department'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-500 rounded-md transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form id="dept-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-100 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Department Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Computer Science"
              className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
            />
          </div>

          {/* Courses Selector */}
          <div className="relative">
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Assign Courses ({selectedCourses.length} selected)</label>
            <div
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium flex flex-wrap gap-1 p-1.5 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-600 transition min-h-[42px] cursor-text"
              onClick={() => setIsDropdownOpen(true)}
            >
              {selectedCourses.map(id => {
                const course = courses.find(c => c.id === id);
                return course ? (
                  <span key={id} className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-1 rounded-md text-xs font-bold border border-teal-200/50 shadow-sm animate-fade-in-up">
                    {course.name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCourse(id);
                      }}
                      className="hover:bg-teal-200 p-0.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X size={12} className="text-teal-600" />
                    </button>
                  </span>
                ) : null;
              })}
              <div className="flex-1 min-w-[120px] flex items-center">
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => {
                    setCourseSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={selectedCourses.length === 0 ? "Search and select courses..." : ""}
                  className="w-full bg-transparent border-none focus:outline-none text-gray-900 text-xs font-medium min-w-[120px]"
                />
                <ChevronDown size={14} className={`text-gray-400 mr-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto top-full custom-scrollbar py-1">
                  {filteredCourses.length === 0 ? (
                    <div className="p-3 text-center text-xs font-semibold text-gray-400 flex flex-col items-center gap-1">
                      <Search size={16} className="opacity-50" />
                      No courses found
                    </div>
                  ) : (
                    filteredCourses.map(course => {
                      const isSelected = selectedCourses.includes(course.id);
                      return (
                        <div
                          key={course.id}
                          onClick={() => {
                            toggleCourse(course.id);
                            setCourseSearch('');
                          }}
                          className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-xs font-semibold hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-teal-50/50 text-teal-700' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{course.name}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-teal-700" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Status *</label>
            <div className="flex items-center gap-6 text-xs text-gray-700 bg-gray-50/50 border border-gray-200 px-4 py-2 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={isActive === true}
                  onChange={() => setIsActive(true)}
                  className="w-3.5 h-3.5 text-teal-700 focus:ring-teal-500 accent-teal-600"
                />
                <span className="font-semibold">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={isActive === false}
                  onChange={() => setIsActive(false)}
                  className="w-3.5 h-3.5 text-teal-700 focus:ring-teal-500 accent-teal-600"
                />
                <span className="font-semibold">Inactive</span>
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
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
            form="dept-form"
            disabled={loading}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-xs cursor-pointer shadow transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
