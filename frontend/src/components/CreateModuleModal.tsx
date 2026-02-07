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
        is_published: formData.is_published,
      });

      setFormData({ title: '', description: '', is_published: false });
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
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('modules.description')}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder={t('modules.descriptionPlaceholder')}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_published"
            id="is_published"
            checked={formData.is_published}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_published" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
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
