import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import projectService from '../services/projectService';
import sessionService from '../services/sessionService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import AddProjectModal from '../components/AddProjectModal';
import ColumnFilter from '../components/ColumnFilter';
import { encryptId } from '../utils/encryption';
import {
  ClipboardList,
  Plus,
  Search,
  Edit2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import message from '../services/messageService';
import { useBreadcrumb } from '../context/BreadcrumbContext';

export default function ProjectManagement() {
  const [searchParams] = useSearchParams();
  const { userType, universityId: userUniversityId } = useAuth();
  const universityIdFromUrl = searchParams.get('universityId');
  const activeUniversityId = userType === 'coordinator' ? userUniversityId : universityIdFromUrl;
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    const projectPath = userType === 'admin' ? '/admin/projects' : '/projects';
    setBreadcrumb([
      { label: 'Project Management', path: projectPath, icon: 'ClipboardList' }
    ]);
  }, [userType, setBreadcrumb]);

  // Fetch active sessions for the modal
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await sessionService.getAllSessions({ pageSize: 0 }); // Fetch all
        setSessions(res.items || []);
      } catch (err) {
        console.error("Failed to load sessions", err);
      }
    };
    fetchSessions();
  }, []);

  // Define fetch function for useTable hook
  const fetchFn = useCallback((params) => {
    return projectService.getAllProjects(activeUniversityId, params);
  }, [activeUniversityId]);

  // Centralized hook for table states
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
    loading,
    error,
    setError,
    filters,
    setFilter,
    refresh
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10 }
  });

  useEffect(() => {
    if (error) {
      message.error(error);
      setError('');
    }
  }, [error, setError]);

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
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />;
  };

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    projectName: '',
    sessionId: '',
    isActive: true
  });

  const handleEdit = (project) => {
    setFormData({
      projectName: project.projectName,
      sessionId: project.sessionId,
      isActive: project.isActive
    });
    setEditingId(project.projectId);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ projectName: '', sessionId: '', isActive: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleProjectSubmit = async (data) => {
    try {
      if (editingId) {
        await projectService.updateProject(editingId, data);
      } else {
        await projectService.createProject({ ...data, universityId: activeUniversityId ? parseInt(activeUniversityId, 10) : 1 });
      }
      message.success(editingId ? 'Project updated successfully!' : 'Project created successfully!');
      refresh();
      handleCancel();
    } catch (err) {
      message.error(err.message || 'Error saving project');
    }
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none">
      <div className="w-full space-y-3">
        {/* Unified Dashboard Header & Filters Panel */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>Project Management</span>
              </h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer self-start sm:self-center shrink-0"
            >
              <Plus size={14} />
              <span>{showForm ? 'Cancel' : 'Add Project'}</span>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100">
            {/* Search bar */}
            <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-150">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search projects by name..."
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

            {/* Filter Dropdown */}
            <select
              value={filters.isActive !== undefined ? filters.isActive : ''}
              onChange={(e) => setFilter('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-[10px] text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Projects</option>
              <option value="false">Inactive Projects</option>
            </select>
          </div>
        </div>

        <AddProjectModal
          isOpen={showForm}
          onClose={handleCancel}
          onSubmit={handleProjectSubmit}
          editingId={editingId}
          initialData={formData}
          sessions={sessions}
        />

        {/* Main List Grid */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {loading && projects.length === 0 ? (
            <div className="p-12 text-center text-slate-450 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-650"></div>
              <span>Loading projects...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-16 text-center text-slate-555 leading-relaxed max-w-sm mx-auto space-y-3">
              <ClipboardList className="mx-auto text-slate-400" size={32} />
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">No Projects Configured</h3>
                <p className="text-[10px] text-slate-400 mt-1">Create an evaluation project to map papers.</p>
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
                        Project Name {getSortIcon('projectName')}
                        <ColumnFilter columnKey="projectName" currentFilter={filters.projectName} setFilter={setFilter} placeholder="Filter project name..." />
                      </div>
                    </th>
                    <th
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                      onClick={() => handleSort('sessionName')}
                    >
                      <div className="flex items-center gap-1.5">
                        Session {getSortIcon('sessionName')}
                        <ColumnFilter columnKey="sessionName" currentFilter={filters.sessionName} setFilter={setFilter} placeholder="Filter session name..." />
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
                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 font-extrabold shadow-sm shrink-0 border border-slate-100">
                            <ClipboardList size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 tracking-tight block text-sm">{project.projectName}</span>
                            
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-extrabold text-slate-900 tracking-tight block text-sm">
                          Session: {project.session?.sessionName || 'Unknown Session'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${project.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${project.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                          {project.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(project)}
                            className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl border border-slate-200 hover:border-blue-200 transition-all cursor-pointer shadow-sm group"
                            title="Edit Project"
                          >
                            <Edit2 size={14} className="group-hover:scale-110 transition-transform" />
                          </button>
                          <Link
                            to={userType === 'admin'
                              ? `/admin/papers?projectId=${encryptId(project.projectId)}`
                              : `/papers?projectId=${encryptId(project.projectId)}`}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-blue-150 transition cursor-pointer"
                          >
                            Configure Paper
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

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
}
