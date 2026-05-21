'use client';

import { useParams } from 'next/navigation';
import { useLearningItem, useLessonBlocks } from '@/features/learning-items/hooks/useLearningItemQueries';
import { Loading } from '@/components/Loading';

const paramString = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default function LearningItemDetailPage() {
  const params = useParams<{ learningItemId: string }>();
  const learningItemId = paramString(params.learningItemId);
  const item = useLearningItem(learningItemId);
  const blocks = useLessonBlocks(item.data?.type === 'lesson' ? learningItemId : undefined);

  if (item.isLoading) return <Loading label="Loading learning item" />;
  if (item.error) return <p className="text-sm text-red-600">Learning item is unavailable.</p>;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{item.data?.type}</p>
      <h1 className="mt-2 text-3xl font-semibold">{item.data?.title ?? 'Learning item'}</h1>
      <p className="mt-3 text-slate-600">{item.data?.description ?? 'No description'}</p>
      {item.data?.type === 'lesson' && (
        <div className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold">Lesson blocks</h2>
          {blocks.data?.map((block) => (
            <article key={block.id} className="rounded-md border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{block.type}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{block.content ?? block.title ?? 'Empty block'}</p>
            </article>
          ))}
          {!blocks.data?.length && <p className="text-sm text-slate-500">No blocks yet.</p>}
        </div>
      )}
    </section>
  );
}
