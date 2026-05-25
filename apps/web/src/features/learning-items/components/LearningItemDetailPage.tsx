'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { 
  useLearningItem, 
  useLessonPages,
  useUpdateLearningItem,
  useCreateLessonPage,
  useUpdateLessonPage,
  useDeleteLessonPage,
  useReorderLessonPages,
} from '@/features/learning-items/hooks/useLearningItemQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { useCourseMembers } from '@/features/courses/hooks/useCourseQueries';
import { Loading } from '@/components/Loading';
import { RichContentEditor } from '@/features/rich-content/components/RichContentEditor';
import { RichContentRenderer } from '@/features/rich-content/components/RichContentRenderer';
import { markdownToRichContent } from '@/features/rich-content/markdown-parser';
import type { RichContentDocument } from '@/features/rich-content/rich-content.types';

interface LearningItemDetailPageProps {
  learningItemId: string;
}

// Helpers
const formatBytes = (bytes?: number | string | null): string => {
  if (!bytes) return '';
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = numBytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

const getSettingString = (settings: Record<string, unknown> | undefined, keys: string[]): string => {
  if (!settings) return '';
  for (const key of keys) {
    if (typeof settings[key] === 'string') {
      return settings[key] as string;
    }
  }
  return '';
};

const parseDocument = (content: string | null | undefined): RichContentDocument => {
  if (!content) return { version: 1, blocks: [{ id: 'init', type: 'paragraph', data: { text: 'Start typing here...' } }] };
  try {
    return JSON.parse(content) as RichContentDocument;
  } catch {
    return markdownToRichContent(content);
  }
};

export function LearningItemDetailPage({ learningItemId }: LearningItemDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [todoToast, setTodoToast] = useState<string | null>(null);

  // Read courseId context from URL search params
  const courseId = searchParams.get('courseId') || '';

  // Core canonical API queries
  const { data: item, isLoading: isItemLoading, error: itemError } = useLearningItem(learningItemId);
  const itemType = item?.type?.toLowerCase();
  const { data: pages, isLoading: isPagesLoading } = useLessonPages(
    itemType === 'lesson' ? learningItemId : undefined
  );
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  
  // Fetch course members only if courseId context is available
  const { data: membersPage } = useCourseMembers(courseId || undefined, { size: 100 });

  // Core mutations
  const updateItemMutation = useUpdateLearningItem();
  const createPageMutation = useCreateLessonPage();
  const updatePageMutation = useUpdateLessonPage();
  const deletePageMutation = useDeleteLessonPage();
  const reorderPagesMutation = useReorderLessonPages();

  // Active page context selection state
  const [activePageId, setActivePageId] = useState<string | null>(null);

  // Local Page Editing states
  const [localTitle, setLocalTitle] = useState('');
  const [localType, setLocalType] = useState<string>('TEXT');
  const [localRteValue, setLocalRteValue] = useState<RichContentDocument>({ version: 1, blocks: [] });
  const [localVideoUrl, setLocalVideoUrl] = useState('');
  const [localQuizPrompt, setLocalQuizPrompt] = useState<RichContentDocument>({ version: 1, blocks: [] });
  const [localQuizOptions, setLocalQuizOptions] = useState<string[]>(['', '']);
  const [localQuizCorrectAnswer, setLocalQuizCorrectAnswer] = useState('0');
  const [localQuizExplanation, setLocalQuizExplanation] = useState('');

  // RTE Item material inline state
  const [rteContent, setRteContent] = useState<RichContentDocument>({ version: 1, blocks: [] });

  // Evaluate course-specific role permissions
  const courseRole = useMemo(() => {
    if (!membersPage?.content || !currentUser) return null;
    const member = membersPage.content.find((m) => m.userId === currentUser.id);
    return member?.roleInCourse || null;
  }, [membersPage, currentUser]);

  const isCourseStaff = useMemo(() => {
    if (currentUser?.role === 'ADMIN') return true;
    return courseRole === 'OWNER' || courseRole === 'TEACHER' || courseRole === 'TA';
  }, [currentUser, courseRole]);

  const showToast = (message: string) => {
    setTodoToast(message);
    setTimeout(() => setTodoToast(null), 3000);
  };

  // Safe checks for errors and access boundaries
  const isForbidden = useMemo(() => {
    const err = itemError as { status?: number; response?: { status?: number } } | null;
    const errStatus = err?.status || err?.response?.status;
    return errStatus === 403;
  }, [itemError]);

  const isNotFound = useMemo(() => {
    const err = itemError as { status?: number; response?: { status?: number } } | null;
    const errStatus = err?.status || err?.response?.status;
    return errStatus === 404 || (!isItemLoading && !item);
  }, [itemError, isItemLoading, item]);

  const isLoading = isItemLoading || isUserLoading || (itemType === 'lesson' && isPagesLoading);

  // Resolve active page
  const activePage = useMemo(() => {
    if (!pages || pages.length === 0) return null;
    return pages.find((p) => p.id === activePageId) || pages[0];
  }, [pages, activePageId]);

  // Sync RTE material data
  useEffect(() => {
    if (item && itemType === 'rte') {
      const textVal = item.settings?.textContent || item.settings?.content || '';
      setRteContent(parseDocument(String(textVal)));
    }
  }, [item, itemType]);

  // Sync active lesson page details to editing states
  useEffect(() => {
    if (activePage) {
      setLocalTitle(activePage.title || '');
      setLocalType(activePage.type || 'TEXT');
      
      const parsed = parseDocument(activePage.content);
      if (activePage.type === 'TEXT' || activePage.type === 'CODE' || activePage.type === 'MERMAID' || activePage.type === 'MATH') {
        setLocalRteValue(parsed);
      } else if (activePage.type === 'VIDEO') {
        setLocalVideoUrl(activePage.settings?.url as string || activePage.content || '');
      } else if (activePage.type === 'INLINE_QUIZ_QUESTION') {
        const promptObj = activePage.settings?.prompt;
        if (promptObj && typeof promptObj === 'object') {
          setLocalQuizPrompt(promptObj as RichContentDocument);
        } else {
          setLocalQuizPrompt(parseDocument(String(promptObj || activePage.content || '')));
        }
        
        const choices = activePage.settings?.options || activePage.settings?.choices || [];
        if (Array.isArray(choices)) {
          setLocalQuizOptions(choices.map((c) => typeof c === 'string' ? c : String(c?.text || '')));
        } else {
          setLocalQuizOptions(['', '']);
        }
        setLocalQuizCorrectAnswer(String(activePage.settings?.correctAnswer ?? '0'));
        setLocalQuizExplanation(String(activePage.settings?.explanation || ''));
      }
    }
  }, [activePage]);

  // Save full-page RTE learning material
  const handleSaveRte = async () => {
    if (!item) return;
    try {
      await updateItemMutation.mutateAsync({
        learningItemId,
        request: {
          title: item.title,
          type: 'rte',
          textContent: JSON.stringify(rteContent),
        },
        courseId: courseId || undefined,
      });
      showToast('Document saved successfully.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save document.');
    }
  };

  // Lesson actions: page creation
  const handleCreatePage = async () => {
    try {
      const newPage = await createPageMutation.mutateAsync({
        learningItemId,
        request: {
          title: 'New Lesson Page',
          type: 'TEXT',
          content: JSON.stringify({ version: 1, blocks: [{ id: 'init', type: 'paragraph', data: { text: 'Start typing lesson steps...' } }] }),
        },
      });
      showToast('New page added.');
      setActivePageId(newPage.id);
    } catch (err: any) {
      showToast('Failed to create page.');
    }
  };

  // Lesson actions: save active page
  const handleSavePage = async () => {
    if (!activePage) return;
    
    let content = '';
    let settings: Record<string, unknown> = {};

    if (localType === 'TEXT' || localType === 'CODE' || localType === 'MERMAID' || localType === 'MATH') {
      content = JSON.stringify(localRteValue);
    } else if (localType === 'VIDEO') {
      if (!localVideoUrl.trim() || (!localVideoUrl.startsWith('http://') && !localVideoUrl.startsWith('https://'))) {
        showToast('Please provide a valid HTTP video URL.');
        return;
      }
      content = localVideoUrl.trim();
      settings.url = localVideoUrl.trim();
    } else if (localType === 'INLINE_QUIZ_QUESTION') {
      content = JSON.stringify(localQuizPrompt);
      
      const filteredChoices = localQuizOptions.map((c) => c.trim());
      if (filteredChoices.some((c) => !c)) {
        showToast('All quiz option choices must contain text.');
        return;
      }
      
      settings = {
        prompt: localQuizPrompt, // Save prompt as structured JSON directly
        options: filteredChoices,
        correctAnswer: localQuizCorrectAnswer,
        explanation: localQuizExplanation.trim() || undefined,
      };
    }

    try {
      await updatePageMutation.mutateAsync({
        learningItemId,
        pageId: activePage.id,
        request: {
          title: localTitle.trim() || 'Untitled Page',
          type: localType,
          content,
          settings,
        },
      });
      showToast('Lesson page saved successfully.');
    } catch (err: any) {
      showToast(err?.message || 'Failed to save lesson page.');
    }
  };

  // Lesson actions: delete active page
  const handleDeletePage = async (pageId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this page?')) return;
    try {
      await deletePageMutation.mutateAsync({ learningItemId, pageId });
      showToast('Page deleted.');
      setActivePageId(null);
    } catch (err: any) {
      showToast('Failed to delete page.');
    }
  };

  // Lesson actions: reorder pages inline
  const handleMovePage = async (index: number, direction: 'up' | 'down') => {
    if (!pages) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    const list = [...pages];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const request = {
      pages: list.map((p, idx) => ({ id: p.id, order: idx + 1 })),
    };

    try {
      await reorderPagesMutation.mutateAsync({
        learningItemId,
        request,
      });
      showToast('Page order updated.');
    } catch (err: any) {
      showToast('Failed to reorder pages.');
    }
  };

  // Safe course detail navigation url
  const backToCourseUrl = courseId ? `/courses/${courseId}` : '/courses';

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <Loading label="Loading syllabus resource detail" />
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-[var(--text-primary)] shadow-sm text-center space-y-4 mt-8 animate-fade-in">
        <div className="mx-auto inline-flex rounded-full bg-[var(--bg-elevated)] p-3 text-[var(--fn-warning)]">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v4m0-4v-1m-1-4h3m-2-3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Access Restricted</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            You do not have permission to view this learning resource. Authorized course members only are granted entry.
          </p>
        </div>
        <Link href={backToCourseUrl} className="btn btn-primary">
          Return to Course Syllabus
        </Link>
      </div>
    );
  }

  if (isNotFound || !item) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-[var(--text-primary)] shadow-xs text-center space-y-4 mt-8 animate-fade-in">
        <div className="mx-auto inline-flex rounded-full bg-[var(--bg-elevated)] p-3 text-[var(--text-muted)]">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Resource Not Found</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            We could not find the learning material you are looking for. It might have been archived or moved by the teaching staff.
          </p>
        </div>
        <button onClick={() => router.back()} className="btn btn-secondary">
          Go Back
        </button>
      </div>
    );
  }

  const urlSetting = getSettingString(item.settings, ['url', 'fileUrl', 'externalUrl', 'pdfUrl', 'videoUrl']);
  const sizeSetting = (item.settings?.fileSize || item.settings?.size) as number | string | undefined;

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-5xl mx-auto relative">
      {/* Toast Alert */}
      {todoToast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] px-5 py-3 text-xs font-semibold shadow-lg flex items-center gap-2 border border-[var(--border-default)] animate-slide-in">
          <svg className="h-4 w-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{todoToast}</span>
        </div>
      )}

      {/* Header & Navigation */}
      <div className="flex flex-col space-y-4">
        <div>
          <button
            onClick={() => {
              if (courseId) {
                router.push(backToCourseUrl);
              } else {
                router.back();
              }
            }}
            className="group inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-wider"
          >
            <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Syllabus
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[var(--border-default)] pb-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-widest text-[var(--text-primary)]">
                Type: {item.type}
              </span>
              {item.visibilityStatus && (
                <span className="rounded-full bg-[var(--bg-base)] border border-[var(--border-default)] px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-widest text-[var(--text-muted)]">
                  {item.visibilityStatus}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl text-[var(--text-primary)]">
              {item.title}
            </h1>
            {item.description && (
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {item.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <main className="space-y-6">
        {/* PDF */}
        {itemType === 'pdf' && (
          <div className="space-y-4">
            {urlSetting ? (
              <div className="rounded-xl overflow-hidden border border-[var(--border-default)] shadow-sm aspect-video w-full h-[650px] bg-[var(--bg-base)]">
                <iframe src={`${urlSetting}#toolbar=1&navpanes=0`} className="w-full h-full border-none" title={item.title} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-12 text-center">
                <p className="text-xs text-[var(--text-muted)] italic">No PDF document URL reference is configured.</p>
              </div>
            )}
            {urlSetting && (
              <div className="flex justify-end">
                <a href={urlSetting} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors shadow-2xs">
                  Download PDF Document
                </a>
              </div>
            )}
          </div>
        )}

        {/* LINK */}
        {itemType === 'link' && (
          <div className="mx-auto max-w-2xl">
            {urlSetting ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-sm transition-all">
                <div className="space-y-2 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-[var(--fn-warning)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-default)] uppercase tracking-wide">
                    External link
                  </span>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{urlSetting}</h3>
                </div>
                <a href={urlSetting} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--text-primary)] px-4 py-2.5 text-xs font-bold text-[var(--bg-base)] hover:opacity-90 transition-colors shadow-2xs">
                  Visit Resource Link
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-12 text-center">
                <p className="text-xs text-[var(--text-muted)] italic">No URL has been registered.</p>
              </div>
            )}
          </div>
        )}

        {/* VIDEO */}
        {itemType === 'video' && (
          <div className="space-y-4">
            {urlSetting ? (
              <div className="rounded-xl overflow-hidden border border-[var(--border-default)] shadow-sm aspect-video w-full bg-[var(--bg-base)] max-w-3xl mx-auto">
                <iframe
                  src={
                    urlSetting.includes('youtube.com') || urlSetting.includes('youtu.be')
                      ? `https://www.youtube.com/embed/${
                          urlSetting.includes('v=')
                            ? urlSetting.split('v=')[1]?.split('&')[0]
                            : urlSetting.split('/').pop()?.split('?')[0]
                        }`
                      : `https://player.vimeo.com/video/${urlSetting.split('/').pop()?.split('?')[0]}`
                  }
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={item.title}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-12 text-center">
                <p className="text-xs text-[var(--text-muted)] italic">No video URL has been configured.</p>
              </div>
            )}
          </div>
        )}

        {/* FILE */}
        {itemType === 'file' && (
          <div className="mx-auto max-w-2xl">
            {urlSetting ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xs flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] p-4 text-[var(--text-secondary)] shadow-3xs">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{item.title}</h3>
                  {sizeSetting && <p className="text-3xs font-mono text-[var(--text-muted)] uppercase">Size: {formatBytes(sizeSetting)}</p>}
                </div>
                <a href={urlSetting} download className="btn btn-primary text-xs px-5 py-2">
                  Download Resource File
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-base)] p-12 text-center">
                <p className="text-xs text-[var(--text-muted)] italic">No downloadable file reference is configured.</p>
              </div>
            )}
          </div>
        )}

        {/* RTE DOCUMENT */}
        {itemType === 'rte' && (
          <div className="space-y-4">
            {isCourseStaff ? (
              <div className="space-y-6">
                <div className="flex justify-end pb-3 border-b border-[var(--border-subtle)]">
                  <button onClick={handleSaveRte} disabled={updateItemMutation.isPending} className="btn btn-success text-3xs font-extrabold px-3 py-1.5">
                    {updateItemMutation.isPending ? 'Saving…' : 'Save Document'}
                  </button>
                </div>
                <RichContentEditor value={rteContent} onChange={setRteContent} />
              </div>
            ) : (
              <div className="prose max-w-none">
                <RichContentRenderer document={rteContent} />
              </div>
            )}
          </div>
        )}

        {/* PAGE-BASED LESSON WORKSPACE */}
        {itemType === 'lesson' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            
            {/* Sidebar List */}
            <div className="md:col-span-1 border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] p-4 space-y-4 shadow-xs">
              <h3 className="text-3xs font-extrabold uppercase tracking-widest text-[var(--text-faint)] leading-none border-b border-[var(--border-subtle)] pb-2">
                Lesson Navigation
              </h3>
              
              {!pages || pages.length === 0 ? (
                <p className="text-3xs text-[var(--text-faint)] italic">No pages created.</p>
              ) : (
                <div className="space-y-1.5">
                  {pages.map((p, idx) => {
                    const isActive = activePage?.id === p.id;
                    return (
                      <div 
                        key={p.id}
                        className={`group flex items-center justify-between p-2 rounded-lg text-xs font-bold border transition-all ${
                          isActive 
                            ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)]' 
                            : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-base)]'
                        }`}
                      >
                        <button 
                          onClick={() => setActivePageId(p.id)}
                          className="flex-1 text-left truncate cursor-pointer pr-1"
                        >
                          {idx + 1}. {p.title || 'Untitled Page'}
                        </button>
                        
                        {isCourseStaff && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleMovePage(idx, 'up')}
                              disabled={idx === 0}
                              className="text-[var(--text-faint)] hover:text-[var(--text-primary)] disabled:opacity-20 px-0.5"
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMovePage(idx, 'down')}
                              disabled={idx === pages.length - 1}
                              className="text-[var(--text-faint)] hover:text-[var(--text-primary)] disabled:opacity-20 px-0.5"
                              title="Move Down"
                            >
                              ▼
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isCourseStaff && (
                <button onClick={handleCreatePage} className="w-full btn btn-secondary text-3xs font-extrabold py-2 mt-2">
                  + Add Page
                </button>
              )}
            </div>

            {/* Central Workspace Panel */}
            <div className="md:col-span-3 border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] p-6 shadow-xs min-h-[450px]">
              {!activePage ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                  <div className="rounded-full bg-[var(--bg-elevated)] p-4 text-[var(--text-faint)] border border-[var(--border-default)]">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Lesson Draft Empty</h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
                      {isCourseStaff 
                        ? 'There are no pages created for this lesson yet. Start by adding your first page.'
                        : 'No steps have been added to this lesson yet.'}
                    </p>
                  </div>
                  {isCourseStaff && (
                    <button onClick={handleCreatePage} className="btn btn-primary text-xs px-4 py-2 mt-2">
                      Create First Page
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Page Top Actions Control */}
                  <div className="flex justify-between items-center border-b border-[var(--border-default)] pb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--text-faint)] bg-[var(--bg-base)] px-2.5 py-0.5 rounded border border-[var(--border-default)]">
                        Page Type: {activePage.type}
                      </span>
                    </div>

                    {isCourseStaff && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleSavePage} 
                          disabled={updatePageMutation.isPending}
                          className="btn btn-success text-3xs font-extrabold px-3 py-1.5"
                        >
                          {updatePageMutation.isPending ? 'Saving...' : 'Save Page'}
                        </button>
                        <button 
                          onClick={() => handleDeletePage(activePage.id)}
                          className="btn btn-danger text-3xs font-extrabold px-3 py-1.5"
                          title="Delete Page"
                        >
                          Delete Page
                        </button>
                      </div>
                    )}
                  </div>

                  {/* TEACHER EDIT WORKSPACE */}
                  {isCourseStaff ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Page Title</label>
                          <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            className="input w-full font-medium text-sm"
                            placeholder="e.g. Intro to Loops"
                          />
                        </div>
                        <div>
                          <label className="label block mb-1 font-semibold text-xs text-[var(--text-secondary)]">Page Layout Type</label>
                          <select
                            value={localType}
                            onChange={(e) => setLocalType(e.target.value)}
                            className="input w-full font-medium text-sm"
                          >
                            <option value="TEXT">Rich Text / Markdown Document</option>
                            <option value="VIDEO">Embedding Video Stream</option>
                            <option value="CODE">Programming Code Highlight</option>
                            <option value="MERMAID">Mermaid Vector Flowchart</option>
                            <option value="MATH">KaTeX LaTeX Mathematics</option>
                            <option value="INLINE_QUIZ_QUESTION">Checkpoint Choice Question</option>
                          </select>
                        </div>
                      </div>

                      {/* Content Workspace Area */}
                      <div className="border border-[var(--border-default)] bg-[var(--bg-base)] p-4 rounded-xl mt-4">
                        {localType === 'TEXT' && (
                          <RichContentEditor value={localRteValue} onChange={setLocalRteValue} />
                        )}

                        {/* VIDEO PAGE EDITOR */}
                        {localType === 'VIDEO' && (
                          <div className="space-y-4">
                            <div>
                              <label className="label block text-xs font-semibold text-[var(--text-secondary)]">Streaming Video URL *</label>
                              <input
                                type="text"
                                value={localVideoUrl}
                                onChange={(e) => setLocalVideoUrl(e.target.value)}
                                className="input w-full text-xs"
                                placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                              />
                            </div>
                            {localVideoUrl && (
                              <div className="aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden border border-[var(--border-default)] mt-2">
                                <iframe
                                  src={
                                    localVideoUrl.includes('youtube.com') || localVideoUrl.includes('youtu.be')
                                      ? `https://www.youtube.com/embed/${
                                          localVideoUrl.includes('v=')
                                            ? localVideoUrl.split('v=')[1]?.split('&')[0]
                                            : localVideoUrl.split('/').pop()?.split('?')[0]
                                        }`
                                      : `https://player.vimeo.com/video/${localVideoUrl.split('/').pop()?.split('?')[0]}`
                                  }
                                  className="w-full h-full border-none animate-fade-in"
                                  allow="picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {['CODE', 'MERMAID', 'MATH'].includes(localType) && (
                          <RichContentEditor
                            value={localRteValue}
                            onChange={setLocalRteValue}
                            maxBlocks={1}
                            allowedTypes={[localType.toLowerCase() as any]}
                            placeholder={`Type / to insert a ${localType.toLowerCase()} block…`}
                            sidePanel={false}
                          />
                        )}

                        {/* INLINE QUIZ QUESTION EDITOR */}
                        {localType === 'INLINE_QUIZ_QUESTION' && (
                          <div className="space-y-4">
                            <div className="border border-[var(--border-default)] p-3 rounded-lg bg-[var(--bg-surface)]">
                              <RichContentEditor
                                value={localQuizPrompt}
                                onChange={setLocalQuizPrompt}
                                maxBlocks={3}
                                allowedTypes={['paragraph', 'code', 'math', 'mermaid']}
                                placeholder="Formulate your question stem or scenario..."
                                sidePanel={false}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="label block text-xs font-semibold text-[var(--text-secondary)]">Choice Options</label>
                              <div className="space-y-2 pl-4">
                                {localQuizOptions.map((opt, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="correctChoice"
                                      value={idx}
                                      checked={localQuizCorrectAnswer === String(idx)}
                                      onChange={() => setLocalQuizCorrectAnswer(String(idx))}
                                      className="h-4 w-4 text-[var(--text-primary)]"
                                      title="Mark as correct answer"
                                    />
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const next = [...localQuizOptions];
                                        next[idx] = e.target.value;
                                        setLocalQuizOptions(next);
                                      }}
                                      placeholder={`Choice Option ${idx + 1}`}
                                      className="input flex-1 text-xs"
                                    />
                                    {localQuizOptions.length > 2 && (
                                      <button 
                                        type="button" 
                                        onClick={() => setLocalQuizOptions(localQuizOptions.filter((_, i) => i !== idx))}
                                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--fn-error)]"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setLocalQuizOptions([...localQuizOptions, ''])}
                                className="text-3xs font-extrabold text-[var(--text-primary)] border border-[var(--border-default)] px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] active:scale-[0.98] transition-all ml-4 mt-1"
                              >
                                + Add Option
                              </button>
                            </div>

                            <div>
                              <label className="label block text-xs font-semibold text-[var(--text-secondary)]">Explanation Feedback (Optional)</label>
                              <textarea
                                value={localQuizExplanation}
                                onChange={(e) => setLocalQuizExplanation(e.target.value)}
                                rows={2}
                                placeholder="Explain why the choice option is correct..."
                                className="input w-full text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* STUDENT VIEWER PORT */
                    <div className="space-y-6">
                      <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        {activePage.title || 'Untitled Page'}
                      </h2>
                      
                      {/* TEXT / CODE / MERMAID / MATH RENDERER */}
                      {['TEXT', 'CODE', 'MERMAID', 'MATH'].includes(activePage.type) && (
                        <div className="prose max-w-none">
                          <RichContentRenderer document={activePage.content} />
                        </div>
                      )}

                      {/* VIDEO */}
                      {activePage.type === 'VIDEO' && (
                        <div className="space-y-3">
                          {localVideoUrl ? (
                            <div className="rounded-xl overflow-hidden border border-[var(--border-default)] aspect-video w-full bg-[var(--bg-base)] max-w-2xl mx-auto shadow-2xs">
                              <iframe
                                src={
                                  localVideoUrl.includes('youtube.com') || localVideoUrl.includes('youtu.be')
                                    ? `https://www.youtube.com/embed/${
                                        localVideoUrl.includes('v=')
                                          ? localVideoUrl.split('v=')[1]?.split('&')[0]
                                          : localVideoUrl.split('/').pop()?.split('?')[0]
                                      }`
                                    : `https://player.vimeo.com/video/${localVideoUrl.split('/').pop()?.split('?')[0]}`
                                }
                                className="w-full h-full border-none"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <p className="text-2xs text-[var(--text-faint)] italic">No video content configured.</p>
                          )}
                        </div>
                      )}

                      {/* INLINE QUIZ QUESTION (Checkpoint Question) */}
                      {activePage.type === 'INLINE_QUIZ_QUESTION' && (
                        <StudentInlineQuizWidget 
                          prompt={localQuizPrompt}
                          options={localQuizOptions}
                          correctAnswer={localQuizCorrectAnswer}
                          explanation={localQuizExplanation}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Student interactive Inline Quiz Checkpoint
interface StudentInlineQuizProps {
  prompt: RichContentDocument;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

function StudentInlineQuizWidget({ prompt, options, correctAnswer, explanation }: StudentInlineQuizProps) {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  const isCorrect = isChecked && selectedOpt === correctAnswer;
  const isWrong = isChecked && selectedOpt !== correctAnswer;

  return (
    <div 
      className={`rounded-xl border p-5 space-y-4 transition-all ${
        isCorrect
          ? 'border-[var(--fn-success)] bg-[var(--bg-elevated)]'
          : isWrong
            ? 'border-[var(--fn-error)] bg-[var(--bg-elevated)]'
            : 'border-[var(--border-default)] bg-[var(--bg-base)]'
      }`}
    >
      <div className="flex gap-3">
        <div className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] p-1.5 text-[var(--text-primary)] h-7 w-7 flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-1 flex-1">
          <h5 className="text-[10px] font-extrabold text-[var(--text-faint)] uppercase tracking-widest leading-none">Checkpoint Question</h5>
          <div className="pt-2 text-xs font-bold leading-relaxed text-[var(--text-primary)]">
            <RichContentRenderer document={prompt} />
          </div>
        </div>
      </div>

      {options.length > 0 ? (
        <div className="space-y-2.5 pl-10">
          {options.map((opt, idx) => {
            const optId = String(idx);
            const isOptSelected = selectedOpt === optId;
            
            let optBorder = 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)]';
            let checkIcon = null;

            if (isChecked) {
              if (optId === correctAnswer) {
                optBorder = 'border-[var(--fn-success)] bg-[var(--bg-elevated)] text-[var(--fn-success)]';
                checkIcon = (
                  <svg className="h-4 w-4 text-[var(--fn-success)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                );
              } else if (isOptSelected && optId !== correctAnswer) {
                optBorder = 'border-[var(--fn-error)] bg-[var(--bg-elevated)] text-[var(--fn-error)]';
                checkIcon = (
                  <svg className="h-4 w-4 text-[var(--fn-error)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                );
              } else {
                optBorder = 'border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-faint)] opacity-60';
              }
            } else if (isOptSelected) {
              optBorder = 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold ring-2 ring-[var(--border-default)]';
            }

            return (
              <label 
                key={optId}
                className={`flex items-center justify-between border rounded-xl px-4 py-2.5 text-xs cursor-pointer transition-all active:scale-[0.99] select-none ${optBorder}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="studentInlineAnswer"
                    value={optId}
                    checked={isOptSelected}
                    disabled={isChecked}
                    onChange={() => setSelectedOpt(optId)}
                    className="h-3.5 w-3.5 text-[var(--text-primary)] border-[var(--border-default)]"
                  />
                  <span>{opt}</span>
                </div>
                {checkIcon}
              </label>
            );
          })}
        </div>
      ) : (
        <p className="text-3xs text-[var(--text-faint)] italic pl-10">No choices configured.</p>
      )}

      <div className="pl-10 flex flex-col gap-3">
        {!isChecked && options.length > 0 && (
          <div>
            <button
              onClick={() => setIsChecked(true)}
              disabled={!selectedOpt}
              className="rounded-lg bg-[var(--text-primary)] px-4 py-2 text-2xs font-extrabold text-[var(--bg-base)] shadow-2xs hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            >
              Verify Answer
            </button>
          </div>
        )}

        {isChecked && (
          <div className="space-y-2 border-t border-[var(--border-subtle)] pt-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                isCorrect ? 'bg-[var(--bg-elevated)] text-[var(--fn-success)]' : 'bg-[var(--bg-elevated)] text-[var(--fn-error)]'
              }`}>
                {isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
              <button 
                onClick={() => {
                  setSelectedOpt(null);
                  setIsChecked(false);
                }}
                className="text-3xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-bold uppercase transition-colors cursor-pointer"
              >
                Reset Checkpoint
              </button>
            </div>
            {explanation && (
              <p className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-base)] p-2.5 rounded-lg border border-[var(--border-subtle)] leading-relaxed italic">
                <strong>Explanation:</strong> {explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
