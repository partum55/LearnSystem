import React, { useState, useEffect, useId, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { ensureMermaidInitialized } from '../../features/editor-core/mermaidUtils';
import { aiApi } from '../../api/ai';
import './diagram-creator.css';
import {
  SparklesIcon,
  ListBulletIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

type DiagramType = 'flowchart' | 'sequence' | 'mindmap' | 'pie' | 'classDiagram' | 'stateDiagram' | 'erDiagram' | 'gantt';
type FlowDirection = 'TD' | 'LR' | 'BT' | 'RL';

interface FlowNode {
  id: string;
  label: string;
  shape: 'rect' | 'rounded' | 'circle' | 'diamond' | 'hexagon';
}

interface FlowEdge {
  from: string;
  to: string;
  label: string;
  style: 'solid' | 'dotted' | 'thick';
}

interface SeqParticipant {
  alias: string;
  label: string;
}

interface SeqMessage {
  from: string;
  to: string;
  label: string;
  type: 'solid' | 'dotted' | 'solidOpen' | 'dottedOpen';
}

interface MindmapItem {
  text: string;
  children: MindmapItem[];
}

interface PieSlice {
  label: string;
  value: number;
}

interface DiagramCreatorProps {
  onInsert?: (mermaidCode: string) => void;
  onClose?: () => void;
  initialCode?: string;
}

/* ═══════════════════════════════════════════
   Shape map for mermaid syntax
   ═══════════════════════════════════════════ */

const SHAPE_WRAP: Record<FlowNode['shape'], [string, string]> = {
  rect: ['[', ']'],
  rounded: ['(', ')'],
  circle: ['((', '))'],
  diamond: ['{', '}'],
  hexagon: ['{{', '}}'],
};

const EDGE_STYLE: Record<FlowEdge['style'], string> = {
  solid: '-->',
  dotted: '-..->',
  thick: '==>',
};

const MSG_ARROW: Record<SeqMessage['type'], string> = {
  solid: '->>',
  dotted: '-->>',
  solidOpen: '->',
  dottedOpen: '-->',
};

/* ═══════════════════════════════════════════
   Mermaid code generators
   ═══════════════════════════════════════════ */

function generateFlowchartCode(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: FlowDirection,
): string {
  const lines: string[] = [`graph ${direction}`];
  for (const n of nodes) {
    const [open, close] = SHAPE_WRAP[n.shape];
    lines.push(`  ${n.id}${open}"${n.label}"${close}`);
  }
  for (const e of edges) {
    const arrow = EDGE_STYLE[e.style];
    const labelPart = e.label ? `|"${e.label}"|` : '';
    lines.push(`  ${e.from} ${arrow}${labelPart} ${e.to}`);
  }
  return lines.join('\n');
}

function generateSequenceCode(participants: SeqParticipant[], messages: SeqMessage[]): string {
  const lines: string[] = ['sequenceDiagram'];
  for (const p of participants) {
    lines.push(`  participant ${p.alias} as ${p.label}`);
  }
  for (const m of messages) {
    lines.push(`  ${m.from}${MSG_ARROW[m.type]}${m.to}: ${m.label}`);
  }
  return lines.join('\n');
}

function renderMindmapNode(item: MindmapItem, depth: number): string {
  const indent = '  '.repeat(depth + 1);
  let result = `${indent}${item.text}`;
  for (const child of item.children) {
    result += '\n' + renderMindmapNode(child, depth + 1);
  }
  return result;
}

function generateMindmapCode(root: MindmapItem): string {
  return `mindmap\n  root(${root.text})${root.children.length ? '\n' + root.children.map(c => renderMindmapNode(c, 1)).join('\n') : ''}`;
}

function generatePieCode(title: string, slices: PieSlice[]): string {
  const lines: string[] = [`pie title ${title}`];
  for (const s of slices) {
    lines.push(`  "${s.label}" : ${s.value}`);
  }
  return lines.join('\n');
}

/* ═══════════════════════════════════════════
   Diagram type metadata
   ═══════════════════════════════════════════ */

const DIAGRAM_TYPES: { value: DiagramType; label: string; hint: string }[] = [
  { value: 'flowchart', label: 'Flowchart', hint: 'Process flows, decision trees' },
  { value: 'sequence', label: 'Sequence', hint: 'Interactions between actors' },
  { value: 'mindmap', label: 'Mind Map', hint: 'Hierarchical ideas' },
  { value: 'pie', label: 'Pie Chart', hint: 'Proportional data' },
  { value: 'classDiagram', label: 'Class Diagram', hint: 'OOP relationships' },
  { value: 'stateDiagram', label: 'State Diagram', hint: 'State machines' },
  { value: 'erDiagram', label: 'ER Diagram', hint: 'Database relations' },
  { value: 'gantt', label: 'Gantt Chart', hint: 'Project timeline' },
];

/* ═══════════════════════════════════════════
   Unique ID generator
   ═══════════════════════════════════════════ */

let _uid = 0;
const uid = () => `n${++_uid}`;

/* ═══════════════════════════════════════════
   DiagramCreator Component
   ═══════════════════════════════════════════ */

const DiagramCreator: React.FC<DiagramCreatorProps> = ({ onInsert, onClose, initialCode }) => {
  const { t } = useTranslation();
  const mermaidId = useId().replace(/:/g, '');

  // ─── Mode toggle ───
  const [mode, setMode] = useState<'prompt' | 'field'>('prompt');

  // ─── Generated mermaid code & preview ───
  const [mermaidCode, setMermaidCode] = useState(initialCode || '');
  const [svgHtml, setSvgHtml] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ─── Prompt mode state ───
  const [prompt, setPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ─── Field mode: diagram type ───
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // ─── Field mode: flowchart ───
  const [flowDirection, setFlowDirection] = useState<FlowDirection>('TD');
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([
    { id: uid(), label: 'Start', shape: 'rounded' },
    { id: uid(), label: 'End', shape: 'rounded' },
  ]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([
    { from: flowNodes[0].id, to: flowNodes[1].id, label: '', style: 'solid' },
  ]);

  // ─── Field mode: sequence ───
  const [seqParticipants, setSeqParticipants] = useState<SeqParticipant[]>([
    { alias: 'A', label: 'Actor A' },
    { alias: 'B', label: 'Actor B' },
  ]);
  const [seqMessages, setSeqMessages] = useState<SeqMessage[]>([
    { from: 'A', to: 'B', label: 'Hello', type: 'solid' },
  ]);

  // ─── Field mode: mindmap ───
  const [mindmapRoot, setMindmapRoot] = useState<MindmapItem>({
    text: 'Central Topic',
    children: [
      { text: 'Branch A', children: [] },
      { text: 'Branch B', children: [] },
    ],
  });

  // ─── Field mode: pie ───
  const [pieTitle, setPieTitle] = useState('Distribution');
  const [pieSlices, setPieSlices] = useState<PieSlice[]>([
    { label: 'Category A', value: 40 },
    { label: 'Category B', value: 35 },
    { label: 'Category C', value: 25 },
  ]);

  /* ─── Build mermaid code from field state ─── */
  const buildFieldCode = useCallback((): string => {
    switch (diagramType) {
      case 'flowchart':
        return generateFlowchartCode(flowNodes, flowEdges, flowDirection);
      case 'sequence':
        return generateSequenceCode(seqParticipants, seqMessages);
      case 'mindmap':
        return generateMindmapCode(mindmapRoot);
      case 'pie':
        return generatePieCode(pieTitle, pieSlices);
      default:
        return '';
    }
  }, [diagramType, flowNodes, flowEdges, flowDirection, seqParticipants, seqMessages, mindmapRoot, pieTitle, pieSlices]);

  // Auto-generate code from fields in field mode
  useEffect(() => {
    if (mode === 'field') {
      const code = buildFieldCode();
      if (code) setMermaidCode(code);
    }
  }, [mode, buildFieldCode]);

  /* ─── Render mermaid preview ─── */
  useEffect(() => {
    const trimmed = mermaidCode.trim();
    if (!trimmed) {
      setSvgHtml('');
      setRenderError(null);
      return;
    }

    ensureMermaidInitialized();
    let disposed = false;

    mermaid
      .render(`diagram-creator-${mermaidId}`, trimmed)
      .then(({ svg }) => {
        if (!disposed) {
          setSvgHtml(DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } }));
          setRenderError(null);
        }
      })
      .catch((err: unknown) => {
        if (!disposed) {
          setRenderError(err instanceof Error ? err.message : 'Render failed');
          setSvgHtml('');
        }
      });

    return () => { disposed = true; };
  }, [mermaidCode, mermaidId]);

  /* ─── AI prompt handler ─── */
  const handleGenerate = async () => {
    if (!prompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await aiApi.editContent({
        entityType: 'COURSE',
        entityId: 'diagram',
        currentContent: mermaidCode || '',
        prompt: `Generate ONLY valid Mermaid diagram code (no markdown fences, no explanation) for: ${prompt.trim()}`,
      });

      const cleaned = typeof response === 'string'
        ? response.replace(/^```(?:mermaid)?\n?/gm, '').replace(/```$/gm, '').trim()
        : '';

      if (cleaned) {
        setMermaidCode(cleaned);
      } else {
        setAiError(t('diagram.aiEmpty', 'AI returned empty result'));
      }
    } catch {
      setAiError(t('diagram.aiError', 'Failed to generate diagram'));
    } finally {
      setAiLoading(false);
    }
  };

  /* ─── Copy to clipboard ─── */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ─── Insert into editor ─── */
  const handleInsert = () => {
    onInsert?.(mermaidCode);
    onClose?.();
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="diagram-creator">
      {/* ── Header ── */}
      <div className="dc-header">
        <h3 className="dc-title">{t('diagram.title', 'Create Diagram')}</h3>
        <div className="dc-mode-toggle">
          <button
            type="button"
            className={`dc-mode-btn ${mode === 'prompt' ? 'dc-mode-active' : ''}`}
            onClick={() => setMode('prompt')}
          >
            <SparklesIcon className="dc-icon" />
            <span>{t('diagram.aiMode', 'AI Prompt')}</span>
          </button>
          <button
            type="button"
            className={`dc-mode-btn ${mode === 'field' ? 'dc-mode-active' : ''}`}
            onClick={() => setMode('field')}
          >
            <ListBulletIcon className="dc-icon" />
            <span>{t('diagram.fieldMode', 'Builder')}</span>
          </button>
        </div>
      </div>

      <div className="dc-body">
        {/* ══════════ LEFT: Controls ══════════ */}
        <div className="dc-controls">
          {mode === 'prompt' ? (
            <PromptPanel
              prompt={prompt}
              setPrompt={setPrompt}
              loading={aiLoading}
              error={aiError}
              onGenerate={handleGenerate}
              t={t}
            />
          ) : (
            <FieldPanel
              diagramType={diagramType}
              setDiagramType={setDiagramType}
              typeDropdownOpen={typeDropdownOpen}
              setTypeDropdownOpen={setTypeDropdownOpen}
              flowDirection={flowDirection}
              setFlowDirection={setFlowDirection}
              flowNodes={flowNodes}
              setFlowNodes={setFlowNodes}
              flowEdges={flowEdges}
              setFlowEdges={setFlowEdges}
              seqParticipants={seqParticipants}
              setSeqParticipants={setSeqParticipants}
              seqMessages={seqMessages}
              setSeqMessages={setSeqMessages}
              mindmapRoot={mindmapRoot}
              setMindmapRoot={setMindmapRoot}
              pieTitle={pieTitle}
              setPieTitle={setPieTitle}
              pieSlices={pieSlices}
              setPieSlices={setPieSlices}
              t={t}
            />
          )}

          {/* ── Raw code editor ── */}
          <div className="dc-code-section">
            <label className="dc-code-label">
              <span>{t('diagram.mermaidCode', 'Mermaid Code')}</span>
              <button type="button" className="dc-copy-btn" onClick={handleCopy}>
                {copied ? <CheckIcon className="dc-icon-sm" /> : <ClipboardDocumentIcon className="dc-icon-sm" />}
              </button>
            </label>
            <textarea
              className="dc-code-editor"
              value={mermaidCode}
              onChange={e => setMermaidCode(e.target.value)}
              rows={6}
              spellCheck={false}
              placeholder="graph TD&#10;  A[Start] --> B[End]"
            />
          </div>
        </div>

        {/* ══════════ RIGHT: Preview ══════════ */}
        <div className="dc-preview-pane">
          <div className="dc-preview-label">{t('diagram.preview', 'Preview')}</div>
          <div className="dc-preview-canvas">
            {renderError ? (
              <div className="dc-preview-error">{renderError}</div>
            ) : svgHtml ? (
              <div className="dc-preview-svg" dangerouslySetInnerHTML={{ __html: svgHtml }} />
            ) : (
              <div className="dc-preview-empty">
                <div className="dc-preview-empty-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <rect x="28" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <rect x="16" y="28" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <path d="M12 20v4l12 4M36 20v4l-12 4" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
                  </svg>
                </div>
                <span>{t('diagram.emptyPreview', 'Diagram will appear here')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="dc-footer">
        {onClose && (
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!mermaidCode.trim() || !!renderError}
          onClick={handleInsert}
        >
          {t('diagram.insert', 'Insert Diagram')}
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Prompt Panel
   ═══════════════════════════════════════════ */

interface PromptPanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  t: TFunction;
}

const PromptPanel: React.FC<PromptPanelProps> = ({ prompt, setPrompt, loading, error, onGenerate, t }) => (
  <div className="dc-prompt-panel">
    <label className="dc-field-label">{t('diagram.describePrompt', 'Describe your diagram')}</label>
    <textarea
      className="dc-prompt-input"
      value={prompt}
      onChange={e => setPrompt(e.target.value)}
      rows={4}
      placeholder={t('diagram.promptPlaceholder', 'e.g. "A flowchart showing user authentication flow with login, MFA check, and session creation"')}
      onKeyDown={e => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onGenerate();
        }
      }}
    />
    <button
      type="button"
      className={`dc-generate-btn ${loading ? 'dc-generating' : ''}`}
      disabled={!prompt.trim() || loading}
      onClick={onGenerate}
    >
      {loading ? (
        <>
          <ArrowPathIcon className="dc-icon dc-spin" />
          <span>{t('diagram.generating', 'Generating...')}</span>
        </>
      ) : (
        <>
          <SparklesIcon className="dc-icon" />
          <span>{t('diagram.generate', 'Generate')}</span>
        </>
      )}
    </button>
    {error && <div className="dc-error-text">{error}</div>}
    <div className="dc-hint">{t('diagram.promptHint', 'Ctrl+Enter to generate. You can refine the result afterwards.')}</div>
  </div>
);

/* ═══════════════════════════════════════════
   Field Panel
   ═══════════════════════════════════════════ */

interface FieldPanelProps {
  diagramType: DiagramType;
  setDiagramType: (v: DiagramType) => void;
  typeDropdownOpen: boolean;
  setTypeDropdownOpen: (v: boolean) => void;
  flowDirection: FlowDirection;
  setFlowDirection: (v: FlowDirection) => void;
  flowNodes: FlowNode[];
  setFlowNodes: React.Dispatch<React.SetStateAction<FlowNode[]>>;
  flowEdges: FlowEdge[];
  setFlowEdges: React.Dispatch<React.SetStateAction<FlowEdge[]>>;
  seqParticipants: SeqParticipant[];
  setSeqParticipants: React.Dispatch<React.SetStateAction<SeqParticipant[]>>;
  seqMessages: SeqMessage[];
  setSeqMessages: React.Dispatch<React.SetStateAction<SeqMessage[]>>;
  mindmapRoot: MindmapItem;
  setMindmapRoot: React.Dispatch<React.SetStateAction<MindmapItem>>;
  pieTitle: string;
  setPieTitle: (v: string) => void;
  pieSlices: PieSlice[];
  setPieSlices: React.Dispatch<React.SetStateAction<PieSlice[]>>;
  t: TFunction;
}

const FieldPanel: React.FC<FieldPanelProps> = (props) => {
  const { diagramType, setDiagramType, typeDropdownOpen, setTypeDropdownOpen, t } = props;
  const selectedType = DIAGRAM_TYPES.find(d => d.value === diagramType)!;

  return (
    <div className="dc-field-panel">
      {/* ── Type selector ── */}
      <div className="dc-type-selector">
        <label className="dc-field-label">{t('diagram.diagramType', 'Diagram Type')}</label>
        <div className="dc-type-dropdown-wrap">
          <button
            type="button"
            className="dc-type-trigger"
            onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
          >
            <span className="dc-type-label">{selectedType.label}</span>
            <span className="dc-type-hint">{selectedType.hint}</span>
            <ChevronDownIcon className={`dc-icon-sm dc-chevron ${typeDropdownOpen ? 'dc-chevron-open' : ''}`} />
          </button>
          {typeDropdownOpen && (
            <div className="dc-type-menu">
              {DIAGRAM_TYPES.map(dt => (
                <button
                  key={dt.value}
                  type="button"
                  className={`dc-type-option ${dt.value === diagramType ? 'dc-type-option-active' : ''}`}
                  onClick={() => { setDiagramType(dt.value); setTypeDropdownOpen(false); }}
                >
                  <span className="dc-type-option-label">{dt.label}</span>
                  <span className="dc-type-option-hint">{dt.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Type-specific fields ── */}
      {diagramType === 'flowchart' && <FlowchartFields {...props} />}
      {diagramType === 'sequence' && <SequenceFields {...props} />}
      {diagramType === 'mindmap' && <MindmapFields {...props} />}
      {diagramType === 'pie' && <PieFields {...props} />}
      {['classDiagram', 'stateDiagram', 'erDiagram', 'gantt'].includes(diagramType) && (
        <div className="dc-raw-hint">
          <p>{t('diagram.rawCodeHint', 'Use the code editor below to write this diagram type directly in Mermaid syntax.')}</p>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   Flowchart Fields
   ═══════════════════════════════════════════ */

const FlowchartFields: React.FC<FieldPanelProps> = ({ flowDirection, setFlowDirection, flowNodes, setFlowNodes, flowEdges, setFlowEdges, t }) => {
  const addNode = () => {
    const newId = uid();
    setFlowNodes(prev => [...prev, { id: newId, label: `Node ${prev.length + 1}`, shape: 'rect' }]);
  };

  const addEdge = () => {
    if (flowNodes.length < 2) return;
    setFlowEdges(prev => [...prev, { from: flowNodes[0].id, to: flowNodes[1].id, label: '', style: 'solid' }]);
  };

  return (
    <div className="dc-fields-scroll">
      {/* Direction */}
      <div className="dc-field-row">
        <label className="dc-field-label">{t('diagram.direction', 'Direction')}</label>
        <div className="dc-direction-pills">
          {(['TD', 'LR', 'BT', 'RL'] as FlowDirection[]).map(d => (
            <button
              key={d}
              type="button"
              className={`dc-pill ${flowDirection === d ? 'dc-pill-active' : ''}`}
              onClick={() => setFlowDirection(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Nodes */}
      <div className="dc-field-group">
        <div className="dc-field-group-header">
          <span className="dc-field-label">{t('diagram.nodes', 'Nodes')}</span>
          <button type="button" className="dc-add-btn" onClick={addNode}>
            <PlusIcon className="dc-icon-sm" />
          </button>
        </div>
        {flowNodes.map((node, i) => (
          <div key={node.id} className="dc-node-row">
            <input
              className="dc-field-input dc-field-input-grow"
              value={node.label}
              onChange={e => setFlowNodes(prev => prev.map((n, j) => j === i ? { ...n, label: e.target.value } : n))}
              placeholder="Label"
            />
            <select
              className="dc-field-select"
              value={node.shape}
              onChange={e => setFlowNodes(prev => prev.map((n, j) => j === i ? { ...n, shape: e.target.value as FlowNode['shape'] } : n))}
            >
              <option value="rect">Rectangle</option>
              <option value="rounded">Rounded</option>
              <option value="circle">Circle</option>
              <option value="diamond">Diamond</option>
              <option value="hexagon">Hexagon</option>
            </select>
            {flowNodes.length > 1 && (
              <button type="button" className="dc-remove-btn" onClick={() => setFlowNodes(prev => prev.filter((_, j) => j !== i))}>
                <TrashIcon className="dc-icon-sm" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Edges */}
      <div className="dc-field-group">
        <div className="dc-field-group-header">
          <span className="dc-field-label">{t('diagram.edges', 'Connections')}</span>
          <button type="button" className="dc-add-btn" onClick={addEdge} disabled={flowNodes.length < 2}>
            <PlusIcon className="dc-icon-sm" />
          </button>
        </div>
        {flowEdges.map((edge, i) => (
          <div key={i} className="dc-edge-row">
            <select
              className="dc-field-select dc-field-select-sm"
              value={edge.from}
              onChange={e => setFlowEdges(prev => prev.map((ed, j) => j === i ? { ...ed, from: e.target.value } : ed))}
            >
              {flowNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
            <span className="dc-arrow-label">&rarr;</span>
            <select
              className="dc-field-select dc-field-select-sm"
              value={edge.to}
              onChange={e => setFlowEdges(prev => prev.map((ed, j) => j === i ? { ...ed, to: e.target.value } : ed))}
            >
              {flowNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
            <input
              className="dc-field-input dc-edge-label-input"
              value={edge.label}
              onChange={e => setFlowEdges(prev => prev.map((ed, j) => j === i ? { ...ed, label: e.target.value } : ed))}
              placeholder="Label"
            />
            <select
              className="dc-field-select dc-field-select-xs"
              value={edge.style}
              onChange={e => setFlowEdges(prev => prev.map((ed, j) => j === i ? { ...ed, style: e.target.value as FlowEdge['style'] } : ed))}
            >
              <option value="solid">Solid</option>
              <option value="dotted">Dotted</option>
              <option value="thick">Thick</option>
            </select>
            <button type="button" className="dc-remove-btn" onClick={() => setFlowEdges(prev => prev.filter((_, j) => j !== i))}>
              <TrashIcon className="dc-icon-sm" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   Sequence Fields
   ═══════════════════════════════════════════ */

const SequenceFields: React.FC<FieldPanelProps> = ({ seqParticipants, setSeqParticipants, seqMessages, setSeqMessages, t }) => (
  <div className="dc-fields-scroll">
    <div className="dc-field-group">
      <div className="dc-field-group-header">
        <span className="dc-field-label">{t('diagram.participants', 'Participants')}</span>
        <button type="button" className="dc-add-btn" onClick={() => {
          const alias = String.fromCharCode(65 + seqParticipants.length);
          setSeqParticipants(prev => [...prev, { alias, label: `Actor ${alias}` }]);
        }}>
          <PlusIcon className="dc-icon-sm" />
        </button>
      </div>
      {seqParticipants.map((p, i) => (
        <div key={i} className="dc-node-row">
          <input
            className="dc-field-input dc-field-alias"
            value={p.alias}
            onChange={e => setSeqParticipants(prev => prev.map((pp, j) => j === i ? { ...pp, alias: e.target.value } : pp))}
            placeholder="ID"
          />
          <input
            className="dc-field-input dc-field-input-grow"
            value={p.label}
            onChange={e => setSeqParticipants(prev => prev.map((pp, j) => j === i ? { ...pp, label: e.target.value } : pp))}
            placeholder="Display name"
          />
          {seqParticipants.length > 2 && (
            <button type="button" className="dc-remove-btn" onClick={() => setSeqParticipants(prev => prev.filter((_, j) => j !== i))}>
              <TrashIcon className="dc-icon-sm" />
            </button>
          )}
        </div>
      ))}
    </div>

    <div className="dc-field-group">
      <div className="dc-field-group-header">
        <span className="dc-field-label">{t('diagram.messages', 'Messages')}</span>
        <button type="button" className="dc-add-btn" onClick={() => {
          if (seqParticipants.length >= 2) {
            setSeqMessages(prev => [...prev, { from: seqParticipants[0].alias, to: seqParticipants[1].alias, label: 'Message', type: 'solid' }]);
          }
        }}>
          <PlusIcon className="dc-icon-sm" />
        </button>
      </div>
      {seqMessages.map((m, i) => (
        <div key={i} className="dc-edge-row">
          <select className="dc-field-select dc-field-select-sm" value={m.from}
            onChange={e => setSeqMessages(prev => prev.map((mm, j) => j === i ? { ...mm, from: e.target.value } : mm))}
          >
            {seqParticipants.map(p => <option key={p.alias} value={p.alias}>{p.label}</option>)}
          </select>
          <select className="dc-field-select dc-field-select-xs" value={m.type}
            onChange={e => setSeqMessages(prev => prev.map((mm, j) => j === i ? { ...mm, type: e.target.value as SeqMessage['type'] } : mm))}
          >
            <option value="solid">&#8594;</option>
            <option value="dotted">&#8674;</option>
            <option value="solidOpen">&#8594; open</option>
            <option value="dottedOpen">&#8674; open</option>
          </select>
          <select className="dc-field-select dc-field-select-sm" value={m.to}
            onChange={e => setSeqMessages(prev => prev.map((mm, j) => j === i ? { ...mm, to: e.target.value } : mm))}
          >
            {seqParticipants.map(p => <option key={p.alias} value={p.alias}>{p.label}</option>)}
          </select>
          <input className="dc-field-input dc-field-input-grow" value={m.label} placeholder="Message"
            onChange={e => setSeqMessages(prev => prev.map((mm, j) => j === i ? { ...mm, label: e.target.value } : mm))}
          />
          <button type="button" className="dc-remove-btn" onClick={() => setSeqMessages(prev => prev.filter((_, j) => j !== i))}>
            <TrashIcon className="dc-icon-sm" />
          </button>
        </div>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   Mindmap Fields
   ═══════════════════════════════════════════ */

const MindmapFields: React.FC<FieldPanelProps> = ({ mindmapRoot, setMindmapRoot, t }) => {
  const updateRoot = (text: string) => setMindmapRoot(prev => ({ ...prev, text }));

  const addChild = (path: number[]) => {
    setMindmapRoot(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as MindmapItem;
      let target = copy;
      for (const idx of path) target = target.children[idx];
      target.children.push({ text: 'New item', children: [] });
      return copy;
    });
  };

  const updateChild = (path: number[], text: string) => {
    setMindmapRoot(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as MindmapItem;
      let target = copy;
      for (let k = 0; k < path.length - 1; k++) target = target.children[path[k]];
      target.children[path[path.length - 1]].text = text;
      return copy;
    });
  };

  const removeChild = (path: number[]) => {
    setMindmapRoot(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as MindmapItem;
      let target = copy;
      for (let k = 0; k < path.length - 1; k++) target = target.children[path[k]];
      target.children.splice(path[path.length - 1], 1);
      return copy;
    });
  };

  const renderItems = (items: MindmapItem[], path: number[], depth: number) => (
    <div className="dc-mindmap-level" style={{ paddingLeft: depth * 16 }}>
      {items.map((item, i) => {
        const currentPath = [...path, i];
        return (
          <div key={i} className="dc-mindmap-item">
            <div className="dc-mindmap-row">
              <span className="dc-mindmap-dot" style={{ opacity: 0.3 + depth * 0.15 }} />
              <input
                className="dc-field-input dc-field-input-grow"
                value={item.text}
                onChange={e => updateChild(currentPath, e.target.value)}
              />
              <button type="button" className="dc-add-btn dc-add-btn-tiny" onClick={() => addChild(currentPath)}>
                <PlusIcon className="dc-icon-sm" />
              </button>
              <button type="button" className="dc-remove-btn" onClick={() => removeChild(currentPath)}>
                <TrashIcon className="dc-icon-sm" />
              </button>
            </div>
            {item.children.length > 0 && renderItems(item.children, currentPath, depth + 1)}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="dc-fields-scroll">
      <div className="dc-field-group">
        <label className="dc-field-label">{t('diagram.rootTopic', 'Central Topic')}</label>
        <div className="dc-node-row">
          <input className="dc-field-input dc-field-input-grow" value={mindmapRoot.text} onChange={e => updateRoot(e.target.value)} />
          <button type="button" className="dc-add-btn" onClick={() => addChild([])}>
            <PlusIcon className="dc-icon-sm" />
          </button>
        </div>
      </div>
      {mindmapRoot.children.length > 0 && renderItems(mindmapRoot.children, [], 0)}
    </div>
  );
};

/* ═══════════════════════════════════════════
   Pie Chart Fields
   ═══════════════════════════════════════════ */

const PieFields: React.FC<FieldPanelProps> = ({ pieTitle, setPieTitle, pieSlices, setPieSlices, t }) => (
  <div className="dc-fields-scroll">
    <div className="dc-field-row">
      <label className="dc-field-label">{t('diagram.chartTitle', 'Chart Title')}</label>
      <input className="dc-field-input" value={pieTitle} onChange={e => setPieTitle(e.target.value)} />
    </div>
    <div className="dc-field-group">
      <div className="dc-field-group-header">
        <span className="dc-field-label">{t('diagram.slices', 'Slices')}</span>
        <button type="button" className="dc-add-btn" onClick={() => setPieSlices(prev => [...prev, { label: `Category ${prev.length + 1}`, value: 10 }])}>
          <PlusIcon className="dc-icon-sm" />
        </button>
      </div>
      {pieSlices.map((slice, i) => (
        <div key={i} className="dc-node-row">
          <input
            className="dc-field-input dc-field-input-grow"
            value={slice.label}
            onChange={e => setPieSlices(prev => prev.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
            placeholder="Label"
          />
          <input
            className="dc-field-input dc-field-value"
            type="number"
            min={0}
            value={slice.value}
            onChange={e => setPieSlices(prev => prev.map((s, j) => j === i ? { ...s, value: Number(e.target.value) || 0 } : s))}
          />
          {pieSlices.length > 1 && (
            <button type="button" className="dc-remove-btn" onClick={() => setPieSlices(prev => prev.filter((_, j) => j !== i))}>
              <TrashIcon className="dc-icon-sm" />
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default DiagramCreator;
