import { useState, useEffect } from 'react';
import { X, ChevronDown, Search, Check } from 'lucide-react';
import subjectService from '../services/subjectService';
import courseService from '../services/courseService';

export default function AddSubjectModal({
  isOpen,
  onClose,
  onSuccess,
  editingId,
  initialData,
  activeUniversityId,
  departments
}) {
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Courses related states
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [initialCourses, setInitialCourses] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()));

  useEffect(() => {
    const loadModalData = async () => {
      if (!isOpen) return;

      try {
        setLoading(true);
        if (activeUniversityId) {
          const response = await courseService.getAllCourses(null, activeUniversityId);
          const list = Array.isArray(response) ? response : (response?.items || []);
          setCourses(list);
        }

        if (editingId && initialData) {
          setSubName(initialData.subName || '');
          setSubCode(initialData.subCode || '');
          setStatus(initialData.status !== undefined ? initialData.status : true);
          
          setSelectedCourses(initialData.courseId ? [initialData.courseId] : []);
          setInitialCourses(initialData.courseId ? [initialData.courseId] : []);
        } else {
          setSubName('');
          setSubCode('');
          setSelectedCourses(initialData?.courseId ? [initialData.courseId] : []);
          setInitialCourses(initialData?.courseId ? [initialData.courseId] : []);
          setStatus(true);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    };
    loadModalData();
    setError('');
  }, [editingId, initialData, isOpen, activeUniversityId]);

  const toggleCourse = (id) => {
    setSelectedCourses(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subName.trim()) {
      setError('Subject name is required');
      return;
    }

    // Determine the department ID to map this subject to based on the first selected course.
    const deptId = selectedCourses.length > 0 
      ? courses.find(c => c.id === selectedCourses[0])?.departmentId 
      : (initialData?.departmentId || (departments && departments[0]?.departmentId));
      
    if (!deptId) {
      setError('No active department found to satisfy backend mapping.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        subjectName: subName.trim(),
        subjectCode: subCode.trim(),
        isActive: status,
        departmentId: parseInt(deptId, 10)
      };

      let currentSubjectId = editingId;

      if (editingId) {
        await subjectService.updateSubject(editingId, payload);
      } else {
        const newSubject = await subjectService.createSubject(payload);
        currentSubjectId = newSubject.subjectId || newSubject.id;
      }

      if (currentSubjectId) {
        // Add new mappings
        for (const courseId of selectedCourses) {
          if (!initialCourses.includes(courseId)) {
            await courseService.addSubjectToCourse(courseId, currentSubjectId);
          }
        }
      }

      onSuccess(editingId ? 'Subject updated successfully' : 'Subject created and mapped successfully');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save subject');
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
              {editingId ? 'Edit Subject' : 'Add New Subject'}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. Data Structures"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. CS-201"
                />
              </div>
            </div>

            {/* Courses Multi-Select */}
            <div className="space-y-1.5 relative">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Map to Courses ({selectedCourses.length} selected)</label>
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
                    placeholder={selectedCourses.length === 0 ? "Search and map courses..." : ""}
                    className="w-full bg-transparent border-none focus:outline-none text-slate-700 text-xs font-semibold placeholder:text-slate-400 placeholder:font-medium min-w-[120px]"
                  />
                  <ChevronDown size={14} className={`text-slate-400 mr-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200">
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

            {/* Actions */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-100 mt-5">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-600 hover:shadow-lg text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingId ? 'Update Subject' : 'Create Subject'}
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
