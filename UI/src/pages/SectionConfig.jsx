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
  Check,
  Eye,
  Sparkles
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
  const editBatchId = searchParams.get('editBatch') ? parseInt(searchParams.get('editBatch'), 10) : null;
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
  const [previewModalBatchId, setPreviewModalBatchId] = useState(null);

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
      // Backend returns paginated response: { items, totalCount, page, pageSize, totalPages }
      setSectionMasters(data?.items || data || []);
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

  // Handle automatic opening of add section form when coming from allocate sections
  useEffect(() => {
    const addSectionParam = searchParams.get('addSection');
    if (addSectionParam === 'true' && !showSectionForm) {
      setShowSectionForm(true);
      // Clear the parameter from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('addSection');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, showSectionForm]);

  // Handle edit batch mode - load sections from selected batch
  useEffect(() => {
    if (editBatchId && sectionMasters.length > 0) {
      const batchSections = sectionMasters.filter(m => m.batchId === editBatchId);
      if (batchSections.length > 0) {
        // Automatically select and open the first section for editing
        handleEditSection(batchSections[0]);
        // Clear the editBatch parameter from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('editBatch');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [editBatchId, sectionMasters]);

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
        setSections(Array.isArray(data) ? data : (data?.sections || []));
      } else {
        const data = await sectionService.getAllSections(urlPaperId);
        setSections(Array.isArray(data) ? data : (data?.sections || []));
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

    // When totalMarks changes, automatically redistribute marks across existing questions!
    if (name === 'totalMarks' && questions && questions.length > 0) {
      const newTotal = parseFloat(value) || 0;
      const qCount = questions.length;
      const newMarksPerQ = qCount > 0 ? parseFloat((newTotal / qCount).toFixed(2)) : 0;
      setQuestions(prev => prev.map((q, qIndex) => {
        let mark = newMarksPerQ;
        if (qIndex === qCount - 1 && qCount > 1) {
          const prevTotal = newMarksPerQ * (qCount - 1);
          const diff = parseFloat((newTotal - prevTotal).toFixed(2));
          if (Math.abs(diff - newMarksPerQ) <= 0.05) {
            mark = diff;
          }
        }
        return {
          ...q,
          marks: mark,
        };
      }));
    }
  };

  const generateQuestions = () => {
    const { startQuestion, endQuestion, totalMarks } = sectionForm;
    const start = parseInt(startQuestion, 10) || 1;
    const end = parseInt(endQuestion, 10) || 1;
    const totalQuestions = end - start + 1;

    if (totalQuestions <= 0) {
      message.error('End question must be greater than or equal to start question');
      return;
    }

    const marksPerQuestion = totalQuestions > 0 ? parseFloat((totalMarks / totalQuestions).toFixed(2)) : 0;

    const generatedQuestions = [];
    const defaultQt = questionTypesList.length > 0 ? questionTypesList[0] : null;
    for (let i = start; i <= end; i++) {
      const qNoStr = i.toString();
      const existingQ = questions.find(q => String(q.questionNo) === qNoStr);
      const matchedQt = questionTypesList.find(qt => 
        (existingQ?.questionTypeId && qt.questionTypeId === existingQ.questionTypeId) ||
        (existingQ?.typeId && qt.questionTypeId === existingQ.typeId) || 
        (existingQ?.type && qt.questionTypeName?.toLowerCase() === existingQ.type?.toLowerCase())
      ) || defaultQt;

      // Adjust last question mark if there is a tiny floating remainder so total sum is exact
      let qMark = marksPerQuestion;
      if (i === end && totalQuestions > 1) {
        const prevTotal = marksPerQuestion * (totalQuestions - 1);
        const diff = parseFloat((totalMarks - prevTotal).toFixed(2));
        if (Math.abs(diff - marksPerQuestion) <= 0.05) {
          qMark = diff;
        }
      }

      generatedQuestions.push({
        questionId: existingQ?.questionId || 0,
        questionNo: qNoStr,
        marks: qMark,
        typeId: matchedQt?.questionTypeId || null,
        questionTypeId: matchedQt?.questionTypeId || null,
        type: matchedQt?.questionTypeName || existingQ?.type || '',
        isOptional: existingQ?.isOptional !== undefined ? existingQ.isOptional : false,
        optionalGroupCode: existingQ?.optionalGroupCode || '',
      });
    }
    setQuestions(generatedQuestions);
    setShowQuestionPreview(true);
    message.success(`Questions regenerated (${totalQuestions} questions, ${totalMarks} total marks, ${marksPerQuestion} marks each)`);
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
    const prevTypeId = prev => prev.length > 0 ? (prev[prev.length - 1].questionTypeId || prev[prev.length - 1].typeId) : (defaultQt?.questionTypeId || null);
    const prevType = prev => prev.length > 0 ? prev[prev.length - 1].type : (defaultQt?.questionTypeName || '');

    setQuestions(prev => [
      ...prev,
      {
        questionNo: nextNo,
        marks: prev.length > 0 ? prev[prev.length - 1].marks : 1,
        typeId: prevTypeId(prev),
        questionTypeId: prevTypeId(prev),
        type: prevType(prev),
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
    setQuestions(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;

      if (typeof field === 'object' && field !== null) {
        updated[index] = {
          ...updated[index],
          ...field
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: field === 'marks' ? (value === '' ? '' : (parseFloat(value) || 0)) : value
        };
      }
      return updated;
    });
  };

  const handleImportBatch = async (bId, bSections) => {
    if (!bSections || bSections.length === 0) return;
    const bSecIds = bSections.map(s => s.id);
    const bTotalQ = bSections.reduce((sum, s) => sum + (parseInt(s.totalQuestions, 10) || 0), 0);

    // Validate paper total questions
    if (selectedPaper && selectedPaper.totalQuestions && bTotalQ !== selectedPaper.totalQuestions) {
      message.warning(
        `Note: Batch #${bId} has ${bTotalQ} questions, while paper indicates ${selectedPaper.totalQuestions} questions.`
      );
    }

    setImportingMasters(true);
    try {
      if (isProjectMode) {
        await sectionService.importMastersToProjectPaper({
          projectId: parseInt(projectId, 10),
          paperId: urlPaperId,
          masterSectionIds: bSecIds,
          overwriteExisting: true
        });
      } else {
        await sectionService.importMasterSections({
          paperId: urlPaperId,
          masterSectionIds: bSecIds,
          overwriteExisting: true
        });
      }
      message.success(`Batch #${bId} imported successfully!`);
      setShowImportMasterModal(false);
      await fetchSections();
      await fetchPaperDetails();
    } catch (err) {
      message.error("Failed to import batch: " + (err.response?.data?.message || err.message));
    } finally {
      setImportingMasters(false);
    }
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
      const matchedQt = questionTypesList.find(qt => 
        (q.questionTypeId && qt.questionTypeId === q.questionTypeId) ||
        (q.typeId && qt.questionTypeId === q.typeId) || 
        (q.type && qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())
      );
      const resolvedTypeId = matchedQt?.questionTypeId || q.questionTypeId || q.typeId || null;
      const resolvedTypeName = matchedQt?.questionTypeName || q.type || '';
      return {
        ...q,
        questionId: q.questionId || q.id || 0,
        questionNo: q.questionNo?.toString() || '',
        marks: q.marks !== undefined ? q.marks : 0,
        typeId: resolvedTypeId,
        questionTypeId: resolvedTypeId,
        type: resolvedTypeName,
        isOptional: Boolean(q.isOptional),
        optionalGroupCode: q.optionalGroupCode || ''
      };
    }));
    setEditingSectionId(section.id);
    setShowSectionForm(true);
    setShowQuestionPreview(true);
  };

  const handleSaveSection = async () => {
    if (questions.some(q => !q.type && !q.typeId && !q.questionTypeId)) {
      message.warning('Please select a type for all questions', 8000);
      const firstMissingIdx = questions.findIndex(q => !q.type && !q.typeId && !q.questionTypeId);
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
        if (!editingSectionId) {
          message.error(`Cannot add section! The total allocated marks (${currentOtherSectionMarks + expectedTotalMarks}) would exceed the paper's maximum marks (${selectedPaper.maxMarks}).`);
          return;
        } else {
          message.warning(`Notice: The total allocated marks (${currentOtherSectionMarks + expectedTotalMarks}) exceeds the paper's maximum marks (${selectedPaper.maxMarks}). Please make sure to adjust other sections.`);
        }
      }
      
      const maxEndQuestion = Math.max(
        ...sections.filter(s => s.id !== editingSectionId).map(s => s.endQuestion),
        sectionForm.endQuestion
      );
      
      if (selectedPaper.totalQuestions > 0 && maxEndQuestion > selectedPaper.totalQuestions) {
        if (!editingSectionId) {
          message.error(`Cannot save section! The end question (Q${sectionForm.endQuestion}) exceeds the paper's total questions (${selectedPaper.totalQuestions}).`);
          return;
        } else {
          message.warning(`Notice: The end question (Q${sectionForm.endQuestion}) exceeds the paper's total questions (${selectedPaper.totalQuestions}).`);
        }
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
        // Ensure we have a valid ProjectPaperId
        const resolvedProjectPaperId = sections[0]?.projectPaperId || null;
        
        const projectPaperSectionData = {
          projectPaperId: resolvedProjectPaperId || 0,
          projectId: parseInt(projectId, 10),
          paperId: selectedPaper.paperId,
          batchId: editingSectionId 
            ? (sections.find(s => s.id === editingSectionId)?.batchId || existingBatchId || 0)
            : (existingBatchId || 0),
          name: sectionForm.name,
          description: sectionForm.description || '',
          startQuestion: parseInt(sectionForm.startQuestion, 10) || 1,
          endQuestion: parseInt(sectionForm.endQuestion, 10) || 1,
          totalMarks: parseFloat(sectionForm.totalMarks) || 0,
          maxQuestionsToAttempt: parseInt(sectionForm.maxQuestionsToAttempt, 10) || 1,
          totalQuestions: questions.length,
          questions: questions.map(q => {
            const matchedQt = questionTypesList.find(qt => 
              (q.questionTypeId && qt.questionTypeId === q.questionTypeId) ||
              (q.typeId && qt.questionTypeId === q.typeId) || 
              (q.type && qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())
            );
            const resolvedTypeId = matchedQt?.questionTypeId || q.questionTypeId || q.typeId || null;
            const resolvedTypeName = matchedQt?.questionTypeName || q.type || '';
            return {
              questionId: q.questionId || 0,
              questionNo: q.questionNo || '',
              typeId: resolvedTypeId,
              questionTypeId: resolvedTypeId,
              type: resolvedTypeName,
              marks: parseFloat(q.marks),
              isOptional: q.isOptional || false,
              optionalGroupCode: q.optionalGroupCode || null
            };
          })
        };

        if (editingSectionId) {
          const res = await sectionService.updateProjectPaperSection(editingSectionId, projectPaperSectionData);
          if (res?.batchId && res.batchId !== projectPaperSectionData.batchId) {
            message.success(`Section updated and branched to new Batch #${res.batchId}`);
          } else {
            message.success('Project paper section updated successfully');
          }
        } else {
          const res = await sectionService.createProjectPaperSection(projectPaperSectionData);
          if (res?.batchId) {
            message.success(`Section created in Batch #${res.batchId}`);
          } else {
            message.success('Project paper section created successfully');
          }
        }
      } else {
        const sectionData = {
          batchId: editingSectionId 
            ? (sections.find(s => s.id === editingSectionId)?.batchId || existingBatchId || 0)
            : (existingBatchId || 0),
          paperId: selectedPaper.paperId,
          name: sectionForm.name,
          description: sectionForm.description || '',
          startQuestion: parseInt(sectionForm.startQuestion, 10) || 1,
          endQuestion: parseInt(sectionForm.endQuestion, 10) || 1,
          totalMarks: parseFloat(sectionForm.totalMarks) || 0,
          maxQuestionsToAttempt: parseInt(sectionForm.maxQuestionsToAttempt, 10) || 1,
          totalQuestions: questions.length,
          questions: questions.map(q => {
            const matchedQt = questionTypesList.find(qt => 
              (q.questionTypeId && qt.questionTypeId === q.questionTypeId) ||
              (q.typeId && qt.questionTypeId === q.typeId) || 
              (q.type && qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())
            );
            const resolvedTypeId = matchedQt?.questionTypeId || q.questionTypeId || q.typeId || null;
            const resolvedTypeName = matchedQt?.questionTypeName || q.type || '';
            return {
              questionId: q.questionId || 0,
              questionNo: q.questionNo || '',
              typeId: resolvedTypeId,
              questionTypeId: resolvedTypeId,
              type: resolvedTypeName,
              marks: parseFloat(q.marks),
              isOptional: q.isOptional || false,
              optionalGroupCode: q.optionalGroupCode || null
            };
          })
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
        await sectionService.deleteProjectPaperSection(sectionToDelete, {
          projectPaperId: sections[0]?.projectPaperId || null,
          projectId: parseInt(projectId, 10),
          paperId: selectedPaper?.paperId
        });
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
                          questions.length > 0 && questions.every(q => {
                            const firstId = questions[0].questionTypeId || questions[0].typeId || (
                              questionTypesList.find(qt => qt.questionTypeName?.toLowerCase() === questions[0].type?.toLowerCase())?.questionTypeId
                            );
                            const curId = q.questionTypeId || q.typeId || (
                              questionTypesList.find(qt => qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())?.questionTypeId
                            );
                            return curId && String(curId) === String(firstId);
                          })
                            ? (
                              questions[0].questionTypeId || questions[0].typeId || (
                                questionTypesList.find(qt => qt.questionTypeName?.toLowerCase() === questions[0].type?.toLowerCase())?.questionTypeId
                              ) || ""
                            )
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = questionTypesList.find(qt => String(qt.questionTypeId || qt.id) === String(val));
                          if (matched) {
                            const qTypeId = matched.questionTypeId || matched.id;
                            setQuestions(prev => prev.map(q => ({ 
                              ...q, 
                              typeId: qTypeId, 
                              questionTypeId: qTypeId, 
                              type: matched.questionTypeName 
                            })));
                          }
                        }}
                        className="w-full bg-white px-3 py-1.5 rounded-lg border border-teal-200 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-xs"
                      >
                        <option value="">Choose Type...</option>
                        {questionTypesList.map(qt => (
                          <option key={qt.questionTypeId || qt.id} value={qt.questionTypeId || qt.id}>
                            {qt.questionTypeName}
                          </option>
                        ))}
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
                                  value={
                                    q.questionTypeId || q.typeId || (
                                      questionTypesList.find(qt => qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())?.questionTypeId
                                    ) || ""
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const matched = questionTypesList.find(qt => String(qt.questionTypeId || qt.id) === String(val));
                                    if (matched) {
                                      const qTypeId = matched.questionTypeId || matched.id;
                                      handleQuestionChange(idx, {
                                        typeId: qTypeId,
                                        questionTypeId: qTypeId,
                                        type: matched.questionTypeName
                                      });
                                    } else {
                                      handleQuestionChange(idx, {
                                        typeId: null,
                                        questionTypeId: null,
                                        type: ''
                                      });
                                    }
                                  }}
                                  className={`w-full bg-gray-50 px-2 py-1 rounded-md border text-xs font-semibold outline-none ${
                                    !q.type && !q.typeId && !q.questionTypeId ? 'border-red-200' : 'border-gray-200 focus:ring-1 focus:ring-teal-500'
                                  }`}
                                >
                                  <option value="">Choose Type</option>
                                  {questionTypesList.map(qt => (
                                    <option key={qt.questionTypeId || qt.id} value={qt.questionTypeId || qt.id}>
                                      {qt.questionTypeName}
                                    </option>
                                  ))}
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
        {showImportMasterModal && (() => {
          // Group section masters by batchId
          const batchMap = {};
          sectionMasters.forEach(sec => {
            const bId = sec.batchId || 1;
            if (!batchMap[bId]) batchMap[bId] = [];
            batchMap[bId].push(sec);
          });
          const targetTotalQ = parseInt(selectedPaper?.totalQuestions, 10) || 0;
          const availableBatches = Object.keys(batchMap)
            .map(Number)
            .filter(bId => {
              if (targetTotalQ <= 0) return true;
              const bSections = batchMap[bId] || [];
              const bTotalQ = bSections.reduce((sum, s) => sum + (parseInt(s.totalQuestions, 10) || 0), 0);
              return bTotalQ === targetTotalQ;
            })
            .sort((a, b) => a - b);
          const currentPaperBatchId = sections.length > 0 ? (sections[0]?.batchId || null) : null;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-teal-50/40 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-xs">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wide">
                        Import Sections by Batch ID
                      </h3>
                      <p className="text-xs text-gray-600 font-medium mt-0.5">
                        For <span className="font-extrabold text-teal-800">{selectedPaper?.paperCode}: {selectedPaper?.paperName}</span>
                        {selectedPaper?.totalQuestions ? ` • Target: ${selectedPaper.totalQuestions} Questions • ${selectedPaper.maxMarks || 0} Marks` : ''}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowImportMasterModal(false);
                      setPreviewModalBatchId(null);
                    }} 
                    className="p-1.5 hover:bg-gray-200 rounded-xl text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scrollbar flex-1">
                  {previewModalBatchId ? (() => {
                    const pSections = batchMap[previewModalBatchId] || [];
                    const pTotalQ = pSections.reduce((sum, s) => sum + (parseInt(s.totalQuestions, 10) || 0), 0);
                    const pTotalM = pSections.reduce((sum, s) => sum + (parseFloat(s.totalMarks) || 0), 0);
                    const isCurrentBatch = currentPaperBatchId === previewModalBatchId;

                    return (
                      <div className="space-y-3.5 animate-in fade-in duration-150">
                        {/* Top Navigation & Actions Bar */}
                        <div className="flex items-center justify-between gap-2.5 p-3 bg-teal-50/80 border border-teal-200/90 rounded-xl flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setPreviewModalBatchId(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-teal-50 hover:text-teal-900 border border-gray-200 transition-all cursor-pointer shadow-2xs"
                              title="Back to batch options"
                            >
                              <ArrowLeft size={14} />
                              <span>Back to Batches</span>
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs px-2.5 py-1 rounded-md bg-teal-700 text-white shadow-xs">
                                Batch #{previewModalBatchId}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-gray-900">
                                Template Preview
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={importingMasters}
                            onClick={() => handleImportBatch(previewModalBatchId, pSections)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs ${
                              isCurrentBatch
                                ? "bg-teal-800 text-white"
                                : "bg-teal-700 hover:bg-teal-800 text-white"
                            }`}
                          >
                            {isCurrentBatch ? "✓ Current Batch" : (importingMasters ? "Importing..." : "Import This Batch")}
                          </button>
                        </div>

                        {/* Summary Row */}
                        <div className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-gray-900 block">
                              {pSections.map(s => s.name).join(", ")}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium mt-0.5 block">
                              {pSections.length} Sections &bull; {pTotalQ} Questions &bull; {pTotalM} Marks
                            </span>
                          </div>
                          {selectedPaper?.totalQuestions && pTotalQ === selectedPaper.totalQuestions && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 border border-emerald-300 text-emerald-800">
                              ✓ Matches Target: {selectedPaper.totalQuestions} Questions
                            </span>
                          )}
                        </div>

                        {/* Sections and Question Breakdown */}
                        <div className="space-y-3">
                          {pSections.map(sec => {
                            const questionsList = (sec.questions && sec.questions.length > 0)
                              ? sec.questions
                              : Array.from({ length: sec.totalQuestions || (sec.endQuestion - sec.startQuestion + 1) || 1 }, (_, i) => {
                                  const qNum = (sec.startQuestion || 1) + i;
                                  return {
                                    questionNo: String(qNum),
                                    type: 'MCQ',
                                    marks: ((sec.totalMarks || 0) / (sec.totalQuestions || 1)).toFixed(1),
                                    isOptional: false,
                                    optionalGroupCode: null
                                  };
                                });

                            return (
                              <div
                                key={sec.id}
                                className="p-3.5 sm:p-4 bg-white rounded-xl border border-gray-200 space-y-3 shadow-2xs"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      {/* Emphasized Section Name */}
                                      <span className="font-black text-gray-900 text-sm sm:text-base">{sec.name}</span>
                                      <span className="text-xs font-bold text-gray-500">
                                        Q{sec.startQuestion} - Q{sec.endQuestion}
                                      </span>
                                    </div>
                                    {sec.description && (
                                      <p className="text-xs text-gray-500 font-medium mt-0.5">{sec.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="px-2.5 py-1 bg-gray-100 rounded-md text-gray-700 text-xs font-bold">
                                      {sec.totalQuestions} Questions
                                    </span>
                                    <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200/80 rounded-md text-xs font-black">
                                      {sec.totalMarks} Marks
                                    </span>
                                    <span className="text-gray-600 text-xs font-medium">
                                      Attempt {sec.maxQuestionsToAttempt || sec.totalQuestions}
                                    </span>
                                  </div>
                                </div>

                                {/* Questions Details Table */}
                                <div className="pt-2.5 border-t border-gray-100">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex items-center justify-between">
                                    <span>Questions Details ({questionsList.length}):</span>
                                    <span className="text-teal-700 font-bold lowercase text-xs">
                                      {((sec.totalMarks || 0) / (sec.totalQuestions || 1)).toFixed(1)} marks each
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-56 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200 sticky top-0 z-10">
                                          <th className="py-2 px-3">Q#</th>
                                          <th className="py-2 px-3">Type</th>
                                          <th className="py-2 px-3">Marks</th>
                                          <th className="py-2 px-3">Choice / Group</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 bg-white">
                                        {questionsList.map((q, qIdx) => (
                                          <tr key={q.id || q.questionId || qIdx} className="hover:bg-teal-50/20">
                                            {/* Emphasized Question Number */}
                                            <td className="py-2 px-3 font-black text-gray-900 text-sm">
                                              {q.questionNo ? (String(q.questionNo).startsWith('Q') ? q.questionNo : `Q${q.questionNo}`) : `Q${(sec.startQuestion || 1) + qIdx}`}
                                            </td>
                                            <td className="py-2 px-3">
                                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
                                                {q.type || 'MCQ'}
                                              </span>
                                            </td>
                                            {/* Emphasized Question Marks */}
                                            <td className="py-2 px-3 font-black text-teal-800 text-sm">
                                              {q.marks !== undefined && q.marks !== null ? q.marks : ((sec.totalMarks || 0) / (sec.totalQuestions || 1)).toFixed(1)}
                                            </td>
                                            <td className="py-2 px-3">
                                              {q.isOptional || q.optionalGroupCode ? (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                                                  {q.optionalGroupCode ? `Group: ${q.optionalGroupCode}` : 'Optional'}
                                                </span>
                                              ) : (
                                                <span className="text-gray-400 text-xs font-medium">Compulsory</span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })() : (
                    <>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <span className="text-xs sm:text-sm font-bold uppercase text-teal-950 tracking-wider flex items-center gap-1.5">
                            <Layers size={15} className="text-teal-700" />
                            Select a Batch Template to Import
                          </span>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Importing a batch links its predefined sections and questions to this paper. Editing imported sections later will automatically branch into your paper's dedicated batch.
                          </p>
                        </div>
                        {targetTotalQ > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800">
                            Matching {targetTotalQ} Questions
                          </span>
                        )}
                      </div>

                      {availableBatches.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <Layers className="mx-auto text-gray-300 mb-2" size={32} />
                          <p className="text-xs font-bold text-gray-800">No Matching Batch Templates Found</p>
                          {targetTotalQ > 0 ? (
                            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                              No batch templates have exactly <span className="font-bold text-gray-800">{targetTotalQ} questions</span> matching this paper's question count.
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">
                              No predefined batches are available in Section Masters.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {availableBatches.map(bId => {
                            const bSections = batchMap[bId] || [];
                            const bTotalQ = bSections.reduce((sum, s) => sum + (parseInt(s.totalQuestions, 10) || 0), 0);
                            const bTotalM = bSections.reduce((sum, s) => sum + (parseFloat(s.totalMarks) || 0), 0);
                            const isCurrentBatch = currentPaperBatchId === bId;

                            return (
                              <div
                                key={bId}
                                className={`rounded-xl border transition-all ${
                                  isCurrentBatch
                                    ? "bg-teal-50/80 border-teal-400 shadow-xs ring-1 ring-teal-400"
                                    : "bg-white border-gray-200 hover:border-teal-300 shadow-2xs"
                                }`}
                              >
                                {/* Batch Summary Row */}
                                <div className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-teal-700 text-white shadow-xs">
                                      Batch #{bId}
                                    </span>
                                    <div>
                                      <span className="font-bold text-xs sm:text-sm text-gray-900 block">
                                        {bSections.map(s => s.name).join(", ")}
                                      </span>
                                      <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                                        <span>{bSections.length} Sections</span>
                                        <span>&bull;</span>
                                        <span>{bTotalQ} Questions</span>
                                        <span>&bull;</span>
                                        <span>{bTotalM} Marks</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewModalBatchId(bId)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-teal-100/70 hover:bg-teal-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                      title="Preview section & questions configuration inside this batch"
                                    >
                                      <Eye size={13} />
                                      <span>Preview Config</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={importingMasters}
                                      onClick={() => handleImportBatch(bId, bSections)}
                                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs ${
                                        isCurrentBatch
                                          ? "bg-teal-700 text-white shadow-xs"
                                          : "bg-gray-100 text-gray-800 hover:bg-teal-50 hover:text-teal-900 border border-gray-200"
                                      }`}
                                    >
                                      {isCurrentBatch ? "✓ Current Batch" : (importingMasters ? "Importing..." : "Import Batch")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
                  {previewModalBatchId ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewModalBatchId(null)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-all cursor-pointer shadow-2xs"
                      >
                        <ArrowLeft size={14} />
                        <span>Back to Batches</span>
                      </button>
                      <button
                        type="button"
                        disabled={importingMasters}
                        onClick={() => handleImportBatch(previewModalBatchId, batchMap[previewModalBatchId] || [])}
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {importingMasters ? "Importing..." : `Import Batch #${previewModalBatchId}`}
                      </button>
                    </>
                  ) : (
                    <div className="w-full flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowImportMasterModal(false);
                          setPreviewModalBatchId(null);
                        }}
                        className="px-4 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-all cursor-pointer shadow-2xs"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
