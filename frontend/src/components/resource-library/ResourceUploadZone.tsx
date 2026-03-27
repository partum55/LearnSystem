import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { resourcesApi } from '../../api/courses';

interface ResourceUploadZoneProps {
  courseId: string;
  moduleId: string;
  onFilesUploaded: (files: Array<{ name: string; url: string; type: string }>) => void;
}

interface UploadingFile {
  name: string;
  progress: number;
  error?: string;
}

function detectResourceType(mimeType: string): string {
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'SLIDE';
  if (mimeType.startsWith('text/') || mimeType.includes('json')) return 'TEXT';
  if (mimeType.startsWith('image/')) return 'OTHER';
  return 'OTHER';
}

const ResourceUploadZone: React.FC<ResourceUploadZoneProps> = ({
  courseId,
  moduleId,
  onFilesUploaded,
}) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState<UploadingFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!courseId || !moduleId) {
      // No course/module context: just pass file names as resources
      const results = acceptedFiles.map((file) => ({
        name: file.name,
        url: '',
        type: detectResourceType(file.type),
      }));
      onFilesUploaded(results);
      return;
    }

    const uploadStates = acceptedFiles.map((f) => ({ name: f.name, progress: 0 }));
    setUploading(uploadStates);

    const results: Array<{ name: string; url: string; type: string }> = [];

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        formData.append('resource_type', detectResourceType(file.type));

        const response = await resourcesApi.uploadFile(courseId, moduleId, formData, (progress) => {
          setUploading((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], progress };
            return updated;
          });
        });

        results.push({
          name: file.name,
          url: response?.data?.fileUrl || response?.data?.externalUrl || '',
          type: detectResourceType(file.type),
        });
      } catch {
        setUploading((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], error: 'Upload failed' };
          return updated;
        });
      }
    }

    if (results.length > 0) {
      onFilesUploaded(results);
    }

    setTimeout(() => setUploading([]), 2000);
  }, [courseId, moduleId, onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => void onDrop(files),
    multiple: true,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className="rounded-lg p-8 text-center cursor-pointer transition-colors"
        style={{
          border: `2px dashed ${isDragActive ? 'var(--text-primary)' : 'var(--border-default)'}`,
          background: isDragActive ? 'var(--bg-active)' : 'var(--bg-elevated)',
        }}
      >
        <input {...getInputProps()} />
        <svg
          className="w-10 h-10 mx-auto mb-3"
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {isDragActive
            ? t('resourceLibrary.dropHere', 'Drop files here')
            : t('resourceLibrary.dragOrClick', 'Drag files here or click to browse')}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {t('resourceLibrary.supportedFormats', 'PDF, images, videos, documents, code files')}
        </p>
      </div>

      {/* Upload progress */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                {file.name}
              </span>
              {file.error ? (
                <span className="text-xs" style={{ color: 'var(--fn-error)' }}>{file.error}</span>
              ) : (
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-overlay)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${file.progress}%`, background: 'var(--fn-success)' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResourceUploadZone;
