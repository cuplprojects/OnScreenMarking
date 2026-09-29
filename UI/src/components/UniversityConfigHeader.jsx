import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2, BookOpen, Calendar, School,
  GraduationCap, FileText, ChevronDown, Loader2, Plus, Search, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfigHeader } from '../context/ConfigHeaderContext';
import apiCall from '../services/api';
import universityService from '../services/universityService';

/** Map pathname → section id */
const SECTION_MAP = {
  '/admin/departments': 'departments',
  '/departments':       'departments',
  '/admin/courses':     'courses',
  '/courses':           'courses',
  '/admin/subjects':    'subjects',
  '/subjects':          'subjects',
  '/admin/sessions':    'sessions',
  '/sessions':          'sessions',
  '/admin/master-papers': 'master-papers',
  '/master-papers':       'master-papers',
  '/admin/papers':      'master-papers',
  '/papers':            'master-papers',
};

const SECTIONS = [
  { id: 'departments',   label: 'Departments', icon: Building2 },
  { id: 'courses',       label: 'Courses',     icon: GraduationCap },
  { id: 'subjects',      label: 'Subjects',    icon: BookOpen },
  { id: 'sessions',      label: 'Sessions',    icon: Calendar },
  { id: 'master-papers', label: 'Papers',      icon: FileText },
];

