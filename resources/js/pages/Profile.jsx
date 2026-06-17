import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';

function Toast({ message, type, onClose }) {
    if (!message) return null;
    const isError = type === 'error';
    return (
        <div className="profile-toast" style={{ background: isError ? '#fef2f2' : '#f0fdf4', borderColor: isError ? '#fca5a5' : '#86efac' }}>
            <i className={`fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}`}
               style={{ color: isError ? '#dc2626' : '#16a34a' }}></i>
            <span style={{ color: isError ? '#991b1b' : '#15803d' }}>{message}</span>
            <button onClick={onClose} className="profile-toast-close"><i className="fas fa-times"></i></button>
        </div>
    );
}

export default function Profile() {
    const { user, token, updateProfile, updateAvatar, updatePassword, logout, can } = useAuth();
    const navigate = useNavigate();

    // Avatar upload
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarToast, setAvatarToast]         = useState(null);
    const avatarInputRef = useRef(null);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        setAvatarToast(null);
        try {
            await updateAvatar(file);
            setAvatarToast({ message: 'Profile photo updated!', type: 'success' });
        } catch {
            setAvatarToast({ message: 'Upload failed. Max size 2 MB.', type: 'error' });
        } finally {
            setAvatarUploading(false);
            e.target.value = '';
        }
    };

    // Merged personal info form (user + student fields)
    const [info, setInfo]           = useState({ name: user?.name || '', email: user?.email || '', phone: '', gender: '', date_of_birth: '', address: '' });
    const [infoErrors, setInfoErrors]   = useState({});
    const [infoLoading, setInfoLoading] = useState(false);
    const [infoSaving, setInfoSaving]   = useState(false);
    const [infoToast, setInfoToast]     = useState(null);

    // Extra display-only fields from student record
    const [studentMeta, setStudentMeta] = useState({ courses: '', classes: '', status: '' });

    // Parent / Guardian details form
    const [parent, setParent]           = useState({ parent_name: '', parent_phone: '', parent_email: '', parent_relationship: '' });
    const [parentErrors, setParentErrors]   = useState({});
    const [parentSaving, setParentSaving]   = useState(false);
    const [parentToast, setParentToast]     = useState(null);

    // Password form
    const [pwd, setPwd]               = useState({ current_password: '', password: '', password_confirmation: '' });
    const [pwdErrors, setPwdErrors]   = useState({});
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdToast, setPwdToast]     = useState(null);
    const [showPwd, setShowPwd]       = useState({ current: false, new: false, confirm: false });

    useEffect(() => {
        if (!token) return;
        setInfoLoading(true);
        fetch('/api/profile/student-info', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => {
                const enrollments = d.enrollments || [];
                const courses = enrollments.map(e => e.course).filter(Boolean).join(', ') || '—';
                const classes = [...new Set(enrollments.map(e => e.class).filter(Boolean))].join(', ') || '—';

                if (d.student) {
                    setInfo(prev => ({
                        ...prev,
                        phone:         d.student.phone         || '',
                        gender:        d.student.gender        || '',
                        date_of_birth: d.student.date_of_birth || '',
                        address:       d.student.address       || '',
                    }));
                    setParent({
                        parent_name:         d.student.parent_name         || '',
                        parent_phone:        d.student.parent_phone        || '',
                        parent_email:        d.student.parent_email        || '',
                        parent_relationship: d.student.parent_relationship || '',
                    });
                }
                setStudentMeta({
                    courses,
                    classes,
                    status: d.student?.status || '',
                });
            })
            .finally(() => setInfoLoading(false));
    }, [token]);

    const handleInfo   = e => setInfo({ ...info, [e.target.name]: e.target.value });
    const handleParent = e => setParent({ ...parent, [e.target.name]: e.target.value });
    const handlePwd    = e => setPwd({ ...pwd, [e.target.name]: e.target.value });

    const submitInfo = async e => {
        e.preventDefault();
        setInfoErrors({});
        setInfoSaving(true);
        try {
            // Save name + email to users table
            await updateProfile(info.name, info.email);
            // Save phone/gender/DOB/address to students table
            const res = await fetch('/api/profile/student-info', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: info.phone, gender: info.gender, date_of_birth: info.date_of_birth, address: info.address }),
            });
            const data = await res.json();
            if (!res.ok) throw data;
            setInfoToast({ message: 'Personal information updated successfully!', type: 'success' });
        } catch (err) {
            setInfoErrors(err.errors || {});
            setInfoToast({ message: err.message || 'Update failed.', type: 'error' });
        } finally {
            setInfoSaving(false);
        }
    };

    const submitParent = async e => {
        e.preventDefault();
        setParentErrors({});
        setParentSaving(true);
        try {
            const res = await fetch('/api/profile/student-info', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(parent),
            });
            const data = await res.json();
            if (!res.ok) throw data;
            setParentToast({ message: data.message || 'Parent details saved.', type: 'success' });
        } catch (err) {
            setParentErrors(err.errors || {});
            setParentToast({ message: err.message || 'Save failed.', type: 'error' });
        } finally {
            setParentSaving(false);
        }
    };

    const submitPassword = async e => {
        e.preventDefault();
        setPwdErrors({});
        setPwdLoading(true);
        try {
            await updatePassword(pwd.current_password, pwd.password, pwd.password_confirmation);
            setPwd({ current_password: '', password: '', password_confirmation: '' });
            setPwdToast({ message: 'Password changed! Please log in again.', type: 'success' });
            setTimeout(async () => {
                await logout();
                navigate('/login');
            }, 2000);
        } catch (err) {
            setPwdErrors(err.errors || {});
            setPwdToast({ message: err.message || 'Password change failed.', type: 'error' });
        } finally {
            setPwdLoading(false);
        }
    };

    const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

    return (
        <div className="db-wrap">
            {/* SIDEBAR */}
            <DashboardSidebar />

            {/* MAIN */}
            <div className="db-main">
                <DashboardNavbar page="My Profile" />

                {/* CONTENT */}
                <div className="db-content">
                    <div className="db-topbar">
                        <div>
                            <h1 className="db-page-title"><i className="fas fa-user-cog"></i> My Profile</h1>
                            <p className="db-page-sub">Manage your account information and security</p>
                        </div>
                    </div>

                    <div className="profile-grid">

                        {/* ── LEFT: Profile card ── */}
                        <div className="profile-avatar-card">
                            {/* Avatar */}
                            <div className="profile-avatar-wrap" style={{ position: 'relative' }}>
                                {user?.user_image
                                    ? <img src={user.user_image} alt="Profile" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', display: 'block', position: 'relative', zIndex: 1 }} />
                                    : <div className="profile-avatar-circle" style={{ position: 'relative', zIndex: 1 }}>{initials}</div>
                                }
                                <div className="profile-avatar-ring"></div>

                                {/* Upload overlay */}
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={avatarUploading}
                                    title="Change photo"
                                    style={{
                                        position: 'absolute', bottom: 4, right: 4,
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: '#fe730c', border: '2px solid #fff',
                                        color: '#fff', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', cursor: 'pointer',
                                        fontSize: '0.7rem', boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                                        zIndex: 2,
                                    }}
                                >
                                    {avatarUploading
                                        ? <i className="fas fa-circle-notch fa-spin"></i>
                                        : <i className="fas fa-camera"></i>}
                                </button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarChange}
                                />
                            </div>

                            {avatarToast && (
                                <div style={{
                                    margin: '8px 0 0', padding: '6px 10px', borderRadius: 6, fontSize: '.78rem',
                                    background: avatarToast.type === 'error' ? '#fef2f2' : '#f0fdf4',
                                    color: avatarToast.type === 'error' ? '#991b1b' : '#15803d',
                                    border: `1px solid ${avatarToast.type === 'error' ? '#fca5a5' : '#86efac'}`,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}>
                                    <i className={`fas fa-${avatarToast.type === 'error' ? 'exclamation-circle' : 'check-circle'}`}></i>
                                    {avatarToast.message}
                                    <button onClick={() => setAvatarToast(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            )}

                            {/* Info rows */}
                            <div style={{ width: '100%', marginTop: 20, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                                {[
                                    { label: 'Name',        value: user?.name },
                                    { label: 'Course',      value: studentMeta.courses || '—' },
                                    { label: 'Class',       value: studentMeta.classes || '—' },
                                    { label: 'Gender',      value: info.gender ? info.gender.charAt(0).toUpperCase() + info.gender.slice(1) : '—' },
                                    { label: 'Phone',       value: info.phone || '—' },
                                    { label: 'Status',      value: user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active', isStatus: true },
                                ].map(row => (
                                    <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid #f8fafc' }}>
                                        <span style={{ minWidth: 96, fontSize: '.78rem', fontWeight: 700, color: '#081f4e', fontFamily: 'Poppins,sans-serif' }}>
                                            {row.label}
                                        </span>
                                        <span style={{
                                            flex: 1, fontSize: '.82rem', color: row.isStatus ? (row.value === 'Active' ? '#16a34a' : '#dc2626') : '#64748b',
                                            fontWeight: row.isStatus ? 700 : 400, wordBreak: 'break-word',
                                        }}>
                                            {row.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── RIGHT: Forms ── */}
                        <div className="profile-forms">

                            {/* ── Personal Information (merged) ── */}
                            <div className="profile-card">
                                <div className="profile-card-head">
                                    <div className="profile-card-icon" style={{ background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)' }}>
                                        <i className="fas fa-user"></i>
                                    </div>
                                    <div>
                                        <h4>Personal Information</h4>
                                        <p>Update your name, contact and personal details</p>
                                    </div>
                                </div>
                                <Toast message={infoToast?.message} type={infoToast?.type} onClose={() => setInfoToast(null)} />
                                {infoLoading ? (
                                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af' }}>
                                        <i className="fas fa-spinner fa-spin" style={{ color: '#0ea5e9' }}></i> Loading…
                                    </div>
                                ) : (
                                    <form onSubmit={submitInfo} className="profile-form">
                                        <div className="profile-form-row">
                                            <div className="profile-field">
                                                <label>Full Name</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-user"></i>
                                                    <input type="text" name="name" required placeholder="Your full name"
                                                        value={info.name} onChange={handleInfo} />
                                                </div>
                                                {infoErrors.name && <span className="profile-error">{infoErrors.name[0]}</span>}
                                            </div>
                                            <div className="profile-field">
                                                <label>Email Address</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-envelope"></i>
                                                    <input type="email" name="email" required placeholder="you@example.com"
                                                        value={info.email} onChange={handleInfo} />
                                                </div>
                                                {infoErrors.email && <span className="profile-error">{infoErrors.email[0]}</span>}
                                            </div>
                                        </div>
                                        <div className="profile-form-row">
                                            <div className="profile-field">
                                                <label>Phone Number</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-phone"></i>
                                                    <input type="tel" name="phone" placeholder="e.g. +254 700 000 000"
                                                        value={info.phone} onChange={handleInfo} />
                                                </div>
                                                {infoErrors.phone && <span className="profile-error">{infoErrors.phone[0]}</span>}
                                            </div>
                                            <div className="profile-field">
                                                <label>Gender</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-venus-mars"></i>
                                                    <select name="gender" value={info.gender} onChange={handleInfo}
                                                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '.9rem', color: info.gender ? '#1e293b' : '#94a3b8' }}>
                                                        <option value="">Select gender</option>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                {infoErrors.gender && <span className="profile-error">{infoErrors.gender[0]}</span>}
                                            </div>
                                        </div>
                                        <div className="profile-form-row">
                                            <div className="profile-field">
                                                <label>Date of Birth</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-calendar-alt"></i>
                                                    <input type="date" name="date_of_birth"
                                                        value={info.date_of_birth} onChange={handleInfo} />
                                                </div>
                                                {infoErrors.date_of_birth && <span className="profile-error">{infoErrors.date_of_birth[0]}</span>}
                                            </div>
                                            <div className="profile-field">
                                                <label>Address</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-map-marker-alt"></i>
                                                    <input type="text" name="address" placeholder="Your physical address"
                                                        value={info.address} onChange={handleInfo} />
                                                </div>
                                                {infoErrors.address && <span className="profile-error">{infoErrors.address[0]}</span>}
                                            </div>
                                        </div>
                                        <div className="profile-form-footer">
                                            <button type="submit" className="profile-btn-save" disabled={infoSaving}>
                                                {infoSaving
                                                    ? <><i className="fas fa-circle-notch fa-spin"></i> Saving…</>
                                                    : <><i className="fas fa-save"></i> Save Changes</>}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* ── Parent / Guardian Details ── */}
                            <div className="profile-card">
                                <div className="profile-card-head">
                                    <div className="profile-card-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                        <i className="fas fa-users"></i>
                                    </div>
                                    <div>
                                        <h4>Parent / Guardian Details</h4>
                                        <p>Emergency contact and guardian information</p>
                                    </div>
                                </div>
                                <Toast message={parentToast?.message} type={parentToast?.type} onClose={() => setParentToast(null)} />
                                {infoLoading ? (
                                    <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af' }}>
                                        <i className="fas fa-spinner fa-spin" style={{ color: '#f59e0b' }}></i> Loading…
                                    </div>
                                ) : (
                                    <form onSubmit={submitParent} className="profile-form">
                                        <div className="profile-form-row">
                                            <div className="profile-field">
                                                <label>Parent / Guardian Name</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-user-friends"></i>
                                                    <input type="text" name="parent_name" placeholder="Full name"
                                                        value={parent.parent_name} onChange={handleParent} />
                                                </div>
                                                {parentErrors.parent_name && <span className="profile-error">{parentErrors.parent_name[0]}</span>}
                                            </div>
                                            <div className="profile-field">
                                                <label>Relationship</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-sitemap"></i>
                                                    <select name="parent_relationship" value={parent.parent_relationship} onChange={handleParent}
                                                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '.9rem', color: parent.parent_relationship ? '#1e293b' : '#94a3b8' }}>
                                                        <option value="">Select relationship</option>
                                                        <option value="Father">Father</option>
                                                        <option value="Mother">Mother</option>
                                                        <option value="Guardian">Guardian</option>
                                                        <option value="Sibling">Sibling</option>
                                                        <option value="Spouse">Spouse</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                {parentErrors.parent_relationship && <span className="profile-error">{parentErrors.parent_relationship[0]}</span>}
                                            </div>
                                        </div>
                                        <div className="profile-form-row">
                                            <div className="profile-field">
                                                <label>Parent Phone</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-phone-alt"></i>
                                                    <input type="tel" name="parent_phone" placeholder="e.g. +254 700 000 000"
                                                        value={parent.parent_phone} onChange={handleParent} />
                                                </div>
                                                {parentErrors.parent_phone && <span className="profile-error">{parentErrors.parent_phone[0]}</span>}
                                            </div>
                                            <div className="profile-field">
                                                <label>Parent Email</label>
                                                <div className="profile-input-wrap">
                                                    <i className="fas fa-envelope"></i>
                                                    <input type="email" name="parent_email" placeholder="parent@example.com"
                                                        value={parent.parent_email} onChange={handleParent} />
                                                </div>
                                                {parentErrors.parent_email && <span className="profile-error">{parentErrors.parent_email[0]}</span>}
                                            </div>
                                        </div>
                                        <div className="profile-form-footer">
                                            <button type="submit" className="profile-btn-save" disabled={parentSaving}
                                                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                                                {parentSaving
                                                    ? <><i className="fas fa-circle-notch fa-spin"></i> Saving…</>
                                                    : <><i className="fas fa-save"></i> Save Parent Details</>}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* Change Password */}
                            <div className="profile-card">
                                <div className="profile-card-head">
                                    <div className="profile-card-icon" style={{ background: 'linear-gradient(135deg,#8b5cf6,#a855f7)' }}>
                                        <i className="fas fa-lock"></i>
                                    </div>
                                    <div>
                                        <h4>Change Password</h4>
                                        <p>Use a strong password of at least 8 characters</p>
                                    </div>
                                </div>

                                <Toast
                                    message={pwdToast?.message}
                                    type={pwdToast?.type}
                                    onClose={() => setPwdToast(null)}
                                />

                                <form onSubmit={submitPassword} className="profile-form">
                                    {/* Current password */}
                                    <div className="profile-field">
                                        <label>Current Password</label>
                                        <div className="profile-input-wrap">
                                            <i className="fas fa-lock"></i>
                                            <input
                                                type={showPwd.current ? 'text' : 'password'}
                                                name="current_password" required
                                                placeholder="Enter your current password"
                                                value={pwd.current_password} onChange={handlePwd}
                                            />
                                            <button type="button" className="profile-eye" onClick={() => setShowPwd(s => ({ ...s, current: !s.current }))}>
                                                <i className={`fas fa-eye${showPwd.current ? '-slash' : ''}`}></i>
                                            </button>
                                        </div>
                                        {pwdErrors.current_password && <span className="profile-error">{pwdErrors.current_password[0]}</span>}
                                    </div>

                                    <div className="profile-form-row">
                                        {/* New password */}
                                        <div className="profile-field">
                                            <label>New Password</label>
                                            <div className="profile-input-wrap">
                                                <i className="fas fa-key"></i>
                                                <input
                                                    type={showPwd.new ? 'text' : 'password'}
                                                    name="password" required
                                                    placeholder="Min. 8 characters"
                                                    value={pwd.password} onChange={handlePwd}
                                                />
                                                <button type="button" className="profile-eye" onClick={() => setShowPwd(s => ({ ...s, new: !s.new }))}>
                                                    <i className={`fas fa-eye${showPwd.new ? '-slash' : ''}`}></i>
                                                </button>
                                            </div>
                                            {pwdErrors.password && <span className="profile-error">{pwdErrors.password[0]}</span>}
                                        </div>

                                        {/* Confirm password */}
                                        <div className="profile-field">
                                            <label>Confirm New Password</label>
                                            <div className="profile-input-wrap">
                                                <i className="fas fa-key"></i>
                                                <input
                                                    type={showPwd.confirm ? 'text' : 'password'}
                                                    name="password_confirmation" required
                                                    placeholder="Repeat new password"
                                                    value={pwd.password_confirmation} onChange={handlePwd}
                                                />
                                                <button type="button" className="profile-eye" onClick={() => setShowPwd(s => ({ ...s, confirm: !s.confirm }))}>
                                                    <i className={`fas fa-eye${showPwd.confirm ? '-slash' : ''}`}></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Strength hint */}
                                    {pwd.password && (
                                        <PasswordStrength password={pwd.password} />
                                    )}

                                    <div className="profile-form-footer">
                                        <button type="submit" className="profile-btn-save profile-btn-purple" disabled={pwdLoading}>
                                            {pwdLoading
                                                ? <><i className="fas fa-circle-notch fa-spin"></i> Updating…</>
                                                : <><i className="fas fa-lock"></i> Update Password</>
                                            }
                                        </button>
                                    </div>
                                </form>
                            </div>

                        </div>{/* /profile-forms */}
                    </div>{/* /profile-grid */}
                </div>{/* /db-content */}
            </div>{/* /db-main */}
        </div>
    );
}

function PasswordStrength({ password }) {
    const checks = [
        { label: 'At least 8 characters', pass: password.length >= 8 },
        { label: 'Contains a number',     pass: /\d/.test(password) },
        { label: 'Contains uppercase',    pass: /[A-Z]/.test(password) },
        { label: 'Contains symbol',       pass: /[^a-zA-Z0-9]/.test(password) },
    ];
    const score = checks.filter(c => c.pass).length;
    const colors = ['#ef4444', '#f97316', '#eab308', '#10b981'];
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return (
        <div className="pwd-strength">
            <div className="pwd-strength-bars">
                {[0,1,2,3].map(i => (
                    <div key={i} className="pwd-strength-bar" style={{ background: i < score ? colors[score - 1] : '#e5e7eb' }}></div>
                ))}
            </div>
            <span className="pwd-strength-label" style={{ color: colors[score - 1] || '#aaa' }}>
                {score > 0 ? labels[score - 1] : 'Too short'}
            </span>
            <div className="pwd-checks">
                {checks.map(c => (
                    <div key={c.label} className="pwd-check" style={{ color: c.pass ? '#10b981' : '#aaa' }}>
                        <i className={`fas fa-${c.pass ? 'check' : 'times'}-circle`}></i> {c.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
