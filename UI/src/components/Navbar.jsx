import { useNavigate, Link, NavLink } from 'react-router-dom';
import { LogOut, User, Bell, BookOpen, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, userType, logout, hasPermission } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    const links = [];

    if (userType === 'admin') {
      links.push({ label: 'Dashboard', path: '/admin/dashboard' });
      links.push({ label: 'Universities', path: '/admin/universities' });
      links.push({ label: 'Colleges', path: '/admin/colleges' });
      links.push({ label: 'Question Types', path: '/admin/question-types' });
      if (hasPermission("READ_ROLE")) {
        links.push({ label: 'Roles', path: '/admin/role-management' });
      }
    } else if (userType === 'coordinator') {
      links.push({ label: 'Dashboard', path: '/coordinator/dashboard' });
      links.push({ label: 'Sessions & Projects', path: '/sessions' });
    } else if (userType === 'examiner') {
      links.push({ label: 'Dashboard', path: '/' });
      if (hasPermission("READ_SCRIPT")) {
        links.push({ label: 'Scripts', path: '/scripts' });
      }
      if (hasPermission("VIEW_REPORTS")) {
        links.push({ label: 'Reports', path: '/reports' });
      }
    }
    return links;
  };

  return (
    <nav className="h-16 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 flex items-center justify-between px-6 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
          <BookOpen className="text-blue-600" size={24} />
        </div>
        <div className="shrink-0">
          <span className="font-bold text-xl text-white">OSM Portal</span>
          <p className="text-xs text-blue-100">On-Screen Marking System</p>
        </div>
      </div>
      
      {/* Horizontal Nav Links in Middle */}
      <div className="hidden lg:flex flex-wrap items-center gap-1 mx-8 flex-1 justify-center">
        {getNavLinks().map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-white text-blue-700 shadow-md scale-105'
                  : 'text-blue-100 hover:bg-blue-500/50 hover:text-white'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      
      <div className="flex items-center gap-6 shrink-0">
        <Link to="/settings" className="p-2 text-white hover:bg-blue-500 rounded-full transition-colors" title="Settings">
          <Settings size={20} />
        </Link>
        <button className="p-2 text-white hover:bg-blue-500 rounded-full transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <Link to="/profile" className="flex items-center gap-3 border-l border-blue-400 pl-6 hover:opacity-90 transition-opacity" title="View My Profile">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform">
            <User size={20} className="text-white" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="text-xs text-blue-100 capitalize">{userType || 'examiner'}</p>
          </div>
        </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-white hover:bg-blue-500 px-3 py-1 rounded transition-colors ml-2"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
    </nav>
  );
};

export default Navbar;
