import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  X, LayoutDashboard, School, Building2, GraduationCap, BookOpen,
  Calendar, FileText, Layers, Zap, Users, Shield, Activity, PenTool,
  BarChart3, BookMarked, Settings, Settings2, Briefcase, Upload, Folder, FileCheck
} from 'lucide-react';
import { encryptId } from '../utils/encryption';

/**
 * Nav groups for admin / coordinator / examiner
 * Groups: Overview, Academic Setup, Examination, Operations
 */
function useNavGroups(userType, hasPermission) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlEncryptedProjId = searchParams.get('projectId');
  const urlUniversityId = searchParams.get('universityId');

  const selectedProjectId = sessionStorage.getItem('selectedProjectId');
  const encryptedProjId = urlEncryptedProjId || (selectedProjectId ? encryptId(selectedProjectId) : '');
  const univParam = urlUniversityId ? `&universityId=${urlUniversityId}` : '';

  const papersPath =
    userType === 'admin'
      ? encryptedProjId ? `/admin/papers?projectId=${encryptedProjId}${univParam}` : '/admin/papers'
      : encryptedProjId ? `/papers?projectId=${encryptedProjId}${univParam}` : '/papers';

  const allocationPath =
    userType === 'admin'
      ? encryptedProjId ? `/admin/project-dashboard?projectId=${encryptedProjId}&tab=allocations${univParam}` : `/admin/project-dashboard?tab=allocations${univParam}`
      : encryptedProjId ? `/project-dashboard?projectId=${encryptedProjId}&tab=allocations${univParam}` : `/project-dashboard?tab=allocations${univParam}`;

  const importQpPath =
    userType === 'admin'
      ? encryptedProjId ? `/admin/import-question-papers?projectId=${encryptedProjId}${univParam}` : '/admin/import-question-papers'
      : encryptedProjId ? `/import-question-papers?projectId=${encryptedProjId}${univParam}` : '/import-question-papers';

  const importPapersPath =
    userType === 'admin'
      ? encryptedProjId ? `/admin/import-papers-from-project?projectId=${encryptedProjId}${univParam}` : '/admin/import-papers-from-project'
      : encryptedProjId ? `/import-papers-from-project?projectId=${encryptedProjId}${univParam}` : '/import-papers-from-project';

  const isAdmin = userType === 'admin';
  const isCoordinator = userType === 'coordinator';

  const groups = [];

  // 1. Overview
  const dashboardPath = isAdmin ? '/admin/dashboard' : (isCoordinator ? '/coordinator/dashboard' : '/');
  groups.push({
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: dashboardPath, icon: LayoutDashboard, exact: true }
    ]
  });

  // 2. Academic Setup
  const academicItems = [];
  if (hasPermission('READ_UNIVERSITY')) {
    academicItems.push({ label: 'Universities', path: '/admin/universities', icon: School });
  }
  if (hasPermission('READ_DEPARTMENT')) {
    academicItems.push({ label: 'University Config', path: isAdmin ? '/admin/departments' : '/departments', icon: Settings2 });
  }
  if (hasPermission('READ_PROJECT')) {
    academicItems.push({ label: 'Project Config', path: isAdmin ? '/admin/project-dashboard' : '/project-dashboard', icon: Briefcase });
  }
  if (hasPermission('READ_COLLEGE')) {
    academicItems.push({ label: 'Colleges', path: '/admin/colleges', icon: Building2 });
  }
  if (hasPermission('VIEW_LOGS') || hasPermission('READ_ATTENDANCE')) {
    academicItems.push({ label: 'Attendance Audit', path: '/admin/attendance', icon: Activity });
  }
  if (academicItems.length > 0) {
    groups.push({ label: 'Academic Setup', items: academicItems });
  }

  // 3. Examination
  const examItems = [];
  if (hasPermission('READ_PROJECT') && !isAdmin) {
    examItems.push({ label: 'Projects', path: '/projects', icon: BookMarked });
  }
  if (hasPermission('READ_PAPER')) {
    examItems.push({ label: 'Papers', path: papersPath, icon: FileText });
  }
  if (hasPermission('IMPORT_PAPERS') || hasPermission('CREATE_PAPER')) {
    examItems.push({ label: 'Import Papers from Project', path: importPapersPath, icon: Folder });
  }
  if (hasPermission('IMPORT_PAPERS') || hasPermission('CREATE_PAPER') || hasPermission('UPDATE_PAPER')) {
    examItems.push({ label: 'Bulk Import Q.P.', path: importQpPath, icon: Upload });
  }
  if (hasPermission('MANAGE_SECTIONS')) {
    examItems.push({ label: 'Section Masters', path: isAdmin ? '/admin/section-masters' : '/section-masters', icon: Layers });
  }
  if (hasPermission('MANAGE_QUESTIONS')) {
    examItems.push({ label: 'Question Types', path: isAdmin ? '/admin/question-types' : '/question-types', icon: Layers });
  }
  if (hasPermission('READ_SCRIPT')) {
    examItems.push({ label: 'Scripts', path: '/scripts', icon: FileText });
  }
  if (hasPermission('VIEW_REPORTS')) {
    examItems.push({ label: 'Reports', path: '/reports', icon: BarChart3 });
  }
  if (examItems.length > 0) {
    groups.push({ label: 'Examination', items: examItems });
  }

  // 4. Operations
  const opsItems = [];
  if (hasPermission('READ_ALLOCATION')) {
    opsItems.push({ label: 'Script Allocation', path: allocationPath, icon: Zap });
    opsItems.push({ label: 'Paper Requests', path: isAdmin ? '/admin/paper-requests' : '/paper-requests', icon: FileCheck });
  }
  if (hasPermission('READ_USER')) {
    opsItems.push({ label: 'Users', path: '/admin/users', icon: Users });
  }
  if (hasPermission('READ_ROLE')) {
    opsItems.push({ label: 'Roles & Permissions', path: '/admin/role-management', icon: Shield });
  }
  if (hasPermission('MANAGE_SETTINGS')) {
    opsItems.push({ label: 'Settings', path: '/settings', icon: Settings });
  }
  if (opsItems.length > 0) {
    groups.push({ label: 'Operations', items: opsItems });
  }

  return groups;
}

