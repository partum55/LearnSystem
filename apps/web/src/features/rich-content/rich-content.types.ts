export type RichBlockType =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'quote'
  | 'code'
  | 'mermaid'
  | 'math';

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
  };
}

export interface RichContentDocument {
  version: number;
  blocks: RichBlock[];
}
