export type BlockType =
  | 'text'
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'bulletList'
  | 'numbered'
  | 'numberedList'
  | 'todo'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'code'
  | 'image'
  | 'video'
  | 'embed'
  | 'math'
  | 'database'
  | 'table'
  | 'tracker'
  | 'countdown'
  | 'pomodoro'
  | 'progress_bar'
  | 'widget'
  | 'column_list'
  | 'column'
  | 'page'
  | 'synced_reference'
  | 'synced_block'
  | 'bookmark'
  | 'file'
  | 'audio';

export interface RichTextAnnotation {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  code: boolean;
  color: string;
  backgroundColor: string;
  [key: string]: any;
}

export interface RichTextSpan {
  text: string;
  annotations: RichTextAnnotation;
  href: string | null;
}

export interface BlockProperties {
  depth?: number;
  checked?: boolean;
  expanded?: boolean;
  emoji?: string;
  color?: string;
  language?: string;
  caption?: string;
  wrap?: boolean;
  hash?: string;
  width?: string | number | null;
  height?: string | number | null;
  alignment?: 'left' | 'center' | 'right';
  url?: string;
  embedType?: string;
  widgetSettings?: Record<string, any>;
  schema?: any[];
  cells?: any[][];
  hasHeader?: boolean;
  hasHeaderCol?: boolean;
  columnWidths?: number[];
  rowHeights?: number[];
  isFitToPage?: boolean;
  pageId?: string | null;
  syncedBlockId?: string | null;
  isOriginal?: boolean;
  [key: string]: any;
}

export interface Block {
  id: string;
  pageId: string;
  parentId: string | null;
  type: BlockType;
  sortOrder: string;
  orderKey: string;
  content: string;
  properties: BlockProperties;
  richText?: RichTextSpan[];
  version: number;
  actorId: string;
  updatedLogical: number;
  createdAt: number;
  updatedAt: number;
  lastViewedAt?: number;
  _isEncrypted?: boolean;
  words?: string[];
  [key: string]: any;
}
