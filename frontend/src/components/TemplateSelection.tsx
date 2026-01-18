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

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const fetchTemplates = async () => {
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
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('templates.selectTemplate')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('templates.selectTemplateHint')}
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-purple-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="text-left p-4 border border-gray-300 dark:border-gray-600 rounded-lg
                     hover:border-purple-500 hover:shadow-lg transition-all
                     bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {template.name}
              </h4>
              <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded">
                {template.category}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {template.description}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
              <span>⚡ {template.usageCount} {t('templates.uses')}</span>
              {template.averageRating > 0 && (
                <span>⭐ {template.averageRating.toFixed(1)}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Skip Button */}
      <div className="text-center pt-4">
        <button
          onClick={onSkip}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline"
        >
          {t('templates.skipAndWriteOwn')}
        </button>
      </div>
    </div>
  );
};

