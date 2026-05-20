import React, { useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';

type FieldType = 'text-single' | 'text-multi' | 'url' | 'checkbox' | 'dropdown' | 'number' | 'date' | 'file';

interface FormFieldAttrs {
  fieldId: string;
  fieldType: FieldType;
  label: string;
  required: boolean;
  placeholder: string;
  options: string; // comma-separated for dropdown
  validation: string;
}

const FormFieldView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const attrs = node.attrs as FormFieldAttrs;
  const isEditable = editor.isEditable;
  const [editing, setEditing] = useState(false);

  if (editing && isEditable) {
    return (
      <NodeViewWrapper className="my-2">
        <div
          className="rounded-lg p-4 space-y-3"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Configure Form Field
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Label</label>
              <input
                className="input w-full text-sm"
                value={attrs.label}
                onChange={(e) => updateAttributes({ label: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <select
                className="input w-full text-sm"
                value={attrs.fieldType}
                onChange={(e) => updateAttributes({ fieldType: e.target.value })}
              >
                <option value="text-single">Text (single line)</option>
                <option value="text-multi">Text (multi-line)</option>
                <option value="url">URL</option>
                <option value="checkbox">Checkbox</option>
                <option value="dropdown">Dropdown</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="file">File</option>
              </select>
            </div>
            <div>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Placeholder</label>
              <input
                className="input w-full text-sm"
                value={attrs.placeholder}
                onChange={(e) => updateAttributes({ placeholder: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={attrs.required}
                onChange={(e) => updateAttributes({ required: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Required</span>
            </div>
          </div>
          {attrs.fieldType === 'dropdown' && (
            <div>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Options (comma-separated)</label>
              <input
                className="input w-full text-sm"
                value={attrs.options}
                onChange={(e) => updateAttributes({ options: e.target.value })}
                placeholder="Option 1, Option 2, Option 3"
              />
            </div>
          )}
          <button type="button" className="btn btn-primary btn-xs" onClick={() => setEditing(false)}>
            Done
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  // Display mode (teacher: config card, student: form input rendered in FormSubmissionRenderer)
  return (
    <NodeViewWrapper className="my-2">
      <div
        className="rounded-lg p-3 flex items-center justify-between"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
            {attrs.fieldType}
          </span>
          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {attrs.label || 'Untitled field'}
          </span>
          {attrs.required && (
            <span className="text-xs" style={{ color: 'var(--fn-error)' }}>*</span>
          )}
        </div>
        {isEditable && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const FormFieldNode = Node.create({
  name: 'formField',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      fieldId: { default: '' },
      fieldType: { default: 'text-single' },
      label: { default: '' },
      required: { default: false },
      placeholder: { default: '' },
      options: { default: '' },
      validation: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="form-field"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'form-field',
        'data-field-type': String(HTMLAttributes.fieldType || 'text-single'),
        class: 'editor-form-field',
      }),
      `[Form Field: ${String(HTMLAttributes.label || 'Untitled')}]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FormFieldView);
  },
});
