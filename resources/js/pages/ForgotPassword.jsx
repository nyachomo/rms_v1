import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const STEP_EMAIL    = 'email';
const STEP_PASSWORD = 'password';
const STEP_DONE     = 'done';

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep]           = useState(STEP_EMAIL);
    const [email, setEmail]         = useState('');
    const [password, setPassword]   = useState('');
    const [confirm, setConfirm]     = useState('');
    const [showPwd, setShowPwd]     = useState(false);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');

    /* ── Step 1: verify the email exists ── */
    const submitEmail = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res  = await fetch('/api/auth/verify-reset-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.errors?.email?.[0] || data.message || 'Email not found.');
                return;
            }
            setStep(STEP_PASSWORD);
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Step 2: set new password ── */
    const submitPassword = async e => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const res  = await fetch('/api/auth/reset-forgotten-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ email, password, password_confirmation: confirm }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.errors?.password?.[0] || data.message || 'Reset failed.');
                return;
            }
            setStep(STEP_DONE);
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split">

            {/* ── Left branding panel (same as Login) ── */}
            <div className="auth-panel-left">
                <div className="auth-panel-deco auth-panel-deco-1"></div>
                <div className="auth-panel-deco auth-panel-deco-2"></div>
                <div className="auth-panel-deco auth-panel-deco-3"></div>
                <div className="auth-panel-body">
                    <div className="auth-panel-logo-wrap">
                        <img src="/logo/Logo.jpeg" alt="Techsphere" />
                    </div>
                    <h1 className="auth-panel-title">Techsphere Institute</h1>
                    <p className="auth-panel-sub">Empowering Excellence in<br />Education &amp; Technology</p>
                    <div className="auth-panel-pills">
                        <span><i className="fas fa-graduation-cap"></i> Learning Portal</span>
                        <span><i className="fas fa-users-cog"></i> Admin Dashboard</span>
                        <span><i className="fas fa-shield-alt"></i> Secure Access</span>
                    </div>
                </div>
                <p className="auth-panel-copy">© {new Date().getFullYear()} Techsphere Institute. All rights reserved.</p>
            </div>

            {/* ── Right form panel ── */}
            <div className="auth-panel-right">
                <div className="auth-form-wrap">

                    {/* ── Shared header ── */}
                    <div className="auth-card-head">
                        <div className="auth-logo">
                            <img src="/logo/Logo.jpeg" alt="Techsphere" />
                        </div>
                        <h2>
                            {step === STEP_DONE ? 'Password Reset!' : 'Reset Password'}
                        </h2>
                        <p>
                            {step === STEP_EMAIL    && 'Enter your account email to get started'}
                            {step === STEP_PASSWORD && 'Choose a strong new password'}
                            {step === STEP_DONE     && 'Your password has been updated successfully'}
                        </p>
                    </div>

                    {/* ── Step indicator ── */}
                    {step !== STEP_DONE && (
                        <div className="fp-steps">
                            <div className={`fp-step ${step === STEP_EMAIL ? 'fp-step-active' : 'fp-step-done'}`}>
                                <span>{step === STEP_EMAIL ? '1' : <i className="fas fa-check"></i>}</span>
                                Verify Email
                            </div>
                            <div className="fp-step-line"></div>
                            <div className={`fp-step ${step === STEP_PASSWORD ? 'fp-step-active' : ''}`}>
                                <span>2</span>
                                New Password
                            </div>
                        </div>
                    )}

                    {/* ── Error banner ── */}
                    {error && (
                        <div className="fp-error-banner">
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}

                    {/* ── Step 1: Email ── */}
                    {step === STEP_EMAIL && (
                        <form onSubmit={submitEmail} className="auth-form">
                            <div className="auth-field">
                                <label>Email Address</label>
                                <div className="auth-input-wrap">
                                    <i className="fas fa-envelope"></i>
                                    <input
                                        type="email" required autoFocus
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button type="submit" className="auth-submit" disabled={loading}>
                                {loading
                                    ? <><i className="fas fa-circle-notch fa-spin"></i> Verifying…</>
                                    : <><i className="fas fa-arrow-right"></i> Continue</>
                                }
                            </button>
                        </form>
                    )}

                    {/* ── Step 2: New password ── */}
                    {step === STEP_PASSWORD && (
                        <form onSubmit={submitPassword} className="auth-form">
                            <div className="fp-email-pill">
                                <i className="fas fa-check-circle"></i>
                                <span>{email}</span>
                                <button type="button" onClick={() => { setStep(STEP_EMAIL); setError(''); }}>
                                    Change
                                </button>
                            </div>

                            <div className="auth-field">
                                <label>New Password</label>
                                <div className="auth-input-wrap">
                                    <i className="fas fa-lock"></i>
                                    <input
                                        type={showPwd ? 'text' : 'password'} required autoFocus
                                        placeholder="Min. 8 characters"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button type="button" className="auth-pwd-toggle" onClick={() => setShowPwd(s => !s)}>
                                        <i className={`fas fa-eye${showPwd ? '-slash' : ''}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="auth-field">
                                <label>Confirm New Password</label>
                                <div className="auth-input-wrap">
                                    <i className="fas fa-lock"></i>
                                    <input
                                        type={showPwd ? 'text' : 'password'} required
                                        placeholder="Repeat your password"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="auth-submit" disabled={loading}>
                                {loading
                                    ? <><i className="fas fa-circle-notch fa-spin"></i> Resetting…</>
                                    : <><i className="fas fa-key"></i> Reset Password</>
                                }
                            </button>
                        </form>
                    )}

                    {/* ── Step 3: Success ── */}
                    {step === STEP_DONE && (
                        <div className="fp-success">
                            <div className="fp-success-icon">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <p>You can now sign in with your new password.</p>
                            <button className="auth-submit" onClick={() => navigate('/login')}>
                                <i className="fas fa-sign-in-alt"></i> Go to Sign In
                            </button>
                        </div>
                    )}

                    <p style={{ textAlign:'center', marginTop:28, fontSize:'.84rem', fontFamily:'Poppins,sans-serif', color:'#94a3b8' }}>
                        Remembered your password?{' '}
                        <Link to="/login" style={{ color:'#fe730c', fontWeight:600, textDecoration:'none' }}>Sign In</Link>
                    </p>

                    <p className="auth-panel-copy-right">© {new Date().getFullYear()} Techsphere Institute</p>
                </div>
            </div>

        </div>
    );
}
