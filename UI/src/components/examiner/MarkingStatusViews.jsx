import React from "react";
import { Loader, AlertCircle } from "lucide-react";

export const MarkingLoadingView = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
    <Loader className="w-12 h-12 text-teal-700 animate-spin mb-4" />
    <p className="text-gray-600 font-bold animate-pulse">Initializing Marking Interface...</p>
  </div>
);

export const MarkingErrorView = ({ error, onBack }) => (
  <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
    <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
    <p className="text-gray-600 font-bold text-center mb-6">{error}</p>
    <button
      onClick={onBack}
      className="py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors md:px-6 px-4 cursor-pointer"
    >
      Back to Scripts
    </button>
  </div>
);

export const ProctorWarningBanner = ({ proctorWarning }) => {
  if (!proctorWarning) return null;
  return (
    <div className="bg-red-600 text-white text-xs font-bold py-2.5 flex items-center justify-between border-b border-red-700 animate-pulse select-none z-50 shrink-0 md:px-6 px-4">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} />
        <span>
          <strong>PROCTOR ALERT:</strong> {
            proctorWarning === "No Face"
              ? "No face detected in the live camera feed. Please ensure your face is fully visible and looking at the screen."
              : proctorWarning === "Multiple Faces"
              ? "Multiple people detected in frame. Proctoring rules permit only the assigned examiner to mark papers."
              : "Identity verification mismatch. The person in front of the camera does not match the registered profile picture."
          }
        </span>
      </div>
      <span className="text-[10px] bg-red-700/80 px-2 py-0.5 rounded border border-red-500/20 uppercase font-extrabold tracking-wider">Action Required</span>
    </div>
  );
};

export const SecurityOverlays = ({ isBlurred }) => (
  <>
    {isBlurred && (
      <div className="absolute inset-0 bg-gray-900/90 z-[9999] flex flex-col items-center justify-center text-center select-none pointer-events-auto p-4 md:p-6">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 mb-6 shadow-lg animate-pulse">
          <AlertCircle size={44} />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Screen Capture Protection Active</h2>
        <p className="text-gray-400 text-sm max-w-md font-semibold leading-relaxed">
          Screenshots and window switching are strictly restricted. Please refocus your browser window to resume marking.
        </p>
      </div>
    )}

    <div 
      id="secure-screenshot-mask" 
      className="fixed inset-0 bg-gray-950 z-[99999] hidden flex-col items-center justify-center text-center select-none pointer-events-auto p-4 md:p-6"
    >
      <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 mb-6 shadow-lg animate-pulse">
        <AlertCircle size={44} />
      </div>
      <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Screen Capture Prohibited</h2>
      <p className="text-gray-400 text-sm max-w-md font-medium leading-relaxed">
        The PrintScreen key is disabled. Screen captures are strictly prohibited on this secure marking page.
      </p>
    </div>
  </>
);
