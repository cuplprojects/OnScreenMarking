import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Bell, Settings, BookMarked, Menu, User, ChevronDown, Home, ChevronRight, UserCheck, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import userService from '../services/userService';
import NavDrawer from './NavDrawer';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, userType, universityId, hasPermission, logout } = useAuth();
  const { breadcrumbs } = useBreadcrumb();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileRef = useRef(null);

  // Pending Approvals Notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsRef = useRef(null);

  const canManageUsers = userType === 'admin' || userType === 'coordinator' || (typeof hasPermission === 'function' && hasPermission('READ_USER'));

  const fetchPendingApprovals = useCallback(async () => {
    if (!canManageUsers) return;
    try {
      setLoadingNotifications(true);
      const res = await userService.getPendingApprovals(userType === 'coordinator' ? universityId : null);
      if (res && res.success) {
        setPendingApprovals(res.items || []);
        setPendingCount(res.count ?? (res.items?.length || 0));
      } else if (Array.isArray(res)) {
        setPendingApprovals(res);
        setPendingCount(res.length);
      }
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
    } finally {
      setLoadingNotifications(false);
    }
  }, [canManageUsers, userType, universityId]);

  useEffect(() => {
    if (canManageUsers) {
      fetchPendingApprovals();
      const handleUpdate = () => fetchPendingApprovals();
      window.addEventListener('pending-approvals-updated', handleUpdate);
      const interval = setInterval(fetchPendingApprovals, 60000);
      return () => {
        window.removeEventListener('pending-approvals-updated', handleUpdate);
        clearInterval(interval);
      };
    }
  }, [canManageUsers, fetchPendingApprovals]);

  const confirmLogout = () => {
    setProfileOpen(false);
    setShowLogoutModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRequestClick = (req) => {
    setNotificationsOpen(false);
    const searchTarget = req.name || req.email || '';
    navigate(`/admin/users?tab=pending&search=${encodeURIComponent(searchTarget)}`);
  };

  const handleViewAllClick = () => {
    setNotificationsOpen(false);
    navigate('/admin/users?tab=pending');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <>
      <header
        style={{ height: 'var(--nav-height)' }}
        className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
      >
        {/* ── Left: Hamburger + Brand ── */}
        <div className="flex items-center gap-3">
          {/* Hamburger */}
          <button
            id="nav-drawer-toggle"
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-teal-700 hover:bg-teal-50 transition-all"
            aria-label="Open navigation menu"
            title="Menu"
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 select-none group"
            title="OSM Portal"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center shadow-sm group-hover:bg-teal-600 transition-colors">
              <BookMarked size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-none hidden sm:block">
              <span className="text-[13.5px] font-bold text-gray-900 tracking-tight">OSM Portal</span>
              <p className="text-[10px] text-gray-400 mt-[1px]">On-Screen Marking System</p>
            </div>
          </Link>

          {/* ── Breadcrumb next to Brand ── */}
          {breadcrumbs && breadcrumbs.length > 1 && (
            <div className="hidden md:flex items-center gap-3 ml-2">
              <div className="w-px h-5 bg-gray-200" />
              <nav aria-label="Breadcrumb" className="flex items-center gap-0">
                {breadcrumbs.slice(0, -1).map((item, index) => {
                  let fullPath = item.path;
                  if (item.queryParams && Object.keys(item.queryParams).length > 0) {
                    fullPath = `${item.path}?${new URLSearchParams(item.queryParams).toString()}`;
                  }
                  return (
                    <span key={index} className="flex items-center gap-0">
                      {index === 0 && (
                        <Home size={12} className="text-gray-400 shrink-0" strokeWidth={2.5} />
                      )}
                      <Link
                        to={fullPath}
                        className="text-xs font-medium text-gray-500 hover:text-teal-700 transition-colors whitespace-nowrap"
                      >
                        {item.label}
                      </Link>
                      <ChevronRight size={12} className="text-gray-300 shrink-0" strokeWidth={2.5} />
                    </span>
                  );
                })}
                <span className="text-xs font-bold text-gray-900 whitespace-nowrap bg-gray-100/50 px-2 py-0.5 rounded-md">
                  {breadcrumbs[breadcrumbs.length - 1].label}
                </span>
              </nav>
            </div>
          )}
        </div>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-1">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (!notificationsOpen) fetchPendingApprovals();
              }}
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                notificationsOpen
                  ? 'text-teal-700 bg-teal-50 ring-1 ring-teal-200'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/70'
              }`}
              title={canManageUsers ? `${pendingCount} Pending Approvals` : "Notifications"}
              aria-label="Pending approval notifications"
            >
              <Bell size={18} className={pendingCount > 0 ? 'text-teal-700' : ''} />
              {canManageUsers && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs ring-2 ring-white animate-pulse">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-150/80 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-teal-50/40 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                      <UserCheck size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 tracking-tight">Pending Approvals</h4>
                      <p className="text-[10px] text-gray-500 font-medium">Examiner registration requests</p>
                    </div>
                  </div>
                  {pendingCount > 0 && (
                    <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {pendingCount} Pending
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {loadingNotifications && pendingApprovals.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                      <Loader size={18} className="animate-spin text-teal-600" />
                      <span>Checking pending requests...</span>
                    </div>
                  ) : pendingApprovals.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-2.5">
                        <CheckCircle size={22} />
                      </div>
                      <p className="text-xs font-bold text-gray-800">No Pending Requests</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">All examiner accounts are approved.</p>
                    </div>
                  ) : (
                    pendingApprovals.map((req) => {
                      const reqInitials = req.name
                        ? req.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                        : 'U';
                      return (
                        <div
                          key={req.id}
                          onClick={() => handleRequestClick(req)}
                          className="p-3 hover:bg-teal-50/50 transition-colors flex items-center gap-3 cursor-pointer group"
                        >
                          {req.profileImage ? (
                            <img
                              src={req.profileImage}
                              alt={req.name}
                              className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center shrink-0 border border-teal-200/80 shadow-2xs">
                              {reqInitials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold text-gray-900 truncate group-hover:text-teal-800 transition-colors">
                                {req.name}
                              </p>
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded shrink-0">
                                Pending
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">{req.email}</p>
                            {req.universityName && (
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                {req.universityName}
                              </p>
                            )}
                          </div>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-teal-600 transition-colors shrink-0" />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {canManageUsers && (
                  <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 text-center">
                    <button
                      onClick={handleViewAllClick}
                      className="w-full py-1.5 px-3 text-xs font-bold text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Manage All Pending Approvals</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <Link
            to="/settings"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
            title="Settings"
          >
            <Settings size={17} />
          </Link>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 mx-1.5" />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2.5 pr-2 py-1.5 pl-1.5 rounded-lg hover:bg-gray-50 transition-all group focus:outline-none"
              title="Profile menu"
            >
              <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-[11px] font-bold text-white shadow-sm group-hover:bg-teal-600 transition-colors">
                {initials}
              </div>
              <div className="hidden sm:block leading-none text-left">
                <p className="text-[12.5px] font-semibold text-gray-800 truncate max-w-[130px]">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-gray-400 capitalize mt-[1px]">
                  {userType || 'examiner'}
                </p>
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-teal-700 transition-colors"
                >
                  <User size={16} />
                  My Profile
                </Link>
                <div className="h-px bg-gray-100 my-1 mx-2" />
                <button
                  onClick={confirmLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to log out of your account? You will need to sign in again to access the portal.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-bold text-sm transition-colors shadow-sm"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-out drawer */}
      <NavDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default Navbar;
