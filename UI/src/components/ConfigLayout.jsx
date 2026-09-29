import React from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import UniversityConfigHeader from './UniversityConfigHeader';
import { useAuth } from '../context/AuthContext';
import { ConfigHeaderProvider } from '../context/ConfigHeaderContext';
import { School, MousePointerClick } from 'lucide-react';

export default function ConfigLayout() {
  const [searchParams] = useSearchParams();
  const { userType, universityId: userUniversityId } = useAuth();

  const activeUniversityId =
    userType === 'coordinator'
      ? userUniversityId
      : searchParams.get('universityId');

  return (
    <ConfigHeaderProvider>
      <div className="w-full px-6 lg:px-10 pt-6 pb-12">
        {/* Combined header — university + page title + search + action */}
        <UniversityConfigHeader />

        {/* Page content — only renders when a university is selected */}
        {activeUniversityId ? (
          <Outlet />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
              <School size={28} className="text-teal-600" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-gray-800 mb-1">No University Selected</h3>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Use the dropdown above to select a university and configure its academic structure.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-teal-600 font-medium animate-bounce mt-1">
              <MousePointerClick size={13} />
              <span>Click the dropdown above to get started</span>
            </div>
          </div>
        )}
      </div>
    </ConfigHeaderProvider>
  );
}
