import { useState, useEffect } from 'react';
import { useSecurityStore } from '../../stores/securityStore';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';

export default function UnlockScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const isInitialized = useSecurityStore(s => s.isInitialized);
  const unlock = useSecurityStore(s => s.unlock);
  const setInitialized = useSecurityStore(s => s.setInitialized);

  useEffect(() => {
    // Check if a master password exists (we'll store a "canary" in localStorage or DB)
    const hasMaster = localStorage.getItem('maniac_initialized') === 'true';
    setInitialized(hasMaster);
    if (!hasMaster) {
      setIsSettingUp(true);
    }
  }, []);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!password) return;
    
    // In a real app, we'd verify the password against a stored hash or try to decrypt a canary block.
    // For now, we'll just accept it and see if decryption works later.
    unlock(password);
  };

  const handleSetup = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    localStorage.setItem('maniac_initialized', 'true');
    setInitialized(true);
    unlock(password);
  };

  return (
    <div className="unlock-screen">
      <div className="unlock-card">
        <div className="unlock-icon-wrapper">
          {isSettingUp ? <ShieldAlert size={48} /> : <Lock size={48} />}
        </div>
        
        <h1>{isSettingUp ? 'Initialize Monolith' : 'System Locked'}</h1>
        <p>
          {isSettingUp 
            ? 'Set a master password to encrypt your local database. This cannot be recovered if lost.' 
            : 'Enter your master password to decrypt and access your data.'}
        </p>

        <form onSubmit={isSettingUp ? handleSetup : handleUnlock}>
          <div className="input-group">
            <input
              type="password"
              placeholder="Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          
          {isSettingUp && (
            <div className="input-group">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {error && <div className="unlock-error">{error}</div>}

          <button type="submit" className="unlock-btn">
            {isSettingUp ? 'Set Password & Initialize' : 'Unlock System'}
          </button>
        </form>
        
        <div className="unlock-footer">
          <p>Maniac OS v1.0 • AES-256-GCM Hardware Encrypted</p>
        </div>
      </div>
    </div>
  );
}
