import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import './i18n/config';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import CourseCreate from './pages/CourseCreate';
import Assignments from './pages/Assignments';
import Grades from './pages/Grades';
import Profile from './pages/Profile';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const { isAuthenticated, fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !isAuthenticated) {
      fetchCurrentUser();
    }
  }, [fetchCurrentUser, isAuthenticated]);

  // Apply theme from localStorage on mount
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/login" element={<Login />} />
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
          path="/grades"
          element={
            <PrivateRoute>
              <Grades />
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
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
