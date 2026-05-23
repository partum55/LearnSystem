'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  EllipsisVerticalIcon,
  BookOpenIcon,
  TableCellsIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface GradebookAssignmentActionsProps {
  assignmentId: string;
  onOpenFullGradebook: () => void;
  onOpenSpeedGrader: () => void;
}

export function GradebookAssignmentActions({
  assignmentId,
  onOpenFullGradebook,
  onOpenSpeedGrader,
}: GradebookAssignmentActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="rounded-lg p-1.5 hover:bg-[var(--bg-elevated)] transition text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-default)] cursor-pointer"
        type="button"
        title="Grading Actions"
      >
        <EllipsisVerticalIcon className="h-4.5 w-4.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xl z-20 overflow-hidden divide-y divide-[var(--border-subtle)] focus:outline-hidden animate-fade-in">
          <div className="py-1">
            <Link
              href={`/assignments/${assignmentId}`}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition"
              onClick={() => setIsOpen(false)}
            >
              <BookOpenIcon className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
              <span>Open assignment details</span>
            </Link>
          </div>
          <div className="py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpenFullGradebook();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition cursor-pointer"
            >
              <TableCellsIcon className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
              <span>Filter in Full Gradebook</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpenSpeedGrader();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition cursor-pointer"
            >
              <SparklesIcon className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
              <span>Launch SpeedGrader</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
