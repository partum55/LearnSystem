import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import api, { extractErrorMessage } from '../../api/client';
import { assignmentDocumentsApi } from '../../api/pages';
import { useWizardState } from './useWizardState';
import { apiResponseToWizardData, wizardDataToApiPayload } from './wizardMapper';
import { WizardFormData } from './wizardTypes';
import { wizardSlide } from '../../components/animation/variants';
import WizardStepIndicator from './WizardStepIndicator';
import TypeStep from './steps/TypeStep';
import ContentStep from './steps/ContentStep';
import ResourcesStep from './steps/ResourcesStep';
import SettingsStep from './steps/SettingsStep';
import GradingStep from './steps/GradingStep';
import ReviewStep from './steps/ReviewStep';
import { UnsavedChangesPrompt } from '../../components/common/UnsavedChangesPrompt';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { CanonicalDocument } from '../../types';
import { createEmptyDocument, createParagraphDocument, parseCanonicalDocument, serializeCanonicalDocument } from '../../features/editor-core/documentUtils';
import { QuestionDraft } from '../../features/authoring/types';

type UnknownRecord = Record<string, unknown>;

const normalizeDraftType = (value: unknown): QuestionDraft['type'] => {
  const normalized = String(value ?? '').toUpperCase();
  switch (normalized) {
    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE':
      return 'MCQ';
    case 'MULTIPLE_RESPONSE':
    case 'MULTI_SELECT':
      return 'MULTI_SELECT';
    case 'NUMERIC':
    case 'NUMERICAL':
      return 'NUMERIC';
    case 'LATEX':
      return 'LATEX';
    default:
      return 'OPEN_TEXT';
  }
};

const mapQuizToDraftQuestions = (quizRaw: UnknownRecord): QuestionDraft[] => {
  const quizQuestions = Array.isArray(quizRaw.questions) ? quizRaw.questions : [];

  return quizQuestions.map((entry, index) => {
    const row = (entry || {}) as UnknownRecord;
    const question = (row.question && typeof row.question === 'object' ? row.question : {}) as UnknownRecord;
    const type = normalizeDraftType(question.questionType);
    const stem = String(question.stem ?? '');
    const points = Number(question.points ?? 1);
    const optionsMap = (question.options && typeof question.options === 'object'
      ? question.options
      : {}) as UnknownRecord;
    const correctAnswer = (question.correctAnswer && typeof question.correctAnswer === 'object'
      ? question.correctAnswer
      : {}) as UnknownRecord;
    const choices = Array.isArray(optionsMap.choices)
      ? optionsMap.choices.map((item) => String(item ?? ''))
      : [];

    const base: QuestionDraft = {
      id: String(question.id ?? row.id ?? `q-${index + 1}`),
      type,
      prompt: serializeCanonicalDocument(createParagraphDocument(stem)),
      explanation: String(question.explanation ?? ''),
      points: Number.isFinite(points) && points > 0 ? points : 1,
      format: 'MARKDOWN',
      options: [],
      correctAnswer: undefined,
    };

    if (type === 'MCQ') {
      const correctChoice = String(correctAnswer.choice ?? correctAnswer.answer ?? '');
      base.options = choices.map((text, choiceIndex) => ({
        id: `${base.id}-o-${choiceIndex + 1}`,
        text: serializeCanonicalDocument(createParagraphDocument(text)),
        isCorrect: text === correctChoice,
        format: 'MARKDOWN',
      }));
    } else if (type === 'MULTI_SELECT') {
      const correctChoices = Array.isArray(correctAnswer.choices)
        ? correctAnswer.choices.map((item) => String(item ?? ''))
        : [];
      base.options = choices.map((text, choiceIndex) => ({
        id: `${base.id}-o-${choiceIndex + 1}`,
        text: serializeCanonicalDocument(createParagraphDocument(text)),
        isCorrect: correctChoices.includes(text),
        format: 'MARKDOWN',
      }));
    } else if (type === 'NUMERIC') {
      base.correctAnswer = String(correctAnswer.value ?? correctAnswer.answer ?? '');
    } else if (type === 'LATEX' || type === 'OPEN_TEXT') {
      base.correctAnswer = String(correctAnswer.answer ?? '');
    }

    return base;
  });
};

