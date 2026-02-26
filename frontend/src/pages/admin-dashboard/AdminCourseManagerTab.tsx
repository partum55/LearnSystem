import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownTrayIcon,
  BookOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { AdminCourse, getAdminCourses, PageResponse, deleteAdminCourse, publishAdminCourse, unpublishAdminCourse } from '../../api/admin';
import { courseManagementApi } from '../../api/adminCourseManagement';
import { Loading } from '../../components/Loading';
import { AdminCourseDeepManager } from './AdminCourseDeepManager';

interface Props {
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

export const AdminCourseManagerTab: React.FC<Props> = ({ onFeedback }) => {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loadedRequest, setLoadedRequest] = useState<{ page: number; reloadToken: number } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const loading = !loadedRequest || loadedRequest.page !== page || loadedRequest.reloadToken !== reloadToken;

  const refreshCourses = useCallback(() => {
    setReloadToken(prev => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    getAdminCourses({ page, size: 50 })
      .then((response: PageResponse<AdminCourse>) => {
        if (!active) return;
        setCourses(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      })
      .catch(() => {
        if (!active) return;
        onFeedback('error', 'Failed to load courses');
      })
      .finally(() => {
        if (!active) return;
        setLoadedRequest({ page, reloadToken });
      });

    return () => {
      active = false;
    };
  }, [page, reloadToken, onFeedback]);

  const filtered = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(c =>
      c.code.toLowerCase().includes(q) ||
      (c.titleUk || '').toLowerCase().includes(q) ||
      (c.titleEn || '').toLowerCase().includes(q)
    );
  }, [courses, search]);

  const togglePublish = async (course: AdminCourse) => {
    setActionLoading(course.id);
    try {
      if (course.isPublished) {
        await unpublishAdminCourse(course.id);
      } else {
        await publishAdminCourse(course.id);
      }
      onFeedback('success', course.isPublished ? 'Unpublished' : 'Published');
      refreshCourses();
    } catch {
      onFeedback('error', 'Failed');
    }
    setActionLoading(null);
  };

  const removeCourse = async (course: AdminCourse) => {
    if (!confirm(`Delete course ${course.code}? This will remove all modules, assignments, and data.`)) return;
    setActionLoading(course.id);
    try {
      await deleteAdminCourse(course.id);
      onFeedback('success', 'Course deleted');
      refreshCourses();
    } catch {
      onFeedback('error', 'Failed to delete');
    }
    setActionLoading(null);
  };

  const exportCourse = async (course: AdminCourse) => {
    setActionLoading(course.id);
    try {
      await courseManagementApi.downloadCourseExport(course.id, course.code);
      onFeedback('success', `Exported ${course.code}`);
    } catch {
      onFeedback('error', 'Export failed — make sure the backend supports this endpoint');
    }
    setActionLoading(null);
  };

  // If a course is selected, show the deep manager
  if (selectedCourse) {
    return (
      <AdminCourseDeepManager
        course={selectedCourse}
        onBack={() => { setSelectedCourse(null); refreshCourses(); }}
        onFeedback={onFeedback}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            className="input text-sm pl-8 w-full"
            placeholder="Search courses by code or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
          {totalElements} courses total
        </span>
      </div>

      {loading ? <Loading /> : (
        <>
          {filtered.length === 0 && (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No courses found</p>
          )}

          <div className="space-y-1">
            {filtered.map(course => (
              <div
                key={course.id}
                className="rounded-lg p-3 flex items-center justify-between group transition-colors"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                    <BookOpenIcon className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{course.code}</span>
                      {course.isPublished ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--fn-success)' }}>Published</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--fn-warning)' }}>Draft</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                        {course.visibility}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {course.titleUk}{course.titleEn ? ` / ${course.titleEn}` : ''}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {course.moduleCount ?? 0} modules · {course.memberCount ?? 0} members · {course.maxStudents ? `max ${course.maxStudents}` : 'unlimited'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="btn btn-primary btn-xs"
                    title="Manage course content"
                    onClick={() => setSelectedCourse(course)}
                    disabled={actionLoading === course.id}
                  >
                    <WrenchScrewdriverIcon className="h-3.5 w-3.5" /> Manage
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    title="Export as JSON"
                    onClick={() => exportCourse(course)}
                    disabled={actionLoading === course.id}
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    title={course.isPublished ? 'Unpublish' : 'Publish'}
                    onClick={() => togglePublish(course)}
                    disabled={actionLoading === course.id}
                  >
                    {course.isPublished ? <EyeSlashIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ color: 'var(--fn-error)' }}
                    title="Delete course"
                    onClick={() => removeCourse(course)}
                    disabled={actionLoading === course.id}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button className="btn btn-ghost btn-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page + 1} of {totalPages}</span>
              <button className="btn btn-ghost btn-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
