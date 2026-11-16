import React from "react";
import { ChevronLeft, Lock } from "lucide-react";

export const formatCountdown = (totalSec) => {
  if (totalSec <= 0) return "00:00";
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export const MarkingHeader = ({
  paperInfo,
  isMarkingSubmitted,
  remainingSeconds,
  totalObtained,
  saving,
  isSubmitDisabled,
  submitDisabledReason,
  onSubmitMarking,
  onNavigateBack
}) => (
  <header className="bg-white text-gray-900 shadow-md py-1 flex justify-between items-center z-50 border-b border-gray-200 md:px-6 px-4">
    <div className="flex items-center gap-6">
      <button
        onClick={onNavigateBack}
        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        title="Back to Scripts"
      >
        <ChevronLeft className="text-gray-600" size={24} />
      </button>
      
      <div className="border-r border-gray-300 pr-6">
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          OSM <span className="text-teal-700">Marking</span>
        </h1>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Answer Sheet Evaluation</p>
      </div>

      <div className="hidden md:block bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
        <p className="text-[10px] uppercase font-bold text-gray-500">Paper</p>
        <p className="font-semibold text-xs text-gray-900">
          {paperInfo?.paperName || '—'} <span className="text-gray-400">({paperInfo?.paperCode || '—'})</span>
        </p>
      </div>

      <div className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
        <p className="text-[10px] uppercase font-bold text-gray-500">Max Marks</p>
        <p className="font-bold text-sm text-gray-900">
          {paperInfo?.maxMarks ?? '—'}
        </p>
      </div>

      {isMarkingSubmitted && (
        <div className="flex items-center gap-1.5 bg-amber-100 border-2 border-amber-400 text-amber-900 px-3 py-1.5 rounded-lg text-xs font-extrabold shadow-sm">
          <Lock size={14} className="text-amber-700" />
          <span>Submitted (Locked)</span>
        </div>
      )}
    </div>

    <div className="flex items-center gap-3">
      <div className="bg-teal-50 py-1.5 rounded-lg border border-teal-200 flex flex-col items-center md:px-4 px-3">
        <p className="text-[10px] uppercase font-bold text-teal-700">Total Score</p>
        <p className="text-2xl font-bold text-teal-900 leading-none">
          {typeof totalObtained === 'number' ? totalObtained.toFixed(1) : '0.0'}{' '}
          <span className="text-xs font-normal text-teal-700">/ {paperInfo?.maxMarks ?? '—'}</span>
        </p>
      </div>
      
      {!isMarkingSubmitted && (
        <button
          onClick={!isSubmitDisabled ? onSubmitMarking : undefined}
          disabled={isSubmitDisabled}
          className={`py-2 rounded-md font-bold uppercase text-xs transition-colors shadow-md md:px-5 px-4 flex items-center gap-1.5 ${
            isSubmitDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
          }`}
          title={submitDisabledReason || 'Submit evaluation'}
        >
          {saving ? 'Saving...' : remainingSeconds > 0 ? `Submit (${formatCountdown(remainingSeconds)})` : 'Submit'}
        </button>
      )}
    </div>
  </header>
);
export default MarkingHeader;
