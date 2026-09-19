/**
 * Robust CSV and Database Schema Parser
 * 
 * Handles quoted fields, line breaks inside cells, comma separators,
 * schema type inference, and value coercion.
 */

import { normalizePropertyName } from '../normalization/pathNormalizer.js';

/**
 * Parses raw CSV text into a 2D array of string cells.
 * Correctly handles RFC 4180 rules (quotes, escaped quotes "", multiline cells).
 * 
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsvRows(text) {
  if (!text || typeof text !== 'string') return [];

  // Strip UTF-8 BOM and normalize newlines to LF
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const rows = [];
  let current = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    if (inQuotes) {
      if (ch === '"' && cleanText[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        current.push(cell);
        cell = '';
      } else if (ch === '\n') {
        current.push(cell);
        cell = '';
        if (current.length > 0 && current.some(c => c.trim())) {
          rows.push(current);
        }
        current = [];
      } else {
        cell += ch;
      }
    }
  }

  // Handle final cell
  if (cell || current.length > 0) {
    current.push(cell);
    if (current.some(c => c.trim())) {
      rows.push(current);
    }
  }

  return rows;
}

/**
 * Infers Maniac property type from sample column values and header name.
 * @param {string[]} values - Non-empty string values from column
 * @param {string} headerName
 * @returns {'checkbox'|'number'|'date'|'url'|'email'|'phone'|'select'|'multi_select'|'text'}
 */
export function inferColumnType(values, headerName = '') {
  const headerNorm = normalizePropertyName(headerName);

  // Name-based hints
  if (headerNorm.includes('date') || headerNorm.includes('time') || headerNorm.includes('deadline')) {
    return 'date';
  }
  if (headerNorm.includes('email')) return 'email';
  if (headerNorm.includes('url') || headerNorm.includes('link') || headerNorm.includes('website')) return 'url';
  if (headerNorm.includes('phone')) return 'phone';
  if (headerNorm.includes('status')) return 'status';

  if (!values || values.length === 0) return 'text';

  const sample = values.slice(0, 50);

  // Checkbox
  if (sample.every(v => /^(true|false|yes|no|✓|✗|☑|☐)$/i.test(v))) {
    return 'checkbox';
  }

  // Number
  if (sample.every(v => !isNaN(Number(v)) && v.trim() !== '')) {
    return 'number';
  }

  // Date (ISO strings or common date formats)
  const isDate = sample.every(v => {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return true;
    const parsed = Date.parse(v);
    return !isNaN(parsed) && parsed > 0 && v.length >= 8;
  });
  if (isDate) return 'date';

  // URL
  if (sample.every(v => /^https?:\/\//i.test(v))) {
    return 'url';
  }

  // Email
  if (sample.every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
    return 'email';
  }

  // Multi-select vs Select
  const hasCommaSeparated = sample.some(v => v.includes(',') && v.split(',').length > 1);
  const uniqueCount = new Set(values).size;

  if (hasCommaSeparated) {
    return 'multi_select';
  }

  // If low cardinality categorical values
  if (uniqueCount <= Math.max(8, values.length * 0.35) && values.length > 2) {
    return 'select';
  }

  return 'text';
}

/**
 * Coerces raw string value into typed database cell value
 * @param {string} rawValue
 * @param {string} type
 * @returns {any}
 */
export function coerceValue(rawValue, type) {
  if (rawValue === undefined || rawValue === null) return '';
  const val = String(rawValue).trim();
  if (!val) return '';

  switch (type) {
    case 'checkbox':
      return /^(true|yes|✓|☑|1)$/i.test(val);
    case 'number': {
      const num = Number(val);
      return isNaN(num) ? val : num;
    }
    case 'date': {
      const parsed = Date.parse(val);
      return !isNaN(parsed) ? parsed : val;
    }
    case 'multi_select':
      return val.split(',').map(s => s.trim()).filter(Boolean);
    default:
      return val;
  }
}

/**
 * Parses full CSV text into headers, inferred schema, and coerced data rows.
 * @param {string} csvText
 * @param {string} [databaseId='']
 * @returns {{ headers: string[], schema: any[], rows: Record<string, any>[] }}
 */
export function parseCsvFile(csvText, databaseId = '') {
  const allRows = parseCsvRows(csvText);
  if (allRows.length === 0) {
    return { headers: [], schema: [], rows: [] };
  }

  const headers = allRows[0].map(h => h.trim());
  const rawDataRows = allRows.slice(1);

  const SELECT_COLORS = [
    'default', 'blue', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal'
  ];

  // Infer schema columns
  const schema = headers.map((header, colIdx) => {
    const colValues = rawDataRows.map(r => (r[colIdx] || '').trim()).filter(Boolean);
    // In Notion, the primary title column (first column) is always of type 'text'
    const type = colIdx === 0 ? 'text' : inferColumnType(colValues, header);
    const colId = `prop_${colIdx}_${normalizePropertyName(header) || 'col'}`;

    const config = {};
    if (type === 'select' || type === 'multi_select' || type === 'status') {
      const allVals = type === 'multi_select'
        ? [...new Set(colValues.flatMap(v => v.split(',').map(s => s.trim())).filter(Boolean))]
        : [...new Set(colValues)];

      config.options = allVals.map((optVal, optIdx) => ({
        id: `opt_${optIdx}_${normalizePropertyName(optVal)}`,
        label: optVal,
        color: SELECT_COLORS[optIdx % SELECT_COLORS.length],
      }));
    }

    return {
      id: colId,
      name: header || `Column ${colIdx + 1}`,
      type,
      width: 180,
      config,
    };
  });

  // Coerce row data
  const rows = rawDataRows.map((rawRow, rowIdx) => {
    const rowRecord = {};
    schema.forEach((prop, colIdx) => {
      const rawCell = (rawRow[colIdx] || '').trim();
      let value = coerceValue(rawCell, prop.type);

      // Map options to option IDs if select/multi_select
      if (prop.type === 'select' && value && prop.config?.options) {
        const opt = prop.config.options.find(o => o.label.toLowerCase() === String(value).toLowerCase());
        if (opt) value = opt.id;
      } else if (prop.type === 'multi_select' && Array.isArray(value) && prop.config?.options) {
        value = value.map(v => {
          const opt = prop.config.options.find(o => o.label.toLowerCase() === String(v).toLowerCase());
          return opt ? opt.id : v;
        });
      }

      rowRecord[prop.id] = value;
    });

    return rowRecord;
  });

  return { headers, schema, rows };
}
