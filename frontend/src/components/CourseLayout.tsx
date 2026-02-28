import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CourseSidebar } from './CourseSidebar';

interface CourseLayoutProps {
  courseId: string;
  children: React.ReactNode;
}

export const CourseLayout: React.FC<CourseLayoutProps> = ({ courseId, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courseSidebarOpen, setCourseSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        onCourseMenuClick={() => setCourseSidebarOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
        <CourseSidebar
          courseId={courseId}
          isOpen={courseSidebarOpen}
          onClose={() => setCourseSidebarOpen(false)}
        />
      </div>
    </div>
  );
};
