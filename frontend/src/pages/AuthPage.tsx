import { useState } from 'react';
import './AuthPage.css';

interface Props {
  onLogin: (email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  onSignup: (name: string, email: string, password: string) => Promise<{ success: boolean, error?: string }>;
  onOAuth?: (provider: 'google' | 'github') => void;
}

/* ── Inline SVG helpers ─────────────────────────────────────── */

/** Rough hand-drawn arrow pointing right, charcoal style */
const HandArrow = () => (
  <svg
    className="auth-switch-arrow"
    width="22" height="14" viewBox="0 0 22 14"
    fill="none" xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M1 7 Q5 5 9 7 Q13 9 17 7"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    />
    <path
      d="M14 3.5 L18.5 7 L14 10.5"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

/** Rough charcoal squiggle underline for header title */
const SquiggleDivider = () => (
  <svg
    className="auth-header-squiggle"
    width="100%" height="10" viewBox="0 0 300 10"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 5 Q15 1 30 5 Q45 9 60 5 Q75 1 90 5 Q105 9 120 5 Q135 1 150 5 Q165 9 180 5 Q195 1 210 5 Q225 9 240 5 Q255 1 270 5 Q285 9 300 5"
      stroke="#201b0d" strokeWidth="2.5" fill="none"
      strokeLinecap="round" opacity="0.7"
    />
  </svg>
);

/* ─────────────────────────────────────────────────────────────── */

export default function AuthPage({ onLogin, onSignup, onOAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submitLabel = loading ? 'LOADING…' : mode === 'login' ? 'ENTER WORKSPACE' : 'JOIN THE MESS';

  const handle = async () => {
    setError('');
    if (!email || !password) { setError('Please fill all fields.'); return; }
    if (mode === 'signup' && !name) { setError('Name is required.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    
    const result = mode === 'login' 
      ? await onLogin(email, password) 
      : await onSignup(name, email, password);
      
    if (!result.success) {
      setError(result.error || 'Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className={`auth-page ${mode}`}>

      {/* ── Left — Image Panel ─────────────────────────── */}
      <section className="auth-left">
        <div className="auth-left-image"></div>
        <div className="auth-left-overlay"></div>
        <div className="auth-left-bg-text top">PEBLO</div>
        <div className="auth-left-bg-text bottom">DRAFT</div>
        <div className="auth-left-inner">
          <h1 className="auth-hero font-anton">PEBLO</h1>
          <div className="auth-badge">CREATE CHAOS</div>
          <p className="auth-tagline">
            The messy, unpolished space for your most brilliant ideas.
            Embracing the friction of the creative process.
          </p>
        </div>
      </section>

      {/* ── Right — Form Panel ────────────────────────── */}
      <section className="auth-right">

        {/* ── TACTILE: Form card — tape pins added via CSS ::before / ::after ── */}
        <div className="auth-form-card neo-border neo-shadow-xl animate-scale">

          {/* Header with rotated title + squiggle divider */}
          <div className="auth-form-header">
            <h2 className="font-anton auth-form-title">
              {mode === 'login' ? 'WELCOME BACK' : 'JOIN THE MESS'}
            </h2>
            <p className="auth-form-sub font-mono">
              {mode === 'login' ? 'LOG IN TO CONTINUE THE MESS.' : 'EMBRACE THE CHAOS. CREATE FREELY.'}
            </p>
            {/* HAND-DRAWN: charcoal squiggle replaces the flat border-bottom */}
            <SquiggleDivider />
          </div>

          {/* Social buttons */}
          <div className="auth-social-grid">
            <button className="btn btn-surface neo-shadow-sm w-full" id="btn-google" onClick={() => onOAuth?.('google')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              GOOGLE
            </button>
            <button className="btn btn-surface neo-shadow-sm w-full" id="btn-github" onClick={() => onOAuth?.('github')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GITHUB
            </button>
          </div>

          {/* HAND-DRAWN: SVG squiggle divider between social + email form */}
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="font-mono" style={{ fontSize: 12, letterSpacing: '0.05em' }}>OR</span>
            <div className="auth-divider-line" />
          </div>

          {/* Form fields */}
          <div className="auth-fields">
            {mode === 'signup' && (
              <div className="field-group">
                <label className="field-label font-mono">CREATIVES NAME</label>
                {/* DEPTH: focus triggers 6px hard shadow + translate */}
                <input className="zine-input" placeholder="WHO ARE YOU?" value={name}
                  onChange={e => setName(e.target.value)} id="input-name" />
              </div>
            )}
            <div className="field-group">
              <label className="field-label font-mono">
                {mode === 'signup' ? 'NEURAL PORT (EMAIL)' : 'EMAIL ADDRESS'}
              </label>
              <input className="zine-input" type="email"
                placeholder={mode === 'signup' ? 'YOU@MESSY.ART' : 'YOU@MESSY-IDEAS.COM'}
                value={email} onChange={e => setEmail(e.target.value)} id="input-email" />
            </div>
            <div className="field-group">
              <div className="field-label-row">
                <label className="field-label font-mono">
                  {mode === 'signup' ? 'SECRET KEY (PASSWORD)' : 'PASSWORD'}
                </label>
                {mode === 'login' && <a href="#" className="auth-forgot font-mono">FORGOT?</a>}
              </div>
              <input className="zine-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handle()} id="input-password" />
            </div>

            {mode === 'signup' && (
              <label className="auth-checkbox-row">
                <input type="checkbox" className="auth-checkbox" checked={remember}
                  onChange={e => setRemember(e.target.checked)} />
                <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  I ACCEPT THAT MY PROCESS WILL BE UNFILTERED AND MESSY.
                </span>
              </label>
            )}
            {mode === 'login' && (
              <label className="auth-checkbox-row">
                <input type="checkbox" className="auth-checkbox" checked={remember}
                  onChange={e => setRemember(e.target.checked)} />
                <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  REMEMBER THIS DEVICE
                </span>
              </label>
            )}

            {error && <p className="auth-error font-mono">{error}</p>}

            {/* DEPTH + MICRO-MOMENT: data-label drives the misregistration ::before pseudo */}
            <button
              className="btn btn-primary btn-lg auth-submit"
              onClick={handle}
              disabled={loading}
              id="btn-auth-submit"
              data-label={submitLabel}
            >
              {loading ? <span className="spinner" /> : null}
              {submitLabel}
            </button>
          </div>

          {/* HAND-DRAWN: Arrow + marker highlight on switch link */}
          <div className="auth-switch font-mono">
            {mode === 'login' ? "Don't have an account? " : 'Already a member? '}
            {/* Hand-drawn arrow points toward the action */}
            <HandArrow />
            <button
              className="auth-switch-btn"
              onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
            >
              {mode === 'login' ? 'START CREATING' : 'SIGN IN'}
            </button>
          </div>
        </div>

        {/* Sticky note annotation — tape pin via CSS ::before */}
        <div className="auth-annotation neo-border-sm neo-shadow-sm">
          <span className="auth-annotation-icon">💡</span>
          <p className="font-mono auth-annotation-text">
            "PRODUCTIVITY IS THE ENEMY OF CREATIVITY. LET'S MAKE SOMETHING WEIRD TODAY."
          </p>
        </div>

        <div className="auth-footer-links">
          {['PRIVACY', 'TERMS', 'SUPPORT'].map(l => (
            <a key={l} href="#" className="font-mono"
              style={{ fontSize: 11, letterSpacing: '0.05em', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
              {l}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
