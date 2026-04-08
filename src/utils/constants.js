export const BLOCK_TYPES = {
  TEXT: 'text',
  HEADING1: 'heading1',
  HEADING2: 'heading2',
  HEADING3: 'heading3',
  TODO: 'todo',
  BULLET: 'bullet',
  NUMBERED: 'numbered',
  QUOTE: 'quote',
  CALLOUT: 'callout',
  DIVIDER: 'divider',
  CODE: 'code',
  IMAGE: 'image',
  TRACKER: 'tracker',
  TABLE: 'table',
};

export const BLOCK_TYPE_META = {
  [BLOCK_TYPES.TEXT]: { label: 'Text', icon: 'Type', description: 'Plain text block' },
  [BLOCK_TYPES.HEADING1]: { label: 'Heading 1', icon: 'Heading1', description: 'Large heading' },
  [BLOCK_TYPES.HEADING2]: { label: 'Heading 2', icon: 'Heading2', description: 'Medium heading' },
  [BLOCK_TYPES.HEADING3]: { label: 'Heading 3', icon: 'Heading3', description: 'Small heading' },
  [BLOCK_TYPES.TODO]: { label: 'To-do', icon: 'CheckSquare', description: 'Checkbox item' },
  [BLOCK_TYPES.BULLET]: { label: 'Bullet List', icon: 'List', description: 'Unordered list item' },
  [BLOCK_TYPES.NUMBERED]: { label: 'Numbered List', icon: 'ListOrdered', description: 'Ordered list item' },
  [BLOCK_TYPES.QUOTE]: { label: 'Quote', icon: 'Quote', description: 'Block quote' },
  [BLOCK_TYPES.CALLOUT]: { label: 'Callout', icon: 'AlertCircle', description: 'Highlighted callout' },
  [BLOCK_TYPES.DIVIDER]: { label: 'Divider', icon: 'Minus', description: 'Horizontal rule' },
  [BLOCK_TYPES.CODE]: { label: 'Code', icon: 'Code', description: 'Code snippet' },
  [BLOCK_TYPES.IMAGE]: { label: 'Image', icon: 'Image', description: 'Upload an image' },
  [BLOCK_TYPES.TRACKER]: { label: 'Tracker', icon: 'Database', description: 'Custom data tracker' },
  [BLOCK_TYPES.TABLE]: { label: 'Table', icon: 'Table', description: 'Standard data table' },
};

export const TRACKER_FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  DATE: 'date',
  BOOLEAN: 'boolean',
};

export const TRACKER_FIELD_TYPE_META = {
  [TRACKER_FIELD_TYPES.TEXT]: { label: 'Text', icon: 'Type' },
  [TRACKER_FIELD_TYPES.NUMBER]: { label: 'Number', icon: 'Hash' },
  [TRACKER_FIELD_TYPES.SELECT]: { label: 'Select', icon: 'Tag' },
  [TRACKER_FIELD_TYPES.DATE]: { label: 'Date', icon: 'Calendar' },
  [TRACKER_FIELD_TYPES.BOOLEAN]: { label: 'Boolean', icon: 'ToggleLeft' },
};

export const EMOJIS = [
  '📝', '🧠', '🚀', '💡', '🎯', '📊', '💻', '🔥', '⚡', '🌟',
  '📚', '✨', '🎨', '🔧', '📌', '🗂️', '💰', '❤️', '🏠', '🎵',
  '🌍', '🏋️', '🍎', '😊', '🧘', '📅', '🔑', '🎓', '🌱', '🏆',
  '🤖', '📱', '🖥️', '⏰', '📸', '🎮', '☕', '🍕', '🛠️', '💎',
];

export const SELECT_COLORS = [
  { name: 'gray', bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.7)' },
  { name: 'blue', bg: 'rgba(96,165,250,0.15)', text: '#60a5fa' },
  { name: 'purple', bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
  { name: 'pink', bg: 'rgba(244,114,182,0.15)', text: '#f472b6' },
  { name: 'red', bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
  { name: 'orange', bg: 'rgba(251,146,60,0.15)', text: '#fb923c' },
  { name: 'yellow', bg: 'rgba(250,204,21,0.15)', text: '#facc15' },
  { name: 'green', bg: 'rgba(74,222,128,0.15)', text: '#4ade80' },
  { name: 'teal', bg: 'rgba(45,212,191,0.15)', text: '#2dd4bf' },
];
