'use client';
import { use } from 'react';
import AttendanceCheckin from '@/features/courses/views/AttendanceCheckin';
export default function Page({ params }: { params: Promise<{ courseId: string; assignmentId: string }> }) {
  const resolvedParams = use(params);
}
