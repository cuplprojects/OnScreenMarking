import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { 
  FileText, Plus, Edit2, UserPlus, X, Search, CheckCircle2, Trash2, 
  ChevronLeft, ChevronRight, ChevronDown, Filter, Users, BookOpen, Layers, Folder, AlertCircle, Copy, Upload, Info
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

const SubjectMultiSelect = ({ subjects, selectedSubjects, toggleSubject }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCount = selectedSubjects.length;

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-teal-500 cursor-pointer outline-none transition-colors"
      >
        <span className={selectedCount === 0 ? "text-gray-400" : "text-gray-900"}>
          {selectedCount === 0 ? "Select Subjects..." : `${selectedCount} subject(s) selected`}
        </span>
        <ChevronDown size={14} className="text-gray-500" />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar py-1">
          {subjects.length === 0 ? (
            <div className="px-4 py-3 text-xs text-gray-500 text-center font-semibold">No subjects available</div>
          ) : (
            subjects.map(s => (
              <label key={s.subjectId} className="flex items-center gap-3 cursor-pointer hover:bg-teal-50 px-4 py-2 transition-colors">
                <input 
                  type="checkbox" 
                  checked={selectedSubjects.includes(s.subjectId)} 
                  onChange={() => toggleSubject(s.subjectId)} 
                  className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer" 
                />
                <span className="text-gray-700 text-xs font-semibold">{s.subjectName}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default function PapersManagement({ isTab = false }) {
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
    if (!isTab) {
      const papersPath = userType === 'admin' ? '/admin/papers' : '/papers';
      setBreadcrumb([
        { label: 'Paper Management', path: papersPath, icon: 'FileText' }
      ]);
    }
  }, [userType, isTab, setBreadcrumb]);

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
         const subjectFilterVal = params.subjectName || '';
      if (subjectFilterVal) url += `&subjectId=${subjectFilterVal}`;
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

  // Subject Dropdown State
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [subjectSearchText, setSubjectSearchText] = useState("");
  const subjectDropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
        setIsSubjectDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const [sectionMasters, setSectionMasters] = useState([]);
  const [importSectionMode, setImportSectionMode] = useState('master'); // 'master' | 'paper'
  const [selectedMasterSectionIds, setSelectedMasterSectionIds] = useState([]);
  const [overwriteExistingSections, setOverwriteExistingSections] = useState(true);

  // Table Level Question Paper Upload State
  const [uploadingPaperId, setUploadingPaperId] = useState(null);
  const [activePaperForUpload, setActivePaperForUpload] = useState(null);
  const tableFileInputRef = React.useRef(null);

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

      try {
        const masters = await sectionService.getSectionMasters();
        setSectionMasters(masters || []);
        if (masters && masters.length > 0) {
          setSelectedMasterSectionIds(masters.map(m => m.id));
        }
      } catch (masterErr) {
        console.error("Failed to load section masters", masterErr);
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

    setImportingSections(true);
    try {
      if (importSectionMode === 'master') {
        if (selectedMasterSectionIds.length === 0) {
          message.error("Please select at least one Master Section to import");
          setImportingSections(false);
          return;
        }
        await sectionService.importMasterSections({
          targetPaperIds: selectedPaperIds,
          masterSectionIds: selectedMasterSectionIds,
          overwriteExisting: overwriteExistingSections
        });
        message.success("Master sections imported successfully");
      } else {
        if (!sourcePaperId) {
          message.error("Select a source paper");
          setImportingSections(false);
          return;
        }
        await sectionService.importSections({
          sourcePaperId: parseInt(sourcePaperId, 10),
          targetPaperIds: selectedPaperIds
        });
        message.success("Sections imported successfully");
      }
      setShowImportSectionsModal(false);
      setSelectedPaperIds([]);
      refreshTable();
    } catch (err) {
      message.error("Failed to import sections: " + (err.response?.data?.message || err.message));
    } finally {
      setImportingSections(false);
    }
  };

  // -------------------------------------------------------------
  // Table-Level Question Paper Upload Handlers
  // -------------------------------------------------------------
  const triggerTableUpload = (paper) => {
    setActivePaperForUpload(paper);
    if (tableFileInputRef.current) {
      tableFileInputRef.current.value = "";
      tableFileInputRef.current.click();
    }
  };

  const handleTableFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePaperForUpload) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      message.error("Please select a valid PDF file.");
      return;
    }

    const currentPaperId = activePaperForUpload.paperId;
    const currentProjectId = activePaperForUpload.projectId || projectId;

    setUploadingPaperId(currentPaperId);
    try {
      await paperService.uploadQuestionPaper(
        currentPaperId,
        currentProjectId,
        file
      );
      message.success("Question paper PDF uploaded successfully!");
      refreshTable();
    } catch (err) {
      message.error("Failed to upload question paper: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadingPaperId(null);
      setActivePaperForUpload(null);
    }
  };

  // -------------------------------------------------------------
  // Paper Creation/Editing
  // -------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) return message.error("Please select at least one subject");

    const targetProjectId = formData.projectId || projectId || (projects.length > 0 ? projects[0].projectId : null);
    if (!targetProjectId) return message.error("Please select a project");

    try {
      const payload = {
        ...formData,
        subjectIds: selectedSubjects.map(id => parseInt(id, 10)),
        projectId: parseInt(targetProjectId, 10),
        universityId: activeUniversityId ? parseInt(activeUniversityId, 10) : undefined,
        paperNumber: parseInt(formData.paperNumber, 10),
        maxMarks: parseFloat(formData.maxMarks),
        totalQuestions: formData.totalQuestions === "" ? 0 : parseInt(formData.totalQuestions, 10),
      };

      let savedPaperId = editingId;
      if (editingId) {
        await paperService.updatePaper(editingId, payload);
      } else {
        const res = await paperService.createPaper(payload);
        savedPaperId = res?.paperId || res?.id || res;
      }

      if (savedPaperId && selectedMasterSectionIds.length > 0) {
        try {
          await sectionService.savePaperMasterSections(savedPaperId, selectedMasterSectionIds);
          await sectionService.importMasterSections({
            targetPaperIds: [savedPaperId],
            masterSectionIds: selectedMasterSectionIds,
            overwriteExisting: false
          });
        } catch (secErr) {
          console.error("Failed to map/import master sections to paper", secErr);
        }
      }

      handleCancel();
      refreshTable();
      message.success("Paper and sections saved successfully");
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
            catchNo: fullPaper.catchNo || "", projectId: fullPaper.projectId ? String(fullPaper.projectId) : (projectId || ""), 
            isActive: fullPaper.isActive,
            questionPaperPdfUrl: fullPaper.questionPaperPdfUrl || "",
        });
        if (fullPaper.subjectPapers && fullPaper.subjectPapers.length > 0) {
            setSelectedSubjects(fullPaper.subjectPapers.map(sp => sp.subjectId));
        }

        try {
          const mappedMasters = await sectionService.getPaperMasterSections(fullPaper.paperId);
          if (Array.isArray(mappedMasters) && mappedMasters.length > 0) {
            setSelectedMasterSectionIds(mappedMasters.map(m => m.id));
          }
        } catch (e) { console.error(e); }

        setEditingId(fullPaper.paperId);
        setShowForm(true);
    } catch (err) {
        message.error("Failed to fetch paper details");
    }
  };

  const handleCancel = () => {
    setFormData({
      paperCode: "", paperName: "", paperNumber: 1, maxMarks: 100, totalQuestions: "", description: "", 
      catchNo: "", projectId: projectId || (projects.length > 0 ? String(projects[0].projectId) : ""), 
      isActive: true, questionPaperPdfUrl: "",
    });
    setSelectedSubjects([]);
    if (sectionMasters.length > 0) {
      setSelectedMasterSectionIds(sectionMasters.map(m => m.id));
    }
    setEditingId(null);
    setIsSubjectDropdownOpen(false);
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
      refreshTable();
    } catch (err) {
      message.error("Failed to assign examiner");
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await apiCall(`/PaperExaminers/remove/${assignmentId}`, { method: 'DELETE' });
      setAssignedExaminers(prev => prev.filter(a => a.id !== assignmentId));
      message.success("Examiner removed successfully");
      refreshTable();
    } catch (err) {
      message.error("Failed to remove examiner");
    }
  };

  const closeExaminerModal = () => {
    setShowExaminerModal(false);
    refreshTable();
  };

  const SortHeader = ({ label, field, isCenter = false, hasFilter = false }) => {
    const isSorted = sortField === field;
    return (
      <th onClick={() => handleSort(field)} className={`px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none ${isCenter ? 'text-center' : ''}`}>
        <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : ''}`}>
          <span>{label}</span>
          <span className="text-[9px] text-gray-400">{isSorted ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>
          {hasFilter && !customFilter && (
            <ColumnFilter columnKey={field} currentFilter={filters[field]} setFilter={setFilter} placeholder={`Filter ${label.toLowerCase()}...`} options={filterOptions} />
          )}
          {customFilter && (
            <div onClick={(e) => e.stopPropagation()} className="ml-1">
              {customFilter}
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12 w-full">
      <div className="bg-white border-b border-gray-200 px-6 lg:px-10 py-6 mb-6 shadow-sm sticky top-0 z-20">
        <ProjectConfigHeader />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="p-2.5 hover:bg-gray-100 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 transition">
              <ChevronLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-black text-gray-900 mt-1 flex items-center gap-2 leading-tight">
                <FileText className="text-teal-700" size={18} /> Papers Management
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            {projectId && (
              <>
                <button
                  onClick={() => {
                    const importPath = userType === 'admin' ? '/admin/import-papers' : '/import-papers';
                    navigate(`${importPath}?projectId=${encryptedProjectId}&universityId=${activeUniversityId}`);
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Folder size={13} /> Import Papers (From Project)
                </button>
                <button
                  onClick={() => {
                    const importQpPath = userType === 'admin' ? '/admin/import-question-papers' : '/import-question-papers';
                    navigate(`${importQpPath}?projectId=${encryptedProjectId}&universityId=${activeUniversityId}`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl border border-emerald-500 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Upload size={13} /> Bulk Import Q.P. (Catch-wise)
                </button>
              </>
            )}
            {selectedPaperIds.length > 0 && (
              <button
                onClick={() => setShowImportSectionsModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl border border-amber-500 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Layers size={13} /> Allocate Sections to Selected ({selectedPaperIds.length})
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className={`font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm border ${
                showForm ? "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200" : "bg-teal-700 hover:bg-teal-800 text-white border-teal-600"
              }`}
            >
              {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? "Cancel" : "Add Paper"}
            </button>
          </div>
        </div>
      </div>

      {(!projectId && !isTab) ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-black text-gray-900 mb-2">Select a Project</h3>
          <p className="text-sm font-semibold text-gray-500">
            Please select a project from the dropdown above to view its papers and sections.
          </p>
        </div>
      ) : (
        <>
      {/* Heading is now handled by ProjectConfigHeader in ProjectDashboard */}

          <div className="w-full space-y-4">
        
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center shadow-xs">
                    {editingId ? <Edit2 size={16} /> : <Plus size={16} />}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">
                      {editingId ? "Edit Paper Configuration" : "Create New Paper"}
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">Configure paper metadata and subject mappings</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-all"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Code, Name, Catch No */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">
                      Paper Code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.paperCode} 
                      onChange={(e) => setFormData({ ...formData, paperCode: e.target.value })} 
                      className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium" 
                      placeholder="e.g. MATH-101"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">
                      Paper Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.paperName} 
                      onChange={(e) => setFormData({ ...formData, paperName: e.target.value })} 
                      className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium" 
                      placeholder="e.g. Mathematics-I"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">Catch Number</label>
                    <input 
                      type="text" 
                      value={formData.catchNo} 
                      onChange={(e) => setFormData({ ...formData, catchNo: e.target.value })} 
                      className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium" 
                      placeholder="e.g. C-4501"
                    />
                  </div>
                </div>

                {/* Row 2: Subjects Multi-Select Dropdown & Project Select (if no project in URL context) */}
                <div className={`grid grid-cols-1 ${!projectId ? 'sm:grid-cols-2' : ''} gap-3.5`}>
                  {/* Multi-Select Subjects Dropdown */}
                  <div className="relative" ref={subjectDropdownRef}>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">
                      Subjects ({selectedSubjects.length} selected) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                      className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium flex items-center justify-between shadow-2xs"
                    >
                      <span className="truncate">
                        {selectedSubjects.length === 0 ? (
                          <span className="text-gray-400 font-normal">Select subjects...</span>
                        ) : (
                          <span className="text-teal-800 font-semibold">
                            {selectedSubjects.length === 1 
                              ? subjects.find(s => s.subjectId === selectedSubjects[0])?.subjectName || "1 Subject Selected"
                              : `${selectedSubjects.length} Subjects Selected`
                            }
                          </span>
                        )}
                      </span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isSubjectDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isSubjectDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                          <Search size={13} className="text-gray-400" />
                          <input 
                            type="text" 
                            placeholder="Search subjects..."
                            value={subjectSearchText}
                            onChange={(e) => setSubjectSearchText(e.target.value)}
                            className="w-full bg-transparent text-xs text-gray-800 outline-none placeholder-gray-400"
                          />
                          {subjectSearchText && (
                            <button type="button" onClick={() => setSubjectSearchText("")} className="text-gray-400 hover:text-gray-600">
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] px-1 text-gray-500 font-medium">
                          <span>{selectedSubjects.length} selected</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSubjects(subjects.map(s => s.subjectId))}
                              className="text-teal-700 hover:underline font-semibold"
                            >
                              Select All
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => setSelectedSubjects([])}
                              className="text-gray-500 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                          {subjects.filter(s => (s.subjectName || "").toLowerCase().includes(subjectSearchText.toLowerCase())).length === 0 ? (
                            <div className="text-xs text-gray-400 py-2 text-center">No subjects found</div>
                          ) : (
                            subjects
                              .filter(s => (s.subjectName || "").toLowerCase().includes(subjectSearchText.toLowerCase()))
                              .map(s => {
                                const isSelected = selectedSubjects.includes(s.subjectId);
                                return (
                                  <label 
                                    key={s.subjectId}
                                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-all ${
                                      isSelected ? "bg-teal-50 text-teal-900 font-medium" : "hover:bg-gray-50 text-gray-700"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSubject(s.subjectId)}
                                      className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                    />
                                    <span className="truncate">{s.subjectName}</span>
                                  </label>
                                );
                              })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Project Select (Only shown if page is not already scoped to a specific project) */}
                  {!projectId && (
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">
                        Project <span className="text-red-500">*</span>
                      </label>
                      <select 
                        value={formData.projectId} 
                        onChange={(e) => handleProjectChange(e.target.value)} 
                        className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium" 
                        required
                      >
                        <option value="">Select Project</option>
                        {projects.map((p) => (
                          <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Selected Subjects Badges Display (Quick View) */}
                {selectedSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedSubjects.map(subId => {
                      const sub = subjects.find(s => s.subjectId === subId);
                      if (!sub) return null;
                      return (
                        <span 
                          key={subId} 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-semibold"
                        >
                          {sub.subjectName}
                          <button 
                            type="button" 
                            onClick={() => toggleSubject(subId)}
                            className="hover:text-teal-900 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Row 3: Paper Number, Max Marks, Total Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">Paper Number</label>
                    <input 
                      type="number" 
                      value={formData.paperNumber} 
                      onChange={(e) => setFormData({ ...formData, paperNumber: e.target.value })} 
                      className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium" 
                      placeholder="1"
                      min="1" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">Max Marks</label>
                    <input 
                      type="number" 
                      value={formData.maxMarks} 
                      onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })} 
                      className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium" 
                      placeholder="100"
                      min="0" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">Total Questions</label>
                    <input 
                      type="number" 
                      value={formData.totalQuestions} 
                      onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })} 
                      className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium" 
                      placeholder="10"
                      min="0" 
                    />
                  </div>
                </div>

                {/* Row 4: Description */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1">Description</label>
                  <input 
                    type="text" 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="w-full bg-gray-50/70 border border-gray-200 text-gray-900 text-xs px-3 py-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none font-medium" 
                    placeholder="Brief description or guidelines (optional)..." 
                  />
                </div>

                {/* Row 5: Master Section Mappings */}
                {sectionMasters.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600">
                        Master Sections ({selectedMasterSectionIds.length} selected)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedMasterSectionIds.length === sectionMasters.length) {
                            setSelectedMasterSectionIds([]);
                          } else {
                            setSelectedMasterSectionIds(sectionMasters.map(m => m.id));
                          }
                        }}
                        className="text-[10px] font-bold text-teal-700 hover:underline"
                      >
                        {selectedMasterSectionIds.length === sectionMasters.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="bg-gray-50/70 border border-gray-200 rounded-lg p-2 max-h-[85px] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {sectionMasters.map((m) => {
                          const isSelected = selectedMasterSectionIds.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs cursor-pointer select-none transition-all ${
                                isSelected
                                  ? "bg-teal-50 border-teal-300 text-teal-900 font-semibold"
                                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100/50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedMasterSectionIds(prev =>
                                    prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                  );
                                }}
                                className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                              />
                              <span className="truncate text-[11px]">{m.name} ({m.totalMarks}M)</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={handleCancel} 
                    className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {editingId ? <Edit2 size={13} /> : <Plus size={13} />}
                    {editingId ? "Update Configuration" : "Save Paper"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Papers Main Table Area */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/40">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search papers by name/code..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-64 shadow-sm"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 justify-end">
              {/* Bulk Actions */}
              {selectedPaperIds.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300 mr-2 sm:mr-4 border-r border-gray-200 pr-2 sm:pr-4">
                  <span className="text-xs font-bold text-gray-500 hidden sm:inline-block mr-2">{selectedPaperIds.length} Selected</span>
                  <button
                    onClick={() => setShowBulkConfigModal(true)}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-2 rounded-md transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Layers size={13} /> <span className="hidden sm:inline">Bulk Configure</span>
                  </button>
                  <button
                    onClick={() => setShowImportSectionsModal(true)}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-2 rounded-md transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Copy size={13} /> <span className="hidden sm:inline">Import</span>
                  </button>
                </div>
              )}

              {projectId && (
                <button
                  onClick={() => setShowBulkConfigModal(true)}
                  className="font-bold text-[10px] uppercase tracking-wider px-3 py-2.5 rounded-md transition-colors flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm whitespace-nowrap"
                >
                  <Settings size={12} /> Add Default Sections
                </button>
              )}
              {projectId && (
                <button
                  onClick={() => {
                    const importPath = userType === 'admin' ? '/admin/import-papers' : '/import-papers';
                    navigate(`${importPath}?projectId=${encryptedProjectId}&universityId=${activeUniversityId}`);
                  }}
                  className="bg-teal-50 hover:bg-teal-100 text-teal-700 font-extrabold text-[10px] uppercase tracking-wider px-3 py-2.5 rounded-md border border-teal-200 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                >
                  <Folder size={13} /> Import Papers <span className="hidden xl:inline">(From Project)</span>
                </button>
              )}
              <button
                onClick={() => {
                  setFormData({
                    paperCode: "", paperName: "", paperNumber: 1, maxMarks: 100, totalQuestions: "", description: "", 
                    catchNo: "", projectId: projectId || "", isActive: true, questionPaperPdfUrl: "",
                  });
                  setSelectedSubjects([]);
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-md transition-all flex items-center gap-1.5 shadow-sm border whitespace-nowrap bg-teal-700 hover:bg-teal-800 text-white border-teal-600"
              >
                <Plus size={13} /> Add Paper
              </button>
            </div>
          </div>

          {tableLoading && papers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading Papers...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="p-16 text-center">
              <FileText size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">No Papers Found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 w-12 text-center border-b border-gray-100">
                      <input 
                        type="checkbox" 
                        checked={selectedPaperIds.length === papers.length && papers.length > 0} 
                        onChange={toggleSelectAll} 
                        className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 cursor-pointer w-4 h-4"
                      />
                    </th>
                    <SortHeader label="Code & Name" field="paperCode" hasFilter={true} />
                    <SortHeader label="Subject & Max" field="subjectName" hasFilter={true} />
                    <th className="px-5 py-3.5 text-center border-b border-gray-100">Question Paper</th>
                    <th className="px-5 py-3.5 text-center border-b border-gray-100">Configuration Status</th>
                    <th className="px-5 py-3.5 text-right border-b border-gray-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                  {papers.map((paper) => {
                    const isSelected = selectedPaperIds.includes(paper.paperId);
                    // Determine warning state
                    const missingQp = paper.isSectionsConfigured && !paper.questionPaperPdfUrl;

                    return (
                      <tr key={paper.paperId} className={`hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-teal-50/30' : ''}`}>
                        <td className="px-5 py-2.5 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectPaper(paper.paperId)}
                            className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-black shrink-0">
                              {paper.paperCode.substring(0, 2)}
                            </div>
                            <div>
                              <span className="text-gray-900 font-extrabold text-sm block">{paper.paperCode}</span>
                              <span className="text-[10px] text-gray-500 block">{paper.paperName}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className="text-gray-700 block truncate max-w-[150px]">{paper.subjectName}</span>
                          <div className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">
                            Max: {paper.maxMarks} | Qs: {paper.totalQuestions} | Catch: {paper.catchNo}
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-center">
                          {paper.questionPaperPdfUrl ? (
                            <a
                              href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${paper.questionPaperPdfUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
                              title="View Question Paper PDF"
                            >
                              <FileText size={13} className="text-emerald-600" />
                              View PDF
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerTableUpload(paper)}
                              disabled={uploadingPaperId === paper.paperId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors shadow-sm"
                              title="Upload Question Paper PDF"
                            >
                              {uploadingPaperId === paper.paperId ? (
                                <span className="flex items-center gap-1 text-teal-600 animate-pulse">
                                  <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin inline-block"></span>
                                  Uploading...
                                </span>
                              ) : (
                                <>
                                  <Upload size={12} />
                                  Upload PDF
                                </>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-center">
                          {(() => {
                            const missingReasons = [];
                            const statusDetails = [];

                            const hasSections = !!paper.isSectionsConfigured && (paper.sectionsCount || 0) > 0;
                            const marksMatch = hasSections && (paper.maxMarks > 0 ? paper.configuredMarks === paper.maxMarks : true);
                            const hasEvaluators = (paper.expertsCount || 0) > 0;
                            const hasQp = !!paper.questionPaperPdfUrl;

                            if (!hasSections) {
                              missingReasons.push("No sections configured for this paper");
                              statusDetails.push({ label: "Sections", ok: false, text: "0 sections created" });
                            } else if (!marksMatch) {
                              const diff = (paper.maxMarks || 0) - (paper.configuredMarks || 0);
                              const diffText = diff > 0 ? `${diff} marks pending` : `${Math.abs(diff)} marks exceeded`;
                              missingReasons.push(`Section marks (${paper.configuredMarks || 0}) don't equal Max Marks (${paper.maxMarks || 0}) - ${diffText}`);
                              statusDetails.push({ 
                                label: "Section Marks", 
                                ok: false, 
                                text: `${paper.sectionsCount} section(s), ${paper.configuredMarks || 0}/${paper.maxMarks} marks (${diffText})` 
                              });
                            } else {
                              statusDetails.push({ 
                                label: "Sections & Marks", 
                                ok: true, 
                                text: `${paper.sectionsCount} section(s), ${paper.configuredMarks}/${paper.maxMarks} marks matched` 
                              });
                            }

                            if (!hasEvaluators) {
                              missingReasons.push("No evaluators / examiners assigned");
                              statusDetails.push({ label: "Evaluators", ok: false, text: "0 evaluators assigned" });
                            } else {
                              statusDetails.push({ label: "Evaluators", ok: true, text: `${paper.expertsCount} evaluator(s) assigned` });
                            }

                            if (!hasQp) {
                              missingReasons.push("Question Paper PDF not uploaded");
                              statusDetails.push({ label: "Question Paper", ok: false, text: "PDF not uploaded" });
                            } else {
                              statusDetails.push({ label: "Question Paper", ok: true, text: "PDF uploaded" });
                            }

                            let sectionBadge = "Unconfigured";
                            let sectionBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";

                            if (hasSections && marksMatch) {
                              sectionBadge = "Configured";
                              sectionBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                            } else if (hasSections && !marksMatch) {
                              sectionBadge = `Marks (${paper.configuredMarks || 0}/${paper.maxMarks})`;
                              sectionBadgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                            }

                            const tooltipTitle = missingReasons.length > 0 
                              ? `Configuration Status:\n• ` + missingReasons.join("\n• ")
                              : "Configuration complete: Sections, Marks, Evaluators and Question Paper are fully configured.";

                            const isFullyReady = missingReasons.length === 0;

                            return (
                              <div className="relative group inline-flex flex-col items-center gap-1 cursor-help" title={tooltipTitle}>
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${sectionBadgeColor}`}>
                                    {sectionBadge}
                                    <Info size={10} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                                  </span>
                                </div>
                                
                                {paper.expertsCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-teal-700 bg-teal-50 border border-teal-100 whitespace-nowrap">
                                    <Users size={9} /> {paper.expertsCount} Evaluator{paper.expertsCount > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-400 bg-gray-50 border border-gray-100 whitespace-nowrap">
                                    No Evaluator
                                  </span>
                                )}

                                {missingQp && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 whitespace-nowrap">
                                    <AlertCircle size={9} /> Missing Q.P
                                  </span>
                                )}

                                {/* Floating Tooltip Breakdown */}
                                <div className="hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900/95 backdrop-blur-sm text-white text-left rounded-xl shadow-2xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150 border border-gray-700">
                                  <div className="flex items-center justify-between border-b border-gray-800 pb-1.5 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-300 flex items-center gap-1">
                                      <Info size={12} className="text-teal-400" /> Configuration Breakdown
                                    </span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${isFullyReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                      {isFullyReady ? 'Ready' : 'Pending'}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {statusDetails.map((item, idx) => (
                                      <div key={idx} className="flex items-start gap-1.5 text-[10px]">
                                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 font-bold text-[8px] mt-0.5 ${item.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                          {item.ok ? '✓' : '✕'}
                                        </span>
                                        <div className="leading-tight flex-1">
                                          <span className="font-bold text-gray-200 block">{item.label}</span>
                                          <span className={item.ok ? 'text-gray-400 text-[9px]' : 'text-rose-300 text-[9px]'}>{item.text}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {missingReasons.length > 0 && (
                                    <div className="mt-2 pt-1.5 border-t border-gray-800 text-[9px] text-amber-300/90 leading-tight">
                                      <span className="font-bold text-amber-300">Why Unconfigured:</span>
                                      <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-gray-300">
                                        {missingReasons.map((reason, rIdx) => (
                                          <li key={rIdx}>{reason}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900/95"></div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={userType === 'admin' 
                                ? `/admin/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`
                                : `/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`}
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1 border border-teal-200"
                              title="Manual Section Configuration"
                            >
                              <Layers size={10} /> Sections
                            </Link>
                            <button
                              onClick={() => openAllocationModal(paper)}
                              className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1 border border-teal-200"
                            >
                              <Users size={10} /> Assign
                            </button>
                            <button
                              onClick={() => handleEdit(paper)}
                              className="p-1.5 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Bulk Configure Sections</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Applying to {selectedPaperIds.length} papers</p>
                </div>
                <button onClick={() => setShowBulkConfigModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleBulkConfigSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Section Name</label>
                    <input type="text" value={bulkConfigData.name} onChange={e => setBulkConfigData({...bulkConfigData, name: e.target.value})} className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Questions</label>
                    <input type="number" value={bulkConfigData.totalQuestions} onChange={e => setBulkConfigData({...bulkConfigData, totalQuestions: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" required min="1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Start Question No.</label>
                    <input type="number" value={bulkConfigData.startQuestion} onChange={e => setBulkConfigData({...bulkConfigData, startQuestion: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" required min="1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">End Question No.</label>
                    <input type="number" value={bulkConfigData.endQuestion} onChange={e => setBulkConfigData({...bulkConfigData, endQuestion: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" required min="1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Marks</label>
                    <input type="number" value={bulkConfigData.totalMarks} onChange={e => setBulkConfigData({...bulkConfigData, totalMarks: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" required min="1" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Questions to Attempt</label>
                    <input type="number" value={bulkConfigData.maxQuestionsToAttempt} onChange={e => setBulkConfigData({...bulkConfigData, maxQuestionsToAttempt: parseInt(e.target.value)})} className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" required min="1" />
                  </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description (Optional)</label>
                    <textarea value={bulkConfigData.description} onChange={e => setBulkConfigData({...bulkConfigData, description: e.target.value})} className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none" rows="2" />
                </div>
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button type="button" onClick={() => setShowBulkConfigModal(false)} className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-md transition-colors">Apply to {selectedPaperIds.length} Papers</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Import Sections Modal */}
        {/* ------------------------------------------------------------------ */}
        {showImportSectionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Import Sections</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Applying to {selectedPaperIds.length} selected paper(s)</p>
                </div>
                <button onClick={() => setShowImportSectionsModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-gray-200 bg-gray-50/50 px-6 pt-3 gap-4">
                <button
                  type="button"
                  onClick={() => setImportSectionMode('master')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    importSectionMode === 'master'
                      ? 'border-teal-700 text-teal-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Layers size={14} /> Master Sections
                </button>
                <button
                  type="button"
                  onClick={() => setImportSectionMode('paper')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    importSectionMode === 'paper'
                      ? 'border-teal-700 text-teal-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Copy size={14} /> From Configured Paper
                </button>
              </div>

              <form onSubmit={handleImportSectionsSubmit} className="p-6 space-y-4">
                {importSectionMode === 'master' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600">
                      Select predefined master section structures to automatically generate and assign sections to the chosen papers.
                    </p>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {sectionMasters.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No master sections available.</p>
                      ) : (
                        sectionMasters.map(master => {
                          const isChecked = selectedMasterSectionIds.includes(master.id);
                          return (
                            <label
                              key={master.id}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                isChecked ? 'bg-teal-50/60 border-teal-300' : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMasterSectionIds(prev => [...prev, master.id]);
                                  } else {
                                    setSelectedMasterSectionIds(prev => prev.filter(id => id !== master.id));
                                  }
                                }}
                                className="mt-1 rounded border-gray-300 text-teal-700 focus:ring-teal-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-gray-900 text-sm">{master.name}</span>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                                    {master.totalMarks} Marks
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  Q{master.startQuestion} - Q{master.endQuestion} ({master.totalQuestions || (master.endQuestion - master.startQuestion + 1)} Questions) &bull; Attempt {master.maxQuestionsToAttempt}
                                </div>
                                {master.description && (
                                  <p className="text-[10px] text-gray-400 mt-1">{master.description}</p>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMasterSectionIds(sectionMasters.map(m => m.id))}
                        className="text-[11px] text-teal-700 font-bold hover:underline"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMasterSectionIds([])}
                        className="text-[11px] text-gray-500 font-bold hover:underline"
                      >
                        Clear Selection
                      </button>
                    </div>

                    <label className="flex items-center gap-2 pt-2 border-t border-gray-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overwriteExistingSections}
                        onChange={(e) => setOverwriteExistingSections(e.target.checked)}
                        className="rounded border-gray-300 text-teal-700 focus:ring-teal-500"
                      />
                      <span className="text-xs font-semibold text-gray-700">Overwrite existing sections on target papers</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex gap-3">
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-amber-800">
                        Warning: This will overwrite any existing sections on the target papers with the structure from the source paper.
                      </p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Source Paper</label>
                      <select 
                        value={sourcePaperId} 
                        onChange={e => setSourcePaperId(e.target.value)} 
                        className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none" 
                        required={importSectionMode === 'paper'}
                      >
                        <option value="">-- Select a configured paper --</option>
                        {papers.filter(p => p.isSectionsConfigured && !selectedPaperIds.includes(p.paperId)).map(p => (
                          <option key={p.paperId} value={p.paperId}>{p.paperCode} - {p.paperName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button type="button" onClick={() => setShowImportSectionsModal(false)} className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" disabled={importingSections} className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Assign Examiners</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Allocation for {selectedPaper?.paperCode}: {selectedPaper?.paperName}</p>
                </div>
                <button onClick={closeExaminerModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={20} className="text-gray-400 hover:text-gray-600" />
                </button>
                </div>

                <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Available Examiners */}
                    <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Available Evaluators</h4>
                        <span className="bg-teal-50 text-teal-700 text-[9px] font-black px-2 py-0.5 rounded-md border border-teal-100">{availableExaminers.length} Found</span>
                    </div>
                    
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input type="text" placeholder="Search by name..." className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none" value={examinerSearchQuery} onChange={(e) => setExaminerSearchQuery(e.target.value)} />
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {allocationLoading ? (
                        <div className="text-center py-10 opacity-50 text-xs font-bold text-gray-500">Loading examiners...</div>
                        ) : availableExaminers.filter(ex => ex.name.toLowerCase().includes(examinerSearchQuery.toLowerCase()) && !assignedExaminers.some(a => a.examinerId === ex.id)).map(examiner => (
                        <div key={examiner.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl hover:bg-teal-50 border border-gray-100 group transition-all">
                            <div className="flex items-center gap-3">
                            <img src={examiner.profileImage || "https://ui-avatars.com/api/?name=" + examiner.name} alt="" className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm" />
                            <div><p className="text-xs font-bold text-gray-800">{examiner.name}</p></div>
                            </div>
                            <button onClick={() => handleAssign(examiner.id)} className="p-1.5 bg-white text-teal-700 rounded-lg shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                            <UserPlus size={14} />
                            </button>
                        </div>
                        ))}
                    </div>
                    </div>

                    {/* Assigned Examiners */}
                    <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Assigned to Paper</h4>
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {assignedExaminers.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                            <Users size={24} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No examiners assigned</p>
                        </div>
                        ) : (
                        assignedExaminers.map(assignment => (
                            <div key={assignment.id} className="flex items-center justify-between p-3 bg-teal-50 border border-teal-100 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                <img src={assignment.examiner?.profileImage || "https://ui-avatars.com/api/?name=" + assignment.examiner?.name} alt="" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                                <div className="absolute -top-1 -right-1 bg-emerald-500 border-2 border-white w-3 h-3 rounded-full"></div>
                                </div>
                                <div>
                                <p className="text-xs font-bold text-teal-900">{assignment.examiner?.name}</p>
                                <p className="text-[9px] font-bold text-teal-700/70">Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button onClick={() => handleRemoveAssignment(assignment.id)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all">
                                <Trash2 size={14} />
                            </button>
                            </div>
                        ))
                        )}
                    </div>
                    </div>
                </div>
                </div>
                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                <button onClick={closeExaminerModal} className="bg-teal-700 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-teal-200 hover:bg-teal-800 transition-all">
                    Done
                </button>
                </div>
            </div>
            </div>
        )}
        {/* Hidden Table File Input for Question Paper Upload */}
        <input
          type="file"
          ref={tableFileInputRef}
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleTableFileChange}
        />
      </div>
        </>
      )}
    </div>
  );
}
