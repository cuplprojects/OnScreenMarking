import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  FileText, 
  Plus, 
  Edit2, 
  UserPlus, 
  X, 
  Search, 
  CheckCircle2, 
  Trash2,
  ChevronLeft,
  Filter,
  Users,
  BookOpen,
  Layers
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBreadcrumb } from "../context/BreadcrumbContext";
import { decryptId, encryptId } from "../utils/encryption";
import subjectService from "../services/subjectService";
import projectService from "../services/projectService";
import paperService from "../services/paperService";
import message from '../services/messageService';

export default function PapersManagement() {
  const [searchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get("projectId");
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  const subjectId = searchParams.get("subjectId");
  const universityId = searchParams.get("universityId");
  const { userType, universityId: userUniversityId } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const activeUniversityId = userType === "coordinator" ? userUniversityId : universityId;

  useEffect(() => {
    const papersPath = userType === 'admin' ? '/admin/papers' : '/papers';
    setBreadcrumb([
      { label: 'Paper Management', path: papersPath, icon: 'FileText' }
    ]);
  }, [userType]);

  const [papers, setPapers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    paperCode: "",
    paperName: "",
    paperNumber: 1,
    maxMarks: 100,
    totalQuestions: "",
    description: "",
    catchNo: "",
    projectId: projectId || "",
    isActive: true,
    questionPaperPdfUrl: "",
  });
  
  // Examiner Allocation State
  const [showExaminerModal, setShowExaminerModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [availableExaminers, setAvailableExaminers] = useState([]);
  const [assignedExaminers, setAssignedExaminers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [allocationLoading, setAllocationLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [subjectId, projectId, activeUniversityId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const projs = await projectService.getAllProjects(activeUniversityId, { pageSize: 0 });
      setProjects(projs?.items || projs || []);

      if (activeUniversityId) {
        const subs = await subjectService.getSubjectByUniversity(activeUniversityId, { pageSize: 0 });
        const subjectsArray = Array.isArray(subs) ? subs : (subs?.items || []);
        const mappedSubs = subjectsArray.map(s => ({ ...s, subjectName: s.subName || s.subjectName || '' }));
        setSubjects(mappedSubs);
      } else {
        setSubjects([]);
      }
      
      const loadedPapers = await fetchPapers();
      
      // Auto edit if param is set
      const editParam = searchParams.get("edit");
      const paperIdParam = searchParams.get("paperId");
      if (editParam === "true" && paperIdParam && loadedPapers) {
        const decryptedPaperId = parseInt(decryptId(paperIdParam), 10);
        const paperToEdit = loadedPapers.find(p => p.paperId === decryptedPaperId);
        if (paperToEdit) {
          handleEdit(paperToEdit, projs || []);
        }
      }
    } catch (err) {
      if (typeof setError === "function") setError("Failed to initialize data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPapers = async () => {
    try {
      let data;
      if (projectId) {
        data = await paperService.getPapersByProject(projectId);
      } else if (subjectId) {
        data = await paperService.getPapersBySubject(subjectId);
      } else {
        data = await paperService.getAllPapers(activeUniversityId);
      }

      const papersArray = data?.items || data || [];
      const mappedData = papersArray.map(paper => ({
        ...paper,
        subjectPapers: paper.subjectPapers?.map(sp => ({
          ...sp,
          subject: sp.subject ? {
            ...sp.subject,
            subjectName: sp.subject.subName || sp.subject.subjectName || ''
          } : null
        }))
      }));
      setPapers(mappedData);
      return mappedData;
    } catch (err) {
      if (typeof setError === "function") setError("Failed to fetch papers");
    }
  };

  useEffect(() => {
    const loadProjectSubjects = async () => {
      if (activeUniversityId) {
        try {
          const subs = await subjectService.getSubjectByUniversity(activeUniversityId);
          const subjectsArray = Array.isArray(subs) ? subs : (subs?.items || []);
          const mappedSubs = subjectsArray.map(s => ({ ...s, subjectName: s.subName || s.subjectName || '' }));
          setSubjects(mappedSubs);
        } catch (err) {
          console.error("Failed to fetch subjects for university:", err);
        }
      }
    };
    loadProjectSubjects();
  }, [activeUniversityId]);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setShowForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (subjectId) {
      setSelectedSubjects([parseInt(subjectId, 10)]);
    }
  }, [subjectId]);

  const handleProjectChange = (projId) => {
    setFormData(prev => ({ ...prev, projectId: projId }));
  };

  // Examiner Allocation Logic
  const openAllocationModal = async (paper) => {
    setSelectedPaper(paper);
    setShowExaminerModal(true);
    setAllocationLoading(true);
    try {
      // Find the project to get universityId
      const project = projects.find(p => p.projectId === paper.projectId);
      const universityId = project ? project.universityId : null;

      // Get all subject IDs for this paper
      const subjectIds = paper.subjectPapers?.map(sp => sp.subjectId) || [];
      
      // Fetch examiners for all subjects associated with this paper
      let allExaminers = [];
      if (subjectIds.length > 0) {
        // Fetch examiners for each subject and combine them (removing duplicates)
        const examinerSets = await Promise.all(
          subjectIds.map(subId => 
            apiCall(`/users/examiners?subjectId=${subId}${universityId ? `&universityId=${universityId}` : ''}`)
          )
        );
        
        // Combine all examiners and remove duplicates by ID
        const examinerMap = new Map();
        examinerSets.forEach(examiners => {
          examiners.forEach(examiner => {
            if (!examinerMap.has(examiner.id)) {
              examinerMap.set(examiner.id, examiner);
            }
          });
        });
        allExaminers = Array.from(examinerMap.values());
      } else {
        // If no subjects, fetch all examiners for the university
        allExaminers = await apiCall(`/users/examiners${universityId ? `?universityId=${universityId}` : ''}`);
      }
      
      setAvailableExaminers(allExaminers);

      // Fetch currently assigned examiners
      const assigned = await apiCall(`/PaperExaminers/paper/${paper.paperId}`);
      setAssignedExaminers(assigned);
    } catch (err) {
      console.error("Failed to fetch examiners:", err);
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleAssign = async (examinerId) => {
    try {
      await apiCall('/PaperExaminers/assign', {
        method: 'POST',
        body: JSON.stringify({
          paperId: selectedPaper.paperId,
          examinerId: examinerId
        })
      });
      // Refresh assignments
      const assigned = await apiCall(`/PaperExaminers/paper/${selectedPaper.paperId}`);
      setAssignedExaminers(assigned);
      message.success("Examiner assigned successfully");
      
    } catch (err) {
      setError("Failed to assign examiner");
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await apiCall(`/PaperExaminers/remove/${assignmentId}`, {
        method: 'DELETE'
      });
      setAssignedExaminers(prev => prev.filter(a => a.id !== assignmentId));
    } catch (err) {
      setError("Failed to remove examiner");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject");
      return;
    }

    try {
      const payload = {
        ...formData,
        subjectIds: selectedSubjects.map(id => parseInt(id, 10)),
        projectId: parseInt(formData.projectId, 10),
        paperNumber: parseInt(formData.paperNumber, 10),
        maxMarks: parseFloat(formData.maxMarks),
        totalQuestions: formData.totalQuestions === "" ? 0 : parseInt(formData.totalQuestions, 10),
      };

      const result = editingId
        ? await paperService.updatePaper(editingId, payload)
        : await paperService.createPaper(payload);

      handleCancel();
      fetchPapers();
      message.success("Paper saved successfully");
      
    } catch (err) {
      setError("Error saving paper");
    }
  };

  const handleEdit = async (paper, projectsList = projects) => {
    setFormData({
      paperCode: paper.paperCode,
      paperName: paper.paperName,
      paperNumber: paper.paperNumber,
      maxMarks: paper.maxMarks,
      totalQuestions: paper.totalQuestions,
      description: paper.description,
      catchNo: paper.catchNo || "",
      projectId: paper.projectId,
      isActive: paper.isActive,
      questionPaperPdfUrl: paper.questionPaperPdfUrl || "",
    });
    
    // Fetch subjects for this paper's project's university
    const project = (projectsList && projectsList.length > 0 ? projectsList : projects).find(p => p.projectId === paper.projectId);
    if (project && project.universityId) {
      try {
        const subs = await apiCall(`/subject/University?universityId=${project.universityId}`);
        const mappedSubs = subs.map(s => ({ ...s, subjectName: s.subName || s.subjectName || '' }));
        setSubjects(mappedSubs);
      } catch (err) {
        console.error("Failed to fetch subjects for project's university on edit:", err);
      }
    }

    // Set selected subjects from paper's subject papers
    if (paper.subjectPapers && paper.subjectPapers.length > 0) {
      setSelectedSubjects(paper.subjectPapers.map(sp => sp.subjectId));
    }
    setEditingId(paper.paperId);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData({
      paperCode: "",
      paperName: "",
      paperNumber: 1,
      maxMarks: 100,
      totalQuestions: "",
      description: "",
      catchNo: "",
      projectId: projectId || "",
      isActive: true,
      questionPaperPdfUrl: "",
    });
    setSelectedSubjects([]);
    setEditingId(null);
    setShowForm(false);
    
    fetchInitialData();
  };

  const toggleSubject = (subjId) => {
    setSelectedSubjects(prev =>
      prev.includes(subjId)
        ? prev.filter(id => id !== subjId)
        : [...prev, subjId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/admin/dashboard" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft className="text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="text-blue-600" />
                  Papers Management
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowForm(!showForm)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
                  showForm 
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                    : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"
                }`}
              >
                {showForm ? <X size={18} /> : <Plus size={18} />}
                {showForm ? "Cancel" : "Add Paper"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* University Sub-navigation Operations Hub */}

        
        

        {/* Form Container */}
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
                  <input
                    type="text"
                    value={formData.paperCode}
                    onChange={(e) => setFormData({ ...formData, paperCode: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="e.g. MATH-101"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Paper Name *</label>
                  <input
                    type="text"
                    value={formData.paperName}
                    onChange={(e) => setFormData({ ...formData, paperName: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    placeholder="e.g. Calculus I"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Catch Number</label>
                  <input
                    type="text"
                    value={formData.catchNo}
                    onChange={(e) => setFormData({ ...formData, catchNo: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Subjects ({selectedSubjects.length} selected) *
                  </label>
                  <div className="grid grid-cols-1 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-[200px] overflow-y-auto">
                   {(
                      subjects.map((s) => (
                        <label key={s.subjectId} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded transition">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(s.subjectId)}
                            onChange={() => toggleSubject(s.subjectId)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-gray-700 text-sm">{s.subjectName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Project *</label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
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
                  <input
                    type="number"
                    value={formData.paperNumber}
                    onChange={(e) => setFormData({ ...formData, paperNumber: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Max Marks</label>
                  <input
                    type="number"
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Total Questions</label>
                  <input
                    type="number"
                    value={formData.totalQuestions}
                    onChange={(e) => setFormData({ ...formData, totalQuestions: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none"
                    min="0"
                  />
                </div>
              </div>

              {(() => {
                const handlePdfUpload = async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;

                  setUploading(true);
                  
                  const token = localStorage.getItem('token');
                  const formDataObj = new FormData();
                  formDataObj.append("file", file);

                  try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`
                      },
                      body: formDataObj
                    });

                    if (!response.ok) {
                      throw new Error("Failed to upload PDF");
                    }

                    const res = await response.json();
                    setFormData(prev => ({ ...prev, questionPaperPdfUrl: res.url }));
                    message.success("Question paper PDF uploaded successfully!");
                    
                  } catch (err) {
                    setError("Failed to upload question paper PDF: " + err.message);
                  } finally {
                    setUploading(false);
                  }
                };

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none"
                        rows="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Question Paper PDF</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handlePdfUpload}
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
                );
              })()}

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"
                >
                  {editingId ? "Update Configuration" : "Save Paper"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Papers Table */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="text-gray-500 font-medium">Fetching paper configurations...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No Papers Found</h3>
              <p className="text-gray-500 max-w-xs mx-auto mt-2">Start by adding a new paper or adjusting your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Paper Info</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Subject & Project</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Stats</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {papers.map((paper) => (
                    <tr key={paper.paperId} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                            {paper.paperCode.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none">{paper.paperCode}</p>
                            <p className="text-xs text-gray-500 mt-1">{paper.paperName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Subjects:</p>
                            <div className="flex flex-wrap gap-1">
                              {paper.subjectIds && paper.subjectIds.length > 0 ? (
                                paper.subjectNames.map((sp, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-lg">
                                    <BookOpen size={12} />
                                    {sp}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500">No subjects</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 flex items-center gap-1.5">
                            <Filter size={14} />
                            {projects.find(p => p.projectId === paper.projectId)?.projectName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-4">
                          <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Max</p>
                            <p className="text-sm font-bold text-gray-700">{paper.maxMarks}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Qs</p>
                            <p className="text-sm font-bold text-gray-700">{paper.totalQuestions}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          paper.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {paper.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={userType === 'admin' 
                              ? `/admin/subject-config?projectId=${encryptId(paper.projectId)}&subjectId=${encryptId(paper.subjectIds?.[0] || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`
                              : `/subject-config?projectId=${encryptId(paper.projectId)}&subjectId=${encryptId(paper.subjectIds?.[0] || 0)}&paperId=${encryptId(paper.paperId)}&from=papers`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold text-xs transition-colors"
                          >
                            <Layers size={14} />
                            Configure Sections
                          </Link>
                          <button
                            onClick={() => openAllocationModal(paper)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold text-xs transition-colors"
                          >
                            <Users size={14} />
                            Assign Examiners
                          </button>
                          <button
                            onClick={() => handleEdit(paper)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Examiner Allocation Modal */}
      {showExaminerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Assign Examiners</h3>
                <p className="text-sm text-gray-500">Allocation for {selectedPaper?.paperCode}: {selectedPaper?.paperName}</p>
              </div>
              <button 
                onClick={() => setShowExaminerModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Available Examiners */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Available Examiners</h4>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {availableExaminers.length} Found
                    </span>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search by name..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {allocationLoading ? (
                      <div className="text-center py-10 opacity-50">Loading examiners...</div>
                    ) : availableExaminers.filter(ex => 
                      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
                      !assignedExaminers.some(a => a.examinerId === ex.id)
                    ).map(examiner => (
                      <div key={examiner.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-blue-50 group transition-all">
                        <div className="flex items-center gap-3">
                          <img 
                            src={examiner.profileImage || "https://ui-avatars.com/api/?name=" + examiner.name} 
                            alt="" 
                            className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm"
                          />
                          <div>
                            <p className="text-sm font-bold text-gray-800">{examiner.name}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAssign(examiner.id)}
                          className="p-1.5 bg-white text-blue-600 rounded-lg shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                        >
                          <UserPlus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned Examiners */}
                <div>
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Assigned to Paper</h4>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {assignedExaminers.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                        <Users size={32} className="mx-auto text-gray-200 mb-2" />
                        <p className="text-xs text-gray-400 font-medium">No examiners assigned yet</p>
                      </div>
                    ) : (
                      assignedExaminers.map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img 
                                src={assignment.examiner?.profileImage || "https://ui-avatars.com/api/?name=" + assignment.examiner?.name} 
                                alt="" 
                                className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                              />
                              <div className="absolute -top-1 -right-1 bg-green-500 border-2 border-white w-3 h-3 rounded-full"></div>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-blue-900">{assignment.examiner?.name}</p>
                              <p className="text-[10px] text-blue-600/70">Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveAssignment(assignment.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowExaminerModal(false)}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
