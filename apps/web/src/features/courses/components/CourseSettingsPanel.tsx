'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArchiveBoxIcon, ArrowUturnLeftIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Input, Loading, Modal } from '@/components';
import {
  useArchiveCourse,
  useCourseSettings,
  useDeleteCourse,
  useRestoreCourse,
  useUpdateCourseSettings,
} from '@/features/courses/hooks/useCourseQueries';
import type { CourseStatus, CourseVisibility, UpdateCourseSettingsRequest } from '@/features/courses/api/canonical.types';

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

const statusOptions: CourseStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const visibilityOptions: CourseVisibility[] = ['DRAFT', 'PRIVATE', 'PUBLIC'];

export function CourseSettingsPanel({ courseId, permissions, onToast }: CourseSettingsPanelProps) {
  const { data: settings, isLoading, error } = useCourseSettings(courseId, permissions.canManageCourseSettings);
  const updateSettings = useUpdateCourseSettings(courseId);
  const archiveCourse = useArchiveCourse(courseId);
  const restoreCourse = useRestoreCourse(courseId);
  const deleteCourse = useDeleteCourse(courseId);

  const [form, setForm] = useState<UpdateCourseSettingsRequest>({
    code: '',
    titleUk: '',
    titleEn: '',
    descriptionUk: '',
    descriptionEn: '',
    syllabus: '',
    visibility: 'DRAFT',
    status: 'DRAFT',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    if (!settings) return;
    setForm({
      code: settings.code ?? '',
      titleUk: settings.titleUk ?? '',
      titleEn: settings.titleEn ?? '',
      descriptionUk: settings.descriptionUk ?? '',
      descriptionEn: settings.descriptionEn ?? '',
      syllabus: settings.syllabus ?? '',
      visibility: settings.visibility ?? 'DRAFT',
      status: settings.status ?? 'DRAFT',
    });
  }, [settings]);

  const title = form.titleUk.trim() || settings?.titleUk || 'this course';
  const code = form.code.trim() || settings?.code || courseId.slice(0, 8).toUpperCase();
  const isArchived = (settings?.status ?? form.status) === 'ARCHIVED';
  const isBusy = updateSettings.isPending || archiveCourse.isPending || restoreCourse.isPending || deleteCourse.isPending;

  const canSave = useMemo(() => {
    return form.code.trim().length > 0 && form.titleUk.trim().length > 0 && !isBusy;
  }, [form.code, form.titleUk, isBusy]);

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

  const handleRestore = async () => {
    setErrorMessage(null);
    try {
      await restoreCourse.mutateAsync();
      onToast('Course restored as draft.');
    } catch (err) {
      setErrorMessage(apiError(err, 'Failed to restore course.'));
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
      onToast('Course soft-deleted by archiving.');
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
    return (
      <section className="rounded-lg border p-5" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
        <h2 className="text-lg font-semibold">Course settings unavailable</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          The settings endpoint did not return a usable response for this account.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border p-5"
        style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Course Settings</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Base course details are restricted to the owner and platform admins.
            </p>
          </div>
          <Button type="submit" disabled={!canSave} isLoading={updateSettings.isPending}>
            Save changes
          </Button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md border p-3 text-sm" style={{ borderColor: 'rgba(239, 68, 68, 0.25)', color: 'var(--fn-error)' }}>
            {errorMessage}
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input
            label="Course title"
            value={form.titleUk}
            onChange={(event) => setForm((current) => ({ ...current, titleUk: event.target.value }))}
            required
            maxLength={255}
          />
          <Input
            label="Course code"
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
          <label className="input-group w-full">
            <span className="label mb-1 block text-sm font-semibold">Status</span>
            <select
              className="input"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CourseStatus }))}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="input-group w-full">
            <span className="label mb-1 block text-sm font-semibold">Visibility</span>
            <select
              className="input"
              value={form.visibility}
              onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value as CourseVisibility }))}
            >
              {visibilityOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
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

        <div className="mt-4">
          <TextAreaField
            label="Syllabus / overview"
            value={form.syllabus ?? ''}
            rows={7}
            onChange={(value) => setForm((current) => ({ ...current, syllabus: value }))}
          />
        </div>
      </form>

      <aside className="space-y-4">
        <section className="rounded-lg border p-5" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
          <h3 className="text-sm font-semibold">Ownership</h3>
          <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <p>{permissions.isAdmin ? 'Platform admin override is active.' : 'Owner-level course membership is active.'}</p>
            <p>Ownership transfer is not exposed by the current course model.</p>
          </div>
        </section>

        <section className="rounded-lg border p-5" style={{ borderColor: 'rgba(239, 68, 68, 0.22)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" style={{ color: 'var(--fn-error)' }} />
            <h3 className="text-sm font-semibold">Destructive Controls</h3>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {isArchived ? (
              <Button type="button" variant="secondary" onClick={handleRestore} isLoading={restoreCourse.isPending}>
                <ArrowUturnLeftIcon className="mr-2 inline-block h-4 w-4" />
                Restore as draft
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={!permissions.canArchiveCourse}
                onClick={() => setConfirmAction('archive')}
              >
                <ArchiveBoxIcon className="mr-2 inline-block h-4 w-4" />
                Archive course
              </Button>
            )}
            <Button
              type="button"
              variant="danger"
              disabled={!permissions.canDeleteCourse}
              onClick={() => setConfirmAction('delete')}
            >
              <TrashIcon className="mr-2 inline-block h-4 w-4" />
              Delete course
            </Button>
          </div>
        </section>
      </aside>

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
    <Modal isOpen={Boolean(action)} onClose={onClose} title={isDelete ? 'Delete Course' : 'Archive Course'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(239, 68, 68, 0.22)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" style={{ color: 'var(--fn-error)' }} />
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{courseTitle} ({courseCode})</p>
              {isDelete ? (
                <p style={{ color: 'var(--text-muted)' }}>
                  Delete is implemented as a protected soft-delete: the course is archived and hidden from active course flows. Modules, assignments, submissions, and grades remain stored for audit and recovery.
                </p>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>
                  Archiving hides the course from active course flows while preserving modules, assignments, submissions, and grades.
                </p>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>}

        <Input
          label={`Type ${requiredText} to confirm`}
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={requiredText}
          disabled={loading}
        />

        <div className="flex justify-end gap-3 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant={isDelete ? 'danger' : 'secondary'} disabled={confirmText !== requiredText || loading} isLoading={loading}>
            {isDelete ? 'Delete course' : 'Archive course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