export default function UniversityConfigHeader() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { userType, universityId: userUniversityId } = useAuth();
  const { headerExtras } = useConfigHeader();

  // Coordinators have a fixed university; admins use the URL param
  const urlUniversityId =
    userType === 'coordinator'
      ? String(userUniversityId)
      : searchParams.get('universityId') || '';

  // ── University dropdown state ──────────────────────────────────────────
  const [universities, setUniversities]   = useState([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedId, setSelectedId]       = useState(urlUniversityId);
  const [loadingUnis, setLoadingUnis]     = useState(false);
  const [uniOpen, setUniOpen]             = useState(false);
  const [hasMore, setHasMore]             = useState(false);
  const [skip, setSkip]                   = useState(0);
  const debounceTimerRef                  = useRef(null);
  const uniRef                            = useRef(null);

  // ── Section dropdown state ─────────────────────────────────────────────
  const currentSection = SECTION_MAP[location.pathname] || 'departments';
  const [secOpen, setSecOpen] = useState(false);
  const secRef               = useRef(null);

  // Sync selectedId when URL param changes, but NOT if on papers page
  useEffect(() => {
    const isPapersPage = location.pathname.includes('/papers');
    if (urlUniversityId && !isPapersPage) {
      setSelectedId(urlUniversityId);
    }
  }, [urlUniversityId, location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e) => {
      if (uniRef.current && !uniRef.current.contains(e.target)) setUniOpen(false);
      if (secRef.current && !secRef.current.contains(e.target)) setSecOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Debounce search query - waits 2 seconds after user stops typing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setSkip(0); // Reset pagination on new search
    }, 2000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch universities - load first 10 on mount, then handle search and show more
  useEffect(() => {
    if (debouncedQuery.length === 0 && skip === 0) {
      // Load first 10 active universities on component mount or when search is cleared
      fetchUniversitiesWithSearch();
      return;
    }

    if (debouncedQuery.length > 0 || skip > 0) {
      fetchUniversitiesWithSearch();
    }
  }, [debouncedQuery, skip]);

  // Load initial 10 universities when dropdown opens
  useEffect(() => {
    if (uniOpen && universities.length === 0 && searchQuery.length === 0) {
      fetchUniversitiesWithSearch();
    }
  }, [uniOpen]);

  const fetchUniversitiesWithSearch = async () => {
    try {
      setLoadingUnis(true);
      const data = await universityService.searchUniversities(debouncedQuery, skip, 10);
      
      if (skip === 0) {
        // First load
        setUniversities(data.items || []);
      } else {
        // Load more - append to existing
        setUniversities(prev => [...prev, ...(data.items || [])]);
      }
      
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('Failed to search universities:', err);
    } finally {
      setLoadingUnis(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSkip(0); // Reset pagination on new search
  };

  const handleShowMore = () => {
    setSkip(prev => prev + 10);
  };

  const handleSelectUniversity = (uni) => {
    const newId = String(uni.universityId);
    setSelectedId(newId);
    setUniOpen(false);
    setSearchQuery('');
    setSkip(0);
    
    // Just update the URL parameter with the new university ID, stay on current page
    navigate(`${location.pathname}?universityId=${newId}`, { replace: true });
  };

  const handleSelectSection = (section) => {
    setSecOpen(false);
    const basePath =
      userType === 'admin'
        ? `/admin/${section.id}`
        : `/${section.id}`;
    const url = selectedId ? `${basePath}?universityId=${selectedId}` : basePath;
    navigate(url);
  };

  const selectedUni     = universities.find(u => String(u.universityId) === selectedId);
  const selectedSection = SECTIONS.find(s => s.id === currentSection) || SECTIONS[0];
  const SectionIcon     = selectedSection.icon;

  const initials = (name) =>
    name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 select-none">
      {/* ── Single unified bar ────────────────────────────────────── */}
      <div className="flex items-center gap-4 p-5 flex-wrap">

        {/* University avatar */}
        <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center text-white shrink-0 text-sm font-bold shadow-sm">
          {selectedUni ? initials(selectedUni.universityName) : <School size={15} />}
        </div>

        {/* University dropdown trigger */}
        <div className="relative" ref={uniRef}>
          <button
            onClick={() => userType !== 'coordinator' && setUniOpen(o => !o)}
            disabled={userType === 'coordinator'}
            className={`flex items-center gap-2 ${userType === 'coordinator' ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="text-left">
              <p className="text-sm font-black text-gray-900 leading-tight truncate max-w-[200px]">
                {selectedUni ? selectedUni.universityName : 'Select a university'}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">
                {selectedUni
                  ? <><span>{selectedUni.departments?.length ?? 0} Depts</span>
                      <span className={`ml-2 font-bold ${selectedUni.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                        ● {selectedUni.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </>
                  : 'Click to choose'
                }
              </p>
            </div>
            {userType !== 'coordinator' && (
              <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-200 ${uniOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {/* University dropdown panel */}
          {uniOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Search Universities</p>
                <div className="bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all flex items-center gap-2">
                  <Search size={12} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search universities…"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full bg-transparent text-gray-800 placeholder-gray-400 font-semibold text-[11px] focus:outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSkip(0); }}
                      className="text-gray-300 hover:text-gray-500 transition shrink-0">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className={`overflow-y-auto ${universities.length > 5 ? 'max-h-96' : 'max-h-56'}`}>
                {loadingUnis && (debouncedQuery.length > 0 || (debouncedQuery.length === 0 && universities.length === 0))
                  ? <div className="px-4 py-4 text-center"><Loader2 size={16} className="animate-spin inline text-gray-400" /></div>
                  : universities.length === 0
                  ? <div className="px-4 py-6 text-center text-gray-400 text-xs">No universities found</div>
                  : universities.map((uni) => {
                      const isSel = String(uni.universityId) === selectedId;
                      return (
                        <button key={uni.universityId} onClick={() => handleSelectUniversity(uni)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all text-left ${
                            isSel ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isSel ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>{initials(uni.universityName)}</div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[12px] font-semibold truncate ${isSel ? 'text-teal-700' : 'text-gray-800'}`}>{uni.universityName}</p>
                            <p className="text-[10px] text-gray-400">{uni.isActive ? '● Active' : '● Inactive'}</p>
                          </div>
                          {isSel && <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />}
                        </button>
                      );
                    })
                }
                {hasMore && universities.length > 0 && (
                  <button
                    onClick={handleShowMore}
                    disabled={loadingUnis}
                    className="w-full px-3 py-2.5 text-center text-[11px] font-semibold text-teal-700 hover:bg-teal-50 transition border-t border-gray-50 disabled:opacity-50"
                  >
                    {loadingUnis ? <Loader2 size={12} className="animate-spin inline" /> : 'Show More'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Divider + Section selector (replaces plain title) ── */}
        {selectedId && (
          <>
            <div className="w-px h-8 bg-gray-100 mx-1 shrink-0" />
            <div className="relative" ref={secRef}>
              <button
                onClick={() => setSecOpen(o => !o)}
                className="flex items-center gap-1.5 cursor-pointer group"
              >
                <SectionIcon size={14} strokeWidth={2} className="text-teal-700 shrink-0" />
                <span className="text-[14px] font-bold text-gray-800 whitespace-nowrap">
                  {selectedSection.label} Management
                </span>
                <ChevronDown
                  size={13}
                  className={`text-gray-400 shrink-0 transition-transform duration-200 ${secOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {secOpen && (
                <div className="absolute left-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Switch Section</p>
                  </div>
                  {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = section.id === currentSection;
                    return (
                      <button key={section.id} onClick={() => handleSelectSection(section)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all text-left ${
                          isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={13} strokeWidth={2} className={isActive ? 'text-teal-600' : 'text-gray-400'} />
                        <span className={`text-[12px] font-semibold ${isActive ? 'text-teal-700' : 'text-gray-700'}`}>
                          {section.label} Management
                        </span>
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* Search bar (injected by page) */}
        {headerExtras?.search !== undefined && selectedId && (
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100
            focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all w-52">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder={headerExtras.searchPlaceholder || 'Search…'}
              value={headerExtras.search}
              onChange={(e) => headerExtras.setSearch(e.target.value)}
              className="w-full bg-transparent text-gray-800 placeholder-gray-400 font-semibold text-[11px] focus:outline-none"
            />
            {headerExtras.search && (
              <button onClick={() => headerExtras.setSearch('')}
                className="text-gray-300 hover:text-gray-500 transition">
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Action button (injected by page) */}
        {headerExtras?.actionLabel && selectedId && (
          <button
            onClick={headerExtras.onAction}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md
              font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm hover:shadow shrink-0"
          >
            <Plus size={13} />
            <span>{headerExtras.actionLabel}</span>
          </button>
        )}

      </div>
    </div>
  );
}
