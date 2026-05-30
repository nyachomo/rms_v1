import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login } = useAuth();
    const navigate  = useNavigate();

    const [form, setForm]       = useState({ email: '', password: '' });
    const [errors, setErrors]   = useState({});
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async e => {
        e.preventDefault();
        setErrors({});
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setErrors(err.errors || { email: [err.message || 'Login failed.'] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split">

            {/* ── Left branding panel ── */}
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
                    <div className="auth-card-head">
                        <div className="auth-logo">
                            <img src="/logo/Logo.jpeg" alt="Techsphere" />
                        </div>
                        <h2>Hi, welcome back</h2>
                        <p>Sign in to your Techsphere account</p>
                    </div>

                    <form onSubmit={submit} className="auth-form">
                        <div className="auth-field">
                            <label>Email Address</label>
                            <div className="auth-input-wrap">
                                <i className="fas fa-envelope"></i>
                                <input
                                    type="email" name="email" required
                                    placeholder="you@example.com"
                                    value={form.email} onChange={handle}
                                />
                            </div>
                            {errors.email && <span className="auth-error">{errors.email[0]}</span>}
                        </div>

                        <div className="auth-field">
                            <div className="auth-field-row">
                                <label>Password</label>
                                <Link to="/forgot-password" className="auth-forgot">Forgot Password?</Link>
                            </div>
                            <div className="auth-input-wrap">
                                <i className="fas fa-lock"></i>
                                <input
                                    type={showPwd ? 'text' : 'password'} name="password" required
                                    placeholder="Enter your password"
                                    value={form.password} onChange={handle}
                                />
                                <button type="button" className="auth-pwd-toggle" onClick={() => setShowPwd(s => !s)}>
                                    <i className={`fas fa-eye${showPwd ? '-slash' : ''}`}></i>
                                </button>
                            </div>
                            {errors.password && <span className="auth-error">{errors.password[0]}</span>}
                        </div>

                        <button type="submit" className="auth-submit" disabled={loading}>
                            {loading
                                ? <><i className="fas fa-circle-notch fa-spin"></i> Signing in…</>
                                : <><i className="fas fa-sign-in-alt"></i> Sign In</>
                            }
                        </button>
                    </form>

                    <p style={{ textAlign:'center', marginTop:16, fontSize:'.84rem', fontFamily:'Poppins,sans-serif', color:'#94a3b8' }}>
                        <Link to="/" style={{ color:'#fe730c', fontWeight:600, textDecoration:'none' }}>← Go to Home</Link>
                    </p>

                    <p className="auth-panel-copy-right">
                        © {new Date().getFullYear()} Techsphere Institute
                    </p>
                </div>
            </div>

        </div>
    );
}
