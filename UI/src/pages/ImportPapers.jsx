import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  X, 
  Search, 
  Folder, 
  FileText, 
  CheckSquare, 
  Square,
  AlertCircle,
  Loader,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { decryptId, encryptId } from '../utils/encryption';
import apiCall from '../services/api';
import paperService from '../services/paperService';
import message from '../services/messageService';
import ProjectConfigHeader from '../components/ProjectConfigHeader';
import { useTable } from "../services/tableService";
import TablePagination from "../components/TablePagination";
import ColumnFilter from "../components/ColumnFilter";
import { useCallback } from "react";

export default function ImportPapers() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userType } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const encryptedProjectId = searchParams.get("projectId");
  const currentProjectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  const universityId = searchParams.get("universityId");

  const [projects, setProjects] = useState([]);
  const [selectedSourceProject, setSelectedSourceProject] = useState('');
  
  const [allProjectPapers, setAllProjectPapers] = useState([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const importPapersPath = userType === 'admin' ? '/admin/import-papers' : '/import-papers';
    setBreadcrumb([
      { label: 'Paper Management', path: userType === 'admin' ? `/admin/papers?projectId=${encryptedProjectId}&universityId=${universityId}` : `/papers?projectId=${encryptedProjectId}&universityId=${universityId}`, icon: 'FileText' },
      { label: 'Import Papers', path: `${importPapersPath}?projectId=${encryptedProjectId}&universityId=${universityId}`, icon: 'Folder' }
    ]);
  }, [userType, encryptedProjectId, universityId, setBreadcrumb]);

  useEffect(() => {
    if (universityId) {
      fetchProjects();
    }
  }, [universityId]);

  useEffect(() => {
    if (selectedSourceProject) {
      fetchPapersForProject(selectedSourceProject);
    } else {
      setAllProjectPapers([]);
      setSelectedPaperIds([]);
    }
  }, [selectedSourceProject]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      setError(null);
      const uniData = await apiCall(`/universities/${universityId}`);
      const availableProjects = (uniData.projects || []).filter(
        p => p.projectId.toString() !== currentProjectId?.toString()
      );
      setProjects([{ projectId: 'master', projectName: 'Master Subject Papers' }, ...availableProjects]);
    } catch (err) {
      setError("Failed to load projects from this university.");
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchPapersForProject = async (projId) => {
    try {
      setLoadingPapers(true);
      setError(null);
      let papersData = [];
      if (projId === 'master') {
        const res = await paperService.getPapers({ universityId, isMaster: true, pageSize: 0 });
        papersData = res.items || res;
      } else {
        const res = await paperService.getPapers({ projectId: projId, pageSize: 0 });
        papersData = res.items || res;
      }
      setAllProjectPapers(papersData || []);
      setSelectedPaperIds([]);
    } catch (err) {
      setError("Failed to load papers.");
      setAllProjectPapers([]);
    } finally {
      setLoadingPapers(false);
    }
  };

  const fetchFn = useCallback(async (params) => {
    if (!selectedSourceProject) return { items: [], totalCount: 0, page: 1, pageSize: params.pageSize || 10, totalPages: 1 };
    
    let filtered = [...allProjectPapers];

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.paperName?.toLowerCase().includes(q) ||
        p.paperCode?.toLowerCase().includes(q) ||
        p.catchNo?.toLowerCase().includes(q)
      );
    }
    
    if (params.subjectNames && params.subjectNames.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.subjectNames || p.subjectNames.length === 0) return false;
        // Check if ANY of the paper's subjects matches ANY of the selected subjects
        return params.subjectNames.some(selectedSub => 
          p.subjectNames.some(paperSub => paperSub.toLowerCase().includes(selectedSub.toLowerCase()))
        );
      });
    }
    if (params.paperName) {
      const q = params.paperName.toLowerCase();
      filtered = filtered.filter(p => p.paperName?.toLowerCase().includes(q));
    }
    if (params.paperCode) {
       const q = params.paperCode.toLowerCase();
       filtered = filtered.filter(p => p.paperCode?.toLowerCase().includes(q));
    }

    if (params.sortField) {
      filtered.sort((a, b) => {
        let valA = a[params.sortField] || '';
        let valB = b[params.sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return params.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return params.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const totalCount = filtered.length;
    const pageSize = params.pageSize || 10;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const page = params.page || 1;
    
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      totalCount,
      totalPages,
      page,
      pageSize
    };
  }, [selectedSourceProject, allProjectPapers]);

  const {
    items: papers,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search: tableSearch,
    setSearch: setTableSearch,
    sortField,
    sortOrder,
    handleSort,
    filters,
    setFilter,
    loading: tableLoading,
    refresh: refreshTable
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10 }
  });

  useEffect(() => {
    refreshTable();
  }, [allProjectPapers]);

  const handleTogglePaper = (paperId) => {
    setSelectedPaperIds(prev => 
      prev.includes(paperId) 
        ? prev.filter(id => id !== paperId)
        : [...prev, paperId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPaperIds.length === allProjectPapers.length) {
      setSelectedPaperIds([]);
    } else {
      setSelectedPaperIds(allProjectPapers.map(p => p.paperId));
    }
  };

  const handleImport = async () => {
    if (selectedPaperIds.length === 0) return;
    
    try {
      setImporting(true);
      setError(null);
      
      await paperService.importPapers(currentProjectId, selectedPaperIds);
      
      message.success(`Successfully imported ${selectedPaperIds.length} papers!`);
      navigate(-1);
    } catch (err) {
      setError(err.message || "An error occurred while importing papers.");
    } finally {
      setImporting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const SortHeader = ({ label, field, isCenter = false, hasFilter = false }) => {
    const isSorted = sortField === field;
    return (
      <th onClick={() => handleSort(field)} className={`px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none ${isCenter ? 'text-center' : ''}`}>
        <div className={`flex flex-col gap-1`}>
          <div className={`flex items-center gap-1 ${isCenter ? 'justify-center' : ''}`}>
            <span>{label}</span>
            <span className="text-[9px] text-slate-400">{isSorted ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>
          </div>
          {hasFilter && (
            <div onClick={(e) => e.stopPropagation()} className="mt-1">
              <ColumnFilter columnKey={field} currentFilter={filters[field]} setFilter={setFilter} placeholder={`Filter ${label.toLowerCase()}...`} />
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full">
      <div className="bg-white border-b border-slate-200 px-6 lg:px-10 py-6 mb-6 shadow-sm sticky top-0 z-20">
        <ProjectConfigHeader />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-4">
            <button onClick={handleCancel} className="p-2.5 hover:bg-slate-100 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition">
              <ChevronLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2 leading-tight">
                <Folder className="text-blue-600" size={18} /> Import Papers
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-10 max-w-[1600px] mx-auto">
        <div className="bg-white rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col xl:flex-row min-h-[70vh] border border-slate-200 overflow-hidden">
          
          {/* LEFT SIDEBAR - Configuration & Filters */}
          <div className="w-full xl:w-[420px] bg-slate-50/80 border-b xl:border-b-0 xl:border-r border-slate-200 flex flex-col shrink-0 relative">
            <div className="p-8 pb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-600/20">
                <Folder size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Import<br/>Papers.
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-3 leading-relaxed">
                Clone paper structures seamlessly from existing academic setups or other projects.
              </p>
            </div>

            <div className="px-8 flex-1 overflow-y-auto custom-scrollbar pb-8 space-y-8">
              {/* Source Project */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <span className="w-4 h-0.5 bg-slate-300 rounded-full"></span> Source Project
                </label>
                {loadingProjects ? (
                  <div className="flex items-center gap-3 text-slate-500 text-sm p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <Loader size={18} className="animate-spin text-blue-600" />
                    <span className="font-semibold">Loading projects...</span>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 text-sm font-semibold">
                    No other projects found.
                  </div>
                ) : (
                  <div className="relative group">
                    <select
                      value={selectedSourceProject}
                      onChange={(e) => setSelectedSourceProject(e.target.value)}
                      className="w-full p-4 pl-5 pr-10 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-2xl text-sm font-bold text-slate-800 shadow-sm transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="" disabled>-- Select a project --</option>
                      {projects.map((proj) => (
                        <option key={proj.projectId} value={proj.projectId}>
                          {proj.projectName} {proj.projectId !== 'master' && `(PRJ-${proj.projectId})`}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                )}
              </div>

              {selectedSourceProject && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  {/* Search */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                      <span className="w-4 h-0.5 bg-slate-300 rounded-full"></span> Search Papers
                    </label>
                    <div className="relative group">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Type name, code or catch no..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none shadow-sm transition-all"
                      />
                    </div>
                  </div>
                  {/* Subject Filters */}
                  {(() => {
                    const availableSubjects = [...new Set(allProjectPapers.flatMap(p => p.subjectNames || []))].filter(Boolean);
                    if (availableSubjects.length === 0) return null;
                    
                    const selectedSubjects = filters.subjectNames || [];
                    
                    const toggleSubject = (sub) => {
                      let newSubjects = [...selectedSubjects];
                      if (newSubjects.includes(sub)) {
                        newSubjects = newSubjects.filter(s => s !== sub);
                      } else {
                        newSubjects.push(sub);
                      }
                      setFilter('subjectNames', newSubjects.length > 0 ? newSubjects : null);
                    };

                    return (
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                            <span className="w-4 h-0.5 bg-slate-300 rounded-full"></span> Filter Subjects
                          </label>
                          {selectedSubjects.length > 0 && (
                            <button 
                              onClick={() => setFilter('subjectNames', null)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setFilter('subjectNames', null)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                              selectedSubjects.length === 0
                                ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:shadow-sm'
                            }`}
                          >
                            All
                          </button>
                          {availableSubjects.map(sub => (
                            <button
                              key={sub}
                              onClick={() => toggleSubject(sub)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                                selectedSubjects.includes(sub)
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:shadow-sm'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT MAIN CONTENT - Papers Selection */}
          <div className="flex-1 flex flex-col bg-white relative">
            {!selectedSourceProject ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 min-h-[400px]">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <FileText size={40} className="text-slate-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">No Project Selected</h3>
                <p className="text-sm text-center max-w-sm font-medium leading-relaxed">
                  Choose a source project from the left panel to view and import its papers.
                </p>
              </div>
            ) : tableLoading && allProjectPapers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 min-h-[400px]">
                <Loader size={40} className="animate-spin text-blue-500 mb-4" strokeWidth={2} />
                <p className="text-sm font-bold uppercase tracking-wider">Loading papers...</p>
              </div>
            ) : allProjectPapers.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 min-h-[400px]">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <FileText size={40} className="text-slate-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Project is Empty</h3>
                <p className="text-sm text-center max-w-sm font-medium leading-relaxed">
                  This project doesn't have any configured papers yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-[70vh] xl:h-auto xl:flex-1">
                {/* Top Action Bar */}
                <div className="px-6 sm:px-10 pt-10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                      Available Papers
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                        {totalCount} Total
                      </span>
                    </h3>
                  </div>
                  
                  <button 
                    onClick={handleSelectAll}
                    className="group flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white border border-slate-200 hover:border-blue-200 px-5 py-2.5 rounded-xl shadow-sm"
                  >
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      {selectedPaperIds.length === allProjectPapers.length && allProjectPapers.length > 0 ? (
                        <CheckSquare size={18} className="text-blue-600 absolute transition-all scale-100 opacity-100" />
                      ) : (
                        <>
                          <Square size={18} className="text-slate-300 absolute transition-all scale-100 opacity-100 group-hover:opacity-0" />
                          <CheckSquare size={18} className="text-blue-400 absolute transition-all scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100" />
                        </>
                      )}
                    </div>
                    {selectedPaperIds.length === allProjectPapers.length && allProjectPapers.length > 0 ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {error && (
                  <div className="mx-6 sm:mx-10 mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-center gap-3 animate-in fade-in">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                  </div>
                )}
                
                {/* Papers Grid Area */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 pt-6 custom-scrollbar bg-slate-50/30 min-h-[300px] relative">
                  {tableLoading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                      <Loader size={32} className="animate-spin text-blue-600" />
                    </div>
                  )}
                  {papers.length === 0 ? (
                    <div className="p-12 text-center text-sm font-bold text-slate-400 bg-white rounded-2xl border border-slate-200 border-dashed">
                      No papers match your current search and filters.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm pb-1">
                      <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-wider align-top">
                          <tr>
                            <th className="px-5 py-4 w-12 text-center"></th>
                            <SortHeader label="Paper Details" field="paperName" hasFilter={true} />
                            <SortHeader label="Paper Code" field="paperCode" hasFilter={true} />
                            <SortHeader label="Subjects" field="subjectNames" />
                            <SortHeader label="Max Marks" field="maxMarks" />
                            <th className="px-5 py-4 text-right">Sections</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {papers.map(paper => {
                            const isSelected = selectedPaperIds.includes(paper.paperId);
                            return (
                              <tr 
                                key={paper.paperId}
                                onClick={() => handleTogglePaper(paper.paperId)}
                                className={`cursor-pointer transition-colors group ${
                                  isSelected ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <td className="px-5 py-3 w-12 text-center">
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center mx-auto transition-colors ${isSelected ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 border border-slate-200'}`}>
                                    {isSelected ? <CheckSquare size={14} strokeWidth={3} /> : <Square size={14} />}
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <div className={`font-bold transition-colors ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                    {paper.paperName}
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="font-mono bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-md text-[11px] uppercase tracking-wider">
                                    {paper.paperCode}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="text-slate-600 font-bold text-xs">
                                    {paper.subjectNames?.join(', ') || '—'}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right font-bold text-slate-700">
                                  {paper.maxMarks}
                                </td>
                                <td className="px-5 py-3 text-right font-bold text-slate-700">
                                  {paper.sections?.length || 0}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {papers.length > 0 && (
                    <div className="mt-4">
                      <TablePagination 
                        page={page} 
                        totalPages={totalPages} 
                        pageSize={pageSize} 
                        setPage={setPage} 
                        setPageSize={setPageSize} 
                        totalCount={totalCount} 
                      />
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="p-6 px-6 sm:px-10 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-black text-lg">
                      {selectedPaperIds.length}
                    </span>
                    <span className="text-sm font-bold text-slate-600">papers selected</span>
                  </div>
                  
                  <div className="flex items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleCancel}
                      className="flex-1 sm:flex-none px-6 py-4 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-colors text-center"
                      disabled={importing}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing || selectedPaperIds.length === 0}
                      className={`flex-1 sm:flex-none relative overflow-hidden flex items-center justify-center gap-2 px-8 py-4 text-sm font-black text-white rounded-2xl transition-all shadow-lg ${
                        importing || selectedPaperIds.length === 0
                          ? 'bg-slate-300 cursor-not-allowed shadow-none text-slate-500'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0'
                      }`}
                    >
                      {importing ? (
                        <Loader size={18} className="animate-spin" strokeWidth={3} />
                      ) : (
                        <Folder size={18} strokeWidth={2.5} />
                      )}
                      {importing ? 'IMPORTING...' : 'IMPORT PAPERS'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
