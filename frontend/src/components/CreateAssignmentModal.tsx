import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onAssignmentCreated: () => void;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  courseId,
  onAssignmentCreated,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    max_points: '100',
    due_date: '',
    is_published: false,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/assessments/assignments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          course: courseId,
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          max_points: parseFloat(formData.max_points),
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          is_published: formData.is_published,
          submission_types: ['file', 'text'],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create assignment');
      }

      setFormData({
        title: '',
        description: '',
        instructions: '',
        max_points: '100',
        due_date: '',
        is_published: false,
      });
      onAssignmentCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || t('assignments.errors.createFailed'));
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('assignments.createAssignment')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        <Input
          label={t('assignments.title')}
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder={t('assignments.titlePlaceholder')}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('assignments.description')} *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            required
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder={t('assignments.descriptionPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('assignments.instructions')}
          </label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleChange}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            placeholder={t('assignments.instructionsPlaceholder')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('assignments.maxPoints')}
            name="max_points"
            type="number"
            value={formData.max_points}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
          />

          <Input
            label={t('assignments.dueDate')}
            name="due_date"
            type="datetime-local"
            value={formData.due_date}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_published"
            id="is_published_assignment"
            checked={formData.is_published}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_published_assignment" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
            {t('assignments.publishImmediately')}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            isLoading={loading}
          >
            {t('assignments.createAssignment')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