export default function NavDrawer({ isOpen, onClose }) {
  const { userType, hasPermission } = useAuth();
  const location = useLocation();
  const currentParams = new URLSearchParams(location.search);
  const currentTab = currentParams.get('tab') || '';
  const groups = useNavGroups(userType, hasPermission);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label="Navigation menu">
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-4 border-b border-gray-100 shrink-0"
          style={{ height: 'var(--nav-height)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
              <BookMarked size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <p className="text-[13px] font-bold text-gray-900 tracking-tight">OSM Portal</p>
              <p className="text-[10px] text-gray-400 mt-[1px]">Navigation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400 px-2 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const itemUrl = new URL(item.path, window.location.origin);
                  const itemTab = itemUrl.searchParams.get('tab') || '';

                  const isCustomActive = itemUrl.pathname === location.pathname && (
                    itemTab ? currentTab === itemTab : (!currentTab || currentTab === 'project-dashboard')
                  );

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.exact}
                      onClick={onClose}
                      className={() =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all group
                        ${isCustomActive
                          ? 'bg-teal-50 text-teal-700 border-l-[3px] border-teal-600 pl-[9px]'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent pl-[9px]'
                        }`
                      }
                    >
                      {() => (
                        <>
                          <Icon
                            size={15}
                            strokeWidth={2}
                            className={isCustomActive ? 'text-teal-700' : 'text-gray-400 group-hover:text-gray-600'}
                          />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Drawer Footer */}
        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <p className="text-[10px] text-gray-400 text-center">OSM Portal v1.0</p>
        </div>
      </aside>
    </>
  );
}
