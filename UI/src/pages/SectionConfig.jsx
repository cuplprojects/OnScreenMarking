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
  Sparkles,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { subjectService, sectionService, paperService, questionTypeService } from '../services';
import { useEffect, useState, useMemo, useCallback } from 'react';
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
  const { userType, hasPermission } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const navigate = useNavigate();

  const handleBackFromSections = () => {
    const fromParam = searchParams.get('from');
    if (fromParam === 'papers') {
      const targetPath = userType === 'admin' ? '/admin/papers' : '/papers';
      const params = new URLSearchParams();
      if (encryptedProjectId) params.set('projectId', encryptedProjectId);
      const paperIdToEdit = searchParams.get('paperId') || (selectedPaper?.paperId ? String(selectedPaper.paperId) : null);
      if (paperIdToEdit) {
        params.set('editPaperId', paperIdToEdit);
      }
      navigate(`${targetPath}?${params.toString()}`);
      return;
    }
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
  const [allBatchesMap, setAllBatchesMap] = useState({});
  const [showImportMasterModal, setShowImportMasterModal] = useState(false);
  const [selectedMasterSectionIds, setSelectedMasterSectionIds] = useState([]);
  const [importingMasters, setImportingMasters] = useState(false);
  const [overwriteExistingMasters, setOverwriteExistingMasters] = useState(false);
  const [previewModalBatchId, setPreviewModalBatchId] = useState(null);

  // Batch-wise creation & duplicate batch comparison state
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [newBatchSections, setNewBatchSections] = useState([]);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [newBatchSaving, setNewBatchSaving] = useState(false);
  const [duplicateBatchWarning, setDuplicateBatchWarning] = useState(null);
  const [previewOpenedFromBatchCreate, setPreviewOpenedFromBatchCreate] = useState(false);

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

      let parentPath = isFromPapers
        ? (userType === 'admin' ? '/admin/papers' : '/papers')
        : (userType === 'admin' ? '/admin/sessions' : '/sessions');

      if (isFromPapers && encryptedProjectId) {
        parentPath += `?projectId=${encryptedProjectId}`;
        const paperIdToEdit = searchParams.get('paperId') || (selectedPaper?.paperId ? String(selectedPaper.paperId) : null);
        if (paperIdToEdit) {
          parentPath += `&editPaperId=${paperIdToEdit}`;
        }
      }

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
  }, [projectId, encryptedProjectId, userType, searchParams, selectedPaper]);

  const fetchSectionMasters = async () => {
    try {
      const data = await sectionService.getSectionMasters({ all: true, pageSize: 100 });
      // Backend returns paginated response: { items, totalCount, page, pageSize, totalPages }
      const items = data?.items || (Array.isArray(data) ? data : []);
      setSectionMasters(items);
      const map = {};
      items.forEach(sec => {
        const bId = sec.batchId || 1;
        if (!map[bId]) map[bId] = [];
        if (!map[bId].some(s => (s.id && s.id === sec.id) || (s.name === sec.name && s.startQuestion === sec.startQuestion))) {
          map[bId].push(sec);
        }
      });
      setAllBatchesMap(map);
    } catch (err) {
      console.error("Failed to load section masters", err);
    }
  };

  useEffect(() => {
    if (urlPaperId) {
      fetchPaperDetails();
      fetchSections();
      fetchSectionMasters();
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
        part: existingQ?.part || '',
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
        part: '',
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
        optionalGroupCode: q.optionalGroupCode || '',
        part: q.part || ''
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

    // Validate that questions sharing the same Optional Group have identical total marks per question number
    const groupQuestionsMap = {};
    (questions || []).forEach(q => {
      const code = q.optionalGroupCode ? q.optionalGroupCode.trim().toUpperCase() : '';
      if (code) {
        if (!groupQuestionsMap[code]) {
          groupQuestionsMap[code] = {};
        }
        const qKey = String(q.questionNo || '').trim().toUpperCase();
        if (!groupQuestionsMap[code][qKey]) {
          groupQuestionsMap[code][qKey] = { qNo: q.questionNo, parts: [], totalMarks: 0 };
        }
        groupQuestionsMap[code][qKey].totalMarks += (parseFloat(q.marks) || 0);
        if (q.part && q.part !== 'Part') {
          groupQuestionsMap[code][qKey].parts.push(q.part);
        }
      }
    });

    for (const [code, qDict] of Object.entries(groupQuestionsMap)) {
      const qList = Object.values(qDict);
      if (qList.length > 1) {
        const firstTotal = qList[0].totalMarks;
        const mismatchedQ = qList.find(q => Math.abs(q.totalMarks - firstTotal) > 0.001);
        if (mismatchedQ) {
          const q1Label = qList[0].parts.length > 0 ? `Q${qList[0].qNo} (${qList[0].parts.join(', ')})` : `Q${qList[0].qNo}`;
          const q2Label = mismatchedQ.parts.length > 0 ? `Q${mismatchedQ.qNo} (${mismatchedQ.parts.join(', ')})` : `Q${mismatchedQ.qNo}`;
          message.error(`Questions in Optional Group '${code}' must have identical total marks. ${q1Label} has ${firstTotal}m, but ${q2Label} has ${mismatchedQ.totalMarks}m.`);
          return;
        }
      }
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
          totalQuestions: distinctQCount,
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
              optionalGroupCode: q.optionalGroupCode || null,
              part: q.part ? String(q.part).trim() : null
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
          totalQuestions: distinctQCount,
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
              optionalGroupCode: q.optionalGroupCode || null,
              part: q.part ? String(q.part).trim() : null
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

  // Deep comparison logic to detect identical batch configurations
  const checkBatchesIdentical = useCallback((candidateSections, existingSections) => {
    if (!candidateSections || !existingSections) return false;
    if (candidateSections.length !== existingSections.length) return false;

    // Sort both by startQuestion, then by name
    const sortedCandidate = [...candidateSections].sort((a, b) => {
      const diff = (parseInt(a.startQuestion, 10) || 0) - (parseInt(b.startQuestion, 10) || 0);
      return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
    });

    const sortedExisting = [...existingSections].sort((a, b) => {
      const diff = (parseInt(a.startQuestion, 10) || 0) - (parseInt(b.startQuestion, 10) || 0);
      return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
    });

    for (let i = 0; i < sortedCandidate.length; i++) {
      const cSec = sortedCandidate[i];
      const eSec = sortedExisting[i];

      // 1. Name
      if (cSec.name?.trim().toLowerCase() !== eSec.name?.trim().toLowerCase()) {
        return false;
      }

      // 2. Start & End questions
      const cStart = parseInt(cSec.startQuestion, 10) || 0;
      const cEnd = parseInt(cSec.endQuestion, 10) || 0;
      const eStart = parseInt(eSec.startQuestion, 10) || 0;
      const eEnd = parseInt(eSec.endQuestion, 10) || 0;
      if (cStart !== eStart || cEnd !== eEnd) {
        return false;
      }

      // 3. Total marks
      const cMarks = parseFloat(cSec.totalMarks) || 0;
      const eMarks = parseFloat(eSec.totalMarks) || 0;
      if (Math.abs(cMarks - eMarks) > 0.01) {
        return false;
      }

      // 4. Max questions to attempt & total questions count
      const cTotalQ = cSec.questions?.length || (cEnd >= cStart ? cEnd - cStart + 1 : 1);
      const eTotalQ = eSec.questions?.length || (eEnd >= eStart ? eEnd - eStart + 1 : 1);
      if (cTotalQ !== eTotalQ) {
        return false;
      }

      const cMaxAttempt = parseInt(cSec.maxQuestionsToAttempt, 10) || cTotalQ;
      const eMaxAttempt = parseInt(eSec.maxQuestionsToAttempt, 10) || eTotalQ;
      if (cMaxAttempt !== eMaxAttempt) {
        return false;
      }

      // 5. Questions breakdown
      const cQuestions = cSec.questions || [];
      const eQuestions = (eSec.questions && eSec.questions.length > 0)
        ? eSec.questions
        : Array.from({ length: eTotalQ }, (_, idx) => ({
            questionNo: String(eStart + idx),
            marks: eTotalQ > 0 ? eMarks / eTotalQ : 0,
            type: 'MCQ',
            isOptional: false,
            optionalGroupCode: null
          }));

      if (cQuestions.length !== eQuestions.length) {
        return false;
      }

      const parseQNo = (no) => {
        const clean = String(no || '').replace(/^Q/i, '').trim();
        const num = parseInt(clean, 10);
        return isNaN(num) ? clean : num;
      };

      const sortedCQ = [...cQuestions].sort((a, b) => {
        const na = parseQNo(a.questionNo);
        const nb = parseQNo(b.questionNo);
        if (typeof na === 'number' && typeof nb === 'number') return na - nb;
        return String(na).localeCompare(String(nb));
      });

      const sortedEQ = [...eQuestions].sort((a, b) => {
        const na = parseQNo(a.questionNo);
        const nb = parseQNo(b.questionNo);
        if (typeof na === 'number' && typeof nb === 'number') return na - nb;
        return String(na).localeCompare(String(nb));
      });

      for (let qIdx = 0; qIdx < sortedCQ.length; qIdx++) {
        const cq = sortedCQ[qIdx];
        const eq = sortedEQ[qIdx];

        // Question No
        if (String(parseQNo(cq.questionNo)).toLowerCase() !== String(parseQNo(eq.questionNo)).toLowerCase()) {
          return false;
        }

        // Part
        const cqPart = (cq.part || '').trim().toLowerCase();
        const eqPart = (eq.part || '').trim().toLowerCase();
        if (cqPart !== eqPart) {
          return false;
        }

        // Marks
        const cqM = parseFloat(cq.marks) || 0;
        const eqM = parseFloat(eq.marks) || 0;
        if (Math.abs(cqM - eqM) > 0.01) {
          return false;
        }

        // Question Type
        const getTypeName = (q) => {
          if (q.type && typeof q.type === 'string' && q.type.trim()) return q.type.trim().toLowerCase();
          const tid = q.questionTypeId || q.typeId;
          if (tid && questionTypesList.length > 0) {
            const found = questionTypesList.find(t => String(t.questionTypeId || t.id) === String(tid));
            if (found) return (found.questionTypeName || '').trim().toLowerCase();
          }
          return 'mcq';
        };

        if (getTypeName(cq) !== getTypeName(eq)) {
          return false;
        }

        // Optional status & optional group code
        const cqIsOpt = Boolean(cq.isOptional || cq.optionalGroupCode);
        const eqIsOpt = Boolean(eq.isOptional || eq.optionalGroupCode);
        if (cqIsOpt !== eqIsOpt) {
          return false;
        }

        const cleanGroup = (g, secName) => {
          const str = (g || '').trim().toLowerCase();
          if (!str || str === `${(secName || '').toLowerCase()}-optional`) return '';
          return str;
        };

        if (cleanGroup(cq.optionalGroupCode, cSec.name) !== cleanGroup(eq.optionalGroupCode, eSec.name)) {
          return false;
        }
      }
    }

    return true;
  }, [questionTypesList]);

  // Find if an identical batch already exists across all loaded batches
  const findMatchingBatch = useCallback((candidateSections, excludeBatchId = null) => {
    if (!candidateSections || candidateSections.length === 0) return null;
    const batchIds = Object.keys(allBatchesMap).map(Number).sort((a, b) => a - b);
    for (const bId of batchIds) {
      if (excludeBatchId && bId === excludeBatchId) continue;
      const existing = allBatchesMap[bId];
      if (checkBatchesIdentical(candidateSections, existing)) {
        return bId;
      }
    }
    return null;
  }, [allBatchesMap, checkBatchesIdentical]);

  // Real-time matched existing batch ID for the modal
  const matchedExistingBatchId = useMemo(() => {
    if (!showCreateBatchModal || !newBatchSections || newBatchSections.length === 0) return null;
    if (editBatchId && editBatchId > 0) return null;
    return findMatchingBatch(newBatchSections, editBatchId && editBatchId > 0 ? editBatchId : null);
  }, [showCreateBatchModal, newBatchSections, findMatchingBatch, editBatchId]);

  // Update a field in active batch section
  const updateBatchSection = (idx, field, value) => {
    setNewBatchSections(prev => prev.map((sec, i) => {
      if (i !== idx) return sec;
      const updated = { ...sec, [field]: value };

      if (field === 'totalMarks' && updated.questions && updated.questions.length > 0) {
        const newTotal = parseFloat(value) || 0;
        const qCount = updated.questions.length;
        const newMarksPerQ = qCount > 0 ? parseFloat((newTotal / qCount).toFixed(2)) : 0;
        
        updated.questions = updated.questions.map((q, qIndex) => {
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
        });
      }

      return updated;
    }));
  };

  // Generate questions from range for a batch section
  const generateBatchSectionQuestions = (sIdx) => {
    const sec = newBatchSections[sIdx];
    const start = parseInt(sec.startQuestion, 10) || 1;
    const end = parseInt(sec.endQuestion, 10) || 1;
    const totalMarks = parseFloat(sec.totalMarks) || 0;
    const count = end - start + 1;

    if (count <= 0) {
      message.error('End question must be greater than or equal to start question');
      return;
    }

    // Validate against paper's total question limit
    const paperTargetQ = parseInt(selectedPaper?.totalQuestions, 10) || 0;
    if (paperTargetQ > 0 && end > paperTargetQ) {
      message.error(`This paper has only ${paperTargetQ} questions. End Q# cannot exceed ${paperTargetQ}.`);
      return;
    }
    if (paperTargetQ > 0) {
      // Count distinct questions in ALL other sections (excluding this one)
      const otherSectionsQ = new Set(
        newBatchSections.filter((_, i) => i !== sIdx)
          .flatMap(sec => (sec.questions || []).map(q => String(q.questionNo || '').trim()))
          .filter(Boolean)
      ).size;
      if (otherSectionsQ + count > paperTargetQ) {
        const available = paperTargetQ - otherSectionsQ;
        message.error(`This paper has only ${paperTargetQ} questions. Other sections already use ${otherSectionsQ}, so this section can have at most ${available} question(s).`);
        return;
      }
    }

    const marksPerQ = count > 0 ? parseFloat((totalMarks / count).toFixed(2)) : 0;
    const defaultQt = questionTypesList.length > 0 ? questionTypesList[0] : null;
    const defaultTypeId = defaultQt?.questionTypeId || defaultQt?.id || null;
    const defaultTypeName = defaultQt?.questionTypeName || 'MCQ';

    const generated = [];
    for (let i = start; i <= end; i++) {
      const qNoStr = i.toString();
      const existing = (sec.questions || []).find(q => String(q.questionNo) === qNoStr);
      const matchedQt = questionTypesList.find(qt => 
        (existing?.questionTypeId && String(qt.questionTypeId || qt.id) === String(existing.questionTypeId)) ||
        (existing?.typeId && String(qt.questionTypeId || qt.id) === String(existing.typeId)) || 
        (existing?.type && qt.questionTypeName?.toLowerCase() === existing.type?.toLowerCase())
      ) || defaultQt;

      let qMark = marksPerQ;
      if (i === end && count > 1) {
        const prevTotal = marksPerQ * (count - 1);
        const diff = parseFloat((totalMarks - prevTotal).toFixed(2));
        if (Math.abs(diff - marksPerQ) <= 0.05) {
          qMark = diff;
        }
      }

      generated.push({
        id: existing?.id || existing?.questionId || null,
        questionNo: qNoStr,
        marks: qMark,
        typeId: matchedQt?.questionTypeId || matchedQt?.id || defaultTypeId,
        questionTypeId: matchedQt?.questionTypeId || matchedQt?.id || defaultTypeId,
        type: matchedQt?.questionTypeName || existing?.type || defaultTypeName,
        isOptional: existing?.isOptional !== undefined ? existing.isOptional : false,
        optionalGroupCode: existing?.optionalGroupCode || '',
        part: existing?.part || '',
      });
    }

    setNewBatchSections(prev => prev.map((s, i) => i === sIdx ? { ...s, questions: generated } : s));
    message.success(`Questions regenerated (${count} questions, ${totalMarks} total marks)`);
  };

  // Universal question type selector for batch section
  const applyUniversalTypeToBatchSection = (sIdx, typeVal) => {
    if (!typeVal) return;
    const matched = questionTypesList.find(qt => String(qt.questionTypeId || qt.id) === String(typeVal));
    if (!matched) return;
    const qTypeId = matched.questionTypeId || matched.id;
    const qTypeName = matched.questionTypeName;

    setNewBatchSections(prev => prev.map((sec, i) => {
      if (i !== sIdx) return sec;
      return {
        ...sec,
        questions: sec.questions.map(q => ({
          ...q,
          typeId: qTypeId,
          questionTypeId: qTypeId,
          type: qTypeName,
        }))
      };
    }));
  };

  // Compute next part label (e.g. "a" -> "b", "b" -> "c", "z" -> "aa", "i" -> "ii", "1" -> "2")
  const getNextPart = (partStr) => {
    const str = String(partStr || '').trim();
    if (!str) return 'b';

    // Lowercase Roman numerals
    const lowerRomans = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
    const lrIdx = lowerRomans.indexOf(str.toLowerCase());
    if (lrIdx !== -1 && lrIdx < lowerRomans.length - 1 && str === str.toLowerCase()) {
      return lowerRomans[lrIdx + 1];
    }
    // Uppercase Roman numerals
    const upperRomans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const urIdx = upperRomans.indexOf(str);
    if (urIdx !== -1 && urIdx < upperRomans.length - 1) {
      return upperRomans[urIdx + 1];
    }

    // Pure numeric: '1' -> '2'
    if (/^\d+$/.test(str)) {
      return String(parseInt(str, 10) + 1);
    }

    // Alphabetic: 'a' -> 'b', 'z' -> 'aa', 'A' -> 'B'
    const isLower = str === str.toLowerCase();
    const upper = str.toUpperCase();
    const arr = upper.split('');
    let i = arr.length - 1;
    while (i >= 0) {
      if (arr[i] < 'Z') {
        arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
        break;
      }
      arr[i] = 'A';
      i--;
    }
    if (i < 0) arr.unshift('A');
    const res = arr.join('');
    return isLower ? res.toLowerCase() : res;
  };

  // Compute the next question number after the given one.
  // "16" -> "17" | "16A" -> "16B" | "16Z" -> "16AA"
  const getNextQuestionNo = (qNo) => {
    const str = String(qNo || '').trim();
    const match = str.match(/^(\d+)([A-Za-z]*)$/);
    if (match) {
      const numPart = match[1];
      const alphaPart = match[2];
      if (alphaPart === '') {
        return String(parseInt(numPart, 10) + 1);
      }
      const upper = alphaPart.toUpperCase();
      const arr = upper.split('');
      let i = arr.length - 1;
      while (i >= 0) {
        if (arr[i] < 'Z') {
          arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1);
          return numPart + arr.join('');
        }
        arr[i] = 'A';
        i--;
      }
      return numPart + 'A' + arr.join('');
    }
    const numOnly = parseInt(str.replace(/\D/g, ''), 10);
    if (!isNaN(numOnly)) {
      return String(numOnly + 1);
    }
    return str + '_1';
  };

  // Add question row after qIdx in batch modal:
  // If the source question has a part (e.g. Q1 part a), it adds the next part (Q1 part b) of the same question.
  // Otherwise, it adds the next question number (Q2).
  const handleAddBatchQuestion = (sIdx, qIdx) => {
    setNewBatchSections(prev => prev.map((sec, i) => {
      if (i !== sIdx) return sec;
      const qs = [...(sec.questions || [])];
      const source = qs[qIdx];
      const hasPart = Boolean(source?.part && String(source.part).trim() !== '');

      const paperTargetQ = parseInt(selectedPaper?.totalQuestions, 10) || 0;
      if (!hasPart && paperTargetQ > 0) {
        const distinctQCount = new Set(
          newBatchSections.flatMap(s => (s.questions || []).map(q => String(q.questionNo || '').trim()))
        ).size;
        if (distinctQCount >= paperTargetQ) {
          message.error(`This paper has only ${paperTargetQ} questions. Cannot add more questions.`);
          return sec;
        }
      }

      let newQuestionNo;
      let newPart;
      if (hasPart) {
        newQuestionNo = source.questionNo;
        newPart = getNextPart(source.part);
      } else {
        newQuestionNo = getNextQuestionNo(source?.questionNo);
        newPart = '';
      }

      const newQ = {
        ...source,
        id: null,
        questionNo: newQuestionNo,
        part: newPart,
      };
      qs.splice(qIdx + 1, 0, newQ);

      const startQ = parseInt(sec.startQuestion, 10) || 1;
      const maxQ = Math.max(...qs.map(q => {
        const m = String(q.questionNo || '').match(/^(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      }));
      const newEndQ = maxQ >= startQ ? maxQ : Math.max(startQ, startQ + qs.length - 1);

      return {
        ...sec,
        questions: qs,
        endQuestion: newEndQ,
        maxQuestionsToAttempt: Math.min(sec.maxQuestionsToAttempt || qs.length, qs.length)
      };
    }));
  };

  // Remove question row from batch modal
  const handleRemoveBatchQuestion = (sIdx, qIdx) => {
    setNewBatchSections(prev => prev.map((sec, i) => {
      if (i !== sIdx) return sec;
      if (sec.questions.length <= 1) {
        message.error('A section must have at least 1 question.');
        return sec;
      }
      const qs = [...sec.questions];
      qs.splice(qIdx, 1);
      const startQ = parseInt(sec.startQuestion, 10) || 1;
      const maxQ = Math.max(...qs.map(q => {
        const m = String(q.questionNo || '').match(/^(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      }));
      const newEndQ = maxQ >= startQ ? maxQ : Math.max(startQ, startQ + qs.length - 1);
      return {
        ...sec,
        questions: qs,
        endQuestion: newEndQ,
        maxQuestionsToAttempt: Math.min(sec.maxQuestionsToAttempt || qs.length, qs.length)
      };
    }));
  };

  // Add question below in single section form
  const handleAddQuestionBelow = (index) => {
    const source = questions[index];
    const hasPart = Boolean(source?.part && String(source.part).trim() !== '');

    const paperTargetQ = parseInt(selectedPaper?.totalQuestions, 10) || 0;
    if (!hasPart && paperTargetQ > 0) {
      const distinctQCount = new Set(questions.map(q => String(q.questionNo || '').trim())).size;
      if (distinctQCount >= paperTargetQ) {
        message.error(`This paper has only ${paperTargetQ} questions. Cannot add more questions.`);
        return;
      }
    }

    let newQuestionNo;
    let newPart;
    if (hasPart) {
      newQuestionNo = source.questionNo;
      newPart = getNextPart(source.part);
    } else {
      newQuestionNo = getNextQuestionNo(source?.questionNo);
      newPart = '';
    }

    const newQ = {
      ...source,
      id: null,
      questionNo: newQuestionNo,
      part: newPart
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, newQ);
    setQuestions(updated);

    const startQ = parseInt(sectionForm.startQuestion, 10) || 1;
    const maxQ = Math.max(...updated.map(q => {
      const m = String(q.questionNo || '').match(/^(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    }));
    const newEndQ = maxQ >= startQ ? maxQ : Math.max(startQ, startQ + updated.length - 1);

    setSectionForm(prev => ({
      ...prev,
      endQuestion: newEndQ
    }));
  };

  // Update a single question field in a batch section
  const updateBatchSectionQuestion = (sIdx, qIdx, field, value) => {
    setNewBatchSections(prev => prev.map((sec, i) => {
      if (i !== sIdx) return sec;
      const updatedQuestions = [...sec.questions];
      if (field === 'marks') {
        updatedQuestions[qIdx] = {
          ...updatedQuestions[qIdx],
          marks: value === '' ? '' : (parseFloat(value) || 0),
        };
      } else if (field === 'typeSelect') {
        const matched = questionTypesList.find(qt => String(qt.questionTypeId || qt.id) === String(value));
        if (matched) {
          const qTypeId = matched.questionTypeId || matched.id;
          updatedQuestions[qIdx] = {
            ...updatedQuestions[qIdx],
            typeId: qTypeId,
            questionTypeId: qTypeId,
            type: matched.questionTypeName,
          };
        } else {
          updatedQuestions[qIdx] = {
            ...updatedQuestions[qIdx],
            typeId: null,
            questionTypeId: null,
            type: '',
          };
        }
      } else {
        updatedQuestions[qIdx] = {
          ...updatedQuestions[qIdx],
          [field]: value,
        };
      }
      return { ...sec, questions: updatedQuestions };
    }));
  };

  // Add section to batch
  const handleAddSectionToBatch = () => {
    const paperTargetQ = parseInt(selectedPaper?.totalQuestions, 10) || 0;
    const usedQ = new Set(
      newBatchSections.flatMap(sec => (sec.questions || []).map(q => String(q.questionNo || '').trim())).filter(Boolean)
    ).size;
    if (paperTargetQ > 0 && usedQ >= paperTargetQ) {
      message.error(`This paper has only ${paperTargetQ} questions. All ${paperTargetQ} questions are already allocated across existing sections.`);
      return;
    }

    let nextStart = 1;
    if (newBatchSections.length > 0) {
      const maxEnd = Math.max(...newBatchSections.map(s => parseInt(s.endQuestion, 10) || 0));
      nextStart = maxEnd + 1;
    }
    if (paperTargetQ > 0 && nextStart > paperTargetQ) {
      message.error(`This paper has only ${paperTargetQ} questions. All questions are already covered by existing sections.`);
      return;
    }
    let nextEnd = nextStart + 9;
    if (paperTargetQ > 0 && nextEnd > paperTargetQ) {
      nextEnd = Math.max(nextStart, paperTargetQ);
    }
    const count = Math.max(1, nextEnd - nextStart + 1);
    
    // Remaining paper marks
    const allocated = newBatchSections.reduce((sum, s) => sum + (parseFloat(s.totalMarks) || 0), 0);
    const paperMaxM = parseFloat(selectedPaper?.maxMarks) || 10;
    const remaining = Math.max(0, paperMaxM - allocated);
    const totalMarks = remaining > 0 ? remaining : 10;
    const marksPerQ = count > 0 ? parseFloat((totalMarks / count).toFixed(2)) : 0;
    const defaultQt = questionTypesList.length > 0 ? questionTypesList[0] : null;
    const defaultTypeId = defaultQt?.questionTypeId || defaultQt?.id || null;
    const defaultTypeName = defaultQt?.questionTypeName || 'MCQ';

    const autoQuestions = [];
    for (let i = nextStart; i <= nextEnd; i++) {
      let qMark = marksPerQ;
      if (i === nextEnd && count > 1) {
        const prevTotal = marksPerQ * (count - 1);
        const diff = parseFloat((totalMarks - prevTotal).toFixed(2));
        if (Math.abs(diff - marksPerQ) <= 0.05) {
          qMark = diff;
        }
      }
      autoQuestions.push({
        id: null,
        questionNo: String(i),
        marks: qMark,
        typeId: defaultTypeId,
        questionTypeId: defaultTypeId,
        type: defaultTypeName,
        isOptional: false,
        optionalGroupCode: '',
      });
    }

    const nextLetter = String.fromCharCode(65 + newBatchSections.length);
    const secName = `Section ${nextLetter}`;

    const newSec = {
      name: secName,
      description: '',
      startQuestion: nextStart,
      endQuestion: nextEnd,
      totalMarks: totalMarks,
      maxQuestionsToAttempt: count,
      questions: autoQuestions,
    };
    setNewBatchSections(prev => [...prev, newSec]);
    setActiveSectionIdx(newBatchSections.length);
  };

  // Remove a section from the batch
  const handleRemoveBatchSection = (idx) => {
    setNewBatchSections(prev => prev.filter((_, i) => i !== idx));
    setActiveSectionIdx(prev => Math.max(0, idx - 1));
  };

  // Open Create/Configure Batch Modal
  const openCreateBatchModal = () => {
    fetchSectionMasters();
    if (sections && sections.length > 0) {
      const defaultQt = questionTypesList[0] || null;
      const mapped = sections.map(sec => {
        const totalQ = sec.totalQuestions || (sec.endQuestion - sec.startQuestion + 1);
        const marksPerQ = totalQ > 0 ? parseFloat(((sec.totalMarks || 0) / totalQ).toFixed(2)) : 0;
        let qList = [];
        if (sec.questions && sec.questions.length > 0) {
          qList = sec.questions.map(q => {
            const matchedQt = questionTypesList.find(qt =>
              (q.questionTypeId && String(qt.questionTypeId || qt.id) === String(q.questionTypeId)) ||
              (q.typeId && String(qt.questionTypeId || qt.id) === String(q.typeId)) ||
              (q.type && qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())
            );
            const resolvedTypeId = matchedQt?.questionTypeId || matchedQt?.id || q.questionTypeId || q.typeId || defaultQt?.questionTypeId || null;
            const resolvedTypeName = matchedQt?.questionTypeName || q.type || defaultQt?.questionTypeName || 'MCQ';
            return {
              id: q.id || q.questionId || null,
              questionNo: String(q.questionNo ?? ''),
              marks: q.marks !== undefined ? parseFloat(q.marks) : marksPerQ,
              type: resolvedTypeName,
              typeId: resolvedTypeId,
              questionTypeId: resolvedTypeId,
              isOptional: Boolean(q.isOptional),
              optionalGroupCode: q.optionalGroupCode || '',
              part: q.part || ''
            };
          });
        } else {
          const start = sec.startQuestion || 1;
          const end = sec.endQuestion || (start + totalQ - 1);
          for (let i = start; i <= end; i++) {
            qList.push({
              id: null,
              questionNo: String(i),
              marks: marksPerQ,
              type: defaultQt?.questionTypeName || 'MCQ',
              typeId: defaultQt?.questionTypeId || null,
              questionTypeId: defaultQt?.questionTypeId || null,
              isOptional: false,
              optionalGroupCode: '',
              part: ''
            });
          }
        }
        return {
          id: sec.id,
          name: sec.name || '',
          description: sec.description || '',
          startQuestion: sec.startQuestion,
          endQuestion: sec.endQuestion,
          totalMarks: sec.totalMarks,
          maxQuestionsToAttempt: sec.maxQuestionsToAttempt || totalQ,
          questions: qList
        };
      });
      setNewBatchSections(mapped);
      setActiveSectionIdx(0);
    } else {
      const paperTotalQ = parseInt(selectedPaper?.totalQuestions, 10) || 10;
      const paperMaxM = parseFloat(selectedPaper?.maxMarks) || 10;
      const initEnd = Math.min(10, paperTotalQ);
      const count = Math.max(1, initEnd - 1 + 1);
      const initMarks = Math.min(10, paperMaxM);
      const marksPerQ = count > 0 ? parseFloat((initMarks / count).toFixed(2)) : 0;
      const defaultQt = questionTypesList[0] || null;

      const initQuestions = [];
      for (let i = 1; i <= initEnd; i++) {
        let qMark = marksPerQ;
        if (i === initEnd && count > 1) {
          const prevTotal = marksPerQ * (count - 1);
          const diff = parseFloat((initMarks - prevTotal).toFixed(2));
          if (Math.abs(diff - marksPerQ) <= 0.05) {
            qMark = diff;
          }
        }
        initQuestions.push({
          id: null,
          questionNo: String(i),
          marks: qMark,
          type: defaultQt?.questionTypeName || 'MCQ',
          typeId: defaultQt?.questionTypeId || null,
          questionTypeId: defaultQt?.questionTypeId || null,
          isOptional: false,
          optionalGroupCode: '',
          part: ''
        });
      }

      setNewBatchSections([{
        name: 'Section A',
        description: '',
        startQuestion: 1,
        endQuestion: initEnd,
        totalMarks: initMarks,
        maxQuestionsToAttempt: count,
        questions: initQuestions
      }]);
      setActiveSectionIdx(0);
    }
    setDuplicateBatchWarning(null);
    setShowCreateBatchModal(true);
  };

  // Close Create Batch Modal
  const handleCloseBatchModal = () => {
    setShowCreateBatchModal(false);
    setNewBatchSections([]);
    setDuplicateBatchWarning(null);
  };

  // Save Batch for current paper with duplicate check and conflict prevention
  const handleSaveBatchForPaper = async () => {
    if (!newBatchSections || newBatchSections.length === 0) {
      message.warning('Please add at least one section');
      return;
    }

    // Validate each section with exact SectionConfig logic
    for (let idx = 0; idx < newBatchSections.length; idx++) {
      const sec = newBatchSections[idx];
      const secName = sec.name?.trim();

      if (!secName) {
        message.error(`Section ${idx + 1} requires a name`);
        setActiveSectionIdx(idx);
        return;
      }

      const startQ = parseInt(sec.startQuestion, 10);
      const endQ = parseInt(sec.endQuestion, 10);
      if (isNaN(startQ) || isNaN(endQ) || endQ < startQ) {
        message.error(`Section '${secName}': End question must be greater than or equal to start question`);
        setActiveSectionIdx(idx);
        return;
      }

      if (!sec.questions || sec.questions.length === 0) {
        message.warning(`Please generate questions for '${secName}'`);
        setActiveSectionIdx(idx);
        return;
      }

      const missingTypeIdx = sec.questions.findIndex(q => !q.type && !q.typeId && !q.questionTypeId);
      if (missingTypeIdx !== -1) {
        message.warning(`Please select a question type for all questions in '${secName}'`, 8000);
        setActiveSectionIdx(idx);
        return;
      }

      if (sec.questions.some(q => !String(q.questionNo || '').trim())) {
        message.error(`All questions in '${secName}' must have a question number`);
        setActiveSectionIdx(idx);
        return;
      }

      const qKeys = sec.questions.map(q => {
        const no = String(q.questionNo || '').trim().toLowerCase();
        const p = String(q.part || '').trim().toLowerCase();
        return p ? `${no}_part_${p}` : no;
      });
      const dupIdx = qKeys.findIndex((k, i) => qKeys.indexOf(k) !== i);
      if (dupIdx !== -1) {
        const dupQ = sec.questions[dupIdx];
        const label = dupQ.part ? `Q${dupQ.questionNo} (Part ${dupQ.part})` : `Q${dupQ.questionNo}`;
        message.error(`Duplicate question '${label}' in section '${secName}'`);
        setActiveSectionIdx(idx);
        return;
      }

      const hasDupName = newBatchSections.some((other, oIdx) => oIdx !== idx && other.name.trim().toLowerCase() === secName.toLowerCase());
      if (hasDupName) {
        message.error(`Duplicate section name '${secName}' in batch`);
        setActiveSectionIdx(idx);
        return;
      }

      for (let j = 0; j < newBatchSections.length; j++) {
        if (j !== idx) {
          const other = newBatchSections[j];
          const oStart = parseInt(other.startQuestion, 10);
          const oEnd = parseInt(other.endQuestion, 10);
          if (startQ <= oEnd && endQ >= oStart) {
            message.error(`Question range Q${startQ}-Q${endQ} in '${secName}' overlaps with '${other.name}' (Q${oStart}-Q${oEnd})`);
            setActiveSectionIdx(idx);
            return;
          }
        }
      }

      // Validate that questions sharing the same Optional Group have identical total marks per question number
      const groupQuestionsMap = {};
      (sec.questions || []).forEach(q => {
        const code = q.optionalGroupCode ? q.optionalGroupCode.trim().toUpperCase() : '';
        if (code) {
          if (!groupQuestionsMap[code]) {
            groupQuestionsMap[code] = {};
          }
          const qKey = String(q.questionNo || '').trim().toUpperCase();
          if (!groupQuestionsMap[code][qKey]) {
            groupQuestionsMap[code][qKey] = { qNo: q.questionNo, parts: [], totalMarks: 0 };
          }
          groupQuestionsMap[code][qKey].totalMarks += (parseFloat(q.marks) || 0);
          if (q.part && q.part !== 'Part') {
            groupQuestionsMap[code][qKey].parts.push(q.part);
          }
        }
      });

      for (const [code, qDict] of Object.entries(groupQuestionsMap)) {
        const qList = Object.values(qDict);
        if (qList.length > 1) {
          const firstTotal = qList[0].totalMarks;
          const mismatchedQ = qList.find(q => Math.abs(q.totalMarks - firstTotal) > 0.001);
          if (mismatchedQ) {
            const q1Label = qList[0].parts.length > 0 ? `Q${qList[0].qNo} (${qList[0].parts.join(', ')})` : `Q${qList[0].qNo}`;
            const q2Label = mismatchedQ.parts.length > 0 ? `Q${mismatchedQ.qNo} (${mismatchedQ.parts.join(', ')})` : `Q${mismatchedQ.qNo}`;
            message.error(`Questions in Optional Group '${code}' in '${secName}' must have identical total marks. ${q1Label} has ${firstTotal}m, but ${q2Label} has ${mismatchedQ.totalMarks}m.`);
            setActiveSectionIdx(idx);
            return;
          }
        }
      }


    }

    const batchTotalMarks = newBatchSections.reduce((sum, s) => sum + (parseFloat(s.totalMarks) || 0), 0);
    if (selectedPaper?.maxMarks && batchTotalMarks > selectedPaper.maxMarks) {
      message.error(`Total allocated marks (${batchTotalMarks}) exceeds paper's maximum marks (${selectedPaper.maxMarks})`);
      return;
    }

    const maxEndQ = Math.max(...newBatchSections.map(s => parseInt(s.endQuestion, 10) || 0));
    if (selectedPaper?.totalQuestions > 0 && maxEndQ > selectedPaper.totalQuestions) {
      message.error(`End question (Q${maxEndQ}) exceeds paper's total questions (${selectedPaper.totalQuestions})`);
      return;
    }

    // Duplicate batch check (excluding current batch being edited)
    const matchedBatchId = findMatchingBatch(newBatchSections, editBatchId && editBatchId > 0 ? editBatchId : null);
    if (matchedBatchId) {
      const msg = `Same section configuration batch already exists (Batch #${matchedBatchId})`;
      message.warning(msg, 6000);
      setDuplicateBatchWarning({
        batchId: matchedBatchId,
        message: msg
      });
      return;
    }

    setNewBatchSaving(true);
    try {
      const defaultQt = questionTypesList[0] || null;

      const batchPayload = {
        batchId: 0,
        sections: newBatchSections.map(sec => ({
          batchId: 0,
          name: sec.name.trim(),
          description: sec.description || '',
          startQuestion: parseInt(sec.startQuestion, 10) || 1,
          endQuestion: parseInt(sec.endQuestion, 10) || 1,
          totalMarks: parseFloat(sec.totalMarks) || 0,
          maxQuestionsToAttempt: parseInt(sec.maxQuestionsToAttempt, 10) || 1,
          totalQuestions: new Set((sec.questions || []).map(q => String(q.questionNo || '').trim()).filter(Boolean)).size || (parseInt(sec.endQuestion, 10) - parseInt(sec.startQuestion, 10) + 1) || 1,
          questions: sec.questions.map(q => {
            const matchedQt = questionTypesList.find(qt => 
              (q.questionTypeId && String(qt.questionTypeId || qt.id) === String(q.questionTypeId)) ||
              (q.typeId && String(qt.questionTypeId || qt.id) === String(q.typeId)) || 
              (q.type && qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())
            );
            const resolvedTypeId = matchedQt?.questionTypeId || matchedQt?.id || q.questionTypeId || q.typeId || defaultQt?.questionTypeId || defaultQt?.id || null;
            const resolvedTypeName = matchedQt?.questionTypeName || q.type || defaultQt?.questionTypeName || 'MCQ';
            return {
              questionNo: String(q.questionNo || ''),
              type: resolvedTypeName,
              typeId: resolvedTypeId,
              questionTypeId: resolvedTypeId,
              marks: parseFloat(q.marks) || 0,
              isOptional: Boolean(q.isOptional),
              optionalGroupCode: q.optionalGroupCode || null,
              part: q.part ? String(q.part).trim() : null,
            };
          }),
        }))
      };

      let newBatchId = null;
      try {
        const res = await sectionService.createSectionMastersBatch(batchPayload);
        newBatchId = res?.batchId;
      } catch (batchErr) {
        if (batchErr.response?.status === 409 || batchErr.response?.data?.existingBatchId) {
          const dupBatchId = batchErr.response?.data?.existingBatchId;
          const msg = batchErr.response?.data?.message || `Same section configuration batch already exists (Batch #${dupBatchId})`;
          message.warning(msg, 6000);
          setDuplicateBatchWarning({ batchId: dupBatchId, message: msg });
          setNewBatchSaving(false);
          return;
        }

        console.warn('Batch create endpoint failed, falling back to sequential create:', batchErr);
        let assignedBatchId = 0;
        for (let i = 0; i < batchPayload.sections.length; i++) {
          const sec = batchPayload.sections[i];
          const res = await sectionService.createSectionMaster({
            ...sec,
            batchId: assignedBatchId,
          });
          if (i === 0 && (res?.batchId || res?.master?.batchId)) {
            assignedBatchId = res.batchId || res.master.batchId;
            newBatchId = assignedBatchId;
          }
        }
      }

      if (newBatchId) {
        const mastersRes = await sectionService.getSectionMasters({ batchId: newBatchId, all: true });
        const newMasterSections = mastersRes?.items || (Array.isArray(mastersRes) ? mastersRes : []);
        const masterSectionIds = newMasterSections.map(s => s.id);

        if (masterSectionIds.length > 0) {
          if (isProjectMode) {
            await sectionService.importMastersToProjectPaper({
              projectId: parseInt(projectId, 10),
              paperId: urlPaperId,
              masterSectionIds: masterSectionIds,
              overwriteExisting: true
            });
          } else {
            await sectionService.importMasterSections({
              paperId: urlPaperId,
              masterSectionIds: masterSectionIds,
              overwriteExisting: true
            });
          }
        }

        message.success(`Batch #${newBatchId} created and linked to paper successfully!`);
        setShowCreateBatchModal(false);
        setNewBatchSections([]);
        await fetchSections();
        await fetchPaperDetails();
        await fetchSectionMasters();
      } else {
        message.error('Failed to create batch sections');
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || err.message || 'Failed to save batch');
    } finally {
      setNewBatchSaving(false);
    }
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
                      value={sectionForm.name}
                      onChange={handleSectionFormChange}
                      className="w-full bg-white text-gray-900 px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-xs font-semibold"
                      placeholder="e.g. Section A"
                      autoComplete="off"
                    />
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
                          {(() => {
                            const distinctQ = new Set(questions.map(q => String(q.questionNo || '').trim()).filter(Boolean)).size;
                            return questions.length > distinctQ
                              ? `${distinctQ} Questions (${questions.length} parts)`
                              : `${distinctQ} Questions`;
                          })()}
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
                            <th className="px-4 py-2.5">Part</th>
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
                                  type="text"
                                  value={q.part || ''}
                                  onChange={(e) => handleQuestionChange(idx, 'part', e.target.value)}
                                  className="w-14 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 text-xs font-bold text-gray-900 focus:bg-white focus:ring-1 focus:ring-teal-500 outline-none text-center"
                                  placeholder="Part"
                                />
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
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddQuestionBelow(idx)}
                                    className="p-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-md transition-all cursor-pointer"
                                    title="Add Question Below"
                                  >
                                    <Plus size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestionRow(idx)}
                                    className="p-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-md transition-all cursor-pointer"
                                    title="Delete Question"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
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
                  type="button"
                  onClick={openCreateBatchModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-sm hover:shadow"
                  title="Configure sections as a full batch for this paper"
                >
                  <Sparkles size={13} />
                  <span>Configure Batch Sections</span>
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
                          {(() => {
                            const distinctQ = new Set((section.questions || []).map(q => String(q.questionNo || '').trim()).filter(Boolean)).size || (section.totalQuestions || section.questions?.length || 0);
                            const partsCount = section.questions?.length || 0;
                            return (
                              <span className="text-[11px] text-gray-400">
                                {partsCount > distinctQ ? `${distinctQ} questions (${partsCount} parts)` : `${distinctQ} questions`}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-3 md:px-6 px-4 font-bold text-gray-900 text-xs">{section.totalMarks}</td>
                      <td className="py-3 md:px-6 px-4 font-bold text-gray-900 text-xs">{section.maxQuestionsToAttempt}</td>
                      <td className="py-3 md:px-6 px-4 font-bold text-gray-900 text-xs">
                        {calculateAverageMarks(section)}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap md:px-6 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {hasPermission("MANAGE_SECTIONS") && (
                            <button
                              onClick={() => handleEditSection(section)}
                              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition cursor-pointer"
                              title="Edit Section"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {hasPermission("MANAGE_SECTIONS") && (
                            <button
                              onClick={() => confirmDeleteSection(section.id)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition cursor-pointer"
                              title="Delete Section"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
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
            <div className="flex items-center justify-center gap-3 pt-2">
              {sectionMasters.length > 0 && hasPermission("MANAGE_SECTIONS") && (
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
              {hasPermission("MANAGE_SECTIONS") && (
                <button
                  type="button"
                  onClick={openCreateBatchModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Create Batch Sections</span>
                </button>
              )}
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

        {/* ── Create / Configure Batch Modal ── */}
        {showCreateBatchModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) handleCloseBatchModal(); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-150 animate-in zoom-in-95 duration-200">

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-teal-200 flex items-center justify-between bg-gradient-to-r from-teal-50 to-teal-100/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-xs">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 text-base sm:text-lg">
                      Configure Batch Sections
                    </h2>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      For <span className="font-extrabold text-teal-800">{selectedPaper?.paperCode}: {selectedPaper?.paperName}</span>
                      {selectedPaper?.totalQuestions ? ` • Target: ${selectedPaper.totalQuestions} Questions • ${selectedPaper.maxMarks || 0} Marks` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Targets live validation pills */}
                  {selectedPaper && (
                    <div className="hidden sm:flex items-center gap-2">
                      {/* Questions Target (counts distinct questions so subparts 11a, 11b are 1 question) */}
                      {(() => {
                        const totalQ = new Set(
                          newBatchSections.flatMap(sec => (sec.questions || []).map(q => String(q.questionNo || '').trim())).filter(Boolean)
                        ).size;
                        const targetQ = parseInt(selectedPaper.totalQuestions, 10) || 0;
                        const qMatch = targetQ > 0 && totalQ === targetQ;
                        return (
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            qMatch
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            Q: {totalQ} / {targetQ || '–'}
                          </span>
                        );
                      })()}

                      {/* Marks Target */}
                      {(() => {
                        const totalM = newBatchSections.reduce((s, sec) => s + (parseFloat(sec.totalMarks) || 0), 0);
                        const maxM = parseFloat(selectedPaper.maxMarks) || 0;
                        const mMatch = maxM > 0 && totalM === maxM;
                        return (
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                            mMatch
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            Marks: {totalM} / {maxM || '–'}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  <button
                    onClick={handleCloseBatchModal}
                    className="p-1.5 hover:bg-teal-200/50 rounded-full text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex flex-1 overflow-hidden">

                {/* Left: Section List */}
                <div className="w-56 border-r border-gray-100 overflow-y-auto p-3 space-y-1.5 shrink-0 bg-gray-50/50">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 pb-1">Sections</p>
                  {newBatchSections.map((sec, idx) => {
                    const distinctQCount = new Set((sec.questions || []).map(q => String(q.questionNo || '').trim()).filter(Boolean)).size;
                    const partsCount = sec.questions?.length || 0;
                    const countLabel = partsCount > distinctQCount ? `${distinctQCount} questions (${partsCount} parts)` : `${distinctQCount} questions`;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSectionIdx(idx)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activeSectionIdx === idx
                            ? 'bg-teal-100 text-teal-800 shadow-xs border border-teal-200'
                            : 'hover:bg-white text-gray-600 hover:text-gray-900 border border-transparent'
                        }`}
                      >
                        <span className="block truncate">{sec.name || `Section ${idx + 1}`}</span>
                        <span className="text-[10px] font-semibold text-gray-400 block mt-0.5">
                          {sec.questions?.length > 0 ? `${countLabel} • ${sec.totalMarks}m` : 'No questions'}
                        </span>
                      </button>
                    );
                  })}

                  {(() => {
                    const paperTargetQ = parseInt(selectedPaper?.totalQuestions, 10) || 0;
                    const usedQ = new Set(
                      newBatchSections.flatMap(sec => (sec.questions || []).map(q => String(q.questionNo || '').trim())).filter(Boolean)
                    ).size;
                    const atCapacity = paperTargetQ > 0 && usedQ >= paperTargetQ;
                    return (
                      <div className="relative group/addtooltip mt-2">
                        <button
                          type="button"
                          onClick={handleAddSectionToBatch}
                          disabled={atCapacity}
                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-dashed transition-all ${
                            atCapacity
                              ? 'text-gray-400 border-gray-200 cursor-not-allowed bg-gray-50'
                              : 'text-teal-700 hover:bg-teal-50 border-teal-300 cursor-pointer'
                          }`}
                        >
                          <Plus size={13} /> Add Section
                        </button>
                        {atCapacity && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-gray-900 text-white text-[10px] font-semibold rounded-lg px-2.5 py-1.5 opacity-0 group-hover/addtooltip:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-lg">
                            This paper has only {paperTargetQ} questions. All questions are already allocated.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Right: Active Section Form */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {newBatchSections.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      No sections yet. Click "Add Section".
                    </div>
                  ) : (
                    <>
                      {/* Section Meta Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">
                            Section Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newBatchSections[activeSectionIdx]?.name || ''}
                            onChange={e => updateBatchSection(activeSectionIdx, 'name', e.target.value)}
                            placeholder="e.g. Section A"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">
                            Description (Optional)
                          </label>
                          <input
                            type="text"
                            value={newBatchSections[activeSectionIdx]?.description || ''}
                            onChange={e => updateBatchSection(activeSectionIdx, 'description', e.target.value)}
                            placeholder="Optional description"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Start Q#</label>
                          <input
                            type="number"
                            min="1"
                            value={newBatchSections[activeSectionIdx]?.startQuestion ?? ''}
                            onChange={e => updateBatchSection(activeSectionIdx, 'startQuestion', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">End Q#</label>
                          <input
                            type="number"
                            min="1"
                            value={newBatchSections[activeSectionIdx]?.endQuestion ?? ''}
                            onChange={e => updateBatchSection(activeSectionIdx, 'endQuestion', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Total Marks</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={newBatchSections[activeSectionIdx]?.totalMarks ?? ''}
                            onChange={e => updateBatchSection(activeSectionIdx, 'totalMarks', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Max Attempt</label>
                          <input
                            type="number"
                            min="1"
                            value={newBatchSections[activeSectionIdx]?.maxQuestionsToAttempt ?? ''}
                            onChange={e => updateBatchSection(activeSectionIdx, 'maxQuestionsToAttempt', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      {/* Questions */}
                      <div>
                        {/* Questions Header Row */}
                        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-black text-gray-700 uppercase tracking-wide shrink-0">
                              {(() => {
                                const qs = newBatchSections[activeSectionIdx]?.questions || [];
                                const distinctCount = new Set(qs.map(q => String(q.questionNo || '').trim()).filter(Boolean)).size;
                                const partsCount = qs.length;
                                return partsCount > distinctCount 
                                  ? `Questions (${distinctCount} • ${partsCount} parts)` 
                                  : `Questions (${distinctCount})`;
                              })()}
                            </label>

                            {/* Universal Question Type Selector */}
                            {newBatchSections[activeSectionIdx]?.questions?.length > 0 && questionTypesList.length > 0 && (
                              <div className="flex items-center gap-1.5 bg-teal-50/60 border border-teal-200 px-2 py-1 rounded-lg">
                                <span className="text-[10px] font-bold text-teal-800 shrink-0">
                                  Universal Type:
                                </span>
                                <select
                                  value={(() => {
                                    const qs = newBatchSections[activeSectionIdx].questions;
                                    if (!qs || qs.length === 0) return '';
                                    const firstId = qs[0].questionTypeId || qs[0].typeId;
                                    const allSame = qs.every(q => {
                                      const curId = q.questionTypeId || q.typeId;
                                      return curId && String(curId) === String(firstId);
                                    });
                                    return allSame ? (firstId || '') : '';
                                  })()}
                                  onChange={e => applyUniversalTypeToBatchSection(activeSectionIdx, e.target.value)}
                                  className="px-2 py-0.5 border border-teal-300 bg-white rounded text-xs font-bold text-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                                >
                                  <option value="">— Select for All —</option>
                                  {questionTypesList.map(qt => (
                                    <option key={qt.questionTypeId || qt.id} value={qt.questionTypeId || qt.id}>
                                      {qt.questionTypeName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                        {/* Question limit warning banner */}
                        {(() => {
                          const paperTargetQ = parseInt(selectedPaper?.totalQuestions, 10) || 0;
                          if (!paperTargetQ) return null;
                          const allDistinctQ = new Set(
                            newBatchSections.flatMap(sec => (sec.questions || []).map(q => String(q.questionNo || '').trim())).filter(Boolean)
                          ).size;
                          const thisSecDistinctQ = new Set(
                            (newBatchSections[activeSectionIdx]?.questions || []).map(q => String(q.questionNo || '').trim()).filter(Boolean)
                          ).size;
                          const otherDistinctQ = allDistinctQ - thisSecDistinctQ;
                          const endQ = parseInt(newBatchSections[activeSectionIdx]?.endQuestion, 10) || 0;
                          const startQ = parseInt(newBatchSections[activeSectionIdx]?.startQuestion, 10) || 1;
                          const rangeCount = endQ >= startQ ? endQ - startQ + 1 : 0;
                          const wouldExceed = endQ > paperTargetQ || (otherDistinctQ + rangeCount > paperTargetQ);
                          if (!wouldExceed && allDistinctQ <= paperTargetQ) return null;
                          return (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 font-semibold">
                              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                              <span>
                                This paper has only <strong>{paperTargetQ}</strong> questions.
                                {endQ > paperTargetQ ? ` End Q# (${endQ}) exceeds the paper limit.` : ` Total questions across all sections (${allDistinctQ}) exceeds the limit.`}
                                {' '}Adjust the question range before generating.
                              </span>
                            </div>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => generateBatchSectionQuestions(activeSectionIdx)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                        >
                          <RefreshCw size={11} /> Generate from Range
                        </button>
                      </div>

                        {newBatchSections[activeSectionIdx]?.questions?.length > 0 ? (
                          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="py-2.5 px-3 font-black text-gray-500 uppercase tracking-wider text-[10px] w-24">Q#</th>
                                  <th className="py-2.5 px-3 font-black text-gray-500 uppercase tracking-wider text-[10px] w-20">Part</th>
                                  <th className="py-2.5 px-3 font-black text-gray-500 uppercase tracking-wider text-[10px]">Type</th>
                                  <th className="py-2.5 px-3 text-center font-black text-gray-500 uppercase tracking-wider text-[10px] w-24">Marks</th>
                                  <th className="py-2.5 px-3 text-center font-black text-gray-500 uppercase tracking-wider text-[10px] w-20">Optional</th>
                                  <th className="py-2.5 px-3 font-black text-gray-500 uppercase tracking-wider text-[10px]">Group Code</th>
                                  <th className="py-2.5 px-3 text-center font-black text-gray-500 uppercase tracking-wider text-[10px] w-20">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {newBatchSections[activeSectionIdx].questions.map((q, qIdx) => (
                                  <tr key={qIdx} className="hover:bg-teal-50/30 transition-colors">
                                    {/* Editable Question Number */}
                                    <td className="py-1.5 px-3">
                                      <div className="flex items-center gap-1">
                                        <span className="text-gray-400 font-bold text-xs">Q</span>
                                        <input
                                          type="text"
                                          value={q.questionNo}
                                          onChange={e => updateBatchSectionQuestion(activeSectionIdx, qIdx, 'questionNo', e.target.value)}
                                          className="w-14 px-1.5 py-1 border border-gray-300 rounded text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 text-center bg-white"
                                          placeholder="No."
                                        />
                                      </div>
                                    </td>

                                    {/* Part Input */}
                                    <td className="py-1.5 px-3">
                                      <input
                                        type="text"
                                        value={q.part || ''}
                                        onChange={e => updateBatchSectionQuestion(activeSectionIdx, qIdx, 'part', e.target.value)}
                                        className="w-14 px-1.5 py-1 border border-gray-300 rounded text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 text-center bg-white"
                                        placeholder="Part"
                                      />
                                    </td>

                                    {/* Question Type dropdown */}
                                    <td className="py-1.5 px-3">
                                      <select
                                        id={`batch-modal-qtype-${activeSectionIdx}-${qIdx}`}
                                        value={
                                          q.questionTypeId || q.typeId || (
                                            questionTypesList.find(qt => qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())?.questionTypeId
                                          ) || ""
                                        }
                                        onChange={e => updateBatchSectionQuestion(activeSectionIdx, qIdx, 'typeSelect', e.target.value)}
                                        className={`w-full px-2 py-1 border rounded text-xs font-semibold outline-none bg-white ${
                                          !q.type && !q.typeId && !q.questionTypeId
                                            ? 'border-red-300 bg-red-50/30 text-red-700'
                                            : 'border-gray-300 focus:ring-1 focus:ring-teal-500 text-gray-800'
                                        }`}
                                      >
                                        <option value="">Choose Type...</option>
                                        {questionTypesList.map(qt => (
                                          <option key={qt.questionTypeId || qt.id} value={qt.questionTypeId || qt.id}>
                                            {qt.questionTypeName}
                                          </option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* Marks Input */}
                                    <td className="py-1.5 px-3 text-center">
                                      <input
                                        type="number"
                                        step="0.5"
                                        value={q.marks ?? ''}
                                        onChange={e => updateBatchSectionQuestion(activeSectionIdx, qIdx, 'marks', e.target.value)}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                                      />
                                    </td>

                                    {/* Optional Checkbox */}
                                    <td className="py-1.5 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(q.isOptional || q.optionalGroupCode)}
                                        onChange={e => updateBatchSectionQuestion(activeSectionIdx, qIdx, 'isOptional', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-teal-700 focus:ring-teal-500 cursor-pointer"
                                      />
                                    </td>

                                    {/* Optional Group Code */}
                                    <td className="py-1.5 px-3">
                                      {(() => {
                                        const code = q.optionalGroupCode?.trim()?.toUpperCase();
                                        if (!code) {
                                          return (
                                            <div>
                                              <input
                                                type="text"
                                                value={q.optionalGroupCode || ''}
                                                onChange={e => updateBatchSectionQuestion(activeSectionIdx, qIdx, 'optionalGroupCode', e.target.value)}
                                                placeholder="Group code (optional)"
                                                className="w-full px-2.5 py-1 border border-gray-300 rounded text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                                              />
                                            </div>
                                          );
                                        }

                                        const allSectionQuestions = newBatchSections[activeSectionIdx]?.questions || [];
                                        const groupQuestions = allSectionQuestions.filter(other => other.optionalGroupCode?.trim()?.toUpperCase() === code);
                                        const questionTotals = {};
                                        groupQuestions.forEach(other => {
                                          const qKey = String(other.questionNo || '').trim().toUpperCase();
                                          if (!questionTotals[qKey]) {
                                            questionTotals[qKey] = { total: 0, qNo: other.questionNo, parts: [] };
                                          }
                                          questionTotals[qKey].total += (parseFloat(other.marks) || 0);
                                          if (other.part && other.part !== 'Part') {
                                            questionTotals[qKey].parts.push(other.part);
                                          }
                                        });

                                        const myKey = String(q.questionNo || '').trim().toUpperCase();
                                        const myTotal = questionTotals[myKey]?.total || 0;
                                        const conflictingKey = Object.keys(questionTotals).find(otherKey => 
                                          otherKey !== myKey && Math.abs(questionTotals[otherKey].total - myTotal) > 0.001
                                        );
                                        const conflicting = conflictingKey ? questionTotals[conflictingKey] : null;
                                        const hasMismatch = Boolean(conflicting);
                                        const oLabel = conflicting ? (conflicting.parts.length > 0 ? `Q${conflicting.qNo} (${conflicting.parts.join(', ')})` : `Q${conflicting.qNo}`) : '';

                                        return (
                                          <div>
                                            <input
                                              type="text"
                                              value={q.optionalGroupCode || ''}
                                              onChange={e => updateBatchSectionQuestion(activeSectionIdx, qIdx, 'optionalGroupCode', e.target.value)}
                                              placeholder="Group code (optional)"
                                              title={hasMismatch ? `Group '${q.optionalGroupCode}' marks mismatch! ${oLabel} has ${conflicting.total}m, but Q${q.questionNo} total is ${myTotal}m. Questions in same group must have identical total marks.` : ''}
                                              className={`w-full px-2.5 py-1 border rounded text-xs font-semibold focus:outline-none focus:ring-1 bg-white ${
                                                hasMismatch
                                                  ? 'border-amber-400 bg-amber-50/50 text-amber-900 focus:ring-amber-500 ring-1 ring-amber-300'
                                                  : 'border-gray-300 text-gray-700 focus:ring-teal-500'
                                              }`}
                                            />
                                            {hasMismatch && (
                                              <div className="text-[9px] text-amber-700 font-bold mt-0.5 leading-tight flex items-center gap-1">
                                                <span>⚠ Must match {oLabel} ({conflicting.total}m)</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    {/* Row Actions */}
                                    <td className="py-1.5 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          title="Add question after this row"
                                          onClick={() => handleAddBatchQuestion(activeSectionIdx, qIdx)}
                                          className="w-6 h-6 flex items-center justify-center rounded bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-all cursor-pointer"
                                        >
                                          <Plus size={11} />
                                        </button>
                                        <button
                                          type="button"
                                          title="Remove this question"
                                          onClick={() => handleRemoveBatchQuestion(activeSectionIdx, qIdx)}
                                          className="w-6 h-6 flex items-center justify-center rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                                        >
                                          <X size={11} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
                            <Layers size={28} className="mx-auto mb-2 opacity-40 text-teal-600" />
                            <p className="text-xs font-bold text-gray-700">No questions generated yet.</p>
                            <p className="text-[10px] mt-0.5 text-gray-500">Set start/end Q and total marks, then click <span className="font-black text-teal-600">Generate from Range</span>.</p>
                          </div>
                        )}
                      </div>

                      {/* Remove section button */}
                      {newBatchSections.length > 1 && (
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveBatchSection(activeSectionIdx)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 size={11} /> Remove This Section
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>



              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-150 flex items-center justify-between shrink-0 bg-white">
                <p className="text-xs text-gray-600 font-semibold">
                  <span className="font-bold text-gray-900">{newBatchSections.length}</span> section{newBatchSections.length !== 1 ? 's' : ''} •{' '}
                  <span className="font-bold text-teal-800">
                    {(() => {
                      const distinctTotal = new Set(
                        newBatchSections.flatMap(sec => (sec.questions || []).map(q => String(q.questionNo || '').trim())).filter(Boolean)
                      ).size;
                      const totalParts = newBatchSections.reduce((s, sec) => s + (sec.questions?.length || 0), 0);
                      return totalParts > distinctTotal
                        ? `${distinctTotal} total questions (${totalParts} parts)`
                        : `${distinctTotal} total questions`;
                    })()}
                  </span> •{' '}
                  <span className="font-bold text-teal-800">
                    {newBatchSections.reduce((s, sec) => s + (parseFloat(sec.totalMarks) || 0), 0)}
                  </span> total marks
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCloseBatchModal}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBatchForPaper}
                    disabled={newBatchSaving || newBatchSections.length === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-teal-700 text-white rounded-lg text-sm font-bold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  >
                    {newBatchSaving ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving Batch...</>
                    ) : (
                      <><Save size={14} /> Save & Link Batch to Paper</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Duplicate Batch Warning Modal ── */}
        {duplicateBatchWarning && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <AlertCircle size={26} />
              </div>
              <h3 className="text-base font-black text-gray-950 text-center mb-1.5">
                Same Section Configuration Batch Already Exists
              </h3>
              <p className="text-xs text-gray-600 text-center mb-6 leading-relaxed">
                An identical section batch with the exact same sections, questions, marks, and optional rules already exists as <strong className="text-teal-800 font-black">Batch #{duplicateBatchWarning.batchId}</strong>. A new duplicate batch cannot be created.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const targetBatchId = duplicateBatchWarning.batchId;
                    setDuplicateBatchWarning(null);
                    setShowCreateBatchModal(false);
                    setPreviewOpenedFromBatchCreate(true);
                    setPreviewModalBatchId(targetBatchId);
                    setShowImportMasterModal(true);
                  }}
                  className="flex-1 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye size={15} />
                  <span>See Preview of Batch #{duplicateBatchWarning.batchId}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateBatchWarning(null)}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Modify Sections
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Master Sections Modal */}
        {(showImportMasterModal || previewModalBatchId) && (() => {
          // Helper to get actual questions count in a section (distinct questions, subparts 11a, 11b count as 1 question)
          const getSecQuestionsCount = (s) => {
            if (s.questions && s.questions.length > 0) {
              const distinctQ = new Set(s.questions.map(q => String(q.questionNo || '').trim()).filter(Boolean)).size;
              return distinctQ > 0 ? distinctQ : s.questions.length;
            }
            if (s.totalQuestions && parseInt(s.totalQuestions, 10) > 0) return parseInt(s.totalQuestions, 10);
            if (s.endQuestion && s.startQuestion && s.endQuestion >= s.startQuestion) return s.endQuestion - s.startQuestion + 1;
            return 0;
          };

          const getSecTotalMarks = (s) => {
            const tm = parseFloat(s?.totalMarks);
            if (!isNaN(tm) && tm > 0) return tm;
            if (Array.isArray(s?.questions) && s.questions.length > 0) {
              const sumMarks = s.questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);
              if (sumMarks > 0) return sumMarks;
            }
            return 0;
          };

          // Clean non-mutating grouping of sections by batchId
          const batchMap = {};
          (sectionMasters || []).forEach(sec => {
            const bId = sec.batchId || 1;
            if (!batchMap[bId]) batchMap[bId] = [];
            const isDup = batchMap[bId].some(existing =>
              (existing.id && sec.id && existing.id === sec.id) ||
              (existing.name?.trim().toLowerCase() === sec.name?.trim().toLowerCase() && existing.startQuestion === sec.startQuestion)
            );
            if (!isDup) {
              batchMap[bId].push(sec);
            }
          });

          // Ensure all batches from allBatchesMap are present without duplicate sections
          if (allBatchesMap && typeof allBatchesMap === 'object') {
            Object.keys(allBatchesMap).forEach(bId => {
              if (!batchMap[bId] && Array.isArray(allBatchesMap[bId])) {
                batchMap[bId] = [...allBatchesMap[bId]];
              }
            });
          }

          const targetTotalQ = parseInt(selectedPaper?.totalQuestions, 10) || 0;
          const targetMaxMarks = parseFloat(selectedPaper?.maxMarks) || 0;
          const availableBatches = Object.keys(batchMap)
            .map(Number)
            .filter(bId => {
              const bSections = batchMap[bId] || [];
              const bTotalQ = bSections.reduce((sum, s) => sum + getSecQuestionsCount(s), 0);
              const bTotalM = bSections.reduce((sum, s) => sum + getSecTotalMarks(s), 0);

              // BOTH conditions must strictly satisfy:
              if (targetTotalQ > 0 && bTotalQ !== targetTotalQ) return false;
              if (targetMaxMarks > 0 && Math.abs(bTotalM - targetMaxMarks) > 0.01) return false;
              return true;
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
                    const pTotalQ = pSections.reduce((sum, s) => sum + getSecQuestionsCount(s), 0);
                    const pTotalM = pSections.reduce((sum, s) => sum + (parseFloat(s.totalMarks) || 0), 0);
                    const isCurrentBatch = currentPaperBatchId === previewModalBatchId;

                    return (
                      <div className="space-y-3.5 animate-in fade-in duration-150">
                        {/* Top Navigation & Actions Bar */}
                        <div className="flex items-center justify-between gap-2.5 p-3 bg-teal-50/80 border border-teal-200/90 rounded-xl flex-wrap">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {previewOpenedFromBatchCreate && (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowImportMasterModal(false);
                                  setPreviewModalBatchId(null);
                                  setPreviewOpenedFromBatchCreate(false);
                                  setShowCreateBatchModal(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 transition-all cursor-pointer shadow-2xs"
                                title="Back to editing your batch sections"
                              >
                                <ArrowLeft size={14} />
                                <span>Back to Batch Editor</span>
                              </button>
                            )}
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
                                          <th className="py-2 px-3">Part</th>
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
                                              {q.questionNo ? (String(q.questionNo).startsWith('Q') ? q.questionNo : `Q${q.questionNo}`) : `Q${(sec.startQuestion || 1) + qIdx}`}{q.part ? (q.part.startsWith('(') ? q.part : ` (${q.part})`) : ''}
                                            </td>
                                            <td className="py-2 px-3 text-xs font-semibold text-gray-700">
                                              {q.part ? <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200/60">{q.part}</span> : '–'}
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
                        {(targetTotalQ > 0 || targetMaxMarks > 0) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800">
                            Matching {targetTotalQ > 0 ? `${targetTotalQ} Questions` : ''}{targetTotalQ > 0 && targetMaxMarks > 0 ? ' • ' : ''}{targetMaxMarks > 0 ? `${targetMaxMarks} Marks` : ''}
                          </span>
                        )}
                      </div>

                      {availableBatches.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <Layers className="mx-auto text-gray-300 mb-2" size={32} />
                          <p className="text-xs font-bold text-gray-800">No Matching Batch Templates Found</p>
                          {targetTotalQ > 0 || targetMaxMarks > 0 ? (
                            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                              No batch templates match both {targetTotalQ > 0 ? <><span className="font-bold text-gray-800">{targetTotalQ} questions</span></> : ''}{targetTotalQ > 0 && targetMaxMarks > 0 ? ' and ' : ''}{targetMaxMarks > 0 ? <><span className="font-bold text-gray-800">{targetMaxMarks} marks</span></> : ''} for this paper.
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
                            const bTotalQ = bSections.reduce((sum, s) => sum + getSecQuestionsCount(s), 0);
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
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0 flex-wrap gap-2">
                  {previewModalBatchId ? (
                    <>
                      <div className="flex items-center gap-2">
                        {previewOpenedFromBatchCreate && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowImportMasterModal(false);
                              setPreviewModalBatchId(null);
                              setPreviewOpenedFromBatchCreate(false);
                              setShowCreateBatchModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-teal-800 bg-white border border-teal-200 hover:bg-teal-50 rounded-lg transition-all cursor-pointer shadow-2xs"
                          >
                            <ArrowLeft size={14} />
                            <span>Back to Batch Editor</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewModalBatchId(null)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg transition-all cursor-pointer shadow-2xs"
                        >
                          <ArrowLeft size={14} />
                          <span>Back to Batches</span>
                        </button>
                      </div>
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
                          setPreviewOpenedFromBatchCreate(false);
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
