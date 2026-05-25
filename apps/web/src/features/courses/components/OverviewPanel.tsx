'use client';

import React from 'react';
import Link from 'next/link';
import { DocumentTextIcon, ChatBubbleLeftRightIcon, ClockIcon } from '@heroicons/react/24/outline';
import { SectionTitle } from './SectionTitle';
import { EmptyState } from './EmptyState';

interface DeadlineDto {
  assignmentId: string;
  title: string;
  dueDate?: string | null;
}

interface OverviewPanelProps {
  description?: string | null;
  deadlines: DeadlineDto[];
  feedback: string[];
}

function formatDate(value?: string | null) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function OverviewPanel({
  description,
  deadlines,
  feedback,
}: OverviewPanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <div className="space-y-6">
        <section className="card">
          <div className="card-header">
            <SectionTitle icon={DocumentTextIcon} title="About course" />
          </div>
          <div className="card-body">
            <p className="whitespace-pre-line text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              {description || 'No summary syllabus has been provided for this course.'}
            </p>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <SectionTitle icon={ChatBubbleLeftRightIcon} title="Recent feedback" />
          </div>
          <div className="card-body">
            {feedback.length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {feedback.map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0 text-sm leading-6">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No feedback yet" description="Recent instructor comments will appear here." />
            )}
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="card">
          <div className="card-header">
            <SectionTitle icon={ClockIcon} title="Upcoming deadlines" />
          </div>
          <div className="card-body p-0">
            {deadlines.length > 0 ? (
              <div className="divide-y p-4 flex flex-col gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                {deadlines.map((deadline) => (
                  <Link
                    key={deadline.assignmentId}
                    href={`/assignments/${deadline.assignmentId}`}
                    className="block rounded-md border px-3 py-2 transition-colors"
                    style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
                  >
                    <p className="text-sm font-medium">{deadline.title}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(deadline.dueDate)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No close due dates" description="Assignments with upcoming deadlines will appear here." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
