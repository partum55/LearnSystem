import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './api/queryClient';
import { useAuthStore } from './store/authStore';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PageTransition } from './components/animation';
import { UserRole } from './types';
import './i18n/config';

// Loading component for lazy-loaded routes
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--text-muted)' }} aria-label="Loading page"></div>
  </div>
);

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CourseList = lazy(() => import('./pages/CourseList'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const ResourceView = lazy(() => import('./pages/course/resources/ResourceView'));
const CourseCreate = lazy(() => import('./pages/CourseCreate'));
const CourseEdit = lazy(() => import('./pages/CourseEdit'));
const Assignments = lazy(() => import('./pages/Assignments'));
const AssignmentDetail = lazy(() => import('./pages/AssignmentDetail'));
// Legacy editor kept for backward compatibility, wizard is the primary editor
const _AssignmentEditor = lazy(() => import('./pages/AssignmentEditor'));
void _AssignmentEditor;
const AssignmentWizard = lazy(() => import('./pages/assignment-wizard/AssignmentWizard'));
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
const DesignSystemDemo = lazy(() => import('./pages/DesignSystemDemo'));
const Landing = lazy(() => import('./pages/Landing'));

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
        <PageTransition>
          {children}
        </PageTransition>
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
      // Wait for Zustand persist hydration to complete before fetching.
      // This ensures persisted user/isAuthenticated state is available
      // as fallback if the API call fails (e.g., transient network error).
      if (!useAuthStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }
      await fetchCurrentUser();
      setIsInitialized(true);
    };
    initializeAuth();
  }, [fetchCurrentUser]);

  // Apply theme from localStorage on mount
  React.useEffect(() => {
    const raw = localStorage.getItem('theme') || 'obsidian';
    // Migrate legacy values
    const theme = raw === 'dark' ? 'obsidian' : raw === 'light' ? 'parchment' : raw;
    const lang = (localStorage.getItem('language') || 'uk') as 'en' | 'uk';

    if (theme === 'parchment') {
      document.documentElement.setAttribute('data-theme', 'parchment');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.add('dark');
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
            <Route path="/" element={<LazyRoute><Landing /></LazyRoute>} />
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
            <Route path="/courses/:id/edit" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'SUPERADMIN']}>
                  <CourseEdit />
                </RoleRoute>
              </LazyRoute>
            } />
            <Route path="/courses/:id" element={<LazyRoute isPrivate><CourseDetail /></LazyRoute>} />
            <Route path="/courses/:courseId/modules/:moduleId/resources/:resourceId" element={<LazyRoute isPrivate><ResourceView /></LazyRoute>} />
            <Route path="/courses/:courseId/modules/:moduleId/assignments/:assignmentId" element={<LazyRoute isPrivate><AssignmentDetail /></LazyRoute>} />
            <Route path="/courses/:courseId/modules/:moduleId/assignments/:assignmentId/edit" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'TA', 'SUPERADMIN']}>
                  <AssignmentWizard />
                </RoleRoute>
              </LazyRoute>
            } />
            <Route path="/courses/:courseId/modules/:moduleId/assignments/new" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'TA', 'SUPERADMIN']}>
                  <AssignmentWizard />
                </RoleRoute>
              </LazyRoute>
            } />
            <Route path="/courses/:courseId/modules/:moduleId/assignments/:assignmentId/submit" element={<LazyRoute isPrivate><SubmitAssignment /></LazyRoute>} />

            <Route path="/calendar" element={<LazyRoute isPrivate><CalendarPage /></LazyRoute>} />

            <Route path="/assignments" element={<LazyRoute isPrivate><Assignments /></LazyRoute>} />
            <Route path="/assignments/:id" element={<LazyRoute isPrivate><AssignmentDetail /></LazyRoute>} />
            <Route path="/assignments/:id/edit" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['TEACHER', 'TA', 'SUPERADMIN']}>
                  <AssignmentWizard />
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

            {/* Design System Demo Route - Only accessible in development or by admins */}
            <Route path="/design-system" element={
              <LazyRoute isPrivate>
                <RoleRoute allowedRoles={['SUPERADMIN']}>
                  <DesignSystemDemo />
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
