import { useState, useEffect } from 'react';
import { useSecurityStore } from '../../stores/securityStore';
import { SecurityService } from '../../utils/securityService';
import { db } from '../../db/database';
import { Lock, Unlock, ShieldAlert, Loader } from 'lucide-react';

export default function UnlockScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const isInitialized = useSecurityStore(s => s.isInitialized);
  const unlock = useSecurityStore(s => s.unlock);
  const setInitialized = useSecurityStore(s => s.setInitialized);

  const handleUnlock = async (e, autoPassword = null) => {
    if (e) e.preventDefault();
    const pwToUse = autoPassword || password;
    if (!pwToUse || isVerifying) return;

    setIsVerifying(true);
    setError('');

    try {
      const verifier = localStorage.getItem('maniac_verifier');
      let key;
      if (!verifier) {
        // Fallback: verify password by attempting to decrypt a known block/page
        const keys = await SecurityService.deriveKeysFromPassword(pwToUse);
        key = keys;
        const testPage = await db.pages.toCollection().filter(p => p._isEncrypted).first();
        if (testPage && testPage.title) {
           const decryptedContent = await SecurityService.decrypt(testPage.title, keys.aesKey);
           if (!decryptedContent) {
               setError('Incorrect password. Please try again.');
               setIsVerifying(false);
               return;
           }
        }
        // If decryption succeeded or DB is empty, generate and store a new verifier
        const newVerifier = await SecurityService.createVerifier(pwToUse);
        localStorage.setItem('maniac_verifier', newVerifier);
      } else {
        const valid = await SecurityService.verifyPassword(pwToUse, verifier);
        if (!valid) {
          setError('Incorrect password. Please try again.');
          setIsVerifying(false);
          // If auto-unlock fails, clear the bad session password
          if (autoPassword) sessionStorage.removeItem('maniac_session_password');
          return;
        }
        key = await SecurityService.deriveKeysFromPassword(pwToUse);
      }

      // Save to session storage so refresh works without retyping
      sessionStorage.setItem('maniac_session_password', pwToUse);
      unlock(key);
    } catch (err) {
      setError('Verification failed. Please try again.');
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // Check if a master password has been set before
    const hasMaster = localStorage.getItem('maniac_initialized') === 'true';
    setInitialized(hasMaster);
    if (!hasMaster) {
      setIsSettingUp(true);
    } else {
      // Auto-unlock if password is in sessionStorage
      const sessionPw = sessionStorage.getItem('maniac_session_password');
      if (sessionPw) {
        handleUnlock(null, sessionPw);
      }
    }
  }, []);

  const handleSetup = async (e) => {
    e.preventDefault();
    if (isVerifying) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Create and store a verifier (encrypted canary)
      const verifier = await SecurityService.createVerifier(password);
      localStorage.setItem('maniac_verifier', verifier);
      localStorage.setItem('maniac_initialized', 'true');

      // Derive the long-lived CryptoKey and unlock
      const keys = await SecurityService.deriveKeysFromPassword(password);
      
      // Save session password
      sessionStorage.setItem('maniac_session_password', password);
      
      setInitialized(true);
      unlock(keys);
    } catch (err) {
      setError('Setup failed: ' + err.message);
      setIsVerifying(false);
    }
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
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoFocus
              disabled={isVerifying}
            />
          </div>
          
          {isSettingUp && (
            <div className="input-group">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                disabled={isVerifying}
              />
            </div>
          )}

          {error && <div className="unlock-error">{error}</div>}

          <button type="submit" className="unlock-btn" disabled={isVerifying}>
            {isVerifying ? (
              <>
                <Loader size={16} className="spin-animation" />
                {isSettingUp ? 'Initializing...' : 'Verifying...'}
              </>
            ) : (
              isSettingUp ? 'Set Password & Initialize' : 'Unlock System'
            )}
          </button>
        </form>
        
        <div className="unlock-footer">
          <p>Maniac OS v1.0 • AES-256-GCM Hardware Encrypted</p>
        </div>
      </div>
    </div>
  );
}
