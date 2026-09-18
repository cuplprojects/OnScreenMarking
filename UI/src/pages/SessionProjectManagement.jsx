import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfigHeader } from '../context/ConfigHeaderContext';
import sessionService from '../services/sessionService';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import AddSessionModal from '../components/AddSessionModal';
import ColumnFilter from '../components/ColumnFilter';
import { 
  Calendar, 
  Edit2, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import message from '../services/messageService';

export default function SessionProjectManagement() {
  const [searchParams] = useSearchParams();
  const { userType } = useAuth();

  // Define fetch function for useTable hook
  const fetchFn = useCallback((params) => {
    return sessionService.getAllSessions(params);
  }, []);

  // Centralized hook for table states
  const {
    items: sessions,
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
    if (filters.sortField !== field) return <ArrowUpDown size={12} className="text-gray-300" />;
    return filters.sortOrder === 'asc' ? <ArrowUp size={12} className="text-teal-600" /> : <ArrowDown size={12} className="text-teal-600" />;
  };

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    sessionName: '',
    isActive: true
  });

  const handleEdit = (session) => {
    setFormData({
      sessionName: session.sessionName,
      isActive: session.isActive
    });
    setEditingId(session.sessionId);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ sessionName: '', isActive: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSessionSubmit = async (data) => {
    try {
      if (editingId) {
        await sessionService.updateSession(editingId, data);
      } else {
        await sessionService.createSession(data);
      }
      message.success(editingId ? 'Session updated successfully!' : 'Session created successfully!');
      refresh();
      handleCancel();
    } catch (err) {
      message.error(err.message || 'Error saving session');
    }
  };

  // Register into the unified header bar
  const { setConfigHeader } = useConfigHeader();
  useEffect(() => {
    setConfigHeader({
      title: 'Sessions Management',
      search,
      setSearch,
      searchPlaceholder: 'Search sessions…',
      actionLabel: 'Add Session',
      onAction: () => setShowForm(true),
    });
    return () => setConfigHeader(null);
  }, [search, setSearch, setConfigHeader]);

  return (
    <div className="w-full space-y-3">
      <AddSessionModal
        isOpen={showForm}
        onClose={handleCancel}
        onSubmit={handleSessionSubmit}
        editingId={editingId}
        initialData={formData}
      />

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading && sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-bold text-xs flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span>Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-16 text-center text-gray-500 leading-relaxed max-w-sm mx-auto space-y-3">
            <Calendar className="mx-auto text-gray-400" size={32} />
            <div>
              <h3 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">No Sessions Configured</h3>
              <p className="text-[10px] text-gray-400 mt-1">Create a session to begin tracking academic operations.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-450 uppercase tracking-widest select-none">
                  <th
                    className="px-6 py-2.5 cursor-pointer hover:bg-gray-100 transition-colors group w-2/3"
                    onClick={() => handleSort('sessionName')}
                  >
                    <div className="flex items-center gap-1.5">
                      Session Details {getSortIcon('sessionName')}
                      <ColumnFilter columnKey="sessionName" currentFilter={filters.sessionName} setFilter={setFilter} placeholder="Filter session name..." />
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className="cursor-pointer hover:text-gray-700 flex items-center gap-1"
                        onClick={() => handleSort('isActive')}
                      >
                        Status {getSortIcon('isActive')}
                        <ColumnFilter 
                          columnKey="isActive" 
                          currentFilter={filters.isActive} 
                          setFilter={setFilter}
                          options={[
                            { label: 'Active', value: 'true' },
                            { label: 'Inactive', value: 'false' }
                          ]}
                        />
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {sessions.map((session) => (
                  <tr key={session.sessionId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600 font-extrabold shadow-sm shrink-0 border border-gray-100">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <span className="font-extrabold text-gray-900 tracking-tight block text-sm">{session.sessionName}</span>
                          <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">
                            Created: {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                        session.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${session.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        {session.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(session)}
                          className="p-2 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 text-gray-600 rounded-xl border border-gray-200 hover:border-teal-200 transition-all cursor-pointer shadow-sm group"
                          title="Edit Session"
                        >
                          <Edit2 size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
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
  );
}

