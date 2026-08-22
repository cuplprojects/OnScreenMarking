import { useState, useEffect, useCallback } from 'react';

/**
 * A centralized custom React hook for tables supporting pagination, search, and loading states.
 */
export function useTable({ fetchFn, initialParams = {}, debounceDelay = 800 }) {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(initialParams.page || 1);
  const [pageSize, setPageSize] = useState(initialParams.pageSize || 10);
  const [search, setSearch] = useState(initialParams.search || '');
  const [sortField, setSortField] = useState(initialParams.sortField || '');
  const [sortOrder, setSortOrder] = useState(initialParams.sortOrder || 'asc'); // 'asc' or 'desc'
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(initialParams.filters || {});

  // Debounce search changes to avoid excessive network requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceDelay);

    return () => clearTimeout(handler);
  }, [search, debounceDelay]);

  // Reset page to 1 whenever search terms, sort, or filter properties change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortField, sortOrder, JSON.stringify(filters)]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        pageSize,
        search: debouncedSearch,
        sortField,
        sortOrder,
        ...filters
      };
      
      const response = await fetchFn(params);
      
      if (response && typeof response === 'object' && 'items' in response) {
        setItems(response.items || []);
        setTotalCount(response.totalCount || 0);
        setTotalPages(response.totalPages || 1);
      } else {
        // Fallback to array wrapping for unpaginated static loads
        const arrayData = Array.isArray(response) ? response : [];
        
        // If sorting is done client-side when server-side is not supported:
        if (sortField) {
          arrayData.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        
        setItems(arrayData);
        setTotalCount(arrayData.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, pageSize, debouncedSearch, sortField, sortOrder, JSON.stringify(filters)]);

  // Automatically fetch data whenever dependencies trigger
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    items,
    setItems,
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
    setFilters,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    handleSort,
    refresh
  };
}
