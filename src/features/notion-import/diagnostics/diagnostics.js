/**
 * Import Diagnostics and Reporting System
 * 
 * Captures, groups, and summarizes warnings, errors, and informational events
 * across all phases of the Notion import pipeline without halting execution.
 */

export const DIAGNOSTIC_CODES = {
  // Parsing
  MALFORMED_HTML: 'MALFORMED_HTML',
  UNINDEXED_FILE: 'UNINDEXED_FILE',
  UNRECOGNIZED_FORMAT: 'UNRECOGNIZED_FORMAT',
  EMPTY_CSV: 'EMPTY_CSV',

  // Hierarchy & Mapping
  UNRESOLVED_PARENT: 'UNRESOLVED_PARENT',
  HIERARCHY_CYCLE: 'HIERARCHY_CYCLE',
  DUPLICATE_ID: 'DUPLICATE_ID',

  // Databases & Rows
  MISSING_DATABASE_DATA: 'MISSING_DATABASE_DATA',
  DUPLICATE_DATABASE: 'DUPLICATE_DATABASE',
  COMPANION_CSV_MERGED: 'COMPANION_CSV_MERGED',
  UNMATCHED_ROW: 'UNMATCHED_ROW',
  AMBIGUOUS_ROW_MATCH: 'AMBIGUOUS_ROW_MATCH',
  UNKNOWN_PROPERTY_TYPE: 'UNKNOWN_PROPERTY_TYPE',

  // Assets
  UNRESOLVED_ASSET: 'UNRESOLVED_ASSET',
  CORRUPT_ASSET: 'CORRUPT_ASSET',

  // Persistence
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
};

/**
 * Creates a diagnostics collector instance
 */
export function createDiagnostics() {
  const records = [];

  const collector = {
    /**
     * Records a diagnostic message
     * @param {'info' | 'warning' | 'error'} severity
     * @param {string} code
     * @param {string} message
     * @param {Record<string, any>} [context]
     */
    add(severity, code, message, context = {}) {
      const normalizedSeverity = severity === 'warn' ? 'warning' : severity;
      const record = {
        severity: normalizedSeverity,
        level: normalizedSeverity === 'warning' ? 'warn' : normalizedSeverity,
        code,
        message,
        context,
        details: context,
        timestamp: Date.now(),
      };
      records.push(record);
      return record;
    },

    info(code, message, context) {
      return this.add('info', code, message, context);
    },

    warn(code, message, context) {
      return this.add('warning', code, message, context);
    },

    error(code, message, context) {
      return this.add('error', code, message, context);
    },

    getAll() {
      return [...records];
    },

    getEntries() {
      return [...records];
    },

    getWarnings() {
      return records.filter(r => r.severity === 'warning');
    },

    getErrors() {
      return records.filter(r => r.severity === 'error');
    },

    hasErrors() {
      return records.some(r => r.severity === 'error');
    },

    summary() {
      const counts = { info: 0, warning: 0, error: 0, infos: 0, warnings: 0, errors: 0, total: records.length };
      for (const r of records) {
        if (r.severity === 'info') {
          counts.info++;
          counts.infos++;
        } else if (r.severity === 'warning') {
          counts.warning++;
          counts.warnings++;
        } else if (r.severity === 'error') {
          counts.error++;
          counts.errors++;
        }
      }
      return counts;
    },

    getSummary() {
      return this.summary();
    },

    formatReport() {
      const s = this.summary();
      const lines = [
        '========================================',
        '       NOTION IMPORT DIAGNOSTICS        ',
        '========================================',
        `Generated: ${new Date().toISOString()}`,
        `Total Events: ${s.total}`,
        `Errors:       ${s.errors}`,
        `Warnings:     ${s.warnings}`,
        `Infos:        ${s.infos}`,
        '----------------------------------------',
        '',
      ];

      if (records.length === 0) {
        lines.push('No warnings or errors recorded.');
      } else {
        for (const r of records) {
          const time = new Date(r.timestamp).toLocaleTimeString();
          lines.push(`[${time}] [${r.severity.toUpperCase()}] [${r.code}]`);
          lines.push(`  Message: ${r.message}`);
          if (r.context && Object.keys(r.context).length > 0) {
            lines.push(`  Context: ${JSON.stringify(r.context)}`);
          }
          lines.push('');
        }
      }

      return lines.join('\n');
    },
  };

  return collector;
}
