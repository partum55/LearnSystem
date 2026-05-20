'use client';
import { use } from 'react';
import AssignmentDetail from '@/views/AssignmentDetail';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
}
