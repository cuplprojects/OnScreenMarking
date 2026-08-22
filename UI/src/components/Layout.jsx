import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Breadcrumb from './Breadcrumb';

const Layout = () => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        {/* Main Workspace Area */}
        <main className="flex-1 overflow-x-hidden w-full max-w-[100vw] flex flex-col">
          <Breadcrumb />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
