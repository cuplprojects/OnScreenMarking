import React from "react";
import { ChevronUp, ChevronDown, FileText, AlertCircle, AlertTriangle } from "lucide-react";
import message from "../../services/messageService";

export const QuestionItem = ({
  question: q,
  section: sec,
  questionMarks,
  selectedQuestion,
  isEffectiveReadOnly,
  attemptedCount,
  getConflictingGroupQuestion,
  onSelectQuestion,
  onGroupSwitch
}) => {
  const m = questionMarks[q.questionId] || {};
  const isSelected = selectedQuestion === q.questionId;
  const isSkipped = m.isSkipped === true;
  const thisQuestionHasMarks = ((Number(m.marksAwarded) > 0) || m.isAttempted) && !isSkipped;
  const hasMarks = Number(m.marksAwarded) > 0 || isSkipped;
  const displayMark = m.marksAwarded !== undefined ? m.marksAwarded : 0;
  const isSectionMaxMet = sec.maxQuestionsToAttempt > 0 && attemptedCount >= sec.maxQuestionsToAttempt && !hasMarks;
  const isCompleted = hasMarks || m.isAttempted || isSkipped;

  // Optional group checks
  const conflictingGroupQ = getConflictingGroupQuestion(q);
  const otherQuestionHasMarks = Boolean(conflictingGroupQ);
  const groupCode = q.optionalGroupCode?.trim();

  // If BOTH this question and another question have marks -> group conflict! Neither is disabled
  const isGroupConflict = thisQuestionHasMarks && otherQuestionHasMarks;
  // A question is ONLY disabled if it has NO marks and another question in the group DOES have marks
  const isGroupDisabled = !thisQuestionHasMarks && otherQuestionHasMarks;

  const handleClick = () => {
    if (isGroupDisabled) {
      if (isEffectiveReadOnly) {
        message.warning(`Question ${q.questionNo} is optional and Question ${conflictingGroupQ.questionNo} in Group '${groupCode}' was attempted.`);
        return;
      }
      onGroupSwitch({
        targetQuestion: q,
        conflictingQuestion: conflictingGroupQ,
        groupCode
      });
      return;
    }
    onSelectQuestion(q);
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative h-11 flex flex-col items-center justify-center rounded transition-all border ${
        isGroupConflict
          ? "bg-amber-100 border-amber-500 text-amber-950 ring-2 ring-amber-400 font-bold z-10 scale-105 shadow-sm cursor-pointer"
          : isGroupDisabled
          ? "bg-gray-100 border-gray-200 text-gray-400 cursor-pointer opacity-60 shadow-none hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800"
          : isSelected 
          ? (hasMarks 
              ? "bg-green-700 text-white border-green-800 ring-2 ring-green-400 font-bold z-10 scale-105 shadow-sm cursor-pointer" 
              : "bg-red-700 text-white border-red-800 ring-2 ring-red-400 font-bold z-10 scale-105 shadow-sm cursor-pointer")
          : (hasMarks
              ? "bg-green-50 border-green-300 text-green-900 hover:bg-green-100 font-semibold cursor-pointer"
              : isSectionMaxMet
              ? "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200 font-normal opacity-75 cursor-pointer"
              : "bg-red-50 border-red-300 text-red-900 hover:bg-red-100 font-semibold cursor-pointer")
      }`}
      title={
        isGroupConflict
          ? `Q${q.questionNo} (Group ${groupCode}): CONFLICT - Both Q${q.questionNo} and Q${conflictingGroupQ.questionNo} have marks. Click to edit or clear marks.`
          : isGroupDisabled
          ? `Q${q.questionNo} (Group ${groupCode}): Locked - Q${conflictingGroupQ.questionNo} has marks. Click to switch to Q${q.questionNo}.`
          : `Q${q.questionNo}${groupCode ? ` (Group ${groupCode})` : ''}: ${
              isSkipped
                ? 'Marked as Skipped'
                : hasMarks
                ? `${displayMark} marks`
                : isSectionMaxMet
                ? `Optional (Section limit ${sec.maxQuestionsToAttempt} reached)`
                : '0 marks'
            } (Click to ${isCompleted ? 'edit/clear marks' : 'award marks'})`
      }
    >
      {groupCode && (
        <span 
          className={`absolute -top-1 -right-1 text-[7.5px] font-extrabold px-1 py-0.2 rounded-full border shadow-xs leading-none z-10 ${
            isGroupConflict
              ? 'bg-amber-400 text-amber-950 border-amber-600'
              : isGroupDisabled
              ? 'bg-gray-200 text-gray-500 border-gray-300'
              : isSelected
              ? 'bg-white text-teal-800 border-teal-300'
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}
          title={`Optional Group ${groupCode}`}
        >
          {groupCode}
        </span>
      )}
      <span className="font-bold text-[11px] leading-tight">{q.questionNo}</span>
      <span className={`text-[8.5px] font-bold leading-tight mt-0.5 ${
        isGroupConflict
          ? 'text-amber-950 font-extrabold'
          : isGroupDisabled 
          ? 'text-gray-400 font-normal' 
          : isSelected 
          ? 'text-white' 
          : (hasMarks ? 'text-green-800' : isSectionMaxMet ? 'text-gray-500' : 'text-red-700')
      }`}>
        {isGroupConflict ? (
          <span className="inline-flex items-center gap-0.5">
            <AlertTriangle size={9} className="text-amber-800 shrink-0" />
            <span>Conf</span>
          </span>
        ) : isGroupDisabled ? 'Lock' : isSkipped ? 'Skip' : isSectionMaxMet ? 'Opt' : `${displayMark}m`}
      </span>
    </div>
  );
};

