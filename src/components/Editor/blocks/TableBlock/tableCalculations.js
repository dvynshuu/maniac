/**
 * ─── TableBlock: Calculation and Formula Helpers ────────────────
 */

import { getPlainText } from '../../../../utils/helpers';
import { evaluateFormula } from '../../../../core/formulaEngine';

/**
 * Convert 0-indexed column number to spreadsheet-style letters:
 * 0 -> 'A', 25 -> 'Z', 26 -> 'AA', etc.
 */
export function getColumnLetter(colIndex) {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Check if a column has numeric values across its rows.
 */
export function isColumnNumeric(cells, colIndex, hasHeader = false) {
  const startIndex = hasHeader ? 1 : 0;
  let hasNumeric = false;
  for (let r = startIndex; r < cells.length; r++) {
    const val = getPlainText(cells[r]?.[colIndex] || '').trim();
    if (!val) continue;
    const clean = val.replace(/[$,€£%]/g, '').replace(/,/g, '').trim();
    if (!isNaN(Number(clean)) && clean !== '') {
      hasNumeric = true;
    } else {
      return false; // Found non-numeric
    }
  }
  return hasNumeric;
}

/**
 * Calculate summary aggregate (sum, avg, count, min, max) for a column.
 */
export function calculateColumnSummary(values, config) {
  if (config === 'none' || !config) return '';

  if (config === 'count') {
    const nonEmpty = values.filter(v => v !== undefined && v !== null && String(v).trim() !== '');
    return nonEmpty.length;
  }

  const numbers = values
    .map(v => {
      if (v === undefined || v === null || String(v).trim() === '') return NaN;
      const clean = String(v).replace(/[$,€£%]/g, '').replace(/,/g, '').trim();
      const n = Number(clean);
      return isNaN(n) ? NaN : n;
    })
    .filter(n => !isNaN(n));

  if (numbers.length === 0) return '0';

  if (config === 'sum') {
    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    return Number.isInteger(sum) ? sum : Number(sum.toFixed(2));
  }

  if (config === 'avg') {
    const sum = numbers.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / numbers.length;
    return Number.isInteger(avg) ? avg : Number(avg.toFixed(2));
  }

  if (config === 'min') {
    const min = Math.min(...numbers);
    return Number.isInteger(min) ? min : Number(min.toFixed(2));
  }

  if (config === 'max') {
    const max = Math.max(...numbers);
    return Number.isInteger(max) ? max : Number(max.toFixed(2));
  }

  return '';
}
