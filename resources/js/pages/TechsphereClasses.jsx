import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';
import zoomCssUrl from '@zoom/meetingsdk/dist/ui/zoom-meetingsdk.css?url';

const STATUS_STYLE = {
    active:   { bg: '#d1fae5', color: '#065f46', label: 'Active' },
    archived: { bg: '#f1f5f9', color: '#64748b', label: 'Archived' },
};

function Toast({ toast }) {
    if (!toast) return null;
    const isErr = toast.type === 'error';
    return (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: isErr ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isErr ? '#fca5a5' : '#86efac'}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', maxWidth: 380, fontFamily: 'Poppins,sans-serif' }}>
            <i className={`fas ${isErr ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ color: isErr ? '#dc2626' : '#16a34a', fontSize: '1.1rem', flexShrink: 0 }}></i>
            <span style={{ fontSize: '.83rem', color: isErr ? '#991b1b' : '#15803d' }}>{toast.message}</span>
        </div>
    );
}

/* ── Teacher multi-select dropdown ── */
function TeacherSelect({ teachers, selected, onChange, error }) {
    const [open, setOpen]       = useState(false);
    const [search, setSearch]   = useState('');
    const wrapRef               = useRef(null);

    useEffect(() => {
        const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = id => {
        onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    };

    const filtered = teachers.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    const selectedTeachers = teachers.filter(t => selected.includes(t.id));

    return (
        <div style={{ marginBottom: 18 }} ref={wrapRef}>
            <label style={{ display: 'block', marginBottom: 6, fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', fontWeight: 600, color: '#374151' }}>
                Instructors / Teachers
            </label>

            {/* Trigger box */}
            <div
                onClick={() => setOpen(o => !o)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${error ? '#fca5a5' : open ? '#081f4e' : '#e8ecf4'}`, fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, minHeight: 44, boxSizing: 'border-box', background: '#fff', userSelect: 'none' }}
            >
                {selectedTeachers.length === 0 && (
                    <span style={{ color: '#94a3b8' }}>Select teachers…</span>
                )}
                {selectedTeachers.map(t => (
                    <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '3px 10px', fontSize: '.75rem', fontWeight: 600 }}>
                        <i className="fas fa-user-tie" style={{ fontSize: '.65rem' }}></i>
                        {t.name}
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); toggle(t.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', padding: 0, lineHeight: 1, marginLeft: 2, fontSize: '.7rem' }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </span>
                ))}
                <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '.65rem', marginLeft: 'auto' }}></i>
            </div>

            {/* Dropdown */}
            {open && (
                <div style={{ position: 'absolute', zIndex: 500, width: '100%', marginTop: 4, background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', overflow: 'hidden', maxWidth: 448 }}>
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ position: 'relative' }}>
                            <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.75rem' }}></i>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search teachers..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 8, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {filtered.length === 0 ? (
                            <div style={{ padding: '14px 14px', color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', textAlign: 'center' }}>No teachers found</div>
                        ) : filtered.map(t => {
                            const checked = selected.includes(t.id);
                            return (
                                <div key={t.id} onClick={() => toggle(t.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: checked ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f8fafc', transition: 'background .1s' }}
                                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? '#1d4ed8' : '#cbd5e1'}`, background: checked ? '#1d4ed8' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                        {checked && <i className="fas fa-check" style={{ color: '#fff', fontSize: '.55rem' }}></i>}
                                    </div>
                                    <div style={{ width: 32, height: 32, borderRadius: 50, background: 'linear-gradient(135deg,#081f4e,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span style={{ color: '#fff', fontSize: '.7rem', fontWeight: 700 }}>
                                            {t.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                        </span>
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', fontWeight: 600, color: '#081f4e' }}>{t.name}</div>
                                        {t.email && <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.7rem', color: '#64748b' }}>{t.email}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {selected.length > 0 && (
                        <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', color: '#64748b' }}>{selected.length} selected</span>
                            <button type="button" onClick={() => onChange([])}
                                style={{ background: 'none', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', color: '#dc2626', cursor: 'pointer', padding: 0 }}>
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}

            {error && <p style={{ margin: '4px 0 0', fontSize: '.72rem', color: '#dc2626', fontFamily: 'Poppins,sans-serif' }}>{error[0]}</p>}
        </div>
    );
}

function ClassModal({ open, onClose, onSaved, token, editData, allTeachers }) {
    const blank = { name: '', description: '', capacity: '', venue: '', status: 'active', teacher_ids: [] };
    const [form, setForm]     = useState(blank);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(editData ? {
                name:        editData.name        ?? '',
                description: editData.description ?? '',
                capacity:    editData.capacity    ?? '',
                venue:       editData.venue       ?? '',
                status:      editData.status      ?? 'active',
                teacher_ids: (editData.teachers ?? []).map(t => t.id),
            } : { ...blank });
            setErrors({});
        }
    }, [open, editData]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async e => {
        e.preventDefault();
        setErrors({});
        setSaving(true);
        const url    = editData ? `/api/techsphere-classes/${editData.id}` : '/api/techsphere-classes';
        const method = editData ? 'PUT' : 'POST';
        try {
            const res  = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: JSON.stringify({ ...form, capacity: form.capacity === '' ? null : Number(form.capacity) }),
            });
            const data = await res.json();
            if (!res.ok) { setErrors(data.errors || {}); return; }
            onSaved(data, !editData);
        } catch {
            setErrors({ name: ['An error occurred. Please try again.'] });
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const field = (label, key, type = 'text', required = false, placeholder = '') => (
        <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', marginBottom: 6, fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', fontWeight: 600, color: '#374151' }}>
                {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
            </label>
            <input
                type={type}
                required={required}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${errors[key] ? '#fca5a5' : '#e8ecf4'}`, fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
            {errors[key] && <p style={{ margin: '4px 0 0', fontSize: '.72rem', color: '#dc2626', fontFamily: 'Poppins,sans-serif' }}>{errors[key][0]}</p>}
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>

                {/* Header — fixed */}
                <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#081f4e', fontFamily: 'Poppins,sans-serif' }}>
                        {editData ? 'Edit Techsphere Class' : 'Add Techsphere Class'}
                    </h2>
                    <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px', minHeight: 0 }}>
                    {field('Class Name', 'name', 'text', true, 'e.g. Advanced Web Development')}

                    {/* Teacher multi-select */}
                    <div style={{ position: 'relative' }}>
                        <TeacherSelect
                            teachers={allTeachers}
                            selected={form.teacher_ids}
                            onChange={ids => set('teacher_ids', ids)}
                            error={errors.teacher_ids}
                        />
                    </div>

                    {field('Venue', 'venue', 'text', false, 'Room / location')}
                    {field('Capacity', 'capacity', 'number', false, 'Max students')}

                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', fontWeight: 600, color: '#374151' }}>Description</label>
                        <textarea
                            rows={3}
                            placeholder="Brief description of this class..."
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', fontWeight: 600, color: '#374151' }}>Status</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {[['active', 'Active'], ['archived', 'Archived']].map(([val, lbl]) => (
                                <button key={val} type="button" onClick={() => set('status', val)}
                                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${form.status === val ? '#081f4e' : '#e8ecf4'}`, background: form.status === val ? '#081f4e' : '#f8fafc', color: form.status === val ? '#fff' : '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer' }}>
                                    {lbl}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer — always visible */}
                <div style={{ padding: '16px 26px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
                    <button type="button" onClick={onClose}
                        style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button type="submit" disabled={saving}
                        style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#081f4e,#0d2d6b)', color: '#fff', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {saving ? <><i className="fas fa-circle-notch fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> {editData ? 'Update Class' : 'Create Class'}</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

/* ── Zoom Meeting Modal (embedded via Meeting SDK v6 Component View) ── */
function ZoomMeetingModal({ cls, onClose, token }) {
    const clientRef               = useRef(null);
    const [status, setStatus]     = useState('connecting'); // connecting | ready | error
    const [errorMsg, setErrorMsg] = useState('');

    // Inject Zoom CSS only while this modal is mounted, then remove it
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = zoomCssUrl;
        document.head.appendChild(link);
        return () => { if (document.head.contains(link)) document.head.removeChild(link); };
    }, []);

    useEffect(() => {
        if (!cls) return;
        let active = true;

        const init = async () => {
            try {
                // 1. Get JWT signature from backend (role 1 = host)
                const res  = await fetch(`/api/techsphere-classes/${cls.id}/meeting/signature?role=1`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                });
                const data = await res.json();

                if (!res.ok || !data.signature) {
                    throw new Error(data.message || 'Could not get meeting signature.');
                }

                if (!active) return;

                // 2. Import SDK (code-split — loaded only when meeting opens)
                const { default: ZoomMtgEmbedded } = await import('@zoom/meetingsdk/embedded');

                if (!active) return;

                const client = ZoomMtgEmbedded.createClient();
                clientRef.current = client;

                // 3. Init into the already-rendered DOM element
                const el = document.getElementById('zoomSDKRoot');
                if (!el) throw new Error('Meeting container not found in DOM.');

                await client.init({
                    zoomAppRoot: el,
                    language:    'en-US',
                    patchJsMedia: true,
                    assetPath:   `${window.location.origin}/zoom/lib/av`,
                });

                if (!active) return;

                // 4. Join the meeting
                await client.join({
                    signature:     data.signature,
                    sdkKey:        data.sdk_key,
                    meetingNumber: data.meeting_number,
                    password:      data.password ?? '',
                    userName:      'Host',
                    userEmail:     data.host_email,
                });

                if (active) setStatus('ready');
            } catch (err) {
                if (active) {
                    const msg = err?.reason ?? err?.message ?? JSON.stringify(err);
                    setErrorMsg(msg || 'Failed to join meeting.');
                    setStatus('error');
                }
            }
        };

        init();

        return () => {
            active = false;
            try { clientRef.current?.leaveMeeting(); } catch {}
        };
    }, [cls, token]);

    if (!cls) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', flexDirection: 'column', background: '#1c1c2e' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 24px', background: '#081f4e', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-video" style={{ color: '#60a5fa', fontSize: '1rem' }}></i>
                    </div>
                    <div>
                        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.95rem', color: '#fff' }}>{cls.name}</div>
                        <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.7rem', color: 'rgba(255,255,255,.45)' }}>Meeting ID: {cls.zoom_meeting_id}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {cls.zoom_join_url && (
                        <a href={cls.zoom_join_url} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600, textDecoration: 'none' }}>
                            <i className="fas fa-external-link-alt" style={{ fontSize: '.7rem' }}></i> Open in Zoom
                        </a>
                    )}
                    <button onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 8, background: 'rgba(220,38,38,.25)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
                        <i className="fas fa-times"></i> Close
                    </button>
                </div>
            </div>

            {/* SDK root — must always be in DOM before init() runs */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

                {/* Loading / Error overlay */}
                {status !== 'ready' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, zIndex: 20, background: '#1c1c2e' }}>
                        {status === 'connecting' ? (
                            <>
                                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: '#fe730c' }}></i>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ color: 'rgba(255,255,255,.8)', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', fontWeight: 600, margin: '0 0 6px' }}>Joining meeting…</p>
                                    <p style={{ color: 'rgba(255,255,255,.35)', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', margin: 0 }}>Loading Zoom SDK, allow camera &amp; microphone when prompted</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'rgba(220,38,38,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.8rem', color: '#f87171' }}></i>
                                </div>
                                <div style={{ textAlign: 'center', maxWidth: 440 }}>
                                    <p style={{ color: '#fca5a5', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', fontWeight: 700, margin: '0 0 8px' }}>Could not join meeting</p>
                                    <p style={{ color: 'rgba(255,255,255,.4)', fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', margin: '0 0 20px' }}>{errorMsg}</p>
                                    <a href={cls.zoom_join_url} target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: '#1d4ed8', color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', fontWeight: 700, textDecoration: 'none' }}>
                                        <i className="fas fa-external-link-alt"></i> Open in Zoom App instead
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Zoom SDK renders into this element */}
                <div
                    id="zoomSDKRoot"
                    style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                />
            </div>
        </div>
    );
}

function DeleteModal({ cls, onClose, onDeleted, token }) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/techsphere-classes/${cls.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            if (res.ok) onDeleted(cls.id);
        } finally {
            setDeleting(false);
        }
    };

    if (!cls) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.25)', padding: '28px 28px 26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fas fa-trash-alt" style={{ color: '#dc2626', fontSize: '1.1rem' }}></i>
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontFamily: 'Poppins,sans-serif', fontSize: '1rem', fontWeight: 800, color: '#081f4e' }}>Delete Class</h3>
                        <p style={{ margin: '2px 0 0', fontSize: '.8rem', color: '#64748b', fontFamily: 'Poppins,sans-serif' }}>This action cannot be undone.</p>
                    </div>
                </div>
                <p style={{ margin: '0 0 22px', fontSize: '.85rem', color: '#374151', fontFamily: 'Poppins,sans-serif' }}>
                    Are you sure you want to delete <strong>{cls.name}</strong>?
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                        style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#dc2626', color: '#fff', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? .75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {deleting ? <><i className="fas fa-circle-notch fa-spin"></i> Deleting…</> : <><i className="fas fa-trash-alt"></i> Delete</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Student Enroll Modal ── */
function StudentEnrollModal({ cls, onClose, token, onCountChange }) {
    const [tab, setTab]                     = useState('add');
    const [allStudents, setAllStudents]     = useState([]);
    const [enrolledIds, setEnrolledIds]     = useState([]);
    const [selected, setSelected]           = useState([]);
    const [search, setSearch]               = useState('');
    const [loadingData, setLoadingData]     = useState(true);
    const [saving, setSaving]               = useState(false);
    const [removing, setRemoving]           = useState(null);

    useEffect(() => {
        if (!cls) return;
        setLoadingData(true);
        setSelected([]);
        setSearch('');
        setTab('add');
        Promise.all([
            fetch('/api/techsphere-classes/student-role-users', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }).then(r => r.json()),
            fetch(`/api/techsphere-classes/${cls.id}/students`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }).then(r => r.json()),
        ])
            .then(([stuRes, enrolledRes]) => {
                setAllStudents(Array.isArray(stuRes) ? stuRes : []);
                setEnrolledIds(Array.isArray(enrolledRes) ? enrolledRes.map(s => s.id) : []);
            })
            .catch(() => {})
            .finally(() => setLoadingData(false));
    }, [cls, token]);

    const available        = allStudents.filter(s => !enrolledIds.includes(s.id));
    const enrolledStudents = allStudents.filter(s => enrolledIds.includes(s.id));

    const doSync = async newIds => {
        const res = await fetch(`/api/techsphere-classes/${cls.id}/students/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
            body: JSON.stringify({ student_ids: newIds }),
        });
        return res.ok;
    };

    const handleEnroll = async () => {
        if (!selected.length) return;
        setSaving(true);
        try {
            const newIds = [...enrolledIds, ...selected];
            if (await doSync(newIds)) {
                setEnrolledIds(newIds);
                setSelected([]);
                setSearch('');
                setTab('enrolled');
                onCountChange?.(cls.id, newIds.length);
            }
        } finally { setSaving(false); }
    };

    const handleRemove = async id => {
        setRemoving(id);
        try {
            const newIds = enrolledIds.filter(x => x !== id);
            if (await doSync(newIds)) {
                setEnrolledIds(newIds);
                onCountChange?.(cls.id, newIds.length);
            }
        } finally { setRemoving(null); }
    };

    const toggle = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    if (!cls) return null;

    const filteredAvail    = available.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()));
    const filteredEnrolled = enrolledStudents.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()));

    const tabBtn = (key, icon, label, badge, badgeBg, badgeColor) => (
        <button type="button"
            onClick={() => { setTab(key); setSearch(''); if (key === 'enrolled') setSelected([]); }}
            style={{ flex: 1, padding: '11px 16px', background: 'none', border: 'none', borderBottom: `2.5px solid ${tab === key ? '#081f4e' : 'transparent'}`, fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: tab === key ? 700 : 500, color: tab === key ? '#081f4e' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'color .15s' }}>
            <i className={icon}></i>
            {label}
            {!loadingData && (
                <span style={{ background: badgeBg, color: badgeColor, borderRadius: 20, padding: '1px 8px', fontSize: '.68rem', fontWeight: 700 }}>{badge}</span>
            )}
        </button>
    );

    const avatar = (s, gradient) => {
        const initials = s.name ? s.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
        return (
            <div style={{ width: 36, height: 36, borderRadius: 50, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: '.72rem', fontWeight: 700 }}>{initials}</span>
            </div>
        );
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>

                {/* Header */}
                <div style={{ padding: '20px 26px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#081f4e', fontFamily: 'Poppins,sans-serif' }}>Manage Students</h2>
                        <p style={{ margin: '3px 0 0', fontSize: '.78rem', color: '#64748b', fontFamily: 'Poppins,sans-serif' }}>{cls.name}</p>
                    </div>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e8ecf4', marginTop: 14, flexShrink: 0 }}>
                    {tabBtn('add',      'fas fa-user-plus', 'Add Students', available.length,   tab === 'add' ? '#081f4e' : '#e8ecf4', tab === 'add' ? '#fff' : '#64748b')}
                    {tabBtn('enrolled', 'fas fa-users',     'Enrolled',     enrolledIds.length, tab === 'enrolled' ? '#16a34a' : '#d1fae5', tab === 'enrolled' ? '#fff' : '#16a34a')}
                </div>

                {/* Search */}
                <div style={{ padding: '12px 26px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                        <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.8rem' }}></i>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {loadingData ? (
                        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.6rem', color: '#fe730c' }}></i>
                            <p style={{ color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', margin: 0 }}>Loading…</p>
                        </div>
                    ) : tab === 'add' ? (
                        filteredAvail.length === 0 ? (
                            <div style={{ padding: '44px 20px', textAlign: 'center', color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem' }}>
                                <i className="fas fa-user-check" style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }}></i>
                                {available.length === 0 ? 'All students with student role are already enrolled.' : 'No students match your search.'}
                            </div>
                        ) : filteredAvail.map(s => {
                            const checked = selected.includes(s.id);
                            return (
                                <div key={s.id} onClick={() => toggle(s.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 26px', cursor: 'pointer', background: checked ? '#f0fdf4' : 'transparent', borderBottom: '1px solid #f8fafc', transition: 'background .12s' }}
                                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = checked ? '#f0fdf4' : 'transparent'; }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? '#16a34a' : '#cbd5e1'}`, background: checked ? '#16a34a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                                        {checked && <i className="fas fa-check" style={{ color: '#fff', fontSize: '.55rem' }}></i>}
                                    </div>
                                    {avatar(s, 'linear-gradient(135deg,#065f46,#059669)')}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', fontWeight: 600, color: '#081f4e' }}>{s.name}</div>
                                        {s.email && <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', color: '#64748b' }}><i className="fas fa-envelope" style={{ marginRight: 4, fontSize: '.65rem' }}></i>{s.email}</div>}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        filteredEnrolled.length === 0 ? (
                            <div style={{ padding: '44px 20px', textAlign: 'center', color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem' }}>
                                <i className="fas fa-users" style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }}></i>
                                {enrolledIds.length === 0 ? 'No students enrolled yet.' : 'No students match your search.'}
                            </div>
                        ) : filteredEnrolled.map(s => {
                            const isRemoving = removing === s.id;
                            return (
                                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 26px', borderBottom: '1px solid #f8fafc' }}>
                                    {avatar(s, 'linear-gradient(135deg,#081f4e,#1d4ed8)')}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', fontWeight: 600, color: '#081f4e' }}>{s.name}</div>
                                        {s.email && <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', color: '#64748b' }}><i className="fas fa-envelope" style={{ marginRight: 4, fontSize: '.65rem' }}></i>{s.email}</div>}
                                    </div>
                                    <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '3px 10px', fontSize: '.7rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif', flexShrink: 0 }}>Enrolled</span>
                                    <button type="button" onClick={() => handleRemove(s.id)} disabled={isRemoving}
                                        style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: isRemoving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: isRemoving ? .6 : 1 }}>
                                        {isRemoving ? <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '.65rem' }}></i> : <i className="fas fa-times" style={{ fontSize: '.7rem' }}></i>}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 26px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0 }}>
                    {tab === 'add' ? (
                        <>
                            {selected.length > 0 && (
                                <button type="button" onClick={() => setSelected([])}
                                    style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                    Clear
                                </button>
                            )}
                            <button type="button" onClick={onClose}
                                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 600, cursor: 'pointer' }}>
                                Close
                            </button>
                            <button type="button" onClick={handleEnroll} disabled={saving || !selected.length}
                                style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#065f46,#059669)', color: '#fff', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 700, cursor: (saving || !selected.length) ? 'not-allowed' : 'pointer', opacity: (saving || !selected.length) ? .6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {saving ? <><i className="fas fa-circle-notch fa-spin"></i> Saving…</> : <><i className="fas fa-user-plus"></i> Enroll{selected.length > 0 ? ` (${selected.length})` : ''}</>}
                            </button>
                        </>
                    ) : (
                        <button type="button" onClick={onClose}
                            style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 600, cursor: 'pointer' }}>
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TechsphereClasses() {
    const { token, can } = useAuth();

    const [classes, setClasses]     = useState([]);
    const [allTeachers, setTeachers] = useState([]);
    const [meta, setMeta]           = useState({ total: 0, last_page: 1 });
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [status, setStatus]       = useState('');
    const [page, setPage]           = useState(1);
    const [perPage, setPerPage]     = useState(15);
    const [toast, setToast]         = useState(null);
    const [addModal, setAddModal]     = useState(false);
    const [editCls, setEditCls]       = useState(null);
    const [deleteCls, setDeleteCls]   = useState(null);
    const [enrollCls, setEnrollCls]   = useState(null);
    const [zoomCls, setZoomCls]       = useState(null);
    const [creatingMeeting, setCreatingMeeting] = useState(null); // class id being created
    const [deletingMeeting, setDeletingMeeting] = useState(null); // class id being deleted

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    /* Load teachers once */
    useEffect(() => {
        fetch('/api/teachers?per_page=500', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => setTeachers(Array.isArray(d.data) ? d.data : []))
            .catch(() => {});
    }, [token]);

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ page, per_page: perPage });
        if (search) params.set('search', search);
        if (status) params.set('status', status);

        fetch(`/api/techsphere-classes?${params}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => { setClasses(d.data ?? []); setMeta(d.meta ?? { total: 0, last_page: 1 }); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [token, search, status, page, perPage]);

    useEffect(() => { load(); }, [load]);

    const handleSaved = (data, isNew) => {
        if (isNew) {
            setClasses(prev => [data, ...prev]);
            showToast('Class created successfully.');
        } else {
            setClasses(prev => prev.map(c => c.id === data.id ? data : c));
            showToast('Class updated successfully.');
        }
        setAddModal(false);
        setEditCls(null);
    };

    const handleDeleted = id => {
        setClasses(prev => prev.filter(c => c.id !== id));
        setDeleteCls(null);
        showToast('Class deleted.');
    };

    const handleEnrollCountChange = (classId, count) => {
        setClasses(prev => prev.map(c => c.id === classId ? { ...c, enrolled_users_count: count } : c));
    };

    const handleCreateMeeting = async (cls) => {
        setCreatingMeeting(cls.id);
        try {
            const res  = await fetch(`/api/techsphere-classes/${cls.id}/meeting`, {
                method:  'POST',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, ...data } : c));
                showToast('Zoom meeting created successfully.');
            } else {
                showToast(data.message || 'Failed to create meeting.', 'error');
            }
        } catch {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setCreatingMeeting(null);
        }
    };

    const handleDeleteMeeting = async (cls) => {
        if (!window.confirm(`Remove the Zoom meeting for "${cls.name}"? This will delete it from Zoom.`)) return;
        setDeletingMeeting(cls.id);
        try {
            const res  = await fetch(`/api/techsphere-classes/${cls.id}/meeting`, {
                method:  'DELETE',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                setClasses(prev => prev.map(c => c.id === cls.id
                    ? { ...c, zoom_meeting_id: null, zoom_join_url: null, zoom_start_url: null, zoom_password: null }
                    : c));
                showToast('Zoom meeting removed.');
            } else {
                showToast(data.message || 'Failed to remove meeting.', 'error');
            }
        } catch {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setDeletingMeeting(null);
        }
    };

    if (!can('techsphere_classes', 'view')) return (
        <div className="db-wrap"><DashboardSidebar /><div className="db-main"><DashboardNavbar page="Techsphere Classes" /><div className="db-content"><AccessDenied /></div></div></div>
    );

    const totalActive   = classes.filter(c => c.status === 'active').length;
    const totalArchived = classes.filter(c => c.status === 'archived').length;
    const pages = Array.from({ length: meta.last_page }, (_, i) => i + 1);

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="Techsphere Classes" />
                <div className="db-content">
                    <Toast toast={toast} />

                    {/* Header */}
                    <div className="db-topbar">
                        <div>
                            <h1 className="db-page-title"><i className="fas fa-laptop-code"></i> Techsphere Classes</h1>
                            <p className="db-page-sub">Manage online training classes, teachers and enrolled students</p>
                        </div>
                        {can('techsphere_classes', 'create') && (
                            <button className="db-btn-primary" onClick={() => setAddModal(true)}>
                                <i className="fas fa-plus"></i> Add Class
                            </button>
                        )}
                    </div>
                    <div className="schools-stats-row">
                        {[
                            { label: 'Total Classes', value: meta.total,    icon: 'fas fa-laptop-code',  color: '#1d4ed8', borderColor: '#3b82f6' },
                            { label: 'Active',         value: totalActive,   icon: 'fas fa-check-circle', color: '#16a34a', borderColor: '#10b981' },
                            { label: 'Archived',       value: totalArchived, icon: 'fas fa-archive',      color: '#64748b', borderColor: '#94a3b8' },
                        ].map(s => (
                            <div key={s.label} className="schools-stat-card" style={{ borderLeftColor: s.borderColor }}>
                                <div className="schools-stat-icon" style={{ background: s.borderColor }}>
                                    <i className={s.icon}></i>
                                </div>
                                <div>
                                    <div className="schools-stat-value">{s.value}</div>
                                    <div className="schools-stat-label">{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8ecf4', padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.82rem' }}></i>
                            <input
                                type="text"
                                placeholder="Search by name, teacher or venue..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 9, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                            style={{ padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', outline: 'none', background: '#fff', minWidth: 130 }}>
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                        </select>
                        <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                            style={{ padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', outline: 'none', background: '#fff' }}>
                            {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                        </select>
                    </div>

                    {/* Table */}
                    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8ecf4', overflow: 'hidden' }}>
                        {loading ? (
                            <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: '#fe730c' }}></i>
                                <p style={{ color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', margin: 0 }}>Loading classes…</p>
                            </div>
                        ) : classes.length === 0 ? (
                            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontFamily: 'Poppins,sans-serif' }}>
                                <i className="fas fa-chalkboard" style={{ fontSize: '2.5rem', marginBottom: 14, display: 'block' }}></i>
                                <p style={{ fontSize: '.9rem', margin: 0 }}>No classes found.</p>
                                {can('techsphere_classes', 'create') && (
                                    <button onClick={() => setAddModal(true)} style={{ marginTop: 16, padding: '10px 22px', borderRadius: 10, background: '#081f4e', color: '#fff', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', fontWeight: 700, cursor: 'pointer' }}>
                                        Add First Class
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem' }}>
                                    <thead>
                                        <tr style={{ background: '#081f4e' }}>
                                            {['Class Name', 'Teachers', 'Venue', 'Capacity', 'Status', 'Zoom Meeting', 'Created', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#fff', fontSize: '.82rem', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classes.map((cls, idx) => {
                                            const st = STATUS_STYLE[cls.status] ?? STATUS_STYLE.active;
                                            const teachers = cls.teachers ?? [];
                                            return (
                                                <tr key={cls.id} style={{ borderBottom: idx < classes.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#081f4e,#0d2d6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <i className="fas fa-chalkboard" style={{ color: '#fff', fontSize: '.82rem' }}></i>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: '#081f4e' }}>{cls.name}</div>
                                                                {cls.description && <div style={{ fontSize: '.72rem', color: '#94a3b8', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.description}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        {teachers.length === 0 ? (
                                                            <span style={{ color: '#cbd5e1' }}>—</span>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                                                {teachers.map(t => (
                                                                    <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '3px 9px', fontSize: '.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                        <i className="fas fa-user-tie" style={{ fontSize: '.6rem' }}></i>
                                                                        {t.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', color: '#374151' }}>{cls.venue || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                                                    <td style={{ padding: '14px 16px', color: '#374151' }}>{cls.capacity ?? <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: st.bg, color: st.color, fontSize: '.72rem', fontWeight: 700 }}>
                                                            <i className={cls.status === 'active' ? 'fas fa-circle' : 'fas fa-archive'} style={{ fontSize: '.5rem' }}></i>
                                                            {st.label}
                                                        </span>
                                                    </td>

                                                    {/* Zoom Meeting cell */}
                                                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                                        {cls.zoom_meeting_id ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <button onClick={() => setZoomCls(cls)}
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                                    <i className="fas fa-video" style={{ fontSize: '.7rem' }}></i>
                                                                    Join Meeting
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteMeeting(cls)}
                                                                    disabled={deletingMeeting === cls.id}
                                                                    title="Remove Zoom meeting"
                                                                    style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: deletingMeeting === cls.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deletingMeeting === cls.id ? .6 : 1, flexShrink: 0 }}>
                                                                    {deletingMeeting === cls.id
                                                                        ? <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '.6rem' }}></i>
                                                                        : <i className="fas fa-trash-alt" style={{ fontSize: '.6rem' }}></i>}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleCreateMeeting(cls)}
                                                                disabled={creatingMeeting === cls.id}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', fontWeight: 600, cursor: creatingMeeting === cls.id ? 'not-allowed' : 'pointer', opacity: creatingMeeting === cls.id ? .7 : 1 }}>
                                                                {creatingMeeting === cls.id
                                                                    ? <><i className="fas fa-circle-notch fa-spin" style={{ fontSize: '.7rem' }}></i> Creating…</>
                                                                    : <><i className="fas fa-plus" style={{ fontSize: '.7rem' }}></i> Create Meeting</>}
                                                            </button>
                                                        )}
                                                    </td>

                                                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '.75rem', whiteSpace: 'nowrap' }}>
                                                        {new Date(cls.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                            {/* Enroll students */}
                                                            <button onClick={() => setEnrollCls(cls)} title="Enroll Students"
                                                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                                <i className="fas fa-user-plus" style={{ fontSize: '.72rem' }}></i>
                                                                Students
                                                                {cls.enrolled_users_count > 0 && (
                                                                    <span style={{ background: '#16a34a', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '.65rem', fontWeight: 800 }}>{cls.enrolled_users_count}</span>
                                                                )}
                                                            </button>
                                                            {can('techsphere_classes', 'edit') && (
                                                                <button onClick={() => setEditCls(cls)} title="Edit"
                                                                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className="fas fa-pen" style={{ fontSize: '.75rem' }}></i>
                                                                </button>
                                                            )}
                                                            {can('techsphere_classes', 'delete') && (
                                                                <button onClick={() => setDeleteCls(cls)} title="Delete"
                                                                    style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <i className="fas fa-trash-alt" style={{ fontSize: '.75rem' }}></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {meta.last_page > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20, flexWrap: 'wrap' }}>
                            <button onClick={() => setPage(1)} disabled={page === 1}
                                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem' }}>
                                <i className="fas fa-angle-double-left"></i>
                            </button>
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: page === 1 ? '#cbd5e1' : '#374151', cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem' }}>
                                <i className="fas fa-angle-left"></i>
                            </button>
                            {pages.slice(Math.max(0, page - 3), Math.min(meta.last_page, page + 2)).map(p => (
                                <button key={p} onClick={() => setPage(p)}
                                    style={{ padding: '7px 13px', borderRadius: 8, border: `1.5px solid ${p === page ? '#081f4e' : '#e8ecf4'}`, background: p === page ? '#081f4e' : '#f8fafc', color: p === page ? '#fff' : '#374151', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: p === page ? 700 : 400 }}>
                                    {p}
                                </button>
                            ))}
                            <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}
                                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: page === meta.last_page ? '#cbd5e1' : '#374151', cursor: page === meta.last_page ? 'default' : 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem' }}>
                                <i className="fas fa-angle-right"></i>
                            </button>
                            <button onClick={() => setPage(meta.last_page)} disabled={page === meta.last_page}
                                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: page === meta.last_page ? '#cbd5e1' : '#374151', cursor: page === meta.last_page ? 'default' : 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem' }}>
                                <i className="fas fa-angle-double-right"></i>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ClassModal
                open={addModal || !!editCls}
                onClose={() => { setAddModal(false); setEditCls(null); }}
                onSaved={handleSaved}
                token={token}
                editData={editCls}
                allTeachers={allTeachers}
            />
            <DeleteModal cls={deleteCls} onClose={() => setDeleteCls(null)} onDeleted={handleDeleted} token={token} />
            <StudentEnrollModal cls={enrollCls} onClose={() => setEnrollCls(null)} token={token} onCountChange={handleEnrollCountChange} />
            {zoomCls && <ZoomMeetingModal cls={zoomCls} onClose={() => setZoomCls(null)} token={token} />}
        </div>
    );
}
