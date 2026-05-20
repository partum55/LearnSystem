import React from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  LinkIcon,
  ListBulletIcon,
  ChatBubbleBottomCenterTextIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

interface EditorBubbleToolbarProps {
  editor: Editor;
  hotkeysProfile: 'standard' | 'extended';
  onLinkClick: () => void;
}

const BubbleBtn: React.FC<{
  onClick: () => void;
  isActive?: boolean;
  title?: string;
  children: React.ReactNode;
}> = ({ onClick, isActive, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`editor-toolbar-btn ${isActive ? 'editor-toolbar-btn-active' : ''}`}
  >
    {children}
  </button>
);

const Divider = () => <span className="editor-toolbar-divider" />;

export const EditorBubbleToolbar: React.FC<EditorBubbleToolbarProps> = ({
  editor,
  hotkeysProfile,
  onLinkClick,
}) => (
  <BubbleMenu editor={editor} options={{ placement: 'top' }}>
    <div className="editor-bubble-toolbar">
      {/* Text formatting group */}
      <BubbleBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Cmd/Ctrl+B)"
      >
        <span className="font-bold text-xs">B</span>
      </BubbleBtn>
      <BubbleBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Cmd/Ctrl+I)"
      >
        <span className="italic text-xs">I</span>
      </BubbleBtn>
      <BubbleBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <CodeBracketIcon className="h-3.5 w-3.5" />
      </BubbleBtn>

      <Divider />

      {/* Link */}
      <BubbleBtn
        onClick={onLinkClick}
        isActive={editor.isActive('link')}
        title="Link (Cmd/Ctrl+K)"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </BubbleBtn>

      <Divider />

      {/* Headings */}
      <BubbleBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title={hotkeysProfile === 'extended' ? 'Heading 1 (Alt+1)' : 'Heading 1'}
      >
        <span className="text-[10px] font-bold">H1</span>
      </BubbleBtn>
      <BubbleBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title={hotkeysProfile === 'extended' ? 'Heading 2 (Alt+2)' : 'Heading 2'}
      >
        <span className="text-[10px] font-bold">H2</span>
      </BubbleBtn>

      <Divider />

      {/* Blocks */}
      <BubbleBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title={hotkeysProfile === 'extended' ? 'Bulleted list (Alt+Shift+8)' : 'Bulleted list'}
      >
        <ListBulletIcon className="h-3.5 w-3.5" />
      </BubbleBtn>
      <BubbleBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title={hotkeysProfile === 'extended' ? 'Quote (Alt+Shift+Q)' : 'Quote'}
      >
        <ChatBubbleBottomCenterTextIcon className="h-3.5 w-3.5" />
      </BubbleBtn>
    </div>
  </BubbleMenu>
);
