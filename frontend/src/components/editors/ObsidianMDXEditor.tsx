import React from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  CodeToggle,
  DiffSourceToggleWrapper,
  UndoRedo,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import './mdx-obsidian-theme.css';

interface ObsidianMDXEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const ObsidianMDXEditor: React.FC<ObsidianMDXEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  readOnly = false,
}) => {
  const editorRef = React.useRef<MDXEditorMethods>(null);

  // Sync external value changes to the editor
  React.useEffect(() => {
    if (editorRef.current) {
      const currentMd = editorRef.current.getMarkdown();
      if (currentMd !== value) {
        editorRef.current.setMarkdown(value);
      }
    }
  }, [value]);

  return (
    <div className="obsidian-mdx-editor">
      <MDXEditor
        ref={editorRef}
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          tablePlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'python' }),
          codeMirrorPlugin({
            codeBlockLanguages: {
              python: 'Python',
              javascript: 'JavaScript',
              typescript: 'TypeScript',
              java: 'Java',
              cpp: 'C++',
              c: 'C',
              go: 'Go',
              rust: 'Rust',
              sql: 'SQL',
              html: 'HTML',
              css: 'CSS',
              json: 'JSON',
              bash: 'Bash',
              text: 'Plain text',
            },
          }),
          diffSourcePlugin({ viewMode: 'rich-text' }),
          ...(!readOnly
            ? [
                toolbarPlugin({
                  toolbarContents: () => (
                    <DiffSourceToggleWrapper>
                      <UndoRedo />
                      <BoldItalicUnderlineToggles />
                      <BlockTypeSelect />
                      <CodeToggle />
                      <CreateLink />
                      <ListsToggle />
                      <InsertTable />
                      <InsertThematicBreak />
                    </DiffSourceToggleWrapper>
                  ),
                }),
              ]
            : []),
        ]}
      />
    </div>
  );
};

export default ObsidianMDXEditor;
