'use client';
import { use } from 'react';
import CoursePreview from '@/views/CoursePreview';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
      <CoursePreview />
  );
}
