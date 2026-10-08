import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, X, Search, Award, Hash, CheckCircle2, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { useConfigHeader } from '../context/ConfigHeaderContext';
import { sectionService } from '../services';
import message from '../services/messageService';

export default function SectionMasterManagement() {
  const { userType } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const { setConfigHeader } = useConfigHeader();

  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startQuestion: 1,
    endQuestion: 10,
    totalQuestions: 10,
    totalMarks: 20,
    maxQuestionsToAttempt: 10,
  });

  useEffect(() => {
    const parentPath = userType === 'admin' ? '/admin/dashboard' : '/coordinator/dashboard';
    const currentPath = userType === 'admin' ? '/admin/section-masters' : '/section-masters';
    setBreadcrumb([
      { label: 'Dashboard', path: parentPath, icon: 'Home' },
      { label: 'Section Masters', path: currentPath, icon: 'Layers' },
    ]);
    fetchMasters();
  }, [userType]);

  // Connect to UniversityConfigHeader unified bar
  useEffect(() => {
    setConfigHeader({
      title: 'Section Masters Management',
      search,
      setSearch,
      searchPlaceholder: 'Search section masters…',
      actionLabel: 'Add Section Master',
      onAction: () => handleOpenCreate(),
    });
    return () => setConfigHeader(null);
  }, [search, setSearch, setConfigHeader]);

  const fetchMasters = async () => {
    try {
      setLoading(true);
      const data = await sectionService.getSectionMasters();
      setMasters(data || []);
    } catch (err) {
      message.error('Failed to load section masters');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingMaster(null);
    setFormData({
      name: '',
      description: '',
      startQuestion: 1,
      endQuestion: 10,
      totalQuestions: 10,
      totalMarks: 20,
      maxQuestionsToAttempt: 10,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (master) => {
    setEditingMaster(master);
    setFormData({
      name: master.name,
      description: master.description || '',
      startQuestion: master.startQuestion,
      endQuestion: master.endQuestion,
      totalQuestions: master.totalQuestions || (master.endQuestion - master.startQuestion + 1),
      totalMarks: master.totalMarks,
      maxQuestionsToAttempt: master.maxQuestionsToAttempt || master.totalQuestions,
    });
    setShowModal(true);
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'startQuestion' || field === 'endQuestion') {
        const start = field === 'startQuestion' ? parseInt(value) || 0 : prev.startQuestion;
        const end = field === 'endQuestion' ? parseInt(value) || 0 : prev.endQuestion;
        if (end >= start) {
          const count = end - start + 1;
          updated.totalQuestions = count;
          if (prev.maxQuestionsToAttempt > count || prev.maxQuestionsToAttempt === prev.totalQuestions) {
            updated.maxQuestionsToAttempt = count;
          }
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      message.error('Section name is required');
      return;
    }

    if (formData.endQuestion < formData.startQuestion) {
      message.error('End question must be greater than or equal to start question');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        startQuestion: parseInt(formData.startQuestion, 10),
        endQuestion: parseInt(formData.endQuestion, 10),
        totalQuestions: parseInt(formData.totalQuestions, 10),
        totalMarks: parseInt(formData.totalMarks, 10),
        maxQuestionsToAttempt: parseInt(formData.maxQuestionsToAttempt, 10),
      };

      if (editingMaster) {
        await sectionService.updateSectionMaster(editingMaster.id, payload);
        message.success('Section Master updated successfully');
      } else {
        await sectionService.createSectionMaster(payload);
        message.success('Section Master created successfully');
      }
      setShowModal(false);
      fetchMasters();
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'Error saving section master');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? Existing configured sections referencing it will have their master link cleared.`)) {
      try {
        setDeletingId(id);
        await sectionService.deleteSectionMaster(id);
        message.success('Section Master deleted successfully');
        fetchMasters();
      } catch (err) {
        message.error(err.response?.data?.message || err.message || 'Failed to delete section master');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const filteredMasters = masters.filter(m => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && masters.length === 0 ? (
          <div className="p-16 text-center text-gray-400 font-bold text-xs flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span>Fetching Section Masters...</span>
          </div>
        ) : filteredMasters.length === 0 ? (
          <div className="p-16 text-center text-gray-500 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mx-auto">
              <Layers size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide">No Section Masters Found</h3>
              <p className="text-xs text-gray-400">
                {search ? 'No section masters match your search criteria.' : 'Create section templates to reuse across multiple papers and projects.'}
              </p>
            </div>
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-md transition"
              >
                Create Section Master
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest select-none">
                  <th className="px-6 py-3.5">Section Name & Description</th>
                  <th className="px-6 py-3.5 text-center">Question Range</th>
                  <th className="px-6 py-3.5 text-center">Total Marks</th>
                  <th className="px-6 py-3.5 text-center">Attempt Limit</th>
                  <th className="px-6 py-3.5 text-center">Marks / Q</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredMasters.map(master => {
                  const totalQ = master.totalQuestions || (master.endQuestion - master.startQuestion + 1);
                  const marksPerQ = totalQ > 0 ? (master.totalMarks / totalQ).toFixed(1) : '-';

                  return (
                    <tr key={master.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border border-teal-100">
                            {master.name?.substring(0, 2) || 'S'}
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 tracking-tight block text-sm">
                              {master.name}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium line-clamp-1">
                              {master.description || 'No description provided'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                          Q{master.startQuestion} - Q{master.endQuestion}
                        </span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">
                          {totalQ} questions
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-black text-teal-800 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg text-xs">
                          <Award size={12} className="text-teal-600" />
                          {master.totalMarks}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="font-bold text-gray-700">
                          {master.maxQuestionsToAttempt} of {totalQ}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center font-bold text-gray-600">
                        {marksPerQ}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(master)}
                            className="p-1.5 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all"
                            title="Edit Master Section"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(master.id, master.name)}
                            disabled={deletingId === master.id}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete Master Section"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    {editingMaster ? 'Edit Section Master' : 'Create Section Master'}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                    Reusable template for question paper sections
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Section Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Section A"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Multiple Choice Questions, all questions compulsory"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3.5 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Start Question #
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.startQuestion}
                    onChange={(e) => handleFieldChange('startQuestion', e.target.value)}
                    className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3.5 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    End Question #
                  </label>
                  <input
                    type="number"
                    min={formData.startQuestion}
                    required
                    value={formData.endQuestion}
                    onChange={(e) => handleFieldChange('endQuestion', e.target.value)}
                    className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3.5 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    Total Questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalQuestions}
                    onChange={(e) => handleFieldChange('totalQuestions', e.target.value)}
                    className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalMarks}
                    onChange={(e) => handleFieldChange('totalMarks', e.target.value)}
                    className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                    To Attempt
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={formData.totalQuestions}
                    required
                    value={formData.maxQuestionsToAttempt}
                    onChange={(e) => handleFieldChange('maxQuestionsToAttempt', e.target.value)}
                    className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="bg-teal-50/60 border border-teal-100 p-3 rounded-xl flex items-center justify-between text-xs text-teal-800">
                <span>Calculated Marks per Question:</span>
                <span className="font-extrabold text-sm text-teal-900">
                  {formData.totalQuestions > 0 ? (formData.totalMarks / formData.totalQuestions).toFixed(2) : '0'} Marks
                </span>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? 'Saving...' : editingMaster ? 'Update Master' : 'Create Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
