import React, { useState } from 'react';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useSecurityStore } from '../../../stores/securityStore';
import { SecurityService } from '../../../utils/securityService';
import { SettingRow, Toggle, Select, Divider, ActionButton, DangerZone } from './SettingControls';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function SecurityTab() {
  const s = useSettingsStore();
  const { isLocked, isInitialized, lock } = useSecurityStore();
  const [changePwState, setChangePwState] = useState('idle'); // idle | form | loading | success
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  const handleChangePassword = async () => {
    setPwError('');
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }

    setChangePwState('loading');
    try {
      const verifier = localStorage.getItem('maniac_verifier');
      const valid = await SecurityService.verifyPassword(currentPw, verifier);
      if (!valid) { setPwError('Current password is incorrect.'); setChangePwState('form'); return; }

      // Create new verifier with new password
      const newVerifier = await SecurityService.createVerifier(newPw);
      localStorage.setItem('maniac_verifier', newVerifier);

      // Re-derive keys
      const newKeys = await SecurityService.deriveKeysFromPassword(newPw);
      useSecurityStore.getState().unlock(newKeys);

      setChangePwState('success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setChangePwState('idle'), 2000);
    } catch (err) {
      setPwError('Failed to change password: ' + err.message);
      setChangePwState('form');
    }
  };

  const handleLockNow = () => {
    lock();
  };

  return (
    <div className="settings-tab-content">
      {/* Encryption Status */}
      <div className="setting-status-banner">
        <div className="setting-status-icon">
          {isInitialized ? <ShieldCheck size={20} color="var(--success)" /> : <ShieldAlert size={20} color="var(--warning)" />}
        </div>
        <div>
          <div className="setting-label">{isInitialized ? 'Encryption Active' : 'No Password Set'}</div>
          <div className="setting-desc">{isInitialized ? 'AES-256-GCM • PBKDF2 100k iterations • Local-only keys' : 'Set a master password to enable encryption.'}</div>
        </div>
      </div>

      <Divider />

      <SettingRow label="Auto-Lock" description="Automatically lock the workspace after inactivity.">
        <Toggle checked={s.autoLockEnabled} onChange={v => s.setSetting('autoLockEnabled', v)} />
      </SettingRow>

      {s.autoLockEnabled && (
        <SettingRow label="Lock Timeout" description="Minutes of inactivity before auto-lock.">
          <Select
            value={String(s.autoLockTimeout)}
            onChange={v => s.setSetting('autoLockTimeout', Number(v))}
            options={[
              { value: '1', label: '1 minute' },
              { value: '5', label: '5 minutes' },
              { value: '15', label: '15 minutes' },
              { value: '30', label: '30 minutes' },
              { value: '60', label: '1 hour' },
            ]}
          />
        </SettingRow>
      )}

      <Divider />

      <SettingRow label="Lock on Tab Close" description="Re-lock when the browser tab is closed.">
        <Toggle checked={s.lockOnClose} onChange={v => s.setSetting('lockOnClose', v)} />
      </SettingRow>

      <Divider />

      {/* Lock Now */}
      <SettingRow label="Lock Workspace" description="Immediately lock and require password to re-enter.">
        <ActionButton variant="secondary" onClick={handleLockNow}>Lock Now</ActionButton>
      </SettingRow>

      <Divider />

      {/* Change Password */}
      <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: changePwState === 'form' ? 16 : 0 }}>
          <div className="setting-info">
            <div className="setting-label">Change Master Password</div>
            <div className="setting-desc">Update the encryption password for your workspace.</div>
          </div>
          {changePwState === 'idle' && (
            <ActionButton variant="secondary" onClick={() => setChangePwState('form')}>Change</ActionButton>
          )}
          {changePwState === 'success' && (
            <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>✓ Password updated</span>
          )}
        </div>

        {changePwState === 'form' || changePwState === 'loading' ? (
          <div className="setting-pw-form">
            <input type="password" placeholder="Current Password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="setting-input" autoFocus />
            <input type="password" placeholder="New Password (min 8 chars)" value={newPw} onChange={e => setNewPw(e.target.value)} className="setting-input" />
            <input type="password" placeholder="Confirm New Password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="setting-input" />
            {pwError && <div className="setting-error">{pwError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <ActionButton variant="secondary" onClick={() => { setChangePwState('idle'); setPwError(''); }}>Cancel</ActionButton>
              <ActionButton variant="primary" onClick={handleChangePassword} loading={changePwState === 'loading'}>Update Password</ActionButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
