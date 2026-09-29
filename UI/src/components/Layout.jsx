import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

/**
 * Main app shell:
 *   [White top header — Navbar (has hamburger that opens NavDrawer + breadcrumb)]
 *   [Page content — Outlet]
 */
const Layout = () => {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: 'var(--font-sans)', backgroundColor: 'var(--color-surface)' }}
    >
      <Navbar />
      <main className="flex-1 overflow-x-hidden w-full max-w-[100vw]">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
