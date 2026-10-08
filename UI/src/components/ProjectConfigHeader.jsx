import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  FileText,
  Zap,
  Briefcase,
  ChevronDown,
  LogOut,
  Search,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { decryptId, encryptId } from '../utils/encryption';
import apiCall from '../services/api';

export default function ProjectConfigHeader({ completePercentage = 0, title, titleIcon, titleBadge, subtitle }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { userType, universityId: userUniversityId } = useAuth();

  const encryptedProjectId = searchParams.get('projectId');
  const projectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;

  const [projectName, setProjectName] = useState('Project Management');
  const [loading, setLoading] = useState(false);
  const [currentUniversityId, setCurrentUniversityId] = useState(userType === 'coordinator' ? userUniversityId : searchParams.get('universityId'));

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (projectId) {
      sessionStorage.setItem('selectedProjectId', projectId);
      fetchProjectDetails();
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const projectData = await apiCall(`/project/${projectId}`);
      if (projectData) {
        setProjectName(projectData.projectName);
        sessionStorage.setItem(`projectName_${projectId}`, projectData.projectName);
        
        if (!currentUniversityId && projectData.universityId) {
            setCurrentUniversityId(projectData.universityId);
        }
      }
    } catch (err) {
      console.error('Failed to resolve project details:', err);
      // Fallback to cache if exists
      const cachedName = sessionStorage.getItem(`projectName_${projectId}`);
      if (cachedName) setProjectName(cachedName);
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // reset pagination on search
    }, 1000);
    return () => clearTimeout(debounceTimerRef.current);
  }, [searchQuery]);

  // Fetch projects list
  useEffect(() => {
    if (!dropdownOpen || !currentUniversityId) return;

    const fetchProjectsList = async () => {
      try {
        setLoadingProjects(true);
        const res = await apiCall(`/project?universityId=${currentUniversityId}&isActive=true&page=${page}&pageSize=10&search=${debouncedQuery}`);
        
        if (page === 1) {
          setProjects(res.items || []);
        } else {
          setProjects(prev => [...prev, ...(res.items || [])]);
        }
        
        setHasMore(page < res.totalPages);
      } catch (err) {
        console.error('Failed to fetch projects list', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    
    fetchProjectsList();
  }, [debouncedQuery, page, dropdownOpen, currentUniversityId]);

  // We don't return null here anymore, we render the dropdown with a "Select Project" state

  const encId = projectId ? encryptId(projectId) : '';

  // Tabs layout
  const tabs = [
    {
      id: 'project-dashboard',
      label: 'Dashboard',
      icon: <Calendar size={12} />,
    },
    {
      id: 'papers',
      label: 'Papers & Sections',
      icon: <FileText size={12} />,
    },
    {
      id: 'allocations',
      label: 'Script Allocations',
      icon: <Zap size={12} />,
    },
    {
      id: 'attendance',
      label: 'Attendance & Logs',
      icon: <Zap size={12} />,
    }
  ];

  const currentTab = searchParams.get('tab') || 'project-dashboard';
  const isCurrentTab = (tabId) => currentTab === tabId;

  const handleProjectSelect = (p) => {
    setDropdownOpen(false);
    sessionStorage.setItem('selectedProjectId', p.projectId);
    sessionStorage.setItem(`projectName_${p.projectId}`, p.projectName);
    
    // Maintain current page context if possible
    let basePath = location.pathname;
    
    // Add missing params (universityId) if available
    let qs = `?projectId=${encryptId(p.projectId)}`;
    if (currentUniversityId && userType === 'admin') {
      qs += `&universityId=${currentUniversityId}`;
    }
    qs += `&tab=${currentTab}`;
    
    navigate(basePath + qs);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 select-none z-10 relative">
      {/* Brand & Identity */}
      <div className="flex flex-wrap items-center gap-4 relative" ref={dropdownRef}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
            <Briefcase size={18} />
          </div>
          <div className="flex flex-col justify-center">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 text-left group outline-none"
          >
            <h2 className="text-sm font-black text-gray-900 tracking-tight leading-tight group-hover:text-teal-700 transition-colors">
              {projectId ? projectName : 'Select a Project...'}
            </h2>
            <ChevronDown size={14} className={`text-gray-400 group-hover:text-teal-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          
          {projectId && completePercentage !== undefined && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-600 rounded-full"
                  style={{ width: `${completePercentage}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-bold text-gray-500">{completePercentage}% Complete</span>
            </div>
          )}
          </div>
        </div>

        {title && (
          <>
            <div className="hidden sm:block w-px h-8 bg-gray-200 mx-2"></div>
            <div className="flex flex-col">
              {titleBadge && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-teal-50 text-teal-700 border border-teal-100 text-[8px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider leading-none">
                    {titleBadge}
                  </span>
                </div>
              )}
              <h1 className="text-lg font-black text-gray-900 flex items-center gap-2 leading-tight">
                {titleIcon && <span className="text-teal-700">{titleIcon}</span>}
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </>
        )}

        {/* Project Dropdown Modal */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search active projects..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
              {loadingProjects && page === 1 ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <Loader2 className="animate-spin mb-2" size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Loading projects...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <Briefcase className="mx-auto mb-2 opacity-50" size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">No projects found</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {projects.map((p) => (
                    <button
                      key={p.projectId}
                      onClick={() => handleProjectSelect(p)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 ${
                        (projectId && p.projectId.toString() === projectId.toString())
                          ? 'bg-teal-50 text-teal-900 border border-teal-100'
                          : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        (projectId && p.projectId.toString() === projectId.toString()) ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Briefcase size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate leading-tight">{p.projectName}</p>
                        <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">ID: {p.projectId}</p>
                      </div>
                    </button>
                  ))}
                  
                  {hasMore && (
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={loadingProjects}
                      className="w-full mt-2 py-2 text-[10px] font-extrabold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {loadingProjects ? <><Loader2 size={12} className="animate-spin" /> Loading...</> : 'Load More'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modern Compact Tabs - ONLY show if a project is selected */}
      {projectId && (
        <div className="flex flex-wrap bg-gray-50 p-1 rounded-xl border border-gray-100 gap-0.5 select-none self-start lg:self-center">
          {tabs.map((tab) => {
            const isActive = isCurrentTab(tab.id);
            const handleTabClick = () => {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('tab', tab.id);
              const basePath = userType === 'admin' ? '/admin/project-dashboard' : '/project-dashboard';
              navigate(`${basePath}?${newParams.toString()}`);
            };

            return (
              <button
                key={tab.id}
                onClick={handleTabClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${isActive
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-950 hover:bg-gray-100'
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
