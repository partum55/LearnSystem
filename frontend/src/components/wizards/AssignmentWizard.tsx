
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
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
                        className={`
                flex flex-col items-center p-6 border rounded-xl transition-all
                hover:shadow-md hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10
                ${formData.assignment_type === type.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}
            `}
                    >
                        <type.icon className="w-10 h-10 mb-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-lg text-gray-900 dark:text-white">{type.label}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">{type.description}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('assignments.wizard.details')}
            </h3>

            <Input
                label={t('assignments.title')}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
            />

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('assignments.description')}
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Quiz</label>
                    <select
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-800 dark:text-white"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                    <select
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-800 dark:text-white"
                        value={formData.programming_language}
                        onChange={e => setFormData(prev => ({ ...prev, programming_language: e.target.value }))}
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm mt-2 rounded">
                        VPL and Test settings will be available after creation.
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('assignments.wizard.preview')}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold mb-2">{formData.title}</h1>
                <div className="prose dark:prose-invert max-w-none mb-6">
                    {formData.description}
                </div>

                <div className="flex gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded border border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500 block">Due Date</span>
                        <span className="font-medium">{formData.due_date ? new Date(formData.due_date).toLocaleString() : 'No due date'}</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded border border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500 block">Points</span>
                        <span className="font-medium">{formData.max_points}</span>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    {/* Mock submission area */}
                    {formData.assignment_type === 'TEXT' && (
                        <div className="p-4 border-2 border-dashed border-gray-300 text-center text-gray-500 rounded-lg">
                            Student submission area (Text/File)
                        </div>
                    )}
                    {formData.assignment_type === 'CODE' && (
                        <div className="h-32 bg-gray-900 rounded-lg flex items-center justify-center text-gray-400 font-mono">
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
                            ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}
                        `}>
                                {s}
                            </div>
                            <span className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                                {s === 1 ? t('wizard.type') : s === 2 ? t('wizard.details') : t('wizard.preview')}
                            </span>
                        </div>
                    ))}
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
