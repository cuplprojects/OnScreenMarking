import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import subjectService from '../services/subjectService';

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
    const loadModalData = () => {
      if (!isOpen) return;

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
    };

    loadModalData();
  }, [editingId, initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subName.trim()) {
      setError('Subject name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const deptId = initialData?.departmentId || (departments && departments[0]?.departmentId) || 0;

      const payload = {
        subjectName: subName.trim(),
        subjectCode: subCode.trim(),
        isActive: status,
        universityId: activeUniversityId ? parseInt(activeUniversityId, 10) : 0
      };

      if (deptId) {
        payload.departmentId = parseInt(deptId, 10);
      }

      if (editingId) {
        await subjectService.updateSubject(editingId, payload);
      } else {
        await subjectService.createSubject(payload);
      }

      onSuccess(editingId ? 'Subject updated successfully' : 'Subject created successfully');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save subject');
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
              {editingId ? 'Edit Subject' : 'Add New Subject'}
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
        <form id="subject-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-100 font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Subject Name *</label>
              <input
                type="text"
                required
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Subject Code</label>
              <input
                type="text"
                value={subCode}
                onChange={(e) => setSubCode(e.target.value)}
                placeholder="e.g. CS-201"
                className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Status *</label>
            <div className="flex items-center gap-6 text-xs text-gray-700 bg-gray-50/50 border border-gray-200 px-4 py-2 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={status === true}
                  onChange={() => setStatus(true)}
                  className="w-3.5 h-3.5 text-teal-700 focus:ring-teal-500 accent-teal-600"
                />
                <span className="font-semibold">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  checked={status === false}
                  onChange={() => setStatus(false)}
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
            form="subject-form"
            disabled={loading}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-xs cursor-pointer shadow transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingId ? 'Update Subject' : 'Create Subject'}
          </button>
        </div>
      </div>
    </div>
  );
}
