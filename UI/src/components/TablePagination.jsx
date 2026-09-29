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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-2.5 bg-gray-50 border-t border-gray-100 select-none">
      <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
        Showing <span className="text-gray-900 font-bold">{startItem}</span>-<span className="text-gray-900 font-bold">{endItem}</span> of <span className="text-gray-900 font-bold">{totalCount}</span>
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        {totalPages > 1 && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => handlePageChange(Math.max(page - 1, 1))}
              disabled={page === 1}
              className={`px-2 py-1 border rounded-lg font-bold text-[9px] uppercase transition cursor-pointer select-none ${
                page === 1
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-white border-gray-200 hover:border-teal-500 hover:text-teal-600 text-gray-600'
              }`}
            >
              Prev
            </button>
            
            <div className="flex items-center gap-0.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                if (totalPages > 6) {
                  if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                    if (p === 2 && page > 3) {
                      return <span key="ellipsis-start" className="px-1 text-gray-300 font-bold text-[9px]">…</span>;
                    }
                    if (p === totalPages - 1 && page < totalPages - 2) {
                      return <span key="ellipsis-end" className="px-1 text-gray-300 font-bold text-[9px]">…</span>;
                    }
                    return null;
                  }
                }

                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-6 h-6 flex items-center justify-center rounded-lg font-bold text-[9px] transition cursor-pointer ${
                      page === p
                        ? 'bg-teal-700 border border-teal-600 text-white'
                        : 'bg-white border border-gray-200 hover:border-teal-400 hover:text-teal-600 text-gray-600'
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
              className={`px-2 py-1 border rounded-lg font-bold text-[9px] uppercase transition cursor-pointer select-none ${
                page === totalPages
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                  : 'bg-white border-gray-200 hover:border-teal-500 hover:text-teal-600 text-gray-600'
              }`}
            >
              Next
            </button>
          </div>
        )}

        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            handlePageChange(1);
          }}
          className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-bold text-[9px] text-gray-700 uppercase focus:outline-none focus:border-teal-600 transition cursor-pointer"
        >
          {[5, 10, 25, 50].map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

