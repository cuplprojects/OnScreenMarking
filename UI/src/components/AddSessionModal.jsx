import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';

export default function AddSessionModal({
  isOpen,
  onClose,
  onSubmit,
  editingId,
  initialData
}) {
  const [sessionName, setSessionName] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editingId && initialData) {
      setSessionName(initialData.sessionName || '');
      setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
    } else {
      setSessionName('');
      setIsActive(true);
    }
  }, [editingId, initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      sessionName: sessionName.trim(),
      isActive
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-100 shadow-2xl flex flex-col animate-scale-up">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">
              {editingId ? 'Edit Session' : 'Create Term Session'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">Session Name *</label>
            <input
              type="text"
              required
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g. 2026-2027"
              className="w-full bg-gray-50/50 border border-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs focus:outline-none focus:border-teal-600 font-medium transition"
            />
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
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-xs cursor-pointer shadow transition"
          >
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