export const SectionAccordion = ({
  section: sec,
  expandedSections,
  questionMarks,
  selectedQuestion,
  isEffectiveReadOnly,
  getSectionMarks,
  getConflictingGroupQuestion,
  onToggleSection,
  onSelectQuestion,
  onGroupSwitch
}) => {
  const attemptedCount = sec.questions?.filter(q => {
    const marks = questionMarks[q.questionId];
    return (marks?.isAttempted || (marks?.marksAwarded && marks.marksAwarded > 0)) && !marks?.isSkipped;
  }).length || 0;

  const hasGroupConflict = sec.questions?.some(sq => {
    const sm = questionMarks[sq.questionId] || {};
    const hasSm = ((Number(sm.marksAwarded) > 0) || sm.isAttempted) && !sm.isSkipped;
    const cq = getConflictingGroupQuestion(sq);
    return hasSm && cq;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
      <div 
        onClick={() => onToggleSection(sec.id)}
        className="flex justify-between items-center bg-gray-100 px-2.5 py-1.5 border-b border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
      >
        <div className="flex-1">
          <span className="font-bold text-[11px] text-gray-900 uppercase">{sec.name}</span>
          {sec.maxQuestionsToAttempt > 0 ? (
            <p className={`text-[9px] font-semibold leading-none mt-0.5 ${
              attemptedCount >= sec.maxQuestionsToAttempt ? 'text-green-700' : 'text-gray-500'
            }`}>
              Attempts: {attemptedCount}/{sec.maxQuestionsToAttempt}
            </p>
          ) : (
            <p className="text-[9px] text-gray-500 leading-none mt-0.5">
              Attempted: {attemptedCount}/{sec.questions?.length || 0}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
            {getSectionMarks(sec.id)} / {sec.totalMarks}
          </span>
          {expandedSections[sec.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {expandedSections[sec.id] && (
        <div className="bg-white">
          {hasGroupConflict && (
            <div className="bg-amber-50 border-b border-amber-200 p-2 text-[10px] text-amber-800 font-semibold leading-tight flex items-start gap-1.5">
              <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
              <span>Group conflict detected! Multiple questions in an optional group have marks. Click either question to edit or clear marks.</span>
            </div>
          )}

          <div className="p-1.5 grid grid-cols-5 gap-1">
            {sec.questions?.map((q) => (
              <QuestionItem
                key={q.questionId}
                question={q}
                section={sec}
                questionMarks={questionMarks}
                selectedQuestion={selectedQuestion}
                isEffectiveReadOnly={isEffectiveReadOnly}
                attemptedCount={attemptedCount}
                getConflictingGroupQuestion={getConflictingGroupQuestion}
                onSelectQuestion={onSelectQuestion}
                onGroupSwitch={onGroupSwitch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const QuestionPalette = ({
  sections,
  expandedSections,
  questionMarks,
  selectedQuestion,
  isEffectiveReadOnly,
  getSectionMarks,
  getConflictingGroupQuestion,
  onToggleSection,
  onSelectQuestion,
  onGroupSwitch
}) => (
  <div className="bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden shadow-md flex-1 min-h-0">
    <div className="bg-gray-900 text-white px-3 py-2 flex justify-between items-center shrink-0">
      <div className="flex items-center gap-1.5">
        <FileText size={14} className="text-teal-400" />
        <h3 className="font-semibold text-xs uppercase tracking-wide">Questions</h3>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-[10px] font-medium uppercase text-gray-300">Active</span>
      </div>
    </div>
    
    <div className="flex-1 overflow-y-auto p-2 bg-gray-50 space-y-2">
      {sections.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-3">
          <AlertCircle size={30} className="mb-1.5 opacity-30" />
          <p className="text-[11px] font-medium uppercase">No sections loaded</p>
        </div>
      )}

      {sections.map((sec) => (
        <SectionAccordion
          key={sec.id}
          section={sec}
          expandedSections={expandedSections}
          questionMarks={questionMarks}
          selectedQuestion={selectedQuestion}
          isEffectiveReadOnly={isEffectiveReadOnly}
          getSectionMarks={getSectionMarks}
          getConflictingGroupQuestion={getConflictingGroupQuestion}
          onToggleSection={onToggleSection}
          onSelectQuestion={onSelectQuestion}
          onGroupSwitch={onGroupSwitch}
        />
      ))}
    </div>
  </div>
);
export default QuestionPalette;
