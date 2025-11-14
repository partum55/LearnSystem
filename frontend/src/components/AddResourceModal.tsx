import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { ResourceType } from '../types';
import apiClient from '../api/client';
import type { AxiosProgressEvent } from 'axios';
import {
  DocumentTextIcon,
  VideoCameraIcon,
  PresentationChartBarIcon,
  LinkIcon,
  CodeBracketIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  onResourceAdded: () => void;
}

const resourceTypeIcons: Record<ResourceType, any> = {
  VIDEO: VideoCameraIcon,
  PDF: DocumentTextIcon,
  SLIDE: PresentationChartBarIcon,
  LINK: LinkIcon,
  TEXT: DocumentIcon,
  CODE: CodeBracketIcon,
  OTHER: DocumentIcon,
};

export const AddResourceModal: React.FC<AddResourceModalProps> = ({
  isOpen,
  onClose,
  moduleId,
  onResourceAdded,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const [selectedType, setSelectedType] = useState<ResourceType>('PDF');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file: null as File | null,
    external_url: '',
    text_content: '',
    is_downloadable: true,
  });

  const resourceTypes: Array<{ type: ResourceType; label: string; description: string }> = [
    { type: 'PDF', label: t('resources.types.pdf'), description: t('resources.types.pdfDesc') },
    { type: 'VIDEO', label: t('resources.types.video'), description: t('resources.types.videoDesc') },
    { type: 'SLIDE', label: t('resources.types.slide'), description: t('resources.types.slideDesc') },
    { type: 'LINK', label: t('resources.types.link'), description: t('resources.types.linkDesc') },
    { type: 'TEXT', label: t('resources.types.text'), description: t('resources.types.textDesc') },
    { type: 'CODE', label: t('resources.types.code'), description: t('resources.types.codeDesc') },
    { type: 'OTHER', label: t('resources.types.other'), description: t('resources.types.otherDesc') },
  ];

  const handleTypeSelect = (type: ResourceType) => {
    setSelectedType(type);
    setStep('details');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file, title: prev.title || file.name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('module', moduleId);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('resource_type', selectedType);
      formDataToSend.append('is_downloadable', String(formData.is_downloadable));

      if (selectedType === 'LINK') {
        formDataToSend.append('external_url', formData.external_url);
      } else if (selectedType === 'TEXT') {
        formDataToSend.append('text_content', formData.text_content);
      } else if (formData.file) {
        formDataToSend.append('file', formData.file);
      }

      await apiClient.upload('/courses/resources/upload/', formDataToSend, (e: AxiosProgressEvent) => {
        if (e.total) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      setFormData({
        title: '',
        description: '',
        file: null,
        external_url: '',
        text_content: '',
        is_downloadable: true,
      });
      setStep('type');
      setUploadProgress(0);
      onResourceAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || t('resources.errors.uploadFailed'));
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

  const handleBack = () => {
    setStep('type');
    setError('');
  };

  const handleModalClose = () => {
    setStep('type');
    setFormData({
      title: '',
      description: '',
      file: null,
      external_url: '',
      text_content: '',
      is_downloadable: true,
    });
    setError('');
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleModalClose} 
      title={step === 'type' ? t('resources.selectType') : t('resources.addResource')}
    >
      {step === 'type' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {resourceTypes.map(({ type, label, description }) => {
            const Icon = resourceTypeIcons[type];
            return (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className="flex flex-col items-center p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
              >
                <Icon className="h-12 w-12 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {label}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {description}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <Input
            label={t('resources.title')}
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder={t('resources.titlePlaceholder')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('resources.description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder={t('resources.descriptionPlaceholder')}
            />
          </div>

          {selectedType === 'LINK' ? (
            <Input
              label={t('resources.url')}
              name="external_url"
              type="url"
              value={formData.external_url}
              onChange={handleChange}
              required
              placeholder="https://example.com"
            />
          ) : selectedType === 'TEXT' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('resources.content')}
              </label>
              <textarea
                name="text_content"
                value={formData.text_content}
                onChange={handleChange}
                required
                rows={8}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white font-mono text-sm"
                placeholder={t('resources.contentPlaceholder')}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('resources.file')}
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                required
                accept={selectedType === 'PDF' ? '.pdf' : selectedType === 'VIDEO' ? 'video/*' : selectedType === 'SLIDE' ? '.ppt,.pptx,.odp' : '*'}
                className="block w-full text-sm text-gray-900 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none"
              />
              {formData.file && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('resources.selectedFile')}: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_downloadable"
              id="is_downloadable"
              checked={formData.is_downloadable}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_downloadable" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              {t('resources.allowDownload')}
            </label>
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={loading}
            >
              {t('common.back')}
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleModalClose}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                isLoading={loading}
              >
                {t('resources.upload')}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
