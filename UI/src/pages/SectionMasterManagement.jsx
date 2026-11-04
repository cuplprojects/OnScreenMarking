import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, X, Search, Award, Hash, CheckCircle2, HelpCircle, ArrowRight, Check } from 'lucide-react';
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
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Single edit form state
  const [formData, setFormData] = useState({
    name: '',
    batchId: 1,
    description: '',
    startQuestion: 1,
    endQuestion: 10,
    totalQuestions: 10,
    totalMarks: 20,
    maxQuestionsToAttempt: 10,
  });

  // Batch creation state (all sections in a batch created at once)
  const [batchId, setBatchId] = useState(1);
  const [batchSections, setBatchSections] = useState([
    { name: 'Section A', startQuestion: 1, endQuestion: 10, totalQuestions: 10, totalMarks: 20, maxQuestionsToAttempt: 10, description: '' }
  ]);

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
      searchPlaceholder: 'Search section masters or batches…',
      actionLabel: 'Create Batch Sections',
      onAction: () => handleOpenCreate(),
      count: masters.length,
    });
    return () => setConfigHeader(null);
  }, [search, setSearch, setConfigHeader, masters.length]);

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

  const handleOpenCreate = (targetBatchId = null) => {
    setEditingMaster(null);
    const existingBatches = masters.map(m => m.batchId || 0).filter(b => b > 0);
    const maxB = existingBatches.length > 0 ? Math.max(...existingBatches) : 0;
    const nextB = targetBatchId != null ? targetBatchId : (maxB > 0 ? maxB + 1 : 1);
    
    setBatchId(nextB);
    setBatchSections([
      { name: 'Section A', startQuestion: 1, endQuestion: 10, totalQuestions: 10, totalMarks: 20, maxQuestionsToAttempt: 10, description: '' }
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (master) => {
    setEditingMaster(master);
    setFormData({
      name: master.name,
      batchId: master.batchId || 1,
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

  // Add another section row to the batch
  const handleAddBatchSection = () => {
    setBatchSections(prev => {
      const last = prev[prev.length - 1];
      let nextStart = 1;
      let nextEnd = 10;
      let nextName = 'Section A';

      if (last) {
        nextStart = (parseInt(last.endQuestion, 10) || 0) + 1;
        const count = parseInt(last.totalQuestions, 10) || 10;
        nextEnd = nextStart + count - 1;

        // Try to generate next letter: 'Section A' -> 'Section B', etc.
        const match = last.name.match(/([A-Z])$/i);
        if (match) {
          const charCode = match[1].toUpperCase().charCodeAt(0);
          const nextChar = String.fromCharCode(charCode + 1);
          nextName = last.name.substring(0, match.index) + nextChar;
        } else {
          nextName = `Section ${prev.length + 1}`;
        }
      }

      return [
        ...prev,
        {
          name: nextName,
          startQuestion: nextStart,
          endQuestion: nextEnd,
          totalQuestions: nextEnd - nextStart + 1,
          totalMarks: last ? last.totalMarks : 20,
          maxQuestionsToAttempt: last ? last.maxQuestionsToAttempt : (nextEnd - nextStart + 1),
          description: ''
        }
      ];
    });
  };

  const handleRemoveBatchSection = (index) => {
    if (batchSections.length <= 1) {
      message.warning('At least one section is required in the batch');
      return;
    }
    setBatchSections(prev => prev.filter((_, i) => i !== index));
  };

  const handleBatchSectionChange = (index, field, value) => {
    setBatchSections(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      if (field === 'startQuestion' || field === 'endQuestion') {
        const start = field === 'startQuestion' ? parseInt(value, 10) || 0 : parseInt(item.startQuestion, 10) || 0;
        const end = field === 'endQuestion' ? parseInt(value, 10) || 0 : parseInt(item.endQuestion, 10) || 0;
        if (end >= start) {
          const count = end - start + 1;
          item.totalQuestions = count;
          if (item.maxQuestionsToAttempt > count || item.maxQuestionsToAttempt === copy[index].totalQuestions) {
            item.maxQuestionsToAttempt = count;
          }
        }
      }
      copy[index] = item;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingMaster) {
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
          batchId: formData.batchId ? parseInt(formData.batchId, 10) : 1,
          description: (formData.description || '').trim(),
          startQuestion: parseInt(formData.startQuestion, 10),
          endQuestion: parseInt(formData.endQuestion, 10),
          totalQuestions: parseInt(formData.totalQuestions, 10),
          totalMarks: parseFloat(formData.totalMarks) || 0,
          maxQuestionsToAttempt: parseInt(formData.maxQuestionsToAttempt, 10),
        };

        await sectionService.updateSectionMaster(editingMaster.id, payload);
        message.success('Section Master updated successfully');
        setShowModal(false);
        fetchMasters();
      } catch (err) {
        message.error(err.response?.data?.message || err.message || 'Error saving section master');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Batch creation: validate all sections
      const bId = parseInt(batchId, 10) || 1;
      for (let i = 0; i < batchSections.length; i++) {
        const s = batchSections[i];
        if (!s.name.trim()) {
          message.error(`Section #${i + 1} name is required`);
          return;
        }
        if (parseInt(s.endQuestion, 10) < parseInt(s.startQuestion, 10)) {
          message.error(`Section "${s.name}": End question must be greater than or equal to start question`);
          return;
        }
      }

      // Check for duplicate names inside this batch
      const names = batchSections.map(s => s.name.trim().toLowerCase());
      const hasDup = names.some((n, idx) => names.indexOf(n) !== idx);
      if (hasDup) {
        message.error('Duplicate section names found within this batch. Each section name in the batch must be unique.');
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          batchId: bId,
          sections: batchSections.map(s => ({
            name: s.name.trim(),
            batchId: bId,
            description: (s.description || '').trim(),
            startQuestion: parseInt(s.startQuestion, 10),
            endQuestion: parseInt(s.endQuestion, 10),
            totalQuestions: parseInt(s.totalQuestions, 10),
            totalMarks: parseFloat(s.totalMarks) || 0,
            maxQuestionsToAttempt: parseInt(s.maxQuestionsToAttempt, 10),
          }))
        };

        const res = await sectionService.createSectionMastersBatch(payload);
        message.success(res?.message || `Successfully created ${batchSections.length} section(s) for Batch #${bId}`);
        setShowModal(false);
        fetchMasters();
      } catch (err) {
        message.error(err.response?.data?.message || err.message || 'Error creating batch sections');
      } finally {
        setSubmitting(false);
      }
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

  // Group masters by BatchId for filter options and summary
  const batchMap = {};
  masters.forEach(m => {
    const bId = m.batchId || 1;
    if (!batchMap[bId]) batchMap[bId] = [];
    batchMap[bId].push(m);
  });
  const availableBatchIds = Object.keys(batchMap).map(Number).sort((a, b) => a - b);

  const filteredMasters = masters.filter(m => {
    if (selectedBatchFilter !== 'all' && Number(m.batchId || 1) !== Number(selectedBatchFilter)) {
      return false;
    }
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(query) ||
      String(m.batchId || '').toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query)
    );
  });

  // Calculate batch creation summary
  const batchTotalQs = batchSections.reduce((sum, s) => sum + (parseInt(s.totalQuestions, 10) || 0), 0);
  const batchTotalMarks = batchSections.reduce((sum, s) => sum + (parseFloat(s.totalMarks) || 0), 0);

  return (
    <div className="w-full space-y-4">
      {/* Batch Overview Filter Tabs */}
      {availableBatchIds.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 pl-2">Filter Batch:</span>
            <button
              onClick={() => setSelectedBatchFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedBatchFilter === 'all'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Batches ({masters.length})
            </button>
            {availableBatchIds.map(bId => {
              const count = batchMap[bId]?.length || 0;
              const totalMarks = batchMap[bId]?.reduce((s, m) => s + (parseFloat(m.totalMarks) || 0), 0) || 0;
              return (
                <button
                  key={bId}
                  onClick={() => setSelectedBatchFilter(bId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedBatchFilter === bId
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>Batch #{bId}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedBatchFilter === bId ? 'bg-teal-800 text-teal-100' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count} sec • {totalMarks}m
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handleOpenCreate()}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>Create Batch Sections</span>
          </button>
        </div>
      )}

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
                {search ? 'No section masters match your search criteria.' : 'Create section templates all at once for a batch to reuse across multiple papers and projects.'}
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
                onClick={() => handleOpenCreate()}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-md transition cursor-pointer"
              >
                Create Batch Sections
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest select-none">
                  <th className="py-3.5 md:px-6 px-4">Batch ID</th>
                  <th className="py-3.5 md:px-6 px-4">Section Name & Description</th>
                  <th className="py-3.5 text-center md:px-6 px-4">Question Range</th>
                  <th className="py-3.5 text-center md:px-6 px-4">Total Marks</th>
                  <th className="py-3.5 text-center md:px-6 px-4">Attempt Limit</th>
                  <th className="py-3.5 text-center md:px-6 px-4">Marks / Q</th>
                  <th className="py-3.5 text-right md:px-6 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredMasters.map(master => {
                  const totalQ = master.totalQuestions || (master.endQuestion - master.startQuestion + 1);
                  const marksPerQ = totalQ > 0 ? (master.totalMarks / totalQ).toFixed(1) : '-';

                  return (
                    <tr key={master.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-3.5 md:px-6 px-4">
                        <span className="inline-flex items-center gap-1 font-extrabold text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-lg text-xs">
                          Batch #{master.batchId || 1}
                        </span>
                      </td>
                      <td className="py-3.5 md:px-6 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 text-teal-800 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border border-gray-200">
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
                      <td className="py-3.5 text-center md:px-6 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                          Q{master.startQuestion} - Q{master.endQuestion}
                        </span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">
                          {totalQ} questions
                        </span>
                      </td>
                      <td className="py-3.5 text-center md:px-6 px-4">
                        <span className="inline-flex items-center gap-1 font-black text-teal-800 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg text-xs">
                          <Award size={12} className="text-teal-600" />
                          {master.totalMarks}
                        </span>
                      </td>
                      <td className="py-3.5 text-center md:px-6 px-4">
                        <span className="font-bold text-gray-700">
                          {master.maxQuestionsToAttempt} of {totalQ}
                        </span>
                      </td>
                      <td className="py-3.5 text-center font-bold text-gray-600 md:px-6 px-4">
                        {marksPerQ}
                      </td>
                      <td className="py-3.5 text-right md:px-6 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(master)}
                            className="p-1.5 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all cursor-pointer"
                            title="Edit Master Section"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(master.id, master.name)}
                            disabled={deletingId === master.id}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
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

      {/* Modal: Create Batch Sections (All at once) OR Edit Single Master */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`bg-white rounded-2xl w-full ${editingMaster ? 'max-w-lg' : 'max-w-4xl'} max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden`}>
            {/* Modal Header */}
            <div className="py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 md:px-6 px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingMaster ? 'Edit Section Master' : 'Create Batch Sections (All at Once)'}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                    {editingMaster ? 'Modify single section master parameters' : 'Define and create all sections for a given batch simultaneously'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
                
                {/* ── EDIT MODE (Single Section) ────────────────────── */}
                {editingMaster ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
                          Batch ID *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.batchId}
                          onChange={(e) => handleFieldChange('batchId', e.target.value)}
                          className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                        />
                      </div>
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

                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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

                    <div className="grid gap-3 sm:grid-cols-2 grid-cols-1 lg:grid-cols-3">
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
                          step="0.01"
                          min="0.01"
                          required
                          value={formData.totalMarks}
                          onChange={(e) => handleFieldChange('totalMarks', parseFloat(e.target.value) || e.target.value)}
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
                  </div>
                ) : (
                  /* ── BATCH CREATION MODE (All sections at once) ── */
                  <div className="space-y-5">
                    {/* Batch Settings Bar */}
                    <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-teal-900 mb-1">
                            Assign to Batch ID <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-teal-700 bg-teal-100 px-2 py-1.5 rounded-lg border border-teal-200">
                              Batch #
                            </span>
                            <input
                              type="number"
                              min="1"
                              required
                              value={batchId}
                              onChange={(e) => setBatchId(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              className="w-28 text-sm font-black border border-teal-300 rounded-xl px-3 py-1.5 bg-white text-teal-950 focus:ring-2 focus:ring-teal-500 outline-none transition shadow-2xs"
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-teal-800/80 font-medium max-w-xs pt-4">
                          All sections below will belong to Batch #{batchId} and can be imported together with 1 click.
                        </p>
                      </div>

                      {/* Cumulative Batch Summary */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="bg-white border border-teal-200/80 px-3 py-2 rounded-xl text-center shadow-2xs">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sections</span>
                          <span className="text-sm font-black text-teal-950">{batchSections.length}</span>
                        </div>
                        <div className="bg-white border border-teal-200/80 px-3 py-2 rounded-xl text-center shadow-2xs">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Questions</span>
                          <span className="text-sm font-black text-teal-950">{batchTotalQs}</span>
                        </div>
                        <div className="bg-white border border-teal-200/80 px-3 py-2 rounded-xl text-center shadow-2xs">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Marks</span>
                          <span className="text-sm font-black text-teal-950">{batchTotalMarks}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section Rows to be Created */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-gray-500 tracking-wider">
                          Sections in this Batch ({batchSections.length})
                        </span>
                        <button
                          type="button"
                          onClick={handleAddBatchSection}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Plus size={13} />
                          <span>Add Another Section</span>
                        </button>
                      </div>

                      {batchSections.map((sec, idx) => (
                        <div key={idx} className="bg-gray-50/70 border border-gray-200/90 rounded-2xl p-4 space-y-3 hover:border-teal-300 transition-all">
                          <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-teal-700 text-white flex items-center justify-center font-black text-xs">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-black text-gray-800">Section {idx + 1}</span>
                              <span className="text-[11px] text-gray-400">• Q{sec.startQuestion} - Q{sec.endQuestion} ({sec.totalQuestions} Qs, {sec.totalMarks} Marks)</span>
                            </div>

                            {batchSections.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBatchSection(idx)}
                                className="text-gray-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                                title="Remove this section"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                            {/* Section Name */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Section Name *</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Section A"
                                value={sec.name}
                                onChange={(e) => handleBatchSectionChange(idx, 'name', e.target.value)}
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                              />
                            </div>

                            {/* Start Q & End Q */}
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Question Range *</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={sec.startQuestion}
                                  onChange={(e) => handleBatchSectionChange(idx, 'startQuestion', e.target.value)}
                                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-2 py-2 bg-white text-center focus:ring-2 focus:ring-teal-500 outline-none transition"
                                  title="Start Question"
                                />
                                <span className="text-gray-400 text-xs font-bold">to</span>
                                <input
                                  type="number"
                                  min={sec.startQuestion}
                                  required
                                  value={sec.endQuestion}
                                  onChange={(e) => handleBatchSectionChange(idx, 'endQuestion', e.target.value)}
                                  className="w-full text-xs font-bold border border-gray-200 rounded-xl px-2 py-2 bg-white text-center focus:ring-2 focus:ring-teal-500 outline-none transition"
                                  title="End Question"
                                />
                              </div>
                            </div>

                            {/* Total Marks */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Total Marks *</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                required
                                value={sec.totalMarks}
                                onChange={(e) => handleBatchSectionChange(idx, 'totalMarks', e.target.value)}
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl px-2.5 py-2 bg-white text-center focus:ring-2 focus:ring-teal-500 outline-none transition"
                              />
                            </div>

                            {/* Max Questions to Attempt */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Attempt Limit *</label>
                              <input
                                type="number"
                                min="1"
                                max={sec.totalQuestions}
                                required
                                value={sec.maxQuestionsToAttempt}
                                onChange={(e) => handleBatchSectionChange(idx, 'maxQuestionsToAttempt', e.target.value)}
                                className="w-full text-xs font-bold border border-gray-200 rounded-xl px-2.5 py-2 bg-white text-center focus:ring-2 focus:ring-teal-500 outline-none transition"
                                title="Max questions to attempt"
                              />
                            </div>

                            {/* Questions count info */}
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Marks/Q</label>
                              <div className="px-2.5 py-2 rounded-xl bg-gray-100 border border-gray-200/80 text-center text-xs font-black text-gray-700">
                                {sec.totalQuestions > 0 ? (sec.totalMarks / sec.totalQuestions).toFixed(1) : '-'} m
                              </div>
                            </div>
                          </div>

                          {/* Optional Description */}
                          <div>
                            <input
                              type="text"
                              placeholder="Instructions / Description (optional, e.g. Attempt any 5 questions)"
                              value={sec.description || ''}
                              onChange={(e) => handleBatchSectionChange(idx, 'description', e.target.value)}
                              className="w-full text-xs font-medium border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 outline-none transition"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBatchSection}
                      className="w-full py-2.5 border-2 border-dashed border-teal-300 hover:border-teal-500 hover:bg-teal-50/50 rounded-2xl text-teal-800 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Add Section {String.fromCharCode(65 + batchSections.length)} to Batch #{batchId}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="py-3.5 px-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 text-xs font-black text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : editingMaster
                    ? 'Update Section'
                    : `Create All ${batchSections.length} Sections for Batch #${batchId}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}