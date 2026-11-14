import React, { useState, useEffect, useMemo } from 'react';
import { Sigma, ArrowRight, Check, X, Sliders, Hash, Percent } from 'lucide-react';
import { useDatabaseStore } from '../../stores/databaseStore';
import { db } from '../../db/database';
import { PROPERTY_TYPES } from '../../utils/constants';

export const ROLLUP_CALCULATIONS = [
  { value: 'show_original', label: 'Show original' },
  { value: 'count_all', label: 'Count all' },
  { value: 'count_unique', label: 'Count unique values' },
  { value: 'count_empty', label: 'Count empty' },
  { value: 'count_not_empty', label: 'Count not empty' },
  { value: 'percent_empty', label: 'Percent empty' },
  { value: 'percent_not_empty', label: 'Percent not empty' },
  { value: 'sum', label: 'Sum (numbers)' },
  { value: 'average', label: 'Average (numbers)' },
  { value: 'median', label: 'Median (numbers)' },
  { value: 'min', label: 'Min (numbers)' },
  { value: 'max', label: 'Max (numbers)' },
  { value: 'range', label: 'Range (max - min)' },
];

interface RollupConfiguratorProps {
  property: any;
  blockId: string;
  onClose?: () => void;
}

export default function RollupConfigurator({ property, blockId, onClose }: RollupConfiguratorProps) {
  const updateProperty = useDatabaseStore(s => s.updateProperty);
  const currentSchema = useDatabaseStore(s => s.getDatabaseData(blockId)?.schema || []);
  const relationProperties = currentSchema.filter(p => p.type === PROPERTY_TYPES.RELATION);

  const [targetSchema, setTargetSchema] = useState<any[]>([]);
  const config = property.config || {};

  const selectedRelationId = config.relationPropertyId || '';
  const selectedTargetPropertyId = config.targetPropertyId || '';
  const selectedCalculation = config.calculate || 'count_all';

  // Load target schema whenever selected relation changes
  useEffect(() => {
    if (!selectedRelationId) {
      setTargetSchema([]);
      return;
    }
    const relProp = currentSchema.find(p => p.id === selectedRelationId);
    const targetDbId = relProp?.config?.relatedDatabaseId;
    if (!targetDbId) {
      setTargetSchema([]);
      return;
    }

    const cachedDb = useDatabaseStore.getState().databases[targetDbId];
    if (cachedDb?.schema && cachedDb.schema.length > 0) {
      setTargetSchema(cachedDb.schema);
    } else {
      db.blocks.get(targetDbId).then(targetBlock => {
        setTargetSchema(targetBlock?.properties?.schema || []);
      }).catch(err => console.error('Failed to load target database schema:', err));
    }
  }, [selectedRelationId, currentSchema]);

  const handleUpdateConfig = (updates: Record<string, any>) => {
    updateProperty(blockId, property.id, {
      config: { ...config, ...updates }
    });
  };

  return (
    <div className="rollup-configurator flex flex-col gap-3 p-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-md">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
          <Sigma size={14} />
          <span>Rollup Configuration</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-tertiary hover:text-primary">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Relation Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          1. Select Relation
        </label>
        {relationProperties.length === 0 ? (
          <div className="p-2 text-xs rounded bg-[var(--bg-primary)] border border-dashed border-[var(--border-subtle)] text-[var(--text-tertiary)] text-center">
            No Relation property found. Add a Relation column first.
          </div>
        ) : (
          <select
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
            value={selectedRelationId}
            onChange={e => handleUpdateConfig({ relationPropertyId: e.target.value, targetPropertyId: '' })}
          >
            <option value="">Choose a relation...</option>
            {relationProperties.map(rel => (
              <option key={rel.id} value={rel.id}>
                {rel.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Target Property Selection */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          2. Target Property
        </label>
        <select
          className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none disabled:opacity-50"
          value={selectedTargetPropertyId}
          disabled={!selectedRelationId || targetSchema.length === 0}
          onChange={e => handleUpdateConfig({ targetPropertyId: e.target.value })}
        >
          <option value="">Choose target column...</option>
          {targetSchema.map(prop => (
            <option key={prop.id} value={prop.id}>
              {prop.name} ({prop.type})
            </option>
          ))}
        </select>
      </div>

      {/* Calculate Mode */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          3. Calculate
        </label>
        <select
          className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none"
          value={selectedCalculation}
          onChange={e => handleUpdateConfig({ calculate: e.target.value })}
        >
          {ROLLUP_CALCULATIONS.map(calc => (
            <option key={calc.value} value={calc.value}>
              {calc.label}
            </option>
          ))}
        </select>
      </div>

      {/* Visual Display Settings */}
      <div className="mt-1 pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-2">
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
          Display Format
        </span>

        {/* Show As */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Show as</span>
          <div className="flex bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded p-0.5 gap-1">
            {(['number', 'bar', 'ring'] as const).map(type => (
              <button
                key={type}
                className={`px-2 py-0.5 rounded text-[11px] capitalize ${
                  (config.showAs || 'number') === type
                    ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary-fg)] font-medium'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
                onClick={() => handleUpdateConfig({ showAs: type })}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Number Format */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Format</span>
          <select
            className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
            value={config.numberFormat || 'number'}
            onChange={e => handleUpdateConfig({ numberFormat: e.target.value })}
          >
            <option value="number">Number</option>
            <option value="percent">Percent (%)</option>
            <option value="usd">USD ($)</option>
            <option value="eur">EUR (€)</option>
            <option value="gbp">GBP (£)</option>
          </select>
        </div>

        {/* Max value (for bar/ring) */}
        {(config.showAs === 'bar' || config.showAs === 'ring') && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Max value</span>
            <input
              type="number"
              className="w-16 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 text-xs text-right text-[var(--text-primary)] outline-none"
              value={config.maxValue !== undefined ? config.maxValue : (config.numberFormat === 'percent' ? 1 : 100)}
              onChange={e => handleUpdateConfig({ maxValue: parseFloat(e.target.value) || 100 })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
