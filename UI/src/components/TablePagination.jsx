import React from 'react';

/**
 * A beautiful, standardized custom pagination controls element.
 */
export default function TablePagination({ page, totalPages, totalCount, pageSize, setPage, setPageSize }) {
  if (totalCount === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-100 select-none">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        Showing <span className="text-slate-900 font-extrabold">{startItem}</span> to <span className="text-slate-900 font-extrabold">{endItem}</span> of <span className="text-slate-900 font-extrabold">{totalCount}</span> entries
      </div>
      
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            handlePageChange(1);
          }}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-[11px] text-slate-700 uppercase focus:outline-none focus:border-blue-600 transition cursor-pointer"
        >
          {[5, 10, 25, 50].map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(Math.max(page - 1, 1))}
              disabled={page === 1}
              className={`px-3 py-1.5 border rounded-xl font-extrabold text-[11px] uppercase transition cursor-pointer select-none ${
                page === 1
                  ? 'bg-slate-50 border-slate-150 text-slate-350 cursor-not-allowed'
                  : 'bg-white border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700'
              }`}
            >
              Prev
            </button>
            
            <div className="flex items-center gap-0.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (totalPages > 6) {
                  if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                    if (p === 2 && page > 3) {
                      return <span key="ellipsis-start" className="px-1.5 text-slate-400 font-bold text-[10px]">...</span>;
                    }
                    if (p === totalPages - 1 && page < totalPages - 2) {
                      return <span key="ellipsis-end" className="px-1.5 text-slate-400 font-bold text-[10px]">...</span>;
                    }
                    return null;
                  }
                }

                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-xl font-black text-[11px] transition cursor-pointer ${
                      page === p
                        ? 'bg-blue-600 border border-blue-600 text-white'
                        : 'bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(Math.min(page + 1, totalPages))}
              disabled={page === totalPages}
              className={`px-3 py-1.5 border rounded-xl font-extrabold text-[11px] uppercase transition cursor-pointer select-none ${
                page === totalPages
                  ? 'bg-slate-50 border-slate-150 text-slate-350 cursor-not-allowed'
                  : 'bg-white border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700'
              }`}
            >
                Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
