import React from 'react';
import { Outlet } from 'react-router-dom';
import UniversityConfigHeader from './UniversityConfigHeader';

export default function ConfigLayout() {
  return (
    <div className="w-full">
      <div className="w-full">
        <UniversityConfigHeader />
      </div>
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
}
