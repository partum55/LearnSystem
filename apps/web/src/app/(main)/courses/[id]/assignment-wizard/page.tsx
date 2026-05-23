'use client';

import { useParams } from 'next/navigation';
import { AssignmentWizard } from '@/features/courses/components/AssignmentWizard';

const paramString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function AssignmentWizardRoutePage() {
  const params = useParams<{ id: string }>();
  const courseId = paramString(params.id) || '';

  return <AssignmentWizard courseId={courseId} />;
}
