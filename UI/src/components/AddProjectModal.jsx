import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AddProjectModal({
  isOpen,
  onClose,
  onSubmit,
  editingId,
  initialData,
  sessions = []
}) {
  const [projectName, setProjectName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editingId && initialData) {
      setProjectName(initialData.projectName || '');
      setSessionId(initialData.sessionId ? initialData.sessionId.toString() : '');
      setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);
    } else {
      setProjectName('');
      setSessionId('');
      setIsActive(true);
    }
  }, [editingId, initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      projectName: projectName.trim(),
      sessionId: parseInt(sessionId, 10),
      isActive
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 transition-opacity" 
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl border border-slate-100 transition-all">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {editingId ? 'Edit Exam Project' : 'Create Exam Project'}
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
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Session *
              </label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                required
              >
                <option value="" disabled>-- Select a Session --</option>
                {sessions.map(s => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.sessionName} {s.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Project Title *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. B.Tech Mid-Term Valuation"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1 select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-350 accent-blue-650 cursor-pointer"
                id="active-project-modal"
              />
              <label className="text-xs text-slate-600 font-bold cursor-pointer" htmlFor="active-project-modal">
                Enable Project Immediately
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-3 border-t border-slate-100 mt-5">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-650 hover:shadow-lg text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all"
              >
                Save Project
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
