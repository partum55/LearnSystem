'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAiTask } from '@/features/ai/hooks/useAiTask';
import { useCreateCourseFromDraft, CourseDraft } from '@/features/ai/hooks/useCreateCourseFromDraft';
import { AiGenerationPreview } from '@/features/ai/components/AiGenerationPreview';
import { AiErrorDisplay } from '@/features/ai/components/AiErrorDisplay';
import { AiFeatureGate } from '@/features/ai/components/AiFeatureGate';

export function CourseAiWizard() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  
  const aiTask = useAiTask<CourseDraft>();
  const createCourse = useCreateCourseFromDraft();

  const handleGenerate = async () => {
    if (!topic) return;
    await aiTask.executeTask({
      type: 'GENERATE_COURSE',
      input: { topic, targetAudience: audience }
    });
  };

  const handleSave = async () => {
    if (!aiTask.data?.output) return;
    
    try {
      const created = await createCourse.createCourse(aiTask.data.output);
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
      <div className="mx-auto max-w-3xl space-y-6 pb-10 mt-8">
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
              <AiGenerationPreview
                data={aiTask.data.output}
                isAccepting={createCourse.isLoading}
                onAccept={handleSave}
                onReject={() => router.push('/courses')}
              />
            )}
            
          </div>
        </div>
      </div>
    </AiFeatureGate>
  );
}
