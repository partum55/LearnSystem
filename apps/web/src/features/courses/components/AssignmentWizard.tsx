'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AssignmentDetailDto, AssignmentRequest } from '@/features/assignments/api/canonical.types';
import type { AssignmentType } from '@/features/courses/api/canonical.types';
import { RichContentEditor } from '@/features/rich-content/components/RichContentEditor';
import { RichContentRenderer } from '@/features/rich-content/components/RichContentRenderer';
import { 
  useCanonicalAssignment, 
  useCreateCanonicalAssignment, 
  useUpdateCanonicalAssignment 
} from '@/features/assignments/hooks/useAssignmentQueries';
import { Loading } from '@/components/Loading';
import { AiFeatureGate } from '@/features/ai/components/AiFeatureGate';
import { useAiTask } from '@/features/ai/hooks/useAiTask';
import { AiGenerationPreview } from '@/features/ai/components/AiGenerationPreview';
import { AiErrorDisplay } from '@/features/ai/components/AiErrorDisplay';

interface AssignmentWizardProps {
  courseId: string;
}

const STEPS = [
  { number: 1, label: 'Basics' },
  { number: 2, label: 'Instructions' },
  { number: 3, label: 'Type Settings' },
  { number: 4, label: 'Review & Publish' },
];

const ASSIGNMENT_TYPES: Array<{ value: AssignmentType; label: string }> = [
  { value: 'FILE_SUBMISSION', label: 'File Submission' },
  { value: 'TEXT_SUBMISSION', label: 'Text/RTE Submission' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'FORM', label: 'Form Feedback (In Dev)' },
  { value: 'VPL', label: 'Virtual Programming Lab (VPL)' },
  { value: 'SEMINAR', label: 'Seminar Attendance' },
];

