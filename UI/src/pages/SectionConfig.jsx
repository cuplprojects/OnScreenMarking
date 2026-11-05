import {
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowLeft,
  BookOpen,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Award,
  Hash,
  ListTodo,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Filter,
  Users,
  Edit,
  X,
  Save,
  Check
} from 'lucide-react';
import { subjectService, sectionService, paperService, questionTypeService } from '../services';
import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';
import { decryptId, encryptId } from '../utils/encryption';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import message from '../services/messageService';

export default function SectionConfig() {
  const [searchParams, setSearchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get('projectId');
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  const urlSubjectId = searchParams.get('subjectId') ? parseInt(decryptId(searchParams.get('subjectId')), 10) : null;
  const urlPaperId = searchParams.get('paperId') ? parseInt(decryptId(searchParams.get('paperId')), 10) : null;
  const isProjectMode = Boolean(projectId && urlPaperId);
  const { userType } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const navigate = useNavigate();

  const handleBackFromSections = () => {
    navigate(-1);
  };

  const [projectData, setProjectData] = useState(null);
  const [sections, setSections] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [sectionMasters, setSectionMasters] = useState([]);
  const [showImportMasterModal, setShowImportMasterModal] = useState(false);
  const [selectedMasterSectionIds, setSelectedMasterSectionIds] = useState([]);
  const [importingMasters, setImportingMasters] = useState(false);
  const [overwriteExistingMasters, setOverwriteExistingMasters] = useState(false);

  const [sectionForm, setSectionForm] = useState({
    name: '',
    description: '',
    startQuestion: 1,
    endQuestion: 10,
    totalMarks: 10,
    maxQuestionsToAttempt: 10,
  });
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(false);

  const [questionTypesList, setQuestionTypesList] = useState([]);
  const [dbQuestionTypes, setDbQuestionTypes] = useState(['MCQ', 'SA', 'LA']);
  const [newTypeName, setNewTypeName] = useState('');
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [isSavingNewType, setIsSavingNewType] = useState(false);

  const fetchQuestionTypes = async () => {
    try {
      const data = await questionTypeService.getAllQuestionTypes();
      if (data && data.length > 0) {
        setQuestionTypesList(data);
        setDbQuestionTypes(data.map(d => d.questionTypeName));
      }
    } catch (err) {
      console.error("Failed to load question types", err);
    }
  };

  useEffect(() => {
    if (projectId) {
      const fromParam = searchParams.get('from');
      const isFromPapers = fromParam === 'papers';

      const parentPath = isFromPapers
        ? (userType === 'admin' ? '/admin/papers' : '/papers')
        : (userType === 'admin' ? '/admin/sessions' : '/sessions');

      const parentLabel = isFromPapers ? 'Paper Management' : 'Sessions & Projects';
      const parentIcon = isFromPapers ? 'FileText' : 'Calendar';

      let configPath = userType === 'admin'
        ? `/admin/section-config?projectId=${encryptedProjectId}`
        : `/section-config?projectId=${encryptedProjectId}`;

      const subjectIdParam = searchParams.get('subjectId');
      const paperIdParam = searchParams.get('paperId');
      if (subjectIdParam) configPath += `&subjectId=${subjectIdParam}`;
      if (paperIdParam) configPath += `&paperId=${paperIdParam}`;
      if (fromParam) configPath += `&from=${fromParam}`;

      setBreadcrumb([
        { label: parentLabel, path: parentPath, icon: parentIcon },
        { label: 'Section Configuration', path: configPath, icon: 'Layers' }
      ]);
      fetchQuestionTypes();
      fetchSectionMasters();
    }
  }, [projectId, encryptedProjectId, userType, searchParams]);

  const fetchSectionMasters = async () => {
    try {
      const data = await sectionService.getSectionMasters();
      setSectionMasters(data || []);
    } catch (err) {
      console.error("Failed to load section masters", err);
    }
  };

  useEffect(() => {
    if (urlPaperId) {
      fetchPaperDetails();
      fetchSections();
    }
  }, [urlPaperId]);

  const fetchPaperDetails = async () => {
    try {
      setLoading(true);
      const data = await paperService.getPaperById(urlPaperId);
      setSelectedPaper(data);
      if (data.subjectPapers && data.subjectPapers.length > 0) {
        setSelectedSubject({ subjectName: data.subjectPapers[0].subject.subjectName });
      }
    } catch (err) {
      message.error('Failed to fetch paper details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      if (isProjectMode) {
        const data = await sectionService.getProjectPaperSections({ projectId, paperId: urlPaperId });
        setSections(data || []);
      } else {
        const data = await sectionService.getAllSections(urlPaperId);
        setSections(data || []);
      }
    } catch (err) {
      message.error('Failed to fetch sections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionFormChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-fill from master if name matches and it's being typed
    if (name === 'name') {
      const matchedMaster = sectionMasters.find(m => m.name.toLowerCase() === value.trim().toLowerCase());
      if (matchedMaster && !editingSectionId) {
        setSectionForm(prev => ({
          ...prev,
          name: value,
          description: matchedMaster.description || prev.description,
          startQuestion: matchedMaster.startQuestion || prev.startQuestion,
          endQuestion: matchedMaster.endQuestion || prev.endQuestion,
          totalMarks: matchedMaster.totalMarks || prev.totalMarks,
          maxQuestionsToAttempt: matchedMaster.maxQuestionsToAttempt || prev.maxQuestionsToAttempt,
        }));
        return;
      }
    }
    
    setSectionForm(prev => ({
      ...prev,
      [name]: name === 'startQuestion' || name === 'endQuestion' || name === 'totalMarks' || name === 'maxQuestionsToAttempt'
        ? parseInt(value) || 0
        : value
    }));
  };

  const generateQuestions = () => {
    const { startQuestion, endQuestion, totalMarks } = sectionForm;
    const totalQuestions = endQuestion - startQuestion + 1;
    const marksPerQuestion = totalQuestions > 0 ? totalMarks / totalQuestions : 0;

    const generatedQuestions = [];
    const defaultQt = questionTypesList.length > 0 ? questionTypesList[0] : null;
    for (let i = startQuestion; i <= endQuestion; i++) {
      const qNoStr = i.toString();
      const existingQ = questions.find(q => String(q.questionNo) === qNoStr);
      generatedQuestions.push({
        questionId: existingQ?.questionId || 0,
        questionNo: qNoStr,
        marks: existingQ?.marks !== undefined ? existingQ.marks : parseFloat(marksPerQuestion.toFixed(2)),
        typeId: existingQ?.typeId || defaultQt?.questionTypeId || null,
        type: existingQ?.type || defaultQt?.questionTypeName || '',
        isOptional: existingQ?.isOptional !== undefined ? existingQ.isOptional : false,
        optionalGroupCode: existingQ?.optionalGroupCode || '',
      });
    }
    setQuestions(generatedQuestions);
    setShowQuestionPreview(true);
  };

  const handleAddQuestion = () => {
    let nextNo = "";
    if (questions.length > 0) {
      const lastNoStr = String(questions[questions.length - 1].questionNo);
      const match = lastNoStr.match(/^(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        nextNo = num.toString();
      } else {
        nextNo = (questions.length + 1).toString();
      }
    } else {
      nextNo = (sectionForm.startQuestion || 1).toString();
    }

    const defaultQt = questionTypesList.length > 0 ? questionTypesList[0] : null;
    setQuestions(prev => [
      ...prev,
      {
        questionNo: nextNo,
        marks: prev.length > 0 ? prev[prev.length - 1].marks : 1,
        typeId: prev.length > 0 ? prev[prev.length - 1].typeId : (defaultQt?.questionTypeId || null),
        type: prev.length > 0 ? prev[prev.length - 1].type : (defaultQt?.questionTypeName || ''),
        isOptional: false,
        optionalGroupCode: '',
      }
    ]);
    setShowQuestionPreview(true);
  };

  const handleDeleteQuestionRow = (index) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: field === 'marks' ? parseFloat(value) || 0 : value
    };
    setQuestions(updatedQuestions);
  };

  const handleImportMasterSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMasterSectionIds || selectedMasterSectionIds.length === 0) {
      message.error("Please select at least one master section to import");
      return;
    }

    // Validate that selected master sections match paper total questions
    if (selectedPaper && selectedPaper.totalQuestions && overwriteExistingMasters) {
      const selectedMasters = sectionMasters.filter(m => selectedMasterSectionIds.includes(m.id));
      const importTotalQ = selectedMasters.reduce((sum, m) => sum + (parseInt(m.totalQuestions, 10) || 0), 0);
      if (importTotalQ !== selectedPaper.totalQuestions) {
        message.error(
          `Incorrect Configuration: Selected master sections have a total of ${importTotalQ} questions, but this paper has ${selectedPaper.totalQuestions} total questions. Total Questions must be ${importTotalQ} only.`
        );
        return;
      }
    }

    setImportingMasters(true);
    try {
      if (isProjectMode) {
        await sectionService.importMastersToProjectPaper({
          projectId: parseInt(projectId, 10),
          paperId: urlPaperId,
          masterSectionIds: selectedMasterSectionIds,
          overwriteExisting: overwriteExistingMasters
        });
      } else {
        await sectionService.importMasterSections({
          paperId: urlPaperId,
          masterSectionIds: selectedMasterSectionIds,
          overwriteExisting: overwriteExistingMasters
        });
      }
      message.success("Master sections imported successfully!");
      setShowImportMasterModal(false);
      await fetchSections();
      await fetchPaperDetails();
    } catch (err) {
      message.error("Failed to import master sections: " + (err.response?.data?.message || err.message));
    } finally {
      setImportingMasters(false);
    }
  };

  const handleEditSection = (section) => {
    setSectionForm({
      name: section.name,
      description: section.description,
      startQuestion: section.startQuestion,
      endQuestion: section.endQuestion,
      totalMarks: section.totalMarks,
      maxQuestionsToAttempt: section.maxQuestionsToAttempt,
    });
    setQuestions((section.questions || []).map(q => {
      const matchedQt = questionTypesList.find(qt => qt.questionTypeId === q.typeId || qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase());
      return {
        ...q,
        questionId: q.questionId || q.id || 0,
        questionNo: q.questionNo?.toString() || '',
        marks: q.marks !== undefined ? q.marks : 0,
        typeId: q.typeId || matchedQt?.questionTypeId || null,
        type: q.type || matchedQt?.questionTypeName || '',
        isOptional: Boolean(q.isOptional),
        optionalGroupCode: q.optionalGroupCode || ''
      };
    }));
    setEditingSectionId(section.id);
    setShowSectionForm(true);
    setShowQuestionPreview(true);
  };

  const handleSaveSection = async () => {
    if (questions.some(q => !q.type && !q.typeId)) {
      message.warning('Please select a type for all questions', 8000);
      const firstMissingIdx = questions.findIndex(q => !q.type && !q.typeId);
      if (firstMissingIdx !== -1) {
        const el = document.getElementById(`question-type-select-${firstMissingIdx}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    const expectedTotalMarks = parseFloat(sectionForm.totalMarks) || 0;

    // Validate that the section's total marks don't exceed the paper's max marks
    if (selectedPaper) {
      const currentOtherSectionMarks = sections
        .filter(s => s.id !== editingSectionId)
        .reduce((sum, s) => sum + s.totalMarks, 0);
        
      if (currentOtherSectionMarks + expectedTotalMarks > selectedPaper.maxMarks) {
        message.error(`Cannot save section! The total allocated marks (${currentOtherSectionMarks + expectedTotalMarks}) would exceed the paper's maximum marks (${selectedPaper.maxMarks}).`);
        return;
      }
      
      const maxEndQuestion = Math.max(
        ...sections.filter(s => s.id !== editingSectionId).map(s => s.endQuestion),
        sectionForm.endQuestion
      );
      
      if (selectedPaper.totalQuestions > 0 && maxEndQuestion > selectedPaper.totalQuestions) {
        message.error(`Cannot save section! The end question (Q${sectionForm.endQuestion}) exceeds the paper's total questions (${selectedPaper.totalQuestions}).`);
        return;
      }
    }

    // Validate if the sum of individual question marks matches the section's total marks
    const maxAttempts = parseInt(sectionForm.maxQuestionsToAttempt) || questions.length;

    const compulsoryMarks = questions.filter(q => !q.isOptional).map(q => parseFloat(q.marks) || 0);
    const independentOptionalMarks = questions.filter(q => q.isOptional && !q.optionalGroupCode).map(q => parseFloat(q.marks) || 0);

    const groupCodeToMarks = {};
    questions.forEach(q => {
      if (q.isOptional && q.optionalGroupCode) {
        const code = q.optionalGroupCode.trim();
        if (code) {
          const marks = parseFloat(q.marks) || 0;
          if (!groupCodeToMarks[code] || marks > groupCodeToMarks[code]) {
            groupCodeToMarks[code] = marks;
          }
        } else {
          independentOptionalMarks.push(parseFloat(q.marks) || 0);
        }
      }
    });

    const groupOptionalMarks = Object.values(groupCodeToMarks);
    const selectablePool = [...compulsoryMarks, ...independentOptionalMarks, ...groupOptionalMarks];
    selectablePool.sort((a, b) => b - a);

    const maxAchievableSum = selectablePool.slice(0, maxAttempts).reduce((sum, m) => sum + m, 0);

    if (Math.abs(maxAchievableSum - expectedTotalMarks) > 0.01) {
      if (maxAttempts < questions.length) {
        message.warning(`Mismatched Marks! Under 'Structure' in the left panel, the section's Total Marks is configured as ${sectionForm.totalMarks}. However, based on attempting a maximum of ${maxAttempts} question(s) and optional group rules, the maximum achievable marks is ${maxAchievableSum}. Please update the section's Total Marks to ${maxAchievableSum} or adjust the Attempt count to ${selectablePool.length} before saving.`);
      } else {
        message.warning(`Mismatched Marks! Under 'Structure' in the left panel, the section's Total Marks is configured as ${sectionForm.totalMarks}. However, based on optional group rules, the maximum achievable marks from compulsory and optional choices is ${maxAchievableSum}. Please update the section's Total Marks to ${maxAchievableSum} before saving.`);
      }
      return;
    }

    try {
      setLoading(true);
      // Find existing batchId from previously configured sections for this paper
      const existingBatchId = sections && sections.length > 0 ? (sections.find(s => s.batchId > 0)?.batchId || 0) : 0;

      if (isProjectMode) {
        const projectPaperSectionData = {
          ...sectionForm,
          batchId: editingSectionId 
            ? (sections.find(s => s.id === editingSectionId)?.batchId || existingBatchId || 0)
            : (existingBatchId || 0),
          totalQuestions: questions.length,
          projectId: parseInt(projectId, 10),
          paperId: selectedPaper.paperId,
          questions: questions.map(q => ({
            ...q,
            questionId: q.questionId || 0,
            marks: parseFloat(q.marks)
          }))
        };

        if (editingSectionId) {
          await sectionService.updateProjectPaperSection(editingSectionId, projectPaperSectionData);
          message.success('Project paper section updated successfully');
        } else {
          await sectionService.createProjectPaperSection(projectPaperSectionData);
          message.success('Project paper section created successfully');
        }
      } else {
        const sectionData = {
          ...sectionForm,
          batchId: editingSectionId 
            ? (sections.find(s => s.id === editingSectionId)?.batchId || existingBatchId || 0)
            : (existingBatchId || 0),
          totalQuestions: questions.length,
          paperId: selectedPaper.paperId,
          questions: questions.map(q => ({
            ...q,
            questionId: q.questionId || 0,
            marks: parseFloat(q.marks)
          }))
        };

        if (editingSectionId) {
          await sectionService.updateSection(editingSectionId, sectionData);
          message.success('Section updated successfully');
        } else {
          await sectionService.createSection(sectionData);
          message.success('Section created successfully');
        }
      }

      setShowSectionForm(false);
      setShowQuestionPreview(false);
      setEditingSectionId(null);
      setSectionForm({
        name: '',
        description: '',
        startQuestion: 1,
        endQuestion: 10,
        totalMarks: 10,
        maxQuestionsToAttempt: 10,
      });
      setQuestions([]);
      fetchSections();
    } catch (err) {
      message.error('Failed to save section');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteSection = (sectionId) => {
    setSectionToDelete(sectionId);
  };

  const executeDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      setLoading(true);
      if (isProjectMode) {
        await sectionService.deleteProjectPaperSection(sectionToDelete);
        message.success('Project paper section deleted successfully!');
      } else {
        await sectionService.deleteSection(sectionToDelete);
        message.success('Section deleted successfully!');
      }
      await fetchSections();
    } catch (err) {
      message.error('Failed to delete section');
      console.error(err);
    } finally {
      setLoading(false);
      setSectionToDelete(null);
    }
  };

  const calculateTotalSectionMarks = () => {
    return sections.reduce((total, section) => total + section.totalMarks, 0);
  };

  const calculateAverageMarks = (section) => {
    if (section.questions && section.questions.length > 0) {
      // Group marks by base question number (e.g. 18A, 18B, 18C belong to base question 18)
      const mainQuestionMarks = {};
      section.questions.forEach(q => {
        const baseNo = String(q.questionNo || '').match(/^\d+/)?.[0] || String(q.questionNo);
        const marks = parseFloat(q.marks) || 0;
        mainQuestionMarks[baseNo] = (mainQuestionMarks[baseNo] || 0) + marks;
      });

      const questionTotals = Object.values(mainQuestionMarks);
      if (questionTotals.length > 0) {
        const sumMarks = questionTotals.reduce((sum, m) => sum + m, 0);
        return (sumMarks / questionTotals.length).toFixed(1);
      }
    }
    const count = (section.endQuestion >= section.startQuestion)
      ? (section.endQuestion - section.startQuestion + 1)
      : (section.totalQuestions || 1);
    return count > 0 ? (section.totalMarks / count).toFixed(1) : '0.0';
  };

  const isAddSectionDisabled = () => {
    if (!selectedPaper) return true;

    // Block if allocated marks reaches or exceeds paper's max marks
    const totalSectionMarks = calculateTotalSectionMarks();
    if (totalSectionMarks >= selectedPaper.maxMarks) return true;

    // Block if configured endQuestion in any section reaches or exceeds paper's totalQuestions
    if (selectedPaper.totalQuestions > 0 && sections.some(s => s.endQuestion >= selectedPaper.totalQuestions)) {
      return true;
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none px-4 py-3 lg:px-8 lg:py-4">
      <div className="w-full space-y-4">
        {/* Single Standard Header Div (as in Users page) */}
        <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: Back button + Title & Info */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackFromSections}
                className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-lg transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                    Section Configuration
                  </h1>
                  
                </div>
                <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-1.5 font-medium">
                  <span>Structure and manage examination sections</span>
                  {(selectedSubject?.subjectName || selectedPaper?.paperName) && (
                    <>
                      <span className="text-gray-300">&bull;</span>
                      <span className="text-gray-700 font-semibold">{selectedSubject?.subjectName}</span>
                      {selectedPaper?.paperName && (
                        <>
                          <ChevronRight size={12} className="text-gray-400" />
                          <span className="text-teal-700 font-bold">{selectedPaper.paperName}</span>
                          {selectedPaper.paperCode && (
                            <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                              {selectedPaper.paperCode}
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Marks status pills & Action buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Status Counters */}
              <div className="flex items-center gap-2">
                {/* MAX */}
                <div className="bg-teal-50/70 border border-teal-100 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                  <Award size={14} className="text-teal-600 shrink-0" />
                  <div className="leading-tight">
                    <span className="text-[9px] text-teal-700 font-extrabold uppercase tracking-wider block">Max</span>
                    <span className="text-xs font-black text-gray-900">{selectedPaper?.maxMarks ?? 0}</span>
                  </div>
                </div>

                {/* ALLOCATED */}
                <div className="bg-emerald-50/70 border border-emerald-100 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <div className="leading-tight">
                    <span className="text-[9px] text-emerald-700 font-extrabold uppercase tracking-wider block">Allocated</span>
                    <span className="text-xs font-black text-gray-900">{calculateTotalSectionMarks()}</span>
                  </div>
                </div>

                {/* LEFT */}
                {(() => {
                  const leftMarks = (selectedPaper?.maxMarks || 0) - calculateTotalSectionMarks();
                  const isLeftZero = leftMarks === 0;
                  const isLeftNegative = leftMarks < 0;
                  return (
                    <div className={`px-2.5 py-1.5 rounded-lg flex items-center gap-2 border ${
                      isLeftZero 
                        ? 'bg-gray-50 border-gray-200 text-gray-600' 
                        : isLeftNegative 
                        ? 'bg-red-50/70 border-red-200 text-red-700' 
                        : 'bg-amber-50/70 border-amber-200 text-amber-700'
                    }`}>
                      <Clock size={14} className="shrink-0" />
                      <div className="leading-tight">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider block">Left</span>
                        <span className="text-xs font-black">{leftMarks}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Section Creation / Edit Form */}
        {showSectionForm && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm animate-in zoom-in-95 duration-200 p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-50 border border-teal-100 rounded-lg flex items-center justify-center text-teal-700 font-bold">
                  <Layers size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    {editingSectionId ? 'Edit Section' : 'Create Section'}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Define section parameters, question ranges, and allocate marks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowSectionForm(false);
                    setShowQuestionPreview(false);
                    setEditingSectionId(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveSection}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={13} />
                  )}
                  <span>{loading ? 'Saving...' : 'Save Section'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Left Column: Section Details & Structure */}
              <div className="xl:col-span-4 space-y-4">
                {/* Section Details Card */}
                <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 space-y-3">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                    Section Details
                  </label>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Section Name *</label>
                    <input
                      type="text"
                      name="name"
                      list="sectionMastersList"
                      value={sectionForm.name}
                      onChange={handleSectionFormChange}
                      className="w-full bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-xs font-semibold"
                      placeholder="e.g. Section A"
                      autoComplete="off"
                    />
                    <datalist id="sectionMastersList">
                      {sectionMasters.map(m => (
                        <option key={m.id} value={m.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Description (Optional)</label>
                    <textarea
                      name="description"
                      value={sectionForm.description}
                      onChange={handleSectionFormChange}
                      className="w-full bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none h-20 text-xs font-medium resize-none"
                      placeholder="Brief description or instructions for this section..."
                    />
                  </div>
                </div>

                {/* Structure Card */}
                <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 space-y-3">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                    Questions & Marks Structure
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 mb-1">Start Q#</p>
                      <input
                        type="number"
                        name="startQuestion"
                        value={sectionForm.startQuestion}
                        onChange={handleSectionFormChange}
                        className="w-full bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 mb-1">End Q#</p>
                      <input
                        type="number"
                        name="endQuestion"
                        value={sectionForm.endQuestion}
                        onChange={handleSectionFormChange}
                        className="w-full bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 mb-1">Total Marks</p>
                      <input
                        type="number"
                        name="totalMarks"
                        value={sectionForm.totalMarks}
                        onChange={handleSectionFormChange}
                        className="w-full bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 mb-1">Max To Attempt</p>
                      <input
                        type="number"
                        name="maxQuestionsToAttempt"
                        value={sectionForm.maxQuestionsToAttempt}
                        onChange={handleSectionFormChange}
                        className="w-full bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={generateQuestions}
                    className="w-full mt-2 bg-teal-700 hover:bg-teal-800 text-white py-2 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ListTodo size={13} />
                    <span>{showQuestionPreview ? "Regenerate Questions" : "Generate Questions"}</span>
                  </button>
                </div>

                {/* Bulk Options */}
                {showQuestionPreview && (
                  <div className="bg-teal-50/60 p-3.5 rounded-xl border border-teal-100 animate-in slide-in-from-top-2 duration-200 space-y-2">
                    <label className="block text-teal-800 text-[10px] font-extrabold uppercase tracking-wider">
                      Bulk Type Selector
                    </label>
                    <div>
                      <p className="text-[10px] text-teal-700 font-semibold mb-1">Set question type for all questions:</p>
                      <select
                        value={
                          questions.length > 0 && questions.every(q => (q.typeId && q.typeId === questions[0].typeId) || (q.type && q.type === questions[0].type))
                            ? (questions[0].typeId || questions[0].type)
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = questionTypesList.find(qt => String(qt.questionTypeId) === String(val) || qt.questionTypeName === val);
                          if (matched) {
                            setQuestions(prev => prev.map(q => ({ ...q, typeId: matched.questionTypeId, type: matched.questionTypeName })));
                          } else if (val) {
                            setQuestions(prev => prev.map(q => ({ ...q, type: val })));
                          }
                        }}
                        className="w-full bg-white px-3 py-1.5 rounded-lg border border-teal-200 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-xs"
                      >
                        <option value="">Choose Type...</option>
                        {questionTypesList.length > 0 ? (
                          questionTypesList.map(qt => (
                            <option key={qt.questionTypeId} value={qt.questionTypeId}>
                              {qt.questionTypeName}
                            </option>
                          ))
                        ) : (
                          dbQuestionTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))
                        )}
                      </select>

                      {showNewTypeInput ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            className="flex-grow bg-white px-2.5 py-1 rounded-lg border border-teal-200 text-xs font-semibold text-gray-700 focus:ring-1 focus:ring-teal-500 outline-none"
                            placeholder="Type name (e.g. MCQ)"
                            disabled={isSavingNewType}
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!newTypeName.trim()) return;
                              try {
                                setIsSavingNewType(true);
                                await questionTypeService.createQuestionType({ questionTypeName: newTypeName.trim().toUpperCase() });
                                message.success('Question type added successfully');
                                setNewTypeName('');
                                setShowNewTypeInput(false);
                                await fetchQuestionTypes();
                              } catch (err) {
                                message.error(err.message || 'Failed to create question type');
                              } finally {
                                setIsSavingNewType(false);
                              }
                            }}
                            className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                            disabled={isSavingNewType}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewTypeInput(false)}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                            disabled={isSavingNewType}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowNewTypeInput(true)}
                          className="text-[10px] text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1 mt-1.5 cursor-pointer"
                        >
                          <Plus size={12} /> Add New Type
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Questions Grid Preview */}
              <div className="xl:col-span-8">
                {showQuestionPreview ? (
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col h-[540px] shadow-xs">
                    <div className="bg-gray-50/70 py-2.5 px-4 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                          Question Breakdown
                        </h4>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full">
                          {questions.length} Questions
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="flex items-center gap-1 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-[10px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add Question</span>
                      </button>
                    </div>
                    <div className="overflow-auto flex-grow custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-100">
                          <tr className="text-[10px] font-black text-gray-450 uppercase tracking-widest select-none">
                            <th className="px-4 py-2.5">Q No</th>
                            <th className="px-4 py-2.5">Marks</th>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5 text-center">Optional</th>
                            <th className="px-4 py-2.5">Group</th>
                            <th className="px-4 py-2.5 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {questions.map((q, idx) => (
                            <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-400 font-bold text-xs">#</span>
                                  <input
                                    type="text"
                                    value={q.questionNo}
                                    onChange={(e) => handleQuestionChange(idx, 'questionNo', e.target.value)}
                                    className="w-16 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                                    placeholder="No."
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  value={q.marks}
                                  onChange={(e) => handleQuestionChange(idx, 'marks', e.target.value)}
                                  className="w-16 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 text-xs font-semibold focus:bg-white focus:ring-1 focus:ring-teal-500 outline-none"
                                  step="0.5"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  id={`question-type-select-${idx}`}
                                  value={q.typeId || q.type || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const matched = questionTypesList.find(qt => String(qt.questionTypeId) === String(val) || qt.questionTypeName === val);
                                    if (matched) {
                                      handleQuestionChange(idx, 'typeId', matched.questionTypeId);
                                      handleQuestionChange(idx, 'type', matched.questionTypeName);
                                    } else {
                                      handleQuestionChange(idx, 'type', val);
                                    }
                                  }}
                                  className={`w-full bg-gray-50 px-2 py-1 rounded-md border text-xs font-semibold outline-none ${
                                    !q.type && !q.typeId ? 'border-red-200' : 'border-gray-200 focus:ring-1 focus:ring-teal-500'
                                  }`}
                                >
                                  <option value="">Choose Type</option>
                                  {questionTypesList.length > 0 ? (
                                    questionTypesList.map(qt => (
                                      <option key={qt.questionTypeId} value={qt.questionTypeId}>
                                        {qt.questionTypeName}
                                      </option>
                                    ))
                                  ) : (
                                    dbQuestionTypes.map(type => (
                                      <option key={type} value={type}>{type}</option>
                                    ))
                                  )}
                                </select>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={q.isOptional}
                                  onChange={(e) => handleQuestionChange(idx, 'isOptional', e.target.checked)}
                                  className="w-3.5 h-3.5 rounded text-teal-700 focus:ring-teal-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={q.optionalGroupCode || ''}
                                  onChange={(e) => handleQuestionChange(idx, 'optionalGroupCode', e.target.value)}
                                  className={`w-14 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 text-xs font-semibold ${!q.isOptional && 'opacity-30'}`}
                                  placeholder="Grp"
                                  disabled={!q.isOptional}
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestionRow(idx)}
                                  className="p-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-md transition-all cursor-pointer"
                                  title="Delete Question"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-xl min-h-[360px] p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                      <ListTodo size={20} />
                    </div>
                    <p className="text-gray-700 font-bold text-xs">Ready to configure questions</p>
                    <p className="text-gray-400 text-[11px] max-w-sm mt-1">
                      Complete the section structure on the left and click <span className="font-bold text-teal-700">Generate Questions</span> to configure individual marks and types.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Existing Sections List (Table Format matching Users page) */}
        {sections.length > 0 && !showSectionForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-teal-700" />
                <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Configured Sections</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-teal-100 text-teal-800">
                  {sections.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingSectionId(null);
                    setShowSectionForm(true);
                  }}
                  disabled={isAddSectionDisabled()}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                    isAddSectionDisabled()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm hover:shadow'
                  }`}
                >
                  <Plus size={13} />
                  <span>Add Section</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-450 uppercase tracking-widest select-none">
                    <th className="py-2.5 md:px-6 px-4">Section</th>
                    <th className="py-2.5 md:px-6 px-4">Questions</th>
                    <th className="py-2.5 md:px-6 px-4">Total Marks</th>
                    <th className="py-2.5 md:px-6 px-4">Attempt</th>
                    <th className="py-2.5 md:px-6 px-4">Avg Marks</th>
                    <th className="py-2.5 md:px-6 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {sections.map((section) => (
                    <tr key={section.id} className="hover:bg-teal-50/30 transition-colors group">
                      <td className="py-3 md:px-6 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-black text-xs shrink-0">
                            {section.name.replace(/^Section\s+/i, '').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-gray-900 text-xs">
                                {section.name.toLowerCase().startsWith('section') ? section.name : `Section ${section.name}`}
                              </span>
                              {section.batchId && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200/60 rounded">
                                  Batch #{section.batchId}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 max-w-[240px] truncate" title={section.description}>
                              {section.description || 'No description'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 md:px-6 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-xs">Q{section.startQuestion} - Q{section.endQuestion}</span>
                          <span className="text-[11px] text-gray-400">{section.questions?.length || 0} questions</span>
                        </div>
                      </td>
                      <td className="py-3 md:px-6 px-4 font-bold text-gray-900 text-xs">{section.totalMarks}</td>
                      <td className="py-3 md:px-6 px-4 font-bold text-gray-900 text-xs">{section.maxQuestionsToAttempt}</td>
                      <td className="py-3 md:px-6 px-4 font-bold text-gray-900 text-xs">
                        {calculateAverageMarks(section)}
                      </td>
                      <td className="py-3 md:px-6 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditSection(section)}
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Section"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => confirmDeleteSection(section.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg transition-colors cursor-pointer"
                            title="Delete Section"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {sections.length === 0 && !showSectionForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center max-w-lg mx-auto space-y-3">
            <Layers className="mx-auto text-gray-300" size={36} />
            <div>
              <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">No Sections Configured</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Start by creating your first examination section or import predefined master sections.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              {sectionMasters.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedMasterSectionIds(sectionMasters.map(m => m.id));
                    setShowImportMasterModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                >
                  <Layers size={13} />
                  <span>Import Masters</span>
                </button>
              )}
              <button
                onClick={() => setShowSectionForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                <Plus size={13} />
                <span>Create Section</span>
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {sectionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="text-center p-5">
                <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3 text-red-600">
                  <Trash2 size={20} />
                </div>
                <h3 className="text-sm font-black text-gray-900 mb-1">Delete Section?</h3>
                <p className="text-xs text-gray-500 mb-5">
                  Are you sure you want to delete this section? This action cannot be undone and will remove all questions configured within it.
                </p>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setSectionToDelete(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-md text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDeleteSection}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-md text-[10px] uppercase tracking-wider transition-colors flex justify-center items-center shadow-xs cursor-pointer"
                    disabled={loading}
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Master Sections Modal */}
        {showImportMasterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden border border-gray-100">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">Import Master Sections</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                      For {selectedPaper?.paperCode}: {selectedPaper?.paperName}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowImportMasterModal(false)} 
                  className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleImportMasterSubmit} className="space-y-4 p-5">
                <p className="text-xs text-gray-600">
                  Choose the predefined Master Sections to create in this paper. Questions and marks will be generated automatically based on the master configuration.
                </p>

                {(() => {
                  const selectedMasters = sectionMasters.filter(m => selectedMasterSectionIds.includes(m.id));
                  const importTotalQ = selectedMasters.reduce((sum, m) => sum + (parseInt(m.totalQuestions, 10) || 0), 0);
                  const isImportMismatch = selectedPaper && selectedPaper.totalQuestions && selectedMasterSectionIds.length > 0 && importTotalQ !== selectedPaper.totalQuestions;
                  if (!isImportMismatch) return null;
                  return (
                    <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs animate-in fade-in">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-amber-950 uppercase tracking-wide text-[11px]">Incorrect Configuration:</span>{" "}
                        Selected master sections total <strong>{importTotalQ} questions</strong>, but paper requires <strong>{selectedPaper.totalQuestions} questions</strong>.
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {sectionMasters.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No master sections found.</p>
                  ) : (
                    sectionMasters.map(master => {
                      const isChecked = selectedMasterSectionIds.includes(master.id);
                      return (
                        <label
                          key={master.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                            isChecked ? 'bg-teal-50/60 border-teal-300 shadow-xs' : 'bg-white border-gray-200 hover:bg-gray-50'
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
                            className="mt-0.5 rounded border-gray-300 text-teal-700 focus:ring-teal-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900 text-xs">{master.name}</span>
                                {master.batchId && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200/60 rounded">
                                    Batch #{master.batchId}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
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

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedMasterSectionIds(sectionMasters.map(m => m.id))}
                    className="text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMasterSectionIds([])}
                    className="text-xs text-gray-500 font-bold hover:underline cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>

                {sections.length > 0 && (
                  <label className="flex items-center gap-2 pt-2 border-t border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwriteExistingMasters}
                      onChange={(e) => setOverwriteExistingMasters(e.target.checked)}
                      className="rounded border-gray-300 text-teal-700 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700">Overwrite existing sections on this paper</span>
                  </label>
                )}

                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowImportMasterModal(false)}
                    className="px-4 py-2 text-[10px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importingMasters || selectedMasterSectionIds.length === 0}
                    className="px-4 py-2 text-[10px] font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-md uppercase tracking-wider shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {importingMasters ? 'Importing...' : 'Import Master Sections'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
