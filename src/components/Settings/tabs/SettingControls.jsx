import React from 'react';
import { useSettingsStore } from '../../../stores/settingsStore';

/* ─── Reusable Setting Row ──────────────────────── */
export function SettingRow({ label, description, children }) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <div className="setting-label">{label}</div>
        {description && <div className="setting-desc">{description}</div>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

/* ─── Toggle Switch ──────────────────────────────── */
export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`setting-toggle ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
    >
      <div className="setting-toggle-knob" />
    </button>
  );
}

/* ─── Dropdown Select ──────────────────────────────── */
export function Select({ value, onChange, options, disabled }) {
  return (
    <select
      className="setting-select"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

/* ─── Slider ──────────────────────────────────────── */
export function Slider({ value, onChange, min, max, step = 1, unit = '' }) {
  return (
    <div className="setting-slider-group">
      <input
        type="range"
        className="setting-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
      <span className="setting-slider-value">{value}{unit}</span>
    </div>
  );
}

/* ─── Action Button ──────────────────────────────── */
export function ActionButton({ children, onClick, variant = 'secondary', disabled, loading }) {
  return (
    <button
      className={`setting-action-btn ${variant}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
}

/* ─── Danger Zone ──────────────────────────────────── */
export function DangerZone({ children }) {
  return (
    <div className="setting-danger-zone">
      <div className="setting-danger-label">Danger Zone</div>
      {children}
    </div>
  );
}

/* ─── Divider ───────────────────────────────────────── */
export function Divider() {
  return <div className="setting-divider" />;
}
