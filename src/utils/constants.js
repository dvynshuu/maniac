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
  EMBED: 'embed',
  TRACKER: 'tracker',
  TABLE: 'table',
  DATABASE: 'database',
  TOGGLE: 'toggle',
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
  [BLOCK_TYPES.EMBED]: { label: 'Embed', icon: 'ExternalLink', description: 'Embed a URL' },
  [BLOCK_TYPES.TRACKER]: { label: 'Tracker', icon: 'Database', description: 'Custom data tracker' },
  [BLOCK_TYPES.TABLE]: { label: 'Table', icon: 'Table', description: 'Standard data table' },
  [BLOCK_TYPES.DATABASE]: { label: 'Database', icon: 'Database', description: 'Dynamic database table' },
  [BLOCK_TYPES.TOGGLE]: { label: 'Toggle', icon: 'ChevronRight', description: 'Collapsible content' },
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
};

export const PROPERTY_TYPE_META = {
  [PROPERTY_TYPES.TEXT]:         { label: 'Text',         icon: 'Type',       description: 'Plain text' },
  [PROPERTY_TYPES.NUMBER]:       { label: 'Number',       icon: 'Hash',       description: 'Numeric value' },
  [PROPERTY_TYPES.SELECT]:       { label: 'Select',       icon: 'Tag',        description: 'Single option' },
  [PROPERTY_TYPES.MULTI_SELECT]: { label: 'Multi-Select', icon: 'Tags',       description: 'Multiple options' },
  [PROPERTY_TYPES.DATE]:         { label: 'Date',         icon: 'Calendar',   description: 'Date value' },
  [PROPERTY_TYPES.CHECKBOX]:     { label: 'Checkbox',     icon: 'CheckSquare',description: 'True or false' },
  [PROPERTY_TYPES.URL]:          { label: 'URL',          icon: 'Link',       description: 'Web link' },
  [PROPERTY_TYPES.EMAIL]:        { label: 'Mail',         icon: 'Mail',       description: 'Email address' },
  [PROPERTY_TYPES.PHONE]:        { label: 'Phone',        icon: 'Phone',      description: 'Phone number' },
  [PROPERTY_TYPES.CREATED_AT]:   { label: 'Created',      icon: 'Clock',      description: 'Auto timestamp' },
};

export const PROPERTY_COLORS = [
  { name: 'default', bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.7)' },
  { name: 'blue',    bg: 'rgba(96,165,250,0.18)',  text: '#60a5fa' },
  { name: 'purple',  bg: 'rgba(167,139,250,0.18)', text: '#a78bfa' },
  { name: 'pink',    bg: 'rgba(244,114,182,0.18)', text: '#f472b6' },
  { name: 'red',     bg: 'rgba(248,113,113,0.18)', text: '#f87171' },
  { name: 'orange',  bg: 'rgba(251,146,60,0.18)',  text: '#fb923c' },
  { name: 'yellow',  bg: 'rgba(250,204,21,0.18)',  text: '#facc15' },
  { name: 'green',   bg: 'rgba(74,222,128,0.18)',  text: '#4ade80' },
  { name: 'teal',    bg: 'rgba(45,212,191,0.18)',  text: '#2dd4bf' },
];
