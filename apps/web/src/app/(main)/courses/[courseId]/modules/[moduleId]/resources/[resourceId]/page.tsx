'use client';
import { use } from 'react';
import ResourceView from '@/views/course/resources/ResourceView';
export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string; resourceId: string }> }) {
  const resolvedParams = use(params);
}
