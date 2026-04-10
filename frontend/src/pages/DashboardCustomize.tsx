import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components';
import { DashboardBuilder, DashboardWidgetConfig } from '../components/DashboardBuilder';
import { Button } from '../components/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { DEFAULT_DASHBOARD_WIDGETS, DASHBOARD_WIDGETS_STORAGE_KEY } from '../constants/dashboard';
import { safeGetItem, safeSetItem } from '../utils/storage';

export const DashboardCustomize: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => {
    try {
      const saved = safeGetItem(DASHBOARD_WIDGETS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as DashboardWidgetConfig[]) : DEFAULT_DASHBOARD_WIDGETS;
    } catch {
      return DEFAULT_DASHBOARD_WIDGETS;
    }
  });

  const handleSave = (updatedWidgets: DashboardWidgetConfig[]) => {
    safeSetItem(DASHBOARD_WIDGETS_STORAGE_KEY, JSON.stringify(updatedWidgets));
    setWidgets(updatedWidgets);
    alert(t('dashboard.builder.saved', 'Dashboard layout saved successfully!'));
  };

  const handleReset = () => {
    if (window.confirm(t('dashboard.builder.resetConfirm', 'Reset to default layout?'))) {
      localStorage.removeItem(DASHBOARD_WIDGETS_STORAGE_KEY);
      setWidgets(DEFAULT_DASHBOARD_WIDGETS);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 mb-4">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {t('dashboard.customize', 'Customize Dashboard')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('dashboard.builder.pageDesc', 'Add, remove, and rearrange widgets.')}
          </p>
        </div>

        {/* Builder */}
        <div className="rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <DashboardBuilder widgets={widgets} onSave={handleSave} asModal={false} />
          <div className="mt-5 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <Button variant="danger" size="sm" onClick={handleReset}>
              {t('dashboard.builder.reset', 'Reset to Default')}
            </Button>
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {t('dashboard.builder.info', 'Changes are saved automatically')}
            </span>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-lg p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('dashboard.builder.preview', 'Preview')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {widgets
              .filter(w => w.visible)
              .sort((a, b) => a.order - b.order)
              .map((widget) => {
                const span = { small: 'md:col-span-1', medium: 'md:col-span-2', large: 'md:col-span-3', full: 'md:col-span-4' }[widget.size] || 'md:col-span-2';
                return (
                  <div
                    key={widget.id}
                    className={`col-span-1 ${span} p-3 rounded-md`}
                    style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-default)' }}
                  >
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{widget.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{widget.size}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardCustomize;
