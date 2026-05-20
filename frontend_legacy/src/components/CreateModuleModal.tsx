import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { modulesApi } from '../api/courses';
import { extractErrorMessage } from '../api/client';

interface CreateModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onModuleCreated: () => void;
}

export const CreateModuleModal: React.FC<CreateModuleModalProps> = ({
  isOpen,
  onClose,
  courseId,
  onModuleCreated,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    tags: '',
    is_published: false,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await modulesApi.create({
        course: courseId,
        title: formData.title,
        description: formData.description,
        content_meta: {
          topic: formData.topic.trim() || undefined,
          tags: formData.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
        is_published: formData.is_published,
      });

      setFormData({ title: '', description: '', topic: '', tags: '', is_published: false });
      onModuleCreated();
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modules.createModule')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
          </div>
        )}

        <Input
          label={t('modules.title')}
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder={t('modules.titlePlaceholder')}
        />

        <div>
          <label className="label block mb-1">
            {t('modules.description')}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="input w-full"
            placeholder={t('modules.descriptionPlaceholder')}
          />
        </div>

        <Input
          label={t('modules.moduleTopic', 'Topic')}
          name="topic"
          value={formData.topic}
          onChange={handleChange}
          placeholder={t('modules.moduleTopicPlaceholder', 'Enter module topic')}
        />

        <Input
          label={t('modules.moduleTags', 'Tags')}
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder={t('modules.moduleTagsPlaceholder', 'Comma-separated tags')}
        />

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_published"
            id="is_published"
            checked={formData.is_published}
            onChange={handleChange}
            className="h-4 w-4 rounded"
            style={{ accentColor: 'var(--text-primary)' }}
          />
          <label htmlFor="is_published" className="ml-2 block text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('modules.publishImmediately')}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            {t('modules.createModule')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
