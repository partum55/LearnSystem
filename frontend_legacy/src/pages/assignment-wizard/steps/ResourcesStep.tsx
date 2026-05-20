import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WizardFormData, WizardResource } from '../wizardTypes';
import ResourceLibraryDrawer from '../../../components/resource-library/ResourceLibraryDrawer';
import ResourceUploadZone from '../../../components/resource-library/ResourceUploadZone';

interface ResourcesStepProps {
  formData: WizardFormData;
  onChange: (partial: Partial<WizardFormData>) => void;
  courseId: string;
  moduleId: string;
}

const ResourcesStep: React.FC<ResourcesStepProps> = ({ formData, onChange, courseId, moduleId }) => {
  const { t } = useTranslation();
  const [showLibrary, setShowLibrary] = useState(false);

  const addResource = (resource: WizardResource) => {
    onChange({ resources: [...formData.resources, resource] });
  };

  const removeResource = (index: number) => {
    onChange({ resources: formData.resources.filter((_, i) => i !== index) });
  };

  const handleLibrarySelect = (resources: WizardResource[]) => {
    onChange({ resources: [...formData.resources, ...resources] });
    setShowLibrary(false);
  };

  const handleFilesUploaded = (files: Array<{ name: string; url: string; type: string }>) => {
    const newResources: WizardResource[] = files.map((f) => ({
      name: f.name,
      url: f.url,
      type: f.type,
    }));
    onChange({ resources: [...formData.resources, ...newResources] });
  };

  return (
    <div className="space-y-6">
      <h2
        className="text-xl font-semibold"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
      >
        {t('wizard.resourcesTitle', 'Attach resources')}
      </h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {t('wizard.resourcesSubtitle', 'Add files, links, or browse the course resource library')}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className="btn btn-secondary text-sm px-4 py-2"
        >
          <svg className="w-4 h-4 mr-1.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          {t('wizard.browseLibrary', 'Browse Library')}
        </button>
        <button
          type="button"
          onClick={() => addResource({ name: '', url: '', type: 'link' })}
          className="btn btn-ghost text-sm px-4 py-2"
        >
          <svg className="w-4 h-4 mr-1.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.832a4.5 4.5 0 00-6.364-6.364L6.257 5.37a4.5 4.5 0 001.242 7.244" />
          </svg>
          {t('wizard.addLink', 'Add Link')}
        </button>
      </div>

      {/* Upload zone */}
      <ResourceUploadZone
        courseId={courseId}
        moduleId={moduleId}
        onFilesUploaded={handleFilesUploaded}
      />

      {/* Attached resources list */}
      {formData.resources.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {t('wizard.attachedResources', 'Attached resources')} ({formData.resources.length})
          </h3>
          {formData.resources.map((resource, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
            >
              <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={resource.name}
                  onChange={(e) => {
                    const updated = [...formData.resources];
                    updated[index] = { ...updated[index], name: e.target.value };
                    onChange({ resources: updated });
                  }}
                  placeholder={t('assignment.resource_name', 'Resource name')}
                  className="input w-full text-sm"
                />
                <input
                  type="text"
                  value={resource.url}
                  onChange={(e) => {
                    const updated = [...formData.resources];
                    updated[index] = { ...updated[index], url: e.target.value };
                    onChange({ resources: updated });
                  }}
                  placeholder="https://..."
                  className="input w-full text-sm mt-1"
                />
              </div>
              <button
                type="button"
                onClick={() => removeResource(index)}
                className="text-sm shrink-0 p-1 rounded transition-colors hover:bg-[var(--bg-active)]"
                style={{ color: 'var(--fn-error)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Library drawer */}
      {showLibrary && (
        <ResourceLibraryDrawer
          courseId={courseId}
          moduleId={moduleId}
          onSelect={handleLibrarySelect}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
};

export default ResourcesStep;
