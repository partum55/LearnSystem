import { useEffect, useRef } from 'react';
import { useMarkComplete } from '../queries/useProgressQueries';

/**
 * Hook that marks content as complete when a component mounts.
 * Used for pages and resources that are "completed" by viewing them.
 */
export const useTrackOpen = (
  courseId: string | undefined,
  moduleId: string | undefined,
  contentType: string,
  contentId: string | undefined
) => {
  const markComplete = useMarkComplete();
  const tracked = useRef(false);

  useEffect(() => {
    if (!courseId || !moduleId || !contentId || tracked.current) return;
    tracked.current = true;
    markComplete.mutate({ courseId, moduleId, contentType, contentId });
  }, [courseId, moduleId, contentType, contentId]); // eslint-disable-line react-hooks/exhaustive-deps
};
