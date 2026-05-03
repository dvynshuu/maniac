import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useUIStore } from '../../../stores/uiStore';
import { db } from '../../../db/database';
import { SettingRow, Toggle, Select, Slider, Divider, ActionButton } from './SettingControls';

export default function SystemTab() {
  const s = useSettingsStore();
  const [dbStats, setDbStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [pages, blocks, trackers, blobs] = await Promise.all([
          db.pages.count(), db.blocks.count(),
          db.trackers.count(), db.blobs.count(),
        ]);
        // Estimate storage
        let storageEstimate = null;
        if (navigator.storage?.estimate) {
          storageEstimate = await navigator.storage.estimate();
        }
        setDbStats({ pages, blocks, trackers, blobs, storageEstimate });
      } catch { setDbStats(null); }
    })();
  }, []);

  const formatBytes = (b) => {
    if (!b) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
    return `${b.toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="settings-tab-content">
      <SettingRow label="Startup Page" description="Choose what opens when you launch the app.">
        <Select
          value={s.startupPage}
          onChange={v => s.setSetting('startupPage', v)}
          options={[
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'last-visited', label: 'Last Visited Page' },
          ]}
        />
      </SettingRow>

      <Divider />

      <SettingRow label="Spell Check" description="Enable browser spell-checking in text blocks.">
        <Toggle checked={s.spellCheck} onChange={v => s.setSetting('spellCheck', v)} />
      </SettingRow>

      <Divider />

      <SettingRow label="Auto-Save Interval" description="How often unsaved changes are flushed to IndexedDB.">
        <Slider value={s.autoSaveInterval} onChange={v => s.setSetting('autoSaveInterval', v)} min={1} max={10} unit="s" />
      </SettingRow>

      <Divider />

      <SettingRow label="Reduced Motion" description="Disable all transitions for accessibility.">
        <Toggle checked={s.reducedMotion} onChange={v => {
          s.setSetting('reducedMotion', v);
          document.documentElement.style.setProperty('--transition-fast', v ? '0ms' : '120ms ease');
          document.documentElement.style.setProperty('--transition-default', v ? '0ms' : '200ms ease');
        }} />
      </SettingRow>

      <Divider />

      <SettingRow label="Developer Mode" description="Show debug info, command IDs, and performance overlays.">
        <Toggle checked={s.developerMode} onChange={v => s.setSetting('developerMode', v)} />
      </SettingRow>

      <Divider />

      {/* Database Stats */}
      <div className="setting-stats-card">
        <div className="setting-label" style={{ marginBottom: 12 }}>Database Statistics</div>
        {dbStats ? (
          <div className="setting-stats-grid">
            <div className="stat-cell"><span className="stat-val">{dbStats.pages}</span><span className="stat-key">Pages</span></div>
            <div className="stat-cell"><span className="stat-val">{dbStats.blocks}</span><span className="stat-key">Blocks</span></div>
            <div className="stat-cell"><span className="stat-val">{dbStats.trackers}</span><span className="stat-key">Trackers</span></div>
            <div className="stat-cell"><span className="stat-val">{dbStats.blobs}</span><span className="stat-key">Blobs</span></div>
            {dbStats.storageEstimate && (
              <div className="stat-cell full">
                <span className="stat-val">{formatBytes(dbStats.storageEstimate.usage)}</span>
                <span className="stat-key">of {formatBytes(dbStats.storageEstimate.quota)} used</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading stats…</div>
        )}
      </div>
    </div>
  );
}
