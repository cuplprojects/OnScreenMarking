import React, { useState, useEffect } from "react";
import { Type, X, AlertCircle } from "lucide-react";

export const RemarksModal = ({ isOpen, remarks, onClose, onSave }) => {
  const [localRemarks, setLocalRemarks] = useState(remarks);

  useEffect(() => {
    setLocalRemarks(remarks);
  }, [remarks, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-150 overflow-hidden">
        <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Type size={16} className="text-teal-400" />
            <h3 className="font-bold text-sm uppercase tracking-wide">Examiner Remarks</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-600">Provide overall feedback or observations for this answer script:</p>
          <textarea
            value={localRemarks}
            onChange={(e) => setLocalRemarks(e.target.value)}
            placeholder="Enter feedback or examiner observations..."
            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-medium focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 outline-none transition-all"
            rows="4"
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                onSave(localRemarks);
                onClose();
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Save Remarks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GroupSwitchModal = ({
  modalData,
  questionMarks,
  onConfirmSwitch,
  onClose
}) => {
  if (!modalData) return null;
  const { targetQuestion, conflictingQuestion, groupCode } = modalData;

  const targetLabel = targetQuestion.part
    ? `${targetQuestion.questionNo} (${targetQuestion.part})`
    : targetQuestion.questionNo;
  const conflictingLabel = conflictingQuestion.part
    ? `${conflictingQuestion.questionNo} (${conflictingQuestion.part})`
    : conflictingQuestion.questionNo;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[80] p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full p-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertCircle size={22} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Switch to Question {targetLabel}?</h3>
            <p className="text-xs text-gray-500">Optional Group {groupCode} allows only 1 question to be evaluated</p>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs text-gray-700 mb-4 space-y-1.5">
          <p>
            <strong>Question {conflictingLabel}</strong> currently holds{' '}
            <span className="font-bold text-teal-800">
              {questionMarks[conflictingQuestion.questionId]?.marksAwarded || 0} marks
            </span> in Optional Group {groupCode}.
          </p>
          <p className="text-gray-600">
            To evaluate <strong>Question {targetLabel}</strong> instead, the marks and annotation for Question {conflictingLabel} will be cleared.
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmSwitch(targetQuestion, conflictingQuestion);
              onClose();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Clear Q{conflictingLabel} & Mark Q{targetLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
