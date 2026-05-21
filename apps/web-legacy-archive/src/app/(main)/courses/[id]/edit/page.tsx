'use client';
import { use } from 'react';
import CourseEdit from '@/features/courses/views/CourseEdit';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
      <CourseEdit />
  );
}
