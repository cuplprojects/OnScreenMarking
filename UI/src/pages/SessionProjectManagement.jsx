import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Calendar, ClipboardList, Plus, Edit2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';
import { encryptId } from '../utils/encryption';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import AddSessionModal from '../components/AddSessionModal';
import AddProjectModal from '../components/AddProjectModal';
import message from '../services/messageService';
import projectService from '../services/projectService';

export default function SessionProjectManagement() {
  const [searchParams] = useSearchParams();
  const { userType, universityId: userUniversityId } = useAuth();
  const universityIdFromUrl = searchParams.get('universityId');
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityIdFromUrl;
  const { setBreadcrumb } = useBreadcrumb();

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sessionName: '',
    projectName: '',
    isActive: true
  });
  const [sessionLoading, setSessionLoading] = useState(false);
  

  // Define fetch function for useTable to load projects under selected session
  const fetchFn = useCallback(async (params) => {
    if (!selectedSessionId) return { items: [], totalCount: 0 };
    return projectService.getProjectsBySession(selectedSessionId, activeUniversityId, params);
  }, [selectedSessionId, activeUniversityId]);

  // Centralized hook for projects table states
  const {
    items: projects,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loading: projectLoading,
    error,
    setError,
    filters,
    setFilter,
    refresh: refreshProjects
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10 }
  });

  useEffect(() => {
    const sessionPath = userType === 'admin' ? '/admin/sessions' : '/sessions';
    setBreadcrumb([
      { label: 'Sessions & Projects', path: sessionPath, icon: 'Calendar' }
    ]);
    fetchSessions();
  }, [userType]);

  const handleSort = (field) => {
    if (filters.sortField === field) {
      if (filters.sortOrder === 'asc') {
        setFilter('sortOrder', 'desc');
      } else if (filters.sortOrder === 'desc') {
        setFilter('sortField', '');
        setFilter('sortOrder', '');
      }
    } else {
      setFilter('sortField', field);
      setFilter('sortOrder', 'asc');
    }
  };

  const getSortIcon = (field) => {
    if (filters.sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} className="text-indigo-500" /> : <ArrowDown size={12} className="text-indigo-500" />;
  };

  // Trigger projects reload when selected session changes
  useEffect(() => {
    if (selectedSessionId) {
      refreshProjects();
    }
  }, [selectedSessionId, refreshProjects]);

  const fetchSessions = async () => {
    try {
      setSessionLoading(true);
      
      const data = await apiCall('/session');
      setSessions(data || []);
      if (data && data.length > 0) {
        const active = data.find(s => s.isActive) || data[0];
        setSelectedSessionId(active.sessionId);
      }
    } catch (err) {
      setError('Failed to fetch sessions');
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleSessionSubmit = async (data) => {
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/session/${editingId}` : '/session';

      await apiCall(url, {
        method,
        body: JSON.stringify({
          sessionName: data.sessionName,
          isActive: data.isActive
        })
      });

      message.success(editingId ? 'Session updated successfully!' : 'Session created successfully!');
      fetchSessions();
      setFormData({ sessionName: '', projectName: '', isActive: true });
      setEditingId(null);
      setShowSessionForm(false);
      
    } catch (err) {
      setError('Error saving session');
    }
  };

  const handleProjectSubmit = async (data) => {
    if (!selectedSessionId) {
      setError('Please select a session first');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/project/${editingId}` : '/project';

      await apiCall(url, {
        method,
        body: JSON.stringify({
          projectName: data.projectName,
          sessionId: selectedSessionId,
          universityId: activeUniversityId ? parseInt(activeUniversityId, 10) : 1,
          isActive: data.isActive
        })
      });

      message.success(editingId ? 'Project updated successfully!' : 'Project created successfully!');
      refreshProjects();
      setFormData({ sessionName: '', projectName: '', isActive: true });
      setEditingId(null);
      setShowProjectForm(false);
      
    } catch (err) {
      setError('Error saving project');
    }
  };

  const handleEditSession = (session) => {
    setFormData({
      sessionName: session.sessionName,
      projectName: '',
      isActive: session.isActive
    });
    setEditingId(session.sessionId);
    setShowSessionForm(true);
  };

  const handleEditProject = (project) => {
    setFormData({
      sessionName: '',
      projectName: project.projectName,
      isActive: project.isActive
    });
    setEditingId(project.projectId);
    setShowProjectForm(true);
  };

  const handleCancel = () => {
    setFormData({ sessionName: '', projectName: '', isActive: true });
    setEditingId(null);
    setShowSessionForm(false);
    setShowProjectForm(false);
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none">
      <div className="w-full space-y-3">

        {/* Unified Dashboard Header & Filters Panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>Sessions & Projects</span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const current = sessions.find(s => s.sessionId === selectedSessionId);
                  if (current) handleEditSession(current);
                }}
                disabled={!selectedSessionId}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Edit Current Session
              </button>
              <button
                onClick={() => setShowSessionForm(!showSessionForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Add Session</span>
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100 items-center justify-between">
            {/* Active Session Dropdown Selection */}
            <div className="flex items-center gap-2 select-none">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Active Session:</span>
              {sessionLoading ? (
                <span className="text-[10px] text-slate-400 font-bold animate-pulse">Loading terms...</span>
              ) : (
                <select
                  value={selectedSessionId || ""}
                  onChange={(e) => setSelectedSessionId(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl font-bold text-[10px] text-slate-700 focus:outline-none cursor-pointer"
                >
                  {sessions.map(s => (
                    <option key={s.sessionId} value={s.sessionId}>
                      {s.sessionName} {s.isActive ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-md flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-150 w-full">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search projects inside session..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-[11px] focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        
        

        {/* Add / Edit Session Modal */}
        <AddSessionModal
          isOpen={showSessionForm}
          onClose={handleCancel}
          onSubmit={handleSessionSubmit}
          editingId={editingId}
          initialData={formData}
        />

        {/* Projects Section */}
        {selectedSessionId && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1 select-none">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ClipboardList size={16} className="text-indigo-650" />
                <span>Active Projects for {sessions.find(s => s.sessionId === selectedSessionId)?.sessionName}</span>
              </h2>
              <button
                onClick={() => setShowProjectForm(!showProjectForm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-indigo-150 transition cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Project</span>
              </button>
            </div>

            {/* Add / Edit Project Modal */}
            <AddProjectModal
              isOpen={showProjectForm}
              onClose={handleCancel}
              onSubmit={handleProjectSubmit}
              editingId={editingId}
              initialData={formData}
            />

            {/* Main Projects List Grid */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {projectLoading && projects.length === 0 ? (
                <div className="p-12 text-center text-slate-450 font-bold text-xs flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650"></div>
                  <span>Loading exam projects...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-16 text-center text-slate-555 leading-relaxed max-w-sm mx-auto space-y-3">
                  <ClipboardList className="mx-auto text-slate-400" size={32} />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">No Projects Configured</h3>
                    <p className="text-[10px] text-slate-400 mt-1">Add an academic exam project to map evaluation papers.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest select-none">
                        <th 
                          className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                          onClick={() => handleSort('projectName')}
                        >
                          <div className="flex items-center gap-1.5">
                            Project Information {getSortIcon('projectName')}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                          onClick={() => handleSort('isActive')}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            Status {getSortIcon('isActive')}
                          </div>
                        </th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {projects.map((project) => (
                        <tr key={project.projectId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 font-extrabold shadow-sm shrink-0">
                                <ClipboardList size={18} />
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 tracking-tight block">{project.projectName}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                              project.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${project.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                              {project.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditProject(project)}
                                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
                                title="Edit Project"
                              >
                                <Edit2 size={13} />
                              </button>
                              <Link
                                to={userType === 'admin' 
                                  ? `/admin/subject-config?projectId=${encryptId(project.projectId)}`
                                  : `/subject-config?projectId=${encryptId(project.projectId)}`}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-indigo-150 transition cursor-pointer"
                              >
                                Configure Paper
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Standard Centralized Table Pagination */}
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
        )}
      </div>
    </div>
  );
}
