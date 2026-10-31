import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { 
  FileText, Plus, Edit2, UserPlus, X, Search, CheckCircle2, Trash2, 
  ChevronRight, ChevronDown, Filter, Users, BookOpen, Layers, Folder, AlertCircle, Copy, Upload, Info, Settings, Loader, FileCheck, Eye, UserCheck, Check, Download, AlertTriangle, Flag
} from "lucide-react";
import * as XLSX from "xlsx";
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

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const detectCatchHint = (filename) => {
  if (!filename) return '—';
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  const cleaned = withoutExt.replace(/^(catch|paper|qp)[_\-\s]*/i, '').trim();
  return cleaned || withoutExt;
};

export default function PapersManagement({ isTab = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get("projectId");
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  const subjectId = searchParams.get("subjectId");
  const universityId = searchParams.get("universityId");
  const statusFilterFromUrl = searchParams.get("statusFilter");
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
         let url = `/papers/dashboard-stats?projectId=${projectId}&page=${pageVal}&pageSize=${pageSizeVal}&search=${encodeURIComponent(searchVal)}&sortField=${sortFieldVal}&sortOrder=${sortOrderVal}&statusFilter=${statusFilterVal}`;
         const codeFilterVal = params.paperCode || '';
         if (codeFilterVal) url += `&paperCode=${encodeURIComponent(codeFilterVal)}`;
         const subjectFilterVal = params.subjectName || '';
         if (subjectFilterVal) {
           if (/^\d+$/.test(subjectFilterVal.trim())) {
             url += `&subjectId=${subjectFilterVal.trim()}`;
           } else {
             url += `&subjectName=${encodeURIComponent(subjectFilterVal.trim())}`;
           }
         }
         return apiCall(url);
      }
    }
    return Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 1 });
  }, [projectId, activeUniversityId]);

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
    initialParams: { 
      pageSize: 10,
      filters: { statusFilter: statusFilterFromUrl || '' }
    }
  });

  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [activeInnerTab, setActiveInnerTab] = useState('papers-sections'); // 'papers-sections' | 'import-papers' | 'bulk-import'

  // Import functionality state
  const [importProjects, setImportProjects] = useState([]);
  const [selectedSourceProject, setSelectedSourceProject] = useState('');
  const [importPapers, setImportPapers] = useState([]);
  const [selectedImportPaperIds, setSelectedImportPaperIds] = useState([]);
  const [loadingImportProjects, setLoadingImportProjects] = useState(false);
  const [loadingImportPapers, setLoadingImportPapers] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Pagination state for import papers
  const [importPage, setImportPage] = useState(1);
  const [importPageSize, setImportPageSize] = useState(10);
  const [importSearchTerm, setImportSearchTerm] = useState('');

  // Bulk import state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const totalQueueSize = useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [selectedFiles]);

  // Bulk Assign Examiner state
  const [bulkPapers, setBulkPapers] = useState([]);
  const [bulkExaminers, setBulkExaminers] = useState([]);
  const [assignedExaminersMap, setAssignedExaminersMap] = useState({}); // { [paperId]: [examinerId, ...] }
  const [bulkPaperSearch, setBulkPaperSearch] = useState('');
  const [bulkSubjectFilter, setBulkSubjectFilter] = useState('');
  const [bulkPage, setBulkPage] = useState(1);
  const [bulkPageSize, setBulkPageSize] = useState(10);
  const [loadingBulkData, setLoadingBulkData] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [openDropdownPaperId, setOpenDropdownPaperId] = useState(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [quickAssignExaminerId, setQuickAssignExaminerId] = useState('');

  // Excel bulk assignment state
  const [excelPreviewData, setExcelPreviewData] = useState(null);
  const [excelPreviewFilter, setExcelPreviewFilter] = useState('all'); // 'all' | 'matched' | 'multiple' | 'not_found'
  const [excelFileName, setExcelFileName] = useState('');
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [openPreviewDropdownKey, setOpenPreviewDropdownKey] = useState(null);
  const [previewDropdownSearch, setPreviewDropdownSearch] = useState('');
  const excelFileInputRef = useRef(null);
  const [previewSubjectFilter, setPreviewSubjectFilter] = useState('');


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
  const [pendingRemovals, setPendingRemovals] = useState([]);

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
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [showUploadConfirmModal, setShowUploadConfirmModal] = useState(false);
  const [isConfirmUploading, setIsConfirmUploading] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const tableFileInputRef = React.useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, [subjectId, projectId, activeUniversityId]);

  // Load import projects when switching to import tab
  useEffect(() => {
    const loadImportProjects = async () => {
      if (activeInnerTab !== 'import-papers') return;
      
      try {
        setLoadingImportProjects(true);
        const projs = await projectService.getAllProjects(activeUniversityId, { pageSize: 0 });
        const projectsData = projs?.items || projs || [];
        
        // Filter out current project and add master option
        const filteredProjects = projectsData.filter(p => String(p.projectId) !== String(projectId));
        const projectsWithMaster = [
          { projectId: 'master', projectName: 'Master Papers', isMaster: true },
          ...filteredProjects
        ];
        
        setImportProjects(projectsWithMaster);
      } catch (err) {
        console.error('Failed to load import projects:', err);
        setImportProjects([]);
      } finally {
        setLoadingImportProjects(false);
      }
    };

    if (activeInnerTab === 'import-papers') {
      loadImportProjects();
    }
  }, [activeInnerTab, activeUniversityId, projectId]);

  // Load papers from selected import project
  useEffect(() => {
    const loadImportPapers = async () => {
      if (!selectedSourceProject) {
        setImportPapers([]);
        return;
      }
      
      try {
        setLoadingImportPapers(true);
        let papersData = [];
        
        if (selectedSourceProject === 'master') {
          const res = await paperService.getPapers({ universityId: activeUniversityId, isMaster: true, pageSize: 0 });
          papersData = res.items || res;
        } else {
          const res = await paperService.getPapers({ projectId: selectedSourceProject, pageSize: 0 });
          papersData = res.items || res;
        }
        
        setImportPapers(papersData || []);
        setSelectedImportPaperIds([]);
      } catch (err) {
        console.error('Failed to load import papers:', err);
        setImportPapers([]);
      } finally {
        setLoadingImportPapers(false);
      }
    };
    
    loadImportPapers();
  }, [selectedSourceProject, activeUniversityId]);

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
  // Table-Level Question Paper Upload Handlers with Confirmation Modal
  // -------------------------------------------------------------
  const triggerTableUpload = (paper) => {
    setActivePaperForUpload(paper);
    if (tableFileInputRef.current) {
      tableFileInputRef.current.value = "";
      tableFileInputRef.current.click();
    }
  };

  const handleTableFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePaperForUpload) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      message.error("Please select a valid PDF file.");
      if (tableFileInputRef.current) tableFileInputRef.current.value = "";
      return;
    }

    setPendingUploadFile(file);
    setShowUploadConfirmModal(true);
    if (tableFileInputRef.current) tableFileInputRef.current.value = "";
  };


  const handleConfirmUpload = async () => {
    if (!pendingUploadFile || !activePaperForUpload) return;

    const currentPaperId = activePaperForUpload.paperId;
    const currentProjectId = activePaperForUpload.projectId || projectId;

    setIsConfirmUploading(true);
    setUploadingPaperId(currentPaperId);
    try {
      await paperService.uploadQuestionPaper(
        currentPaperId,
        currentProjectId,
        pendingUploadFile
      );
      message.success(`Question paper PDF uploaded successfully for ${activePaperForUpload.paperCode}!`);
      setShowUploadConfirmModal(false);
      setPendingUploadFile(null);
      setActivePaperForUpload(null);
      refreshTable();
    } catch (err) {
      message.error("Failed to upload question paper: " + (err.response?.data?.message || err.message));
    } finally {
      setIsConfirmUploading(false);
      setUploadingPaperId(null);
    }
  };

  const handleCancelUploadConfirm = () => {
    if (isConfirmUploading) return;
    setShowUploadConfirmModal(false);
    setPendingUploadFile(null);
    setActivePaperForUpload(null);
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
        } else if (paper.subjectId) {
            setSelectedSubjects([paper.subjectId]);
        } else if (fullPaper.subjectId) {
            setSelectedSubjects([fullPaper.subjectId]);
        } else {
            try {
                const paperSubjects = await paperService.getPaperSubjects(paper.paperId);
                if (paperSubjects && paperSubjects.length > 0) {
                    setSelectedSubjects(paperSubjects.map(s => s.subjectId));
                }
            } catch (e) {
                console.error("Failed to fetch paper subjects", e);
            }
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
      const projUniversityId = project?.universityId || paper.universityId || activeUniversityId;
      
      const fullPaper = await paperService.getPaperById(paper.paperId);
      const subIds = (fullPaper?.subjectIds && fullPaper.subjectIds.length > 0)
        ? fullPaper.subjectIds
        : (paper.subjectId ? [paper.subjectId] : (fullPaper?.subjectPapers?.map(sp => sp.subjectId) || []));
      
      let allExaminers = [];
      if (subIds.length > 0) {
        const examinerSets = await Promise.all(
          subIds.map(sId => apiCall(`/users/examiners?subjectId=${sId}${projUniversityId ? `&universityId=${projUniversityId}` : ''}`))
        );
        const examinerMap = new Map();
        examinerSets.forEach(examList => {
          if (Array.isArray(examList)) {
            examList.forEach(ex => {
              if (!examinerMap.has(ex.id)) examinerMap.set(ex.id, ex);
            });
          }
        });
        allExaminers = Array.from(examinerMap.values());
      } else {
        allExaminers = await apiCall(`/users/examiners${projUniversityId ? `?universityId=${projUniversityId}` : ''}`);
      }

      // Filter: get only those examiners with university id whose subject1 is same as paper's subject
      const filteredExaminers = allExaminers.filter(ex => {
        const matchesUni = !projUniversityId || ex.universityId === parseInt(projUniversityId);
        const matchesSub = subIds.length > 0 
          ? subIds.includes(ex.subjectId1)
          : (paper.subjectId ? ex.subjectId1 === parseInt(paper.subjectId) : true);
        return matchesUni && matchesSub;
      });

      setAvailableExaminers(filteredExaminers);

      const targetProjId = paper.projectId || projectId;
      let assigned = [];
      if (paper.projectPaperId) {
        assigned = await apiCall(`/PaperExaminers/project-paper/${paper.projectPaperId}`);
      } else if (targetProjId) {
        assigned = await apiCall(`/PaperExaminers/paper/${paper.paperId}?projectId=${targetProjId}`);
      } else {
        assigned = await apiCall(`/PaperExaminers/paper/${paper.paperId}`);
      }
      setAssignedExaminers(Array.isArray(assigned) ? assigned : []);
      setPendingRemovals([]);
    } catch (err) {
      console.error(err);
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleAssign = (examinerId) => {
    const examiner = availableExaminers.find(e => e.id === examinerId);
    if (examiner) {
      setAssignedExaminers(prev => [...prev, {
        id: `temp-${Date.now()}`,
        examinerId: examiner.id,
        examiner: examiner,
        isNew: true
      }]);
    }
  };

  const handleRemoveAssignment = (assignmentId, examinerId) => {
    if (assignmentId && !assignmentId.toString().startsWith('temp-')) {
      setPendingRemovals(prev => [...prev, assignmentId]);
    }
    setAssignedExaminers(prev => prev.filter(a => a.examinerId !== (examinerId || a.examiner?.id)));
  };

  const handleDone = async () => {
    setAllocationLoading(true);
    try {
      const newAssignments = assignedExaminers.filter(a => a.isNew);
      const targetProjId = selectedPaper?.projectId || projectId;
      const targetProjPaperId = selectedPaper?.projectPaperId;

      // When updating examiners (both removals and new assignments exist), use PUT endpoint
      // so unmarked scripts are transferred to the newly assigned examiner and marked scripts are preserved.
      const pairCount = Math.min(pendingRemovals.length, newAssignments.length);
      for (let i = 0; i < pairCount; i++) {
        await apiCall(`/PaperExaminers/${pendingRemovals[i]}`, {
          method: 'PUT',
          body: JSON.stringify({
            examinerId: newAssignments[i].examinerId,
            projectPaperId: targetProjPaperId,
            projectId: targetProjId ? parseInt(targetProjId, 10) : null
          })
        });
      }

      // Any remaining additions
      const remainingNew = newAssignments.slice(pairCount);
      if (remainingNew.length === 1) {
        await apiCall('/PaperExaminers/assign', {
          method: 'POST',
          body: JSON.stringify({
            paperId: selectedPaper?.paperId,
            projectPaperId: targetProjPaperId,
            projectId: targetProjId ? parseInt(targetProjId, 10) : null,
            examinerId: remainingNew[0].examinerId
          })
        });
      } else if (remainingNew.length > 1) {
        await apiCall('/PaperExaminers/bulk-assign', {
          method: 'POST',
          body: JSON.stringify({
            projectPaperIds: targetProjPaperId ? [targetProjPaperId] : undefined,
            paperIds: selectedPaper?.paperId ? [selectedPaper.paperId] : undefined,
            projectId: targetProjId ? parseInt(targetProjId, 10) : null,
            examinerIds: remainingNew.map(a => a.examinerId)
          })
        });
      }

      // Any remaining pure removals
      for (let i = pairCount; i < pendingRemovals.length; i++) {
        await apiCall(`/PaperExaminers/remove/${pendingRemovals[i]}`, { method: 'DELETE' });
      }

      if (newAssignments.length > 0 || pendingRemovals.length > 0) {
        message.success("Assignments updated successfully");
      }
      setShowExaminerModal(false);
      refreshTable();
    } catch (err) {
      message.error(err.message || "Failed to save some assignments");
    } finally {
      setAllocationLoading(false);
    }
  };

  const closeExaminerModal = () => {
    setShowExaminerModal(false);
    refreshTable();
  };

  // Import functionality handlers
  const handleImportSelectAll = () => {
    if (selectedImportPaperIds.length === importPapers.length && importPapers.length > 0) {
      setSelectedImportPaperIds([]);
    } else {
      setSelectedImportPaperIds(importPapers.map(p => p.paperId));
    }
  };

  const handleToggleImportPaper = (paperId) => {
    setSelectedImportPaperIds(prev => 
      prev.includes(paperId) 
        ? prev.filter(id => id !== paperId)
        : [...prev, paperId]
    );
  };

  // Filter and paginate import papers
  const getFilteredImportPapers = () => {
    let filtered = [...importPapers];
    
    if (importSearchTerm) {
      const query = importSearchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.paperName?.toLowerCase().includes(query) ||
        p.paperCode?.toLowerCase().includes(query) ||
        p.catchNo?.toLowerCase().includes(query)
      );
    }
    
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / importPageSize);
    const startIdx = (importPage - 1) * importPageSize;
    const paginatedPapers = filtered.slice(startIdx, startIdx + importPageSize);
    
    return { papers: paginatedPapers, totalCount, totalPages };
  };

  const handleImportPapers = async () => {
    if (selectedImportPaperIds.length === 0) return;

    setImporting(true);
    try {
      await paperService.importPapers({
        sourcePaperIds: selectedImportPaperIds,
        targetProjectId: projectId
      });
      message.success(`Successfully imported ${selectedImportPaperIds.length} papers`);
      
      // Switch back to papers-sections tab and refresh
      setActiveInnerTab('papers-sections');
      setSelectedImportPaperIds([]);
      refreshTable();
    } catch (err) {
      message.error("Failed to import papers: " + (err.response?.data?.message || err.message));
    } finally {
      setImporting(false);
    }
  };

  // Bulk import handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
      message.error('Please select valid PDF files');
      return;
    }
    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = files.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
      message.error('Please drop valid PDF files');
      return;
    }
    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = files.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
  };

  const removeFile = (fileToRemove) => {
    setSelectedFiles(prev => prev.filter(f => f !== fileToRemove));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const handleBulkUploadClick = () => {
    if (!projectId) {
      message.error('Please select a project before uploading');
      return;
    }
    if (selectedFiles.length === 0) {
      message.error('Please select at least one Question Paper PDF file');
      return;
    }
    setShowBulkConfirmModal(true);
  };

  const handleBulkUploadConfirm = async () => {
    setShowBulkConfirmModal(false);
    await handleBulkUpload();
  };

  const handleBulkUpload = async () => {
    if (!projectId) {
      message.error('Please select a project before uploading');
      return;
    }
    if (selectedFiles.length === 0) {
      message.error('Please select at least one Question Paper PDF file');
      return;
    }
    setIsUploading(true);
    try {
      const res = await paperService.bulkUploadQuestionPapers(projectId, selectedFiles);
      
      // Download failed QPs as Excel if there are any unmatched
      if (res.unmatchedCount > 0 && res.results) {
        const failedQPs = res.results.filter(r => r.status !== 'Success');
        if (failedQPs.length > 0) {
          const exportRows = failedQPs.map((qp, idx) => ({
            "S.No": idx + 1,
            "File Name": qp.fileName || '',
            "Detected Catch No": qp.catchNo || 'Not detected',
            "Status": qp.status || 'Failed',
            "Reason": qp.message || 'No matching paper found with this catch number'
          }));

          const ws = XLSX.utils.json_to_sheet(exportRows);
          ws['!cols'] = [
            { wch: 6 },   // S.No
            { wch: 35 },  // File Name
            { wch: 18 },  // Detected Catch No
            { wch: 12 },  // Status
            { wch: 45 }   // Reason
          ];

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Failed_QP_Upload");

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const fileName = `Failed_QP_Upload_${timestamp}.xlsx`;
          XLSX.writeFile(wb, fileName);
          
          message.warning(`${res.unmatchedCount} QP(s) failed to upload. Check downloaded Excel for details.`);
        }
      }
      
      // Clear everything after upload
      setSelectedFiles([]);
      
      if (res.matchedCount > 0) {
        message.success(`Successfully matched and allocated ${res.matchedCount} Question Paper(s)!`);
      } else {
        message.warning(`Uploaded ${res.totalFiles} files, but no paper Catch Number matches were found.`);
      }
      
      // Refresh the main papers table in case some PDFs were matched
      refreshTable();
    } catch (err) {
      message.error(err.message || 'Failed to bulk upload question papers');
    } finally {
      setIsUploading(false);
    }
  };

  // Bulk Assign Examiner loaders and handlers
  const loadBulkAssignData = useCallback(async () => {
    if (!projectId && !activeUniversityId) return;
    setLoadingBulkData(true);
    try {
      const proj = projects.find(p => p.projectId === parseInt(projectId));
      const targetUnivId = proj?.universityId || activeUniversityId;

      const [papersRes, examinersRes] = await Promise.all([
        projectId 
          ? apiCall(`/papers/dashboard-stats?projectId=${projectId}&page=1&pageSize=1000`)
          : Promise.resolve({ items: [] }),
        apiCall(`/users/examiners${targetUnivId ? `?universityId=${targetUnivId}` : ''}`)
      ]);

      const loadedPapers = papersRes?.items || [];
      const loadedExaminers = Array.isArray(examinersRes) ? examinersRes : (examinersRes?.items || []);
      
      console.log('loadBulkAssignData - Loaded Papers:', loadedPapers.length);
      console.log('loadBulkAssignData - Loaded Examiners count:', loadedExaminers.length);
      console.log('loadBulkAssignData - Loaded Examiners sample:', loadedExaminers.slice(0, 3));
      
      setBulkPapers(loadedPapers);
      setBulkExaminers(loadedExaminers);
    } catch (err) {
      console.error("Failed to load bulk assign data:", err);
      message.error("Failed to load papers or examiners");
    } finally {
      setLoadingBulkData(false);
    }
  }, [projectId, activeUniversityId, projects]);

  useEffect(() => {
    if (activeInnerTab === 'bulk-assign') {
      loadBulkAssignData();
    }
  }, [activeInnerTab, loadBulkAssignData]);

  // Click outside to close any open examiner dropdown
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (openDropdownPaperId && !e.target.closest('.examiner-dropdown-container')) {
        setOpenDropdownPaperId(null);
        setDropdownSearch('');
      }
      if (openPreviewDropdownKey && !e.target.closest('.preview-dropdown-container')) {
        setOpenPreviewDropdownKey(null);
        setPreviewDropdownSearch('');
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [openDropdownPaperId, openPreviewDropdownKey]);

  // Handle selecting / toggling examiner for a particular paper row
  const handleSelectExaminerForPaper = (paperId, examinerId) => {
    setAssignedExaminersMap(prev => {
      const current = prev[paperId] || [];
      const isAlreadySelected = current.includes(examinerId);
      const updated = isAlreadySelected 
        ? current.filter(id => id !== examinerId)
        : [...current, examinerId];
      
      if (updated.length === 0) {
        const next = { ...prev };
        delete next[paperId];
        return next;
      }
      return { ...prev, [paperId]: updated };
    });
  };

  const handleClearPaperExaminer = (paperId) => {
    setAssignedExaminersMap(prev => {
      const next = { ...prev };
      delete next[paperId];
      return next;
    });
  };

  // Quick apply an examiner to all visible unassigned papers
  const handleApplyToAllFiltered = (examinerId) => {
    if (!examinerId) return;
    const targetPapers = filteredBulkPapers.filter(p => (p.expertsCount || 0) === 0);
    if (targetPapers.length === 0) {
      message.info("No unassigned papers in current view.");
      return;
    }
    const newMap = { ...assignedExaminersMap };
    targetPapers.forEach(p => {
      newMap[p.paperId] = [parseInt(examinerId)];
    });
    setAssignedExaminersMap(newMap);
    message.info(`Assigned examiner to ${targetPapers.length} unassigned paper(s)`);
    setQuickAssignExaminerId('');
  };

  const handleCancelBulkAssignments = () => {
    setAssignedExaminersMap({});
    setOpenDropdownPaperId(null);
    setDropdownSearch('');
    message.info("Pending assignments reset.");
  };

  const handleSaveBulkAssignments = async () => {
    const entries = Object.entries(assignedExaminersMap).filter(([_, ids]) => ids && ids.length > 0);
    if (entries.length === 0) {
      message.warning("Please select an examiner for at least one paper before saving.");
      return;
    }

    setIsBulkAssigning(true);
    try {
      const examinerToPapers = {};
      entries.forEach(([paperIdStr, exIds]) => {
        const pId = parseInt(paperIdStr);
        exIds.forEach(exId => {
          if (!examinerToPapers[exId]) examinerToPapers[exId] = [];
          examinerToPapers[exId].push(pId);
        });
      });

      await Promise.all(
        Object.entries(examinerToPapers).map(([exIdStr, pIds]) =>
          apiCall('/paperexaminers/bulk-assign', {
            method: 'POST',
            body: {
              paperIds: pIds,
              examinerIds: [parseInt(exIdStr)],
              projectId: projectId ? parseInt(projectId, 10) : null
            }
          })
        )
      );

      message.success(`Successfully assigned examiners to ${entries.length} paper(s)!`);
      setAssignedExaminersMap({});
      setOpenDropdownPaperId(null);
      await loadBulkAssignData();
      refreshTable();
    } catch (err) {
      console.error(err);
      message.error("Error: " + (err.message || "Failed to save examiner assignments"));
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // ── EXCEL TEMPLATE DOWNLOAD HANDLER ─────────────────────────────────────────
  const handleDownloadExcelTemplate = () => {
    try {
      if (!bulkPapers || bulkPapers.length === 0) {
        message.error("No papers found in this project to export.");
        return;
      }

      // Always export only unassigned papers (filter by subject if active)
      const unassigned = bulkPapers.filter(p => (p.expertsCount || 0) === 0);
      const list = bulkSubjectFilter
        ? unassigned.filter(p => String(p.subjectId) === bulkSubjectFilter)
        : unassigned;

      const exportRows = list.map((p, idx) => ({
        "S.No": idx + 1,
        "Paper ID": p.paperId,
        "Paper Code": p.paperCode || '',
        "Paper Name": p.paperName || '',
        "Subject": p.subjectName || '',
        "Catch No": p.catchNo || '',
        "Max Marks": p.maxMarks || '',
        "Current Status": (p.expertsCount || 0) > 0 ? `Assigned (${p.expertsCount})` : "Unassigned",
        "Examiner Name": "" // To be filled manually by user
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws['!cols'] = [
        { wch: 6 },   // S.No
        { wch: 10 },  // Paper ID
        { wch: 16 },  // Paper Code
        { wch: 32 },  // Paper Name
        { wch: 22 },  // Subject
        { wch: 14 },  // Catch No
        { wch: 12 },  // Max Marks
        { wch: 18 },  // Current Status
        { wch: 30 }   // Examiner Name
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Examiner_Allocation");

      const currProj = projects.find(p => String(p.projectId) === String(projectId));
      const projName = (currProj?.projectName || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${projName}_Examiner_Allocation_Template.xlsx`;

      XLSX.writeFile(wb, fileName);
      message.success(`Downloaded template: ${fileName}`);
    } catch (err) {
      console.error("Failed to generate Excel template:", err);
      message.error("Failed to generate Excel template: " + (err.message || ''));
    }
  };

  // ── EXCEL UPLOAD & PARSER HANDLER ───────────────────────────────────────────
  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
      message.error("Please upload a valid Excel file (.xlsx, .xls) or CSV.");
      if (excelFileInputRef.current) excelFileInputRef.current.value = '';
      return;
    }

    // Check if examiners are loaded
    if (!bulkExaminers || bulkExaminers.length === 0) {
      message.error("Examiners data not loaded yet. Please wait a moment and try again.");
      if (excelFileInputRef.current) excelFileInputRef.current.value = '';
      return;
    }

    console.log('Excel Upload - bulkExaminers count:', bulkExaminers.length);
    console.log('Excel Upload - bulkExaminers sample:', bulkExaminers.slice(0, 3));

    setExcelFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          message.error("The uploaded Excel sheet contains no data rows.");
          if (excelFileInputRef.current) excelFileInputRef.current.value = '';
          return;
        }

        const firstRow = rawJson[0];
        const keys = Object.keys(firstRow);

        const idKey = keys.find(k => /paper\s*id/i.test(k) || /^id$/i.test(k));
        const codeKey = keys.find(k => /paper\s*code/i.test(k) || /^code$/i.test(k));
        const catchKey = keys.find(k => /catch/i.test(k));
        const examinerKey = keys.find(k => /examiner(\s*name)?/i.test(k) || /evaluator/i.test(k) || /expert/i.test(k));

        if (!examinerKey) {
          message.error("Could not find 'Examiner Name' column in Excel. Please use the downloaded template.");
          if (excelFileInputRef.current) excelFileInputRef.current.value = '';
          return;
        }

        const previewRows = [];

        rawJson.forEach((row, rowIndex) => {
          const rowId = idKey ? row[idKey] : null;
          const rowCode = codeKey ? String(row[codeKey]).trim() : '';
          const rowCatch = catchKey ? String(row[catchKey]).trim() : '';
          const rawExaminerName = String(row[examinerKey] || '').trim();

          // Match paper in bulkPapers
          let matchedPaper = null;
          if (rowId) {
            matchedPaper = bulkPapers.find(p => String(p.paperId) === String(rowId));
          }
          if (!matchedPaper && rowCode) {
            matchedPaper = bulkPapers.find(p => p.paperCode?.trim().toLowerCase() === rowCode.toLowerCase());
          }
          if (!matchedPaper && rowCatch) {
            matchedPaper = bulkPapers.find(p => p.catchNo?.trim() === rowCatch);
          }

          if (!matchedPaper) {
            // Paper does not belong to this project or not found
            return;
          }

          if (!rawExaminerName) {
            previewRows.push({
              key: `row-${rowIndex}-${matchedPaper.paperId}`,
              paper: matchedPaper,
              excelExaminerName: '',
              matchStatus: 'empty',
              candidates: [],
              selectedExaminerId: null
            });
            return;
          }

          const cleanInput = rawExaminerName.toLowerCase().replace(/^(dr\.|prof\.|dr|prof|mr\.|ms\.|mrs\.|mr|ms|mrs)\s+/i, '').trim();

          // 1. Exact full name match
          const exactMatches = bulkExaminers.filter(ex => 
            ex.name?.trim().toLowerCase() === rawExaminerName.toLowerCase()
          );

          let matchingExaminers = exactMatches;

          // 2. Title-normalized match (e.g. "John Doe" vs "Prof John Doe")
          if (matchingExaminers.length === 0) {
            const titleNormalizedMatches = bulkExaminers.filter(ex => {
              const exClean = (ex.name || '').toLowerCase().replace(/^(dr\.|prof\.|dr|prof|mr\.|ms\.|mrs\.|mr|ms|mrs)\s+/i, '').trim();
              return exClean === cleanInput;
            });
            if (titleNormalizedMatches.length > 0) {
              matchingExaminers = titleNormalizedMatches;
            }
          }

          // 3. Substring/partial match if still not found
          if (matchingExaminers.length === 0 && cleanInput.length >= 3) {
            const partialMatches = bulkExaminers.filter(ex => 
              (ex.name || '').toLowerCase().includes(cleanInput)
            );
            if (partialMatches.length > 0) {
              matchingExaminers = partialMatches;
            }
          }

          if (matchingExaminers.length === 1) {
            previewRows.push({
              key: `row-${rowIndex}-${matchedPaper.paperId}`,
              paper: matchedPaper,
              excelExaminerName: rawExaminerName,
              matchStatus: 'matched',
              candidates: matchingExaminers,
              selectedExaminerId: matchingExaminers[0].id
            });
          } else if (matchingExaminers.length > 1) {
            // Multiple examiners have the same name: Coordinator must choose from candidates
            previewRows.push({
              key: `row-${rowIndex}-${matchedPaper.paperId}`,
              paper: matchedPaper,
              excelExaminerName: rawExaminerName,
              matchStatus: 'multiple',
              candidates: matchingExaminers,
              selectedExaminerId: null
            });
          } else {
            previewRows.push({
              key: `row-${rowIndex}-${matchedPaper.paperId}`,
              paper: matchedPaper,
              excelExaminerName: rawExaminerName,
              matchStatus: 'not_found',
              candidates: bulkExaminers,
              selectedExaminerId: null
            });
          }
        });

        if (previewRows.length === 0) {
          message.warning("No matching project papers found in the uploaded Excel.");
          if (excelFileInputRef.current) excelFileInputRef.current.value = '';
          return;
        }

        setExcelPreviewData(previewRows);
        setExcelPreviewFilter('all');
        message.success(`Parsed ${previewRows.length} papers from Excel. Review allocations below!`);
      } catch (err) {
        console.error("Failed to parse Excel file:", err);
        message.error("Failed to read Excel file: " + (err.message || ''));
      } finally {
        if (excelFileInputRef.current) excelFileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSelectExaminerInPreview = (rowKey, examinerId) => {
    setExcelPreviewData(prev => {
      if (!prev) return prev;
      return prev.map(item => {
        if (item.key === rowKey) {
          return {
            ...item,
            selectedExaminerId: examinerId ? parseInt(examinerId) : null
          };
        }
        return item;
      });
    });
  };

  const handleConfirmExcelAssignments = async () => {
    if (!excelPreviewData) return;

    const rowsToAssign = excelPreviewData.filter(r => r.selectedExaminerId);

    if (rowsToAssign.length === 0) {
      message.warning("No examiners selected to assign. Please select examiners for the papers.");
      return;
    }

    const unresolvedMultiple = excelPreviewData.filter(r => r.matchStatus === 'multiple' && !r.selectedExaminerId);
    if (unresolvedMultiple.length > 0) {
      const proceed = window.confirm(
        `${unresolvedMultiple.length} paper(s) have multiple matching examiners that have not been selected and will be skipped. Do you want to proceed with assigning the remaining ${rowsToAssign.length} paper(s)?`
      );
      if (!proceed) return;
    }

    setIsUploadingExcel(true);
    try {
      const examinerToPapers = {};
      rowsToAssign.forEach(r => {
        const exId = r.selectedExaminerId;
        const pId = r.paper.paperId;
        if (!examinerToPapers[exId]) examinerToPapers[exId] = [];
        examinerToPapers[exId].push(pId);
      });

      await Promise.all(
        Object.entries(examinerToPapers).map(([exIdStr, pIds]) =>
          apiCall('/paperexaminers/bulk-assign', {
            method: 'POST',
            body: {
              paperIds: pIds,
              examinerIds: [parseInt(exIdStr)],
              projectId: projectId ? parseInt(projectId, 10) : null
            }
          })
        )
      );

      message.success(`Successfully assigned examiners to ${rowsToAssign.length} paper(s) from Excel!`);
      setExcelPreviewData(null);
      setExcelFileName('');
      await loadBulkAssignData();
      refreshTable();
    } catch (err) {
      console.error("Failed to commit Excel bulk assignments:", err);
      message.error("Failed to save assignments: " + (err.message || ''));
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const handleCancelExcelPreview = () => {
    setExcelPreviewData(null);
    setExcelPreviewFilter('all');
    setExcelFileName('');
    setOpenPreviewDropdownKey(null);
    setPreviewSubjectFilter('');
  };

  // Derive unique subjects (with id) from bulkPapers for the subject filter
  const bulkSubjectOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    bulkPapers.forEach(p => {
      if (p.subjectName && p.subjectId && !seen.has(p.subjectId)) {
        seen.add(p.subjectId);
        list.push({ label: p.subjectName, value: String(p.subjectId) });
      }
    });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [bulkPapers]);

  // When subject filter changes, reload examiners for that specific subject
  useEffect(() => {
    if (!bulkSubjectFilter) {
      // No subject selected – reload all examiners for the university (filtering happens per row)
      (async () => {
        try {
          const proj = projects.find(p => p.projectId === parseInt(projectId));
          const targetUnivId = proj?.universityId || activeUniversityId;
          const res = await apiCall(`/users/examiners${targetUnivId ? `?universityId=${targetUnivId}` : ''}`);
          setBulkExaminers(Array.isArray(res) ? res : (res?.items || []));
        } catch { /* silent */ }
      })();
    } else {
      // Subject selected – fetch examiners for that specific subject only
      (async () => {
        try {
          const proj = projects.find(p => p.projectId === parseInt(projectId));
          const targetUnivId = proj?.universityId || activeUniversityId;
          const univPart = targetUnivId ? `&universityId=${targetUnivId}` : '';
          const res = await apiCall(`/users/examiners?subjectId=${bulkSubjectFilter}${univPart}`);
          setBulkExaminers(Array.isArray(res) ? res : (res?.items || []));
        } catch { /* silent */ }
      })();
    }
  }, [bulkSubjectFilter, projectId, activeUniversityId, projects]);

  const previewSubjectOptions = useMemo(() => {
    if (!excelPreviewData) return [];
    const seen = new Set();
    const list = [];
    excelPreviewData.forEach(r => {
      const sub = r.subjectName || r.subject || '';
      if (sub && !seen.has(sub)) { seen.add(sub); list.push(sub); }
    });
    return list.sort();
  }, [excelPreviewData]);

  const filteredBulkPapers = bulkPapers.filter(p => {
    // Always show only unassigned papers
    if ((p.expertsCount || 0) > 0) return false;

    const matchesSearch = !bulkPaperSearch ||
      p.paperCode?.toLowerCase().includes(bulkPaperSearch.toLowerCase()) ||
      p.paperName?.toLowerCase().includes(bulkPaperSearch.toLowerCase()) ||
      p.subjectName?.toLowerCase().includes(bulkPaperSearch.toLowerCase()) ||
      p.catchNo?.toLowerCase().includes(bulkPaperSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (bulkSubjectFilter) {
      // bulkSubjectFilter stores the subjectId as string
      return String(p.subjectId) === bulkSubjectFilter;
    }

    return true;
  });

  const totalBulkCount = filteredBulkPapers.length;
  const totalBulkPages = Math.max(1, Math.ceil(totalBulkCount / bulkPageSize));

  const paginatedBulkPapers = useMemo(() => {
    const start = (bulkPage - 1) * bulkPageSize;
    return filteredBulkPapers.slice(start, start + bulkPageSize);
  }, [filteredBulkPapers, bulkPage, bulkPageSize]);

  useEffect(() => {
    setBulkPage(1);
  }, [bulkPaperSearch, bulkSubjectFilter]);

  useEffect(() => {
    if (bulkPage > totalBulkPages && totalBulkPages > 0) {
      setBulkPage(totalBulkPages);
    }
  }, [bulkPage, totalBulkPages]);

  const pendingAssignedCount = Object.keys(assignedExaminersMap).filter(pId => assignedExaminersMap[pId]?.length > 0).length;


  const SortHeader = ({ label, field, isCenter = false, hasFilter = false, customFilter, filterOptions }) => {
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
      {!isTab && (
        <div className="bg-white border-b border-gray-200 px-6 lg:px-10 pb-0 pt-6 shadow-sm sticky top-0 z-20">
          <ProjectConfigHeader />
        </div>
      )}

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

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 p-4 md:p-6">
              
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
                      <div className="grid sm:grid-cols-3 gap-2 grid-cols-1 md:grid-cols-2">
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
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${activeInnerTab === 'bulk-assign' ? 'overflow-visible' : 'overflow-hidden'}`}>
          {/* ── TOOLBAR: Tabs left | Actions right ── */}
          <div className="flex items-center border-b border-gray-100 bg-white">
            {/* LEFT: Tab switcher (always visible) */}
            {projectId && (
              <div className="flex items-stretch h-full shrink-0">
                <button
                  onClick={() => setActiveInnerTab('papers-sections')}
                  className={`flex items-center gap-2 px-5 py-4 text-xs font-extrabold tracking-wide border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    activeInnerTab === 'papers-sections'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <FileText size={13} className={activeInnerTab === 'papers-sections' ? 'text-teal-700' : 'text-gray-400'} />
                  Papers & Sections
                </button>
                <button
                  onClick={() => setActiveInnerTab('import-papers')}
                  className={`flex items-center gap-2 px-5 py-4 text-xs font-extrabold tracking-wide border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    activeInnerTab === 'import-papers'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Folder size={13} className={activeInnerTab === 'import-papers' ? 'text-teal-700' : 'text-gray-400'} />
                  Import from Project
                </button>
                <button
                  onClick={() => setActiveInnerTab('bulk-import')}
                  className={`flex items-center gap-2 px-5 py-4 text-xs font-extrabold tracking-wide border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    activeInnerTab === 'bulk-import'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Upload size={13} className={activeInnerTab === 'bulk-import' ? 'text-teal-700' : 'text-gray-400'} />
                  Bulk QP Import
                </button>
                <button
                  onClick={() => setActiveInnerTab('bulk-assign')}
                  className={`flex items-center gap-2 px-5 py-4 text-xs font-extrabold tracking-wide border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                    activeInnerTab === 'bulk-assign'
                      ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <UserCheck size={13} className={activeInnerTab === 'bulk-assign' ? 'text-teal-700' : 'text-gray-400'} />
                  Bulk Assign Examiner
                </button>
              </div>
            )}

            {/* DIVIDER */}
            <div className="flex-1" />

            {/* RIGHT: Conditional toolbar based on active tab */}
            <div className="flex items-center gap-2 px-4 py-3">
              {/* Papers & Sections Tab Actions */}
              {activeInnerTab === 'papers-sections' && (
                <>
                  {/* Bulk section allocation (shown only when papers selected) */}
                  {selectedPaperIds.length > 0 && (
                    <button
                      onClick={() => setShowImportSectionsModal(true)}
                      className="animate-in fade-in slide-in-from-right-2 duration-200 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                      title="Allocate Sections to Selected"
                    >
                      <Copy size={12} />
                      <span className="hidden sm:inline">Allocate Sections</span>
                      <span className="sm:hidden">{selectedPaperIds.length}</span>
                    </button>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search papers..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white w-44 transition-all shadow-none"
                    />
                  </div>

                  {/* Add Paper */}
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
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm hover:shadow shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={13} /> Add Paper
                  </button>
                </>
              )}

              {/* Import from Project Tab Actions */}
              {activeInnerTab === 'import-papers' && (
                <>
                  {/* Import button (show when papers selected) */}
                  {selectedImportPaperIds.length > 0 && (
                    <button
                      onClick={handleImportPapers}
                      disabled={importing}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold text-white shadow-sm transition-all whitespace-nowrap ${
                        importing
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-teal-700 hover:bg-teal-800'
                      }`}
                    >
                      {importing ? (
                        <Loader size={13} className="animate-spin" />
                      ) : (
                        <Folder size={13} />
                      )}
                      {importing ? 'Importing...' : `Import ${selectedImportPaperIds.length} Papers`}
                    </button>
                  )}

                  {/* Project selector */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      {loadingImportProjects ? (
                        <div className="flex items-center gap-2 text-gray-500 text-sm p-2">
                          <Loader size={16} className="animate-spin text-teal-700" />
                          <span className="font-semibold">Loading...</span>
                        </div>
                      ) : importProjects.length === 0 ? (
                        <div className="text-sm text-amber-700 font-semibold">No projects found</div>
                      ) : (
                        <select
                          value={selectedSourceProject}
                          onChange={(e) => setSelectedSourceProject(e.target.value)}
                          className="bg-white border border-gray-200 hover:border-gray-300 focus:border-teal-500 rounded-lg text-xs font-bold text-gray-800 px-2 py-1.5 pr-6 min-w-[200px] outline-none appearance-none cursor-pointer"
                        >
                          <option value="" disabled>-- Select a project --</option>
                          {importProjects.map((proj) => (
                            <option key={proj.projectId} value={proj.projectId}>
                              {proj.projectName} {proj.projectId !== 'master' && `(PRJ-${proj.projectId})`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search papers..."
                      value={importSearchTerm}
                      onChange={(e) => {
                        setImportSearchTerm(e.target.value);
                        setImportPage(1); // Reset to first page when searching
                      }}
                      className="pl-8 pr-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white w-44 transition-all shadow-none"
                    />
                  </div>
                </>
              )}

              {/* Bulk QP Import and Bulk Assign Examiner tabs use their dedicated in-tab action bars below */}

              {/* Bulk Assign Examiner tab uses the in-table action strip directly below */}
            </div>
          </div>

          {/* TAB CONTENT AREA - Conditional rendering based on active tab */}
          {activeInnerTab === 'papers-sections' && (
            <>
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
              <table className=" block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal w-full text-left">
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
                    <SortHeader 
                      label="Configuration Status" 
                      field="statusFilter" 
                      hasFilter={true} 
                      filterOptions={[
                        { value: '', label: 'All Papers' },
                        { value: 'sections_missing', label: 'Sections/Questions Not Defined' },
                        { value: 'pdf_missing', label: 'PDF Not Uploaded' },
                        { value: 'not_assigned', label: 'Not Assigned' },
                        { value: 'ready_for_allocation', label: 'Ready for Script Allocation' }
                      ]} 
                    />
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
                            {/* <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-black shrink-0">
                              {paper.paperCode.substring(0, 2)}
                            </div> */}
                            <div>
                              <span className="text-gray-900 font-extrabold text-sm block">{paper.paperCode}</span>
                              <span className="text-sm text-gray-800 font-semibold block">{paper.paperName}</span>
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
                              href={`${import.meta.env.VITE_API_URL.replace('/api', '')}/${paper.questionPaperPdfUrl.replace(/^\//, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/90 hover:border-blue-300 transition-all shadow-2xs group cursor-pointer"
                              title="View Question Paper PDF"
                            >
                              <Eye size={12} className="text-blue-600 group-hover:scale-110 transition-transform" />
                              <span>View PDF</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => triggerTableUpload(paper)}
                              disabled={uploadingPaperId === paper.paperId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-blue-700 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 border border-dashed border-blue-300 hover:border-blue-400 transition-all shadow-2xs group cursor-pointer disabled:opacity-50"
                              title="Upload Question Paper PDF"
                            >
                              {uploadingPaperId === paper.paperId ? (
                                <span className="flex items-center gap-1 text-blue-600 animate-pulse">
                                  <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block"></span>
                                  <span>Uploading...</span>
                                </span>
                              ) : (
                                <>
                                  <Upload size={12} className="text-blue-600 group-hover:-translate-y-0.5 transition-transform" />
                                  <span>Upload PDF</span>
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
                              <div className="flex items-center gap-2.5 text-[11px] font-medium text-gray-600" title={tooltipTitle}>
                                <span 
                                  className={`inline-flex items-center gap-1 ${hasSections && marksMatch ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-bold'}`} 
                                  title={hasSections && marksMatch ? `Sections & Marks: ${paper.sectionsCount || 0} sections, ${paper.configuredMarks}/${paper.maxMarks} marks` : (!hasSections ? 'Sections: 0 created' : `Marks mismatch: ${paper.configuredMarks}/${paper.maxMarks}`)}
                                >
                                  {hasSections && marksMatch ? <CheckCircle2 size={12} className="text-emerald-600 shrink-0" /> : <X size={12} className="text-rose-500 shrink-0" />}
                                  Sections
                                </span>
                                <span className="text-gray-300">•</span>
                                <span 
                                  className={`inline-flex items-center gap-1 ${hasEvaluators ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-bold'}`} 
                                  title={hasEvaluators ? `Evaluators: ${paper.expertsCount} assigned` : 'Evaluators: None assigned'}
                                >
                                  {hasEvaluators ? <CheckCircle2 size={12} className="text-emerald-600 shrink-0" /> : <X size={12} className="text-rose-500 shrink-0" />}
                                  Evaluator
                                </span>
                                <span className="text-gray-300">•</span>
                                <span 
                                  className={`inline-flex items-center gap-1 ${hasQp ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-bold'}`} 
                                  title={hasQp ? 'Question Paper: PDF uploaded' : 'Question Paper: PDF missing'}
                                >
                                  {hasQp ? <CheckCircle2 size={12} className="text-emerald-600 shrink-0" /> : <X size={12} className="text-rose-500 shrink-0" />}
                                  QP PDF
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="relative group/tooltip inline-block">
                              <Link
                                to={userType === 'admin' 
                                  ? `/admin/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`
                                  : `/section-config?projectId=${encryptedProjectId}&subjectId=${encryptId(paper.subjectId || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`}
                                className="p-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-all block shadow-2xs"
                              >
                                <Layers size={14} />
                              </Link>
                              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded shadow-sm opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50">
                                Manual Section Configuration
                                <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                            
                            <div className="relative group/tooltip inline-block">
                              <button
                                onClick={() => openAllocationModal(paper)}
                                className="p-1.5 text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 rounded-lg transition-all block shadow-2xs cursor-pointer"
                              >
                                <Users size={14} />
                              </button>
                              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded shadow-sm opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50">
                                Assign Evaluators
                                <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>

                            <div className="relative group/tooltip inline-block">
                              <button
                                onClick={() => handleEdit(paper)}
                                className="p-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-lg transition-all block shadow-2xs cursor-pointer"
                              >
                                <Edit2 size={14} />
                              </button>
                              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded shadow-sm opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-50">
                                Edit Paper Configuration
                                <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
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
            </>
          )}

          {/* ── IMPORT FROM PROJECT TAB CONTENT ──────────────────── */}
          {activeInnerTab === 'import-papers' && (
            <>
              {!selectedSourceProject ? (
                <div className="p-16 text-center">
                  <FileText size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Select a source project to view papers</p>
                  <p className="text-xs font-medium text-gray-500 mt-2">Choose a project from the dropdown above to see available papers for import</p>
                </div>
              ) : loadingImportPapers ? (
                <div className="p-16 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading Papers...</p>
                </div>
              ) : importPapers.length === 0 ? (
                <div className="p-16 text-center">
                  <FileText size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">No Papers Found in Selected Project</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5 w-12 text-center border-b border-gray-100">
                          <input 
                            type="checkbox" 
                            checked={getFilteredImportPapers().papers.length > 0 && selectedImportPaperIds.length === getFilteredImportPapers().papers.length} 
                            onChange={handleImportSelectAll} 
                            className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 cursor-pointer w-4 h-4"
                          />
                        </th>
                        <th className="px-5 py-3.5 border-b border-gray-100">Paper Details</th>
                        <th className="px-5 py-3.5 border-b border-gray-100">Paper Code</th>
                        <th className="px-5 py-3.5 border-b border-gray-100">Subjects</th>
                        <th className="px-5 py-3.5 text-center border-b border-gray-100">Max Marks</th>
                        <th className="px-5 py-3.5 text-center border-b border-gray-100">Sections</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                      {getFilteredImportPapers().papers.map(paper => {
                        const isSelected = selectedImportPaperIds.includes(paper.paperId);
                        return (
                          <tr key={paper.paperId} className={`hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-teal-50/30' : ''}`}>
                            <td className="px-5 py-2.5 text-center">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={() => handleToggleImportPaper(paper.paperId)}
                                className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 cursor-pointer w-4 h-4"
                              />
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="font-bold text-gray-900">
                                {paper.paperName}
                              </div>
                            </td>
                            <td className="px-5 py-2.5">
                              <span className="font-mono bg-gray-100 text-gray-600 font-bold px-2 py-1 rounded-md text-[11px] uppercase tracking-wider">
                                {paper.paperCode}
                              </span>
                            </td>
                            <td className="px-5 py-2.5">
                              <span className="text-gray-600 font-bold text-xs">
                                {paper.subjectNames?.join(', ') || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-center font-bold text-gray-700">
                              {paper.maxMarks}
                            </td>
                            <td className="px-5 py-2.5 text-center font-bold text-gray-700">
                              {paper.sections?.length || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  <TablePagination 
                    page={importPage}
                    totalPages={getFilteredImportPapers().totalPages}
                    totalCount={getFilteredImportPapers().totalCount}
                    pageSize={importPageSize}
                    setPage={setImportPage}
                    setPageSize={setImportPageSize}
                  />
                </div>
              )}
            </>
          )}

          {/* ── BULK QP IMPORT TAB CONTENT ──────────────────────────── */}
          {activeInnerTab === 'bulk-import' && (
            <div className="p-6 space-y-6">
              {/* Sleek Guideline & Match Instructions Banner */}
              <div className="p-4 sm:p-5 bg-teal-50/60 border border-teal-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Info size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-gray-900">How Catch-wise Bulk Upload Works</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100/80 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200/50">
                        Automatic Matching
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Name your PDF files using the corresponding paper's <strong className="text-gray-800">Catch Number</strong> or <strong className="text-gray-800">Paper Code</strong> (for example: <code className="bg-white border border-teal-200 text-teal-800 px-1.5 py-0.5 rounded text-[11px] font-mono">1001.pdf</code>, <code className="bg-white border border-teal-200 text-teal-800 px-1.5 py-0.5 rounded text-[11px] font-mono">CATCH_1001.pdf</code>, or <code className="bg-white border border-teal-200 text-teal-800 px-1.5 py-0.5 rounded text-[11px] font-mono">MATH101.pdf</code>). Select all files together or drop them below to automatically allocate them to papers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Upload Dropzone Area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-teal-200 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/50 rounded-xl text-center transition-all cursor-pointer group p-8 md:p-12"
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  id="bulkQpInput"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="bulkQpInput" className="cursor-pointer space-y-3 block">
                  <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 group-hover:bg-teal-700 group-hover:text-white transition-all shadow-xs">
                    <Upload size={26} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-gray-800">
                      Click to select Question Paper PDFs or drag & drop files here
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      Supports multiple PDF files named by Catch No (e.g. <span className="font-mono text-gray-700 font-bold">1001.pdf</span>, <span className="font-mono text-gray-700 font-bold">1002.pdf</span>)
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 rounded-lg shadow-xs transition-colors">
                      <Folder size={13} />
                      Browse Files
                    </span>
                  </div>
                </label>
              </div>

              {/* Selected Files Count & Action Bar */}
              {selectedFiles.length > 0 && (
                <div className="bg-gradient-to-r from-teal-50 to-teal-100/50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-600 text-white rounded-lg flex items-center justify-center font-bold shadow-sm">
                      <FileCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">
                        {selectedFiles.length} PDF {selectedFiles.length === 1 ? 'file' : 'files'} selected
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        Total size: <span className="font-bold text-gray-800">{formatBytes(totalQueueSize)}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={clearAllFiles}
                      disabled={isUploading}
                      className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleBulkUploadClick}
                      disabled={isUploading}
                      className="px-5 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      {isUploading ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          <span>Upload & Process ({selectedFiles.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BULK ASSIGN EXAMINER TAB CONTENT ──────────────────────────── */}
          {activeInnerTab === 'bulk-assign' && (
            <div className="overflow-visible">
              {/* ── ACTION TOOLBAR STRIP: Search, Filter, Quick Assign & Save ── */}
              <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Left: Search & Filter Pills */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search */}
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search papers by code, name, subject, or catch no..."
                      value={bulkPaperSearch}
                      onChange={(e) => setBulkPaperSearch(e.target.value)}
                      className="pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-64 sm:w-72 md:w-80 transition-all shadow-2xs"
                    />
                    {bulkPaperSearch && (
                      <button 
                        onClick={() => setBulkPaperSearch('')} 
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        title="Clear search"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>


                </div>

                {/* Right: Quick Assign All, Download & Upload Excel */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-600 hidden md:inline">Quick Assign All:</span>
                    <select
                      value={quickAssignExaminerId}
                      onChange={(e) => setQuickAssignExaminerId(e.target.value)}
                      className="text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700 min-w-[150px] shadow-2xs"
                    >
                      <option value="">Choose Examiner...</option>
                      {bulkExaminers.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleApplyToAllFiltered(quickAssignExaminerId)}
                      disabled={!quickAssignExaminerId}
                      className="px-3 py-1.5 text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shadow-2xs"
                    >
                      Apply to All
                    </button>
                  </div>

                  <div className="h-5 w-px bg-gray-200 mx-1 hidden sm:block" />

                  {/* Download Excel Template */}
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                    title="Download Excel template with all paper details and an empty Examiner column to fill manually"
                  >
                    <Download size={13} className="text-teal-700" />
                    <span>Download Excel</span>
                  </button>

                  {/* Upload Excel */}
                  <label
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                    title="Upload filled Excel sheet with examiner allocations"
                  >
                    <Upload size={13} className="text-teal-700" />
                    <span>Upload Excel</span>
                    <input
                      type="file"
                      ref={excelFileInputRef}
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* ── EXCEL ALLOCATION PREVIEW VIEW ── */}
              {excelPreviewData ? (
                <div className="overflow-visible min-h-[300px]">
                  {/* Preview Banner Strip */}
                  <div className="px-5 py-3.5 bg-teal-50/50 border-b border-teal-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                        <FileCheck size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-gray-900 text-sm">Excel Allocation Preview</span>
                          <span className="font-mono bg-white border border-teal-200 text-teal-900 px-2 py-0.5 rounded text-[11px] font-bold shadow-2xs">
                            {excelFileName}
                          </span>
                        </div>
                        <p className="text-gray-500 text-[11px] font-medium mt-0.5">
                          Review parsed allocations below. If examiners share the same name, select the intended one from the dropdown before uploading.
                        </p>
                      </div>
                    </div>

                    {/* Summary Badges & Actions as Interactive Filter Tabs */}
                    {(() => {
                      const totalRows = excelPreviewData.length;
                      const matchedRows = excelPreviewData.filter(r => r.matchStatus === 'matched').length;
                      const multipleRows = excelPreviewData.filter(r => r.matchStatus === 'multiple').length;
                      const notFoundRows = excelPreviewData.filter(r => r.matchStatus === 'not_found').length;

                      return (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* All Rows Filter */}
                          <button
                            type="button"
                            onClick={() => setExcelPreviewFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                              excelPreviewFilter === 'all'
                                ? 'bg-gray-900 text-white ring-2 ring-gray-900/20'
                                : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                            title="Show all parsed rows"
                          >
                            <span>All Rows</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                              excelPreviewFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {totalRows}
                            </span>
                          </button>

                          {/* Matched Filter */}
                          <button
                            type="button"
                            onClick={() => setExcelPreviewFilter(excelPreviewFilter === 'matched' ? 'all' : 'matched')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                              excelPreviewFilter === 'matched'
                                ? 'bg-emerald-700 text-white ring-2 ring-emerald-600/30'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                            title="Filter rows with exact single examiner match"
                          >
                            <Check size={12} className={excelPreviewFilter === 'matched' ? 'text-white' : 'text-emerald-700'} />
                            <span>Matched</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                              excelPreviewFilter === 'matched' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {matchedRows}
                            </span>
                          </button>

                          {/* Multiple Matches Filter */}
                          {multipleRows > 0 && (
                            <button
                              type="button"
                              onClick={() => setExcelPreviewFilter(excelPreviewFilter === 'multiple' ? 'all' : 'multiple')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                excelPreviewFilter === 'multiple'
                                  ? 'bg-amber-600 text-white ring-2 ring-amber-500/30'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                              title="Filter rows requiring selection due to duplicate examiner names"
                            >
                              <AlertTriangle size={12} className={excelPreviewFilter === 'multiple' ? 'text-white' : 'text-amber-600'} />
                              <span>Multiple Matches</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                excelPreviewFilter === 'multiple' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {multipleRows}
                              </span>
                            </button>
                          )}

                          {/* Not Found Filter */}
                          {notFoundRows > 0 && (
                            <button
                              type="button"
                              onClick={() => setExcelPreviewFilter(excelPreviewFilter === 'not_found' ? 'all' : 'not_found')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                excelPreviewFilter === 'not_found'
                                  ? 'bg-rose-700 text-white ring-2 ring-rose-600/30'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                              title="Filter rows where examiner name was not found in database"
                            >
                              <X size={12} className={excelPreviewFilter === 'not_found' ? 'text-white' : 'text-rose-600'} />
                              <span>Not Found</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                excelPreviewFilter === 'not_found' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {notFoundRows}
                              </span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleCancelExcelPreview}
                            className="ml-1 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Discard
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Preview Table */}
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5 border-b border-gray-100 w-1/3">Paper Code & Name</th>
                        <th className="px-5 py-3.5 border-b border-gray-100">
                          <div className="flex items-center">
                            <span>Subject &amp; Catch No</span>
                            <ColumnFilter
                              columnKey="previewSubject"
                              currentFilter={previewSubjectFilter}
                              setFilter={(_, val) => setPreviewSubjectFilter(val)}
                              placeholder="Filter by subject..."
                              options={bulkSubjectOptions}
                            />
                          </div>
                        </th>
                        <th className="px-5 py-3.5 border-b border-gray-100">Excel Examiner Name</th>
                        <th className="px-5 py-3.5 border-b border-gray-100 min-w-[280px]">Assigned Examiner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                      {(() => {
                        const filteredRows = excelPreviewData.filter(row => {
                          if (excelPreviewFilter === 'matched') { if (row.matchStatus !== 'matched') return false; }
                          else if (excelPreviewFilter === 'multiple') { if (row.matchStatus !== 'multiple') return false; }
                          else if (excelPreviewFilter === 'not_found') { if (row.matchStatus !== 'not_found') return false; }
                          if (previewSubjectFilter) {
                            // previewSubjectFilter stores subjectId; compare via bulkSubjectOptions
                            const opt = bulkSubjectOptions.find(o => o.value === previewSubjectFilter);
                            const subName = opt ? opt.label : '';
                            const rowSub = row.subjectName || row.subject || '';
                            if (!rowSub || rowSub !== subName) return false;
                          }
                          return true;
                        });

                        if (filteredRows.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-xs font-semibold text-gray-500 bg-gray-50/50">
                                <Filter size={24} className="mx-auto text-gray-300 mb-2" />
                                <div>No papers match the selected filter ({excelPreviewFilter}).</div>
                                <button
                                  type="button"
                                  onClick={() => setExcelPreviewFilter('all')}
                                  className="mt-2 text-teal-700 font-bold hover:underline cursor-pointer"
                                >
                                  Show All ({excelPreviewData.length}) Papers
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        return filteredRows.map((row) => {
                        const isDropdownOpen = openPreviewDropdownKey === row.key;
                        const selectedEx = bulkExaminers.find(e => e.id === row.selectedExaminerId);
                        
                        // Filter examiners by paper's subject AND university for dropdown
                        let dropdownOptions;
                        if (row.matchStatus === 'multiple') {
                          // For multiple matches, use candidates but filter by subject and university
                          dropdownOptions = row.candidates.filter(ex => {
                            // Check university match
                            if (activeUniversityId && ex.universityId !== parseInt(activeUniversityId)) {
                              return false;
                            }
                            // Check subject match
                            return row.paper.subjectId && ex.subjectId1 === row.paper.subjectId;
                          });
                        } else {
                          // For not found or other cases, filter all examiners by subject and university
                          dropdownOptions = bulkExaminers.filter(ex => {
                            // Check university match
                            if (activeUniversityId && ex.universityId !== parseInt(activeUniversityId)) {
                              return false;
                            }
                            // Check subject match
                            return row.paper.subjectId && ex.subjectId1 === row.paper.subjectId;
                          });
                        }
                        
                        const filteredOptions = dropdownOptions.filter(ex => {
                          if (!previewDropdownSearch) return true;
                          const q = previewDropdownSearch.toLowerCase();
                          return (
                            ex.name?.toLowerCase().includes(q) ||
                            ex.email?.toLowerCase().includes(q) ||
                            ex.empId?.toLowerCase().includes(q)
                          );
                        });

                        return (
                          <tr 
                            key={row.key} 
                            className={`hover:bg-gray-50/60 transition-colors ${
                              row.matchStatus === 'multiple' && !row.selectedExaminerId ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            {/* Paper Code & Name + Match Status Flag */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xs shrink-0">
                                  {row.paper.paperCode ? row.paper.paperCode.substring(0, 2) : "P"}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-gray-900 font-extrabold text-xs">
                                      {row.paper.paperCode}
                                    </span>
                                    {row.matchStatus === 'matched' && (
                                      <span 
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs"
                                        title="1 Examiner Matched Successfully"
                                      >
                                        <Flag size={9} className="fill-emerald-500 text-emerald-600 shrink-0" />
                                        <span>Matched</span>
                                      </span>
                                    )}
                                    {row.matchStatus === 'multiple' && (
                                      <span 
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shadow-2xs"
                                        title={`${row.candidates.length} examiners with this name found. ${row.selectedExaminerId ? 'Selection made.' : 'Action required: choose examiner.'}`}
                                      >
                                        <Flag size={9} className="fill-amber-500 text-amber-600 shrink-0" />
                                        
                                      </span>
                                    )}
                                    {row.matchStatus === 'not_found' && (
                                      <span 
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full shadow-2xs"
                                        title="Examiner name in Excel not found"
                                      >
                                        <Flag size={9} className="fill-rose-500 text-rose-600 shrink-0" />
                                        <span>Not Found</span>
                                      </span>
                                    )}
                                    {row.matchStatus === 'empty' && (
                                      <span 
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full shadow-2xs"
                                        title="No examiner specified in Excel"
                                      >
                                        <Flag size={9} className="text-gray-400 shrink-0" />
                                        <span>Not Specified</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-gray-600 font-medium text-xs block truncate" title={row.paper.paperName}>
                                    {row.paper.paperName}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Subject & Catch No */}
                            <td className="px-5 py-3.5">
                              <div className="text-gray-900 font-bold text-xs">{row.paper.subjectName || "—"}</div>
                              <div className="text-[11px] text-gray-500 font-medium font-mono">
                                Catch No: {row.paper.catchNo || 'None'}
                              </div>
                            </td>

                            {/* Examiner Name in Excel */}
                            <td className="px-5 py-3.5">
                              {row.excelExaminerName ? (
                                <span className="inline-block font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded border border-gray-200">
                                  {row.excelExaminerName}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic text-[11px]">Empty in Excel</span>
                              )}
                            </td>

                            {/* Assigned Examiner (Dropdown / Selection) */}
                            <td className="px-5 py-3.5">
                              <div className="relative preview-dropdown-container">
                                {selectedEx ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenPreviewDropdownKey(isDropdownOpen ? null : row.key);
                                      setPreviewDropdownSearch('');
                                    }}
                                    className={`w-full flex items-center justify-between gap-2 p-1.5 bg-teal-50 hover:bg-teal-100/70 border border-teal-200 hover:border-teal-400 rounded-lg text-left transition-all cursor-pointer shadow-2xs ${
                                      isDropdownOpen ? 'ring-2 ring-teal-500/30 border-teal-500' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <img
                                        src={selectedEx.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEx.name || 'User')}&background=0D9488&color=fff`}
                                        alt=""
                                        className="w-6 h-6 rounded-full border border-teal-200 object-cover shrink-0 shadow-2xs"
                                      />
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-teal-950 truncate leading-tight">{selectedEx.name}</div>
                                        <div className="text-[10px] text-teal-700 truncate leading-tight">{selectedEx.email || selectedEx.empId}</div>
                                      </div>
                                    </div>
                                    <ChevronDown size={14} className={`text-teal-700 shrink-0 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                ) : row.matchStatus === 'multiple' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenPreviewDropdownKey(isDropdownOpen ? null : row.key);
                                      setPreviewDropdownSearch('');
                                    }}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100/70 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <span className="flex items-center gap-1.5 text-amber-800 truncate">
                                      <Users size={13} className="text-amber-600 shrink-0" />
                                      Choose from {row.candidates.length} examiners...
                                    </span>
                                    <ChevronDown size={14} className="text-amber-700 shrink-0" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenPreviewDropdownKey(isDropdownOpen ? null : row.key);
                                      setPreviewDropdownSearch('');
                                    }}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 hover:bg-white border border-gray-200 hover:border-teal-400 rounded-lg text-xs font-semibold text-gray-500 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <span className="flex items-center gap-1.5 text-gray-500">
                                      <UserPlus size={13} className="text-gray-400" />
                                      Select Examiner...
                                    </span>
                                    <ChevronDown size={14} className="text-gray-400" />
                                  </button>
                                )}

                                {/* Dropdown Popup */}
                                {isDropdownOpen && (
                                  <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    {row.matchStatus === 'multiple' && (
                                      <div className="px-2 py-1 mb-1.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] font-bold text-amber-900">
                                        Multiple examiners named "{row.excelExaminerName}" found. Choose one:
                                      </div>
                                    )}

                                    {dropdownOptions.length > 4 && (
                                      <div className="relative mb-2">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                          type="text"
                                          placeholder="Filter examiners..."
                                          value={previewDropdownSearch}
                                          onChange={(e) => setPreviewDropdownSearch(e.target.value)}
                                          className="w-full pl-7 pr-6 py-1 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                        {previewDropdownSearch && (
                                          <button
                                            onClick={() => setPreviewDropdownSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                          >
                                            <X size={11} />
                                          </button>
                                        )}
                                      </div>
                                    )}

                                    <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1">
                                      {filteredOptions.length === 0 ? (
                                        <div className="py-4 text-center text-xs text-gray-400 font-semibold">
                                          No examiners found
                                        </div>
                                      ) : (
                                        filteredOptions.map(ex => {
                                          const isSelected = row.selectedExaminerId === ex.id;
                                          return (
                                            <div
                                              key={ex.id}
                                              onClick={() => {
                                                handleSelectExaminerInPreview(row.key, ex.id);
                                                setOpenPreviewDropdownKey(null);
                                              }}
                                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                                isSelected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-gray-50'
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <img
                                                  src={ex.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(ex.name || 'User')}&background=0D9488&color=fff`}
                                                  alt=""
                                                  className="w-7 h-7 rounded-full border border-gray-200 object-cover shrink-0 shadow-2xs"
                                                />
                                                <div className="min-w-0">
                                                  <div className="text-xs font-bold text-gray-900 truncate">{ex.name}</div>
                                                  <div className="text-[10px] text-gray-500 truncate">
                                                    {ex.email || ex.empId || "Examiner"}
                                                  </div>
                                                </div>
                                              </div>
                                              {isSelected && (
                                                <Check size={14} className="text-teal-700 shrink-0 ml-2" />
                                              )}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>

                                    <div className="border-t border-gray-100 mt-2 pt-1 flex items-center justify-between">
                                      {row.selectedExaminerId ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSelectExaminerInPreview(row.key, null);
                                            setOpenPreviewDropdownKey(null);
                                          }}
                                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2 py-0.5 rounded cursor-pointer"
                                        >
                                          Clear Selection
                                        </button>
                                      ) : <span />}
                                      <button
                                        type="button"
                                        onClick={() => setOpenPreviewDropdownKey(null)}
                                        className="text-[11px] font-bold text-gray-500 hover:text-gray-800 px-2 py-0.5 rounded cursor-pointer"
                                      >
                                        Close
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                    </tbody>
                  </table>

                  {/* Preview Bottom Action Bar */}
                  {(() => {
                    const allExaminersSelected = excelPreviewData.length > 0 && excelPreviewData.every(r => !!r.selectedExaminerId);
                    const selectedCount = excelPreviewData.filter(r => r.selectedExaminerId).length;
                    const unselectedCount = excelPreviewData.length - selectedCount;

                    return (
                      <div className="p-4 bg-teal-50/50 border-t border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <UserCheck size={16} className="text-teal-700" />
                          <span className="text-xs font-extrabold text-gray-900">
                            {allExaminersSelected ? (
                              <>All <span className="text-teal-700">{excelPreviewData.length}</span> papers assigned and ready to upload</>
                            ) : (
                              <>Assigned <span className="text-teal-700">{selectedCount}</span> of {excelPreviewData.length} papers</>
                            )}
                          </span>
                          {!allExaminersSelected && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <AlertTriangle size={12} className="text-amber-700 shrink-0" />
                              <span>{unselectedCount} paper(s) require examiner selection before uploading</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelExcelPreview}
                            className="text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel Preview
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmExcelAssignments}
                            disabled={!allExaminersSelected || isUploadingExcel}
                            className="bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs uppercase tracking-wider py-1.5 px-5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                            title={!allExaminersSelected ? "Choose examiners for all papers to enable upload" : ""}
                          >
                            {isUploadingExcel ? (
                              <>
                                <Loader size={13} className="animate-spin" />
                                <span>Uploading & Assigning...</span>
                              </>
                            ) : (
                              <>
                                <Check size={14} />
                                <span>Upload & Assign ({selectedCount}/{excelPreviewData.length})</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* ── STANDARD BULK ASSIGN TABLE VIEW ── */
                <>
                  {/* Table Area */}
                  {loadingBulkData ? (
                    <div className="p-16 text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading Papers & Examiners...</p>
                    </div>
                  ) : filteredBulkPapers.length === 0 ? (
                    <div className="p-16 text-center">
                      <CheckCircle2 size={36} className="mx-auto text-teal-600 mb-2" />
                       <h4 className="text-sm font-bold text-gray-800">
                          {bulkSubjectFilter
                            ? `No Unassigned Papers in "${bulkSubjectOptions.find(o => o.value === bulkSubjectFilter)?.label || bulkSubjectFilter}"`
                            : "All Papers Assigned"}
                       </h4>
                       <p className="text-xs text-gray-500 mt-1">
                         {bulkSubjectFilter
                           ? "Try selecting a different subject or clearing the filter."
                           : "All papers in this project currently have examiners assigned."}
                       </p>
                       {bulkSubjectFilter && (
                         <button
                           type="button"
                           onClick={() => setBulkSubjectFilter("")}
                           className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                         >
                           Clear Subject Filter
                         </button>
                       )}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-visible min-h-[220px]">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                          <tr>
                            <th className="px-5 py-3.5 border-b border-gray-100 w-1/3">Paper Code & Name</th>
                             <th className="px-5 py-3.5 border-b border-gray-100">
                               <div className="flex items-center">
                                 <span>Subjects</span>
                                 <ColumnFilter
                                   columnKey="subjectFilter"
                                   currentFilter={bulkSubjectFilter}
                                   setFilter={(_, val) => setBulkSubjectFilter(val)}
                                   placeholder="Filter by subject..."
                                   options={bulkSubjectOptions}
                                 />
                               </div>
                             </th>
                            <th className="px-5 py-3.5 text-center border-b border-gray-100">Catch No</th>
                            <th className="px-5 py-3.5 border-b border-gray-100 min-w-[280px]">Assign Examiner</th>
                            <th className="px-5 py-3.5 text-right border-b border-gray-100">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                          {paginatedBulkPapers.map((paper, index) => {
                            const isDropdownOpen = openDropdownPaperId === paper.paperId;
                            const isNearBottom = index >= Math.max(0, paginatedBulkPapers.length - 2) && paginatedBulkPapers.length > 2;
                            const selectedIds = assignedExaminersMap[paper.paperId] || [];
                            const selectedExaminers = bulkExaminers.filter(ex => selectedIds.includes(ex.id));
                            const hasExaminerInDb = (paper.expertsCount || 0) > 0;

                            // Filter examiners: must match paper's subjectId AND university AND search query
                            const filteredExaminersInDropdown = bulkExaminers.filter(ex => {
                              // First check university match
                              if (activeUniversityId && ex.universityId !== parseInt(activeUniversityId)) {
                                return false;
                              }
                              
                              // Then filter by paper's subject
                              const matchesSubject = paper.subjectId && ex.subjectId1 === paper.subjectId;
                              
                              if (!matchesSubject) return false;
                              
                              // Finally filter by search query
                              if (!dropdownSearch) return true;
                              const q = dropdownSearch.toLowerCase();
                              return (
                                ex.name?.toLowerCase().includes(q) ||
                                ex.email?.toLowerCase().includes(q) ||
                                ex.empId?.toLowerCase().includes(q)
                              );
                            });

                            return (
                              <tr 
                                key={paper.paperId} 
                                className={`hover:bg-gray-50/60 transition-colors ${
                                  selectedIds.length > 0 ? 'bg-teal-50/20' : ''
                                }`}
                              >
                                {/* Paper Code & Name + Status Flag */}
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xs shrink-0">
                                      {paper.paperCode ? paper.paperCode.substring(0, 2) : "P"}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-gray-900 font-extrabold text-xs">
                                          {paper.paperCode}
                                        </span>
                                        {hasExaminerInDb ? (
                                          <span 
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs"
                                            title={`Status: ${paper.expertsCount} Examiner(s) Assigned`}
                                          >
                                            <Flag size={9} className="fill-emerald-500 text-emerald-600 shrink-0" />
                                            <span>Assigned ({paper.expertsCount})</span>
                                          </span>
                                        ) : (
                                          <span 
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shadow-2xs"
                                            title="Status: Action Required (Examiner Unassigned)"
                                          >
                                            <Flag size={9} className="fill-amber-500 text-amber-600 shrink-0" />
                                            
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-gray-600 font-medium text-xs block truncate" title={paper.paperName}>
                                        {paper.paperName}
                                      </span>

                                    </div>
                                  </div>
                                </td>

                                 {/* Subjects */}
                                 <td className="px-5 py-3.5">
                                   <div className="text-gray-900 font-bold text-xs">{paper.subjectName || "—"}</div>
                                 </td>

                                {/* Catch No */}
                                <td className="px-5 py-3.5 text-center">
                                  {paper.catchNo ? (
                                    <span className="inline-block font-mono font-bold text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                                      {paper.catchNo}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic text-[11px]">None</span>
                                  )}
                                </td>

                                {/* Examiner Dropdown Column */}
                                <td className="px-5 py-3.5">
                                  <div className="relative examiner-dropdown-container">
                                    {selectedExaminers.length > 0 ? (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {selectedExaminers.map(ex => (
                                          <div
                                            key={ex.id}
                                            className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 bg-teal-50 border border-teal-200 rounded-lg text-xs font-bold text-teal-900 shadow-2xs"
                                          >
                                            <img
                                              src={ex.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(ex.name || 'User')}&background=0D9488&color=fff`}
                                              alt=""
                                              className="w-5 h-5 rounded-full border border-white object-cover shrink-0"
                                            />
                                            <span className="truncate max-w-[130px]">{ex.name}</span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectExaminerForPaper(paper.paperId, ex.id);
                                              }}
                                              className="text-teal-600 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                                              title="Remove"
                                            >
                                              <X size={12} />
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenDropdownPaperId(isDropdownOpen ? null : paper.paperId);
                                            setDropdownSearch('');
                                          }}
                                          className="p-1 text-teal-700 hover:bg-teal-100 rounded-md transition-colors cursor-pointer"
                                          title="Change / Add Examiner"
                                        >
                                          <ChevronDown size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenDropdownPaperId(isDropdownOpen ? null : paper.paperId);
                                          setDropdownSearch('');
                                        }}
                                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 hover:bg-white border border-gray-200 hover:border-teal-400 rounded-lg text-xs font-semibold text-gray-500 transition-all cursor-pointer shadow-2xs"
                                      >
                                        <span className="flex items-center gap-2 text-gray-500">
                                          <UserPlus size={13} className="text-gray-400" />
                                          Select Examiner...
                                        </span>
                                        <ChevronDown size={14} className="text-gray-400" />
                                      </button>
                                    )}

                                    {/* Dropdown Menu Popup */}
                                    {isDropdownOpen && (
                                      <div
                                        className={`absolute left-0 ${
                                          isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                        } w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100`}
                                      >
                                        {/* Dropdown In-search (no autoFocus) */}
                                        <div className="relative mb-2">
                                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                          <input
                                            type="text"
                                            placeholder="Search examiner..."
                                            value={dropdownSearch}
                                            onChange={(e) => setDropdownSearch(e.target.value)}
                                            className="w-full pl-7 pr-6 py-1 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                                          />
                                          {dropdownSearch && (
                                            <button
                                              onClick={() => setDropdownSearch('')}
                                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                            >
                                              <X size={11} />
                                            </button>
                                          )}
                                        </div>

                                        {/* Examiners list */}
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                          {filteredExaminersInDropdown.length === 0 ? (
                                            <div className="py-4 text-center text-xs text-gray-400 font-semibold">
                                              No examiners found
                                            </div>
                                          ) : (
                                            filteredExaminersInDropdown.map(ex => {
                                              const isExSelected = selectedIds.includes(ex.id);
                                              return (
                                                <div
                                                  key={ex.id}
                                                  onClick={() => handleSelectExaminerForPaper(paper.paperId, ex.id)}
                                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                                    isExSelected ? 'bg-teal-50 border border-teal-200' : 'hover:bg-gray-50'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2.5 min-w-0">
                                                    <img
                                                      src={ex.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(ex.name || 'User')}&background=0D9488&color=fff`}
                                                      alt=""
                                                      className="w-7 h-7 rounded-full border border-gray-200 object-cover shrink-0 shadow-2xs"
                                                    />
                                                    <div className="min-w-0">
                                                      <div className="text-xs font-bold text-gray-900 truncate">{ex.name}</div>
                                                      <div className="text-[10px] text-gray-500 truncate">
                                                        {ex.email || ex.empId || "Examiner"}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <input
                                                    type="checkbox"
                                                    checked={isExSelected}
                                                    readOnly
                                                    className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 w-4 h-4 shrink-0 pointer-events-none"
                                                  />
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>

                                        {/* Dropdown footer close */}
                                        <div className="border-t border-gray-100 mt-2 pt-1.5 flex justify-end">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenDropdownPaperId(null);
                                              setDropdownSearch('');
                                            }}
                                            className="text-[11px] font-bold text-teal-700 hover:text-teal-800 px-2 py-0.5 rounded cursor-pointer"
                                          >
                                            Done
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* Action column */}
                                <td className="px-5 py-3.5 text-right">
                                  {selectedIds.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleClearPaperExaminer(paper.paperId)}
                                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                                      title="Reset selection for this paper"
                                    >
                                      Clear
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 italic">Not set</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                      <TablePagination 
                        page={bulkPage}
                        totalPages={totalBulkPages}
                        totalCount={totalBulkCount}
                        pageSize={bulkPageSize}
                        setPage={setBulkPage}
                        setPageSize={setBulkPageSize}
                      />
                    </>
                  )}

                  {/* Bottom Sticky Action Bar with Save and Cancel */}
                  {pendingAssignedCount > 0 && (
                    <div className="p-4 bg-teal-50/50 border-t border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-teal-700" />
                        <span className="text-xs font-extrabold text-gray-900">
                          Ready to assign <span className="text-teal-700">{pendingAssignedCount} paper{pendingAssignedCount > 1 ? 's' : ''}</span>
                        </span>
                        <span className="text-xs text-gray-500 hidden sm:inline">• Click Save to apply assignments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelBulkAssignments}
                          className="text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBulkAssignments}
                          disabled={isBulkAssigning}
                          className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider py-1.5 px-5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          {isBulkAssigning ? (
                            <>
                              <Loader size={13} className="animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>Save Assignments ({pendingAssignedCount})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Import Sections Modal */}
        {/* ------------------------------------------------------------------ */}
        {showImportSectionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 md:px-6 px-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Import Sections</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Applying to {selectedPaperIds.length} selected paper(s)</p>
                </div>
                <button onClick={() => setShowImportSectionsModal(false)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-gray-200 bg-gray-50/50 pt-3 gap-4 md:px-6 px-4">
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

              <form onSubmit={handleImportSectionsSubmit} className="space-y-4 p-4 md:p-6">
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
                <div className="bg-gray-50/50 border-b border-gray-100 flex items-center justify-between p-4 md:p-6">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Assign Examiners</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Allocation for {selectedPaper?.paperCode}: {selectedPaper?.paperName}</p>
                </div>
                <button onClick={closeExaminerModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <X size={20} className="text-gray-400 hover:text-gray-600" />
                </button>
                </div>

                <div className="p-4 md:p-6">
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
                        <div 
                          key={examiner.id} 
                          onClick={() => handleAssign(examiner.id)} 
                          className="flex items-center justify-between p-3 bg-gray-50/50 hover:bg-teal-50 border border-gray-100 hover:border-teal-300 rounded-xl group transition-all cursor-pointer select-none"
                        >
                            <div className="flex items-center gap-3">
                              <img src={examiner.profileImage || "https://ui-avatars.com/api/?name=" + examiner.name} alt="" className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm" />
                              <div><p className="text-xs font-bold text-gray-800 group-hover:text-teal-900 transition-colors">{examiner.name}</p></div>
                            </div>
                            <div className="p-1.5 bg-white text-teal-700 rounded-lg shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110">
                              <UserPlus size={14} />
                            </div>
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
                                <p className="text-[9px] font-bold text-teal-700/70">Assigned: {new Date(assignment.assignedAt || Date.now()).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button onClick={() => handleRemoveAssignment(assignment.id, assignment.examinerId || assignment.examiner?.id)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all">
                                <Trash2 size={14} />
                            </button>
                            </div>
                        ))
                        )}
                    </div>
                    </div>
                </div>
                </div>
                <div className="bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3 p-4 md:p-6">
                <button onClick={closeExaminerModal} className="py-2.5 text-gray-500 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all md:px-6 px-4">
                    Cancel
                </button>
                <button onClick={handleDone} disabled={allocationLoading} className="bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-teal-200 hover:bg-teal-800 transition-all disabled:opacity-50 px-4 md:px-8">
                    {allocationLoading ? 'Saving...' : 'Done'}
                </button>
                </div>
            </div>
            </div>
        )}
        {/* ------------------------------------------------------------------ */}
        {/* Simple Question Paper Upload Confirmation Modal */}
        {/* ------------------------------------------------------------------ */}
        {showUploadConfirmModal && activePaperForUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Upload Question Paper</h3>
                <button
                  type="button"
                  onClick={handleCancelUploadConfirm}
                  disabled={isConfirmUploading}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-2.5">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to upload <span className="font-bold text-gray-900">{pendingUploadFile?.name}</span> for <span className="font-bold text-gray-900">{activePaperForUpload.paperCode} - {activePaperForUpload.paperName}</span>?
                </p>
                {activePaperForUpload.questionPaperPdfUrl && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    Note: An existing question paper is already uploaded for this paper and will be replaced.
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelUploadConfirm}
                  disabled={isConfirmUploading}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={isConfirmUploading || !pendingUploadFile}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isConfirmUploading ? (
                    <>
                      <Loader size={13} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Bulk Question Paper Upload Confirmation Modal */}
        {/* ------------------------------------------------------------------ */}
        {showBulkConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Confirm Bulk Upload</h3>
                <button
                  type="button"
                  onClick={() => setShowBulkConfirmModal(false)}
                  disabled={isUploading}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to upload and process <strong className="text-gray-900">{selectedFiles.length} Question Paper PDF(s)</strong> ({formatBytes(totalQueueSize)}) for this project?
                </p>
              </div>

              <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBulkConfirmModal(false)}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkUploadConfirm}
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isUploading ? (
                    <>
                      <Loader size={13} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Upload</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={tableFileInputRef}
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handleTableFileChange}
        />
        </>
      )}
    </div>
  );
}
