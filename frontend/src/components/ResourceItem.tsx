import React from 'react';
import { useTranslation } from 'react-i18next';
import { Resource, ResourceType } from '../types';
import {
  DocumentTextIcon,
  VideoCameraIcon,
  PresentationChartBarIcon,
  LinkIcon,
  CodeBracketIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from './Button';

interface ResourceItemProps {
  resource: Resource;
  canEdit: boolean;
  onDelete?: (resourceId: string) => void;
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

const resourceTypeColors: Record<ResourceType, string> = {
  VIDEO: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  PDF: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  SLIDE: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
  LINK: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  TEXT: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700',
  CODE: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  OTHER: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700',
};

export const ResourceItem: React.FC<ResourceItemProps> = ({ resource, canEdit, onDelete }) => {
  const { t } = useTranslation();
  const Icon = resourceTypeIcons[resource.resource_type];
  const colorClass = resourceTypeColors[resource.resource_type];

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / 1024 / 1024;
    if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  const handleView = () => {
    if (resource.resource_type === 'LINK' && resource.external_url) {
      window.open(resource.external_url, '_blank');
    } else if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    }
  };

  const handleDownload = () => {
    if (resource.file_url) {
      const link = document.createElement('a');
      link.href = resource.file_url;
      link.download = resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm(t('resources.confirmDelete'))) {
      onDelete(resource.id);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
      <div className="flex items-center flex-1 min-w-0">
        <div className={`flex-shrink-0 p-3 rounded-lg ${colorClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {resource.title}
            </h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
              {t(`resources.types.${resource.resource_type.toLowerCase()}`)}
            </span>
          </div>
          {resource.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {resource.description}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {resource.file_size && (
              <span>{formatFileSize(resource.file_size)}</span>
            )}
            {resource.uploaded_by_name && (
              <span>{t('resources.uploadedBy')}: {resource.uploaded_by_name}</span>
            )}
            <span>{new Date(resource.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleView}
          title={t('common.view')}
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
        {resource.is_downloadable && resource.file_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            title={t('common.download')}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
        )}
        {canEdit && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            title={t('common.delete')}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

