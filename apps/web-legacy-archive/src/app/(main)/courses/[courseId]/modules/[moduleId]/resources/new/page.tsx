'use client';
import { use } from 'react';
import ResourceEditor from '@/features/courses/views/ResourceEditor';
export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  const resolvedParams = use(params);
}
