'use client';

import { useParams } from 'next/navigation';
import { AssignmentDetailPage } from '@/features/assignments/components/AssignmentDetailPage';

const paramString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function AssignmentDetailRoute() {
  const params = useParams<{ id: string }>();
  const assignmentId = paramString(params.id) || '';

  return <AssignmentDetailPage assignmentId={assignmentId} />;
}
