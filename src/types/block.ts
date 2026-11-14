export type BlockType =
  | 'text'
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'toggle_heading1'
  | 'toggle_heading2'
  | 'toggle_heading3'
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
  | 'table_of_contents'
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
  | 'audio'
  | 'pdf'
  | 'button'
  | 'diagram'
  | 'breadcrumb'
  | 'template'
  | 'linked_database'
  | 'flashcard';

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
  textColor?: string;
  language?: string;
  caption?: string;
  wrap?: boolean;
  hash?: string;
  width?: string | number | null;
  height?: string | number | null;
  alignment?: 'left' | 'center' | 'right';
  url?: string;
  description?: string;
  title?: string;
  favicon?: string;
  thumbnail?: string;
  embedType?: string;
  widgetSettings?: Record<string, any>;
  schema?: any[];
  cells?: any[][];
  hasHeader?: boolean;
  hasHeaderCol?: boolean;
  columnWidths?: number[];
  columnRatios?: number[];
  rowHeights?: number[];
  isFitToPage?: boolean;
  pageId?: string | null;
  syncedBlockId?: string | null;
  isOriginal?: boolean;
  src?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  assetId?: string;
  buttonLabel?: string;
  buttonIcon?: string;
  buttonColor?: string;
  buttonAction?: string;
  buttonPayload?: any;
  diagramType?: string;
  code?: string;
  theme?: string;
  showRoot?: boolean;
  delimiter?: string;
  templateTitle?: string;
  templateIcon?: string;
  templateBlocks?: any[];
  databaseId?: string | null;
  viewConfigId?: string;
  view?: string;
  filters?: any[];
  sorts?: any[];
  isLinkedView?: boolean;
  cardType?: 'qa' | 'cloze';
  question?: string;
  answer?: string;
  clozeText?: string;
  ease?: number;
  interval?: number;
  nextReview?: number;
  streak?: number;
  lastGrade?: number | null;
  transclusionBlockId?: string;
  transclusionPageId?: string;
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
