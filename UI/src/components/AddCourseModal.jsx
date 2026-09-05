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
              {editingId ? 'Edit Academic Course' : 'Add New Course'}
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

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Course Title / Name
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. Bachelor of Science in Information Technology"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Degree Level
                </label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                >
                  <option value="UG">Undergraduate (UG)</option>
                  <option value="PG">Postgraduate (PG)</option>
                  <option value="Diploma">Diploma</option>
                  <option value="PhD">Doctorate (PhD)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Department
                </label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
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
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Linked Subjects ({selectedSubjects.length} selected)</label>
              <div
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold flex flex-wrap gap-1 p-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all min-h-[42px] cursor-text"
                onClick={() => setIsDropdownOpen(true)}
              >
                {selectedSubjects.map(id => {
                  const subject = subjects.find(s => s.subjectId === id);
                  return subject ? (
                    <span key={id} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold border border-blue-200/50 shadow-sm animate-fade-in-up">
                      {subject.subName}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubject(id);
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
                    value={subjectSearch}
                    onChange={(e) => {
                      setSubjectSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder={selectedSubjects.length === 0 ? "Search and map subjects..." : ""}
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
                      {filteredSubjects.length === 0 ? (
                        <div className="p-3 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-1">
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
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                                isSelected 
                                  ? 'bg-blue-50/80 text-blue-700 hover:bg-blue-100/80' 
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{subject.subName}</span>
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

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 select-none">
              <input
                type="checkbox"
                id="courseIsActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-250 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="courseIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Activate this course for registrations and mapping
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-100 mt-5">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-600 hover:shadow-lg text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingId ? 'Update Course' : 'Create Course'}
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
