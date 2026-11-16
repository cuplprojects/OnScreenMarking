import React from "react";
import { Save, RotateCcw, Type } from "lucide-react";
import { formatCountdown } from "./MarkingHeader";

export const MarkingActions = ({
  isMarkingSubmitted,
  isEffectiveReadOnly,
  remainingSeconds,
  timePerCopyMinutes,
  onSaveMarks
}) => {
  if (isMarkingSubmitted) return null;
  return (
    <div className="flex flex-col gap-2 shrink-0">
      <div className="grid gap-2 grid-cols-2">
        <button 
          onClick={onSaveMarks}
          disabled={isEffectiveReadOnly || remainingSeconds > 0}
          className="flex items-center justify-center gap-1.5 bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 disabled:bg-gray-100 disabled:text-gray-400 font-semibold py-2 rounded-md shadow-sm transition-colors text-xs uppercase disabled:cursor-not-allowed cursor-pointer"
          title={remainingSeconds > 0 ? `Save locked. Spend at least ${timePerCopyMinutes} min on this copy (${formatCountdown(remainingSeconds)} left)` : "Save draft marks"}
        >
          <Save size={15} /> Save {remainingSeconds > 0 ? `(${formatCountdown(remainingSeconds)})` : ''}
        </button>
        <button 
          onClick={() => { if (window.confirm("Reset all marks?")) window.location.reload(); }}
          disabled={isEffectiveReadOnly}
          className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 font-semibold py-2 rounded-md shadow-sm transition-colors text-xs uppercase disabled:cursor-not-allowed cursor-pointer"
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>
    </div>
  );
};

export const RemarksSection = ({ remarks, onOpenRemarksModal }) => (
  <div className="shrink-0">
    <button
      onClick={onOpenRemarksModal}
      className="w-full flex items-center justify-between px-3 py-1.5 bg-white border border-gray-300 hover:border-teal-500 rounded-lg shadow-xs text-xs font-semibold text-gray-700 hover:bg-teal-50 hover:text-teal-900 transition-all cursor-pointer"
      title="Add or edit examiner remarks"
    >
      <div className="flex items-center gap-1.5 truncate">
        <Type size={13} className="text-teal-600 shrink-0" />
        <span className="truncate text-[11px]">{remarks ? `Remarks: "${remarks.slice(0, 16)}..."` : "Add Remarks"}</span>
      </div>
      <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 shrink-0 uppercase font-bold">
        {remarks ? "Edit" : "+"}
      </span>
    </button>
  </div>
);
