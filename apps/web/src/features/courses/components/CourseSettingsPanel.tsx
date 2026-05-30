'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Loading, Modal } from '@/components';
import {
  useArchiveCourse,
  useCourseSettings,
  useDeleteCourse,
  usePublishCourse,
  useRestoreCourse,
  useUnpublishCourse,
  useUpdateCourseSettings,
} from '@/features/courses/hooks/useCourseQueries';
import type { UpdateCourseSettingsRequest } from '@/features/courses/api/canonical.types';

interface CourseAdminPermissions {
  isAdmin: boolean;
  isOwner: boolean;
  canManageCourseSettings: boolean;
  canArchiveCourse: boolean;
  canDeleteCourse: boolean;
}

interface CourseSettingsPanelProps {
  courseId: string;
  permissions: CourseAdminPermissions;
  onToast: (message: string) => void;
}

type ConfirmAction = 'archive' | 'delete' | null;

const STATUS_COPY: Record<string, string> = {
  DRAFT: 'Visible only to staff. Students cannot see this course yet.',
  PUBLISHED: 'Live. Enrolled students can access content and submit work.',
  ARCHIVED: 'Read-only for staff and students. Owner and admin can still edit or restore.',
};

export function CourseSettingsPanel({ courseId, permissions, onToast }: CourseSettingsPanelProps) {
  const { data: settings, isLoading, error } = useCourseSettings(
    courseId,
    permissions.canManageCourseSettings,
    { adminFallback: permissions.isAdmin }
  );
  const updateSettings = useUpdateCourseSettings(courseId);
  const archiveCourse = useArchiveCourse(courseId);
  const publishCourse = usePublishCourse(courseId);
  const unpublishCourse = useUnpublishCourse(courseId);
  const restoreCourse = useRestoreCourse(courseId);
  const deleteCourse = useDeleteCourse(courseId);
  const router = useRouter();

  const [form, setForm] = useState<UpdateCourseSettingsRequest>({
    code: '',
    titleUk: '',
    titleEn: '',
    descriptionUk: '',
    descriptionEn: '',
    syllabus: '',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const baseline = useMemo<UpdateCourseSettingsRequest>(
    () => ({
      code: settings?.code ?? '',
      titleUk: settings?.titleUk ?? '',
      titleEn: settings?.titleEn ?? '',
      descriptionUk: settings?.descriptionUk ?? '',
      descriptionEn: settings?.descriptionEn ?? '',
      syllabus: settings?.syllabus ?? '',
    }),
    [settings]
  );

  useEffect(() => {
    setForm(baseline);
  }, [baseline]);

  const isDirty = useMemo(
    () => (Object.keys(baseline) as Array<keyof UpdateCourseSettingsRequest>).some(
      (key) => (form[key] ?? '') !== (baseline[key] ?? '')
    ),
    [form, baseline]
  );

  const title = form.titleUk.trim() || settings?.titleUk || 'this course';
  const code = form.code.trim() || settings?.code || courseId.slice(0, 8).toUpperCase();
  const currentStatus = settings?.status ?? 'DRAFT';
  const isArchived = currentStatus === 'ARCHIVED';
  const isDraft = currentStatus === 'DRAFT';
  const isPublished = currentStatus === 'PUBLISHED';
  const isBusy =
    updateSettings.isPending ||
    archiveCourse.isPending ||
    publishCourse.isPending ||
    unpublishCourse.isPending ||
    restoreCourse.isPending ||
    deleteCourse.isPending;

  const canSave = form.code.trim().length > 0 && form.titleUk.trim().length > 0 && isDirty && !isBusy;

  const apiError = (err: unknown, fallback: string) => {
    const candidate = err as { response?: { data?: { message?: string } }; message?: string };
    return candidate?.response?.data?.message || candidate?.message || fallback;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await updateSettings.mutateAsync({
        ...form,
        code: form.code.trim(),
        titleUk: form.titleUk.trim(),
        titleEn: form.titleEn?.trim() || null,
        descriptionUk: form.descriptionUk?.trim() || null,
        descriptionEn: form.descriptionEn?.trim() || null,
        syllabus: form.syllabus?.trim() || null,
      });
      onToast('Course settings saved.');
    } catch (err) {
      setErrorMessage(apiError(err, 'Failed to save course settings.'));
    }
  };

  const runLifecycle = async (
    action: () => Promise<unknown>,
    success: string,
    fallback: string
  ) => {
    setErrorMessage(null);
    try {
      await action();
      onToast(success);
    } catch (err) {
      setErrorMessage(apiError(err, fallback));
    }
  };

  const handleConfirmedArchive = async () => {
    setErrorMessage(null);
    try {
      await archiveCourse.mutateAsync();
      setConfirmAction(null);
      onToast('Course archived.');
    } catch (err) {
      setErrorMessage(apiError(err, 'Failed to archive course.'));
    }
  };

  const handleConfirmedDelete = async () => {
    setErrorMessage(null);
    try {
      await deleteCourse.mutateAsync();
      setConfirmAction(null);
      onToast('Course permanently deleted.');
      router.push('/courses');
    } catch (err) {
      setErrorMessage(apiError(err, 'Failed to delete course.'));
    }
  };

  if (!permissions.canManageCourseSettings) {
    return null;
  }

  if (isLoading) {
    return <Loading label="Loading course settings..." />;
  }

  if (error || !settings) {
    const details = apiError(error, 'No response body was returned.');
    return (
      <section className="rounded-lg border p-5" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
        <h2 className="text-lg font-semibold">Course settings unavailable</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          The settings endpoint did not return a usable response for this account: {details}
        </p>
      </section>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      {/* Course details */}
      <form onSubmit={handleSubmit}>
        <h3 className="mb-3.5 text-sm font-semibold text-[var(--text-primary)]">Course details</h3>

        {errorMessage && (
          <div
            className="mb-4 rounded-md border p-3 text-sm"
            style={{ borderColor: 'var(--border-default)', color: 'var(--fn-error)', background: 'var(--bg-elevated)' }}
          >
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Input
            label="Title"
            value={form.titleUk}
            onChange={(event) => setForm((current) => ({ ...current, titleUk: event.target.value }))}
            required
            maxLength={255}
          />

          <div className="grid gap-3.5 sm:grid-cols-[180px_1fr]">
            <Input
              label="Course code"
              className="font-mono"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              required
              maxLength={50}
            />
            <Input
              label="English title"
              value={form.titleEn ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, titleEn: event.target.value }))}
              maxLength={255}
            />
          </div>

          <div className="grid gap-3.5 md:grid-cols-2">
            <TextAreaField
              label="Description"
              value={form.descriptionUk ?? ''}
              rows={5}
              onChange={(value) => setForm((current) => ({ ...current, descriptionUk: value }))}
            />
            <TextAreaField
              label="English description"
              value={form.descriptionEn ?? ''}
              rows={5}
              onChange={(value) => setForm((current) => ({ ...current, descriptionEn: value }))}
            />
          </div>

          <TextAreaField
            label="Syllabus / overview"
            value={form.syllabus ?? ''}
            rows={7}
            onChange={(value) => setForm((current) => ({ ...current, syllabus: value }))}
          />
        </div>

        {isDirty && (
          <div className="mt-4 flex gap-2">
            <Button type="submit" size="sm" disabled={!canSave} isLoading={updateSettings.isPending}>
              Save changes
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setForm(baseline)} disabled={isBusy}>
              Discard
            </Button>
          </div>
        )}
      </form>

      <div className="my-6 h-px" style={{ background: 'var(--border-default)' }} />

      {/* Lifecycle */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Lifecycle</h3>
        <p className="mb-3.5 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Courses move between three states. There is no public/private visibility — all courses are private.
        </p>

        <div
          className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Current status</span>
              <span className={statusBadgeClass(currentStatus)}>{currentStatus}</span>
            </div>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {STATUS_COPY[currentStatus]}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isArchived ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() =>
                  runLifecycle(() => restoreCourse.mutateAsync(), 'Course restored as draft.', 'Failed to restore course.')
                }
                isLoading={restoreCourse.isPending}
              >
                <ArrowUturnLeftIcon className="mr-1.5 inline-block h-4 w-4" />
                Restore to draft
              </Button>
            ) : (
              <>
                {isDraft && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      runLifecycle(() => publishCourse.mutateAsync(), 'Course published.', 'Failed to publish course.')
                    }
                    isLoading={publishCourse.isPending}
                  >
                    <PaperAirplaneIcon className="mr-1.5 inline-block h-4 w-4" />
                    Publish
                  </Button>
                )}
                {isPublished && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      runLifecycle(
                        () => unpublishCourse.mutateAsync(),
                        'Course unpublished to draft.',
                        'Failed to unpublish course.'
                      )
                    }
                    isLoading={unpublishCourse.isPending}
                  >
                    <EyeSlashIcon className="mr-1.5 inline-block h-4 w-4" />
                    Unpublish
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!permissions.canArchiveCourse}
                  onClick={() => setConfirmAction('archive')}
                >
                  <ArchiveBoxIcon className="mr-1.5 inline-block h-4 w-4" />
                  Archive
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={!permissions.canDeleteCourse}
              onClick={() => setConfirmAction('delete')}
            >
              <TrashIcon className="mr-1.5 inline-block h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </section>

      <CourseActionModal
        action={confirmAction}
        courseTitle={title}
        courseCode={code}
        loading={archiveCourse.isPending || deleteCourse.isPending}
        onClose={() => setConfirmAction(null)}
        onArchive={handleConfirmedArchive}
        onDelete={handleConfirmedDelete}
      />
    </div>
  );
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'badge badge-published';
    case 'ARCHIVED':
      return 'badge badge-archived';
    default:
      return 'badge badge-draft';
  }
}

