import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  FileText,
  Zap,
  Briefcase,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { decryptId, encryptId } from '../utils/encryption';
import apiCall from '../services/api';

export default function ProjectConfigHeader() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { userType } = useAuth();

  const encryptedProjectId = searchParams.get('projectId');
  const urlProjectId = encryptedProjectId ? decryptId(encryptedProjectId) : null;
  const projectId = urlProjectId || sessionStorage.getItem('selectedProjectId');

  const [projectName, setProjectName] = useState('Project Management');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      sessionStorage.setItem('selectedProjectId', projectId);
      fetchProjectDetails();
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    const cachedName = sessionStorage.getItem(`projectName_${projectId}`);
    if (cachedName) {
      setProjectName(cachedName);
      return;
    }
    
    try {
      setLoading(true);
      const uniData = await apiCall('/universities/current/my-university');
      const foundProject = (uniData.projects || []).find(p => p.projectId.toString() === projectId.toString());
      if (foundProject) {
        setProjectName(foundProject.projectName);
        sessionStorage.setItem(`projectName_${projectId}`, foundProject.projectName);
      }
    } catch (err) {
      console.error('Failed to resolve project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExitProject = () => {
    sessionStorage.removeItem('selectedProjectId');
    if (userType === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/coordinator/dashboard');
    }
  };

  if (!projectId) return null;

  const encId = encryptId(projectId);

  // Tabs layout
  const tabs = [
    {
      id: 'project-dashboard',
      label: 'Dashboard',
      icon: <Calendar size={12} />,
      path: userType === 'admin' ? '/admin/project-dashboard' : '/project-dashboard'
    },
    {
      id: 'papers',
      label: 'Papers & Sections',
      icon: <FileText size={12} />,
      path: userType === 'admin' ? '/admin/papers' : '/papers'
    },
    {
      id: 'allocations',
      label: 'Script Allocations',
      icon: <Zap size={12} />,
      path: userType === 'admin' ? '/admin/allocate-scripts' : '/allocate-scripts'
    },
    {
      id: 'attendance',
      label: 'Attendance & Logs',
      icon: <Zap size={12} />,
      path: userType === 'admin' ? '/admin/attendance' : '/attendance'
    }
  ];

  const isCurrentTab = (tabPath) => {
    return location.pathname === tabPath;
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 select-none mb-4 z-10 relative border-b border-slate-100 pb-4">
      {/* Brand & Identity */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
          <Briefcase size={16} />
        </div>
        <div>
          <h2 className="text-xs font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
            {projectName}
          </h2>
        </div>
        
        <button
          onClick={handleExitProject}
          className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-sm shrink-0 ml-2"
          title="Close Project & Return to Home"
        >
          <LogOut size={10} className="mr-0.5" />
          Exit Context
        </button>
      </div>

      {/* Modern Compact Tabs */}
      <div className="flex flex-wrap bg-slate-50 p-1 rounded-xl border border-slate-100 gap-0.5 select-none self-start lg:self-center">
        {tabs.map((tab) => {
          const isActive = isCurrentTab(tab.path);
          const targetUrl = `${tab.path}?projectId=${encId}`;

          return (
            <Link
              key={tab.id}
              to={targetUrl}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
