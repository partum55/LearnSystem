import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import './i18n/config';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import CourseCreate from './pages/CourseCreate';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import AssignmentEditor from './pages/AssignmentEditor';
import SubmitAssignment from './pages/SubmitAssignment';
import StudentGradebook from './pages/StudentGradebook';
import SpeedGrader from './pages/SpeedGrader';
import QuestionBank from './pages/QuestionBank';
import { AllGrades } from './pages/AllGrades';
import Profile from './pages/Profile';
import QuizTaking from './pages/QuizTaking';
import QuizResults from './pages/QuizResults';
import QuizDetail from './pages/QuizDetail';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const { isAuthenticated, fetchCurrentUser, isLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token && !isAuthenticated) {
        await fetchCurrentUser();
      }
      setIsInitialized(true);
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme from localStorage on mount
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Show loading spinner while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <PrivateRoute>
              <CourseList />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/create"
          element={
            <PrivateRoute>
              <CourseCreate />
            </PrivateRoute>
          }
        />
        <Route
          path="/courses/:id"
          element={
            <PrivateRoute>
              <CourseDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <PrivateRoute>
              <Assignments />
            </PrivateRoute>
          }
        />
        <Route
          path="/assignments/:assignmentId"
          element={
            <PrivateRoute>
              <AssignmentDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/speedgrader/:assignmentId"
          element={
            <PrivateRoute>
              <SpeedGrader />
            </PrivateRoute>
          }
        />
        <Route
          path="/quizzes/:quizId"
          element={
            <PrivateRoute>
              <QuizDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/quiz/:quizId"
          element={
            <PrivateRoute>
              <QuizTaking />
            </PrivateRoute>
          }
        />
        <Route
          path="/quiz/:quizId/attempt/:attemptId/results"
          element={
            <PrivateRoute>
              <QuizResults />
            </PrivateRoute>
          }
        />
        <Route
          path="/grades"
          element={
            <PrivateRoute>
              <AllGrades />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/question-bank"
          element={
            <PrivateRoute>
              <QuestionBank />
            </PrivateRoute>
          }
        />
        <Route
          path="/assignments/:assignmentId/editor"
          element={
            <PrivateRoute>
              <AssignmentEditor />
            </PrivateRoute>
          }
        />
        <Route
          path="/assignments/:assignmentId/submit"
          element={
            <PrivateRoute>
              <SubmitAssignment />
            </PrivateRoute>
          }
        />
        <Route
          path="/gradebook"
          element={
            <PrivateRoute>
              <StudentGradebook />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
