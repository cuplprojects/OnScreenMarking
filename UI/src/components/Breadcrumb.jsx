import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { useBreadcrumb } from '../context/BreadcrumbContext';

/**
 * Breadcrumb — pill-style, clean design
 * Ancestors are plain text links; current page is a subtle pill badge.
 * No per-item icons; a single home icon only on the first item.
 */
export default function Breadcrumb() {
  const { breadcrumbs } = useBreadcrumb();

  // Only show when there's more than just the dashboard
  if (!breadcrumbs || breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 px-5 py-0 bg-zinc-50 border-b border-zinc-200"
      style={{ height: 'var(--breadcrumb-height)' }}
    >
      {breadcrumbs.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === breadcrumbs.length - 1;

        // Build full path with query params
        let fullPath = item.path;
        if (item.queryParams && Object.keys(item.queryParams).length > 0) {
          fullPath = `${item.path}?${new URLSearchParams(item.queryParams).toString()}`;
        }

        return (
          <div key={index} className="flex items-center gap-1">
            {/* Separator */}
            {index > 0 && (
              <ChevronRight size={12} className="text-zinc-300 shrink-0" strokeWidth={2.5} />
            )}

            {isLast ? (
              /* Current page — subtle filled pill */
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-zinc-800 bg-zinc-200/70 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                {item.label}
              </span>
            ) : (
              /* Ancestor — plain link */
              <Link
                to={fullPath}
                className="flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-500 hover:text-amber-600 transition-colors whitespace-nowrap"
              >
                {isFirst && <Home size={11} strokeWidth={2.5} />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
