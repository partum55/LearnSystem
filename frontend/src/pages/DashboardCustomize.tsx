import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { DashboardBuilder, DashboardWidgetConfig } from '../components/DashboardBuilder';
import { Button } from '../components/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'stats-1', type: 'stats', title: 'Statistics Overview', visible: true, order: 0, size: 'full' },
  { id: 'courses-1', type: 'courses', title: 'My Courses', visible: true, order: 1, size: 'medium' },
  { id: 'deadlines-1', type: 'deadlines', title: 'Upcoming Deadlines', visible: true, order: 2, size: 'medium' },
  { id: 'notifications-1', type: 'notifications', title: 'Recent Activity', visible: true, order: 3, size: 'medium' },
];

export const DashboardCustomize: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardConfig();
  }, []);

  const loadDashboardConfig = () => {
    try {
      const saved = localStorage.getItem('dashboardWidgets');
      if (saved) {
        setWidgets(JSON.parse(saved));
      } else {
        setWidgets(DEFAULT_WIDGETS);
      }
    } catch (error) {
      console.error('Failed to load dashboard config:', error);
      setWidgets(DEFAULT_WIDGETS);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (updatedWidgets: DashboardWidgetConfig[]) => {
    try {
      localStorage.setItem('dashboardWidgets', JSON.stringify(updatedWidgets));
      setWidgets(updatedWidgets);
      // Show success message
      alert(t('dashboard.builder.saved', 'Dashboard layout saved successfully!'));
    } catch (error) {
      console.error('Failed to save dashboard config:', error);
      alert(t('dashboard.builder.saveFailed', 'Failed to save dashboard layout'));
    }
  };

  const handleReset = () => {
    if (window.confirm(t('dashboard.builder.resetConfirm', 'Are you sure you want to reset to default layout?'))) {
      localStorage.removeItem('dashboardWidgets');
      setWidgets(DEFAULT_WIDGETS);
      alert(t('dashboard.builder.resetSuccess', 'Dashboard reset to default layout'));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  {t('common.back', 'Back')}
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('dashboard.customize', 'Customize Dashboard')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('dashboard.builder.pageDesc', 'Personalize your dashboard by adding, removing, and rearranging widgets. Drag widgets to reorder them.')}
              </p>
            </div>

            {/* Builder Component */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <DashboardBuilder widgets={widgets} onSave={handleSave} asModal={false} />

              {/* Additional Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <Button
                  variant="secondary"
                  onClick={handleReset}
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {t('dashboard.builder.reset', 'Reset to Default')}
                </Button>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('dashboard.builder.info', 'Changes are saved automatically')}
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('dashboard.builder.preview', 'Preview')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('dashboard.builder.previewDesc', 'This is how your dashboard will look:')}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {widgets
                  .filter(w => w.visible)
                  .sort((a, b) => a.order - b.order)
                  .map((widget) => {
                    const getColSpan = (size: string) => {
                      switch (size) {
                        case 'small': return 'md:col-span-1';
                        case 'medium': return 'md:col-span-2';
                        case 'large': return 'md:col-span-3';
                        case 'full': return 'md:col-span-4';
                        default: return 'md:col-span-2';
                      }
                    };

                    return (
                      <div
                        key={widget.id}
                        className={`col-span-1 ${getColSpan(widget.size)} p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600`}
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {widget.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {widget.size}
                        </div>
                      </div>
                    );
                  })}
              </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardCustomize;

