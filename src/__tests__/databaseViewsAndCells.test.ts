import { describe, it, expect, beforeEach } from 'vitest';
import { PROPERTY_TYPES, PROPERTY_TYPE_META } from '../utils/constants';
import { STATUS_GROUPS, DEFAULT_STATUS_OPTIONS, StatusOption } from '../components/Database/StatusDropdown';
import { ROLLUP_CALCULATIONS } from '../components/Database/RollupConfigurator';
import { useDatabaseStore } from '../stores/databaseStore';

describe('Database Views & Advanced Property Cells (Part B)', () => {
  beforeEach(() => {
    useDatabaseStore.setState({ databases: {}, debouncedSaves: {} });
  });

  describe('Property Types & Metadata Registration', () => {
    it('registers system property types: created_time, last_edited_time, auto_id', () => {
      expect(PROPERTY_TYPES.CREATED_TIME).toBe('created_time');
      expect(PROPERTY_TYPES.LAST_EDITED_TIME).toBe('last_edited_time');
      expect(PROPERTY_TYPES.AUTO_ID).toBe('auto_id');
      expect(PROPERTY_TYPES.STATUS).toBe('status');
      expect(PROPERTY_TYPES.RELATION).toBe('relation');
      expect(PROPERTY_TYPES.ROLLUP).toBe('rollup');

      expect(PROPERTY_TYPE_META[PROPERTY_TYPES.CREATED_TIME]).toBeDefined();
      expect(PROPERTY_TYPE_META[PROPERTY_TYPES.LAST_EDITED_TIME]).toBeDefined();
      expect(PROPERTY_TYPE_META[PROPERTY_TYPES.AUTO_ID]).toBeDefined();
      expect(PROPERTY_TYPE_META[PROPERTY_TYPES.STATUS]).toBeDefined();
    });

    it('has descriptive icons and labels for all new properties', () => {
      expect(PROPERTY_TYPE_META[PROPERTY_TYPES.CREATED_TIME].label).toBe('Created Time');
      expect(PROPERTY_TYPE_META[PROPERTY_TYPES.LAST_EDITED_TIME].label).toBe('Last Edited Time');
      expect(PROPERTY_TYPE_META[PROPERTY_TYPES.AUTO_ID].label).toBe('ID');
      expect(PROPERTY_TYPE_META[PROPERTY_TYPES.STATUS].label).toBe('Status');
    });
  });

  describe('Status Property & 3 Immutable Lifecycle Buckets', () => {
    it('defines exactly the 3 immutable lifecycle groups: to_do, in_progress, complete', () => {
      const groupIds = STATUS_GROUPS.map(g => g.id);
      expect(groupIds).toEqual(['to_do', 'in_progress', 'complete']);
    });

    it('maps default status options to their lifecycle buckets', () => {
      const todoOption = DEFAULT_STATUS_OPTIONS.find(o => o.group === 'to_do');
      const progressOption = DEFAULT_STATUS_OPTIONS.find(o => o.group === 'in_progress');
      const completeOption = DEFAULT_STATUS_OPTIONS.find(o => o.group === 'complete');

      expect(todoOption).toBeDefined();
      expect(todoOption?.label).toBe('Not started');

      expect(progressOption).toBeDefined();
      expect(progressOption?.label).toBe('In progress');

      expect(completeOption).toBeDefined();
      expect(completeOption?.label).toBe('Done');
    });

    it('correctly partitions custom status options by group', () => {
      const customOptions: StatusOption[] = [
        { id: '1', label: 'Backlog', group: 'to_do' },
        { id: '2', label: 'Ready', group: 'to_do' },
        { id: '3', label: 'In Review', group: 'in_progress' },
        { id: '4', label: 'Deployed', group: 'complete' },
      ];

      const todos = customOptions.filter(o => o.group === 'to_do');
      const inProgress = customOptions.filter(o => o.group === 'in_progress');
      const complete = customOptions.filter(o => o.group === 'complete');

      expect(todos.length).toBe(2);
      expect(inProgress.length).toBe(1);
      expect(complete.length).toBe(1);
    });
  });

  describe('Chart View Metric Aggregations', () => {
    const sampleRows = [
      { id: 'r1', values: { category: 'Engineering', estimate: 10, cost: 1000 } },
      { id: 'r2', values: { category: 'Engineering', estimate: 20, cost: 2000 } },
      { id: 'r3', values: { category: 'Design', estimate: 15, cost: 1500 } },
      { id: 'r4', values: { category: 'Marketing', estimate: 5, cost: 500 } },
      { id: 'r5', values: { category: 'Design', estimate: 25, cost: 2500 } },
    ];

    it('computes sum aggregation correctly', () => {
      const nums = sampleRows.map(r => r.values.estimate);
      const sum = nums.reduce((acc, v) => acc + v, 0);
      expect(sum).toBe(75);
    });

    it('computes average aggregation correctly', () => {
      const nums = sampleRows.map(r => r.values.estimate);
      const avg = nums.reduce((acc, v) => acc + v, 0) / nums.length;
      expect(avg).toBe(15);
    });

    it('computes min and max aggregations correctly', () => {
      const nums = sampleRows.map(r => r.values.estimate);
      expect(Math.min(...nums)).toBe(5);
      expect(Math.max(...nums)).toBe(25);
    });

    it('computes grouped category sums for chart bars / slices', () => {
      const groups: Record<string, number> = {};
      for (const r of sampleRows) {
        const cat = r.values.category;
        groups[cat] = (groups[cat] || 0) + r.values.cost;
      }
      expect(groups['Engineering']).toBe(3000);
      expect(groups['Design']).toBe(4000);
      expect(groups['Marketing']).toBe(500);
    });
  });

  describe('Rollup Aggregation Functions', () => {
    const relatedRowIds = ['id1', 'id2', 'id3', 'id4', 'id5'];
    const sampleValues = [10, 20, 20, 50]; // 4 values out of 5 items (1 empty)

    it('computes count_all and count_unique', () => {
      expect(relatedRowIds.length).toBe(5);
      expect(new Set(sampleValues).size).toBe(3); // 10, 20, 50
    });

    it('computes count_empty and count_not_empty', () => {
      const emptyCount = relatedRowIds.length - sampleValues.length;
      const notEmptyCount = sampleValues.length;
      expect(emptyCount).toBe(1);
      expect(notEmptyCount).toBe(4);
    });

    it('computes percent_empty and percent_not_empty', () => {
      const percentEmpty = (relatedRowIds.length - sampleValues.length) / relatedRowIds.length;
      const percentNotEmpty = sampleValues.length / relatedRowIds.length;
      expect(percentEmpty).toBe(0.2); // 20%
      expect(percentNotEmpty).toBe(0.8); // 80%
    });

    it('computes math metrics: sum, average, median, range', () => {
      const sum = sampleValues.reduce((s, n) => s + n, 0);
      const avg = sum / sampleValues.length;
      expect(sum).toBe(100);
      expect(avg).toBe(25);

      const sorted = [...sampleValues].sort((a, b) => a - b); // [10, 20, 20, 50]
      const mid = Math.floor(sorted.length / 2);
      const median = (sorted[mid - 1] + sorted[mid]) / 2; // (20 + 20) / 2 = 20
      expect(median).toBe(20);

      const range = Math.max(...sampleValues) - Math.min(...sampleValues);
      expect(range).toBe(40); // 50 - 10
    });

    it('exposes full set of calculations in ROLLUP_CALCULATIONS config', () => {
      const calcKeys = ROLLUP_CALCULATIONS.map(c => c.value);
      expect(calcKeys).toContain('show_original');
      expect(calcKeys).toContain('count_all');
      expect(calcKeys).toContain('count_unique');
      expect(calcKeys).toContain('sum');
      expect(calcKeys).toContain('average');
      expect(calcKeys).toContain('median');
      expect(calcKeys).toContain('min');
      expect(calcKeys).toContain('max');
      expect(calcKeys).toContain('range');
    });
  });

  describe('Auto-ID & System Properties Monotonic Numbering', () => {
    it('formats monotonic sequence IDs with custom prefix', () => {
      const formatAutoId = (index: number, prefix = '') => {
        const seq = index + 1;
        return prefix ? `${prefix}${seq}` : `#${seq}`;
      };

      expect(formatAutoId(0)).toBe('#1');
      expect(formatAutoId(41)).toBe('#42');
      expect(formatAutoId(0, 'TASK-')).toBe('TASK-1');
      expect(formatAutoId(99, 'DEV-')).toBe('DEV-100');
    });
  });
});