function TextAreaField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="input-group block w-full">
      <span className="label mb-1 block text-sm font-semibold">{label}</span>
      <textarea
        className="input min-h-0 w-full resize-y leading-6"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CourseActionModal({
  action,
  courseTitle,
  courseCode,
  loading,
  onClose,
  onArchive,
  onDelete,
}: {
  action: ConfirmAction;
  courseTitle: string;
  courseCode: string;
  loading: boolean;
  onClose: () => void;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const requiredText = action === 'archive' ? 'ARCHIVE' : 'DELETE';

  useEffect(() => {
    setConfirmText('');
    setError(null);
  }, [action]);

  if (!action) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (confirmText !== requiredText) {
      setError(`Type ${requiredText} to confirm.`);
      return;
    }
    setError(null);
    if (action === 'archive') {
      await onArchive();
    } else {
      await onDelete();
    }
  };

  const isDelete = action === 'delete';

  return (
    <Modal isOpen={Boolean(action)} onClose={onClose} title={isDelete ? 'Delete course' : 'Archive course'}>
      <form onSubmit={submit} className="space-y-4">
        <div
          className="flex gap-3 rounded-lg border p-4"
          style={{
            borderColor: isDelete ? 'rgba(239, 68, 68, 0.22)' : 'var(--border-default)',
            background: isDelete ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-elevated)',
          }}
        >
          <ExclamationTriangleIcon
            className="h-5 w-5 shrink-0"
            style={{ color: isDelete ? 'var(--fn-error)' : 'var(--fn-warning)' }}
          />
          <div className="space-y-2 text-sm">
            <p className="font-semibold">
              {courseTitle} (<span className="font-mono">{courseCode}</span>)
            </p>
            {isDelete ? (
              <p style={{ color: 'var(--text-muted)' }}>
                This is a hard delete. All modules, learning items, assignments, submissions, grades, seminar attendance
                and course memberships are permanently removed. Global users and enrollment groups are not deleted. This
                cannot be undone.
              </p>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>
                Archiving makes the course read-only for teachers, TAs and students while preserving modules,
                assignments, submissions and grades. Owners and admins can still edit or restore it later.
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--fn-error)' }}>
            {error}
          </p>
        )}

        <Input
          label={`Type ${requiredText} to confirm`}
          className="font-mono"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={requiredText}
          disabled={loading}
          autoFocus
        />

        <div className="flex justify-end gap-3 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={isDelete ? 'danger' : 'primary'}
            disabled={confirmText !== requiredText || loading}
            isLoading={loading}
          >
            {isDelete ? 'Delete permanently' : 'Archive course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
