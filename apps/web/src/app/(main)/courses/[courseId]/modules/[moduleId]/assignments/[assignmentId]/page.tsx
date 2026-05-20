'use client';
import { use } from 'react';
import AssignmentDetail from '@/views/AssignmentDetail';
export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string; assignmentId: string }> }) {
  const resolvedParams = use(params);
}
