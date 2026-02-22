import React from 'react';
import { Input } from '../../../components/Input';
import LatexEditor from './LatexEditor';
import { RubricCriterion, RubricDraft } from '../types';

interface RubricEditorProps {
  rubric: RubricDraft;
  onChange: (rubric: RubricDraft) => void;
  readOnly?: boolean;
}

const RubricEditor: React.FC<RubricEditorProps> = ({ rubric, onChange, readOnly = false }) => {
  const updateCriterion = (index: number, updated: RubricCriterion) => {
    const next = [...rubric.criteria];
    next[index] = updated;
    onChange({ ...rubric, criteria: next });
  };

  const addCriterion = () => {
    if (readOnly) return;
    onChange({
      ...rubric,
      criteria: [
        ...rubric.criteria,
        {
          id: `criterion-${Date.now()}`,
          title: 'New Criterion',
          description: '',
          weight: 0,
          explanation: '',
          format: 'MARKDOWN',
        },
      ],
    });
  };

  const removeCriterion = (index: number) => {
    if (readOnly) return;
    const next = rubric.criteria.filter((_, idx) => idx !== index);
    onChange({ ...rubric, criteria: next });
  };

  const totalWeight = rubric.criteria.reduce((sum, criterion) => sum + (criterion.weight || 0), 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Rubric</h2>
        <button
          type="button"
          className="btn btn-primary px-3 py-1 text-sm"
          onClick={addCriterion}
          disabled={readOnly}
        >
          Add Criterion
        </button>
      </div>
      {rubric.criteria.map((criterion, index) => (
        <div key={criterion.id} className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--border-default)' }}>
          <div className="flex items-start justify-between gap-4">
            <Input
              label={`Criterion ${index + 1} Title`}
              value={criterion.title}
              disabled={readOnly}
              onChange={(event) => updateCriterion(index, { ...criterion, title: event.target.value })}
            />
            <Input
              label="Weight"
              type="number"
              min={0}
              value={criterion.weight}
              disabled={readOnly}
              onChange={(event) => updateCriterion(index, { ...criterion, weight: Number(event.target.value) })}
            />
          </div>
          <LatexEditor
            label="Criterion Description"
            value={criterion.description}
            format={criterion.format}
            onChange={(value) => updateCriterion(index, { ...criterion, description: value })}
            onFormatChange={(format) => updateCriterion(index, { ...criterion, format })}
            height="180px"
          />
          <LatexEditor
            label="Scoring Explanation (LaTeX-ready)"
            value={criterion.explanation}
            format={criterion.format}
            onChange={(value) => updateCriterion(index, { ...criterion, explanation: value })}
            onFormatChange={(format) => updateCriterion(index, { ...criterion, format })}
            height="180px"
          />
          {!readOnly && rubric.criteria.length > 1 && (
            <button
              type="button"
              className="text-sm hover:underline"
              style={{ color: 'var(--fn-error)' }}
              onClick={() => removeCriterion(index)}
            >
              Remove criterion
            </button>
          )}
        </div>
      ))}
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Total weight: {totalWeight} / {rubric.totalPoints} points
      </div>
    </section>
  );
};

export default RubricEditor;
