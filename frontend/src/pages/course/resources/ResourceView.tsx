
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '../../../components';
import { Sidebar } from '../../../components';
import { Button } from '../../../components';
import { Loading } from '../../../components';
import { resourcesApi } from '../../../api/courses';
import { Resource } from '../../../types';
import { ArrowLeftIcon, FolderIcon } from '@heroicons/react/24/outline';
import DOMPurify from 'dompurify';

const ResourceView: React.FC = () => {
    const { courseId, moduleId, resourceId } = useParams<{ courseId: string; moduleId: string; resourceId: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [resource, setResource] = useState<Resource | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (courseId && moduleId && resourceId) {
            resourcesApi.getById(courseId, moduleId, resourceId)
                .then((res: { data: Resource }) => setResource(res.data))
                .catch((err: unknown) => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [courseId, moduleId, resourceId]);

    const handleBack = () => {
        navigate(`/courses/${courseId}`);
    };

    if (loading) return <Loading />;
    if (!resource) return <div className="p-8 text-center" style={{ color: 'var(--fn-error)' }}>Resource not found</div>;

    const renderContent = () => {
        switch (resource.resource_type) {
            case 'PDF':
                return (
                    <div
                        className="h-[800px] w-full rounded-lg flex items-center justify-center"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                    >
                        {resource.file_url ? (
                            <iframe
                                src={`${resource.file_url}#toolbar=0`}
                                className="w-full h-full rounded-lg"
                                title={resource.title}
                            />
                        ) : (
                            <div style={{ color: 'var(--text-muted)' }}>PDF Viewer Placeholder. File URL missing.</div>
                        )}
                    </div>
                );
            case 'TEXT':
                return (
                    <div
                        className="max-w-none p-8 rounded-lg"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resource.text_content || '') }} />
                    </div>
                );
            case 'LINK':
                return (
                    <div
                        className="text-center py-12 rounded-lg"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
                    >
                        <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>External Resource</h3>
                        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>{resource.external_url}</p>
                        <Button onClick={() => window.open(resource.external_url, '_blank')}>
                            Open in New Tab
                        </Button>
                    </div>
                );
            case 'VIDEO':
                return (
                    <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden" style={{ background: '#000' }}>
                        {resource.file_url ? (
                            <video controls className="w-full h-full" src={resource.file_url}>
                                Your browser does not support the video tag.
                            </video>
                        ) : (
                            <div className="flex items-center justify-center h-full" style={{ color: '#fff' }}>Video Player Placeholder</div>
                        )}
                    </div>
                );
            default:
                return (
                    <div
                        className="p-8 text-center rounded-lg"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
                    >
                        <FolderIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                        <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                            File: {resource.title}
                        </h3>
                        {resource.is_downloadable && resource.file_url && (
                            <a href={resource.file_url} download>
                                <Button>Download File</Button>
                            </a>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-5xl mx-auto">
                        <button
                            onClick={handleBack}
                            className="flex items-center text-sm mb-6 transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            {t('common.backToCourse')}
                        </button>

                        <div className="flex max-md:flex-col items-start gap-8">
                            <div className="flex-1 min-w-0 w-full">
                                <h1
                                    className="text-3xl font-bold mb-4"
                                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                                >
                                    {resource.title}
                                </h1>
                                {resource.description && (
                                    <p className="mb-8 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
                                        {resource.description}
                                    </p>
                                )}

                                {renderContent()}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ResourceView;
