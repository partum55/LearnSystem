'use client';
import { use } from 'react';
import VirtualLab from '@/views/VirtualLab';
export default function Page({ params }: { params: Promise<{ assignmentId: string }> }) {
  const resolvedParams = use(params);
}
