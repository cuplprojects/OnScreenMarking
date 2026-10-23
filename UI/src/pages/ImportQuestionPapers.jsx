import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, X, Folder, HelpCircle, FileCheck, Search, Info, Loader, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { decryptId, encryptId } from '../utils/encryption';
import paperService from '../services/paperService';
import projectService from '../services/projectService';
import message from '../services/messageService';

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const detectCatchHint = (filename) => {
  if (!filename) return '—';
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  const cleaned = withoutExt.replace(/^(catch|paper|qp)[_\-\s]*/i, '').trim();
  return cleaned || withoutExt;
};

export default function ImportQuestionPapers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const encryptedProjectId = searchParams.get('projectId');
  const initialProjectId = encryptedProjectId ? (decryptId(encryptedProjectId) || '') : '';

  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const universityId = searchParams.get('universityId');
  const { userType, user } = useAuth();
  const userUniversityId = user?.universityId;
  const activeUniversityId = userType === "coordinator" ? userUniversityId : universityId;
  const { setBreadcrumb } = useBreadcrumb();
  const navigate = useNavigate();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [queueSearch, setQueueSearch] = useState('');

  const totalQueueSize = useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [selectedFiles]);

  const filteredQueue = useMemo(() => {
    if (!queueSearch.trim()) return selectedFiles;
    const term = queueSearch.toLowerCase().trim();
    return selectedFiles.filter(f => f.name.toLowerCase().includes(term));
  }, [selectedFiles, queueSearch]);

  const effectiveEncryptedProjectId = selectedProjectId ? encryptId(selectedProjectId) : '';

  // Load projects for active university without auto-selecting
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const projs = await projectService.getAllProjects(activeUniversityId, { pageSize: 0 });
        const projectsData = projs?.items || projs || [];
        setProjects(projectsData);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [activeUniversityId]);

  useEffect(() => {
    if (encryptedProjectId) {
      const decrypted = decryptId(encryptedProjectId);
      if (decrypted && decrypted !== selectedProjectId) {
        setSelectedProjectId(decrypted);
      }
    } else {
      setSelectedProjectId('');
    }
  }, [encryptedProjectId]);

  const handleProjectChange = (newProjId) => {
    if (!newProjId) {
      setSelectedProjectId('');
      sessionStorage.removeItem('selectedProjectId');
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('projectId');
        return next;
      });
      setUploadResult(null);
      return;
    }

    setSelectedProjectId(newProjId);
    sessionStorage.setItem('selectedProjectId', newProjId);
    const newEncrypted = encryptId(newProjId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('projectId', newEncrypted);
      return next;
    });
    setUploadResult(null);
  };

  useEffect(() => {
    const basePath = userType === 'admin' ? '/admin/papers' : '/papers';
    setBreadcrumb([
      { label: 'Paper Management', path: `${basePath}?projectId=${effectiveEncryptedProjectId || ''}&universityId=${universityId || ''}`, icon: 'FileText' },
      { label: 'Bulk Import Question Papers', path: `/import-question-papers`, icon: 'Upload' }
    ]);
  }, [userType, effectiveEncryptedProjectId, universityId, setBreadcrumb]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
      message.error('Please select valid PDF files');
      return;
    }
    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = files.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
    setUploadResult(null);
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
      message.error('Please drop valid PDF files');
      return;
    }
    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = files.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
    setUploadResult(null);
  };

  const removeFile = (fileToRemove) => {
    setSelectedFiles(prev => prev.filter(f => f !== fileToRemove));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setQueueSearch('');
    setUploadResult(null);
  };

  const handleBulkUpload = async () => {
    if (!selectedProjectId) {
      message.error('Please select a project before uploading');
      return;
    }
    if (selectedFiles.length === 0) {
      message.error('Please select at least one Question Paper PDF file');
      return;
    }
    setIsUploading(true);
    try {
      const res = await paperService.bulkUploadQuestionPapers(selectedProjectId, selectedFiles);
      setUploadResult(res);
      setSelectedFiles([]);
      setQueueSearch('');
      if (res.matchedCount > 0) {
        message.success(`Successfully matched and allocated ${res.matchedCount} Question Paper(s)!`);
      } else {
        message.warning(`Uploaded ${res.totalFiles} files, but no paper Catch Number matches were found.`);
      }
    } catch (err) {
      message.error(err.message || 'Failed to bulk upload question papers');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredResults = uploadResult?.results?.filter(r => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      r.fileName.toLowerCase().includes(term) ||
      (r.paperCode && r.paperCode.toLowerCase().includes(term)) ||
      (r.paperName && r.paperName.toLowerCase().includes(term)) ||
      (r.catchNo && r.catchNo.toLowerCase().includes(term)) ||
      r.status.toLowerCase().includes(term)
    );
  }) || [];

  const backPath = userType === 'admin' ? '/admin/papers' : '/papers';

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none px-4 py-3 lg:px-8 lg:py-4">
      <div className="w-full space-y-4">
        {/* Standard Page Header */}
        <div className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title */}
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Upload className="text-teal-700" size={22} />
                Bulk Import Question Papers (Catch-wise)
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Upload multiple question paper PDFs at once. Filenames will be automatically matched to paper Catch Numbers.
              </p>
            </div>

            {/* Controls: Project Dropdown */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-gray-500 text-xs py-2 px-3 bg-gray-50 rounded-xl border border-gray-200">
                  <Loader size={14} className="animate-spin text-teal-700" />
                  <span className="font-semibold">Loading projects...</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 hover:border-gray-300 focus:border-teal-500 rounded-xl text-xs font-bold text-gray-800 py-2.5 pl-3 pr-8 outline-none appearance-none cursor-pointer shadow-2xs transition-all"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((proj) => (
                      <option key={proj.projectId} value={proj.projectId}>
                        {proj.projectName} (PRJ-{proj.projectId})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* White Background Container with Import Feature & Instructions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
          {/* Sleek Guideline & Match Instructions Banner */}
          <div className="p-4 sm:p-5 bg-teal-50/60 border border-teal-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Info size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-gray-900">How Catch-wise Bulk Upload Works</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100/80 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200/50">
                    Automatic Matching
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Name your PDF files using the corresponding paper's <strong className="text-gray-800">Catch Number</strong> or <strong className="text-gray-800">Paper Code</strong> (for example: <code className="bg-white border border-teal-200 text-teal-800 px-1.5 py-0.5 rounded text-[11px] font-mono">1001.pdf</code>, <code className="bg-white border border-teal-200 text-teal-800 px-1.5 py-0.5 rounded text-[11px] font-mono">CATCH_1001.pdf</code>, or <code className="bg-white border border-teal-200 text-teal-800 px-1.5 py-0.5 rounded text-[11px] font-mono">MATH101.pdf</code>). Select all files together or drop them below to automatically allocate them to papers.
                </p>
              </div>
            </div>
          </div>

          {/* Main Upload Dropzone Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-teal-200 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/50 rounded-xl text-center transition-all cursor-pointer group p-8 md:p-12"
          >
            <input
              type="file"
              multiple
              accept=".pdf"
              id="bulkQpInput"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label htmlFor="bulkQpInput" className="cursor-pointer space-y-3 block">
              <div className="w-14 h-14 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-105 group-hover:bg-teal-700 group-hover:text-white transition-all shadow-xs">
                <Upload size={26} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-gray-800">
                  Click to select Question Paper PDFs or drag & drop files here
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  Supports multiple PDF files named by Catch No (e.g. <span className="font-mono text-gray-700 font-bold">1001.pdf</span>, <span className="font-mono text-gray-700 font-bold">1002.pdf</span>)
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-white border border-teal-200 hover:bg-teal-50 rounded-lg shadow-xs transition-colors">
                  <Folder size={13} />
                  Browse Files
                </span>
              </div>
            </label>
          </div>

          {/* Selected Files Queue */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
              {/* Queue Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-50/40 via-white to-gray-50/30 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-100/80 text-teal-800 flex items-center justify-center font-bold">
                    <FileCheck size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Selected Files Queue
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-700 text-white shadow-2xs">
                        {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        {formatBytes(totalQueueSize)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                      PDF files staged for automatic matching with paper Catch Numbers / Codes
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end md:self-auto">
                  <button
                    onClick={clearAllFiles}
                    disabled={isUploading}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Clear Queue
                  </button>
                  <button
                    onClick={handleBulkUpload}
                    disabled={isUploading}
                    className="bg-teal-700 hover:bg-teal-800 active:scale-[0.98] disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-5 rounded-lg transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader size={14} className="animate-spin" />
                        <span>Uploading {selectedFiles.length} PDFs...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Upload & Auto-Allocate ({selectedFiles.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Search/Filter within Queue (handles 50-300+ files easily) */}
              <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-3 text-xs">
                <div className="relative w-full max-w-sm">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search within ${selectedFiles.length} staged file(s)...`}
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-400 transition-all"
                  />
                  {queueSearch && (
                    <button
                      onClick={() => setQueueSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="text-gray-500 font-medium shrink-0 text-[11px]">
                  Showing <span className="font-bold text-gray-800">{filteredQueue.length}</span> of {selectedFiles.length} file(s)
                </div>
              </div>

              {/* High-density, scalable table view */}
              <div className="max-h-80 overflow-y-auto custom-scrollbar overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100/90 backdrop-blur-xs sticky top-0 z-10 text-[10px] uppercase font-bold text-gray-500 tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="px-3.5 py-2.5 text-center w-12">#</th>
                      <th className="px-4 py-2.5">File Name</th>
                      <th className="px-4 py-2.5">Detected Catch / Code Key</th>
                      <th className="px-4 py-2.5 text-right w-24">Size</th>
                      <th className="px-4 py-2.5 text-center w-28">Status</th>
                      <th className="px-3 py-2.5 text-center w-14">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-700 bg-white">
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-medium">
                          No staged files match &quot;{queueSearch}&quot;.
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map((file, idx) => {
                        const catchHint = detectCatchHint(file.name);
                        return (
                          <tr
                            key={file.name + idx}
                            className="hover:bg-teal-50/40 transition-colors group"
                          >
                            <td className="px-3.5 py-2 text-center text-gray-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-2 font-bold text-gray-900">
                              <div className="flex items-center gap-2 max-w-md sm:max-w-lg md:max-w-xl">
                                <FileText size={15} className="text-teal-700 shrink-0" />
                                <span className="truncate" title={file.name}>
                                  {file.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-teal-900 border border-gray-200">
                                {catchHint}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-[11px] text-gray-500 whitespace-nowrap">
                              {formatBytes(file.size)}
                            </td>
                            <td className="px-4 py-2 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                                <CheckCircle2 size={11} className="text-teal-600" />
                                Ready
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => removeFile(file)}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title={`Remove ${file.name}`}
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Queue Footer Stats */}
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                <span>
                  {selectedFiles.length} file(s) staged &bull; Total batch size: <span className="font-bold text-gray-700">{formatBytes(totalQueueSize)}</span>
                </span>
                <span className="text-gray-400 hidden sm:inline">
                  Tip: Files are matched against paper Catch No or Paper Code
                </span>
              </div>
            </div>
          )}

          {/* Upload Results & Summary Report */}
          {uploadResult && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden space-y-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-700" />
                    Import Summary & Allocation Report
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{uploadResult.message}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-teal-700" />
                    <span>{uploadResult.matchedCount} Allocated</span>
                  </div>
                  {uploadResult.unmatchedCount > 0 && (
                    <div className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-amber-700" />
                      <span>{uploadResult.unmatchedCount} Unmatched</span>
                    </div>
                  )}
                  <button
                    onClick={() => { setSelectedFiles([]); setUploadResult(null); setQueueSearch(''); }}
                    className="px-3 py-1 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    Upload More
                  </button>
                </div>
              </div>

              {/* Results Search Filter */}
              <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-4 bg-white">
                <div className="relative w-full max-w-sm">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter results by filename, catch no, paper code..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white placeholder-gray-400 transition-all"
                  />
                  {searchFilter && (
                    <button onClick={() => setSearchFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <span className="text-xs text-gray-500 font-medium shrink-0">
                  Showing {filteredResults.length} file(s)
                </span>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 border-b border-gray-100">File Name</th>
                      <th className="px-5 py-3.5 text-center border-b border-gray-100">Status</th>
                      <th className="px-5 py-3.5 border-b border-gray-100">Matched Paper Code & Name</th>
                      <th className="px-5 py-3.5 text-center border-b border-gray-100">Catch No</th>
                      <th className="px-5 py-3.5 text-right border-b border-gray-100">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                          No results match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 font-extrabold text-gray-900">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className={r.status === 'Success' ? 'text-teal-700' : 'text-amber-500'} />
                              <span>{r.fileName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            {r.status === 'Success' ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                                Allocated
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                Unmatched
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {r.paperCode ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider">
                                  {r.paperCode}
                                </span>
                                <span className="font-bold text-gray-900">{r.paperName}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No matching paper</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center font-mono font-bold text-gray-700">
                            {r.catchNo || '—'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {r.fileUrl ? (
                              <a
                                href={`${import.meta.env.VITE_API_URL.replace('/api', '')}${r.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                              >
                                <FileText size={12} /> View PDF
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">No PDF Attached</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between border-t border-gray-100 bg-gray-50/30">
                <button
                  onClick={() => navigate(`${backPath}?projectId=${effectiveEncryptedProjectId || ''}&universityId=${universityId || ''}`)}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-5 rounded-lg transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Return to Papers Management
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
