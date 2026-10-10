import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Eye, 
  CheckCircle, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  ChevronDown,
  FileText,
  Zap,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';

const Scripts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchFn = useCallback(async (params) => {
    if (!user?.id) {
      return { items: [], totalCount: 0, page: 1, pageSize: 10, totalPages: 1 };
    }
    const searchVal = params.search || '';
    const pageVal = params.page || 1;
    const pageSizeVal = params.pageSize || 10;
    const statusFilterVal = params.statusFilter || 'all';
    const sortFieldVal = params.sortField || '';
    const sortOrderVal = params.sortOrder || '';

    const queryParams = new URLSearchParams();
    queryParams.append('page', pageVal);
    queryParams.append('pageSize', pageSizeVal);
    if (searchVal) queryParams.append('search', searchVal);
    if (sortFieldVal) queryParams.append('sortField', sortFieldVal);
    if (sortOrderVal) queryParams.append('sortOrder', sortOrderVal);
    if (statusFilterVal && statusFilterVal !== 'all') queryParams.append('statusFilter', statusFilterVal);

    const response = await apiCall(`/scripts/examiner/${user.id}?${queryParams.toString()}`);
    
    return {
      items: response.items || [],
      totalCount: response.totalCount || 0,
      page: response.page || 1,
      pageSize: response.pageSize || 10,
      totalPages: response.totalPages || 1
    };
  }, [user]);

  const {
    items: scripts,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loading,
    filters,
    setFilter,
    sortField,
    sortOrder,
    handleSort,
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10, statusFilter: 'all' }
  });

  const handleStartMarking = (script) => {
    const queryParams = new URLSearchParams({
      scriptId: script.id,
      paperId: script.paperId || '',
      barCode: script.generatedBarcode || '',
      allocationId: script.allocationId || '',
      examinerId: user?.id || '',
      cleanPdfUrl: script.cleanPdfUrl || script.answerSheetPdfUrl || '',
      questionPaperPdfUrl: script.questionPaperPdfUrl || ''
    }).toString();

    navigate(`/marking?${queryParams}`, {
      state: {
        scriptId: script.id,
        paperId: script.paperId,
        barCode: script.generatedBarcode,
        allocationId: script.allocationId,
        cleanPdfUrl: script.cleanPdfUrl || script.answerSheetPdfUrl || '',
        questionPaperPdfUrl: script.questionPaperPdfUrl || ''
      }
    });
  };

  const SortHeader = ({ label, field, isCenter = false }) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-5 py-3.5 cursor-pointer hover:bg-gray-100/80 transition-colors select-none group/header ${isCenter ? 'text-center' : ''}`}
      >
        <div className={`flex items-center gap-1.5 ${isCenter ? 'justify-center' : ''}`}>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
          <span className="text-gray-400 group-hover/header:text-gray-655 transition-colors flex items-center">
            {isSorted ? (
              sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
            ) : (
              <ArrowUpDown size={12} className="opacity-40 group-hover/header:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-transparent w-full max-w-none px-4 py-3 lg:px-8 lg:py-4 overflow-hidden flex flex-col">
      <div className="w-full flex-1 flex flex-col gap-4 min-h-0">
      
        {/* Header & Controls */}
        <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">
                My Allocated Scripts
              </h1>
              <p className="text-xs text-gray-500 mt-1">View and mark your assigned answer sheets</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Search Input */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all w-64">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by Barcode, Paper..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-gray-800 placeholder-gray-400 font-semibold text-[11px] focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-gray-300 hover:text-gray-500 transition"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              
              {/* Status Dropdown */}
              <div className="relative">
                <select
                  value={filters.statusFilter || 'all'}
                  onChange={(e) => setFilter('statusFilter', e.target.value)}
                  className="appearance-none flex items-center justify-center gap-1.5 px-4 py-2 pr-8 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="marking">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scripts Data Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden animate-fade-in">
        {loading && scripts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400 font-bold text-xs gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span>Fetching allocated scripts...</span>
          </div>
        ) : scripts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-450 space-y-2">
            <FileText size={38} className="mx-auto text-gray-305 opacity-80" />
            <p className="text-xs font-bold uppercase tracking-wider">No matching scripts found</p>
            <p className="text-[10px] text-gray-400">Try adjusting your search query or status filter</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0 bg-white relative">
            <table className=" block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal w-full text-left min-w-[900px] border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-450 uppercase tracking-widest select-none sticky top-0 z-10 shadow-sm">
                <tr>
                  <SortHeader label="Barcode / Script ID" field="barcode" />
                  <SortHeader label="Subject" field="subjectName" />
                  <SortHeader label="Paper Name" field="paperName" />
                  <SortHeader label="Status" field="status" />
                  <SortHeader label="Marks Obtained" field="totalMarks" />
                  <SortHeader label="Last Activity" field="submittedAt" />
                  <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {scripts.map((script) => (
                  <tr key={script.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3 font-bold text-xs text-gray-900">
                      {script.generatedBarcode || `SCR-${script.id}`}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 font-medium">
                      {script.subjectName || 'General Subject'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-800 font-semibold">
                      {script.paperName}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          script.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : script.status === 'marking'
                            ? 'bg-amber-50 text-amber-705 border-amber-100 animate-pulse'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${
                          script.status === 'completed' ? 'bg-emerald-500' : script.status === 'marking' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></span>
                        {script.status === 'completed' ? 'Completed' : script.status === 'marking' ? 'In Progress' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-black text-xs text-gray-900">
                      {script.totalMarks !== null ? (
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md border border-teal-100">
                          {script.totalMarks} marks
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium text-[10px] uppercase">Not evaluated</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[10px] text-gray-500 font-medium">
                      {new Date(script.submittedAt || script.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {script.status === 'completed' ? (
                        <button
                          onClick={() => handleStartMarking(script)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-sm border border-gray-200"
                        >
                          <Eye size={14} />
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartMarking(script)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs transition-all shadow-sm cursor-pointer"
                        >
                          <Eye size={14} className="fill-white" />
                          Mark
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Standard Pagination Fixed at Bottom */}
        {!loading && scripts.length > 0 && (
          <div className="border-t border-gray-100 bg-white shrink-0">
            <TablePagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              setPage={setPage}
              setPageSize={setPageSize}
            />
          </div>
        )}

      </div>
      </div>
    </div>
  );
};

export default Scripts;
