'use client';

import type { ReactNode } from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  framed?: boolean;
}

export function EmptyState({ title, description, icon, action, framed = false }: EmptyStateProps) {
  const content = (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon ?? <BookOpenIcon className="h-5 w-5" />}
      </div>
      <h4>{title}</h4>
      <p>{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );

  if (!framed) return content;

  return (
    <section className="card">
      <div className="card-body">{content}</div>
    </section>
  );
}
