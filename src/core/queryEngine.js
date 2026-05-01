/**
 * ─── Query Engine ───────────────────────────────────────────────
 * Shared filter/sort/group logic for all database views.
 * Extracted from DatabaseBlock.jsx for reuse across
 * Table, Board, Calendar, Timeline, and Gallery views.
 */

/**
 * Apply filters to rows.
 * @param {Array} rows - Database rows
 * @param {Array} filters - [{ propertyId, operator, value }]
 * @param {Array} schema - Property definitions
 * @returns {Array} Filtered rows
 */
export function applyFilters(rows, filters, schema) {
  if (!filters || filters.length === 0) return rows;

  let result = [...rows];
  for (const f of filters) {
    if (!f.propertyId) continue;

    const prop = schema.find(p => p.id === f.propertyId);

    result = result.filter(row => {
      const rawVal = row.values[f.propertyId];
      const val = String(rawVal ?? '').toLowerCase();

      switch (f.operator) {
        case 'contains':
          return val.includes((f.value || '').toLowerCase());
        case 'not_contains':
          return !val.includes((f.value || '').toLowerCase());
        case 'equals':
          return val === (f.value || '').toLowerCase();
        case 'not_equals':
          return val !== (f.value || '').toLowerCase();
        case 'not_empty':
          return val.length > 0;
        case 'empty':
          return val.length === 0;
        case 'greater_than':
          return prop?.type === 'number' ? Number(rawVal) > Number(f.value) : false;
        case 'less_than':
          return prop?.type === 'number' ? Number(rawVal) < Number(f.value) : false;
        case 'date_before':
          return prop?.type === 'date' && rawVal ? new Date(rawVal) < new Date(f.value) : false;
        case 'date_after':
          return prop?.type === 'date' && rawVal ? new Date(rawVal) > new Date(f.value) : false;
        case 'is_checked':
          return rawVal === true;
        case 'is_unchecked':
          return rawVal !== true;
        default:
          return true;
      }
    });
  }

  return result;
}

/**
 * Apply sorts to rows.
 * @param {Array} rows - Database rows
 * @param {Array} sorts - [{ propertyId, direction: 'asc'|'desc' }]
 * @param {Array} schema - Property definitions
 * @returns {Array} Sorted rows
 */
export function applySorts(rows, sorts, schema) {
  if (!sorts || sorts.length === 0) return rows;

  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const s of sorts) {
      if (!s.propertyId) continue;
      const prop = schema.find(p => p.id === s.propertyId);
      const aVal = a.values[s.propertyId];
      const bVal = b.values[s.propertyId];

      let cmp = 0;
      if (prop?.type === 'number') {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      } else if (prop?.type === 'date') {
        cmp = (new Date(aVal || 0)).getTime() - (new Date(bVal || 0)).getTime();
      } else if (prop?.type === 'checkbox') {
        cmp = (aVal === true ? 1 : 0) - (bVal === true ? 1 : 0);
      } else {
        cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true });
      }

      if (cmp !== 0) return s.direction === 'desc' ? -cmp : cmp;
    }
    return 0;
  });

  return sorted;
}

/**
 * Group rows by a property value.
 * @param {Array} rows - Database rows
 * @param {string} propertyId - Property to group by
 * @param {Array} schema - Property definitions
 * @returns {Map<string, Array>} Grouped rows
 */
export function applyGroupBy(rows, propertyId, schema) {
  if (!propertyId) return new Map([['All', rows]]);

  const prop = schema.find(p => p.id === propertyId);
  const groups = new Map();

  // For select properties, pre-populate with configured options
  if (prop?.type === 'select' && prop.config?.options) {
    for (const opt of prop.config.options) {
      groups.set(opt.name || opt.value || opt, []);
    }
    groups.set('No Value', []);
  }

  for (const row of rows) {
    const val = row.values[propertyId];
    const key = val !== undefined && val !== null && val !== '' ? String(val) : 'No Value';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return groups;
}
