import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './api/queryClient';
import { useAuthStore } from './store/authStore';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { UserRole } from './types';
import './i18n/config';

// Loading component for lazy-loaded routes
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-label="Loading page"></div>
  </div>
);

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CourseList = lazy(() => import('./pages/CourseList'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const CourseCreate = lazy(() => import('./pages/CourseCreate'));
const Assignments = lazy(() => import('./pages/Assignments'));
const AssignmentDetail = lazy(() => import('./pages/AssignmentDetail'));
const AssignmentEditor = lazy(() => import('./pages/AssignmentEditor'));
const SubmitAssignment = lazy(() => import('./pages/SubmitAssignment'));
const StudentGradebook = lazy(() => import('./pages/StudentGradebook'));
const SpeedGrader = lazy(() => import('./pages/SpeedGrader'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const AllGrades = lazy(() => import('./pages/AllGrades').then(m => ({ default: m.AllGrades })));
const Profile = lazy(() => import('./pages/Profile'));
const QuizTaking = lazy(() => import('./pages/QuizTaking'));
const QuizResults = lazy(() => import('./pages/QuizResults'));
const QuizDetail = lazy(() => import('./pages/QuizDetail'));
const QuizBuilder = lazy(() => import('./pages/QuizBuilder'));
const DashboardCustomize = lazy(() => import('./pages/DashboardCustomize'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const VirtualLab = lazy(() => import('./pages/VirtualLab'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Private route wrapper with auth check
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const RoleRoute: React.FC<{ children: React.ReactNode; allowedRoles: UserRole[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/login" />;
  }
  return allowedRoles.includes(user.role) ? <>{children}</> : <Navigate to="/dashboard" />;
};

// Wrapper for lazy routes with Suspense
const LazyRoute: React.FC<{ children: React.ReactNode; isPrivate?: boolean }> = ({
  children,
  isPrivate = false
}) => {
  const content = (
    <Suspense fallback={<PageLoader />}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </Suspense>
  );

  return isPrivate ? <PrivateRoute>{content}</PrivateRoute> : content;
};

const AppOptimized: React.FC = () => {
  const { fetchCurrentUser, isLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    const initializeAuth = async () => {
      await fetchCurrentUser();
      setIsInitialized(true);
    };
    initializeAuth();
  }, [fetchCurrentUser]);

  // Apply theme from localStorage on mount
  React.useEffect(() => {
    const theme = (localStorage.getItem('theme') || 'light') as 'light' | 'dark';
    const lang = (localStorage.getItem('language') || 'uk') as 'en' | 'uk';

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr';
  }, []);

  // Show loading spinner while initializing
  if (!isInitialized || isLoading) {
    return <PageLoader />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login" element={<LazyRoute><Login /></LazyRoute>} />
            <Route path="/register" element={<LazyRoute><Register /></LazyRoute>} />

            <Route path="/dashboard" element={<LazyRoute isPrivate><Dashboard /></LazyRoute>} />
            <Route path="/dashboard/customize" element={<LazyRoute isPrivate><DashboardCustomize /></LazyRoute>} />

            <Route path="/courses" element={<LazyRoute isPrivate><CourseList /></LazyRoute>} />
            <Route path="/courses/create" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'SUPERADMIN']}>
                  <CourseCreate />
                </RoleRoute>
              </LazyRoute>
            } />
            <Route path="/courses/:id" element={<LazyRoute isPrivate><CourseDetail /></LazyRoute>} />

            <Route path="/calendar" element={<LazyRoute isPrivate><CalendarPage /></LazyRoute>} />

            <Route path="/assignments" element={<LazyRoute isPrivate><Assignments /></LazyRoute>} />
            <Route path="/assignments/:id" element={<LazyRoute isPrivate><AssignmentDetail /></LazyRoute>} />
            <Route path="/assignments/:id/edit" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'TA', 'SUPERADMIN']}>
                  <AssignmentEditor />
                </RoleRoute>
              </LazyRoute>
            } />
            <Route path="/assignments/:id/submit" element={<LazyRoute isPrivate><SubmitAssignment /></LazyRoute>} />

            <Route path="/grades" element={<LazyRoute isPrivate><AllGrades /></LazyRoute>} />
            <Route path="/gradebook" element={<LazyRoute isPrivate><StudentGradebook /></LazyRoute>} />
            <Route path="/speed-grader" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'TA', 'SUPERADMIN']}>
                  <SpeedGrader />
                </RoleRoute>
              </LazyRoute>
            } />

            <Route path="/question-bank" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'TA', 'SUPERADMIN']}>
                  <QuestionBank />
                </RoleRoute>
              </LazyRoute>
            } />

            <Route path="/quiz/:id" element={<LazyRoute isPrivate><QuizDetail /></LazyRoute>} />
            <Route path="/quiz/:id/take" element={<LazyRoute isPrivate><QuizTaking /></LazyRoute>} />
            <Route path="/quiz/:id/results" element={<LazyRoute isPrivate><QuizResults /></LazyRoute>} />
            <Route path="/quiz-builder" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'TA', 'SUPERADMIN']}>
                  <QuizBuilder />
                </RoleRoute>
              </LazyRoute>
            } />

            <Route path="/profile" element={<LazyRoute isPrivate><Profile /></LazyRoute>} />
            <Route path="/profile/settings" element={<LazyRoute isPrivate><ProfileSettings /></LazyRoute>} />

            <Route path="/virtual-lab" element={<LazyRoute isPrivate><VirtualLab /></LazyRoute>} />

            <Route path="/admin" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['SUPERADMIN']}>
                  <AdminDashboard />
                </RoleRoute>
              </LazyRoute>
            } />
          </Routes>
        </main>
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default AppOptimized;
