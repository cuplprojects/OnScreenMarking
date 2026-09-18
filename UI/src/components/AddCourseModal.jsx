import { useState, useEffect } from 'react';
import { X, ChevronDown, Search, Check } from 'lucide-react';
import courseService from '../services/courseService';
import subjectService from '../services/subjectService';

export default function AddCourseModal({
  isOpen,
  onClose,
  onSuccess,
  editingId,
  initialData,
  activeUniversityId,
  departments
}) {
  const [courseName, setCourseName] = useState('');
  const [courseType, setCourseType] = useState('UG');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [initialSubjects, setInitialSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');

  const filteredSubjects = subjects.filter(s => s.subName.toLowerCase().includes(subjectSearch.toLowerCase()));

  useEffect(() => {
    const loadModalData = async () => {
      if (!isOpen) return;

      try {
        setLoading(true);
        setError('');

        // 1. Fetch all subjects for this university
        if (activeUniversityId) {
          const response = await subjectService.getSubjectByUniversity(activeUniversityId, { pageSize: 0 });
          const list = Array.isArray(response) ? response : (response?.items || []);
          setSubjects(list);
        }

        if (editingId && initialData) {
          setCourseName(initialData.name || '');
          setCourseType(initialData.type || 'UG');
          setSelectedDepartmentId(initialData.departmentId || '');
          setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);

          // Fetch current mapped subjects for this course
          const mappedSubjects = await courseService.getCourseSubjects(editingId);
          const mappedSubIds = mappedSubjects.map(s => s.subjectId || s.id);
          setSelectedSubjects(mappedSubIds);
          setInitialSubjects(mappedSubIds);
        } else {
          setCourseName('');
          setCourseType('UG');
          setSelectedDepartmentId(initialData?.departmentId || (departments && departments[0]?.departmentId) || '');
          setIsActive(true);
          setSelectedSubjects([]);
          setInitialSubjects([]);
        }
      } catch (err) {
        console.error('Failed to load course modal options:', err);
        setError('Failed to load subjects for selection');
      } finally {
        setLoading(false);
      }
    };

    loadModalData();
  }, [editingId, initialData, isOpen, activeUniversityId, departments]);

  if (!isOpen) return null;

  const toggleSubject = (subjectId) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseName.trim()) {
      setError('Course name is required');
      return;
    }
    if (!selectedDepartmentId) {
      setError('Please select a department');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        name: courseName.trim(),
        type: courseType,
        departmentId: parseInt(selectedDepartmentId, 10),
        isActive: isActive
      };

      let responseCourse;
      if (editingId) {
        responseCourse = await courseService.updateCourse(editingId, payload);
      } else {
        responseCourse = await courseService.createCourse(payload);
      }

      const courseId = editingId || responseCourse?.id;

      if (courseId) {
        // --- Sync Subjects Mapping ---
        // Add new mappings
        for (const subId of selectedSubjects) {
          if (!initialSubjects.includes(subId)) {
            await courseService.addSubjectToCourse(courseId, subId);
          }
        }
        // Remove old mappings
        if (editingId) {
          for (const subId of initialSubjects) {
            if (!selectedSubjects.includes(subId)) {
              await courseService.removeSubjectFromCourse(courseId, subId);
            }
          }
        }
      }

      onSuccess(editingId ? 'Course updated successfully' : 'Course created successfully');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save course');
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
              {editingId ? 'Edit Academic Course' : 'Add New Course'}
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
        <form id="course-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-100 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Course Title / Name *</label>
            <input
              type="text"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Bachelor of Science in Information Technology"
              className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Degree Level</label>
              <select
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition cursor-pointer"
              >
                <option value="UG">Undergraduate (UG)</option>
                <option value="PG">Postgraduate (PG)</option>
                <option value="Diploma">Diploma</option>
                <option value="PhD">Doctorate (PhD)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Department</label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition cursor-pointer"
                disabled={!!initialData?.departmentId}
              >
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subjects Checklist */}
          <div className="relative">
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Linked Subjects ({selectedSubjects.length} selected)</label>
            <div
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium flex flex-wrap gap-1 p-1.5 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-600 transition min-h-[42px] cursor-text"
              onClick={() => setIsDropdownOpen(true)}
            >
              {selectedSubjects.map(id => {
                const subject = subjects.find(s => s.subjectId === id);
                return subject ? (
                  <span key={id} className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-1 rounded-md text-xs font-bold border border-teal-200/50 shadow-sm animate-fade-in-up">
                    {subject.subName}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubject(id);
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
                  value={subjectSearch}
                  onChange={(e) => {
                    setSubjectSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={selectedSubjects.length === 0 ? "Search and map subjects..." : ""}
                  className="w-full bg-transparent border-none focus:outline-none text-gray-900 text-xs font-medium min-w-[120px]"
                />
                <ChevronDown size={14} className={`text-gray-400 mr-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto top-full custom-scrollbar py-1">
                  {filteredSubjects.length === 0 ? (
                    <div className="p-3 text-center text-xs font-semibold text-gray-400 flex flex-col items-center gap-1">
                      <Search size={16} className="opacity-50" />
                      No subjects found
                    </div>
                  ) : (
                    filteredSubjects.map(subject => {
                      const isSelected = selectedSubjects.includes(subject.subjectId);
                      return (
                        <div
                          key={subject.subjectId}
                          onClick={() => {
                            toggleSubject(subject.subjectId);
                            setSubjectSearch('');
                          }}
                          className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-xs font-semibold hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-teal-50/50 text-teal-700' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{subject.subName}</span>
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
            form="course-form"
            disabled={loading}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-xs cursor-pointer shadow transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
