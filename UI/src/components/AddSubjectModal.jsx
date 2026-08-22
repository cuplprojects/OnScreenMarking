import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

  useEffect(() => {
    if (editingId && initialData) {
      setSubName(initialData.subName || '');
      setSubCode(initialData.subCode || '');
      setStatus(initialData.status !== undefined ? initialData.status : true);
    } else {
      setSubName('');
      setSubCode('');
      setStatus(true);
    }
    setError('');
  }, [editingId, initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subName.trim()) {
      setError('Subject name is required');
      return;
    }

    // Determine the department ID to map this subject to.
    const deptId = initialData?.departmentId || (departments && departments[0]?.departmentId);
    if (!deptId) {
      setError('No active department associated to map this subject');
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

      if (editingId) {
        await subjectService.updateSubject(editingId, payload);
        onSuccess('Subject updated successfully');
      } else {
        const newSubject = await subjectService.createSubject(payload);
        
        // If a course ID context was passed, map this new subject to that course immediately
        if (initialData?.courseId) {
          const subjectId = newSubject.subjectId || newSubject.id;
          if (subjectId) {
            await courseService.addSubjectToCourse(initialData.courseId, subjectId);
          }
        }
        
        onSuccess('Subject created and mapped to course successfully');
      }

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
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-slate-100 transition-all">
          
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
