import { createContext, useContext, useState, useCallback } from 'react';

/**
 * ConfigHeaderContext
 *
 * Allows config pages (DepartmentManagement, CourseManagement, etc.)
 * to inject their title, search field, and action button into the
 * UniversityConfigHeader so it all renders as a single unified bar.
 *
 * Usage in a page:
 *   const { setConfigHeader } = useConfigHeader();
 *   useEffect(() => {
 *     setConfigHeader({ title: 'Departments Management', search, setSearch, actionLabel: 'Add Department', onAction: () => setShowForm(true) });
 *     return () => setConfigHeader(null);   // cleanup on unmount
 *   }, [search]);
 */

const ConfigHeaderContext = createContext(null);

export function ConfigHeaderProvider({ children }) {
  const [headerExtras, setHeaderExtras] = useState(null);

  const setConfigHeader = useCallback((extras) => {
    setHeaderExtras(extras);
  }, []);

  return (
    <ConfigHeaderContext.Provider value={{ headerExtras, setConfigHeader }}>
      {children}
    </ConfigHeaderContext.Provider>
  );
}

export function useConfigHeader() {
  const ctx = useContext(ConfigHeaderContext);
  if (!ctx) throw new Error('useConfigHeader must be used inside ConfigHeaderProvider');
  return ctx;
}
