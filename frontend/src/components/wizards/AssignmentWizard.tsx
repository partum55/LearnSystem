
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';
import { AssignmentType } from '../../types';
import { assignmentsApi, quizzesApi } from '../../api/assessments';
import { extractErrorMessage } from '../../api/client';
import {
    DocumentTextIcon,
    CodeBracketIcon,
    ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

interface AssignmentWizardProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: string;
    moduleId: string;
    onAssignmentCreated: () => void;
}

const ASSIGNMENT_TYPES = [
    { value: 'TEXT', label: 'Text Assignment', icon: DocumentTextIcon, description: 'Students submit text or files' },
    { value: 'QUIZ', label: 'Quiz', icon: ClipboardDocumentCheckIcon, description: 'Multiple choice, true/false, etc.' },
    { value: 'CODE', label: 'Code Assignment', icon: CodeBracketIcon, description: 'Programming tasks with auto-grading' },
];

export const AssignmentWizard: React.FC<AssignmentWizardProps> = ({
    isOpen,
    onClose,
    courseId,
    moduleId,
    onAssignmentCreated,
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        assignment_type: 'TEXT' as AssignmentType,
        title: '',
        description: '',
        max_points: '100',
        due_date: '',
        // Quiz specific
        quiz_id: '',
        // Code specific
        programming_language: 'python',
        // Text specific
        submission_types: ['text', 'file'],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [quizzes, setQuizzes] = useState<any[]>([]);

    useEffect(() => {
        if (formData.assignment_type === 'QUIZ') {
            quizzesApi.getAll(courseId).then(res => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = res.data as any;
                setQuizzes(Array.isArray(data) ? data : data.results || []);
            });
        }
    }, [formData.assignment_type, courseId]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload: any = {
                course: courseId,
                module: moduleId,
                assignment_type: formData.assignment_type,
                title: formData.title,
                description: formData.description,
                max_points: parseFloat(formData.max_points),
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
            };

            if (formData.assignment_type === 'QUIZ') {
                payload.quiz = formData.quiz_id;
            } else if (formData.assignment_type === 'CODE') {
                payload.programming_language = formData.programming_language;
                payload.submission_types = ['text'];
            } else { // TEXT
                payload.submission_types = formData.submission_types;
            }

            await assignmentsApi.create(payload);
            onAssignmentCreated();
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
                {t('assignments.wizard.selectType')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ASSIGNMENT_TYPES.map((type) => (
                    <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({ ...prev, assignment_type: type.value as AssignmentType }));
                            handleNext();
                        }}
                        className="flex flex-col items-center p-6 rounded-xl transition-all"
                        style={{
                            background: formData.assignment_type === type.value ? 'var(--bg-active)' : 'var(--bg-surface)',
                            border: formData.assignment_type === type.value ? '2px solid var(--text-primary)' : '1px solid var(--border-default)',
                        }}
                    >
                        <type.icon className="w-10 h-10 mb-4" style={{ color: 'var(--text-secondary)' }} />
                        <span className="font-medium text-lg" style={{ color: 'var(--text-primary)' }}>{type.label}</span>
                        <span className="text-sm mt-2 text-center" style={{ color: 'var(--text-muted)' }}>{type.description}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('assignments.wizard.details')}
            </h3>

            <Input
                label={t('assignments.title')}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
            />

            <div>
                <label className="label block mb-1">
                    {t('assignments.description')}
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="input w-full"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label={t('assignments.maxPoints')}
                    type="number"
                    value={formData.max_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_points: e.target.value }))}
                />
                <Input
                    label={t('assignments.dueDate')}
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
            </div>

            {formData.assignment_type === 'QUIZ' && (
                <div>
                    <label className="label block mb-1">Select Quiz</label>
                    <select
                        className="input w-full"
                        value={formData.quiz_id}
                        onChange={e => setFormData(prev => ({ ...prev, quiz_id: e.target.value }))}
                    >
                        <option value="">Select a quiz...</option>
                        {quizzes.map(q => (
                            <option key={q.id} value={q.id}>{q.title}</option>
                        ))}
                    </select>
                    <Button variant="secondary" size="sm" className="mt-2" onClick={() => {/* Open Quiz Builder */ }}>
                        Create New Quiz
                    </Button>
                </div>
            )}

            {formData.assignment_type === 'CODE' && (
                <div>
                    <label className="label block mb-1">Language</label>
                    <select
                        className="input w-full"
                        value={formData.programming_language}
                        onChange={e => setFormData(prev => ({ ...prev, programming_language: e.target.value }))}
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                    <div className="p-3 text-sm mt-2 rounded" style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.15)', color: 'var(--fn-warning)' }}>
                        VPL and Test settings will be available after creation.
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('assignments.wizard.preview')}
            </h3>
            <div className="p-6 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <h1 className="text-2xl font-bold mb-2">{formData.title}</h1>
                <div className="prose max-w-none mb-6" style={{ color: 'var(--text-secondary)' }}>
                    {formData.description}
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="px-4 py-2 rounded" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <span className="text-sm block" style={{ color: 'var(--text-muted)' }}>Due Date</span>
                        <span className="font-medium">{formData.due_date ? new Date(formData.due_date).toLocaleString() : 'No due date'}</span>
                    </div>
                    <div className="px-4 py-2 rounded" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <span className="text-sm block" style={{ color: 'var(--text-muted)' }}>Points</span>
                        <span className="font-medium">{formData.max_points}</span>
                    </div>
                </div>

                <div className="pt-6" style={{ borderTop: '1px solid var(--border-default)' }}>
                    {/* Mock submission area */}
                    {formData.assignment_type === 'TEXT' && (
                        <div className="p-4 border-2 border-dashed text-center rounded-lg" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                            Student submission area (Text/File)
                        </div>
                    )}
                    {formData.assignment_type === 'CODE' && (
                        <div className="h-32 rounded-lg flex items-center justify-center font-mono" style={{ background: 'var(--bg-base)', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                         // Code Editor Preview ({formData.programming_language})
                        </div>
                    )}
                    {formData.assignment_type === 'QUIZ' && (
                        <div className="text-center">
                            <Button>Start Quiz</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('assignments.createAssignment')} size="large">
            <div className="mb-6">
                <div className="flex items-center justify-between px-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex flex-col items-center relative z-10">
                            <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                        `}
                            style={{
                                background: step >= s ? 'var(--text-primary)' : 'var(--bg-overlay)',
                                color: step >= s ? 'var(--bg-base)' : 'var(--text-faint)',
                            }}>
                                {s}
                            </div>
                            <span className="text-xs mt-1 " style={{ color: 'var(--text-muted)' }}>
                                {s === 1 ? t('wizard.type') : s === 2 ? t('wizard.details') : t('wizard.preview')}
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
                    <Button onClick={handleNext} disabled={(step === 2 && !formData.title) || (step === 2 && formData.assignment_type === 'QUIZ' && !formData.quiz_id)}>
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
