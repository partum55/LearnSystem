'use client';

import Link from 'next/link';
import { LockClosedIcon } from '@heroicons/react/24/outline';

interface RestrictedAccessStateProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}

export function RestrictedAccessState({
  title = 'Access restricted',
  message = 'You do not have permission to view this content. If you believe this is an error, contact your instructor.',
  backHref = '/courses',
  backLabel = 'Return to courses',
}: RestrictedAccessStateProps) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="card">
        <div className="empty-state py-16">
          <div className="empty-state-icon" style={{ background: 'var(--status-arch-soft)', borderColor: 'var(--status-arch-line)' }}>
            <LockClosedIcon className="h-5 w-5" style={{ color: 'var(--status-arch)' }} />
          </div>
          <h4>{title}</h4>
          <p>{message}</p>
          <div className="mt-5">
            <Link href={backHref} className="btn btn-secondary">
              {backLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
