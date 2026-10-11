import React from 'react';
import { useSettingsStore } from '../../../stores/settingsStore';
import { SettingRow, Toggle, Select, Slider, Divider } from './SettingControls';

export default function NotificationsTab() {
  const s = useSettingsStore();

  return (
    <div className="settings-tab-content">
      <SettingRow label="Enable Notifications" description="Show toast notifications for system events and intelligence alerts.">
        <Toggle checked={s.notificationsEnabled} onChange={v => s.setSetting('notificationsEnabled', v)} />
      </SettingRow>

      <Divider />

      <SettingRow label="Sound Effects" description="Play subtle audio cues on actions (save, delete, etc).">
        <Toggle checked={s.soundEnabled} onChange={v => s.setSetting('soundEnabled', v)} disabled={!s.notificationsEnabled} />
      </SettingRow>

      <Divider />

      <SettingRow label="Stale Page Alerts" description="Get notified when pages haven't been visited in a while.">
        <Toggle checked={s.stalePageAlerts} onChange={v => s.setSetting('stalePageAlerts', v)} disabled={!s.notificationsEnabled} />
      </SettingRow>

      {s.stalePageAlerts && s.notificationsEnabled && (
        <>
          <Divider />
          <SettingRow label="Stale Threshold" description="Days before a page is flagged as stale.">
            <Slider
              value={s.stalePageThresholdDays}
              onChange={v => s.setSetting('stalePageThresholdDays', v)}
              min={3}
              max={60}
              unit=" days"
            />
          </SettingRow>
        </>
      )}

      <Divider />

      {/* Keyboard Shortcuts Reference */}
      <div className="setting-label" style={{ marginBottom: 12 }}>Keyboard Shortcuts</div>
      <div className="shortcuts-grid">
        {[
          ['⌘ + K', 'Command Palette'],
          ['⌘ + Z', 'Undo'],
          ['⌘ + ⇧ + Z', 'Redo'],
          ['⌘ + A', 'Select All Pages'],
          ['/', 'Insert Block'],
          ['Esc', 'Close Modals'],
        ].map(([key, desc]) => (
          <div key={key} className="shortcut-row">
            <kbd className="shortcut-key">{key}</kbd>
            <span className="shortcut-desc">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
