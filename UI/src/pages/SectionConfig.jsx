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
  Clock,
  Award,
  Hash,
  ListTodo,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Filter,
  Users,
  Edit
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
  const { userType } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();
  const navigate = useNavigate();

  const handleBackFromPapers = () => {
    navigate(-1);
  };

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

  const [dbQuestionTypes, setDbQuestionTypes] = useState(['MCQ', 'SA', 'LA']);
  const [newTypeName, setNewTypeName] = useState('');
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [isSavingNewType, setIsSavingNewType] = useState(false);

  const fetchQuestionTypes = async () => {
    try {
      const data = await questionTypeService.getAllQuestionTypes();
      if (data && data.length > 0) {
        setDbQuestionTypes(data.map(d => d.questionTypeName));
      }
    } catch (err) {
      console.error("Failed to load question types", err);
    }
  };

  useEffect(() => {
    if (projectId) {
      // Set breadcrumb with full path
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
        { label: 'Subject Configuration', path: configPath, icon: 'Layers' }
      ]);
      fetchQuestionTypes();
    }
  }, [projectId, encryptedProjectId, userType, searchParams]);


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
        // Mock subject for breadcrumbs/display
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
      const data = await sectionService.getAllSections(urlPaperId);
      setSections(data);
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
  };

  const generateQuestions = () => {
    const { startQuestion, endQuestion, totalMarks } = sectionForm;
    const totalQuestions = endQuestion - startQuestion + 1;
    const marksPerQuestion = totalMarks / totalQuestions;

    const generatedQuestions = [];
    for (let i = startQuestion; i <= endQuestion; i++) {
      generatedQuestions.push({
        questionNo: i.toString(),
        marks: parseFloat(marksPerQuestion.toFixed(2)),
        type: '',
        isOptional: false,
        optionalGroupCode: '',
      });
    }
    setQuestions(generatedQuestions);
    setShowQuestionPreview(true);
  };

  const handleAddQuestion = () => {
    let nextNo = "";
    if (questions.length > 0) {
      const lastNoStr = String(questions[questions.length - 1].questionNo);
      const match = lastNoStr.match(/^(\d+)(.*)$/);
      if (match) {
        const num = parseInt(match[1]) + 1;
        nextNo = `${num}${match[2]}`;
      } else {
        nextNo = (questions.length + 1).toString();
      }
    } else {
      nextNo = (sectionForm.startQuestion || 1).toString();
    }

    setQuestions(prev => [
      ...prev,
      {
        questionNo: nextNo,
        marks: prev.length > 0 ? prev[prev.length - 1].marks : 1,
        type: prev.length > 0 ? prev[prev.length - 1].type : '',
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

  const handleEditSection = (section) => {
    setSectionForm({
      name: section.name,
      description: section.description,
      startQuestion: section.startQuestion,
      endQuestion: section.endQuestion,
      totalMarks: section.totalMarks,
      maxQuestionsToAttempt: section.maxQuestionsToAttempt,
    });
    setQuestions(section.questions || []);
    setEditingSectionId(section.id);
    setShowSectionForm(true);
    setShowQuestionPreview(true);
  };

  const handleSaveSection = async () => {
    if (questions.some(q => !q.type)) {
      message.warning('Please select a type for all questions');
      return;
    }

    // Validate if the sum of individual question marks matches the section's total marks
    const maxAttempts = parseInt(sectionForm.maxQuestionsToAttempt) || questions.length;
    const expectedTotalMarks = parseFloat(sectionForm.totalMarks) || 0;

    // Build the pool of available marks that a student can choose from
    const compulsoryMarks = questions.filter(q => !q.isOptional).map(q => parseFloat(q.marks) || 0);
    const independentOptionalMarks = questions.filter(q => q.isOptional && !q.optionalGroupCode).map(q => parseFloat(q.marks) || 0);

    // Group optional questions by group code to respect mutual exclusivity (at most 1 per group code)
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
          // Treat empty/whitespace group code as independent optional
          independentOptionalMarks.push(parseFloat(q.marks) || 0);
        }
      }
    });

    const groupOptionalMarks = Object.values(groupCodeToMarks);

    // Combine all selectable marks under mutual exclusivity rules
    const selectablePool = [...compulsoryMarks, ...independentOptionalMarks, ...groupOptionalMarks];
    // Sort pool in descending order to find the highest achievable marks
    selectablePool.sort((a, b) => b - a);

    // Sum the top 'maxAttempts' marks
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
      const sectionData = {
        ...sectionForm,
        totalQuestions: questions.length,
        paperId: selectedPaper.paperId,
        questions: questions.map(q => ({
          ...q,
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

  const handleDeleteSection = async (sectionId) => {
    if (window.confirm('Are you sure you want to delete this section?')) {
      try {
        setLoading(true);
        await sectionService.deleteSection(sectionId);
        message.success('Section deleted successfully!');
        await fetchSections();
      } catch (err) {
        message.error('Failed to delete section');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const getQuestionTypeColor = (type) => {
    const colors = {
      MCQ: 'bg-blue-100 text-blue-800 border-blue-300',
      SA: 'bg-green-100 text-green-800 border-green-300',
      LA: 'bg-purple-100 text-purple-800 border-purple-300',
      CS: 'bg-orange-100 text-orange-800 border-orange-300',
      NP: 'bg-red-100 text-red-800 border-red-300',
      EXP: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      RC: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      WS: 'bg-pink-100 text-pink-800 border-pink-300',
      LIT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      GV: 'bg-teal-100 text-teal-800 border-teal-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const calculateTotalSectionMarks = () => {
    return sections.reduce((total, section) => total + section.totalMarks, 0);
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

  // Helper component for Stat Cards
  const StatCard = ({ label, value, icon: Icon, colorClass }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  // Helper component for Step Indicator
  const StepIndicator = ({ step, label, active, completed }) => (
    <div className={`flex items-center gap-2 ${active || completed ? 'text-blue-600' : 'text-gray-400'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-xs ${completed ? 'bg-blue-600 border-blue-600 text-white' :
          active ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm' :
            'border-gray-200 bg-gray-50'
        }`}>
        {completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="font-bold">{step}</span>}
      </div>
      <span className={`text-[9px] font-extrabold uppercase tracking-wider ${active ? 'text-blue-600' : ''}`}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Slim Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-md px-5 py-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/10 rounded-xl">
              <Layers className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                Subject Configuration
              </h1>
              <p className="text-blue-100/80 text-[10px] font-medium leading-none mt-0.5">
                Structure and manage examination sections
              </p>
            </div>
          </div>

        </div>

        {/* Step 3: Manage Sections */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
          {/* Header & Stats in a single row */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackFromSections}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-all active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">Section Management</h2>
                  <p className="text-gray-500 text-xs font-medium">{selectedSubject?.subjectName} <ChevronRight className="inline w-3 h-3 mx-1" /> {selectedPaper?.paperName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-grow max-w-2xl">
                <div className="flex-grow grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex items-center gap-3">
                    <Award className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-[10px] text-blue-600 uppercase font-bold tracking-tight">Max</p>
                      <p className="text-sm font-bold text-gray-900">{selectedPaper?.maxMarks}</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-tight">Allocated</p>
                      <p className="text-sm font-bold text-gray-900">{calculateTotalSectionMarks()}</p>
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-2xl border border-red-100 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-[10px] text-red-600 uppercase font-bold tracking-tight">Left</p>
                      <p className="text-sm font-bold text-gray-900">{(selectedPaper?.maxMarks || 0) - calculateTotalSectionMarks()}</p>
                    </div>
                  </div>
                </div>

                {!showSectionForm && (
                  <button
                    onClick={() => {
                      setEditingSectionId(null);
                      setShowSectionForm(true);
                    }}
                    disabled={isAddSectionDisabled()}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shrink-0 ${isAddSectionDisabled()
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95'
                      }`}
                  >
                    <Plus className="w-5 h-5" />
                    Add Section
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section Creation Form - Side by Side */}
          {showSectionForm && (
            <div className="bg-white border border-blue-200 rounded-3xl p-6 shadow-xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Layers className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingSectionId ? 'Edit Section' : 'Create Section'}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSection}
                    disabled={loading}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all disabled:opacity-50 text-sm"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSectionForm(false);
                      setShowQuestionPreview(false);
                      setEditingSectionId(null);
                    }}
                    className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column: Basic Info */}
                <div className="xl:col-span-3 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-tight">Section Details</label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        name="name"
                        value={sectionForm.name}
                        onChange={handleSectionFormChange}
                        className="w-full bg-white text-gray-900 px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="Section Name"
                      />
                      <textarea
                        name="description"
                        value={sectionForm.description}
                        onChange={handleSectionFormChange}
                        className="w-full bg-white text-gray-900 px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none h-24 text-sm"
                        placeholder="Description"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-tight">Structure</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">Start Q#</p>
                        <input
                          type="number"
                          name="startQuestion"
                          value={sectionForm.startQuestion}
                          onChange={handleSectionFormChange}
                          className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">End Q#</p>
                        <input
                          type="number"
                          name="endQuestion"
                          value={sectionForm.endQuestion}
                          onChange={handleSectionFormChange}
                          className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">Marks</p>
                        <input
                          type="number"
                          name="totalMarks"
                          value={sectionForm.totalMarks}
                          onChange={handleSectionFormChange}
                          className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">Attempt</p>
                        <input
                          type="number"
                          name="maxQuestionsToAttempt"
                          value={sectionForm.maxQuestionsToAttempt}
                          onChange={handleSectionFormChange}
                          className="w-full bg-white px-3 py-2 rounded-lg border border-gray-300 text-sm"
                        />
                      </div>
                    </div>
                    {!showQuestionPreview && (
                      <button
                        onClick={generateQuestions}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        Generate Questions
                      </button>
                    )}
                  </div>

                  {showQuestionPreview && (
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                      <label className="block text-blue-800 text-xs font-bold mb-2 uppercase tracking-tight">Bulk Options</label>
                      <div className="space-y-1">
                        <p className="text-[10px] text-blue-600 font-semibold mb-1">Set Type for All Questions:</p>
                        <select
                          value={
                            questions.length > 0 && questions.every(q => q.type && q.type === questions[0].type)
                              ? questions[0].type
                              : ""
                          }
                          onChange={(e) => {
                            const selectedType = e.target.value;
                            if (selectedType) {
                              setQuestions(prev => prev.map(q => ({ ...q, type: selectedType })));
                            }
                          }}
                          className="w-full bg-white px-3 py-2 rounded-lg border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 shadow-sm transition-all"
                        >
                          <option value="">Choose Type...</option>
                          {dbQuestionTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>

                        {showNewTypeInput ? (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              value={newTypeName}
                              onChange={(e) => setNewTypeName(e.target.value)}
                              className="flex-grow bg-white px-2 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold text-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
                              placeholder="Type name (e.g. MCQ)"
                              disabled={isSavingNewType}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!newTypeName.trim()) return;
                                try {
                                  setIsSavingNewType(true);
                                  setError('');
                                  setSuccess('');
                                  await questionTypeService.createQuestionType({ questionTypeName: newTypeName.trim().toUpperCase() });
                                  setSuccess('Question type added successfully');
                                  setNewTypeName('');
                                  setShowNewTypeInput(false);
                                  await fetchQuestionTypes();
                                } catch (err) {
                                  setError(err.message || 'Failed to create question type');
                                  setTimeout(() => setError(''), 4000);
                                } finally {
                                  setIsSavingNewType(false);
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                              disabled={isSavingNewType}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowNewTypeInput(false)}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold"
                              disabled={isSavingNewType}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowNewTypeInput(true)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 mt-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add New Type
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Questions Grid */}
                <div className="xl:col-span-9">
                  {showQuestionPreview ? (
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                      <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-bold text-gray-700 uppercase tracking-tight">Question Configuration</h4>
                          <span className="text-xs font-medium text-gray-500">({questions.length} Questions)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 animate-in fade-in"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Question
                        </button>
                      </div>
                      <div className="overflow-auto flex-grow custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr>
                              <th className="px-4 py-3 text-gray-600 text-[10px] font-bold uppercase tracking-wider">Q No</th>
                              <th className="px-4 py-3 text-gray-600 text-[10px] font-bold uppercase tracking-wider">Marks</th>
                              <th className="px-4 py-3 text-gray-600 text-[10px] font-bold uppercase tracking-wider">Type</th>
                              <th className="px-4 py-3 text-gray-600 text-[10px] font-bold uppercase tracking-wider">Optional</th>
                              <th className="px-4 py-3 text-gray-600 text-[10px] font-bold uppercase tracking-wider">Group</th>
                              <th className="px-4 py-3 text-gray-600 text-[10px] font-bold uppercase tracking-wider text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {questions.map((q, idx) => (
                              <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                <td className="px-4 py-2 text-gray-900 font-bold text-sm">
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-400">#</span>
                                    <input
                                      type="text"
                                      value={q.questionNo}
                                      onChange={(e) => handleQuestionChange(idx, 'questionNo', e.target.value)}
                                      className="w-20 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                      placeholder="No."
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    value={q.marks}
                                    onChange={(e) => handleQuestionChange(idx, 'marks', e.target.value)}
                                    className="w-20 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                    step="0.5"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <select
                                    value={q.type}
                                    onChange={(e) => handleQuestionChange(idx, 'type', e.target.value)}
                                    className={`w-full bg-gray-50 px-2 py-1.5 rounded-lg border text-sm outline-none ${!q.type ? 'border-red-200' : 'border-gray-200 focus:ring-1 focus:ring-blue-500'
                                      }`}
                                  >
                                    <option value="">Type</option>
                                    {dbQuestionTypes.map(type => (
                                      <option key={type} value={type}>{type}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={q.isOptional}
                                    onChange={(e) => handleQuestionChange(idx, 'isOptional', e.target.checked)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={q.optionalGroupCode || ''}
                                    onChange={(e) => handleQuestionChange(idx, 'optionalGroupCode', e.target.value)}
                                    className={`w-16 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200 text-xs ${!q.isOptional && 'opacity-30'}`}
                                    placeholder="Grp"
                                    disabled={!q.isOptional}
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestionRow(idx)}
                                    className="p-1.5 bg-white hover:bg-red-50 text-red-500 hover:text-red-700 border border-gray-200 hover:border-red-200 rounded-lg transition-all"
                                    title="Delete Question"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl min-h-[400px]">
                      <ListTodo className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-gray-500 font-medium text-center px-10">
                        Complete the section details and click <span className="font-bold text-blue-600">Generate Questions</span> to configure individual marks and types.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Existing Sections List (Table Format) */}
          {sections.length > 0 && !showSectionForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4 px-2">
                <Layers className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Configured Sections</h3>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Section</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Questions</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Marks</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Attempt</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Avg Marks</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.map((section) => (
                        <tr key={section.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                {section.name}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-sm">Section {section.name}</span>
                                <span className="text-xs text-gray-500 max-w-[200px] truncate" title={section.description}>
                                  {section.description || 'No description'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-sm">Q{section.startQuestion} - Q{section.endQuestion}</span>
                              <span className="text-xs text-gray-500">{section.questions?.length || 0} questions</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900 text-sm">{section.totalMarks}</td>
                          <td className="px-6 py-4 font-bold text-gray-900 text-sm">{section.maxQuestionsToAttempt}</td>
                          <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                            {(section.totalMarks / (section.endQuestion - section.startQuestion + 1)).toFixed(1)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditSection(section)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Section"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSection(section.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Section"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}

        {sections.length === 0 && !showSectionForm && (
          <div className="h-[400px] flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] shadow-sm">
            <Layers className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No sections configured yet</h3>
            <p className="text-gray-500 mb-6 font-medium">Start by adding a new section to define the paper structure</p>
            <button
              onClick={() => setShowSectionForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
            >
              Create First Section
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}