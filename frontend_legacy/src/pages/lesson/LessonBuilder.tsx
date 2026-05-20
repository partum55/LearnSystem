import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLesson, useAddLessonStep, useUpdateLesson } from '../../queries/useLessonQueries';
import { lessonsApi } from '../../api/lessons';
import { Layout } from '../../components';
import { Loading } from '../../components';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import {
  BlockEditor,
  serializeCanonicalDocument,
  parseCanonicalDocument,
} from '../../features/editor-core';

const LessonBuilder: React.FC = () => {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: lesson, isLoading, refetch } = useLesson(lessonId);
  const addStep = useAddLessonStep();
  const updateLesson = useUpdateLesson();
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [showTitleEdit, setShowTitleEdit] = useState(false);

  if (isLoading) return <Layout><Loading /></Layout>;
  if (!lesson || !lessonId) return <Layout><div style={{ color: 'var(--text-muted)' }}>{t('lesson.notFound', 'Lesson not found')}</div></Layout>;

  const steps = lesson.steps || [];
  const selectedStep = selectedStepIndex !== null ? steps[selectedStepIndex] : null;

  const handleAddStep = async (blockType: 'TEXT' | 'QUIZ') => {
    try {
      await addStep.mutateAsync({
        lessonId,
        data: {
          blockType,
          title: blockType === 'TEXT'
            ? `${t('lesson.textStep', 'Text')} ${steps.length + 1}`
            : `${t('lesson.quizStep', 'Quiz')} ${steps.length + 1}`,
          content: blockType === 'TEXT' ? '' : '',
        },
      });
      await refetch();
      setSelectedStepIndex(steps.length);
    } catch (err) {
      console.error('Failed to add step', err);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await lessonsApi.deleteStep(lessonId, stepId);
      await refetch();
      setSelectedStepIndex(null);
    } catch (err) {
      console.error('Failed to delete step', err);
    }
  };

  const handleSaveStepContent = async (stepId: string, content: string) => {
    try {
      await lessonsApi.updateStep(lessonId, stepId, { content });
      await refetch();
    } catch (err) {
      console.error('Failed to save step content', err);
    }
  };

  const handleSaveTitle = async () => {
    try {
      await updateLesson.mutateAsync({
        id: lessonId,
        data: { title: editTitle, summary: editSummary },
      });
      setShowTitleEdit(false);
      await refetch();
    } catch (err) {
      console.error('Failed to update lesson', err);
    }
  };

  const handlePublish = async () => {
    try {
      await updateLesson.mutateAsync({
        id: lessonId,
        data: { isPublished: !lesson.isPublished },
      });
      await refetch();
    } catch (err) {
      console.error('Failed to toggle publish', err);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            {showTitleEdit ? (
              <div className="space-y-2">
                <input
                  type="text"
                  className="input text-xl font-bold"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t('lesson.titlePlaceholder', 'Lesson title')}
                />
                <input
                  type="text"
                  className="input text-sm w-full"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder={t('lesson.summaryPlaceholder', 'Summary (optional)')}
                />
                <div className="flex gap-2">
                  <button type="button" className="btn btn-primary btn-xs" onClick={handleSaveTitle}>
                    {t('common.save', 'Save')}
                  </button>
                  <button type="button" className="btn btn-xs" onClick={() => setShowTitleEdit(false)}>
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <h1
                className="text-2xl font-bold cursor-pointer"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                onClick={() => {
                  setEditTitle(lesson.title);
                  setEditSummary(lesson.summary || '');
                  setShowTitleEdit(true);
                }}
              >
                {lesson.title}
              </h1>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={handlePublish}>
              {lesson.isPublished
                ? t('common.unpublish', 'Unpublish')
                : t('common.publish', 'Publish')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Step list */}
          <div className="col-span-4">
            <div
              className="card p-4 space-y-2"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t('lesson.steps', 'Steps')} ({steps.length})
              </h3>

              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-center gap-2 p-2 rounded cursor-pointer group"
                  style={{
                    background: index === selectedStepIndex ? 'var(--bg-raised)' : 'transparent',
                    border: `1px solid ${index === selectedStepIndex ? 'var(--border-default)' : 'transparent'}`,
                  }}
                  onClick={() => setSelectedStepIndex(index)}
                >
                  {step.blockType === 'TEXT' ? (
                    <DocumentTextIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <QuestionMarkCircleIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {step.title || `Step ${index + 1}`}
                  </span>
                  <button
                    type="button"
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStep(step.id);
                    }}
                  >
                    <TrashIcon className="w-4 h-4" style={{ color: 'var(--fn-error)' }} />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-xs flex items-center gap-1"
                  onClick={() => handleAddStep('TEXT')}
                >
                  <PlusIcon className="w-3 h-3" />
                  {t('lesson.addText', 'Text')}
                </button>
                <button
                  type="button"
                  className="btn btn-xs flex items-center gap-1"
                  onClick={() => handleAddStep('QUIZ')}
                >
                  <PlusIcon className="w-3 h-3" />
                  {t('lesson.addQuiz', 'Quiz')}
                </button>
              </div>
            </div>
          </div>

          {/* Step editor */}
          <div className="col-span-8">
            {selectedStep ? (
              <div
                className="card p-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-raised)', color: 'var(--text-muted)' }}
                  >
                    {selectedStep.blockType}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {selectedStep.title}
                  </span>
                </div>

                {selectedStep.blockType === 'TEXT' ? (
                  <BlockEditor
                    value={parseCanonicalDocument(selectedStep.content)}
                    onChange={(doc) => {
                      const content = serializeCanonicalDocument(doc);
                      handleSaveStepContent(selectedStep.id, content);
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t('lesson.quizStepHint', 'Quiz questions are stored as JSON. Edit the step content with question data.')}
                    </p>
                    <textarea
                      className="input w-full font-mono text-sm"
                      rows={12}
                      defaultValue={JSON.stringify(selectedStep.questions, null, 2)}
                      onBlur={(e) => {
                        try {
                          const questions = JSON.parse(e.target.value);
                          lessonsApi.updateStep(lessonId, selectedStep.id, { questions });
                          refetch();
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                className="card p-8 text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                <p style={{ color: 'var(--text-muted)' }}>
                  {t('lesson.selectStep', 'Select a step to edit, or add a new one')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LessonBuilder;
