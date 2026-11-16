import React from "react";
import { FileText, ChevronLeft } from "lucide-react";

/**
 * Validates and sanitizes the Question Paper PDF URL.
 * Only allows relative paths or origins matching window.location or VITE_API_URL.
 * Rejects javascript:, data:, and untrusted external domains to prevent iframe phishing.
 */
export const sanitizeIframeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Disallow javascript:, data:, vbscript:
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return '';
  }

  // If absolute URL, ensure it is on the same origin or API origin
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const apiEnv = import.meta.env.VITE_API_URL || '';
      const apiOrigin = apiEnv.startsWith('http') ? new URL(apiEnv).origin : appOrigin;

      if (parsed.origin !== appOrigin && parsed.origin !== apiOrigin) {
        console.warn('Blocked untrusted external iframe origin:', parsed.origin);
        return '';
      }
      return trimmed;
    } catch {
      return '';
    }
  }

  // Safe relative path
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  return `${apiBase}/${trimmed.replace(/^\//, '')}`;
};

export const QuestionPaperViewer = ({
  effectiveQpPdfUrl,
  isQpCollapsed,
  qpWidth,
  qpDragRef,
  onCollapse,
  onDragStart
}) => {
  const safeUrl = sanitizeIframeUrl(effectiveQpPdfUrl);
  if (!safeUrl || isQpCollapsed) return null;

  return (
    <>
      <section
        className="shrink-0 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col transition-none"
        style={{ width: qpWidth }}
      >
        <div className="bg-gray-900 text-white px-3 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-teal-400" />
            <h3 className="font-semibold text-xs uppercase tracking-wide">Question Paper</h3>
          </div>
          <button 
            type="button"
            onClick={onCollapse}
            className="p-1 hover:bg-gray-800 text-gray-300 hover:text-white rounded transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            title="Collapse Question Paper"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Collapse</span>
          </button>
        </div>
        <div className="flex-1 bg-gray-100">
          <iframe 
            src={safeUrl}
            className="w-full h-full border-0"
            title="Question Paper"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </section>

      {/* Drag handle to resize QP panel */}
      <div
        ref={qpDragRef}
        onMouseDown={onDragStart}
        className="w-1.5 shrink-0 rounded-full cursor-col-resize bg-gray-200 hover:bg-teal-400 active:bg-teal-500 transition-colors self-stretch relative group"
        title="Drag to resize Question Paper panel"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-1 h-1 rounded-full bg-teal-600" />
          <span className="w-1 h-1 rounded-full bg-teal-600" />
          <span className="w-1 h-1 rounded-full bg-teal-600" />
        </div>
      </div>
    </>
  );
};
export default QuestionPaperViewer;
