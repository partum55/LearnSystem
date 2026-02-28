import React from 'react';
import { TFunction } from 'i18next';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader } from '../../components';
import { Course } from '../../types';
import {
  Question,
  Quiz,
  QuizBuilderTab,
  QUIZ_QUESTION_TYPE_OPTIONS,
  QUIZ_SETTINGS_TOGGLE_OPTIONS,
} from './quizBuilderModel';
import { QuizQuestionEditor } from './QuizQuestionEditor';

interface ModuleSummary {
  id: string;
  title: string;
}

interface QuizBuilderTabContentProps {
  activeTab: QuizBuilderTab;
  quiz: Quiz;
  courses: Course[];
  modules: ModuleSummary[];
  selectedModuleId: string;
  setSelectedModuleId: (id: string) => void;
  isEditing: boolean;
  totalPoints: number;
  setQuiz: React.Dispatch<React.SetStateAction<Quiz>>;
  addQuestion: (type?: Question['question_type']) => void;
  moveQuestion: (index: number, direction: 'up' | 'down') => void;
  duplicateQuestion: (index: number) => void;
  removeQuestion: (index: number) => void;
  updateQuestion: (index: number, field: keyof Question, value: unknown) => void;
  addChoice: (questionIndex: number) => void;
  updateChoice: (questionIndex: number, choiceIndex: number, value: string) => void;
  removeChoice: (questionIndex: number, choiceIndex: number) => void;
  toggleCorrectAnswer: (questionIndex: number, choice: string) => void;
  t: TFunction;
}

