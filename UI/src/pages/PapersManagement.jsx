import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { 
  FileText, Plus, Edit2, UserPlus, X, Search, CheckCircle2, Trash2, 
  ChevronLeft, ChevronRight, ChevronDown, Filter, Users, BookOpen, Layers, Folder, AlertCircle, Copy
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBreadcrumb } from "../context/BreadcrumbContext";
import { decryptId, encryptId } from "../utils/encryption";
import apiCall from "../services/api";
import ProjectConfigHeader from "../components/ProjectConfigHeader";
import subjectService from "../services/subjectService";
import projectService from "../services/projectService";
import paperService from "../services/paperService";
import sectionService from "../services/sectionService";
import message from '../services/messageService';
import { useTable } from "../services/tableService";
import TablePagination from "../components/TablePagination";
import ColumnFilter from "../components/ColumnFilter";

export default function PapersManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get("projectId");
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  const subjectId = searchParams.get("subjectId");
  const universityId = searchParams.get("universityId");
  const { userType, universityId: userUniversityId } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const activeUniversityId = userType === "coordinator" ? userUniversityId : universityId;
  const navigate = useNavigate();

  useEffect(() => {
    const papersPath = userType === 'admin' ? '/admin/papers' : '/papers';
    setBreadcrumb([
      { label: 'Paper Management', path: papersPath, icon: 'FileText' }
    ]);
  }, [userType]);

  const [subjects, setSubjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState("");
  
  // Table state & fetch fn
  const fetchFn = useCallback((params) => {
    if (projectId || activeUniversityId) {
      const searchVal = params.search || '';
      const pageVal = params.page || 1;
      const pageSizeVal = params.pageSize || 10;
      const sortFieldVal = params.sortField || '';
      const sortOrderVal = params.sortOrder || '';
      const statusFilterVal = params.statusFilter || '';
      // We will use the dashboard stats endpoint if projectId exists, otherwise we fallback to getAllPapers
      if (projectId) {
         let url = `/papers/dashboard-stats?projectId=${projectId}&page=${pageVal}&pageSize=${pageSizeVal}&search=${searchVal}&sortField=${sortFieldVal}&sortOrder=${sortOrderVal}&statusFilter=${statusFilterVal}`;
         if (subjectFilter) url += `&subjectId=${subjectFilter}`;
         return apiCall(url);
      }
    }
    return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 1 });
  }, [projectId, activeUniversityId, subjectFilter]);

  const {
    items: papers,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search: tableSearch,
    setSearch: setTableSearch,
    sortField,
    sortOrder,
    handleSort,
    filters,
    setFilter,
    loading: tableLoading,
    refresh: refreshTable
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10 }
  });

  const [selectedPaperIds, setSelectedPaperIds] = useState([]);

  // Modals state
  const [showForm, setShowForm] = useState(false);
  const [showBulkConfigModal, setShowBulkConfigModal] = useState(false);
  const [showImportSectionsModal, setShowImportSectionsModal] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    paperCode: "", paperName: "", paperNumber: 1, maxMarks: 100, 
    totalQuestions: "", description: "", catchNo: "", projectId: projectId || "", 
    isActive: true, questionPaperPdfUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  // Examiner Allocation State
  const [showExaminerModal, setShowExaminerModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [availableExaminers, setAvailableExaminers] = useState([]);
  const [assignedExaminers, setAssignedExaminers] = useState([]);
  const [examinerSearchQuery, setExaminerSearchQuery] = useState("");
  const [allocationLoading, setAllocationLoading] = useState(false);

  // Bulk Config State
  const [bulkConfigData, setBulkConfigData] = useState({
    name: "Section A", description: "", totalQuestions: 10, totalMarks: 100, 
    startQuestion: 1, endQuestion: 10, maxQuestionsToAttempt: 10
  });

  // Import Sections State
  const [sourcePaperId, setSourcePaperId] = useState("");
  const [importingSections, setImportingSections] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [subjectId, projectId, activeUniversityId]);

  const fetchInitialData = async () => {
    try {
      const projs = await projectService.getAllProjects(activeUniversityId, { pageSize: 0 });
      setProjects(projs?.items || projs || []);

      if (activeUniversityId) {
        const subs = await subjectService.getSubjectByUniversity(activeUniversityId, { pageSize: 0 });
        const subjectsArray = Array.isArray(subs) ? subs : (subs?.items || []);
        const mappedSubs = subjectsArray.map(s => ({ ...s, subjectName: s.subName || s.subjectName || '' }));
        setSubjects(mappedSubs);
      }
      refreshTable();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (searchParams.get("add") === "true") setShowForm(true);
    if (subjectId) setSelectedSubjects([parseInt(subjectId, 10)]);
  }, [searchParams]);

  // Bulk Selection
  const toggleSelectAll = () => {
    if (selectedPaperIds.length === papers.length) {
      setSelectedPaperIds([]);
    } else {
      setSelectedPaperIds(papers.map(p => p.paperId));
    }
  };

  const toggleSelectPaper = (id) => {
    setSelectedPaperIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const toggleSubject = (id) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleProjectChange = (id) => {
    setFormData(prev => ({ ...prev, projectId: id }));
  };

  // -------------------------------------------------------------
  // Bulk Section Configuration
  // -------------------------------------------------------------
  const handleBulkConfigSubmit = async (e) => {
    e.preventDefault();
    if (selectedPaperIds.length === 0) return message.error("Select papers first");
    
    try {
      await sectionService.bulkCreateSections({
        sectionDetails: bulkConfigData,
        paperIds: selectedPaperIds
      });
      message.success("Sections configured successfully");
      setShowBulkConfigModal(false);
      setSelectedPaperIds([]);
      refreshTable();
    } catch (err) {
      message.error("Failed to bulk configure sections");
    }
  };

  // -------------------------------------------------------------
  // Import Sections
  // -------------------------------------------------------------
  const handleImportSectionsSubmit = async (e) => {
    e.preventDefault();
    if (selectedPaperIds.length === 0) return message.error("Select target papers first");
    if (!sourcePaperId) return message.error("Select a source paper");

    setImportingSections(true);
    try {
      await sectionService.importSections({
        sourcePaperId: parseInt(sourcePaperId, 10),
        targetPaperIds: selectedPaperIds
      });
      message.success("Sections imported successfully");
      setShowImportSectionsModal(false);
      setSelectedPaperIds([]);
      refreshTable();
    } catch (err) {
      message.error("Failed to import sections");
    } finally {
      setImportingSections(false);
    }
  };

  // -------------------------------------------------------------
  // Paper Creation/Editing
  // -------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) return message.error("Please select at least one subject");

    try {
      const payload = {
        ...formData,
        subjectIds: selectedSubjects.map(id => parseInt(id, 10)),
        projectId: parseInt(formData.projectId, 10),
        paperNumber: parseInt(formData.paperNumber, 10),
        maxMarks: parseFloat(formData.maxMarks),
        totalQuestions: formData.totalQuestions === "" ? 0 : parseInt(formData.totalQuestions, 10),
      };

      if (editingId) {
        await paperService.updatePaper(editingId, payload);
      } else {
        await paperService.createPaper(payload);
      }

      handleCancel();
      refreshTable();
      message.success("Paper saved successfully");
    } catch (err) {
      message.error("Error saving paper");
    }
  };

  const handleEdit = async (paper) => {
    try {
        const fullPaper = await paperService.getPaperById(paper.paperId);
        setFormData({
            paperCode: fullPaper.paperCode, paperName: fullPaper.paperName, paperNumber: fullPaper.paperNumber,
            maxMarks: fullPaper.maxMarks, totalQuestions: fullPaper.totalQuestions, description: fullPaper.description || "",
            catchNo: fullPaper.catchNo || "", projectId: fullPaper.projectId, isActive: fullPaper.isActive,
            questionPaperPdfUrl: fullPaper.questionPaperPdfUrl || "",
        });
        if (fullPaper.subjectPapers && fullPaper.subjectPapers.length > 0) {
            setSelectedSubjects(fullPaper.subjectPapers.map(sp => sp.subjectId));
        }
        setEditingId(fullPaper.paperId);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        message.error("Failed to fetch paper details");
    }
  };

  const handleCancel = () => {
    setFormData({
      paperCode: "", paperName: "", paperNumber: 1, maxMarks: 100, totalQuestions: "", description: "", 
      catchNo: "", projectId: projectId || "", isActive: true, questionPaperPdfUrl: "",
    });
    setSelectedSubjects([]);
    setEditingId(null);
    setShowForm(false);
  };

  // -------------------------------------------------------------
  // Examiner Allocation
  // -------------------------------------------------------------
  const openAllocationModal = async (paper) => {
    setSelectedPaper(paper);
    setShowExaminerModal(true);
    setAllocationLoading(true);
    try {
      const project = projects.find(p => p.projectId === paper.projectId);
      const projUniversityId = project ? project.universityId : activeUniversityId;
      
      const fullPaper = await paperService.getPaperById(paper.paperId);
      const subIds = fullPaper.subjectPapers?.map(sp => sp.subjectId) || [];
      
      let allExaminers = [];
      if (subIds.length > 0) {
        const examinerSets = await Promise.all(
          subIds.map(sId => apiCall(`/users/examiners?subjectId=${sId}${projUniversityId ? `&universityId=${projUniversityId}` : ''}`))
        );
        const examinerMap = new Map();
        examinerSets.forEach(examList => {
          examList.forEach(ex => {
            if (!examinerMap.has(ex.id)) examinerMap.set(ex.id, ex);
          });
        });
        allExaminers = Array.from(examinerMap.values());
      } else {
        allExaminers = await apiCall(`/users/examiners${projUniversityId ? `?universityId=${projUniversityId}` : ''}`);
      }
      setAvailableExaminers(allExaminers);

      const assigned = await apiCall(`/PaperExaminers/paper/${paper.paperId}`);
      setAssignedExaminers(assigned);
    } catch (err) {
      console.error(err);
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleAssign = async (examinerId) => {
    try {
      await apiCall('/PaperExaminers/assign', {
        method: 'POST', body: JSON.stringify({ paperId: selectedPaper.paperId, examinerId })
      });
      const assigned = await apiCall(`/PaperExaminers/paper/${selectedPaper.paperId}`);
      setAssignedExaminers(assigned);
      message.success("Examiner assigned successfully");
    } catch (err) {
      message.error("Failed to assign examiner");
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await apiCall(`/PaperExaminers/remove/${assignmentId}`, { method: 'DELETE' });
      setAssignedExaminers(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err) {
      message.error("Failed to remove examiner");
    }
  };

  const SortHeader = ({ label, field, isCenter = false, hasFilter = false }) => {
    const isSorted = sortField === field;
    return (
      <th onClick={() => handleSort(field)} className={`px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors select-none ${isCenter ? 'text-center' : ''}`}>
        <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : ''}`}>
          <span>{label}</span>
          <span className="text-[9px] text-slate-400">{isSorted ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>
          {hasFilter && (
            <ColumnFilter columnKey={field} currentFilter={filters[field]} setFilter={setFilter} placeholder={`Filter ${label.toLowerCase()}...`} />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full">
      <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-6 mb-6 shadow-sm sticky top-0 z-20">
        <ProjectConfigHeader />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="p-2.5 hover:bg-slate-100 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition">
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2 leading-tight">
                <FileText className="text-blue-600" size={18} /> Papers Management
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            {projectId && (
              <button
                onClick={() => {
                  const importPath = userType === 'admin' ? '/admin/import-papers' : '/import-papers';
                  navigate(`${importPath}?projectId=${encryptedProjectId}&universityId=${activeUniversityId}`);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Folder size={13} /> Import Papers (From Project)
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className={`font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm border ${
                showForm ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200" : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              }`}
            >
              {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? "Cancel" : "Add Paper"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-10 space-y-6">
        
        {showForm && (
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    {editingId ? <Edit2 size={16} /> : <Plus size={16} />}
                </div>
                {editingId ? "Edit Paper Configuration" : "Create New Paper"}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Paper Code *</label>
                    <input type="text" value={formData.paperCode} onChange={(e) => setFormData({ ...formData, paperCode: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none" required />
                    </div>
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Paper Name *</label>
                    <input type="text" value={formData.paperName} onChange={(e) => setFormData({ ...formData, paperName: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none" required />
                    </div>
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Catch Number</label>
                    <input type="text" value={formData.catchNo} onChange={(e) => setFormData({ ...formData, catchNo: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">Subjects ({selectedSubjects.length} selected) *</label>
                    <div className="grid grid-cols-1 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-[200px] overflow-y-auto">
                        {subjects.map((s) => (
                            <label key={s.subjectId} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded transition">
                            <input type="checkbox" checked={selectedSubjects.includes(s.subjectId)} onChange={() => toggleSubject(s.subjectId)} className="w-4 h-4 rounded border-gray-300" />
                            <span className="text-gray-700 text-sm">{s.subjectName}</span>
                            </label>
                        ))}
                    </div>
                    </div>
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Project *</label>
                    <select value={formData.projectId} onChange={(e) => handleProjectChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required>
                        <option value="">Select Project</option>
                        {projects.map((p) => (
                        <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
                        ))}
                    </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Paper Number</label>
                    <input type="number" value={formData.paperNumber} onChange={(e) => setFormData({ ...formData, paperNumber: e.target.value })} className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none" min="1" />
                    </div>
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Max Marks</label>
                    <input type="number" value={formData.maxMarks} onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })} className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none" min="0" />
                    </div>
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Total Questions</label>
                    <input type="number" value={formData.totalQuestions} onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })} className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none" min="0" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none" rows="3" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Question Paper PDF</label>
                        <div className="flex flex-col gap-2">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    setUploading(true);
                                    const token = sessionStorage.getItem('token');
                                    const formDataObj = new FormData();
                                    formDataObj.append("file", file);
                                    try {
                                        const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
                                            method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formDataObj
                                        });
                                        if (!response.ok) throw new Error("Failed to upload PDF");
                                        const res = await response.json();
                                        setFormData(prev => ({ ...prev, questionPaperPdfUrl: res.url }));
                                        message.success("Question paper PDF uploaded successfully!");
                                    } catch (err) {
                                        message.error("Failed to upload question paper PDF: " + err.message);
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                disabled={uploading}
                            />
                            {uploading && <p className="text-xs text-blue-600 animate-pulse">Uploading PDF...</p>}
                            {formData.questionPaperPdfUrl && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                Attached: <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${formData.questionPaperPdfUrl}`} target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-600">View PDF</a>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all">
                    {editingId ? "Update Configuration" : "Save Paper"}
                    </button>
                    <button type="button" onClick={handleCancel} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold transition-all">
                    Cancel
                    </button>
                </div>
                </form>
            </div>
        )}

        {/* Papers Main Table Area */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/40">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search papers by name/code..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 shadow-sm"
                />
              </div>
              
              <div className="relative flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={subjectFilter}
                  onChange={(e) => {
                    setSubjectFilter(e.target.value);
                    setPage(1); // Reset to page 1 on filter change
                  }}
                  className="pl-2 pr-8 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm appearance-none outline-none"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            
            {/* Bulk Actions */}
            {selectedPaperIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <span className="text-xs font-bold text-slate-500 mr-2">{selectedPaperIds.length} Selected</span>
                <button
                  onClick={() => setShowBulkConfigModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Layers size={13} /> Bulk Configure Sections
                </button>
                <button
                  onClick={() => setShowImportSectionsModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Copy size={13} /> Import Sections
                </button>
              </div>
            )}
          </div>

          {tableLoading && papers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Papers...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="p-16 text-center">
              <FileText size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No Papers Found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 w-12 text-center border-b border-slate-100">
                      <input 
                        type="checkbox" 
                        checked={selectedPaperIds.length === papers.length && papers.length > 0} 
                        onChange={toggleSelectAll} 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                      />
                    </th>
                    <SortHeader label="Code & Name" field="paperCode" hasFilter={true} />
                    <SortHeader label="Subject & Max" field="subjectName" hasFilter={true} />
                    <th className="px-5 py-3.5 text-center border-b border-slate-100">Configuration Status</th>
                    <th className="px-5 py-3.5 text-right border-b border-slate-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {papers.map((paper) => {
                    const isSelected = selectedPaperIds.includes(paper.paperId);
                    // Determine warning state
                    const missingQp = paper.isSectionsConfigured && !paper.questionPaperPdfUrl;

                    return (
                      <tr key={paper.paperId} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-5 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectPaper(paper.paperId)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0">
                              {paper.paperCode.substring(0, 2)}
                            </div>
                            <div>
                              <span className="text-slate-900 font-extrabold text-sm block">{paper.paperCode}</span>
                              <span className="text-[10px] text-slate-500 block">{paper.paperName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-slate-700 block truncate max-w-[150px]">{paper.subjectName}</span>
                          <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">
                            Max: {paper.maxMarks} | Qs: {paper.totalQuestions} | Catch: {paper.catchNo}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {paper.isSectionsConfigured ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Configured
                              </span>
                              {missingQp && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 whitespace-nowrap">
                                  <AlertCircle size={10} /> Missing Q.P
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                              Unconfigured
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={userType === 'admin' 
                                ? `/admin/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`
                                : `/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1 border border-indigo-100"
                              title="Manual Section Configuration"
                            >
                              <Layers size={10} /> Sections
                            </Link>
                            <button
                              onClick={() => openAllocationModal(paper)}
                              className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1 border border-orange-100"
                            >
                              <Users size={10} /> Assign
                            </button>
                            <button
                              onClick={() => handleEdit(paper)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Pagination controls from useTable logic */}
              <TablePagination 
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                setPage={setPage}
                setPageSize={setPageSize}
              />
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Bulk Configuration Modal */}
        {/* ------------------------------------------------------------------ */}
        {showBulkConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Bulk Configure Sections</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Applying to {selectedPaperIds.length} papers</p>
                </div>
                <button onClick={() => setShowBulkConfigModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleBulkConfigSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Section Name</label>
                    <input type="text" value={bulkConfigData.name} onChange={e => setBulkConfigData({...bulkConfigData, name: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Questions</label>
                    <input type="number" value={bulkConfigData.totalQuestions} onChange={e => setBulkConfigData({...bulkConfigData, totalQuestions: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" required min="1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Question No.</label>
                    <input type="number" value={bulkConfigData.startQuestion} onChange={e => setBulkConfigData({...bulkConfigData, startQuestion: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" required min="1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Question No.</label>
                    <input type="number" value={bulkConfigData.endQuestion} onChange={e => setBulkConfigData({...bulkConfigData, endQuestion: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" required min="1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Marks</label>
                    <input type="number" value={bulkConfigData.totalMarks} onChange={e => setBulkConfigData({...bulkConfigData, totalMarks: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" required min="1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Questions to Attempt</label>
                    <input type="number" value={bulkConfigData.maxQuestionsToAttempt} onChange={e => setBulkConfigData({...bulkConfigData, maxQuestionsToAttempt: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" required min="1" />
                  </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description (Optional)</label>
                    <textarea value={bulkConfigData.description} onChange={e => setBulkConfigData({...bulkConfigData, description: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" rows="2" />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowBulkConfigModal(false)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors">Apply to {selectedPaperIds.length} Papers</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Import Sections Modal */}
        {/* ------------------------------------------------------------------ */}
        {showImportSectionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Import Sections</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">To {selectedPaperIds.length} selected papers</p>
                </div>
                <button onClick={() => setShowImportSectionsModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleImportSectionsSubmit} className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-2 flex gap-3">
                   <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                   <p className="text-[10px] font-bold text-amber-800">
                     Warning: This will overwrite any existing sections on the target papers. Make sure the target papers share the same structure as the source paper.
                   </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Source Paper</label>
                  <select 
                    value={sourcePaperId} 
                    onChange={e => setSourcePaperId(e.target.value)} 
                    className="w-full text-sm font-semibold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                    required
                  >
                    <option value="">-- Select a configured paper --</option>
                    {papers.filter(p => p.isSectionsConfigured && !selectedPaperIds.includes(p.paperId)).map(p => (
                      <option key={p.paperId} value={p.paperId}>{p.paperCode} - {p.paperName}</option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowImportSectionsModal(false)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" disabled={importingSections} className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2">
                    {importingSections ? 'Importing...' : 'Confirm Import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Examiner Allocation Modal */}
        {/* ------------------------------------------------------------------ */}
        {showExaminerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Assign Examiners</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Allocation for {selectedPaper?.paperCode}: {selectedPaper?.paperName}</p>
                </div>
                <button onClick={() => setShowExaminerModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X size={20} className="text-slate-400 hover:text-slate-600" />
                </button>
                </div>

                <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Available Examiners */}
                    <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available Evaluators</h4>
                        <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-100">{availableExaminers.length} Found</span>
                    </div>
                    
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="text" placeholder="Search by name..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none" value={examinerSearchQuery} onChange={(e) => setExaminerSearchQuery(e.target.value)} />
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {allocationLoading ? (
                        <div className="text-center py-10 opacity-50 text-xs font-bold text-slate-500">Loading examiners...</div>
                        ) : availableExaminers.filter(ex => ex.name.toLowerCase().includes(examinerSearchQuery.toLowerCase()) && !assignedExaminers.some(a => a.examinerId === ex.id)).map(examiner => (
                        <div key={examiner.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-blue-50 border border-slate-100 group transition-all">
                            <div className="flex items-center gap-3">
                            <img src={examiner.profileImage || "https://ui-avatars.com/api/?name=" + examiner.name} alt="" className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
                            <div><p className="text-xs font-bold text-slate-800">{examiner.name}</p></div>
                            </div>
                            <button onClick={() => handleAssign(examiner.id)} className="p-1.5 bg-white text-blue-600 rounded-lg shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                            <UserPlus size={14} />
                            </button>
                        </div>
                        ))}
                    </div>
                    </div>

                    {/* Assigned Examiners */}
                    <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Assigned to Paper</h4>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {assignedExaminers.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                            <Users size={24} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No examiners assigned</p>
                        </div>
                        ) : (
                        assignedExaminers.map(assignment => (
                            <div key={assignment.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                <img src={assignment.examiner?.profileImage || "https://ui-avatars.com/api/?name=" + assignment.examiner?.name} alt="" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                                <div className="absolute -top-1 -right-1 bg-emerald-500 border-2 border-white w-3 h-3 rounded-full"></div>
                                </div>
                                <div>
                                <p className="text-xs font-bold text-blue-900">{assignment.examiner?.name}</p>
                                <p className="text-[9px] font-bold text-blue-600/70">Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button onClick={() => handleRemoveAssignment(assignment.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all">
                                <Trash2 size={14} />
                            </button>
                            </div>
                        ))
                        )}
                    </div>
                    </div>
                </div>
                </div>
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setShowExaminerModal(false)} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                    Done
                </button>
                </div>
            </div>
            </div>
        )}
      </div>
    </div>
  );
}
