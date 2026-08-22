import { ChevronRight, Home, LayoutDashboard, Building2, Briefcase, BookOpen, Calendar, FileText, Layers, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBreadcrumb } from '../context/BreadcrumbContext';

const iconMap = {
  LayoutDashboard,
  Building2,
  Briefcase,
  BookOpen,
  Calendar,
  FileText,
  Layers,
  Users,
  Home,
};

/**
 * Breadcrumb component for navigation
 * Displays the path from Dashboard to current page
 */
export default function Breadcrumb() {
  const { breadcrumbs } = useBreadcrumb();

  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-[11px] px-6 lg:px-10 py-2.5 bg-white/60 backdrop-blur-md border-b border-gray-200 w-full" aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => {
        const IconComponent = iconMap[item.icon] || Home;
        const isLast = index === breadcrumbs.length - 1;
        
        // Build the path with query params if they exist
        let fullPath = item.path;
        if (item.queryParams && Object.keys(item.queryParams).length > 0) {
          const params = new URLSearchParams(item.queryParams).toString();
          fullPath = `${item.path}?${params}`;
        }

        return (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
            
            {isLast ? (
              <span className="flex items-center gap-2 text-gray-900 font-semibold whitespace-nowrap">
                <IconComponent className="w-4 h-4 text-blue-600" />
                {item.label}
              </span>
            ) : (
              <Link
                to={fullPath}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline transition-colors whitespace-nowrap"
              >
                <IconComponent className="w-4 h-4" />
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
