import React from 'react';
import { CourseDetailTab, CourseDetailTabId } from './courseDetailModel';

interface CourseDetailTabsProps {
  tabs: CourseDetailTab[];
  activeTab: CourseDetailTabId;
  onTabChange: (tab: CourseDetailTabId) => void;
}

export const CourseDetailTabs: React.FC<CourseDetailTabsProps> = ({ tabs, activeTab, onTabChange }) => (
  <div className="mb-6" style={{ borderBottom: '1px solid var(--border-default)' }}>
    <nav className="flex space-x-8">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className="flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors"
          style={
            activeTab === tab.id
              ? { borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }
              : { borderColor: 'transparent', color: 'var(--text-muted)' }
          }
        >
          <tab.icon className="mr-2 h-5 w-5" />
          {tab.name}
        </button>
      ))}
    </nav>
  </div>
);
