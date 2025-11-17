import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Layout,
  Card,
  CardHeader,
  CardBody,
  Button,
  AIAssistantPanel,
  AIContentEditor,
} from '../components';
import { SparklesIcon } from '@heroicons/react/24/outline';

/**
 * Example page showing AI integration
 * This demonstrates how to use AI components in your pages
 */
export const CourseWithAI: React.FC = () => {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [courseDescription, setCourseDescription] = useState(
    'Цей курс охоплює основи програмування на Python...'
  );

  const handleAIContentGenerated = (type: string, content: any) => {
    console.log('AI generated:', type, content);
    // Handle generated content (e.g., add modules, assignments, etc.)
    // You can dispatch actions to your store or make API calls here
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with AI Assistant Button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('course.title')}
            </h1>
            <Button onClick={() => setShowAIAssistant(!showAIAssistant)}>
              <SparklesIcon className="w-5 h-5 mr-2" />
              {t('ai.assistant')}
            </Button>
          </div>

          {/* Course Description with AI Editor */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('course.description')}
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {courseDescription}
              </p>

              {/* AI Content Editor Component */}
              <AIContentEditor
                entityType="COURSE"
                entityId={courseId || ''}
                currentContent={courseDescription}
                language="uk"
                onContentUpdated={(newContent) => {
                  setCourseDescription(newContent);
                  // Save to backend
                }}
              />
            </CardBody>
          </Card>

          {/* Example: Module with AI Editor */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Модуль 1: Основи Python
              </h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                У цьому модулі ви вивчите базовий синтаксис Python...
              </p>

              <AIContentEditor
                entityType="MODULE"
                entityId="module-123"
                currentContent="У цьому модулі ви вивчите базовий синтаксис Python..."
                language="uk"
                onContentUpdated={(newContent) => {
                  console.log('Updated module content:', newContent);
                }}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* AI Assistant Panel - Floating Side Panel */}
      <AIAssistantPanel
        courseId={courseId}
        moduleId="module-123" // Pass current module ID if applicable
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        onContentGenerated={handleAIContentGenerated}
      />
    </Layout>
  );
};

