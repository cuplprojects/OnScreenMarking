import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Bell, Settings, BookMarked, Menu, User, ChevronDown, Home, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreadcrumb } from '../context/BreadcrumbContext';
import NavDrawer from './NavDrawer';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, userType, logout } = useAuth();
  const { breadcrumbs } = useBreadcrumb();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const profileRef = useRef(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          {/* Notifications */}
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
            title="Notifications"
          >
            <Bell size={17} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-teal-500 rounded-full ring-1 ring-white" />
          </button>

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
