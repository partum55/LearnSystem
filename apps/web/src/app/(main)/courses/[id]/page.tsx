'use client';

import { useParams } from 'next/navigation';
import { CourseDetailPage } from '@/features/courses/components/CourseDetailPage';

const paramString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function CourseDetailRoutePage() {
  const params = useParams<{ id: string }>();
  const courseId = paramString(params.id) || '';

  return <CourseDetailPage courseId={courseId} />;
}
