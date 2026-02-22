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

const resourceTypeIcons: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
  VIDEO: VideoCameraIcon,
  PDF: DocumentTextIcon,
  SLIDE: PresentationChartBarIcon,
  LINK: LinkIcon,
  TEXT: DocumentIcon,
  CODE: CodeBracketIcon,
  OTHER: DocumentIcon,
};

export const ResourceItem: React.FC<ResourceItemProps> = ({ resource, canEdit, onDelete }) => {
  const { t } = useTranslation();
  const Icon = resourceTypeIcons[resource.resource_type];

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
    <div
      className="flex items-center justify-between p-3 rounded-lg transition-colors"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
    >
      <div className="flex items-center flex-1 min-w-0">
        <div
          className="flex-shrink-0 p-2.5 rounded-md"
          style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {resource.title}
            </h4>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'var(--bg-overlay)', color: 'var(--text-faint)' }}
            >
              {t(`resources.types.${resource.resource_type.toLowerCase()}`)}
            </span>
          </div>
          {resource.description && (
            <p className="mt-0.5 text-sm line-clamp-1" style={{ color: 'var(--text-muted)' }}>
              {resource.description}
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-3 text-xs" style={{ color: 'var(--text-faint)' }}>
            {resource.file_size && <span>{formatFileSize(resource.file_size)}</span>}
            {resource.uploaded_by_name && <span>{resource.uploaded_by_name}</span>}
            <span>{new Date(resource.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-4">
        <Button variant="ghost" size="sm" onClick={handleView} title={t('common.view')}>
          <EyeIcon className="h-4 w-4" />
        </Button>
        {resource.is_downloadable && resource.file_url && (
          <Button variant="ghost" size="sm" onClick={handleDownload} title={t('common.download')}>
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
        )}
        {canEdit && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            title={t('common.delete')}
            style={{ color: 'var(--fn-error)' }}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
