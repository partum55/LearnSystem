import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi, CourseTemplate } from '../api/ai';
import { Loading } from './Loading';
import {
  AcademicCapIcon,
  CalculatorIcon,
  LanguageIcon,
  BeakerIcon,
  BriefcaseIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface TemplateSelectionProps {
  onSelectTemplate: (template: CourseTemplate) => void;
  onSkip: () => void;
}

export const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  onSelectTemplate,
  onSkip,
}) => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<CourseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: t('templates.all'), icon: SparklesIcon },
    { id: 'programming', name: t('templates.programming'), icon: AcademicCapIcon },
    { id: 'math', name: t('templates.math'), icon: CalculatorIcon },
    { id: 'languages', name: t('templates.languages'), icon: LanguageIcon },
    { id: 'science', name: t('templates.science'), icon: BeakerIcon },
    { id: 'business', name: t('templates.business'), icon: BriefcaseIcon },
  ];

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        selectedCategory === 'all'
          ? await aiApi.templates.getAll()
          : await aiApi.templates.getByCategory(selectedCategory);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {t('templates.selectTemplate')}
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('templates.selectTemplateHint')}
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{
                background: isActive ? 'var(--bg-active)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${isActive ? 'var(--border-strong)' : 'var(--border-default)'}`,
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="text-left p-4 rounded-lg transition-all"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {template.name}
              </h4>
              <span
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}
              >
                {template.category}
              </span>
            </div>

            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
              {template.description}
            </p>

            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-faint)' }}>
              <span>{template.usageCount} {t('templates.uses')}</span>
              {template.averageRating > 0 && (
                <span>{template.averageRating.toFixed(1)}/5</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Skip Button */}
      <div className="text-center pt-4">
        <button
          onClick={onSkip}
          className="text-sm underline transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {t('templates.skipAndWriteOwn')}
        </button>
      </div>
    </div>
  );
};
