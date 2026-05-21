'use client';
import { use } from 'react';
import ModulePageEditor from '@/features/lesson/views/ModulePageEditor';
export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  const resolvedParams = use(params);
}
