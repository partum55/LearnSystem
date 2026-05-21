'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useLearningItem, useLessonBlocks } from '@/features/learning-items/hooks/useLearningItemQueries';
import { useCurrentUser } from '@/features/users/hooks/useUserQueries';
import { useCourseMembers } from '@/features/courses/hooks/useCourseQueries';
import { Loading } from '@/components/Loading';

interface LearningItemDetailPageProps {
  learningItemId: string;
}

// Helper to coerce size bytes to human-readable
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

// Simple helper to safely extract strings from settings
const getSettingString = (settings: Record<string, unknown> | undefined, keys: string[]): string => {
  if (!settings) return '';
  for (const key of keys) {
    if (typeof settings[key] === 'string') {
      return settings[key] as string;
    }
  }
  return '';
};

export function LearningItemDetailPage({ learningItemId }: LearningItemDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [todoToast, setTodoToast] = useState<string | null>(null);

  // Read courseId context from URL search params
  const courseId = searchParams.get('courseId') || '';

  // Core canonical API queries
  const { data: item, isLoading: isItemLoading, error: itemError } = useLearningItem(learningItemId);
  const { data: blocks, isLoading: isBlocksLoading } = useLessonBlocks(
    item?.type === 'lesson' ? learningItemId : undefined
  );
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  
  // Fetch course members only if courseId context is available
  const { data: membersPage } = useCourseMembers(courseId || undefined, { size: 100 });

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

  const isLoading = isItemLoading || isUserLoading || (item?.type === 'lesson' && isBlocksLoading);

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
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/40 p-8 text-amber-900 shadow-sm backdrop-blur-xs text-center space-y-4 mt-8 animate-fade-in">
        <div className="mx-auto inline-flex rounded-full bg-amber-100 p-3 text-amber-700">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v4m0-4v-1m-1-4h3m-2-3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Access Restricted</h2>
          <p className="text-sm text-amber-800 leading-relaxed">
            You do not have permission to view this learning resource. Authorized course members only are granted entry.
          </p>
        </div>
        <Link 
          href={backToCourseUrl}
          className="inline-block rounded-lg bg-amber-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-amber-900 transition-colors shadow-2xs"
        >
          Return to Course Syllabus
        </Link>
      </div>
    );
  }

  if (isNotFound || !item) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xs text-center space-y-4 mt-8 animate-fade-in">
        <div className="mx-auto inline-flex rounded-full bg-slate-100 p-3 text-slate-500">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Resource Not Found</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            We could not find the learning material you are looking for. It might have been archived or moved by the teaching staff.
          </p>
        </div>
        <button 
          onClick={() => router.back()}
          className="inline-block rounded-lg bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-900 transition-colors shadow-2xs"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (itemError) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-rose-900 shadow-xs backdrop-blur-xs mt-8">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-rose-100 p-2 text-rose-650 flex-shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Failed to Load Learning Material</h2>
            <p className="mt-2 text-sm text-rose-750">
              We encountered an issue retrieving the syllabus detail data. The connection might have dropped or your security session has expired.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Parse type-specific settings keys safely
  const urlSetting = getSettingString(item.settings, ['url', 'fileUrl', 'externalUrl', 'pdfUrl', 'videoUrl']);
  const sizeSetting = (item.settings?.fileSize || item.settings?.size) as number | string | undefined;

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-4xl mx-auto relative">
      {/* Toast Alert Placeholder */}
      {todoToast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900/90 text-white px-5 py-3 text-xs font-semibold shadow-lg backdrop-blur-xs flex items-center gap-2 border border-slate-700 animate-slide-in">
          <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            className="group inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-650 transition-colors uppercase tracking-wider"
          >
            <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Course
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-widest text-indigo-750">
                Type: {item.type}
              </span>
              {item.visibilityStatus && (
                <span className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-widest text-slate-500">
                  {item.visibilityStatus}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl text-slate-900">
              {item.title}
            </h1>
            {item.description && (
              <p className="text-sm text-slate-500 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* Safe Staff Controls callout banner */}
          {isCourseStaff && (
            <div className="flex flex-wrap gap-2 flex-shrink-0 self-start md:self-auto bg-slate-50 border border-slate-200 p-2 rounded-xl shadow-3xs">
              <button 
                onClick={() => showToast('TODO: Open edit learning item modal in a future pass.')} 
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-3xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-2xs active:scale-[0.98] transition-all"
              >
                Edit Item
              </button>
              {item.type === 'lesson' && (
                <>
                  <button 
                    onClick={() => showToast('TODO: Open add lesson block modal in a future pass.')} 
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-3xs font-extrabold text-white hover:bg-indigo-700 shadow-2xs active:scale-[0.98] transition-all"
                  >
                    + Lesson Block
                  </button>
                  <button 
                    onClick={() => showToast('TODO: Open reorder blocks editor in a future pass.')} 
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-3xs font-extrabold text-white hover:bg-emerald-700 shadow-2xs active:scale-[0.98] transition-all"
                  >
                    Reorder Blocks
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main viewport block by item type */}
      <main className="space-y-6">
        {/* PDF RENDERER */}
        {item.type === 'pdf' && (
          <div className="space-y-4">
            {urlSetting ? (
              <div className="rounded-xl overflow-hidden border border-slate-250 shadow-sm aspect-video w-full h-[650px] bg-slate-800">
                <iframe
                  src={`${urlSetting}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-none"
                  title={item.title}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-12 text-center">
                <p className="text-xs text-slate-500 italic">No PDF document reference URL is registered on this portal.</p>
              </div>
            )}
            
            {urlSetting && (
              <div className="flex justify-end">
                <a
                  href={urlSetting}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs"
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF Document
                </a>
              </div>
            )}
          </div>
        )}

        {/* LINK RENDERER */}
        {item.type === 'link' && (
          <div className="mx-auto max-w-2xl">
            {urlSetting ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-sm">
                <div className="space-y-2 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wide">
                    External link
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 truncate leading-snug">
                    {new URL(urlSetting).hostname || urlSetting}
                  </h3>
                  <p className="text-3xs text-slate-450 font-mono truncate">{urlSetting}</p>
                </div>
                <a
                  href={urlSetting}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs flex-shrink-0 active:scale-[0.98]"
                >
                  Visit Resource Link
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-12 text-center">
                <p className="text-xs text-slate-500 italic">No external URL hyperlink has been registered.</p>
              </div>
            )}
          </div>
        )}

        {/* VIDEO RENDERER */}
        {item.type === 'video' && (
          <div className="space-y-4">
            {urlSetting ? (
              <div className="rounded-xl overflow-hidden border border-slate-250 shadow-sm aspect-video w-full bg-black">
                {urlSetting.includes('youtube.com') || urlSetting.includes('youtu.be') || urlSetting.includes('vimeo.com') ? (
                  // Inline YouTube / Vimeo Embed Resolver
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
                ) : (
                  <video
                    controls
                    className="w-full h-full outline-hidden"
                    src={urlSetting}
                  />
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-12 text-center">
                <p className="text-xs text-slate-500 italic">No video file or stream URL has been registered.</p>
              </div>
            )}
          </div>
        )}

        {/* FILE DOWNLOAD RENDERER */}
        {item.type === 'file' && (
          <div className="mx-auto max-w-2xl">
            {urlSetting ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col items-center text-center space-y-4">
                <div className="rounded-full bg-slate-100 border border-slate-200 p-4 text-indigo-600 shadow-3xs">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 truncate leading-snug max-w-md mx-auto">
                    {item.title}
                  </h3>
                  {sizeSetting && (
                    <p className="text-2xs font-mono text-slate-450 uppercase">
                      Size: {formatBytes(sizeSetting)}
                    </p>
                  )}
                </div>
                <a
                  href={urlSetting}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-2xs active:scale-[0.98]"
                >
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Resource File
                </a>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-12 text-center">
                <p className="text-xs text-slate-500 italic">No downloadable file reference is registered.</p>
              </div>
            )}
          </div>
        )}

        {/* RTE DOCUMENT RENDERER */}
        {item.type === 'rte' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
            {item.settings?.textContent || item.settings?.content ? (
              <article className="prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                {String(item.settings?.textContent || item.settings?.content || '')}
              </article>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-450 italic">No rich document content has been drafted yet.</p>
              </div>
            )}
          </div>
        )}

        {/* LESSON BLOCKS DECK PLAYER */}
        {item.type === 'lesson' && (
          <div className="space-y-8">
            {blocks && blocks.length > 0 ? (
              <div className="space-y-8">
                {blocks.map((block, index) => (
                  <article 
                    key={block.id} 
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Block Title Header */}
                    <div className="border-b border-slate-100 bg-slate-50/30 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-250">
                          Step {block.order ?? index + 1}
                        </span>
                        {block.title && (
                          <h4 className="text-xs font-bold text-slate-700">{block.title}</h4>
                        )}
                      </div>
                      <span className="text-[9px] font-extrabold text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {block.type.toLowerCase()}
                      </span>
                    </div>

                    {/* Block Content Renderers */}
                    <div className="p-5">
                      {/* TEXT BLOCK */}
                      {(block.type.toLowerCase() === 'text') && (
                        <div className="prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                          {block.content || 'No text content loaded.'}
                        </div>
                      )}

                      {/* VIDEO BLOCK */}
                      {(block.type.toLowerCase() === 'video') && (
                        <div className="space-y-3">
                          {block.settings?.url || block.content ? (
                            <div className="rounded-lg overflow-hidden border border-slate-200 aspect-video w-full bg-black max-w-2xl mx-auto shadow-2xs">
                              {String(block.settings?.url || block.content).includes('youtube.com') || 
                               String(block.settings?.url || block.content).includes('youtu.be') || 
                               String(block.settings?.url || block.content).includes('vimeo.com') ? (
                                <iframe
                                  src={
                                    String(block.settings?.url || block.content).includes('youtube.com') || String(block.settings?.url || block.content).includes('youtu.be')
                                      ? `https://www.youtube.com/embed/${
                                          String(block.settings?.url || block.content).includes('v=')
                                            ? String(block.settings?.url || block.content).split('v=')[1]?.split('&')[0]
                                            : String(block.settings?.url || block.content).split('/').pop()?.split('?')[0]
                                        }`
                                      : `https://player.vimeo.com/video/${String(block.settings?.url || block.content).split('/').pop()?.split('?')[0]}`
                                  }
                                  className="w-full h-full border-none"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title={block.title || 'Lesson Video block'}
                                />
                              ) : (
                                <video
                                  controls
                                  className="w-full h-full outline-hidden"
                                  src={String(block.settings?.url || block.content)}
                                />
                              )}
                            </div>
                          ) : (
                            <p className="text-2xs text-slate-400 italic">No video content reference.</p>
                          )}
                        </div>
                      )}

                      {/* INLINE QUIZ QUESTION BLOCK (Local Interactive Check-Answers) */}
                      {(block.type.toLowerCase() === 'inline_quiz_question') && (
                        <InlineQuizBlockWidget block={block} />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 py-16 text-center shadow-xs">
                <div className="mx-auto max-w-xs space-y-3">
                  <div className="inline-flex rounded-full bg-slate-100 p-3 text-slate-400 border border-slate-200/50">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">Empty Lesson blocks</h3>
                    <p className="text-xs text-slate-500">
                      There are no active learning steps or quiz elements drafted for this lesson module yet.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Interactive local-only inline question widget
interface InlineQuizBlockWidgetProps {
  block: {
    id: string;
    content?: string | null;
    settings?: Record<string, unknown> | null;
  };
}

function InlineQuizBlockWidget({ block }: InlineQuizBlockWidgetProps) {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  // Extract question properties safely
  const prompt = useMemo(() => {
    return (
      (block.settings?.prompt as string) || 
      (block.settings?.stem as string) || 
      block.content || 
      'Inline Learning Checkpoint'
    );
  }, [block]);

  // Extract options as strings or structured objects
  const optionsList = useMemo((): Array<{ id: string; text: string }> => {
    const rawOpts = block.settings?.options || block.settings?.choices || block.settings?.answers;
    if (!Array.isArray(rawOpts)) return [];
    return rawOpts.map((opt, idx) => {
      if (typeof opt === 'string') {
        return { id: String(idx), text: opt };
      }
      if (opt && typeof opt === 'object') {
        const o = opt as Record<string, unknown>;
        return {
          id: String(o.id ?? o.code ?? idx),
          text: String(o.text || o.option || o.label || ''),
        };
      }
      return { id: String(idx), text: String(opt) };
    });
  }, [block]);

  const correctAnswer = useMemo(() => {
    const rawCorrect = block.settings?.correctAnswer ?? block.settings?.correct_answer ?? block.settings?.correctIndex;
    if (rawCorrect === undefined || rawCorrect === null) return '';
    return String(rawCorrect);
  }, [block]);

  const explanation = useMemo(() => {
    return (block.settings?.explanation as string) || '';
  }, [block]);

  // Local state check answer logic
  const isCorrect = isChecked && selectedOpt === correctAnswer;
  const isWrong = isChecked && selectedOpt !== correctAnswer;

  return (
    <div 
      className={`rounded-xl border p-5 space-y-4 transition-all ${
        isCorrect 
          ? 'border-emerald-250 bg-emerald-50/10 shadow-3xs' 
          : isWrong 
            ? 'border-rose-250 bg-rose-50/10 shadow-3xs' 
            : 'border-slate-200 bg-slate-50/30'
      }`}
    >
      <div className="flex gap-2">
        <div className="rounded-lg bg-indigo-50 border border-indigo-150 p-1.5 text-indigo-700 h-7 w-7 flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-1">
          <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Checkpoint Interaction</h5>
          <p className="text-xs font-extrabold text-slate-800 leading-snug pt-1">{prompt}</p>
        </div>
      </div>

      {optionsList.length > 0 ? (
        <div className="space-y-2.5 pl-9">
          {optionsList.map((opt) => {
            const isOptSelected = selectedOpt === opt.id;
            
            let optBorder = 'border-slate-200 hover:border-slate-350 bg-white';
            let checkIcon = null;

            if (isChecked) {
              if (opt.id === correctAnswer) {
                optBorder = 'border-emerald-500 bg-emerald-50/50 text-emerald-800';
                checkIcon = (
                  <svg className="h-4 w-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                );
              } else if (isOptSelected && opt.id !== correctAnswer) {
                optBorder = 'border-rose-500 bg-rose-50/50 text-rose-800';
                checkIcon = (
                  <svg className="h-4 w-4 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                );
              } else {
                optBorder = 'border-slate-150 bg-slate-50/20 text-slate-400 opacity-60';
              }
            } else if (isOptSelected) {
              optBorder = 'border-indigo-650 bg-indigo-50/30 text-indigo-900 font-semibold ring-2 ring-indigo-100';
            }

            return (
              <label 
                key={opt.id}
                className={`flex items-center justify-between border rounded-xl px-4 py-2.5 text-xs cursor-pointer transition-all active:scale-[0.99] select-none ${optBorder}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`inline-q-${block.id}`}
                    value={opt.id}
                    checked={isOptSelected}
                    disabled={isChecked}
                    onChange={() => setSelectedOpt(opt.id)}
                    className="h-3.5 w-3.5 text-indigo-650 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>{opt.text}</span>
                </div>
                {checkIcon}
              </label>
            );
          })}
        </div>
      ) : (
        <p className="text-3xs text-slate-400 italic pl-9">No choice options available for this learning question.</p>
      )}

      <div className="pl-9 flex flex-col gap-3">
        {!isChecked && optionsList.length > 0 && (
          <div>
            <button
              onClick={() => setIsChecked(true)}
              disabled={!selectedOpt}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-2xs font-extrabold text-white shadow-2xs hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Verify Answer
            </button>
          </div>
        )}

        {isChecked && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isCorrect ? 'Correct!' : 'Try Again'}
              </span>
              <button 
                onClick={() => {
                  setSelectedOpt(null);
                  setIsChecked(false);
                }}
                className="text-3xs text-slate-500 hover:text-indigo-600 font-bold uppercase transition-colors"
              >
                Reset Checkpoint
              </button>
            </div>
            {explanation && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed italic">
                <strong>Explanation:</strong> {explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
