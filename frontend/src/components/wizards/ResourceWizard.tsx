
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
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
                        className={`
                flex flex-col items-center p-4 border rounded-xl transition-all
                hover:shadow-md hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10
                ${formData.resource_type === type.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}
            `}
                    >
                        <type.icon className="w-8 h-8 mb-3 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{type.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{type.description}</span>
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t('resources.wizard.details')}
                </h3>

                <Input
                    label={t('resources.title')}
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('resources.description')}
                    </label>
                    <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                    />
                </div>

                {requiresFile && (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
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
                            <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('resources.textContent')} (LaTeX supported)
                        </label>
                        <textarea
                            value={formData.text_content || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                            rows={8}
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white font-mono text-sm"
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('resources.wizard.preview')}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{formData.title}</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{formData.description}</p>

                {/* Simple preview logic */}
                {formData.resource_type === 'TEXT' && (
                    <div className="prose dark:prose-invert max-w-none p-4 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                        {formData.text_content}
                    </div>
                )}
                {file && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <DocumentTextIcon className="w-5 h-5" />
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                )}
                {formData.resource_type === 'LINK' && (
                    <a href={formData.external_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
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
                            <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                            ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}
                        `}>
                                {s}
                            </div>
                            <span className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                {s === 1 ? t('wizard.type') : s === 2 ? t('wizard.content') : t('wizard.preview')}
                            </span>
                        </div>
                    ))}
                    {/* Progress bar line */}
                    <div className="absolute left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 top-4 -z-0 hidden md:block" />
                    {/* (Note: Positioning of the line needs better CSS or just simple layout) */}
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="min-h-[300px]">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>

            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
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
