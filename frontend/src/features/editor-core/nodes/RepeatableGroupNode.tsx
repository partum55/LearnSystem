import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer, NodeViewContent } from '@tiptap/react';

interface RepeatableGroupAttrs {
  groupId: string;
  minItems: number;
  maxItems: number;
  label: string;
}

const RepeatableGroupView: React.FC<NodeViewProps> = ({ node, editor }) => {
  const attrs = node.attrs as RepeatableGroupAttrs;
  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper className="my-3">
      <div
        className="rounded-lg p-4"
        style={{
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Repeatable Group
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {attrs.label || 'Untitled Group'}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {attrs.minItems}–{attrs.maxItems} items
          </span>
        </div>
        <NodeViewContent className="space-y-2" />
        {isEditable && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Place form fields inside this group. Students can add/remove entries.
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const RepeatableGroupNode = Node.create({
  name: 'repeatableGroup',
  group: 'block',
  content: 'block+',
  defining: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      groupId: { default: '' },
      minItems: { default: 1 },
      maxItems: { default: 5 },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="repeatable-group"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'repeatable-group',
        class: 'editor-repeatable-group',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RepeatableGroupView);
  },
});
