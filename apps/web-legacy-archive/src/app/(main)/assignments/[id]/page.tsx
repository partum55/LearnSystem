'use client';
import { use } from 'react';
import AssignmentDetail from '@/features/assignments/views/AssignmentDetail';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
}
