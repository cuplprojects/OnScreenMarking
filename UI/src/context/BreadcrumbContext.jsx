import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const BreadcrumbContext = createContext();

// Map routes to breadcrumb labels dynamically
const routeLabels = {
  // Admin paths
  '/admin/dashboard': { label: 'Dashboard', icon: 'LayoutDashboard' },
  '/admin/universities': { label: 'Universities', icon: 'Building2' },
  '/admin/departments': { label: 'Departments', icon: 'Briefcase' },
  '/admin/subjects': { label: 'Subjects', icon: 'BookOpen' },
  '/admin/sessions': { label: 'Session Management', icon: 'Calendar' },
  '/admin/projects': { label: 'Project Management', icon: 'ClipboardList' },
  '/admin/papers': { label: 'Paper Management', icon: 'FileText' },
  '/admin/section-config': { label: 'Section Configuration', icon: 'Layers' },
  '/admin/users': { label: 'Users', icon: 'Users' },
  '/admin/role-management': { label: 'Roles & Permissions', icon: 'Shield' },
  '/admin/attendance': { label: 'Attendance', icon: 'Users' },
  '/admin/allocate-scripts': { label: 'Script Allocation', icon: 'Layers' },

  // Coordinator paths
  '/coordinator/dashboard': { label: 'Dashboard', icon: 'LayoutDashboard' },
  '/departments': { label: 'Departments', icon: 'Briefcase' },
  '/subjects': { label: 'Subjects', icon: 'BookOpen' },
  '/sessions': { label: 'Session Management', icon: 'Calendar' },
  '/projects': { label: 'Project Management', icon: 'ClipboardList' },
  '/papers': { label: 'Paper Management', icon: 'FileText' },
  '/allocate-scripts': { label: 'Script Allocation', icon: 'Layers' },
  '/section-config': { label: 'Section Configuration', icon: 'Layers' },

  // Examiner paths
  '/': { label: 'Dashboard', icon: 'LayoutDashboard' },
  '/scripts': { label: 'My Allocated Scripts', icon: 'FileText' },
  '/marking': { label: 'Script Marking', icon: 'Layers' },
  '/reports': { label: 'Reports', icon: 'Briefcase' },
  '/settings': { label: 'Settings', icon: 'Briefcase' }
};

export function BreadcrumbProvider({ children }) {
  const { userType } = useAuth();
  const location = useLocation();

  const getDashboardPath = useCallback(() => {
    if (userType === 'admin') return '/admin/dashboard';
    if (userType === 'coordinator') return '/coordinator/dashboard';
    return '/'; // Examiner / Default
  }, [userType]);

  const dashboardPath = getDashboardPath();

  const [breadcrumbs, setBreadcrumbs] = useState([
    { label: 'Dashboard', path: dashboardPath, icon: 'LayoutDashboard' }
  ]);
  const [navigationHistory, setNavigationHistory] = useState([dashboardPath]);

  // Track navigation history and build breadcrumbs
  useEffect(() => {
    const path = location.pathname;
    const queryParams = new URLSearchParams(location.search);
    const activeDashboard = getDashboardPath();
    
    // Build breadcrumbs based on navigation history
    const newBreadcrumbs = [];
    
    // Always start with dashboard
    newBreadcrumbs.push({
      label: 'Dashboard',
      path: activeDashboard,
      icon: 'LayoutDashboard'
    });

    // Add Sessions & Projects if we're navigating from there or on a config page
    const sessionPath = userType === 'admin' ? '/admin/sessions' : '/sessions';
    const isProjectOrSessionPath = (p) => {
      return p === '/admin/sessions' || p === '/admin/projects' || p === '/sessions' || p === '/projects';
    };
    
    const hasVisitedSession = navigationHistory.some(isProjectOrSessionPath);
    const isCurrentlySession = isProjectOrSessionPath(path);
    const isConfig = path.includes('section-config');
    const isMainPage = path.includes('papers') || path.includes('allocate-scripts') || path.includes('users') || path.includes('project-dashboard');
    const isDashboardPath = path === '/admin/dashboard' || path === '/coordinator/dashboard' || path === '/';

    if ((hasVisitedSession || isConfig) && !isCurrentlySession && !isMainPage && !isDashboardPath) {
      newBreadcrumbs.push({
        label: 'Sessions & Projects',
        path: sessionPath,
        icon: 'Calendar'
      });
    }

    // Add current route if it's not dashboard
    if (path !== '/admin/dashboard' && path !== '/coordinator/dashboard' && path !== '/') {
      const routeInfo = routeLabels[path];
      if (routeInfo) {
        newBreadcrumbs.push({
          label: routeInfo.label,
          path: path,
          icon: routeInfo.icon,
          queryParams: Object.fromEntries(queryParams)
        });
      }
    }

    setBreadcrumbs(newBreadcrumbs);

    // Update navigation history
    setNavigationHistory((prev) => {
      const isDashboardPath = path === '/admin/dashboard' || path === '/coordinator/dashboard' || path === '/';
      if (isDashboardPath) {
        return [path];
      }
      // Don't add duplicate consecutive paths
      if (prev[prev.length - 1] !== path) {
        return [...prev, path];
      }
      return prev;
    });
  }, [location, userType]);

  const setBreadcrumb = useCallback((items) => {
    const activeDashboard = getDashboardPath();
    const dashboardItem = { label: 'Dashboard', path: activeDashboard, icon: 'LayoutDashboard' };
    setBreadcrumbs([dashboardItem, ...items]);
  }, [getDashboardPath]);

  const addBreadcrumb = useCallback((item) => {
    setBreadcrumbs((prev) => [...prev, item]);
  }, []);

  const clearBreadcrumbs = useCallback(() => {
    const activeDashboard = getDashboardPath();
    setBreadcrumbs([
      { label: 'Dashboard', path: activeDashboard, icon: 'LayoutDashboard' }
    ]);
    setNavigationHistory([activeDashboard]);
  }, [getDashboardPath]);

  const resetBreadcrumbs = () => {
    clearBreadcrumbs();
  };

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumb, addBreadcrumb, clearBreadcrumbs, resetBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumb must be used within BreadcrumbProvider');
  }
  return context;
}
