import { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import { BreadcrumbProvider } from './context/BreadcrumbContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import ConfigLayout from './components/ConfigLayout';
import ProtectedRoute from './components/ProtectedRoute';
import MessageContainer from './components/MessageContainer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AcceptInvitation from './pages/AcceptInvitation';
import StudentPortal from './pages/StudentPortal';

import Scripts from './pages/Scripts';
import ExaminerMarking from './pages/ExaminerMarking';
import SectionConfig from './pages/SectionConfig';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

import AdminDashboard from './pages/AdminDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import ProjectDashboard from './pages/ProjectDashboard';

import UniversityManagement from './pages/UniversityManagement';
import CollegeManagement from './pages/CollegeManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import CourseManagement from './pages/CourseManagement';
import SubjectManagement from './pages/SubjectManagement';
import SessionProjectManagement from './pages/SessionProjectManagement';
import ProjectManagement from './pages/ProjectManagement';
import MasterPapersManagement from './pages/MasterPapersManagement';
import PapersManagement from './pages/PapersManagement';
import ImportPapers from './pages/ImportPapers';
import ImportQuestionPapers from './pages/ImportQuestionPapers';
import UsersManagement from './pages/UsersManagement';
import RoleManagement from './pages/RoleManagement';
import Attendance from './pages/Attendance';
import ScriptAllocation from './pages/ScriptAllocation';
import ScriptDeallocation from './pages/ScriptDeallocation';
import QuestionTypeMaster from './pages/QuestionTypeMaster';
import SectionMasterManagement from './pages/SectionMasterManagement';
import SubjectPaperRequests from './pages/SubjectPaperRequests';

function AppRoutes() {
  const { isAuthenticated, userType, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />} />
      <Route path="/accept-invitation" element={<AcceptInvitation />} />
      <Route path="/student-portal" element={<StudentPortal />} />

      {/* Main App Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          {/* Dynamic Home Redirect */}
          <Route 
            path="/" 
            element={
              !isAuthenticated
                ? <Navigate to="/login" replace />
                : userType === 'admin' 
                ? <Navigate to="/admin/dashboard" replace /> 
                : userType === 'coordinator' 
                ? <Navigate to="/coordinator/dashboard" replace /> 
                : <Home />
            } 
          />

          {/* Dashboard Routes */}
          <Route 
            path="/admin/dashboard" 
            element={userType === 'admin' ? <AdminDashboard /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/coordinator/dashboard" 
            element={userType === 'coordinator' ? <CoordinatorDashboard /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/project-dashboard" 
            element={userType === 'admin' ? <ProjectDashboard /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/project-dashboard" 
            element={userType === 'coordinator' ? <ProjectDashboard /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />

          {/* Dynamic Permission Guided Routes */}
          <Route 
            path="/admin/universities" 
            element={hasPermission("READ_UNIVERSITY") ? <UniversityManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/colleges" 
            element={hasPermission("READ_COLLEGE") ? <CollegeManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />

          {/* Config Layout Wrapper */}
          <Route element={<ConfigLayout />}>
            <Route 
              path="/admin/departments" 
              element={hasPermission("READ_DEPARTMENT") ? <DepartmentManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/departments" 
              element={hasPermission("READ_DEPARTMENT") ? <DepartmentManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/admin/courses" 
              element={hasPermission("READ_COURSE") ? <CourseManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/courses" 
              element={hasPermission("READ_COURSE") ? <CourseManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/admin/subjects" 
              element={hasPermission("READ_SUBJECT") ? <SubjectManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/subjects" 
              element={hasPermission("READ_SUBJECT") ? <SubjectManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/admin/master-papers" 
              element={hasPermission("READ_PAPER") ? <MasterPapersManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/master-papers" 
              element={hasPermission("READ_PAPER") ? <MasterPapersManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/admin/sessions" 
              element={hasPermission("READ_SESSION") || hasPermission("READ_PROJECT") ? <SessionProjectManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/sessions" 
              element={hasPermission("READ_SESSION") || hasPermission("READ_PROJECT") ? <SessionProjectManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/admin/section-masters" 
              element={hasPermission("MANAGE_SECTIONS") ? <SectionMasterManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/section-masters" 
              element={hasPermission("MANAGE_SECTIONS") ? <SectionMasterManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/admin/projects" 
              element={hasPermission("READ_PROJECT") ? <ProjectManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
            <Route 
              path="/projects" 
              element={hasPermission("READ_PROJECT") ? <ProjectManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
            />
          </Route>
          <Route 
            path="/admin/question-types" 
            element={hasPermission("MANAGE_QUESTIONS") ? <QuestionTypeMaster /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/question-types" 
            element={hasPermission("MANAGE_QUESTIONS") ? <QuestionTypeMaster /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />

          {/* Papers Management (Project Context) */}
          <Route 
            path="/admin/papers" 
            element={hasPermission("READ_PAPER") ? <PapersManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/papers" 
            element={hasPermission("READ_PAPER") ? <PapersManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/import-papers-from-project" 
            element={hasPermission("IMPORT_PAPERS") || hasPermission("CREATE_PAPER") ? <ImportPapers /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/import-papers-from-project" 
            element={hasPermission("IMPORT_PAPERS") || hasPermission("CREATE_PAPER") ? <ImportPapers /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/import-papers" 
            element={hasPermission("IMPORT_PAPERS") || hasPermission("CREATE_PAPER") ? <ImportPapers /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/import-papers" 
            element={hasPermission("IMPORT_PAPERS") || hasPermission("CREATE_PAPER") ? <ImportPapers /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/import-question-papers" 
            element={hasPermission("IMPORT_PAPERS") || hasPermission("UPDATE_PAPER") || hasPermission("CREATE_PAPER") ? <ImportQuestionPapers /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/import-question-papers" 
            element={hasPermission("IMPORT_PAPERS") || hasPermission("UPDATE_PAPER") || hasPermission("CREATE_PAPER") ? <ImportQuestionPapers /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/section-config" 
            element={hasPermission("MANAGE_SECTIONS") || hasPermission("READ_PAPER") ? <SectionConfig /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/section-config" 
            element={hasPermission("MANAGE_SECTIONS") || hasPermission("READ_PAPER") ? <SectionConfig /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />

          {/* Dynamic Permissions Controlled Routes */}
          <Route 
            path="/admin/users" 
            element={userType === 'admin' || userType === 'coordinator' || hasPermission("READ_USER") ? <UsersManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/role-management" 
            element={hasPermission("READ_ROLE") ? <RoleManagement /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/attendance" 
            element={userType === 'admin' || userType === 'coordinator' || hasPermission("READ_ATTENDANCE") || hasPermission("VIEW_LOGS") ? <Attendance /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/attendance" 
            element={userType === 'admin' || userType === 'coordinator' || hasPermission("READ_ATTENDANCE") || hasPermission("VIEW_LOGS") ? <Attendance /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/allocate-scripts" 
            element={hasPermission("READ_ALLOCATION") ? <ScriptAllocation /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/allocate-scripts" 
            element={hasPermission("READ_ALLOCATION") ? <ScriptAllocation /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/deallocate-scripts" 
            element={hasPermission("READ_ALLOCATION") ? <ScriptDeallocation /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/deallocate-scripts" 
            element={hasPermission("READ_ALLOCATION") ? <ScriptDeallocation /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/paper-requests" 
            element={userType === 'admin' || userType === 'coordinator' || hasPermission("READ_ALLOCATION") ? <SubjectPaperRequests /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/paper-requests" 
            element={userType === 'admin' || userType === 'coordinator' || hasPermission("READ_ALLOCATION") ? <SubjectPaperRequests /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/university-settings" 
            element={hasPermission("MANAGE_SETTINGS") ? <Navigate to="/settings" replace /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/university-settings" 
            element={hasPermission("MANAGE_SETTINGS") ? <Navigate to="/settings" replace /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/admin/assignment-types" 
            element={hasPermission("MANAGE_SETTINGS") ? <Navigate to="/settings" replace /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/assignment-types" 
            element={hasPermission("MANAGE_SETTINGS") ? <Navigate to="/settings" replace /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />


          {/* Examiner Routes */}
          <Route 
            path="/scripts" 
            element={hasPermission("READ_SCRIPT") ? <Scripts /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/marking/:scriptId" 
            element={hasPermission("READ_MARKING") ? <ExaminerMarking /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/marking" 
            element={hasPermission("READ_MARKING") ? <ExaminerMarking /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/reports" 
            element={hasPermission("VIEW_REPORTS") ? <Reports /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route 
            path="/settings" 
            element={hasPermission("MANAGE_SETTINGS") ? <Settings /> : isAuthenticated ? <Navigate to="/" replace /> : null} 
          />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
    </Routes>
  );
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <BreadcrumbProvider>
          <AppRoutes />
          <MessageContainer />
        </BreadcrumbProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