export function AssignmentWizard({ courseId }: AssignmentWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentId = searchParams.get('assignmentId') || '';
  const moduleId = searchParams.get('moduleId') || '';

  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'generate' | 'improve' | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');

  const generateTask = useAiTask<{
    title: string;
    instructionsJson: unknown;
    type: string;
    maxPoints?: number;
    settings?: unknown;
  }>();

  const improveTask = useAiTask<{
    instructionsJson: unknown;
  }>();

  // Queries & Mutations
  const { data: initialData, isLoading: isInitialLoading } = useCanonicalAssignment(
    assignmentId || undefined
  );
  const createMutation = useCreateCanonicalAssignment();
  const updateMutation = useUpdateCanonicalAssignment();

  // Wizard State
  const [title, setTitle] = useState('');
  const [maxPoints, setMaxPoints] = useState(100);
  const [type, setType] = useState<AssignmentType>('FILE_SUBMISSION');
  const [dueDate, setDueDate] = useState('');
  const [order, setOrder] = useState(1);
  const [visible, setVisible] = useState(true);

  // Instructions RichContentDocument state
  const [instructionsJson, setInstructionsJson] = useState<any>({
    version: 1,
    blocks: [{ id: 'init', type: 'paragraph', data: { text: '' } }],
  });

  // Type specific states
  const [allowedFileTypes, setAllowedFileTypes] = useState('.pdf,.zip,.doc,.docx,.png,.jpg');
  const [maxFiles, setMaxFiles] = useState(1);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(10);
  const [allowResubmission, setAllowResubmission] = useState(true);

  const [minWords, setMinWords] = useState(0);
  const [maxWords, setMaxWords] = useState(1000);

  const [attemptLimit, setAttemptLimit] = useState(3);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);

  const [vplLanguage, setVplLanguage] = useState('python');
  const [vplRuntime, setVplRuntime] = useState('python3');
  const [vplTemplateCode, setVplTemplateCode] = useState('# Write your code here\n');

  // Populate data if in edit mode
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setMaxPoints(Number(initialData.maxPoints ?? 100));
      setType(initialData.type.toUpperCase() as AssignmentType);
      setOrder(1); // Default sequence placeholder
      setVisible(initialData.visibilityStatus !== 'HIDDEN');
      
      const initialDueDate = initialData.dueDate
        ? new Date(initialData.dueDate).toISOString().slice(0, 16)
        : '';
      setDueDate(initialDueDate);

      if (initialData.instructionsJson) {
        setInstructionsJson(initialData.instructionsJson);
      } else {
        setInstructionsJson({
          version: 1,
          blocks: [{ id: 'init', type: 'paragraph', data: { text: '' } }],
        });
      }

      const settings = (initialData.settings as any) || {};
      const currentType = initialData.type.toUpperCase();

      if (currentType === 'FILE_SUBMISSION') {
        setAllowedFileTypes(Array.isArray(settings.allowedFileTypes)
          ? settings.allowedFileTypes.join(',')
          : '.pdf,.zip,.doc,.docx,.png,.jpg');
        setMaxFiles(Number(settings.maxFiles ?? 1));
        setMaxFileSizeMb(Number(settings.maxFileSizeMb ?? 10));
        setAllowResubmission(settings.allowResubmission !== false);
      } else if (currentType === 'TEXT_SUBMISSION') {
        setMinWords(Number(settings.minWords ?? 0));
        setMaxWords(Number(settings.maxWords ?? 1000));
        setAllowResubmission(settings.allowResubmission !== false);
      } else if (currentType === 'QUIZ') {
        setAttemptLimit(Number(settings.attemptLimit ?? 3));
        setTimeLimitMinutes(Number(settings.timeLimitMinutes ?? 60));
      } else if (currentType === 'VPL') {
        setVplLanguage(String(settings.language ?? 'python'));
        setVplRuntime(String(settings.runtime ?? 'python3'));
        setVplTemplateCode(String(settings.templateCode ?? '# Write your code here\n'));
      }
    }
  }, [initialData]);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        setError('Assignment title is required.');
        return;
      }
      if (maxPoints < 0) {
        setError('Maximum points cannot be negative.');
        return;
      }
    }
    setError(null);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    setError(null);
    setSuccess(null);

    if (type === 'FORM') {
      setError('Form submissions are currently in development. Please select another submission type.');
      return;
    }

    try {
      const payload: AssignmentRequest = {
        title: title.trim(),
        instructionsJson,
        type,
        maxPoints: Number(maxPoints),
        order: Number(order),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        visible,
      };

      const currentType = type.toUpperCase();
      if (currentType === 'FILE_SUBMISSION') {
        payload.fileSettings = {
          allowedFileTypes: allowedFileTypes.split(',').map((t) => t.trim()).filter(Boolean),
          maxFiles: Number(maxFiles),
          maxFileSizeMb: Number(maxFileSizeMb),
          allowResubmission,
        };
      } else if (currentType === 'TEXT_SUBMISSION') {
        payload.rteSettings = {
          minWords: Number(minWords),
          maxWords: Number(maxWords),
          allowResubmission,
        };
      } else if (currentType === 'QUIZ') {
        payload.quizSettings = {
          attemptLimit: Number(attemptLimit),
          timeLimitMinutes: Number(timeLimitMinutes),
        };
      } else if (currentType === 'VPL') {
        payload.vplSettings = {
          language: vplLanguage,
          runtime: vplRuntime,
          templateCode: vplTemplateCode,
        };
      }

      if (assignmentId) {
        await updateMutation.mutateAsync({
          assignmentId,
          request: payload,
        });
        setSuccess('Assignment updated successfully.');
      } else {
        if (!moduleId) {
          setError('Module context parameter (moduleId) is missing.');
          return;
        }
        await createMutation.mutateAsync({
          courseId,
          moduleId,
          request: payload,
        });
        setSuccess('Assignment created successfully.');
      }

      setTimeout(() => {
        router.push(`/courses/${courseId}`);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'An error occurred during submission.');
    }
  };

  if (assignmentId && isInitialLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loading label="Loading assignment config" />
      </div>
    );
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Header & Back Action */}
      <div className="flex flex-col space-y-2 border-b border-[var(--border-default)] pb-4">
        <div>
          <button
            onClick={() => router.push(`/courses/${courseId}`)}
            className="group inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider"
          >
            <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Cancel and Return
          </button>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {assignmentId ? 'Assignment Workspace Wizard: Edit' : 'Assignment Workspace Wizard: Create'}
        </h1>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Follow the step configuration sequence to structure your syllabus learning assignment parameters.
        </p>
      </div>

      {/* Step Progress Indicators */}
      <div className="grid grid-cols-4 gap-2 border border-[var(--border-default)] p-3.5 rounded-xl bg-[var(--bg-surface)] shadow-3xs">
        {STEPS.map((s) => {
          const isCompleted = s.number < currentStep;
          const isActive = s.number === currentStep;
          return (
            <div 
              key={s.number} 
              className={`flex flex-col md:flex-row md:items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                isActive 
                  ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)]' 
                  : isCompleted 
                    ? 'border-transparent text-[var(--fn-success)] bg-transparent' 
                    : 'border-transparent text-[var(--text-faint)] bg-transparent'
              }`}
            >
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-3xs font-extrabold transition-colors ${
                isActive 
                  ? 'bg-[var(--text-primary)] text-[var(--bg-base)]' 
                  : isCompleted 
                    ? 'bg-[var(--fn-success)] text-white' 
                    : 'bg-[var(--bg-elevated)] border border-[var(--border-default)]'
              }`}>
                {isCompleted ? '✓' : s.number}
              </span>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Main Body Config Stage */}
      <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] p-6 shadow-sm space-y-6">
        {error && (
          <div className="rounded-lg p-4 border border-[var(--fn-error)] bg-[var(--bg-base)]" style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
            <p className="text-xs font-bold text-[var(--fn-error)]">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg p-4 border border-[var(--fn-success)] bg-[var(--bg-base)]" style={{ borderColor: 'rgba(34, 197, 94, 0.15)' }}>
            <p className="text-xs font-bold text-[var(--fn-success)]">{success}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAiMode('generate')}>
            Generate with AI
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAiMode('improve')}>
            Improve instructions with AI
          </button>
        </div>

        {aiMode === 'generate' && (
          <AiFeatureGate compact>
            <div className="rounded-lg border p-4 bg-[var(--bg-base)]">
              <AiErrorDisplay error={generateTask.error} />
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold">Generate Assignment</h4>
                <button type="button" onClick={() => { setAiMode(null); generateTask.reset(); setAiPrompt(''); }} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
              </div>
              
              {!generateTask.data ? (
                <>
                  <label className="input-group mb-3">
                    <span className="label">Assignment Topic / Instructions</span>
                    <input
                      className="input text-sm"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="e.g. Build a REST API using Express"
                      disabled={generateTask.isLoading}
                    />
                  </label>
                  <button 
                    type="button"
                    className="btn btn-primary btn-sm" 
                    onClick={async () => {
                      if (!aiPrompt) return;
                      await generateTask.executeTask({
                        type: 'GENERATE_ASSIGNMENT',
                        context: { courseId },
                        input: { topic: aiPrompt, maxPoints: maxPoints || 100 }
                      });
                    }}
                    disabled={!aiPrompt || generateTask.isLoading}
                  >
                    {generateTask.isLoading ? 'Generating...' : 'Generate Assignment'}
                  </button>
                </>
              ) : (
                <div className="space-y-3 mt-2">
                  <AiGenerationPreview
                    data={generateTask.data.output}
                    onAccept={() => {
                      const out = generateTask.data!.output;
                      if (out.title) setTitle(out.title);
                      if (out.maxPoints) setMaxPoints(out.maxPoints);
                      if (out.type) setType(out.type as AssignmentType);
                      if (out.instructionsJson) setInstructionsJson(out.instructionsJson);
                      setVisible(false);
                      setAiMode(null);
                      generateTask.reset();
                      setAiPrompt('');
                      setCurrentStep(2);
                    }}
                    onReject={() => { generateTask.reset(); setAiPrompt(''); }}
                  />
                </div>
              )}
            </div>
          </AiFeatureGate>
        )}

        {aiMode === 'improve' && (
          <AiFeatureGate compact>
            <div className="rounded-lg border p-4 bg-[var(--bg-base)]">
              <AiErrorDisplay error={improveTask.error} />
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold">Improve Instructions</h4>
                <button type="button" onClick={() => { setAiMode(null); improveTask.reset(); setAiPrompt(''); }} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancel</button>
              </div>
              
              {!improveTask.data ? (
                <>
                  <label className="input-group mb-3">
                    <span className="label">Improvement Feedback (Optional)</span>
                    <input
                      className="input text-sm"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="e.g. Make it more detailed, format as a list..."
                      disabled={improveTask.isLoading}
                    />
                  </label>
                  <button 
                    type="button"
                    className="btn btn-primary btn-sm" 
                    onClick={async () => {
                      await improveTask.executeTask({
                        type: 'IMPROVE_ASSIGNMENT_INSTRUCTIONS',
                        context: { courseId },
                        input: { feedback: aiPrompt, currentInstructionsJson: instructionsJson }
                      });
                    }}
                    disabled={improveTask.isLoading}
                  >
                    {improveTask.isLoading ? 'Improving...' : 'Improve Instructions'}
                  </button>
                </>
              ) : (
                <div className="space-y-3 mt-2">
                  <AiGenerationPreview
                    data={improveTask.data.output}
                    onAccept={() => {
                      const out = improveTask.data!.output;
                      if (out.instructionsJson) setInstructionsJson(out.instructionsJson);
                      setAiMode(null);
                      improveTask.reset();
                      setAiPrompt('');
                    }}
                    onReject={() => { improveTask.reset(); setAiPrompt(''); }}
                  />
                </div>
              )}
            </div>
          </AiFeatureGate>
        )}

        {/* STEP 1: BASICS */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Basics Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Assignment Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AssignmentType)}
                  disabled={Boolean(assignmentId)}
                  className="input w-full font-medium text-sm"
                >
                  {ASSIGNMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {assignmentId && (
                  <p className="text-3xs text-[var(--text-faint)] mt-1">Assignment type is locked after creation.</p>
                )}
              </div>

              <div>
                <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Max Points *</label>
                <input
                  type="number"
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(Number(e.target.value))}
                  min={0}
                  className="input w-full font-medium text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Assignment Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Homework 1: Database Normalization"
                className="input w-full font-medium text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input w-full font-medium text-sm"
                />
              </div>

              <div>
                <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Sequence Order Index</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  min={1}
                  className="input w-full font-medium text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: INSTRUCTIONS — document canvas */}
        {currentStep === 2 && (
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Instructions</h3>
            </div>
            <RichContentEditor
              value={instructionsJson}
              onChange={setInstructionsJson}
              placeholder="Write the assignment instructions here…"
            />
          </div>
        )}

        {/* STEP 3: TYPE SETTINGS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">
              Type Settings Config: {type.replace('_', ' ')}
            </h3>

            {/* FORM ASSIGNMENT IN DEVELOPMENT WARNING */}
            {type === 'FORM' && (
              <div className="rounded-xl border border-[var(--fn-warning)] bg-[var(--bg-base)] p-6 space-y-4 text-center">
                <div className="inline-flex rounded-full bg-[var(--bg-elevated)] p-3 text-[var(--fn-warning)]">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">Form Submissions In Development</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    The Form Feedback Builder is currently under development. To proceed, please go back to Step 1 and choose a different submission type (e.g. Text or File Submission).
                  </p>
                </div>
              </div>
            )}

            {/* FILE SUBMISSION */}
            {type === 'FILE_SUBMISSION' && (
              <div className="space-y-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)]">
                <div>
                  <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Allowed Extensions (comma separated)</label>
                  <input
                    type="text"
                    value={allowedFileTypes}
                    onChange={(e) => setAllowedFileTypes(e.target.value)}
                    placeholder=".pdf,.zip,.png"
                    className="input w-full font-medium text-xs font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Max Upload Count</label>
                    <input
                      type="number"
                      value={maxFiles}
                      onChange={(e) => setMaxFiles(Number(e.target.value))}
                      min={1}
                      className="input w-full font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Max File Size (MB)</label>
                    <input
                      type="number"
                      value={maxFileSizeMb}
                      onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                      min={1}
                      className="input w-full font-medium text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="allowResubmission"
                    checked={allowResubmission}
                    onChange={(e) => setAllowResubmission(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <label htmlFor="allowResubmission" className="ml-2 block text-xs text-[var(--text-secondary)] select-none">
                    Allow resubmissions before evaluation
                  </label>
                </div>
              </div>
            )}

            {/* TEXT SUBMISSION */}
            {type === 'TEXT_SUBMISSION' && (
              <div className="space-y-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Min Word Count</label>
                    <input
                      type="number"
                      value={minWords}
                      onChange={(e) => setMinWords(Number(e.target.value))}
                      min={0}
                      className="input w-full font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Max Word Count</label>
                    <input
                      type="number"
                      value={maxWords}
                      onChange={(e) => setMaxWords(Number(e.target.value))}
                      min={1}
                      className="input w-full font-medium text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="allowResubmission"
                    checked={allowResubmission}
                    onChange={(e) => setAllowResubmission(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <label htmlFor="allowResubmission" className="ml-2 block text-xs text-[var(--text-secondary)] select-none">
                    Allow resubmissions before evaluation
                  </label>
                </div>
              </div>
            )}

            {/* QUIZ */}
            {type === 'QUIZ' && (
              <div className="space-y-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Max Attempts</label>
                    <input
                      type="number"
                      value={attemptLimit}
                      onChange={(e) => setAttemptLimit(Number(e.target.value))}
                      min={1}
                      className="input w-full font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Time Limit (Minutes)</label>
                    <input
                      type="number"
                      value={timeLimitMinutes}
                      onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                      min={1}
                      className="input w-full font-medium text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VPL */}
            {type === 'VPL' && (
              <div className="space-y-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Programming Language</label>
                    <input
                      type="text"
                      value={vplLanguage}
                      onChange={(e) => setVplLanguage(e.target.value)}
                      placeholder="python"
                      className="input w-full font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Runtime Image</label>
                    <input
                      type="text"
                      value={vplRuntime}
                      onChange={(e) => setVplRuntime(e.target.value)}
                      placeholder="python3"
                      className="input w-full font-medium text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)] font-mono">Starter Template Code</label>
                  <textarea
                    value={vplTemplateCode}
                    onChange={(e) => setVplTemplateCode(e.target.value)}
                    rows={6}
                    className="input w-full font-mono text-xs"
                  />
                </div>
              </div>
            )}

            {/* SEMINAR */}
            {type === 'SEMINAR' && (
              <p className="text-xs text-[var(--text-muted)] italic">No additional custom settings are required for Seminar attendance. Click Next to review.</p>
            )}
          </div>
        )}

        {/* STEP 4: REVIEW & PUBLISH */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-subtle)] pb-2">Review & Publish</h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-3xs uppercase font-extrabold text-[var(--text-faint)]">Title</span>
                <p className="font-bold text-[var(--text-primary)]">{title}</p>
              </div>
              <div className="space-y-1">
                <span className="text-3xs uppercase font-extrabold text-[var(--text-faint)]">Type</span>
                <p className="font-bold text-[var(--text-primary)]">{type.replace('_', ' ')}</p>
              </div>
              <div className="space-y-1">
                <span className="text-3xs uppercase font-extrabold text-[var(--text-faint)]">Points Capacity</span>
                <p className="font-bold text-[var(--text-primary)]">{maxPoints} pts</p>
              </div>
              <div className="space-y-1">
                <span className="text-3xs uppercase font-extrabold text-[var(--text-faint)]">Due Date</span>
                <p className="font-bold text-[var(--text-primary)]">{dueDate ? new Date(dueDate).toLocaleString() : 'No Deadline'}</p>
              </div>
            </div>

            <div className="border border-[var(--border-default)] rounded-xl p-5 bg-[var(--bg-base)]">
              <RichContentRenderer document={instructionsJson} />
            </div>

            <div className="flex items-center bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-default)]/60">
              <input
                type="checkbox"
                id="visible-publish"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--text-primary)' }}
              />
              <label htmlFor="visible-publish" className="ml-2 block text-xs font-bold text-[var(--text-secondary)] select-none">
                Publish assignment immediately (visible on student syllabus)
              </label>
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex justify-between items-center border-t border-[var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isMutating}
            className="btn btn-secondary text-xs px-4 py-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            ← Back
          </button>
          
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary text-xs px-5 py-2"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isMutating}
              className="btn btn-success text-xs px-5 py-2 font-bold"
            >
              {isMutating ? 'Saving...' : assignmentId ? 'Save Changes' : 'Create Assignment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
