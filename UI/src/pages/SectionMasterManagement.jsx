import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layers, Plus, Edit2, Edit, Trash2, X, Award, Hash, CheckCircle2, Check, RefreshCw, Save, ListTodo, Eye, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { useConfigHeader } from '../context/ConfigHeaderContext';
import { sectionService, questionTypeService } from '../services';
import message from '../services/messageService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import ColumnFilter from '../components/ColumnFilter';

export default function SectionMasterManagement() {
  const { userType, hasPermission } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const { setConfigHeader } = useConfigHeader();

  // State management
  const [previewBatchId, setPreviewBatchId] = useState(null);

  // Create New Batch Modal state
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [modalBatchId, setModalBatchId] = useState(0);
  const [deletedSectionIds, setDeletedSectionIds] = useState([]);
  const [newBatchSections, setNewBatchSections] = useState([]);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [newBatchSaving, setNewBatchSaving] = useState(false);
  const [questionTypesList, setQuestionTypesList] = useState([]);

  // Duplicate batch tracking & map of all batches across all pages
  const [allBatchesMap, setAllBatchesMap] = useState({});
  const [duplicateBatchWarning, setDuplicateBatchWarning] = useState(null);

  const [deletingId, setDeletingId] = useState(null);
  const [batchIdOptions, setBatchIdOptions] = useState([]);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editQuestions, setEditQuestions] = useState([]);
  const [batchSections, setBatchSections] = useState([]);

  // Fetch function for useTable
  const fetchFn = useCallback((params) => {
    return sectionService.getSectionMasters({
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      search: params.search || '',
      batchId: params.batchId || null,
      sortField: params.sortField || 'batchId',
      sortOrder: params.sortOrder || 'asc'
    });
  }, []);

  const {
    items: masters,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
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

  // Update batch ID options whenever we get new data
  useEffect(() => {
    if (masters && masters.length > 0) {
      const uniqueBatches = Array.from(new Set(masters.map(m => m.batchId)))
        .sort((a, b) => a - b)
        .map(bId => ({
          label: `Batch #${bId}`,
          value: bId.toString()
        }));
      setBatchIdOptions(uniqueBatches);
    }
  }, [masters]);

  // Group masters by batchId using useMemo
  const groupedByBatch = useMemo(() => {
    const grouped = {};
    (masters || []).forEach(master => {
      const bid = master.batchId || 1;
      if (!grouped[bid]) {
        grouped[bid] = [];
      }
      grouped[bid].push(master);
    });
    return grouped;
  }, [masters]);

  // Sort batch IDs numerically according to sortOrder
  const sortedBatchIds = useMemo(() => {
    return Object.keys(groupedByBatch)
      .map(Number)
      .sort((a, b) => sortOrder?.toLowerCase() === 'desc' ? b - a : a - b);
  }, [groupedByBatch, sortOrder]);

  // Set breadcrumb
  useEffect(() => {
    const parentPath = userType === 'admin' ? '/admin/dashboard' : '/coordinator/dashboard';
    const currentPath = userType === 'admin' ? '/admin/section-masters' : '/section-masters';
    setBreadcrumb([
      { label: 'Dashboard', path: parentPath, icon: 'Home' },
      { label: 'Section Masters', path: currentPath, icon: 'Layers' },
    ]);
  }, [userType, setBreadcrumb]);

  // Fetch question types on mount from questiontypes table
  useEffect(() => {
    questionTypeService.getAllQuestionTypes()
      .then(data => { if (data?.length > 0) setQuestionTypesList(data); })
      .catch(console.error);
  }, []);

  // Fetch all batches across all pages for comprehensive duplicate detection & previewing
  const loadAllBatches = useCallback(async () => {
    try {
      const res = await sectionService.getSectionMasters({ all: true, pageSize: 100 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      const map = {};
      items.forEach(sec => {
        const bId = sec.batchId || 1;
        if (!map[bId]) map[bId] = [];
        map[bId].push(sec);
      });
      setAllBatchesMap(map);
    } catch (err) {
      console.error("Failed to load all batch masters", err);
    }
  }, []);

  useEffect(() => {
    loadAllBatches();
  }, [loadAllBatches]);

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
          if (!str || str === `${secName.toLowerCase()}-optional`) return '';
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
    if (modalBatchId > 0) return null;
    return findMatchingBatch(newBatchSections, modalBatchId > 0 ? modalBatchId : null);
  }, [showCreateBatchModal, newBatchSections, findMatchingBatch, modalBatchId]);

  // Update a field in the active section
  const updateSection = (idx, field, value) => {
    setNewBatchSections(prev => prev.map((sec, i) => {
      if (i !== idx) return sec;
      const updated = { ...sec, [field]: value };

      // When totalMarks changes, automatically redistribute marks across existing questions!
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

  // Generate questions from range for a section
  const generateSectionQuestions = (sIdx) => {
    const sec = newBatchSections[sIdx];
    const start = parseInt(sec.startQuestion, 10) || 1;
    const end = parseInt(sec.endQuestion, 10) || 1;
    const totalMarks = parseFloat(sec.totalMarks) || 0;
    const count = end - start + 1;

    if (count <= 0) {
      message.error('End question must be greater than or equal to start question');
      return;
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

      // Adjust last question mark if there is a slight floating remainder so total sum is exact
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

  // Universal question type selector: applies selected type to ALL questions in the active section
  const applyUniversalType = (sIdx, typeVal) => {
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
  // "16"  → "17"  |  "16A" → "16B"  |  "16Z" → "16AA"
  const nextQuestionNo = (qNo) => {
    const str = String(qNo || '').trim();
    // Check if ends with letter(s) → alpha suffix
    const match = str.match(/^(\d+)([A-Za-z]*)$/);
    if (match) {
      const numPart = match[1];
      const alphaPart = match[2];
      if (alphaPart === '') {
        // pure numeric: 16 → 17
        return String(parseInt(numPart, 10) + 1);
      }
      // increment last letter: A→B, Z→AA
      const upper = alphaPart.toUpperCase();
      const incr = (s) => {
        const arr = s.split('');
        let i = arr.length - 1;
        while (i >= 0) {
          if (arr[i] < 'Z') { arr[i] = String.fromCharCode(arr[i].charCodeAt(0) + 1); return arr.join(''); }
          arr[i] = 'A'; i--;
        }
        return 'A' + arr.join('');
      };
      return numPart + incr(upper);
    }
    // fallback: append suffix
    return str + '_1';
  };

  // Add a question row after qIdx:
  // If the source question has a part (e.g. Q1 part a), it adds the next part (Q1 part b) of the same question.
  // Otherwise, it adds the next question number (Q2).
  const handleAddQuestion = (sIdx, qIdx) => {
    setNewBatchSections(prev => prev.map((sec, i) => {
      if (i !== sIdx) return sec;
      const qs = [...sec.questions];
      const source = qs[qIdx];
      const hasPart = Boolean(source?.part && String(source.part).trim() !== '');

      let newQuestionNo;
      let newPart;
      if (hasPart) {
        newQuestionNo = source.questionNo;
        newPart = getNextPart(source.part);
      } else {
        newQuestionNo = nextQuestionNo(source.questionNo);
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

  // Remove a question row at qIdx (only if more than 1 question)
  const handleRemoveQuestion = (sIdx, qIdx) => {
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

  // Update a single question field
  const updateSectionQuestion = (sIdx, qIdx, field, value) => {
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

  // Add section to batch with intelligent range continuation and auto-generated questions
  const handleAddSectionToBatch = () => {
    let nextStart = 1;
    if (newBatchSections.length > 0) {
      const maxEnd = Math.max(...newBatchSections.map(s => parseInt(s.endQuestion, 10) || 0));
      nextStart = maxEnd + 1;
    }
    const nextEnd = nextStart + 9;
    const count = nextEnd - nextStart + 1;
    const totalMarks = 10;
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
    const usesDash = newBatchSections.some(s => s.name?.includes(' - '));
    const secName = usesDash ? `Section - ${nextLetter}` : `Section ${nextLetter}`;

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
  const handleRemoveSection = (idx) => {
    const targetSec = newBatchSections[idx];
    if (targetSec?.id) {
      setDeletedSectionIds(prev => [...prev, targetSec.id]);
    }
    setNewBatchSections(prev => prev.filter((_, i) => i !== idx));
    setActiveSectionIdx(prev => Math.max(0, idx - 1));
  };

  // Open create batch modal (Brand new batch)
  const openCreateBatchModal = () => {
    setModalBatchId(0);
    setDeletedSectionIds([]);
    const initialSec = {
      name: 'Section - A',
      description: '',
      startQuestion: 1,
      endQuestion: 10,
      totalMarks: 10,
      maxQuestionsToAttempt: 10,
      questions: [],
    };
    setNewBatchSections([initialSec]);
    setActiveSectionIdx(0);
    setShowCreateBatchModal(true);
  };

  // Open batch modal to edit existing batch (from preview panel or edit action)
  const openEditBatchModal = (batchId, targetSectionId = null) => {
    const rawSections = groupedByBatch[batchId] || [];
    if (rawSections.length === 0) {
      message.warning('Batch data not found');
      return;
    }

    const defaultQt = questionTypesList[0] || null;

    const mappedSections = rawSections.map(sec => {
      const totalQ = sec.totalQuestions || (sec.endQuestion - sec.startQuestion + 1);
      const marksPerQ = totalQ > 0 ? parseFloat((sec.totalMarks / totalQ).toFixed(2)) : 0;

      let questions = [];
      if (sec.questions && sec.questions.length > 0) {
        questions = sec.questions.map(q => {
          const matchedQt = questionTypesList.find(qt =>
            (q.questionTypeId && String(qt.questionTypeId || qt.id) === String(q.questionTypeId)) ||
            (q.typeId && String(qt.questionTypeId || qt.id) === String(q.typeId)) ||
            (q.type && qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())
          );
          const resolvedTypeId = matchedQt?.questionTypeId || matchedQt?.id || q.questionTypeId || q.typeId || defaultQt?.questionTypeId || defaultQt?.id || null;
          const resolvedTypeName = matchedQt?.questionTypeName || q.type || defaultQt?.questionTypeName || 'MCQ';

          return {
            id: q.id || q.questionId || null,
            questionNo: String(q.questionNo ?? ''),
            type: resolvedTypeName,
            typeId: resolvedTypeId,
            questionTypeId: resolvedTypeId,
            marks: q.marks !== undefined ? parseFloat(q.marks) : marksPerQ,
            isOptional: Boolean(q.isOptional),
            optionalGroupCode: q.optionalGroupCode || '',
            part: q.part || '',
          };
        });
      } else {
        const start = sec.startQuestion || 1;
        const end = sec.endQuestion || (start + totalQ - 1);
        for (let i = start; i <= end; i++) {
          questions.push({
            id: null,
            questionNo: String(i),
            type: defaultQt?.questionTypeName || 'MCQ',
            typeId: defaultQt?.questionTypeId || defaultQt?.id || null,
            questionTypeId: defaultQt?.questionTypeId || defaultQt?.id || null,
            marks: marksPerQ,
            isOptional: false,
            optionalGroupCode: '',
            part: '',
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
        maxQuestionsToAttempt: sec.maxQuestionsToAttempt,
        questions,
      };
    });

    setModalBatchId(batchId);
    setDeletedSectionIds([]);
    setNewBatchSections(mappedSections);
    let targetIdx = 0;
    if (targetSectionId) {
      const foundIdx = mappedSections.findIndex(s => s.id === targetSectionId);
      if (foundIdx !== -1) targetIdx = foundIdx;
    }
    setActiveSectionIdx(targetIdx);
    setShowCreateBatchModal(true);
  };

  // Close batch modal
  const handleCloseBatchModal = () => {
    setShowCreateBatchModal(false);
    setNewBatchSections([]);
    setDeletedSectionIds([]);
    setModalBatchId(0);
  };



  // Save new batch to backend with full SectionConfig error & validation logic
  const handleSaveNewBatch = async () => {
    if (!newBatchSections || newBatchSections.length === 0) {
      message.warning('Please add at least one section');
      return;
    }

    // Validate each section with exact SectionConfig logic
    for (let idx = 0; idx < newBatchSections.length; idx++) {
      const sec = newBatchSections[idx];
      const secName = sec.name?.trim();

      // 1. Name required
      if (!secName) {
        message.error(`Section ${idx + 1} requires a name`);
        setActiveSectionIdx(idx);
        return;
      }

      // 2. Start Q and End Q check
      const startQ = parseInt(sec.startQuestion, 10);
      const endQ = parseInt(sec.endQuestion, 10);
      if (isNaN(startQ) || isNaN(endQ) || endQ < startQ) {
        message.error(`Section '${secName}': End question must be greater than or equal to start question`);
        setActiveSectionIdx(idx);
        return;
      }

      // 3. Questions exist check
      if (!sec.questions || sec.questions.length === 0) {
        message.warning(`Please generate questions for '${secName}'`);
        setActiveSectionIdx(idx);
        return;
      }

      // 4. All questions must have a question type
      const missingTypeIdx = sec.questions.findIndex(q => !q.type && !q.typeId && !q.questionTypeId);
      if (missingTypeIdx !== -1) {
        message.warning(`Please select a question type for all questions in '${secName}'`, 8000);
        setActiveSectionIdx(idx);
        setTimeout(() => {
          const el = document.getElementById(`modal-qtype-${idx}-${missingTypeIdx}`);
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }

      // 5. Empty question numbers check
      if (sec.questions.some(q => !String(q.questionNo || '').trim())) {
        message.error(`All questions in '${secName}' must have a question number`);
        setActiveSectionIdx(idx);
        return;
      }

      // 6. Duplicate question numbers in section
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

      // 7. Duplicate section name in batch
      const hasDupName = newBatchSections.some((other, oIdx) => oIdx !== idx && other.name.trim().toLowerCase() === secName.toLowerCase());
      if (hasDupName) {
        message.error(`Duplicate section name '${secName}' in batch`);
        setActiveSectionIdx(idx);
        return;
      }

      // 8. Range overlap across sections in batch
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

      // Validate that questions sharing the same Optional Group have identical marks
      const groupQuestionsMap = {};
      (sec.questions || []).forEach(q => {
        const code = q.optionalGroupCode ? q.optionalGroupCode.trim().toUpperCase() : '';
        if (code) {
          if (!groupQuestionsMap[code]) {
            groupQuestionsMap[code] = [];
          }
          groupQuestionsMap[code].push(q);
        }
      });

      for (const [code, qList] of Object.entries(groupQuestionsMap)) {
        if (qList.length > 1) {
          const firstMarks = parseFloat(qList[0].marks) || 0;
          const mismatchedQ = qList.find(q => Math.abs((parseFloat(q.marks) || 0) - firstMarks) > 0.001);
          if (mismatchedQ) {
            const q1Label = qList[0].part ? `Q${qList[0].questionNo} (${qList[0].part})` : `Q${qList[0].questionNo}`;
            const q2Label = mismatchedQ.part ? `Q${mismatchedQ.questionNo} (${mismatchedQ.part})` : `Q${mismatchedQ.questionNo}`;
            message.error(`Questions in Optional Group '${code}' in '${secName}' must have identical marks. ${q1Label} has ${firstMarks}m, but ${q2Label} has ${mismatchedQ.marks}m.`);
            setActiveSectionIdx(idx);
            return;
          }
        }
      }


    }

    // Check if an identical batch already exists (excluding current batch being edited)
    const matchedBatchId = findMatchingBatch(newBatchSections, modalBatchId > 0 ? modalBatchId : null);
    if (matchedBatchId) {
      const msg = `Same section configuration batch already exists (Batch #${matchedBatchId})`;
      message.warning(msg, 6000);
      setDuplicateBatchWarning({
        batchId: matchedBatchId,
        message: msg
      });
      return;
    }

    // All validations passed! Save to backend
    setNewBatchSaving(true);
    try {
      const defaultQt = questionTypesList[0] || null;

      // Map sections and questions into clean batch payload with batchId: 0
      // When editing an existing batch, this creates a brand new batch with the edited details
      // while leaving the original batch intact in the database as requested.
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
          const dupBatchId = batchErr.response?.data?.existingBatchId || modalBatchId;
          const msg = batchErr.response?.data?.message || `Same section configuration batch already exists (Batch #${dupBatchId})`;
          message.warning(msg, 6000);
          setDuplicateBatchWarning({ batchId: dupBatchId, message: msg });
          setNewBatchSaving(false);
          return;
        }

        console.warn('Batch create endpoint failed, falling back to sequential create:', batchErr);
        // Fallback: sequential create with shared batchId
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

      if (modalBatchId > 0) {
        if (newBatchId) {
          message.success(`New Batch #${newBatchId} created successfully with edited details (Batch #${modalBatchId} remains unchanged)`);
        } else {
          message.success(`New batch created successfully with edited details (Batch #${modalBatchId} remains unchanged)`);
        }
      } else {
        if (newBatchId) {
          message.success(`Batch #${newBatchId} created successfully`);
        } else {
          message.success('Batch created successfully');
        }
      }

      setShowCreateBatchModal(false);
      setNewBatchSections([]);
      setDeletedSectionIds([]);
      setModalBatchId(0);
      refreshTable();
      loadAllBatches();
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to save batch');
    } finally {
      setNewBatchSaving(false);
    }
  };

  // Connect to ConfigHeader unified bar
  useEffect(() => {
    const canManage = hasPermission('MANAGE_SECTIONS');
    setConfigHeader({
      title: 'Section Masters Management',
      search,
      setSearch,
      searchPlaceholder: 'Search section name, description, batch ID…',
      actionLabel: canManage ? 'Create Batch Sections' : undefined,
      onAction: canManage ? openCreateBatchModal : undefined,
      count: totalCount,
    });
    return () => setConfigHeader(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, setSearch, setConfigHeader, totalCount, hasPermission]);

  // Delete single section master
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? Existing configured sections referencing it will have their master link cleared.`)) {
      try {
        setDeletingId(id);
        await sectionService.deleteSectionMaster(id);
        message.success('Section Master deleted successfully');
        refreshTable();
      } catch (err) {
        message.error(err.response?.data?.message || err.message || 'Failed to delete section master');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Edit batch - open preview panel in edit mode
  const handleEditBatch = (batchId) => {
    const sections = groupedByBatch[batchId] || [];
    setBatchSections(sections);
    setEditingBatchId(batchId);
    setPreviewBatchId(batchId);
  };

  // Delete entire batch
  const handleDeleteBatch = async (batchId) => {
    const sections = groupedByBatch[batchId] || [];
    if (window.confirm(`Are you sure you want to delete all ${sections.length} section(s) in Batch #${batchId}? This action cannot be undone.`)) {
      try {
        setDeletingId(`batch-${batchId}`);
        for (const section of sections) {
          await sectionService.deleteSectionMaster(section.id);
        }
        message.success(`Successfully deleted all ${sections.length} section(s) in Batch #${batchId}`);
        refreshTable();
      } catch (err) {
        message.error(err.response?.data?.message || err.message || 'Failed to delete batch');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Edit individual section in batch
  const handleEditSection = (section) => {
    setEditingSectionId(section.id);
    setEditForm({
      name: section.name,
      description: section.description,
      startQuestion: section.startQuestion,
      endQuestion: section.endQuestion,
      totalMarks: section.totalMarks,
      maxQuestionsToAttempt: section.maxQuestionsToAttempt,
    });
    
    // Load or generate questions
    const totalQ = section.totalQuestions || (section.endQuestion - section.startQuestion + 1);
    const marksPerQ = totalQ > 0 ? (section.totalMarks / totalQ).toFixed(1) : '-';
    
    const questions = (section.questions && section.questions.length > 0)
      ? section.questions.map(q => ({
          questionNo: q.questionNo,
          part: q.part || '',
          type: q.type || q.questionType || 'MCQ',
          marks: parseFloat(q.marks) || 0,
          optionalGroupCode: q.optionalGroupCode || null
        }))
      : Array.from({ length: totalQ }, (_, i) => {
          const qNum = (section.startQuestion || 1) + i;
          return {
            questionNo: String(qNum),
            part: '',
            type: 'MCQ',
            marks: parseFloat(marksPerQ),
            optionalGroupCode: null
          };
        });
    
    setEditQuestions(questions);
  };

  // Save section edit
  const handleSaveSectionEdit = async () => {
    if (!editForm.name || !editForm.name.trim()) {
      message.error('Section name is required');
      return;
    }

    try {
      const updateData = {
        batchId: editingBatchId,
        name: editForm.name,
        description: editForm.description || '',
        startQuestion: parseInt(editForm.startQuestion) || 1,
        endQuestion: parseInt(editForm.endQuestion) || 1,
        totalMarks: parseFloat(editForm.totalMarks) || 0,
        maxQuestionsToAttempt: parseInt(editForm.maxQuestionsToAttempt) || 1,
        totalQuestions: new Set(editQuestions.map(q => String(q.questionNo || '').trim()).filter(Boolean)).size || editQuestions.length,
        questions: editQuestions.map(q => ({
          questionNo: q.questionNo,
          type: q.type || 'MCQ',
          marks: parseFloat(q.marks) || 0,
          optionalGroupCode: q.optionalGroupCode || null,
          part: q.part ? String(q.part).trim() : null
        }))
      };

      await sectionService.updateSectionMaster(editingSectionId, updateData);
      message.success('Section updated successfully');
      setEditingSectionId(null);
      setEditForm({});
      setEditQuestions([]);
      refreshTable();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update section');
    }
  };

  // Cancel section edit
  const handleCancelEdit = () => {
    setEditingSectionId(null);
    setEditForm({});
    setEditQuestions([]);
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setEditingBatchId(null);
    setEditingSectionId(null);
    setEditForm({});
    setEditQuestions([]);
    setBatchSections([]);
  };

  return (
    <div className="w-full flex items-start gap-4">
      {/* Main Table Section - Height according to content */}
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all ${previewBatchId ? 'flex-1' : 'w-full'}`}>
        {tableLoading && masters.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-bold text-xs flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span>Fetching Section Masters...</span>
          </div>
        ) : masters.length === 0 ? (
          <div className="p-12 text-center text-gray-500 max-w-md mx-auto space-y-4">
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
            ) : null}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-gray-50/75 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest select-none z-10">
                    <tr>
                      <th className="py-3.5 md:px-6 px-4 flex items-center justify-between gap-2">
                        <span className="cursor-pointer hover:text-gray-600" onClick={() => handleSort('batchId')}>
                          Batch # {sortField === 'batchId' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </span>
                        <ColumnFilter
                          columnKey="batchId"
                          currentFilter={filters.batchId}
                          setFilter={setFilter}
                          placeholder="Filter Batch"
                          options={batchIdOptions}
                        />
                      </th>
                      <th className="py-3.5 text-center md:px-6 px-4">Sections Count</th>
                      <th className="py-3.5 text-center md:px-6 px-4">Total Questions</th>
                      <th className="py-3.5 text-center md:px-6 px-4">Total Marks</th>
                      <th className="py-3.5 text-center md:px-6 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedBatchIds.map((batchId) => {
                      const sections = groupedByBatch[batchId] || [];
                      const totalQuestions = sections.reduce((sum, s) => sum + (s.totalQuestions || (s.endQuestion - s.startQuestion + 1)), 0);
                      const totalMarks = sections.reduce((sum, s) => sum + (s.totalMarks || 0), 0);
                      const isDeleting = deletingId === `batch-${batchId}`;
                      const isPreviewOpen = previewBatchId === batchId;

                      return (
                        <tr
                          key={batchId}
                          className="transition-all duration-200 hover:bg-gray-50/50 group"
                        >
                          <td className="py-3.5 md:px-6 px-4">
                            <span className="inline-flex items-center gap-1 font-extrabold text-teal-800 bg-teal-50 border border-teal-200/60 px-3 py-1.5 rounded-lg text-xs">
                              <Hash size={12} className="text-teal-600" />
                              Batch #{batchId}
                            </span>
                          </td>
                          <td className="py-3.5 text-center md:px-6 px-4">
                            <span className="inline-flex items-center gap-1 font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-lg text-xs">
                              <Layers size={12} className="text-gray-600" />
                              {sections.length}
                            </span>
                          </td>
                          <td className="py-3.5 text-center md:px-6 px-4">
                            <span className="font-bold text-gray-900">
                              {totalQuestions}
                            </span>
                          </td>
                          <td className="py-3.5 text-center md:px-6 px-4">
                            <span className="inline-flex items-center gap-1 font-black text-teal-800 bg-teal-50 border border-teal-100 px-3 py-1 rounded-lg text-xs">
                              <Award size={12} className="text-teal-600" />
                              {totalMarks}
                            </span>
                          </td>
                          <td className="py-3.5 text-center md:px-6 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Preview Button */}
                              <button
                                onClick={() => setPreviewBatchId(previewBatchId === batchId ? null : batchId)}
                                className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                                  previewBatchId === batchId
                                    ? 'text-teal-700 bg-teal-50 ring-1 ring-teal-200'
                                    : 'text-gray-400 hover:text-teal-700 hover:bg-teal-50'
                                }`}
                                title={previewBatchId === batchId ? "Close Preview" : "Preview Batch"}
                              >
                                <Eye size={14} />
                              </button>
                              {/* Edit Button - opens batch sections modal */}
                              {hasPermission('MANAGE_SECTIONS') && (
                                <button
                                  onClick={() => openEditBatchModal(batchId)}
                                  className="p-1.5 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all duration-200 cursor-pointer"
                                  title="Edit Batch"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              {/* Delete Button */}
                              {hasPermission('MANAGE_SECTIONS') && (
                                <button
                                  onClick={() => handleDeleteBatch(batchId)}
                                  disabled={isDeleting}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer"
                                  title="Delete Batch"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div className="border-t border-gray-100">
                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  totalPages={totalPages}
                  setPage={setPage}
                  setPageSize={setPageSize}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create / Edit Batch Modal (Tabbed UI with full validations) ── */}
      {showCreateBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 md:p-6" onClick={(e) => { if (e.target === e.currentTarget) handleCloseBatchModal(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-150">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-teal-200 flex items-center justify-between bg-gradient-to-r from-teal-50 to-teal-100/50 shrink-0">
              <div>
                <h2 className="font-black text-gray-900 text-lg">
                  {modalBatchId > 0 ? `Edit Batch #${modalBatchId} Sections` : 'Create New Batch Sections'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modalBatchId > 0
                    ? `Edit sections for Batch #${modalBatchId}. Changes will be saved as a new batch template, keeping Batch #${modalBatchId} intact.`
                    : 'Define one or more sections for the new batch, then save all at once.'}
                </p>
              </div>
              <button
                onClick={handleCloseBatchModal}
                className="p-1.5 hover:bg-teal-200/50 rounded-full text-gray-500 hover:text-gray-700 transition-all cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">

              {/* Left: Section List */}
              <div className="w-56 border-r border-gray-100 overflow-y-auto p-3 space-y-1.5 shrink-0 bg-gray-50/50">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 pb-1">Sections</p>
                {newBatchSections.map((sec, idx) => (
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
                      {sec.questions?.length > 0 ? (() => {
                        const distinctCount = new Set((sec.questions || []).map(q => String(q.questionNo || '').trim()).filter(Boolean)).size;
                        const partsCount = sec.questions.length;
                        return partsCount > distinctCount ? `${distinctCount} questions (${partsCount} parts)` : `${distinctCount} questions`;
                      })() : 'No questions'}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleAddSectionToBatch}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-xl border border-dashed border-teal-300 transition-all mt-2 cursor-pointer"
                >
                  <Plus size={13} /> Add Section
                </button>
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
                          onChange={e => updateSection(activeSectionIdx, 'name', e.target.value)}
                          placeholder="e.g. Section - A"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">
                          Description
                        </label>
                        <input
                          type="text"
                          value={newBatchSections[activeSectionIdx]?.description || ''}
                          onChange={e => updateSection(activeSectionIdx, 'description', e.target.value)}
                          placeholder="Optional description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Start Q</label>
                        <input
                          type="number"
                          min="1"
                          value={newBatchSections[activeSectionIdx]?.startQuestion ?? ''}
                          onChange={e => updateSection(activeSectionIdx, 'startQuestion', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">End Q</label>
                        <input
                          type="number"
                          min="1"
                          value={newBatchSections[activeSectionIdx]?.endQuestion ?? ''}
                          onChange={e => updateSection(activeSectionIdx, 'endQuestion', e.target.value)}
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
                          onChange={e => updateSection(activeSectionIdx, 'totalMarks', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-1.5 uppercase tracking-wide">Max Attempt</label>
                        <input
                          type="number"
                          min="1"
                          value={newBatchSections[activeSectionIdx]?.maxQuestionsToAttempt ?? ''}
                          onChange={e => updateSection(activeSectionIdx, 'maxQuestionsToAttempt', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    {/* Questions */}
                    <div>
                      {/* Questions Header Row: Label + Universal Question Type Selector + Generate Button */}
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-black text-gray-700 uppercase tracking-wide shrink-0">
                            Questions
                          </label>

                          {/* Universal Question Type Selector: selects question type for ALL questions in this section */}
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
                                onChange={e => applyUniversalType(activeSectionIdx, e.target.value)}
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

                        <button
                          type="button"
                          onClick={() => generateSectionQuestions(activeSectionIdx)}
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
                                        onChange={e => updateSectionQuestion(activeSectionIdx, qIdx, 'questionNo', e.target.value)}
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
                                      onChange={e => updateSectionQuestion(activeSectionIdx, qIdx, 'part', e.target.value)}
                                      className="w-14 px-1.5 py-1 border border-gray-300 rounded text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 text-center bg-white"
                                      placeholder="Part"
                                    />
                                  </td>

                                  {/* Question Type dropdown populated from questiontypes table */}
                                  <td className="py-1.5 px-3">
                                    <select
                                      id={`modal-qtype-${activeSectionIdx}-${qIdx}`}
                                      value={
                                        q.questionTypeId || q.typeId || (
                                          questionTypesList.find(qt => qt.questionTypeName?.toLowerCase() === q.type?.toLowerCase())?.questionTypeId
                                        ) || ""
                                      }
                                      onChange={e => updateSectionQuestion(activeSectionIdx, qIdx, 'typeSelect', e.target.value)}
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
                                      onChange={e => updateSectionQuestion(activeSectionIdx, qIdx, 'marks', e.target.value)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                                    />
                                  </td>

                                  {/* Optional Group Code */}
                                  <td className="py-1.5 px-3">
                                    {(() => {
                                      const code = q.optionalGroupCode?.trim()?.toUpperCase();
                                      const otherInGroup = code ? newBatchSections[activeSectionIdx]?.questions?.find(
                                        (other, oIdx) => oIdx !== qIdx && other.optionalGroupCode?.trim()?.toUpperCase() === code && Math.abs((parseFloat(other.marks) || 0) - (parseFloat(q.marks) || 0)) > 0.001
                                      ) : null;
                                      const hasMismatch = Boolean(otherInGroup);
                                      const oLabel = otherInGroup ? (otherInGroup.part ? `Q${otherInGroup.questionNo} (${otherInGroup.part})` : `Q${otherInGroup.questionNo}`) : '';

                                      return (
                                        <div>
                                          <input
                                            type="text"
                                            value={q.optionalGroupCode || ''}
                                            onChange={e => updateSectionQuestion(activeSectionIdx, qIdx, 'optionalGroupCode', e.target.value)}
                                            placeholder="Group code (optional)"
                                            title={hasMismatch ? `Group '${q.optionalGroupCode}' marks mismatch! ${oLabel} has ${otherInGroup.marks}m. Questions in same group must have identical marks.` : ''}
                                            className={`w-full px-2.5 py-1 border rounded text-xs font-semibold focus:outline-none focus:ring-1 bg-white ${
                                              hasMismatch
                                                ? 'border-amber-400 bg-amber-50/50 text-amber-900 focus:ring-amber-500 ring-1 ring-amber-300'
                                                : 'border-gray-300 text-gray-700 focus:ring-teal-500'
                                            }`}
                                          />
                                          {hasMismatch && (
                                            <div className="text-[9px] text-amber-700 font-bold mt-0.5 leading-tight flex items-center gap-1">
                                              <span>⚠ Must match {oLabel} ({otherInGroup.marks}m)</span>
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
                                        onClick={() => handleAddQuestion(activeSectionIdx, qIdx)}
                                        className="w-6 h-6 flex items-center justify-center rounded bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-all cursor-pointer"
                                      >
                                        <Plus size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        title="Remove this question"
                                        onClick={() => handleRemoveQuestion(activeSectionIdx, qIdx)}
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

                    {/* Remove section button (only if more than 1) */}
                    {newBatchSections.length > 1 && (
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(activeSectionIdx)}
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
                  onClick={handleSaveNewBatch}
                  disabled={newBatchSaving || newBatchSections.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-700 text-white rounded-lg text-sm font-bold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                >
                  {newBatchSaving ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {modalBatchId > 0 ? 'Creating New Batch...' : 'Saving Batch...'}</>
                  ) : (
                    <><Save size={14} /> {modalBatchId > 0 ? 'Save as New Batch' : 'Save Batch'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side Preview Panel */}
      {previewBatchId && (allBatchesMap[previewBatchId] || groupedByBatch[previewBatchId]) && (
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-right-10 duration-300 max-h-[calc(100vh-140px)] sticky top-4">
          {/* Panel Header - Fixed */}
          <div className="bg-gradient-to-r from-teal-50 to-teal-100/50 border-b border-teal-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-black text-gray-900 text-lg">Batch #{previewBatchId}</h3>
              <p className="text-xs text-gray-600 font-bold uppercase tracking-wider mt-1">
                {(allBatchesMap[previewBatchId] || groupedByBatch[previewBatchId] || []).length} Sections
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewBatchId(null)}
                className="p-1.5 hover:bg-teal-200/50 rounded-full text-gray-400 hover:text-gray-600 transition-all duration-200 cursor-pointer"
                title="Close Preview"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Panel Body - Strictly Read-Only */}
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {(allBatchesMap[previewBatchId] || groupedByBatch[previewBatchId] || []).map((section) => {
                const totalQ = section.totalQuestions || (section.endQuestion - section.startQuestion + 1);
                const marksPerQ = totalQ > 0 ? (section.totalMarks / totalQ).toFixed(1) : '-';

                // Get questions from section
                const questionsList = (section.questions && section.questions.length > 0)
                  ? section.questions
                  : Array.from({ length: totalQ }, (_, i) => {
                      const qNum = (section.startQuestion || 1) + i;
                      return {
                        questionNo: String(qNum),
                        type: section.questionType || 'MCQ',
                        marks: parseFloat(marksPerQ),
                        isOptional: false,
                        optionalGroupCode: null
                      };
                    });

                return (
                  <div key={section.id} className="p-5 hover:bg-gray-50/50 transition-colors duration-150">
                    <div className="space-y-3">
                      {/* Section Header Info - Inline beside Section Badge */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200 rounded-lg text-xs font-black text-teal-800 shrink-0">
                            {section.name}
                          </span>
                          {section.description && (
                            <span className="text-xs text-gray-500 font-medium truncate" title={section.description}>
                              {section.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-gray-700 font-bold shrink-0">
                          <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs">
                            Q{section.startQuestion}–Q{section.endQuestion}
                          </span>
                          <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-md text-xs font-black">
                            {section.totalMarks}m
                          </span>
                          <span className="text-gray-500 text-xs font-semibold">
                            Attempt: <strong className="text-gray-800">{section.maxQuestionsToAttempt}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Questions Table - Read Only */}
                      <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                              <th className="py-2.5 px-3.5 font-black text-gray-600 uppercase tracking-wider">Q#</th>
                              <th className="py-2.5 px-3.5 font-black text-gray-600 uppercase tracking-wider">Part</th>
                              <th className="py-2.5 px-3.5 font-black text-gray-600 uppercase tracking-wider">Type</th>
                              <th className="py-2.5 px-3.5 text-center font-black text-gray-600 uppercase tracking-wider">Marks</th>
                              <th className="py-2.5 px-3.5 font-black text-gray-600 uppercase tracking-wider">Optional</th>
                              <th className="py-2.5 px-3.5 font-black text-gray-600 uppercase tracking-wider">Group</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {questionsList.map((q, qIdx) => {
                              const isOptional = q.optionalGroupCode ? true : (totalQ > (section.maxQuestionsToAttempt || totalQ));
                              return (
                                <tr key={qIdx} className="hover:bg-teal-50/30 transition-colors duration-150 text-xs">
                                  <td className="py-2.5 px-3.5 font-bold text-gray-900">
                                    Q{q.questionNo}{q.part ? (q.part.startsWith('(') ? q.part : ` (${q.part})`) : ''}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-xs text-gray-700 font-semibold">
                                    {q.part ? <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200/60">{q.part}</span> : '–'}
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-800 font-semibold text-xs">
                                      {q.type || q.questionType || 'MCQ'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-center font-bold text-teal-700 text-xs">
                                    {q.marks}
                                  </td>
                                  <td className="py-2.5 px-3.5">
                                    {isOptional ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                                        <Check size={10} /> Yes
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">–</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-xs text-gray-600">
                                    {q.optionalGroupCode || '–'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Section Stats */}
                      <div className="flex items-center gap-2 text-xs text-gray-700 font-bold bg-gray-50 px-3 py-2 rounded-lg">
                        <span>Total Q: {totalQ}</span>
                        <span className="text-gray-300">•</span>
                        <span>Avg Mark: {marksPerQ}m</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  setNewBatchSections([]);
                  setModalBatchId(0);
                  setPreviewBatchId(targetId => targetBatchId);
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
    </div>
  );
}
