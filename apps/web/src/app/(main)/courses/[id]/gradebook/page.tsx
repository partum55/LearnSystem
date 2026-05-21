import { TeacherGradebookPage } from '@/features/gradebook/components/TeacherGradebookPage';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeacherGradebookRoutePage({ params }: PageProps) {
  const resolvedParams = await params;
  return <TeacherGradebookPage courseId={resolvedParams.id} />;
}