const AssignmentWizard: React.FC = () => {
  const params = useParams<{ id?: string; assignmentId?: string; courseId?: string; moduleId?: string }>();
  const assignmentId = params.assignmentId || params.id;
  const [searchParams] = useSearchParams();
  const courseId = params.courseId || searchParams.get('courseId') || '';
  const moduleId = params.moduleId || '';
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(undefined);
  const [templateDocument, setTemplateDocument] = useState<CanonicalDocument>(createEmptyDocument());
  const [initialTemplateSnapshot, setInitialTemplateSnapshot] = useState<string>(
    JSON.stringify(createEmptyDocument()),
  );

  const wizard = useWizardState(courseId, assignmentId);
  const reduced = useReducedMotion();
  const directionRef = useRef(1);
  const prevIndexRef = useRef(wizard.currentStepIndex);

  if (prevIndexRef.current !== wizard.currentStepIndex) {
    directionRef.current = wizard.currentStepIndex > prevIndexRef.current ? 1 : -1;
    prevIndexRef.current = wizard.currentStepIndex;
  }

  const {
    isPromptOpen,
    handleSaveAndLeave,
    handleLeaveWithoutSaving,
    handleStay,
  } = useUnsavedChangesWarning({
    isDirty:
      (wizard.isDirty || JSON.stringify(templateDocument) !== initialTemplateSnapshot) && !saving,
    message: t('assignment.unsavedEditorWarning', 'You have unsaved changes. Are you sure you want to leave?'),
  });

  // Load existing assignment in edit mode
  useEffect(() => {
    if (!assignmentId) return;
    const loadAssignment = async () => {
      try {
        setLoading(true);
        const [assignmentResponse, templateResponse] = await Promise.all([
          api.get<Record<string, unknown>>(`/assessments/assignments/${assignmentId}`),
          assignmentDocumentsApi.getTemplate(assignmentId).catch(() => null),
        ]);
        let wizardData = apiResponseToWizardData(assignmentResponse.data);

        const raw = assignmentResponse.data as UnknownRecord;
        const assignmentType = String(raw.assignmentType ?? raw.assignment_type ?? '');
        const rawQuizId = raw.quizId ?? raw.quiz_id ?? raw.quiz;
        if (assignmentType === 'QUIZ' && typeof rawQuizId === 'string' && rawQuizId) {
          try {
            const quizResponse = await api.get<UnknownRecord>(`/assessments/quizzes/${rawQuizId}`);
            const quizRaw = (quizResponse.data || {}) as UnknownRecord;
            const timerEnabled = Boolean(quizRaw.timerEnabled ?? (quizRaw.timeLimit !== null && quizRaw.timeLimit !== undefined));
            const attemptLimitEnabled = Boolean(quizRaw.attemptLimitEnabled ?? (quizRaw.attemptsAllowed !== null && quizRaw.attemptsAllowed !== undefined));

            wizardData = {
              ...wizardData,
              quiz_timer_enabled: timerEnabled,
              quiz_time_limit: timerEnabled ? Number(quizRaw.timeLimit ?? 20) : null,
              quiz_attempt_limit_enabled: attemptLimitEnabled,
              quiz_attempts_allowed: attemptLimitEnabled ? Number(quizRaw.attemptsAllowed ?? 1) : null,
              quiz_attempt_score_policy: String(quizRaw.attemptScorePolicy ?? 'HIGHEST') as WizardFormData['quiz_attempt_score_policy'],
              quiz_secure_session_enabled: Boolean(quizRaw.secureSessionEnabled),
              quiz_secure_require_fullscreen: quizRaw.secureRequireFullscreen === undefined ? true : Boolean(quizRaw.secureRequireFullscreen),
              quiz_questions: mapQuizToDraftQuestions(quizRaw),
            };
          } catch {
            // Keep base wizard data if quiz details fail to load.
          }
        }

        const rawTopicId = raw.topicId ?? raw.topic_id;
        if (typeof rawTopicId === 'string' && rawTopicId) {
          setSelectedTopicId(rawTopicId);
        }

        wizard.loadExisting(wizardData);
        if (templateResponse?.data?.document) {
          const parsedTemplate = parseCanonicalDocument(templateResponse.data.document);
          setTemplateDocument(parsedTemplate);
          setInitialTemplateSnapshot(JSON.stringify(parsedTemplate));
        } else {
          const emptyTemplate = createEmptyDocument();
          setTemplateDocument(emptyTemplate);
          setInitialTemplateSnapshot(JSON.stringify(emptyTemplate));
        }
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void loadAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  const handleSave = async (publish: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const payload = wizardDataToApiPayload(
        { ...wizard.formData, is_published: publish },
        courseId,
        moduleId,
      );
      if (selectedTopicId) {
        payload.topicId = selectedTopicId;
      }

      let savedAssignmentId = assignmentId;
      if (assignmentId) {
        const response = await api.put<Record<string, unknown>>(
          `/assessments/assignments/${assignmentId}`,
          payload,
        );
        savedAssignmentId = String(response.data.id ?? assignmentId);
      } else {
        const response = await api.post<Record<string, unknown>>('/assessments/assignments', payload);
        savedAssignmentId = String(response.data.id ?? '');
      }

      if (savedAssignmentId) {
        await assignmentDocumentsApi.upsertTemplate(savedAssignmentId, {
          document: templateDocument,
          schemaVersion: 1,
        });
      }

      wizard.clearDraft();
      setInitialTemplateSnapshot(JSON.stringify(templateDocument));

      if (courseId && moduleId) {
        navigate(`/courses/${courseId}`);
      } else if (courseId) {
        navigate(`/courses/${courseId}`);
      } else {
        navigate('/assignments');
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const navigateBack = () => {
    if (courseId) {
      navigate(`/courses/${courseId}`);
    } else {
      navigate('/assignments');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full" style={{ borderBottom: '2px solid var(--text-primary)' }} />
      </div>
    );
  }

  const renderStep = () => {
    switch (wizard.currentStep) {
      case 'type':
        return (
          <TypeStep
            value={wizard.formData.assignment_type}
            onChange={(type) => wizard.updateFormData({ assignment_type: type })}
          />
        );
      case 'content':
        return (
          <ContentStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            validationErrors={wizard.validationErrors}
            templateDocument={templateDocument}
            onTemplateChange={setTemplateDocument}
          />
        );
      case 'resources':
        return (
          <ResourcesStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            courseId={courseId}
            moduleId={moduleId}
          />
        );
      case 'settings':
        return (
          <SettingsStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            validationErrors={wizard.validationErrors}
            courseId={courseId}
            moduleId={moduleId}
            topicId={selectedTopicId}
            onTopicChange={setSelectedTopicId}
          />
        );
      case 'grading':
        return (
          <GradingStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            validationErrors={wizard.validationErrors}
            courseId={courseId}
            moduleId={moduleId}
          />
        );
      case 'review':
        return (
          <ReviewStep
            formData={wizard.formData}
            onChange={wizard.updateFormData}
            onSaveDraft={() => void handleSave(false)}
            onPublish={() => void handleSave(true)}
            saving={saving}
          />
        );
    }
  };

  return (
    <>
      <UnsavedChangesPrompt
        isOpen={isPromptOpen}
        onSaveAndLeave={handleSaveAndLeave}
        onLeaveWithoutSaving={handleLeaveWithoutSaving}
        onStay={handleStay}
        isSaving={saving}
        title={t('assignment.unsavedChangesTitle', 'Unsaved Changes')}
        message={t('assignment.unsavedEditorWarning', 'You have unsaved changes. Are you sure you want to leave?')}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {assignmentId ? t('assignment.edit', 'Edit Assignment') : t('assignment.create_new', 'Create Assignment')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('wizard.subtitle', 'Follow the steps to configure your assignment')}
            </p>
          </div>
          <button
            type="button"
            onClick={navigateBack}
            className="btn btn-ghost text-sm"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mb-6 rounded-lg p-4"
            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
          >
            <p style={{ color: 'var(--fn-error)' }}>{error}</p>
          </div>
        )}

        {/* Step indicator */}
        <WizardStepIndicator
          currentStep={wizard.currentStep}
          onStepClick={wizard.goToStep}
        />

        {/* Step content */}
        <div
          className="rounded-lg p-6 overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
        >
          {reduced ? (
            renderStep()
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={wizard.currentStep}
                variants={wizardSlide(directionRef.current)}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Navigation buttons */}
        {wizard.currentStep !== 'review' && (
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={wizard.isFirstStep ? navigateBack : wizard.goBack}
              className="btn btn-secondary px-6 py-2.5"
            >
              {wizard.isFirstStep ? t('common.cancel', 'Cancel') : t('common.previous', 'Previous')}
            </button>
            <button
              type="button"
              onClick={wizard.goNext}
              className="btn btn-primary px-6 py-2.5"
            >
              {t('common.next', 'Next')}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AssignmentWizard;
