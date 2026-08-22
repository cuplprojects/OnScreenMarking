import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
        for (const courseId of selectedCourses) {
          if (!initialCourses.includes(courseId)) {
            const courseObj = courses.find(c => c.id === courseId);
            if (courseObj) {
              await courseService.updateCourse(courseId, {
                ...courseObj,
                departmentId: deptId
              });
            }
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
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-slate-100 transition-all">
          
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
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Assign Courses ({selectedCourses.length} selected)
              </label>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                {courses.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center font-semibold">
                    No courses available
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {courses.map((course) => (
                      <label key={course.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course.id)}
                          onChange={() => toggleCourse(course.id)}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                          {course.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
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
