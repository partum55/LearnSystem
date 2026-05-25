'use client';

import React from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  title: string;
  description: string;
  framed?: boolean;
}

export function EmptyState({ title, description, framed = false }: EmptyStateProps) {
  const content = (
    <div className="py-8 text-center">
      <BookOpenIcon className="mx-auto h-8 w-8" style={{ color: 'var(--text-faint)' }} />
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  );

  if (!framed) return content;

  return (
    <section className="card">
      <div className="card-body">{content}</div>
    </section>
  );
}
