import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Squares2X2Icon,
  QueueListIcon,
  PhotoIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
} from '@heroicons/react/24/outline';
import { SLASH_COMMAND_ICONS } from './SlashCommandPalette';

type SidebarTab = 'blocks' | 'structure' | 'assets' | 'history';

type BlockAction = {
  key: string;
  label: string;
  hint: string;
  execute: () => void;
  shortcut?: string;
};

type TextStyleAction = {
  key: string;
  label: string;
  execute: () => void;
  isActive?: boolean;
  shortcut?: string;
};

const TAB_ICONS: Record<SidebarTab, React.ReactNode> = {
  blocks: <Squares2X2Icon className="h-4 w-4" />,
  structure: <QueueListIcon className="h-4 w-4" />,
  assets: <PhotoIcon className="h-4 w-4" />,
  history: <ClockIcon className="h-4 w-4" />,
};

const TAB_LABELS: Record<SidebarTab, string> = {
  blocks: 'Blocks',
  structure: 'Structure',
  assets: 'Assets',
  history: 'History',
};

interface EditorSidebarProps {
  editor: Editor;
  showTabs: boolean;
  sidebarTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  blockActions: BlockAction[];
  textStyleActions: TextStyleAction[];
  headingOutline: Array<{ text: string; level: number }>;
  assetStats: { images: number; embeds: number; tables: number; codeBlocks: number };
  historyEvents: string[];
  isUploading: boolean;
  onTriggerImageUpload: () => void;
  onExecuteBlockAction: (execute: () => void) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  editor,
  showTabs,
  sidebarTab,
  onTabChange,
  blockActions,
  textStyleActions,
  headingOutline,
  assetStats,
  historyEvents,
  isUploading,
  onTriggerImageUpload,
  onExecuteBlockAction,
  collapsed,
  onToggleCollapse,
}) => {
  const activeTab = showTabs ? sidebarTab : 'blocks';

  if (collapsed) {
    return (
      <div className="editor-sidebar-collapsed">
        <div className="editor-sidebar-collapsed-tabs">
          {(['blocks', 'structure', 'assets', 'history'] as SidebarTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`editor-sidebar-collapsed-tab ${activeTab === tab ? 'editor-sidebar-collapsed-tab-active' : ''}`}
              onClick={() => {
                onTabChange(tab);
                onToggleCollapse();
              }}
              title={TAB_LABELS[tab]}
            >
              {TAB_ICONS[tab]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="editor-sidebar-toggle"
          onClick={onToggleCollapse}
          title="Expand sidebar"
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="editor-sidebar">
      {showTabs && (
        <div className="editor-sidebar-tabs">
          {(['blocks', 'structure', 'assets', 'history'] as SidebarTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`editor-sidebar-tab ${sidebarTab === tab ? 'editor-sidebar-tab-active' : ''}`}
              onClick={() => onTabChange(tab)}
              title={TAB_LABELS[tab]}
            >
              {TAB_ICONS[tab]}
              <span className="editor-sidebar-tab-label">{TAB_LABELS[tab]}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="editor-sidebar-toggle editor-sidebar-toggle-expanded"
        onClick={onToggleCollapse}
        title="Collapse sidebar"
      >
        <ChevronLeftIcon className="h-3.5 w-3.5" />
      </button>

      <div key={activeTab} className="editor-sidebar-content">
          {activeTab === 'blocks' && (
            <div className="space-y-3">
              <div className="editor-sidebar-section">
                <p className="editor-sidebar-section-label">Text Styles</p>
                <div className="grid grid-cols-3 gap-1">
                  {textStyleActions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      onClick={action.execute}
                      title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                      className={`editor-sidebar-style-btn ${action.isActive ? 'editor-sidebar-style-btn-active' : ''}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {blockActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => onExecuteBlockAction(action.execute)}
                  title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                  className="editor-sidebar-block-btn"
                >
                  <span className="editor-sidebar-block-icon">
                    {SLASH_COMMAND_ICONS[action.key] || <Squares2X2Icon className="h-5 w-5" />}
                  </span>
                  <span className="editor-sidebar-block-text">
                    <span className="editor-sidebar-block-label">{action.label}</span>
                    <span className="editor-sidebar-block-hint">
                      {action.hint}{action.shortcut ? ` · ${action.shortcut}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-2">
              <p className="editor-sidebar-section-label">Heading Outline</p>
              {headingOutline.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add headings to see document structure.
                </p>
              ) : (
                headingOutline.map((heading, index) => (
                  <button
                    key={`${heading.text}-${index}`}
                    type="button"
                    onClick={() => editor.chain().focus().run()}
                    className="editor-sidebar-outline-item"
                    style={{ paddingLeft: `${Math.min(heading.level, 4) * 0.6}rem` }}
                  >
                    {heading.text}
                  </button>
                ))
              )}
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="space-y-3">
              <div className="editor-sidebar-section">
                <p className="editor-sidebar-section-label">Document Assets</p>
                <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li className="flex items-center gap-2">
                    <PhotoIcon className="h-4 w-4" style={{ color: 'var(--text-faint)' }} />
                    Images: {assetStats.images}
                  </li>
                  <li className="flex items-center gap-2">
                    <Squares2X2Icon className="h-4 w-4" style={{ color: 'var(--text-faint)' }} />
                    Embeds: {assetStats.embeds}
                  </li>
                  <li className="flex items-center gap-2">
                    <QueueListIcon className="h-4 w-4" style={{ color: 'var(--text-faint)' }} />
                    Tables: {assetStats.tables}
                  </li>
                  <li className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" style={{ color: 'var(--text-faint)' }} />
                    Code blocks: {assetStats.codeBlocks}
                  </li>
                </ul>
              </div>
              <button
                type="button"
                className="editor-sidebar-block-btn"
                onClick={onTriggerImageUpload}
                disabled={isUploading}
              >
                <span className="editor-sidebar-block-icon">
                  <PhotoIcon className="h-5 w-5" />
                </span>
                <span className="editor-sidebar-block-text">
                  <span className="editor-sidebar-block-label">
                    {isUploading ? 'Uploading...' : 'Upload Image'}
                  </span>
                  <span className="editor-sidebar-block-hint">Add image media</span>
                </span>
              </button>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <p className="editor-sidebar-section-label">Recent Changes</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="editor-sidebar-style-btn"
                  onClick={() => editor.chain().focus().undo().run()}
                  title="Undo (Cmd/Ctrl+Z)"
                >
                  <ArrowUturnLeftIcon className="h-3.5 w-3.5 inline mr-1" />
                  Undo
                </button>
                <button
                  type="button"
                  className="editor-sidebar-style-btn"
                  onClick={() => editor.chain().focus().redo().run()}
                  title="Redo (Cmd/Ctrl+Shift+Z)"
                >
                  <ArrowUturnRightIcon className="h-3.5 w-3.5 inline mr-1" />
                  Redo
                </button>
              </div>
              {historyEvents.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  No history entries yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {historyEvents.map((event, index) => (
                    <li
                      key={`${event}-${index}`}
                      className="rounded px-2 py-1 text-xs"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                    >
                      {event}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

// ── Mobile Drawer ──

interface MobileToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileToolsDrawer: React.FC<MobileToolsDrawerProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  return (
    <>
      {isOpen && (
        <div
          className="editor-tools-drawer-backdrop md:hidden"
          onClick={onClose}
        >
          <aside
            className="editor-tools-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b px-3 py-2"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Editor Tools
              </p>
              <button
                type="button"
                className="editor-tools-close"
                onClick={onClose}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