export const QuizBuilderTabContent: React.FC<QuizBuilderTabContentProps> = ({
  activeTab,
  quiz,
  courses,
  modules,
  selectedModuleId,
  setSelectedModuleId,
  isEditing,
  totalPoints,
  setQuiz,
  addQuestion,
  moveQuestion,
  duplicateQuestion,
  removeQuestion,
  updateQuestion,
  addChoice,
  updateChoice,
  removeChoice,
  toggleCorrectAnswer,
  t,
}) => {
  const addSection = () => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      sections: [
        ...previousQuiz.sections,
        {
          title: `Section ${previousQuiz.sections.length + 1}`,
          position: previousQuiz.sections.length,
          question_count: 0,
          rules: [],
        },
      ],
    }));
  };

  const updateSection = (
    sectionIndex: number,
    field: 'title' | 'position' | 'question_count',
    value: string | number
  ) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      sections: previousQuiz.sections.map((section, idx) =>
        idx === sectionIndex ? { ...section, [field]: value } : section
      ),
    }));
  };

  const removeSection = (sectionIndex: number) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      sections: previousQuiz.sections.filter((_, idx) => idx !== sectionIndex),
    }));
  };

  const addRule = (sectionIndex: number) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      sections: previousQuiz.sections.map((section, idx) =>
        idx === sectionIndex
          ? {
              ...section,
              rules: [...section.rules, { quota: 1 }],
            }
          : section
      ),
    }));
  };

  const updateRule = (
    sectionIndex: number,
    ruleIndex: number,
    field: 'question_type' | 'difficulty' | 'tag' | 'quota',
    value: string | number
  ) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      sections: previousQuiz.sections.map((section, sIdx) =>
        sIdx === sectionIndex
          ? {
              ...section,
              rules: section.rules.map((rule, rIdx) =>
                rIdx === ruleIndex ? { ...rule, [field]: value } : rule
              ),
            }
          : section
      ),
    }));
  };

  const removeRule = (sectionIndex: number, ruleIndex: number) => {
    setQuiz((previousQuiz) => ({
      ...previousQuiz,
      sections: previousQuiz.sections.map((section, idx) =>
        idx === sectionIndex
          ? { ...section, rules: section.rules.filter((_, rIdx) => rIdx !== ruleIndex) }
          : section
      ),
    }));
  };

  if (activeTab === 'basic') {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('quiz.basicInfo', 'Basic Information')}
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            <div>
              <label className="label">
                {t('quiz.title', 'Quiz Title')} *
              </label>
              <input
                type="text"
                value={quiz.title}
                onChange={(event) => setQuiz((previousQuiz) => ({ ...previousQuiz, title: event.target.value }))}
                className="input w-full"
                placeholder={t('quiz.titlePlaceholder', 'Enter quiz title')}
                required
              />
            </div>

            <div>
              <label className="label">
                {t('quiz.description', 'Description')}
              </label>
              <textarea
                value={quiz.description}
                onChange={(event) => setQuiz((previousQuiz) => ({ ...previousQuiz, description: event.target.value }))}
                rows={3}
                className="input w-full"
                placeholder={t('quiz.descriptionPlaceholder', 'Enter quiz description')}
              />
            </div>

            <div>
              <label className="label">
                {t('quiz.instructions', 'Instructions for Students')}
              </label>
              <textarea
                value={quiz.instructions || ''}
                onChange={(event) => setQuiz((previousQuiz) => ({ ...previousQuiz, instructions: event.target.value }))}
                rows={4}
                className="input w-full"
                placeholder={t('quiz.instructionsPlaceholder', 'Enter special instructions or notes for students')}
              />
            </div>

            <div>
              <label className="label">
                {t('quiz.course', 'Course')} *
              </label>
              <select
                value={quiz.course || ''}
                onChange={(event) => setQuiz((previousQuiz) => ({ ...previousQuiz, course: event.target.value }))}
                className="input w-full"
                required
              >
                <option value="">{t('quiz.selectCourse', 'Select a course')}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </div>

            {!isEditing && (
              <div>
                <label className="label">
                  {t('modules.module', 'Module')} *
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(event) => setSelectedModuleId(event.target.value)}
                  className="input w-full"
                  required
                  disabled={!quiz.course}
                >
                  <option value="">{t('modules.selectModule', 'Select module')}</option>
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>{module.title}</option>
                  ))}
                </select>
                {!quiz.course && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t('quiz.selectCourseFirst', 'Select a course first to see available modules')}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  {t('quiz.availableFrom', 'Available From')}
                </label>
                <input
                  type="datetime-local"
                  value={quiz.available_from || ''}
                  onChange={(event) => setQuiz((previousQuiz) => ({ ...previousQuiz, available_from: event.target.value }))}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="label">
                  {t('quiz.availableUntil', 'Available Until')}
                </label>
                <input
                  type="datetime-local"
                  value={quiz.available_until || ''}
                  onChange={(event) => setQuiz((previousQuiz) => ({ ...previousQuiz, available_until: event.target.value }))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (activeTab === 'questions') {
    return (
      <div>
        <div className="mb-6 rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('quiz.questions', 'Questions')} ({quiz.questions.length})
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('quiz.totalPoints', 'Total Points')}: {totalPoints}
              </p>
            </div>
            <div className="flex gap-2">
              <select
                onChange={(event) => {
                  addQuestion(event.target.value as Question['question_type']);
                  event.target.value = '';
                }}
                className="input"
                defaultValue=""
              >
                <option value="" disabled>
                  {t('quiz.addQuestion', 'Add Question')}...
                </option>
                {QUIZ_QUESTION_TYPE_OPTIONS.map((typeOption) => (
                  <option key={typeOption.value} value={typeOption.value}>
                    {t(typeOption.labelKey, typeOption.defaultLabel)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {quiz.questions.length === 0 ? (
          <Card>
            <CardBody>
              <div className="py-12 text-center">
                <CheckCircleIcon className="mx-auto mb-4 h-16 w-16" style={{ color: 'var(--text-muted)' }} />
                <p className="mb-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  {t('quiz.noQuestions', 'No questions yet. Select a question type to get started.')}
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {quiz.questions.map((question, index) => (
              <QuizQuestionEditor
                key={index}
                question={question}
                index={index}
                totalQuestions={quiz.questions.length}
                t={t}
                moveQuestion={moveQuestion}
                duplicateQuestion={duplicateQuestion}
                removeQuestion={removeQuestion}
                updateQuestion={updateQuestion}
                addChoice={addChoice}
                updateChoice={updateChoice}
                removeChoice={removeChoice}
                toggleCorrectAnswer={toggleCorrectAnswer}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('quiz.timingSettings', 'Timing & Attempts')}
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">
                  {t('quiz.timeLimit', 'Time Limit (minutes)')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={quiz.time_limit || ''}
                  onChange={(event) =>
                    setQuiz((previousQuiz) => ({
                      ...previousQuiz,
                      time_limit: parseInt(event.target.value, 10) || undefined,
                    }))
                  }
                  className="input w-full"
                  placeholder={t('quiz.noTimeLimit', 'No limit')}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('quiz.timeLimitHint', 'Leave empty for no time limit')}
                </p>
              </div>

              <div>
                <label className="label">
                  {t('quiz.attemptsAllowed', 'Attempts Allowed')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={quiz.attempts_allowed}
                  onChange={(event) =>
                    setQuiz((previousQuiz) => ({
                      ...previousQuiz,
                      attempts_allowed: parseInt(event.target.value, 10) || 1,
                    }))
                  }
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="label">
                {t('quiz.passingScore', 'Passing Score (%)')}
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={quiz.passing_score || ''}
                onChange={(event) =>
                  setQuiz((previousQuiz) => ({
                    ...previousQuiz,
                    passing_score: parseInt(event.target.value, 10) || undefined,
                  }))
                }
                className="input w-full"
                placeholder="70"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {t('quiz.displaySettings', 'Display Settings')}
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <label className="label">
                {t('quiz.showResultsAfter', 'Show Results After')}
              </label>
              <select
                value={quiz.settings.show_results_after}
                onChange={(event) =>
                  setQuiz((previousQuiz) => ({
                    ...previousQuiz,
                    settings: {
                      ...previousQuiz.settings,
                      show_results_after: event.target.value as Quiz['settings']['show_results_after'],
                    },
                  }))
                }
                className="input w-full"
              >
                <option value="immediate">{t('quiz.immediate', 'Immediately')}</option>
                <option value="after_due">{t('quiz.afterDue', 'After due date')}</option>
                <option value="manual">{t('quiz.manual', 'Manual release')}</option>
              </select>
            </div>

            <div className="space-y-3">
              {QUIZ_SETTINGS_TOGGLE_OPTIONS.map((settingOption) => (
                <label key={settingOption.key} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={quiz.settings[settingOption.key]}
                    onChange={(event) =>
                      setQuiz((previousQuiz) => ({
                        ...previousQuiz,
                        settings: {
                          ...previousQuiz.settings,
                          [settingOption.key]: event.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded"
                    style={{ accentColor: 'var(--text-primary)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {t(settingOption.labelKey, settingOption.defaultLabel)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('quiz.sections', 'Randomization Sections')}
            </h2>
            <button
              type="button"
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
              onClick={addSection}
            >
              + {t('quiz.addSection', 'Add Section')}
            </button>
          </div>
        </CardHeader>
        <CardBody>
          {quiz.sections.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {t(
                'quiz.sectionsHint',
                'Optional. Define section quotas and rules to randomize question selection by type/difficulty/tag.'
              )}
            </p>
          ) : (
            <div className="space-y-4">
              {quiz.sections.map((section, sectionIndex) => (
                <div
                  key={`${section.id || 'new'}-${sectionIndex}`}
                  className="rounded-lg p-3"
                  style={{ border: '1px solid var(--border-default)' }}
                >
                  <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      className="input"
                      value={section.title}
                      onChange={(event) => updateSection(sectionIndex, 'title', event.target.value)}
                      placeholder={t('quiz.sectionTitle', 'Section title')}
                    />
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={section.position}
                      onChange={(event) => updateSection(sectionIndex, 'position', parseInt(event.target.value, 10) || 0)}
                      placeholder={t('quiz.position', 'Position')}
                    />
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={section.question_count}
                      onChange={(event) => updateSection(sectionIndex, 'question_count', parseInt(event.target.value, 10) || 0)}
                      placeholder={t('quiz.questionCount', 'Question count')}
                    />
                    <button
                      type="button"
                      className="px-3 py-2 rounded border"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--fn-error)' }}
                      onClick={() => removeSection(sectionIndex)}
                    >
                      {t('common.delete', 'Delete')}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {t('quiz.selectionRules', 'Selection Rules')}
                      </p>
                      <button
                        type="button"
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                        onClick={() => addRule(sectionIndex)}
                      >
                        + {t('quiz.addRule', 'Add Rule')}
                      </button>
                    </div>
                    {section.rules.map((rule, ruleIndex) => (
                      <div key={rule.id || `${sectionIndex}-${ruleIndex}`} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <select
                          className="input"
                          value={rule.question_type || ''}
                          onChange={(event) => updateRule(sectionIndex, ruleIndex, 'question_type', event.target.value)}
                        >
                          <option value="">{t('quiz.anyType', 'Any Type')}</option>
                          {QUIZ_QUESTION_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value.toUpperCase()}>
                              {t(option.labelKey, option.defaultLabel)}
                            </option>
                          ))}
                        </select>
                        <input
                          className="input"
                          value={rule.difficulty || ''}
                          onChange={(event) => updateRule(sectionIndex, ruleIndex, 'difficulty', event.target.value)}
                          placeholder={t('quiz.difficulty', 'Difficulty')}
                        />
                        <input
                          className="input"
                          value={rule.tag || ''}
                          onChange={(event) => updateRule(sectionIndex, ruleIndex, 'tag', event.target.value)}
                          placeholder={t('quiz.tag', 'Tag')}
                        />
                        <input
                          type="number"
                          min="1"
                          className="input"
                          value={rule.quota}
                          onChange={(event) => updateRule(sectionIndex, ruleIndex, 'quota', parseInt(event.target.value, 10) || 1)}
                          placeholder={t('quiz.quota', 'Quota')}
                        />
                        <button
                          type="button"
                          className="px-3 py-2 rounded border"
                          style={{ borderColor: 'var(--border-default)', color: 'var(--fn-error)' }}
                          onClick={() => removeRule(sectionIndex, ruleIndex)}
                        >
                          {t('common.delete', 'Delete')}
                        </button>
                      </div>
                    ))}
                    {section.rules.length === 0 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t('quiz.noRules', 'No rules yet. Section will pull random questions from the course pool.')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
