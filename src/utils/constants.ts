export const BLOCK_TYPES = {
  TEXT: 'text',
  HEADING1: 'heading1',
  HEADING2: 'heading2',
  HEADING3: 'heading3',
  TOGGLE_HEADING1: 'toggle_heading1',
  TOGGLE_HEADING2: 'toggle_heading2',
  TOGGLE_HEADING3: 'toggle_heading3',
  TODO: 'todo',
  BULLET: 'bullet',
  NUMBERED: 'numbered',
  QUOTE: 'quote',
  CALLOUT: 'callout',
  DIVIDER: 'divider',
  CODE: 'code',
  IMAGE: 'image',
  EMBED: 'embed',
  BOOKMARK: 'bookmark',
  TABLE_OF_CONTENTS: 'table_of_contents',
  TRACKER: 'tracker',
  COUNTDOWN: 'countdown',
  POMODORO: 'pomodoro',
  PROGRESS_BAR: 'progress_bar',
  WIDGET: 'widget',
  TABLE: 'table',
  DATABASE: 'database',
  TOGGLE: 'toggle',
  SYNCED_REFERENCE: 'synced_reference',
  SYNCED_BLOCK: 'synced_block',
  COLUMN_LIST: 'column_list',
  COLUMN: 'column',
  MATH: 'math',
  PAGE: 'page',
  FILE: 'file',
  AUDIO: 'audio',
  VIDEO: 'video',
  PDF: 'pdf',
  BUTTON: 'button',
  DIAGRAM: 'diagram',
  BREADCRUMB: 'breadcrumb',
  TEMPLATE: 'template',
  LINKED_DATABASE: 'linked_database',
  FLASHCARD: 'flashcard',
} as const;

export type BlockTypeConstant = typeof BLOCK_TYPES[keyof typeof BLOCK_TYPES];

export interface BlockMeta {
  label: string;
  icon: string;
  description: string;
}

