import React, { useRef } from 'react';
import { useSettingsStore } from '../../../stores/settingsStore';
import { SettingRow, Toggle, Select, Divider } from './SettingControls';
import { Camera } from 'lucide-react';

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
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      s.setSetting('userProfileImage', event.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="settings-tab-content">
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>User Profile</h4>
        
        <SettingRow label="Profile Image" description="Change your personal avatar image.">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                width: 44, 
                height: 44, 
                borderRadius: '50%',
                background: 'var(--bg-tertiary)', 
                color: 'var(--text-secondary)',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                border: '1px dashed var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Change profile image"
            >
              {s.userProfileImage ? (
                <img src={s.userProfileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={16} />
              )}
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleImageChange} 
            />
            {s.userProfileImage && (
              <button
                onClick={() => s.setSetting('userProfileImage', null)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--error)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-subtle)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                Remove
              </button>
            )}
          </div>
        </SettingRow>

        <Divider />

        <SettingRow label="Display Name" description="Change your username across the application.">
          <input 
            type="text" 
            value={s.userName} 
            onChange={e => s.setSetting('userName', e.target.value)}
            placeholder="Maniac User"
            style={{ 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border-subtle)', 
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '6px',
              outline: 'none',
              width: '180px'
            }} 
          />
        </SettingRow>
      </div>

      <Divider />
      <SettingRow label="Theme Mode" description="Switch between dark, light, and system themes.">
        <Select
          value={s.theme}
          onChange={v => s.setSetting('theme', v)}
          options={[
            { value: 'dark', label: 'Dark Mode' },
            { value: 'light', label: 'Light Mode' },
            { value: 'system', label: 'System Default' },
          ]}
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
