import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  School, 
  Building2, 
  BookOpen, 
  ClipboardList, 
  Users, 
  ChevronRight,
  ShieldCheck,
  Plus,
  Settings,
  AlertCircle,
  Zap,
  Activity,
  ArrowUpRight,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiCall from '../services/api';
import { useTable } from '../services/tableService';
import TablePagination from '../components/TablePagination';
import ColumnFilter from '../components/ColumnFilter';
import universityService from '../services/universityService';

export default function AdminDashboard() {
  const { user, hasPermission } = useAuth();
  const [universities, setUniversities] = useState([]);
  const [stats, setStats] = useState({
    totalUniversities: 0,
    totalUsers: 0,
    totalProjects: 0,
    totalScripts: 0,
    completedScripts: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unassignedCount, setUnassignedCount] = useState(0);

  // Table state for universities
  const fetchUniversitiesFn = useCallback(async (params) => {
    return await universityService.getAllUniversities(params);
  }, []);

  const {
    items: tableUniversities,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loading: tableLoading,
    filters,
    setFilter,
    sortField,
    sortOrder,
    handleSort,
    refresh: refreshTable
  } = useTable({
    fetchFn: fetchUniversitiesFn,
    initialParams: { pageSize: 10 }
  });

  const [localSearch, setLocalSearch] = useState('');

  // Sync external search clears (if any)
  useEffect(() => {
    if (search === '') setLocalSearch('');
  }, [search]);

  // Debounce the input to useTable's search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
      }
    }, 400); // 400ms UI debounce
    return () => clearTimeout(handler);
  }, [localSearch, setSearch, search]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const uniData = await apiCall('/universities');
      setUniversities(uniData);

      // Fetch optimized global stats counts
      let usersCount = 0;
      let pendingCount = 0;
      let totalCount = 0;
      let completedCount = 0;

      try {
        const counts = await apiCall('/stats/admin-counts');
        usersCount = counts.totalUsers || 0;
        totalCount = counts.totalScripts || 0;
        pendingCount = counts.pendingScripts || 0;
        completedCount = counts.completedScripts || 0;
        setUnassignedCount(pendingCount);
      } catch (err) {
        console.error('Failed to fetch global counts:', err);
      }

      setStats({
        totalUniversities: uniData.length,
        totalUsers: usersCount,
        totalProjects: uniData.reduce((sum, u) => sum + (u.projects?.length || 0), 0),
        totalScripts: totalCount,
        completedScripts: completedCount
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load dashboard universities');
    } finally {
      setLoading(false);
    }
  };

  const systemModules = [
    {
      id: 'universities',
      title: 'Universities',
      description: 'Manage universities',
      icon: <School size={16} />,
      path: '/admin/universities',
      color: 'text-teal-700 bg-teal-50'
    },
    {
      id: 'colleges',
      title: 'Colleges',
      description: 'Manage colleges',
      icon: <Building2 size={16} />,
      path: '/admin/colleges',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      id: 'question-types',
      title: 'Question Types',
      description: 'Manage question types',
      icon: <ClipboardList size={16} />,
      path: '/admin/question-types',
      color: 'text-amber-600 bg-amber-50'
    },
    {
      id: 'attendance',
      title: 'Attendance Audit',
      description: 'Review logs',
      icon: <Activity size={16} />,
      path: '/admin/attendance',
      color: 'text-emerald-600 bg-emerald-50'
    }
  ];

  const accessModules = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage system users',
      icon: <Users size={16} />,
      path: '/admin/users',
      color: 'text-blue-600 bg-blue-50'
    }
  ];

  if (hasPermission && hasPermission("READ_ROLE")) {
    accessModules.push({
      id: 'roles',
      title: 'Roles & Permissions',
      description: 'Manage roles and access',
      icon: <ShieldCheck size={16} />,
      path: '/admin/role-management',
      color: 'text-rose-600 bg-rose-50'
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent"></div>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-wider animate-pulse">Initializing Board Admin Console...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-zinc-50 pb-6 w-full px-6 lg:px-10 pt-6 overflow-hidden">
      
      {/* Dynamic Unallocated Alert Warning Banner */}
      {/* <div className="pt-6">
        {unassignedCount > 0 && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Unallocated Scripts Alert</h3>
                <p className="text-xs text-amber-800 mt-0.5">There are currently <span className="font-bold text-red-600">{unassignedCount}</span> scripts that have not been assigned to any examiner.</p>
              </div>
            </div>
            <Link 
              to="/admin/allocate-scripts" 
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
            >
              Allocate Scripts
            </Link>
          </div>
        )}
      </div> */}

      {/* Main Glass Header */}
      <div className="bg-white px-5 py-2.5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-teal-700 font-semibold mb-1">
            <ShieldCheck size={14} />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            OSM Admin Console
          </h1></div>
          <p className="text-gray-500 text-xs mt-0.5">Global System Configurations & Evaluation Monitor Room</p>
        </div>
      </div>

      {/* Grid Layout utilizing entire viewport */}
      <div className="grid grid-cols-12 gap-6 items-start flex-1 overflow-hidden">
        
        {/* LEFT COLUMN - STATS & REGISTERED UNIVERSITIES (75% Width) */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-6 h-full overflow-hidden">
          
          {/* Global Statistics Metric Board */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">Global Statistics</h2>
                <p className="text-[11px] text-gray-500">Global examination status across all linked boards</p>
              </div>
              <span className="bg-teal-50 text-teal-700 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-teal-100">
                Performance metrics
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Universities Card */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-100 border-l-[3px] border-l-teal-500 flex items-center justify-between shadow-sm hover:shadow-md hover:border-teal-200 transition-all group">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider group-hover:text-teal-600 transition-colors">Universities</span>
                  <span className="text-lg font-black text-slate-800 mt-0.5">{stats.totalUniversities}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-teal-50/80 text-teal-600 flex items-center justify-center group-hover:bg-teal-100 group-hover:scale-105 transition-all">
                  <Building2 size={16} />
                </div>
              </div>

              {/* Users Card */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-100 border-l-[3px] border-l-teal-500 flex items-center justify-between shadow-sm hover:shadow-md hover:border-teal-200 transition-all group">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider group-hover:text-teal-600 transition-colors">Registered Users</span>
                  <span className="text-lg font-black text-slate-800 mt-0.5">{stats.totalUsers}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-teal-50/80 text-teal-600 flex items-center justify-center group-hover:bg-teal-100 group-hover:scale-105 transition-all">
                  <Users size={16} />
                </div>
              </div>

              {/* Projects Card */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-100 border-l-[3px] border-l-teal-500 flex items-center justify-between shadow-sm hover:shadow-md hover:border-teal-200 transition-all group">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider group-hover:text-teal-600 transition-colors">Active Projects</span>
                  <span className="text-lg font-black text-slate-800 mt-0.5">{stats.totalProjects}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-teal-50/80 text-teal-600 flex items-center justify-center group-hover:bg-teal-100 group-hover:scale-105 transition-all">
                  <ClipboardList size={16} />
                </div>
              </div>

              {/* Global Completion Card (Highlighted) */}
              <div className="bg-gradient-to-br from-teal-700 to-teal-800 p-3.5 rounded-xl border border-teal-600 flex items-center justify-between shadow-md hover:shadow-lg hover:border-teal-500 transition-all group">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-teal-200 tracking-wider">Global Completion</span>
                  <span className="text-lg font-black text-white mt-0.5">
                    {stats.completedScripts} <span className="text-xs font-medium text-teal-300">/ {stats.totalScripts}</span>
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-teal-600/50 text-teal-50 flex items-center justify-center group-hover:bg-teal-600 group-hover:scale-105 transition-all">
                  <Activity size={16} />
                </div>
              </div>
            </div>

            {/* Overall Progress Slider */}
            {/* <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-gray-700">Global Answer Sheets Progress Ratio</span>
                <span className="text-[11px] font-bold text-teal-700">
                  {stats.totalScripts > 0 ? Math.round((stats.completedScripts / stats.totalScripts) * 100) : 0}% Evaluated
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                <div
                  className="bg-teal-700 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalScripts > 0 ? (stats.completedScripts / stats.totalScripts) * 100 : 0}%` }}
                ></div>
              </div>
            </div> */}
          </div>

          {/* Registered Boards Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col shrink min-h-0">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">Affiliated Universities</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Live configuration and operations across affiliated networks</p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search boards..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none w-full sm:w-64 font-medium transition-all"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              </div>
            </div>

            {error ? (
              <div className="p-6 text-center text-red-600">
                <AlertCircle className="mx-auto mb-1.5" size={24} />
                <p className="text-xs font-semibold">{error}</p>
              </div>
            ) : tableUniversities.length === 0 ? (
              <div className="py-12 text-center text-gray-400 flex-1">
                <School size={32} className="mx-auto mb-1.5 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-wider">No university boards found</p>
              </div>
            ) : (
              <div className="flex flex-col shrink min-h-0 overflow-hidden">
                <div className="overflow-auto shrink min-h-0">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors group" onClick={() => handleSort('universityName')}>
                          <div className="flex items-center gap-1">
                            Board name
                            {sortField === 'universityName' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                          </div>
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors group" onClick={() => handleSort('isActive')}>
                          <div className="flex items-center gap-1">
                            Status
                            {sortField === 'isActive' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-gray-300"/>}
                            <ColumnFilter 
                              columnKey="isActive" 
                              currentFilter={filters.isActive} 
                              setFilter={setFilter}
                              options={[
                                { label: 'Active', value: 'true' },
                                { label: 'Disabled', value: 'false' }
                              ]}
                            />
                          </div>
                        </th>
                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Academic Config</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tableUniversities.map((uni) => (
                        <tr key={uni.universityId} className="hover:bg-teal-50/30 transition-colors">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-teal-50 text-teal-700 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                                {uni.universityName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-xs text-gray-900 leading-none">{uni.universityName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${uni.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                              {uni.isActive ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-5 py-2.5">
                            <p className="text-[11px] font-bold text-gray-700">
                              {uni.departments?.length || 0} Depts | {uni.projects?.length || 0} Projects
                            </p>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Link 
                                to={`/admin/departments?universityId=${uni.universityId}`}
                                className="px-2.5 py-1 bg-white hover:bg-teal-50 text-gray-700 border border-gray-200 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all hover:border-teal-400 hover:text-teal-700 shrink-0"
                              >
                                Config University
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="shrink-0 border-t border-gray-100">
                  <TablePagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    setPage={setPage}
                    setPageSize={setPageSize}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - SLICK SIDE BAR (25% Width) */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
          {/* Quick Action Navigation Dock */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Board Admin Control</h3>
            <div className="flex flex-col gap-1.5">
              {systemModules.map((module) => (
                <Link
                  key={module.id}
                  to={module.path}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 border-l-[3px] border-l-teal-500 shadow-sm hover:border-teal-200 hover:border-l-teal-500 hover:bg-teal-50/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${module.color} shrink-0 group-hover:scale-105 transition-transform`}>
                      {module.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-gray-900 group-hover:text-teal-700 transition-colors truncate">{module.title}</h4>
                      <p className="text-[9px] text-gray-400 mt-0.5 truncate">{module.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Access Control Navigation Dock */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">System Users & Roles</h3>
            <div className="flex flex-col gap-1.5">
              {accessModules.map((module) => (
                <Link
                  key={module.id}
                  to={module.path}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-100 border-l-[3px] border-l-teal-500 shadow-sm hover:border-teal-200 hover:border-l-teal-500 hover:bg-teal-50/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg ${module.color} shrink-0 group-hover:scale-105 transition-transform`}>
                      {module.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-gray-900 group-hover:text-teal-700 transition-colors truncate">{module.title}</h4>
                      <p className="text-[9px] text-gray-400 mt-0.5 truncate">{module.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={12} className="text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Compact Metadata Details Card */}
          {/* <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">System Status</h3>
            <div className="space-y-3">
              <div className="border-b border-gray-50 pb-2">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none">Security Environment</span>
                <p className="text-xs font-bold text-gray-900 mt-0.5">Authorized Admins Only</p>
              </div>
              <div className="border-b border-gray-50 pb-2">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none">Global Server Node</span>
                <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active / Optimal
                </p>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider leading-none">Total System Capacity</span>
                <p className="text-[10px] font-semibold text-gray-700 mt-0.5">
                  {stats.totalUniversities} Affiliated | {stats.totalUsers} Active Personnel
                </p>
              </div>
            </div>
          </div> */}
          
        </div>
      </div>
    </div>
  );
}