export const BLOCK_TYPE_META: Record<string, BlockMeta> = {
  [BLOCK_TYPES.TEXT]: { label: 'Text', icon: 'Type', description: 'Plain text block' },
  [BLOCK_TYPES.MATH]: { label: 'Math Equation', icon: 'Sigma', description: 'TeX mathematical formula' },
  [BLOCK_TYPES.HEADING1]: { label: 'Heading 1', icon: 'Heading1', description: 'Large heading' },
  [BLOCK_TYPES.HEADING2]: { label: 'Heading 2', icon: 'Heading2', description: 'Medium heading' },
  [BLOCK_TYPES.HEADING3]: { label: 'Heading 3', icon: 'Heading3', description: 'Small heading' },
  [BLOCK_TYPES.TOGGLE_HEADING1]: { label: 'Toggle Heading 1', icon: 'Heading1', description: 'Large heading with collapsible content' },
  [BLOCK_TYPES.TOGGLE_HEADING2]: { label: 'Toggle Heading 2', icon: 'Heading2', description: 'Medium heading with collapsible content' },
  [BLOCK_TYPES.TOGGLE_HEADING3]: { label: 'Toggle Heading 3', icon: 'Heading3', description: 'Small heading with collapsible content' },
  [BLOCK_TYPES.TODO]: { label: 'To-do', icon: 'CheckSquare', description: 'Checkbox item' },
  [BLOCK_TYPES.BULLET]: { label: 'Bullet List', icon: 'List', description: 'Unordered list item' },
  [BLOCK_TYPES.NUMBERED]: { label: 'Numbered List', icon: 'ListOrdered', description: 'Ordered list item' },
  [BLOCK_TYPES.QUOTE]: { label: 'Quote', icon: 'Quote', description: 'Block quote' },
  [BLOCK_TYPES.CALLOUT]: { label: 'Callout', icon: 'AlertCircle', description: 'Highlighted callout' },
  [BLOCK_TYPES.DIVIDER]: { label: 'Divider', icon: 'Minus', description: 'Horizontal rule' },
  [BLOCK_TYPES.CODE]: { label: 'Code', icon: 'Code', description: 'Code snippet' },
  [BLOCK_TYPES.IMAGE]: { label: 'Image', icon: 'Image', description: 'Upload an image' },
  [BLOCK_TYPES.EMBED]: { label: 'Embed', icon: 'ExternalLink', description: 'Embed a URL' },
  [BLOCK_TYPES.BOOKMARK]: { label: 'Web Bookmark', icon: 'Bookmark', description: 'Visual link preview card' },
  [BLOCK_TYPES.TABLE_OF_CONTENTS]: { label: 'Table of Contents', icon: 'ListTree', description: 'Live outline of all headings on page' },
  [BLOCK_TYPES.COUNTDOWN]: { label: 'Countdown', icon: 'Calendar', description: 'Countdown timer widget' },
  [BLOCK_TYPES.POMODORO]: { label: 'Pomodoro', icon: 'Clock', description: 'Pomodoro focus timer' },
  [BLOCK_TYPES.PROGRESS_BAR]: { label: 'Progress Tracker', icon: 'Target', description: 'Goal progress bar' },
  [BLOCK_TYPES.WIDGET]: { label: 'Widget', icon: 'Sliders', description: 'Insert an interactive widget' },
  [BLOCK_TYPES.TRACKER]: { label: 'Tracker', icon: 'Database', description: 'Custom data tracker' },
  [BLOCK_TYPES.TABLE]: { label: 'Table', icon: 'Table', description: 'Standard data table' },
  [BLOCK_TYPES.DATABASE]: { label: 'Database / Board', icon: 'Layout', description: 'Dynamic database with Board, Habit Tracker, Table, Calendar' },
  [BLOCK_TYPES.TOGGLE]: { label: 'Toggle', icon: 'ChevronRight', description: 'Collapsible content' },
  [BLOCK_TYPES.SYNCED_REFERENCE]: { label: 'Synced Block', icon: 'RefreshCw', description: 'Reference to another block' },
  [BLOCK_TYPES.SYNCED_BLOCK]: { label: 'Synced Container', icon: 'RefreshCw', description: 'Live synchronized container across pages' },
  [BLOCK_TYPES.COLUMN_LIST]: { label: 'Columns', icon: 'Columns', description: 'Side-by-side columns' },
  [BLOCK_TYPES.COLUMN]: { label: 'Column', icon: 'Columns', description: 'Vertical column container' },
  [BLOCK_TYPES.PAGE]: { label: 'Page', icon: 'FileText', description: 'Embed a sub-page in this page' },
  [BLOCK_TYPES.FILE]: { label: 'File', icon: 'Paperclip', description: 'Upload or embed any file attachment' },
  [BLOCK_TYPES.AUDIO]: { label: 'Audio', icon: 'Music', description: 'Play an audio recording or podcast' },
  [BLOCK_TYPES.VIDEO]: { label: 'Video', icon: 'Video', description: 'Embed or upload a playable video' },
  [BLOCK_TYPES.PDF]: { label: 'PDF Document', icon: 'FileCode', description: 'Inline scrollable PDF reader' },
  [BLOCK_TYPES.BUTTON]: { label: 'Button', icon: 'PlayCircle', description: 'One-click automation & block insertion' },
  [BLOCK_TYPES.DIAGRAM]: { label: 'Mermaid Diagram', icon: 'GitFork', description: 'Mermaid code-to-diagram visualization' },
  [BLOCK_TYPES.BREADCRUMB]: { label: 'Breadcrumb', icon: 'ChevronRight', description: 'Inline page hierarchy navigation trail' },
  [BLOCK_TYPES.TEMPLATE]: { label: 'Template Button', icon: 'CopyPlus', description: 'Inline repeatable group of blocks' },
  [BLOCK_TYPES.LINKED_DATABASE]: { label: 'Linked View of Database', icon: 'ExternalLink', description: 'Display an existing database with custom view & filters' },
  [BLOCK_TYPES.FLASHCARD]: { label: 'Flashcard', icon: 'Brain', description: 'Active recall flashcard with Cloze & Q/A spaced repetition' },
};

export const TRACKER_FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  DATE: 'date',
  BOOLEAN: 'boolean',
} as const;

export const TRACKER_FIELD_TYPE_META: Record<string, { label: string; icon: string }> = {
  [TRACKER_FIELD_TYPES.TEXT]: { label: 'Text', icon: 'Type' },
  [TRACKER_FIELD_TYPES.NUMBER]: { label: 'Number', icon: 'Hash' },
  [TRACKER_FIELD_TYPES.SELECT]: { label: 'Select', icon: 'Tag' },
  [TRACKER_FIELD_TYPES.DATE]: { label: 'Date', icon: 'Calendar' },
  [TRACKER_FIELD_TYPES.BOOLEAN]: { label: 'Boolean', icon: 'ToggleLeft' },
};

export const EMOJIS: string[] = [
  '📝', '🧠', '🚀', '💡', '🎯', '📊', '💻', '🔥', '⚡', '🌟',
  '📚', '✨', '🎨', '🔧', '📌', '🗂️', '💰', '❤️', '🏠', '🎵',
  '🌍', '🏋️', '🍎', '😊', '🧘', '📅', '🔑', '🎓', '🌱', '🏆',
  '🤖', '📱', '🖥️', '⏰', '📸', '🎮', '☕', '🍕', '🛠️', '💎',
];

export interface ColorOption {
  name: string;
  bg: string;
  text: string;
}

