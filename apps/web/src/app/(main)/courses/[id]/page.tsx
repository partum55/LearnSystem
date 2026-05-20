'use client';
import { use } from 'react';
import CourseDetail from '@/views/CourseDetail';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
      <CourseDetail />
  );
}
