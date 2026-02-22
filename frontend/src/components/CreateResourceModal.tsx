import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { resourcesApi } from '../api/courses';
import { extractErrorMessage } from '../api/client';
import { ResourceType } from '../types';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  moduleId: string;
  onResourceCreated: () => void;
}

export const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  courseId,
  moduleId,
  onResourceCreated,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'PDF' as ResourceType,
    external_url: '',
    text_content: '',
    is_downloadable: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const resourceTypes: { value: ResourceType; label: string }[] = [
    { value: 'PDF', label: 'PDF Document' },
    { value: 'VIDEO', label: 'Video' },
    { value: 'SLIDE', label: 'Presentation' },
    { value: 'LINK', label: 'External Link' },
    { value: 'TEXT', label: 'Text Content' },
    { value: 'CODE', label: 'Code File' },
    { value: 'OTHER', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress(0);

    try {
      const resourceData = {
        courseId: courseId,
        module: moduleId,
        title: formData.title,
        description: formData.description,
        resource_type: formData.resource_type,
        is_downloadable: formData.is_downloadable,
        file: file || undefined,
        external_url: formData.resource_type === 'LINK' ? formData.external_url : undefined,
        text_content: formData.resource_type === 'TEXT' ? formData.text_content : undefined,
      };

      await resourcesApi.create(resourceData);

      setFormData({
        title: '',
        description: '',
        resource_type: 'PDF',
        external_url: '',
        text_content: '',
        is_downloadable: true,
      });
      setFile(null);
      setUploadProgress(0);
      onResourceCreated();
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: e.target.files![0].name }));
      }
    }
  };

  const requiresFile = ['PDF', 'VIDEO', 'SLIDE', 'CODE', 'OTHER'].includes(formData.resource_type);
  const requiresUrl = formData.resource_type === 'LINK';
  const requiresText = formData.resource_type === 'TEXT';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('resources.createResource')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md p-4" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <p className="text-sm" style={{ color: 'var(--fn-error)' }}>{error}</p>
          </div>
        )}

        <div>
          <label className="label block mb-1">
            {t('resources.type')}
          </label>
          <select
            name="resource_type"
            value={formData.resource_type}
            onChange={handleChange}
            className="input w-full"
          >
            {resourceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label={t('resources.title')}
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder={t('resources.titlePlaceholder')}
        />

        <div>
          <label className="label block mb-1">
            {t('resources.description')}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="input w-full"
            placeholder={t('resources.descriptionPlaceholder')}
          />
        </div>

        {requiresFile && (
          <div>
            <label className="label block mb-1">
              {t('resources.file')}
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              required
              className="block w-full text-sm"
              style={{ color: 'var(--text-secondary)' }}
            />
            {file && (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('resources.selectedFile')}: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
        )}

        {requiresUrl && (
          <Input
            label={t('resources.externalUrl')}
            name="external_url"
            type="url"
            value={formData.external_url}
            onChange={handleChange}
            required
            placeholder="https://example.com/resource"
          />
        )}

        {requiresText && (
          <div>
            <label className="label block mb-1">
              {t('resources.textContent')}
            </label>
            <textarea
              name="text_content"
              value={formData.text_content}
              onChange={handleChange}
              rows={8}
              required
              className="input w-full font-mono text-sm"
              placeholder={t('resources.textContentPlaceholder')}
            />
          </div>
        )}

        {requiresFile && (
          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_downloadable"
              id="is_downloadable"
              checked={formData.is_downloadable}
              onChange={handleChange}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--text-primary)' }}
            />
            <label htmlFor="is_downloadable" className="ml-2 block text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('resources.allowDownload')}
            </label>
          </div>
        )}

        {loading && uploadProgress > 0 && (
          <div className="w-full rounded-full h-2.5" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%`, background: 'var(--text-primary)' }}
            ></div>
          </div>
        )}

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
            {t('resources.createResource')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
