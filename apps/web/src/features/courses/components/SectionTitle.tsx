'use client';

import React from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface SectionTitleProps {
  icon: typeof BookOpenIcon;
  title: string;
}

export function SectionTitle({ icon: Icon, title }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}
