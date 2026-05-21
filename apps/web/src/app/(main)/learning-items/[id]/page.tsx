import { LearningItemDetailPage } from '@/features/learning-items/components/LearningItemDetailPage';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LearningItemDetailRoutePage({ params }: PageProps) {
  const resolvedParams = await params;
  return <LearningItemDetailPage learningItemId={resolvedParams.id} />;
}
