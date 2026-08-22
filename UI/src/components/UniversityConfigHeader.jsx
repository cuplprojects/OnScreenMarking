import React, { useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Building2,
  BookOpen,
  Calendar,
  Users,
  School,
  ChevronRight,
  GraduationCap,
  Shield,
  Activity,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';

export default function UniversityConfigHeader() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { userType, universityId: userUniversityId } = useAuth();

  const universityId = userType === 'coordinator' ? userUniversityId : searchParams.get('universityId');
  const [universityName, setUniversityName] = useState('University Management');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (universityId) {
      fetchUniversityDetails();
    }
  }, [universityId]);

  const fetchUniversityDetails = async () => {
    const cachedName = sessionStorage.getItem(`universityName_${universityId}`);
    if (cachedName) {
      setUniversityName(cachedName);
      return;
    }
    
    try {
      setLoading(true);
      const data = await apiCall(`/universities/${universityId}`);
      if (data && data.universityName) {
        setUniversityName(data.universityName);
        sessionStorage.setItem(`universityName_${universityId}`, data.universityName);
      }
    } catch (err) {
      try {
        const unis = await apiCall('/universities');
        const match = unis.find(u => u.universityId === parseInt(universityId, 10));
        if (match) {
          setUniversityName(match.universityName);
          sessionStorage.setItem(`universityName_${universityId}`, match.universityName);
        }
      } catch (innerErr) {
        console.error('Failed to resolve university details:', innerErr);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!universityId) return null;

  // Tabs layout
  const tabs = [
    {
      id: 'departments',
      label: 'Departments',
      icon: <Building2 size={12} />,
      path: userType === 'admin' ? '/admin/departments' : '/departments'
    },
    {
      id: 'courses',
      label: 'Courses',
      icon: <GraduationCap size={12} />,
      path: userType === 'admin' ? '/admin/courses' : '/courses'
    },
    {
      id: 'subjects',
      label: 'Subjects',
      icon: <BookOpen size={12} />,
      path: userType === 'admin' ? '/admin/subjects' : '/subjects'
    },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: <Calendar size={12} />,
      path: userType === 'admin' ? '/admin/sessions' : '/sessions'
    },
    {
      id: 'master-papers',
      label: 'Papers',
      icon: <FileText size={12} />,
      path: userType === 'admin' ? '/admin/master-papers' : '/master-papers'
    }
  ];



  const isCurrentTab = (tabPath) => {
    return location.pathname === tabPath;
  };

  return (
    <div className="bg-white rounded-2xl p-3 border border-slate-150 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3 select-none mb-3">
      {/* Brand & Identity */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0">
          <School size={16} />
        </div>
        <div>
          <h2 className="text-xs font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
            {universityName}
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">(UNIV-{universityId})</span>
          </h2>
        </div>
        {userType === 'admin' && (
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-sm shrink-0 ml-2"
          >
            Back to Dashboard
            <ChevronRight size={10} />
          </Link>
        )}
      </div>

      {/* Modern Compact Tabs */}
      <div className="flex flex-wrap bg-slate-50 p-1 rounded-xl border border-slate-100 gap-0.5 select-none self-start lg:self-center">
        {tabs.map((tab) => {
          const isActive = isCurrentTab(tab.path);
          const targetUrl = `${tab.path}?universityId=${universityId}`;

          return (
            <Link
              key={tab.id}
              to={targetUrl}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${isActive
                  ? 'bg-blue-600 text-white'
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
