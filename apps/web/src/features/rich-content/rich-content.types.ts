export type RichBlockType =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'quote'
  | 'code'
  | 'mermaid'
  | 'math'
  | 'video'
  | 'file'
  | 'table';

export interface RichBlock {
  id: string;
  type: RichBlockType;
  data: {
    text?: string;
    level?: number;
    items?: string[];
    listType?: 'bullet' | 'ordered';
    code?: string;
    language?: string;
    url?: string;
    filename?: string;
    rows?: string[][];
  };
}

export interface RichContentDocument {
  version: number;
  blocks: RichBlock[];
}
