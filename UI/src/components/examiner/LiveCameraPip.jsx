import React from "react";
import { AlertTriangle } from "lucide-react";

export const LiveCameraPip = ({ videoRef, proctorWarning }) => (
  <div className={`fixed bottom-6 left-6 z-40 bg-gray-900 border-2 ${proctorWarning ? 'border-red-600 animate-pulse scale-105 shadow-red-500/40' : 'border-teal-500 shadow-teal-500/10'} rounded-xl overflow-hidden shadow-2xl w-44 h-32 flex flex-col group hover:scale-105 transition-all`}>
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted 
      className="w-full h-full object-cover bg-gray-800"
      style={{ transform: 'scaleX(-1)' }}
    />
    <div className={`absolute top-2 left-2 ${proctorWarning ? 'bg-red-600/90' : 'bg-teal-700/90'} text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm`}>
      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
      {proctorWarning ? "PROCTOR ALERT" : "PROCTOR ACTIVE"}
    </div>
    
    {proctorWarning && (
      <div className="absolute inset-0 bg-red-950/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center select-none animate-fade-in z-20">
        <AlertTriangle size={20} className="text-red-300" />
        <h4 className="font-extrabold text-red-200 text-[10px] leading-tight mt-1 uppercase tracking-wider">
          {proctorWarning === "No Face" 
            ? "No Face" 
            : proctorWarning === "Multiple Faces"
            ? "Multiple People!"
            : "Mismatch!"}
        </h4>
        <p className="text-[8px] text-red-300 mt-0.5 leading-tight">
          {proctorWarning === "No Face"
            ? "Please look at camera feed."
            : proctorWarning === "Multiple Faces"
            ? "Only one person permitted."
            : "Identity does not match."}
        </p>
      </div>
    )}
  </div>
);
export default LiveCameraPip;