export const SELECT_COLORS: ColorOption[] = [
  { name: 'gray',   bg: 'var(--color-surface-2)', text: 'var(--color-fg-secondary)' },
  { name: 'blue',   bg: 'var(--color-surface-3)', text: 'var(--color-fg)' },
  { name: 'purple', bg: 'var(--color-surface-4)', text: 'var(--color-fg)' },
  { name: 'pink',   bg: 'var(--color-surface-2)', text: 'var(--color-fg)' },
  { name: 'red',    bg: 'var(--color-surface-3)', text: 'var(--color-fg)' },
  { name: 'orange', bg: 'var(--color-surface-4)', text: 'var(--color-fg)' },
  { name: 'yellow', bg: 'var(--color-surface-2)', text: 'var(--color-fg-secondary)' },
  { name: 'green',  bg: 'var(--color-surface-3)', text: 'var(--color-fg)' },
  { name: 'teal',   bg: 'var(--color-surface-4)', text: 'var(--color-fg)' },
];

// ---- Database Property Types ----

export const PROPERTY_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  URL: 'url',
  EMAIL: 'email',
  PHONE: 'phone',
  CREATED_AT: 'created_at',
  CREATED_TIME: 'created_time',
  LAST_EDITED_TIME: 'last_edited_time',
  AUTO_ID: 'auto_id',
  RELATION: 'relation',
  ROLLUP: 'rollup',
  FORMULA: 'formula',
  STATUS: 'status',
} as const;

export const PROPERTY_TYPE_META: Record<string, BlockMeta> = {
  [PROPERTY_TYPES.TEXT]:             { label: 'Text',             icon: 'Type',        description: 'Plain text' },
  [PROPERTY_TYPES.NUMBER]:           { label: 'Number',           icon: 'Hash',        description: 'Numeric value' },
  [PROPERTY_TYPES.SELECT]:           { label: 'Select',           icon: 'Tag',         description: 'Single option' },
  [PROPERTY_TYPES.MULTI_SELECT]:     { label: 'Multi-Select',     icon: 'Tags',        description: 'Multiple options' },
  [PROPERTY_TYPES.DATE]:             { label: 'Date',             icon: 'Calendar',    description: 'Date value' },
  [PROPERTY_TYPES.CHECKBOX]:         { label: 'Checkbox',         icon: 'CheckSquare', description: 'True or false' },
  [PROPERTY_TYPES.URL]:              { label: 'URL',              icon: 'Link',        description: 'Web link' },
  [PROPERTY_TYPES.EMAIL]:            { label: 'Mail',             icon: 'Mail',        description: 'Email address' },
  [PROPERTY_TYPES.PHONE]:            { label: 'Phone',            icon: 'Phone',       description: 'Phone number' },
  [PROPERTY_TYPES.CREATED_AT]:       { label: 'Created Time',     icon: 'Clock',       description: 'Timestamp when created' },
  [PROPERTY_TYPES.CREATED_TIME]:     { label: 'Created Time',     icon: 'Clock',       description: 'Timestamp when created' },
  [PROPERTY_TYPES.LAST_EDITED_TIME]: { label: 'Last Edited Time', icon: 'Clock',       description: 'Timestamp when modified' },
  [PROPERTY_TYPES.AUTO_ID]:          { label: 'ID',               icon: 'Hash',        description: 'Sequential identifier' },
  [PROPERTY_TYPES.RELATION]:         { label: 'Relation',         icon: 'Database',    description: 'Link another database' },
  [PROPERTY_TYPES.ROLLUP]:           { label: 'Rollup',           icon: 'Sigma',       description: 'Aggregate linked values' },
  [PROPERTY_TYPES.FORMULA]:          { label: 'Formula',          icon: 'Calculator',  description: 'Calculate values' },
  [PROPERTY_TYPES.STATUS]:           { label: 'Status',           icon: 'CircleDot',   description: 'Track progress' },
};

export const PROPERTY_COLORS: ColorOption[] = [
  { name: 'default', bg: 'var(--color-surface-2)', text: 'var(--color-fg-secondary)' },
  { name: 'blue',    bg: 'var(--color-surface-3)', text: 'var(--color-fg)' },
  { name: 'purple',  bg: 'var(--color-surface-4)', text: 'var(--color-fg)' },
  { name: 'pink',    bg: 'var(--color-surface-2)', text: 'var(--color-fg)' },
  { name: 'red',     bg: 'var(--color-surface-3)', text: 'var(--color-fg)' },
  { name: 'orange',  bg: 'var(--color-surface-4)', text: 'var(--color-fg)' },
  { name: 'yellow',  bg: 'var(--color-surface-2)', text: 'var(--color-fg-secondary)' },
  { name: 'green',   bg: 'var(--color-surface-3)', text: 'var(--color-fg)' },
  { name: 'teal',    bg: 'var(--color-surface-4)', text: 'var(--color-fg)' },
];
