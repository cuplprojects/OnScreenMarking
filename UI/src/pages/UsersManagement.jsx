import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  X,
  CheckCircle,
  Mail,
  UserCheck,
  UserPlus,
  Users,
  Copy,
  Check,
  Building,
  Phone,
  Eye,
  Info,
  AlertCircle,
  Loader,
  Search,
  Sparkles,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import universityService from "../services/universityService";
import subjectService from "../services/subjectService";
import roleService from "../services/roleService";
import AssignRoleModal from "../components/RoleManagement/AssignRoleModal";
import departmentService from "../services/departmentService";
import AddUserModal from "../components/AddUserModal";
import { useTable } from "../services/tableService";
import TablePagination from "../components/TablePagination";
import message from '../services/messageService';

export default function UsersManagement() {
  const [searchParams] = useSearchParams();
  const { userType, universityId: userUniversityId, hasPermission } = useAuth();
  const universityIdFromUrl = searchParams.get("universityId");
  const activeUniversityId = userType === "coordinator" ? userUniversityId : universityIdFromUrl;

  const [activeTab, setActiveTab] = useState("all"); // "all", "pending", "invite"
  const [universities, setUniversities] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  
  // Invitation Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDeptId, setInviteDeptId] = useState("");
  const [inviteUniId, setInviteUniId] = useState(activeUniversityId || "");
  const [inviteUserType, setInviteUserType] = useState("examiner");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Define fetch function for useTable to load users with search, role and tab filters
  const fetchFn = useCallback(async (params) => {
    return await userService.getAllUsers(activeUniversityId, { ...params, activeTab });
  }, [activeUniversityId, activeTab]);

  // Centralized hook for users table states
  const {
    items: users,
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
    sortField,
    sortOrder,
    handleSort,
    refresh: refreshUsers
  } = useTable({
    fetchFn,
    initialParams: { pageSize: 10, filters: { isActive: "true" } }
  });

  useEffect(() => {
    if (error) {
      message.error(error);
      setError('');
    }
  }, [error, setError]);

  // Calculate quick count of total pending approvals globally
  const [pendingCount, setPendingCount] = useState(0);
  
  const fetchPendingCount = useCallback(() => {
    if (activeUniversityId) {
      userService.getAllUsers(activeUniversityId, { activeTab: "pending", pageSize: 1 })
        .then(response => {
          setPendingCount(response.totalCount || 0);
        })
        .catch(console.error);
    }
  }, [activeUniversityId]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  useEffect(() => {
    fetchUniversities();
    fetchRoles();
    if (activeUniversityId) {
      fetchSubjects(activeUniversityId);
    }
  }, [activeUniversityId]);

  // Refresh table when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, setPage]);

  const fetchSubjects = async (universityId) => {
    try {
      const data = await subjectService.getSubjectByUniversity(universityId, { pageSize: 0 });
      setSubjects(data?.items || data || []);
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await roleService.getAllRoles();
      const loadedRoles = res.data || [];
      setRoles(loadedRoles);
      
      const activeRoles = loadedRoles.filter(r => r.isActive);
      const firstEligible = activeRoles.find(role => {
        if (role.roleName.toLowerCase() === 'admin' && userType !== 'admin') return false;
        return true;
      });
      if (firstEligible) {
        setInviteUserType(firstEligible.roleName.toLowerCase());
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  };

  useEffect(() => {
    const uniId = activeUniversityId || inviteUniId;
    if (uniId) {
      departmentService.getDepartmentsByUniversity(uniId, { pageSize: 0 })
        .then(data => setDepartments(data?.items || data || []))
        .catch(console.error);
    } else {
      setDepartments([]);
    }
  }, [activeUniversityId, inviteUniId]);

  const fetchUniversities = async () => {
    try {
      const data = await universityService.getAllUniversities();
      setUniversities(data || []);
    } catch (err) {
      setError("Failed to fetch universities");
      console.error(err);
    }
  };

  const handleApprove = async (userId) => {
    try {
      
      
      await userService.approveUser(userId);
      message.success("Examiner approved and activated successfully!");
      refreshUsers();
      fetchPendingCount();
      
    } catch (err) {
      setError(err.message || "Failed to approve examiner.");
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    
    
    setGeneratedLink("");
    setEmailStatus(null);

    const finalUniId = activeUniversityId || inviteUniId;
    if (!inviteEmail) {
      setError("Email address is required.");
      return;
    }
    if (!finalUniId) {
      setError("Please select a university.");
      return;
    }

    try {
      setInviteLoading(true);
      const payload = {
        email: inviteEmail.trim(),
        universityId: parseInt(finalUniId, 10),
        departmentId: inviteDeptId ? parseInt(inviteDeptId, 10) : null,
        userType: inviteUserType
      };

      const res = await userService.inviteUser(payload);

      if (res.success) {
        setInviteEmail("");
        setInviteDeptId("");
        
        const activeRoles = roles.filter(r => r.isActive);
        const firstEligible = activeRoles.find(role => {
          if (role.roleName.toLowerCase() === 'admin' && userType !== 'admin') return false;
          return true;
        });
        setInviteUserType(firstEligible ? firstEligible.roleName.toLowerCase() : "examiner");

        const link = res.invitation?.invitationLink || res.invitation?.InvitationLink;
        if (link) setGeneratedLink(link);

        if (res.emailSent === false) {
          setEmailStatus({ sent: false, error: res.emailError || "SMTP Configuration Issue" });
          setError("Invitation generated, but email failed. Please share link manually.");
        } else {
          setEmailStatus({ sent: true, error: null });
          message.success("Invitation email sent successfully!");
        }
        refreshUsers();
        
      }
    } catch (err) {
      setError(err.message || "Failed to send invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent w-full max-w-none">
      <div className="w-full space-y-3">

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>Personnel & Users</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {hasPermission('CREATE_USER') && (
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-655 hover:from-blue-700 hover:to-indigo-755 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow shrink-0"
                >
                  <UserPlus size={14} />
                  <span>Add New User</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Tab Selection Controls */}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-[10px] uppercase tracking-wider cursor-pointer ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-655 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <Users size={12} />
              <span>All Users</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("pending")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-[10px] uppercase tracking-wider cursor-pointer ${
                activeTab === "pending"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-655 hover:bg-slate-50 hover:text-slate-955"
              }`}
            >
              <UserCheck size={12} />
              <span>Pending Approvals</span>
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded leading-none animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            {hasPermission('CREATE_USER') && (
              <button
                onClick={() => setActiveTab("invite")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-[10px] uppercase tracking-wider cursor-pointer ${
                  activeTab === "invite"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-655 hover:bg-slate-50 hover:text-slate-955"
                }`}
              >
                <Mail size={12} />
                <span>Invite User</span>
              </button>
            )}
          </div>

          {/* Search & Filters Row (Only for lists, hidden on invite page) */}
          {activeTab !== "invite" && (
            <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100 items-center justify-between">
              {/* Search Bar */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-150 flex-1 w-full max-w-md">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-slate-800 placeholder-slate-400 font-semibold text-[11px] focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 select-none">
                {/* Status selector */}
                <select
                  value={filters.isActive === undefined ? '' : filters.isActive}
                  onChange={(e) => setFilter('isActive', e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl font-bold text-[10px] text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="true">Active Only</option>
                  <option value="false">Inactive Only</option>
                </select>

                {/* Role selector */}
                <select
                  value={filters.userType || ''}
                  onChange={(e) => setFilter('userType', e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-150 rounded-xl font-bold text-[10px] text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="examiner">Examiners</option>
                  <option value="coordinator">Coordinators</option>
                  {userType === 'admin' && <option value="admin">Administrators</option>}
                </select>

                {(filters.isActive || filters.userType) && (
                  <button
                    onClick={() => {
                      setFilter('isActive', '');
                      setFilter('userType', '');
                    }}
                    className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-700 transition cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        
        

        {/* Tab Content 1: All Users & 2: Pending Approvals */}
        {activeTab !== "invite" && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
            {loading && users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-650"></div>
                <span>Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="p-16 text-center text-slate-500 font-medium leading-relaxed max-w-sm mx-auto space-y-3">
                <Users className="mx-auto text-slate-455" size={32} />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">No Records Found</h3>
                  <p className="text-[10px] text-slate-400 mt-1">There are no registered accounts matching your filters or search terms.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest select-none">
                      <th className="px-6 py-4">Photo</th>
                      <th className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">Name {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-slate-300"/>}</div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('email')}>
                        <div className="flex items-center gap-1">Email {sortField === 'email' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-slate-300"/>}</div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('userType')}>
                        <div className="flex items-center gap-1">System Role {sortField === 'userType' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-slate-300"/>}</div>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('universityName')}>
                        <div className="flex items-center gap-1">University {sortField === 'universityName' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-slate-300"/>}</div>
                      </th>
                      <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('isActive')}>
                        <div className="flex items-center justify-center gap-1">Status {sortField === 'isActive' ? (sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>) : <ArrowUpDown size={12} className="text-slate-300"/>}</div>
                      </th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/profile?userId=${user.id}`} title="View Detailed Profile">
                            {user.profileImage ? (
                              <div className="relative group w-8 h-8 rounded-xl overflow-hidden border border-slate-250/70 shadow-sm shrink-0">
                                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover transition group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                  <Eye className="text-white" size={12} />
                                </div>
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 hover:bg-slate-100 transition-colors shrink-0">
                                <Users size={14} className="text-slate-450" />
                              </div>
                            )}
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-extrabold text-slate-900">{user.name}</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg capitalize border tracking-wider ${
                            user.userType === "admin"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : user.userType === "coordinator"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }`}>
                            {user.userType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm font-semibold">
                          {user.university?.universityName || "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-100"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
                            {user.isActive ? "Active" : "Pending / Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {activeTab === "pending" ? (
                            hasPermission('UPDATE_USER') && (
                              <button
                                onClick={() => handleApprove(user.id)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                              >
                                <UserCheck size={12} />
                                <span>Approve</span>
                              </button>
                            )
                          ) : (
                            hasPermission('UPDATE_USER') && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowAssignRoleModal(true);
                                }}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-indigo-150 transition cursor-pointer"
                              >
                                Assign Role
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Standard Centralized Table Pagination */}
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
        )}

        {/* Tab Content 3: Invite Examiner Panel */}
        {activeTab === "invite" && hasPermission('CREATE_USER') && (
          <div className="max-w-xl mx-auto animate-fade-in mt-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-650 text-white rounded-2xl flex items-center justify-center mx-auto mb-2 shadow">
                  <Mail size={22} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Issue Onboarding Invitation</h3>
                <p className="text-xs text-slate-505 mt-1">Generate a pre-authorized onboarding token invitation for examiners or coordinators</p>
              </div>

              <form onSubmit={handleSendInvite} className="space-y-4 text-xs font-semibold text-slate-700">
                {/* Email Address */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Examiner Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="e.g. examiner.smith@board.org"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-655 bg-slate-50/50 text-slate-900 outline-none transition"
                    />
                  </div>
                </div>

                {/* University Selection (Only shown for Global Admin, hidden for coordinator) */}
                {userType === "admin" && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Assign University *</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select
                        required
                        value={inviteUniId}
                        onChange={(e) => {
                          setInviteUniId(e.target.value);
                          setInviteDeptId("");
                        }}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-655 bg-slate-50/50 text-slate-900 font-medium outline-none transition cursor-pointer appearance-none"
                      >
                        <option value="">Select University</option>
                        {universities.map((uni) => (
                          <option key={uni.universityId} value={uni.universityId}>
                            {uni.universityName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Department Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Assign Department</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      value={inviteDeptId}
                      onChange={(e) => setInviteDeptId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-655 bg-slate-50/50 text-slate-900 font-medium outline-none transition cursor-pointer appearance-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                      disabled={!(activeUniversityId || inviteUniId)}
                    >
                      <option value="">Select Department (Optional)</option>
                      {departments.map((dept) => (
                        <option key={dept.departmentId} value={dept.departmentId}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* System Role */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">System Role *</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      value={inviteUserType}
                      onChange={(e) => setInviteUserType(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-655 bg-slate-50/50 text-slate-900 font-medium outline-none transition cursor-pointer appearance-none"
                    >
                      {roles.filter(r => r.isActive).map((role) => {
                        if (role.roleName.toLowerCase() === 'admin' && userType !== 'admin') return null;
                        return (
                          <option key={role.roleId} value={role.roleName.toLowerCase()}>
                            {role.roleName}
                          </option>
                        );
                      })}
                      {roles.length === 0 && (
                        <>
                          <option value="examiner">Examiner</option>
                          <option value="coordinator">University Coordinator</option>
                          {userType === "admin" && <option value="admin">System Administrator</option>}
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                >
                  {inviteLoading ? (
                    <>
                      <Loader className="animate-spin" size={14} />
                      Dispatching Link...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Send Secure Invitation
                    </>
                  )}
                </button>
              </form>

              {generatedLink && (
                <div className="border-t border-slate-100 pt-4 animate-slide-up text-xs">
                  <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${emailStatus?.sent
                    ? "bg-emerald-50/40 border-emerald-100"
                    : "bg-amber-50/40 border-amber-100"
                  }`}>
                    <div>
                      <h4 className={`font-extrabold ${emailStatus?.sent ? "text-emerald-800" : "text-amber-800"}`}>
                        {emailStatus?.sent ? "✓ Link Dispatched Successfully" : "⚠ Secure Link Ready (Delivery Issue)"}
                      </h4>
                      <p className={`text-[10px] mt-0.5 leading-relaxed ${emailStatus?.sent ? "text-emerald-600" : "text-amber-600"}`}>
                        {emailStatus?.sent
                          ? "Email invite went through successfully! Copy link below as a backup if needed:"
                          : `Email transfer returned an SMTP error (${emailStatus?.error || "credentials"}). Copy and share the token link manually:`
                        }
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedLink}
                        className="flex-1 bg-white border border-slate-205 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-800 font-mono select-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className={`px-3 py-1.5 rounded-lg border flex items-center justify-center gap-1 transition text-[10px] font-bold ${copiedLink
                          ? "bg-emerald-650 border-emerald-650 text-white"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 cursor-pointer"
                        }`}
                      >
                        {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assign Role Modal */}
      {showAssignRoleModal && selectedUser && (
        <AssignRoleModal
          user={selectedUser}
          onClose={() => {
            setShowAssignRoleModal(false);
            setSelectedUser(null);
          }}
          onSubmit={async (roleId) => {
            const role = roles.find(r => r.roleId === roleId);
            const roleName = role ? role.roleName.toLowerCase() : 'examiner';
            try {
              await userService.updateUser(selectedUser.id, {
                userType: roleName,
                departmentId: selectedUser.departmentId,
                universityId: selectedUser.universityId
              });
              message.success("Role assigned successfully!");
              
              setShowAssignRoleModal(false);
              setSelectedUser(null);
              refreshUsers();
              
            } catch (err) {
              setError(err.message || "Failed to assign role.");
            }
          }}
        />
      )}

      {/* Add New User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={(msg) => {
          message.success(msg);
          
          refreshUsers();
          
        }}
        activeUniversityId={activeUniversityId}
      />
    </div>
  );
}
