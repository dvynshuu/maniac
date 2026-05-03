import React from 'react';
import { useSettingsStore } from '../../../stores/settingsStore';
import { SettingRow, Toggle, Select, Divider } from './SettingControls';

const ACCENT_COLORS = [
  { value: '#2E5BFF', label: 'Blue' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
];

export default function AppearanceTab() {
  const s = useSettingsStore();

  return (
    <div className="settings-tab-content">
      <SettingRow label="Theme Mode" description="Switch between dark and light themes (currently locked to Dark).">
        <Select
          value={s.theme}
          onChange={v => s.setSetting('theme', v)}
          options={[
            { value: 'dark', label: 'Dark Mode' },
            { value: 'light', label: 'Light (Coming Soon)' },
            { value: 'system', label: 'System (Coming Soon)' },
          ]}
          disabled
        />
      </SettingRow>

      <Divider />

      <SettingRow label="Animations" description="Enable smooth UI micro-animations and transitions.">
        <Toggle checked={s.animationsEnabled} onChange={v => s.setSetting('animationsEnabled', v)} />
      </SettingRow>

      <Divider />

      <SettingRow label="Font Family" description="Change the primary typeface used across the workspace.">
        <Select
          value={s.fontFamily}
          onChange={v => {
            s.setSetting('fontFamily', v);
            document.documentElement.style.setProperty('--font-sans',
              v === 'JetBrains Mono' ? "var(--font-mono)" :
              v === 'System' ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" :
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            );
          }}
          options={[
            { value: 'Inter', label: 'Inter' },
            { value: 'JetBrains Mono', label: 'JetBrains Mono' },
            { value: 'System', label: 'System Default' },
          ]}
        />
      </SettingRow>

      <Divider />

      <SettingRow label="Content Density" description="Adjust spacing and text size for your preference.">
        <Select
          value={s.fontSize}
          onChange={v => {
            s.setSetting('fontSize', v);
            const sizes = { compact: '14px', default: '16px', comfortable: '18px' };
            document.documentElement.style.fontSize = sizes[v];
          }}
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'default', label: 'Default' },
            { value: 'comfortable', label: 'Comfortable' },
          ]}
        />
      </SettingRow>

      <Divider />

      <SettingRow label="Accent Color" description="Choose the primary accent color for the UI.">
        <div className="accent-color-picker">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.value}
              className={`accent-swatch ${s.accentColor === c.value ? 'active' : ''}`}
              style={{ background: c.value }}
              title={c.label}
              onClick={() => {
                s.setSetting('accentColor', c.value);
                document.documentElement.style.setProperty('--accent-primary', c.value);
              }}
            />
          ))}
        </div>
      </SettingRow>
    </div>
  );
}
