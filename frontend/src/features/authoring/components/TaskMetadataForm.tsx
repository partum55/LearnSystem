import React from 'react';
import { Input } from '../../../components/Input';
import LatexEditor from './LatexEditor';
import { TaskMetadata } from '../types';

interface TaskMetadataFormProps {
  metadata: TaskMetadata;
  onChange: (value: TaskMetadata) => void;
}

const TaskMetadataForm: React.FC<TaskMetadataFormProps> = ({ metadata, onChange }) => {
  const updateField = (field: keyof TaskMetadata, value: TaskMetadata[keyof TaskMetadata]) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Metadata</h2>
      <Input
        label="Title"
        placeholder="Enter task title"
        value={metadata.title}
        onChange={(event) => updateField('title', event.target.value)}
      />
      <LatexEditor
        label="Description"
        value={metadata.description}
        format={metadata.format}
        onChange={(value) => updateField('description', value)}
        onFormatChange={(format) => updateField('format', format)}
        height="220px"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Difficulty</label>
          <select
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
            value={metadata.difficulty}
            onChange={(event) => updateField('difficulty', event.target.value as TaskMetadata['difficulty'])}
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tags (comma separated)</label>
          <input
            className="mt-1 w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
            value={metadata.tags.join(', ')}
            onChange={(event) => updateField('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))}
          />
        </div>
      </div>
    </section>
  );
};

export default TaskMetadataForm;
