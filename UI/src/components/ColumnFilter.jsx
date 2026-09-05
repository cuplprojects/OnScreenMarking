import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Check } from 'lucide-react';

export default function ColumnFilter({ columnKey, currentFilter, setFilter, placeholder = "Search...", options = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(currentFilter || '');
  const wrapperRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync external changes
  useEffect(() => {
    setValue(currentFilter || '');
  }, [currentFilter]);

  const handleApply = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFilter(columnKey, value);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setValue('');
    setFilter(columnKey, '');
    setIsOpen(false);
  };

  const toggleOpen = (e) => {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative inline-block ml-1.5" ref={wrapperRef}>
      <button
        onClick={toggleOpen}
        className={`p-1 rounded transition-colors ${
          currentFilter
            ? 'bg-blue-100 text-blue-600'
            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
        }`}
        title={`Filter by ${columnKey}`}
      >
        <Filter size={12} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden font-sans">
          <form onSubmit={handleApply} className="p-3">
            <div className="mb-2">
              {options ? (
                <select
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-xs font-semibold px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">All</option>
                  {options.map((opt, i) => (
                    <option key={i} value={typeof opt === 'string' ? opt : opt.value}>
                      {typeof opt === 'string' ? opt : opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  autoFocus
                  type="text"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-xs font-semibold px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-2">
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X size={10} /> Clear
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
              >
                <Check size={10} /> Apply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
