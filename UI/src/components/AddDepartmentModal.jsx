import { useState, useEffect, useRef } from 'react';
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
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">
                Assign Courses ({selectedCourses.length} selected)
              </label>
              {selectedCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCourses([])}
                  className="text-[10px] font-bold text-teal-700 hover:text-teal-800 uppercase hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            <div
              className={`w-full bg-gray-50/50 border rounded-xl text-xs font-medium flex flex-wrap gap-1.5 p-2 transition min-h-[44px] cursor-text ${
                isDropdownOpen 
                  ? 'border-teal-500 ring-2 ring-teal-500/20 bg-white' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setIsDropdownOpen(true)}
            >
              {selectedCourses.map(id => {
                const course = courses.find(c => c.id === id);
                return course ? (
                  <span key={id} className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-teal-200/80 shadow-2xs animate-fade-in">
                    <span>{course.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCourse(id);
                      }}
                      className="hover:bg-teal-200/60 p-0.5 rounded-full transition-colors cursor-pointer text-teal-600 hover:text-teal-800"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ) : null;
              })}
              <div className="flex-1 min-w-[140px] flex items-center justify-between gap-1">
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => {
                    setCourseSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={selectedCourses.length === 0 ? "Search and select courses..." : "Type to filter courses..."}
                  className="w-full bg-transparent border-none focus:outline-none text-gray-900 text-xs font-medium placeholder:text-gray-400 py-1"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(prev => !prev);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-0.5 transition-colors cursor-pointer shrink-0"
                >
                  <ChevronDown size={15} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-teal-600' : ''}`} />
                </button>
              </div>
            </div>

            {isDropdownOpen && (
              <div className="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden transition-all animate-fade-in-up">
                {/* Quick action bar */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <span>{filteredCourses.length} Available Course{filteredCourses.length !== 1 ? 's' : ''}</span>
                  {filteredCourses.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const allFilteredIds = filteredCourses.map(c => c.id);
                        const allSelected = allFilteredIds.every(id => selectedCourses.includes(id));
                        if (allSelected) {
                          setSelectedCourses(prev => prev.filter(id => !allFilteredIds.includes(id)));
                        } else {
                          setSelectedCourses(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                        }
                      }}
                      className="text-teal-700 hover:text-teal-800 text-[10px] font-black uppercase hover:underline cursor-pointer"
                    >
                      {filteredCourses.every(c => selectedCourses.includes(c.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Scrollable checklist */}
                <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-gray-100/80">
                  {filteredCourses.length === 0 ? (
                    <div className="p-4 text-center text-xs font-semibold text-gray-400 flex flex-col items-center gap-1.5">
                      <Search size={16} className="opacity-50" />
                      <span>No courses found matching "{courseSearch}"</span>
                    </div>
                  ) : (
                    filteredCourses.map(course => {
                      const isSelected = selectedCourses.includes(course.id);
                      return (
                        <label
                          key={course.id}
                          className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-xs font-semibold transition-colors ${
                            isSelected ? 'bg-teal-50/60 text-teal-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCourse(course.id)}
                              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer shrink-0"
                            />
                            <span className="truncate">{course.name}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
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
