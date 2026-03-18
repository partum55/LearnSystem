import React, { useMemo, useState } from 'react';
import { TFunction } from 'i18next';
import {
  BookmarkIcon,
  MegaphoneIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Announcement } from '../../types';
import { Button, Card, CardBody, CardHeader, Modal } from '../../components';

interface CourseAnnouncementsTabProps {
  announcements: Announcement[];
  isInstructor: boolean;
  isLoading: boolean;
  onCreate: (payload: { title: string; content: string; is_pinned?: boolean }) => Promise<void>;
  onUpdate: (
    announcementId: string,
    payload: Partial<{ title: string; content: string; is_pinned?: boolean }>
  ) => Promise<void>;
  onDelete: (announcementId: string) => Promise<void>;
  t: TFunction;
}

interface AnnouncementFormState {
  id?: string;
  title: string;
  content: string;
  is_pinned: boolean;
}

const EMPTY_FORM: AnnouncementFormState = {
  title: '',
  content: '',
  is_pinned: false,
};

export const CourseAnnouncementsTab: React.FC<CourseAnnouncementsTabProps> = ({
  announcements,
  isInstructor,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  t,
}) => {
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<AnnouncementFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedAnnouncements = useMemo(
    () =>
      [...announcements].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [announcements]
  );

  const openCreateModal = () => {
    setError(null);
    setForm(EMPTY_FORM);
    setShowEditor(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setError(null);
    setForm({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned,
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      setError(t('announcements.validationRequired', 'Title and content are required.'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (form.id) {
        await onUpdate(form.id, {
          title,
          content,
          is_pinned: form.is_pinned,
        });
      } else {
        await onCreate({
          title,
          content,
          is_pinned: form.is_pinned,
        });
      }
      setShowEditor(false);
      setForm(EMPTY_FORM);
    } catch (saveError) {
      setError((saveError as Error)?.message || t('announcements.saveFailed', 'Failed to save announcement.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!window.confirm(t('announcements.deleteConfirm', { title: announcement.title, defaultValue: `Delete announcement "${announcement.title}"?` }))) {
      return;
    }
    setPendingDeleteId(announcement.id);
    setError(null);
    try {
      await onDelete(announcement.id);
    } catch (deleteError) {
      setError((deleteError as Error)?.message || t('announcements.deleteFailed', 'Failed to delete announcement.'));
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    setError(null);
    try {
      await onUpdate(announcement.id, { is_pinned: !announcement.is_pinned });
    } catch (updateError) {
      setError((updateError as Error)?.message || t('announcements.saveFailed', 'Failed to save announcement.'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <p className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
            {t('common.loading', 'Loading...')}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <div className="rounded-md p-2" style={{ background: 'var(--bg-elevated)' }}>
            <MegaphoneIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t('announcements.heading', 'Course Announcements')}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('announcements.subheading', 'Pinned updates stay on top. Students see the same feed in real time.')}
            </p>
          </div>
        </div>
        {isInstructor && (
          <Button size="sm" onClick={openCreateModal}>
            <PlusIcon className="mr-1 h-4 w-4" />
            {t('announcements.new', 'New announcement')}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md p-3 text-sm" style={{ background: 'rgba(248,113,113,0.12)', color: 'var(--fn-error)', border: '1px solid rgba(248,113,113,0.25)' }}>
          {error}
        </div>
      )}

      {orderedAnnouncements.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-10 text-center" style={{ color: 'var(--text-muted)' }}>
              {t('announcements.empty', 'No announcements yet.')}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {orderedAnnouncements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {announcement.title}
                      </h4>
                      {announcement.is_pinned && (
                        <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ background: 'rgba(251,191,36,0.18)', color: 'var(--fn-warning)' }}>
                          {t('announcements.pinned', 'Pinned')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>

                  {isInstructor && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleTogglePin(announcement)}
                        className="rounded p-1 transition-colors"
                        style={{ color: announcement.is_pinned ? 'var(--fn-warning)' : 'var(--text-faint)' }}
                        title={announcement.is_pinned ? t('announcements.unpin', 'Unpin') : t('announcements.pin', 'Pin')}
                      >
                        <BookmarkIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(announcement)}
                        className="rounded p-1 transition-colors"
                        style={{ color: 'var(--text-faint)' }}
                        title={t('common.edit', 'Edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(announcement)}
                        disabled={pendingDeleteId === announcement.id}
                        className="rounded p-1 transition-colors"
                        style={{ color: 'var(--text-faint)' }}
                        title={t('common.delete', 'Delete')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {announcement.content}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setForm(EMPTY_FORM);
          setError(null);
        }}
        title={
          form.id
            ? t('announcements.editTitle', 'Edit announcement')
            : t('announcements.createTitle', 'New announcement')
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {t('announcements.fieldTitle', 'Title')}
            </label>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              maxLength={255}
              className="input w-full"
              placeholder={t('announcements.titlePlaceholder', 'Announcement title')}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {t('announcements.fieldContent', 'Content')}
            </label>
            <textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              rows={8}
              maxLength={10000}
              className="input w-full"
              placeholder={t('announcements.contentPlaceholder', 'Write announcement details...')}
              style={{ resize: 'vertical' }}
            />
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(event) => setForm((prev) => ({ ...prev, is_pinned: event.target.checked }))}
            />
            {t('announcements.pinToTop', 'Pin to top')}
          </label>

          {error && (
            <p className="text-sm" style={{ color: 'var(--fn-error)' }}>
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditor(false);
                setForm(EMPTY_FORM);
                setError(null);
              }}
              disabled={isSaving}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => void handleSave()} isLoading={isSaving}>
              {form.id ? t('common.save', 'Save') : t('common.create', 'Create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CourseAnnouncementsTab;
