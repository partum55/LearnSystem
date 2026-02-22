
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';
import { ResourceType, ResourceCreateData } from '../../types';
import { extractErrorMessage } from '../../api/client';
import { resourcesApi } from '../../api/courses';
import {
    DocumentTextIcon,
    VideoCameraIcon,
    PresentationChartBarIcon,
    LinkIcon,
    CodeBracketIcon,
    FolderIcon,
    ArrowUpTrayIcon
} from '@heroicons/react/24/outline'; // Adjust import path if needed

interface ResourceWizardProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    moduleId: string;
    onResourceCreated: () => void;
}

const RESOURCE_TYPES: { value: ResourceType; label: string; icon: React.ElementType; description: string }[] = [
    { value: 'PDF', label: 'PDF Document', icon: DocumentTextIcon, description: 'Upload a PDF file' },
    { value: 'VIDEO', label: 'Video', icon: VideoCameraIcon, description: 'Upload a video file' },
    { value: 'SLIDE', label: 'Presentation', icon: PresentationChartBarIcon, description: 'Upload a presentation (PPT, PDF)' },
    { value: 'LINK', label: 'External Link', icon: LinkIcon, description: 'Link to an external website' },
    { value: 'TEXT', label: 'Text Content', icon: DocumentTextIcon, description: 'Create rich text content with LaTeX support' },
    { value: 'CODE', label: 'Code File', icon: CodeBracketIcon, description: 'Upload a code file' },
    { value: 'OTHER', label: 'Other', icon: FolderIcon, description: 'Other file types' },
];

export const ResourceWizard: React.FC<ResourceWizardProps> = ({
    isOpen,
    onClose,
    courseId,
    moduleId,
    onResourceCreated,
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<Partial<ResourceCreateData>>({
        courseId,
        module: moduleId,
        title: '',
        description: '',
        resource_type: 'PDF',
        is_downloadable: true,
    });

    const [file, setFile] = useState<File | null>(null);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            const data = {
                ...formData,
                file: file || undefined,
            } as ResourceCreateData;

            await resourcesApi.create(data);
            onResourceCreated();
            onClose();
        } catch (err) {
            setError(extractErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('resources.wizard.selectType')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {RESOURCE_TYPES.map((type) => (
                    <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({ ...prev, resource_type: type.value }));
                            handleNext();
                        }}
                        className="flex flex-col items-center p-4 rounded-xl transition-all"
                        style={{
                            border: formData.resource_type === type.value
                                ? '2px solid var(--text-primary)'
                                : '1px solid var(--border-default)',
                            background: formData.resource_type === type.value
                                ? 'var(--bg-active)'
                                : 'var(--bg-surface)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = formData.resource_type === type.value
                                ? 'var(--bg-active)' : 'var(--bg-surface)';
                        }}
                    >
                        <type.icon className="w-8 h-8 mb-3" style={{ color: 'var(--text-secondary)' }} />
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{type.label}</span>
                        <span className="text-xs mt-1 text-center" style={{ color: 'var(--text-muted)' }}>{type.description}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep2 = () => {
        const requiresFile = ['PDF', 'VIDEO', 'SLIDE', 'CODE', 'OTHER'].includes(formData.resource_type || '');
        const requiresUrl = formData.resource_type === 'LINK';
        const requiresText = formData.resource_type === 'TEXT';

        return (
            <div className="space-y-4">
                <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t('resources.wizard.details')}
                </h3>

                <Input
                    label={t('resources.title')}
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                />

                <div>
                    <label className="label block mb-1">
                        {t('resources.description')}
                    </label>
                    <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="input w-full"
                    />
                </div>

                {requiresFile && (
                    <div
                        className="border-2 border-dashed rounded-lg p-6 text-center"
                        style={{ borderColor: 'var(--border-default)' }}
                    >
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.[0]) {
                                    setFile(e.target.files[0]);
                                    if (!formData.title) setFormData(prev => ({ ...prev, title: e.target.files![0].name }));
                                }
                            }}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <ArrowUpTrayIcon className="w-10 h-10 mb-2" style={{ color: 'var(--text-faint)' }} />
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {file ? file.name : t('resources.wizard.clickToUpload')}
                            </span>
                        </label>
                    </div>
                )}

                {requiresUrl && (
                    <Input
                        label={t('resources.externalUrl')}
                        value={formData.external_url || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
                        required
                        type="url"
                    />
                )}

                {requiresText && (
                    <div>
                        <label className="label block mb-1">
                            {t('resources.textContent')} (LaTeX supported)
                        </label>
                        <textarea
                            value={formData.text_content || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                            rows={8}
                            className="input w-full font-mono text-sm"
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('resources.wizard.preview')}
            </h3>
            <div className="p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <h4 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{formData.title}</h4>
                <p className="mb-4" style={{ color: 'var(--text-muted)' }}>{formData.description}</p>

                {/* Simple preview logic */}
                {formData.resource_type === 'TEXT' && (
                    <div className="prose max-w-none p-4 rounded" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                        {formData.text_content}
                    </div>
                )}
                {file && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <DocumentTextIcon className="w-5 h-5" />
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                )}
                {formData.resource_type === 'LINK' && (
                    <a href={formData.external_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>
                        {formData.external_url}
                    </a>
                )}
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('resources.createResource')} size="large">
            <div className="mb-6">
                <div className="flex items-center justify-between px-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex flex-col items-center relative z-10">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors"
                                style={{
                                    background: step >= s ? 'var(--text-primary)' : 'var(--bg-overlay)',
                                    color: step >= s ? 'var(--bg-base)' : 'var(--text-faint)',
                                }}
                            >
                                {s}
                            </div>
                            <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {s === 1 ? t('wizard.type') : s === 2 ? t('wizard.content') : t('wizard.preview')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-md text-sm" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--fn-error)' }}>
                    {error}
                </div>
            )}

            <div className="min-h-[300px]">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>

            <div className="flex justify-between pt-6 mt-6" style={{ borderTop: '1px solid var(--border-default)' }}>
                <Button variant="secondary" onClick={step === 1 ? onClose : handleBack}>
                    {step === 1 ? t('common.cancel') : t('common.back')}
                </Button>
                {step < 3 ? (
                    <Button onClick={handleNext} disabled={!formData.resource_type || (step === 2 && !formData.title)}>
                        {t('common.next')}
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} isLoading={loading}>
                        {t('common.save')}
                    </Button>
                )}
            </div>
        </Modal>
    );
};
