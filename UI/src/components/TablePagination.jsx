import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A beautiful, standardized custom pagination controls element with top/bottom support and automatic Go-To-Page.
 */
export default function TablePagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  setPage,
  setPageSize,
  position = 'bottom',
  className = ''
}) {
  const [goToPage, setGoToPage] = useState('');
  const debounceTimerRef = useRef(null);

  // Sync input value with external page changes
  useEffect(() => {
    setGoToPage('');
  }, [page]);

  if (totalCount === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    if (position === 'bottom') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const executeGoTo = (val) => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(parsed, totalPages));
      handlePageChange(clamped);
      setGoToPage('');
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setGoToPage(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) return;

    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      // If single digit and totalPages < 10, or max digits reached, trigger fast; otherwise 450ms debounce
      const isComplete = parsed * 10 > totalPages;
      debounceTimerRef.current = setTimeout(() => {
        executeGoTo(val);
      }, isComplete ? 250 : 450);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      executeGoTo(goToPage);
    }
  };

  const handleInputBlur = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (goToPage) {
      executeGoTo(goToPage);
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-2.5 bg-gray-50/75 ${
        position === 'top' ? 'border-b border-gray-100 rounded-t-xl' : 'border-t border-gray-100 rounded-b-xl'
      } select-none ${className}`}
    >
      {/* Left: Summary text */}
      <div className="text-xs font-medium text-gray-500">
        Showing <span className="font-bold text-gray-800">{startItem}–{endItem}</span> of{' '}
        <span className="font-bold text-gray-800">{totalCount}</span>
      </div>

      {/* Right: Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 ml-auto">
        {/* Page navigation buttons */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className={`flex items-center gap-1 h-7 px-2.5 border rounded-lg font-semibold text-xs transition cursor-pointer select-none shadow-2xs ${
                page <= 1
                  ? 'bg-gray-100/70 border-gray-200 text-gray-300 cursor-not-allowed opacity-60'
                  : 'bg-white border-gray-200 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/30 text-gray-700 active:scale-95'
              }`}
              title="Previous Page"
            >
              <ChevronLeft size={13} className="shrink-0" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (totalPages > 6) {
                  if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                    if (p === 2 && page > 3) {
                      return (
                        <span key="ellipsis-start" className="w-5 text-center text-gray-400 font-bold text-xs select-none">
                          ...
                        </span>
                      );
                    }
                    if (p === totalPages - 1 && page < totalPages - 2) {
                      return (
                        <span key="ellipsis-end" className="w-5 text-center text-gray-400 font-bold text-xs select-none">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                }

                const isActive = page === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs transition cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-teal-700 border border-teal-700 text-white shadow-sm'
                        : 'bg-white border border-gray-200 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/30 text-gray-700 active:scale-95'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className={`flex items-center gap-1 h-7 px-2.5 border rounded-lg font-semibold text-xs transition cursor-pointer select-none shadow-2xs ${
                page >= totalPages
                  ? 'bg-gray-100/70 border-gray-200 text-gray-300 cursor-not-allowed opacity-60'
                  : 'bg-white border-gray-200 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50/30 text-gray-700 active:scale-95'
              }`}
              title="Next Page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={13} className="shrink-0" />
            </button>
          </div>
        )}

        {/* Go to Page Input Field */}
        {totalPages > 1 && (
          <>
            <div className="h-4 w-px bg-gray-200 mx-0.5 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span className="text-[11px] font-semibold text-gray-500">Go to</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={goToPage}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                placeholder={String(page)}
                className="w-11 h-7 text-center font-bold text-xs text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title={`Enter page number (1 - ${totalPages})`}
              />
              <span className="text-[11px] text-gray-400 font-medium">/ {totalPages}</span>
            </div>
          </>
        )}

        {/* Divider if totalPages > 1 */}
        {totalPages > 1 && <div className="h-4 w-px bg-gray-200 mx-0.5 hidden sm:block" />}

        {/* Page size dropdown */}
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            handlePageChange(1);
          }}
          className="h-7 px-2.5 bg-white border border-gray-200 rounded-lg font-medium text-xs text-gray-700 hover:border-gray-300 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 transition cursor-pointer shadow-2xs"
        >
          {[5, 10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
