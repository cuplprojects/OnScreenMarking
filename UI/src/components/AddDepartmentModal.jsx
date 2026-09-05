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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40  transition-opacity" 
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-visible rounded-2xl bg-white p-6 shadow-xl border border-slate-100 transition-all">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {editingId ? 'Edit Department' : 'Add New Department'}
            </h3>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-100 font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Department Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. Computer Science"
                required
              />
            </div>

            {/* Courses Selector */}
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Assign Courses ({selectedCourses.length} selected)</label>
              <div
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold flex flex-wrap gap-1 p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all min-h-[42px] cursor-text"
                onClick={() => setIsDropdownOpen(true)}
              >
                {selectedCourses.map(id => {
                  const course = courses.find(c => c.id === id);
                  return course ? (
                    <span key={id} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold border border-blue-200/50 shadow-sm animate-fade-in-up">
                      {course.name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCourse(id);
                        }}
                        className="hover:bg-blue-200 p-0.5 rounded-full transition-colors"
                      >
                        <X size={12} className="text-blue-500" />
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
                    className="w-full bg-transparent border-none focus:outline-none text-slate-700 text-xs font-semibold placeholder:text-slate-400 placeholder:font-medium min-w-[120px]"
                  />
                  <ChevronDown size={14} className={`text-slate-400 mr-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="relative z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-48 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                      {filteredCourses.length === 0 ? (
                        <div className="p-3 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-1">
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
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                                isSelected 
                                  ? 'bg-blue-50/80 text-blue-700 hover:bg-blue-100/80' 
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{course.name}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-slate-300'
                              }`}>
                                {isSelected && <Check size={12} className="text-white" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 select-none">
              <input
                type="checkbox"
                id="deptIsActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="deptIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Activate this department
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-100 mt-5">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-600 hover:shadow-lg text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingId ? 'Update Department' : 'Create Department'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
