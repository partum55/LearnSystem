'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAiTask } from '@/features/ai/hooks/useAiTask';
import { useCreateCourseFromDraft, CourseDraft } from '@/features/ai/hooks/useCreateCourseFromDraft';
import { AiErrorDisplay } from '@/features/ai/components/AiErrorDisplay';
import { AiFeatureGate } from '@/features/ai/components/AiFeatureGate';
import { GeneratedCoursePreview } from './GeneratedCoursePreview';

export function CourseAiWizard() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [editableDraft, setEditableDraft] = useState<CourseDraft | null>(null);
  
  const aiTask = useAiTask<CourseDraft>();
  const createCourse = useCreateCourseFromDraft();

  const handleGenerate = async () => {
    if (!topic) return;
    const response = await aiTask.executeTask({
      type: 'GENERATE_COURSE',
      input: { topic, targetAudience: audience }
    });
    setEditableDraft(normalizeCourseDraft(response.output));
  };

  const handleStartOver = () => {
    aiTask.reset();
    createCourse.reset();
    setEditableDraft(null);
  };

  const handleSave = async () => {
    if (!editableDraft) return;
    
    try {
      const created = await createCourse.createCourse(normalizeCourseDraft(editableDraft));
      // @ts-expect-error type
      if (created?.id) {
        // @ts-expect-error type
        router.push(`/courses/${created.id}`);
      } else {
        router.push('/courses');
      }
    } catch (error) {
      // handled by hook
    }
  };

  return (
    <AiFeatureGate>
      <div className="mx-auto max-w-5xl space-y-6 pb-10 mt-8">
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold">Generate Course with AI</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Describe your course and our AI will draft a complete curriculum, modules, and assignments.
            </p>
          </div>
          <div className="card-body space-y-4">
            
            <AiErrorDisplay error={aiTask.error} />
            <AiErrorDisplay error={createCourse.error} />

            {!aiTask.data && (
              <>
                <label className="input-group">
                  <span className="label">Course Topic</span>
                  <input
                    className="input"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Introduction to Python Programming"
                    disabled={aiTask.isLoading}
                  />
                </label>
                
                <label className="input-group">
                  <span className="label">Target Audience</span>
                  <input
                    className="input"
                    value={audience}
                    onChange={e => setAudience(e.target.value)}
                    placeholder="e.g. High school students with no prior experience"
                    disabled={aiTask.isLoading}
                  />
                </label>

                <div className="flex justify-end mt-4">
                  <button 
                    className="btn btn-primary" 
                    onClick={handleGenerate}
                    disabled={!topic || aiTask.isLoading}
                  >
                    {aiTask.isLoading ? 'Generating...' : 'Generate Curriculum'}
                  </button>
                </div>
              </>
            )}

            {aiTask.data?.output && (
              <>
                {editableDraft && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="input-group">
                      <span className="label">Course title</span>
                      <input
                        className="input"
                        value={editableDraft.course.title}
                        onChange={(event) => setEditableDraft((draft) => draft ? ({
                          ...draft,
                          course: { ...draft.course, title: event.target.value },
                        }) : draft)}
                      />
                    </label>
                    <label className="input-group">
                      <span className="label">Course code</span>
                      <input
                        className="input"
                        value={editableDraft.course.code}
                        onChange={(event) => setEditableDraft((draft) => draft ? ({
                          ...draft,
                          course: { ...draft.course, code: event.target.value.toUpperCase() },
                        }) : draft)}
                      />
                    </label>
                    <label className="input-group md:col-span-2">
                      <span className="label">Description</span>
                      <textarea
                        className="input min-h-24"
                        value={editableDraft.course.description}
                        onChange={(event) => setEditableDraft((draft) => draft ? ({
                          ...draft,
                          course: { ...draft.course, description: event.target.value },
                        }) : draft)}
                      />
                    </label>
                  </div>
                )}
                <GeneratedCoursePreview
                  draft={editableDraft ?? aiTask.data.output}
                  isAccepting={createCourse.isLoading}
                  onAccept={handleSave}
                  onReject={handleStartOver}
                />
              </>
            )}
            
          </div>
        </div>
      </div>
    </AiFeatureGate>
  );
}

function normalizeCourseDraft(draft: CourseDraft): CourseDraft {
  return {
    ...draft,
    course: {
      ...draft.course,
      code: (draft.course.code || 'AI-DRAFT').toUpperCase(),
      syllabusJson: ensureOptionalRichContentDocument(draft.course.syllabusJson),
    },
    modules: (draft.modules ?? []).map((module, moduleIndex) => ({
      ...module,
      orderIndex: module.orderIndex ?? moduleIndex + 1,
      learningItems: (module.learningItems ?? []).map((item, itemIndex) => ({
        ...item,
        type: item.type === 'LESSON' ? 'LESSON' : 'RTE',
        title: item.title || `Learning material ${itemIndex + 1}`,
        contentJson: ensureRichContentDocument(
          item.contentJson,
          item.title || `Learning material ${itemIndex + 1}`,
          module.description || module.title
        ),
      })),
      assignments: (module.assignments ?? []).map((assignment, assignmentIndex) => ({
        ...assignment,
        type: normalizeAssignmentType(assignment.type),
        title: assignment.title || `Assignment ${assignmentIndex + 1}`,
        points: typeof assignment.points === 'number' && assignment.points >= 0 ? assignment.points : 100,
        instructionsJson: ensureRichContentDocument(
          assignment.instructionsJson,
          assignment.title || `Assignment ${assignmentIndex + 1}`,
          'Complete this draft assignment and submit your work for review.'
        ),
        settings: assignment.settings && typeof assignment.settings === 'object' ? assignment.settings : {},
      })),
    })),
  };
}

function normalizeAssignmentType(type?: string) {
  const allowed = new Set(['TEXT_SUBMISSION', 'FILE_SUBMISSION', 'QUIZ', 'FORM', 'VPL', 'SEMINAR']);
  return type && allowed.has(type) ? type : 'TEXT_SUBMISSION';
}

function ensureRichContentDocument(value: unknown, title: string, fallback?: string) {
  if (
    value &&
    typeof value === 'object' &&
    (value as { version?: unknown }).version === 1 &&
    (value as { type?: unknown }).type === 'RICH_CONTENT' &&
    Array.isArray((value as { blocks?: unknown }).blocks)
  ) {
    return value;
  }

  return {
    version: 1,
    type: 'RICH_CONTENT',
    blocks: [
      {
        type: 'paragraph',
        data: {
          text: fallback || title,
        },
      },
    ],
  };
}

function ensureOptionalRichContentDocument(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  if (
    (value as { version?: unknown }).version === 1 &&
    (value as { type?: unknown }).type === 'RICH_CONTENT' &&
    Array.isArray((value as { blocks?: unknown }).blocks)
  ) {
    return value;
  }
  return undefined;
}
