import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  if (!items.length) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-y-1 text-sm ${className || ''}`}
      style={{ color: 'var(--text-muted)' }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="transition-colors hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRightIcon
                className="mx-1.5 h-3.5 w-3.5 flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
