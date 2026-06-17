import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Toast ── */
function Toast({ message, type, onClose }) {
    if (!message) return null;
    const err = type === 'error';
    return (
        <div className="profile-toast" style={{ background: err ? '#fef2f2' : '#f0fdf4', borderColor: err ? '#fca5a5' : '#86efac' }}>
            <i className={`fas ${err ? 'fa-exclamation-circle' : 'fa-check-circle'}`} style={{ color: err ? '#dc2626' : '#16a34a' }}></i>
            <span style={{ color: err ? '#991b1b' : '#15803d' }}>{message}</span>
            <button onClick={onClose} className="profile-toast-close"><i className="fas fa-times"></i></button>
        </div>
    );
}

/* ── Status config ── */
const STATUS = {
    pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.3)',  icon: 'fas fa-clock',        gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    approved: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)',  icon: 'fas fa-check-circle', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
    rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)',   icon: 'fas fa-times-circle', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
};

const fmt = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StatusBadge({ status }) {
    const s = STATUS[status] ?? STATUS.pending;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
            <i className={s.icon} style={{ fontSize: '.62rem' }}></i> {s.label}
        </span>
    );
}

/* ─────────────────────────────────────────
   ENROLL MODAL
───────────────────────────────────────── */
function EnrollField({ label, required, error, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, color: '#475569', fontFamily: 'Poppins,sans-serif', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                {label}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
            </label>
            {children}
            {error && <span style={{ fontSize: '.7rem', color: '#dc2626', fontFamily: 'Poppins,sans-serif' }}>{error}</span>}
        </div>
    );
}
const enrollInputStyle = (err) => ({ width: '100%', padding: '9px 12px', border: `1.5px solid ${err ? '#fca5a5' : '#e8eaf0'}`, borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', outline: 'none', color: '#374151', background: '#f8faff', boxSizing: 'border-box' });

const EMPTY_FORM = {
    name: '', email: '', phone: '',
    course_id: '', intake_id: '', school_level_id: '', school_id: '', class_id: '',
    sponsorship: 'self',
    sponsor_name: '', sponsor_email: '', sponsor_phone: '',
    status: 'approved',
};

function EnrollModal({ token, onSaved, onClose }) {
    const [form, setForm]       = useState(EMPTY_FORM);
    const [errors, setErrors]   = useState({});
    const [saving, setSaving]   = useState(false);

    const [courses, setCourses]       = useState([]);
    const [intakes, setIntakes]       = useState([]);
    const [categories, setCategories] = useState([]);
    const [levels, setLevels]         = useState([]);
    const [schools, setSchools]       = useState([]);
    const [classes, setClasses]       = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [coursesLoading, setCoursesLoading] = useState(false);

    useEffect(() => {
        const h = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
        Promise.all([
            fetch('/api/active-intakes',             { headers: h }).then(r => r.json()),
            fetch('/api/public-course-categories',   { headers: h }).then(r => r.json()),
            fetch('/api/public-school-levels',       { headers: h }).then(r => r.json()),
            fetch('/api/public-schools',             { headers: h }).then(r => r.json()),
        ]).then(([i, cat, l, s]) => {
            setIntakes(Array.isArray(i) ? i : (i.data ?? []));
            setCategories(Array.isArray(cat) ? cat : (cat.data ?? []));
            setLevels(Array.isArray(l) ? l : (l.data ?? []));
            setSchools(Array.isArray(s) ? s : (s.data ?? []));
        });
    }, [token]);

    useEffect(() => {
        if (!selectedCategory) { setCourses([]); set('course_id', ''); return; }
        setCoursesLoading(true);
        fetch(`/api/admin/courses?per_page=200&category=${selectedCategory}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
            .then(r => r.json())
            .then(d => { setCourses(d.data ?? d); set('course_id', ''); })
            .finally(() => setCoursesLoading(false));
    }, [selectedCategory, token]);

    useEffect(() => {
        if (!form.school_level_id) { setClasses([]); set('class_id', ''); return; }
        fetch(`/api/public-classes?level_id=${form.school_level_id}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
            .then(r => r.json())
            .then(c => { setClasses(Array.isArray(c) ? c : (c.data ?? [])); set('class_id', ''); });
    }, [form.school_level_id, token]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const submit = async () => {
        const clientErrors = {};
        if (!form.email.trim())    clientErrors.email     = ['Email is required.'];
        if (!form.phone.trim())    clientErrors.phone     = ['Phone number is required.'];
        if (!form.course_id)       clientErrors.course_id = ['Course is required.'];
        if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; }
        setSaving(true); setErrors({});
        try {
            const res  = await fetch('/api/enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setErrors(data.errors ?? {}); setSaving(false); return; }
            onSaved(data.enrollment);
        } catch { setSaving(false); }
    };

    const Field = EnrollField;
    const inputStyle = enrollInputStyle;
    const selectStyle = enrollInputStyle;

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 900, width: '95vw' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-user-plus" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, fontFamily: 'Poppins,sans-serif' }}>Enroll Student</h3>
                            <p style={{ margin: 0, fontSize: '.73rem', color: 'rgba(255,255,255,.55)', fontFamily: 'Poppins,sans-serif' }}>Manually enroll a student into a course</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><i className="fas fa-times"></i></button>
                </div>

                <div className="modal-body" style={{ padding: '28px 32px', maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Student info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}></div>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Student Details</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Field label="Full Name" error={errors.name?.[0]}>
                            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. John Doe" style={inputStyle(errors.name)} />
                        </Field>
                        <Field label="Phone" required error={errors.phone?.[0]}>
                            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 0700000000" style={inputStyle(errors.phone)} />
                        </Field>
                    </div>
                    <Field label="Email" required error={errors.email?.[0]}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input value={form.email} onChange={e => set('email', e.target.value)} type="email" placeholder="student@email.com" style={{ ...inputStyle(errors.email), flex: 1 }} />
                            <button type="button" onClick={() => set('email', `${String(Math.floor(1000 + Math.random() * 9000))}@tti.co.ke`)}
                                style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e8eaf0', background: '#f8faff', color: '#475569', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s', flexShrink: 0 }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#081f4e'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#081f4e'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e8eaf0'; }}
                                title="Generate a random TTI email">
                                <i className="fas fa-magic" style={{ marginRight: 5 }}></i>Generate
                            </button>
                        </div>
                    </Field>

                    {/* Course & Intake */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#fe730c,#f97316)' }}></div>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Course & Intake</span>
                    </div>
                    {/* Row 1: Intake + Category */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Field label="Intake" error={errors.intake_id?.[0]}>
                            <select value={form.intake_id} onChange={e => set('intake_id', e.target.value)} style={selectStyle(errors.intake_id)}>
                                <option value="">Select intake…</option>
                                {intakes.map(i => <option key={i.id} value={i.id}>{i.intake_name}</option>)}
                            </select>
                        </Field>
                        <Field label="Category">
                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={selectStyle(false)}>
                                <option value="">Select category…</option>
                                {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>
                    {/* Row 2: Course (dependent on category) */}
                    <Field label="Course" required error={errors.course_id?.[0]}>
                        <select value={form.course_id} onChange={e => set('course_id', e.target.value)} style={{ ...selectStyle(errors.course_id), opacity: !selectedCategory ? .55 : 1 }} disabled={!selectedCategory || coursesLoading}>
                            <option value="">
                                {!selectedCategory ? 'Select a category first…' : coursesLoading ? 'Loading…' : courses.length === 0 ? 'No courses in this category' : 'Select course…'}
                            </option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </Field>

                    {/* School info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#10b981,#059669)' }}></div>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>School Details</span>
                    </div>
                    {/* Step 1: School Level */}
                    <Field label="School Level" error={errors.school_level_id?.[0]}>
                        <select value={form.school_level_id} onChange={e => set('school_level_id', e.target.value)} style={selectStyle(errors.school_level_id)}>
                            <option value="">Select level…</option>
                            {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </Field>
                    {/* Step 2: School + Class (both depend on level) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Field label="School" error={errors.school_id?.[0]}>
                            <select value={form.school_id} onChange={e => set('school_id', e.target.value)} style={selectStyle(errors.school_id)}>
                                <option value="">Select school…</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
                            </select>
                        </Field>
                        <Field label="Class" error={errors.class_id?.[0]}>
                            <select value={form.class_id} onChange={e => set('class_id', e.target.value)} style={{ ...selectStyle(errors.class_id), opacity: !form.school_level_id ? .55 : 1 }} disabled={!form.school_level_id}>
                                <option value="">{!form.school_level_id ? 'Select a level first…' : classes.length === 0 ? 'No classes for this level' : 'Select class…'}</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>

                    {/* Sponsorship */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}></div>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Sponsorship</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {['self', 'guardian'].map(s => (
                            <button key={s} onClick={() => set('sponsorship', s)} type="button"
                                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${form.sponsorship === s ? '#7c3aed' : '#e8eaf0'}`, background: form.sponsorship === s ? 'rgba(139,92,246,.1)' : '#fff', color: form.sponsorship === s ? '#7c3aed' : '#94a3b8', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer', transition: 'all .2s' }}>
                                <i className={`fas ${s === 'self' ? 'fa-user' : 'fa-user-friends'}`} style={{ marginRight: 6 }}></i>
                                {s === 'self' ? 'Self-Sponsored' : 'Guardian / Sponsor'}
                            </button>
                        ))}
                    </div>
                    {form.sponsorship === 'guardian' && (
                        <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <Field label="Guardian Name" error={errors.sponsor_name?.[0]}>
                                    <input value={form.sponsor_name} onChange={e => set('sponsor_name', e.target.value)} style={inputStyle(errors.sponsor_name)} />
                                </Field>
                                <Field label="Guardian Phone" error={errors.sponsor_phone?.[0]}>
                                    <input value={form.sponsor_phone} onChange={e => set('sponsor_phone', e.target.value)} style={inputStyle(errors.sponsor_phone)} />
                                </Field>
                            </div>
                            <Field label="Guardian Email (optional)" error={errors.sponsor_email?.[0]}>
                                <input value={form.sponsor_email} onChange={e => set('sponsor_email', e.target.value)} type="email" style={inputStyle(errors.sponsor_email)} />
                            </Field>
                        </div>
                    )}

                    {/* Initial status */}
                    <Field label="Initial Status" error={errors.status?.[0]}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                            {['pending', 'approved', 'rejected'].map(s => {
                                const cfg = STATUS[s]; const active = form.status === s;
                                return (
                                    <button key={s} onClick={() => set('status', s)} type="button"
                                        style={{ padding: '10px 8px', borderRadius: 10, border: `2px solid ${active ? cfg.color : '#e8eaf0'}`, background: active ? cfg.bg : '#fff', color: active ? cfg.color : '#94a3b8', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.75rem', cursor: 'pointer', transition: 'all .2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? cfg.gradient : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className={cfg.icon} style={{ color: active ? '#fff' : '#cbd5e1', fontSize: '.75rem' }}></i>
                                        </div>
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                </div>

                <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafbff' }}>
                    <button className="btn-modal-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-modal-save" onClick={submit} disabled={saving}>
                        {saving ? <><i className="fas fa-spinner fa-spin"></i> Enrolling…</> : <><i className="fas fa-user-plus"></i> Enroll Student</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   EDIT ENROLLMENT MODAL
───────────────────────────────────────── */
function EditEnrollmentModal({ enrollment, token, onSaved, onClose }) {
    const [form, setForm] = useState({
        name:          enrollment.name          ?? '',
        email:         enrollment.email         ?? '',
        phone:         enrollment.phone         ?? '',
        course_id:     enrollment.course_id     ?? '',
        intake_id:     enrollment.intake_id     ?? '',
        school_level_id: enrollment.school_level_id ?? '',
        school_id:     enrollment.school_id     ?? '',
        class_id:      enrollment.class_id      ?? '',
        sponsorship:   enrollment.sponsorship   ?? 'self',
        sponsor_name:  enrollment.sponsor_name  ?? '',
        sponsor_email: enrollment.sponsor_email ?? '',
        sponsor_phone: enrollment.sponsor_phone ?? '',
    });
    const [errors, setErrors]   = useState({});
    const [saving, setSaving]   = useState(false);
    const [courses, setCourses]       = useState([]);
    const [intakes, setIntakes]       = useState([]);
    const [categories, setCategories] = useState([]);
    const [levels, setLevels]         = useState([]);
    const [schools, setSchools]       = useState([]);
    const [classes, setClasses]       = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const Field = EnrollField;
    const inputStyle = enrollInputStyle;
    const selectStyle = enrollInputStyle;

    useEffect(() => {
        const h = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
        Promise.all([
            fetch('/api/active-intakes',           { headers: h }).then(r => r.json()),
            fetch('/api/public-course-categories', { headers: h }).then(r => r.json()),
            fetch('/api/public-school-levels',     { headers: h }).then(r => r.json()),
            fetch('/api/public-schools',           { headers: h }).then(r => r.json()),
            fetch('/api/admin/courses?per_page=200', { headers: h }).then(r => r.json()),
        ]).then(([i, cat, l, s, c]) => {
            setIntakes(Array.isArray(i) ? i : (i.data ?? []));
            setCategories(Array.isArray(cat) ? cat : (cat.data ?? []));
            setLevels(Array.isArray(l) ? l : (l.data ?? []));
            setSchools(Array.isArray(s) ? s : (s.data ?? []));
            setCourses(c.data ?? c);
        });
    }, [token]);

    useEffect(() => {
        if (!form.school_level_id) { setClasses([]); return; }
        fetch(`/api/public-classes?level_id=${form.school_level_id}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
            .then(r => r.json())
            .then(d => setClasses(Array.isArray(d) ? d : (d.data ?? [])));
    }, [form.school_level_id, token]);

    useEffect(() => {
        if (!selectedCategory) return;
        fetch(`/api/admin/courses?per_page=200&category=${selectedCategory}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
            .then(r => r.json())
            .then(d => { setCourses(d.data ?? d); });
    }, [selectedCategory, token]);

    const submit = async () => {
        const clientErrors = {};
        if (!form.name.trim())  clientErrors.name  = ['Full name is required.'];
        if (!form.email.trim()) clientErrors.email = ['Email is required.'];
        if (!form.phone.trim()) clientErrors.phone = ['Phone number is required.'];
        if (!form.course_id)    clientErrors.course_id = ['Course is required.'];
        if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; }
        setSaving(true); setErrors({});
        try {
            const res  = await fetch(`/api/enrollments/${enrollment.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setErrors(data.errors ?? {}); setSaving(false); return; }
            onSaved(data.enrollment);
        } catch { setSaving(false); }
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 900, width: '95vw' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-edit" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, fontFamily: 'Poppins,sans-serif' }}>Edit Enrollment</h3>
                            <p style={{ margin: 0, fontSize: '.73rem', color: 'rgba(255,255,255,.55)', fontFamily: 'Poppins,sans-serif' }}>Application #{enrollment.id} · {enrollment.name}</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><i className="fas fa-times"></i></button>
                </div>

                <div className="modal-body" style={{ padding: '28px 32px', maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Student Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}></div>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Student Details</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Field label="Full Name" required error={errors.name?.[0]}>
                            <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle(errors.name)} />
                        </Field>
                        <Field label="Phone" required error={errors.phone?.[0]}>
                            <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle(errors.phone)} />
                        </Field>
                    </div>
                    <Field label="Email" required error={errors.email?.[0]}>
                        <input value={form.email} onChange={e => set('email', e.target.value)} type="email" style={inputStyle(errors.email)} />
                    </Field>

                    {/* Course & Intake */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#fe730c,#f97316)' }}></div>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Course & Intake</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Field label="Intake" error={errors.intake_id?.[0]}>
                            <select value={form.intake_id} onChange={e => set('intake_id', e.target.value)} style={selectStyle(errors.intake_id)}>
                                <option value="">Select intake…</option>
                                {intakes.map(i => <option key={i.id} value={i.id}>{i.intake_name}</option>)}
                            </select>
                        </Field>
                        <Field label="Filter by Category">
                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={selectStyle(false)}>
                                <option value="">All categories</option>
                                {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Course" required error={errors.course_id?.[0]}>
                        <select value={form.course_id} onChange={e => set('course_id', e.target.value)} style={selectStyle(errors.course_id)}>
                            <option value="">Select course…</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </Field>

                    {/* School Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#10b981,#059669)' }}></div>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>School Details</span>
                    </div>
                    <Field label="School Level" error={errors.school_level_id?.[0]}>
                        <select value={form.school_level_id} onChange={e => { set('school_level_id', e.target.value); set('class_id', ''); }} style={selectStyle(errors.school_level_id)}>
                            <option value="">Select level…</option>
                            {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </Field>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Field label="School" error={errors.school_id?.[0]}>
                            <select value={form.school_id} onChange={e => set('school_id', e.target.value)} style={selectStyle(errors.school_id)}>
                                <option value="">Select school…</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.school_name}</option>)}
                            </select>
                        </Field>
                        <Field label="Class" error={errors.class_id?.[0]}>
                            <select value={form.class_id} onChange={e => set('class_id', e.target.value)} style={{ ...selectStyle(errors.class_id), opacity: !form.school_level_id ? .55 : 1 }} disabled={!form.school_level_id}>
                                <option value="">{!form.school_level_id ? 'Select a level first…' : 'Select class…'}</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>

                    {/* Sponsorship */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}></div>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Sponsorship</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {['self', 'guardian'].map(s => (
                            <button key={s} onClick={() => set('sponsorship', s)} type="button"
                                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${form.sponsorship === s ? '#7c3aed' : '#e8eaf0'}`, background: form.sponsorship === s ? 'rgba(139,92,246,.1)' : '#fff', color: form.sponsorship === s ? '#7c3aed' : '#94a3b8', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer', transition: 'all .2s' }}>
                                <i className={`fas ${s === 'self' ? 'fa-user' : 'fa-user-friends'}`} style={{ marginRight: 6 }}></i>
                                {s === 'self' ? 'Self-Sponsored' : 'Guardian / Sponsor'}
                            </button>
                        ))}
                    </div>
                    {form.sponsorship === 'guardian' && (
                        <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <Field label="Guardian Name" error={errors.sponsor_name?.[0]}>
                                    <input value={form.sponsor_name} onChange={e => set('sponsor_name', e.target.value)} style={inputStyle(errors.sponsor_name)} />
                                </Field>
                                <Field label="Guardian Phone" error={errors.sponsor_phone?.[0]}>
                                    <input value={form.sponsor_phone} onChange={e => set('sponsor_phone', e.target.value)} style={inputStyle(errors.sponsor_phone)} />
                                </Field>
                            </div>
                            <Field label="Guardian Email (optional)" error={errors.sponsor_email?.[0]}>
                                <input value={form.sponsor_email} onChange={e => set('sponsor_email', e.target.value)} type="email" style={inputStyle(errors.sponsor_email)} />
                            </Field>
                        </div>
                    )}
                </div>

                <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafbff' }}>
                    <button className="btn-modal-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-modal-save" onClick={submit} disabled={saving}>
                        {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> Save Changes</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   DETAIL MODAL
───────────────────────────────────────── */
function DetailModal({ enrollment, onSave, onClose, token, canUpdate, canApprove, canReject }) {
    const [status, setStatus] = useState(enrollment.status);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (status === enrollment.status) { onClose(); return; }
        setSaving(true);
        try {
            const res  = await fetch(`/api/enrollments/${enrollment.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed');
            onSave(data.enrollment);
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const sp = enrollment.sponsorship === 'guardian';

    const InfoRow = ({ icon, label, value, color = '#64748b' }) => value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={icon} style={{ color, fontSize: '.7rem' }}></i>
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.68rem', color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 1 }}>{label}</div>
                <div style={{ fontSize: '.85rem', color: '#1e293b', fontWeight: 600, fontFamily: 'Poppins,sans-serif' }}>{value}</div>
            </div>
        </div>
    ) : null;

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 780, width: '95vw' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-file-alt" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, fontFamily: 'Poppins,sans-serif' }}>Enrollment Details</h3>
                            <p style={{ margin: 0, fontSize: '.73rem', color: 'rgba(255,255,255,.55)', fontFamily: 'Poppins,sans-serif' }}>
                                Application #{enrollment.id} · Submitted {fmt(enrollment.created_at)}
                            </p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><i className="fas fa-times"></i></button>
                </div>

                <div className="modal-body" style={{ padding: '22px 24px', maxHeight: '65vh', overflowY: 'auto' }}>

                    {/* Course & Intake banner */}
                    <div style={{ background: 'linear-gradient(135deg,#081f4e 0%,#1e3a8a 100%)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }}></div>
                        <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.5)', fontFamily: 'Poppins,sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                            <i className="fas fa-book-open" style={{ marginRight: 5 }}></i>Course Enrolled
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '.98rem', color: '#fff', marginBottom: 10, fontFamily: 'Poppins,sans-serif' }}>{enrollment.course?.title ?? '—'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 20, padding: '4px 12px', fontSize: '.75rem', color: 'rgba(255,255,255,.85)', fontFamily: 'Poppins,sans-serif', fontWeight: 600 }}>
                                <i className="fas fa-calendar-alt" style={{ fontSize: '.65rem', color: '#60a5fa' }}></i>
                                {enrollment.intake?.intake_name ?? '—'}
                            </span>
                            <StatusBadge status={enrollment.status} />
                        </div>
                    </div>

                    {/* Applicant section */}
                    <div style={{ marginBottom: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}></div>
                            <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Applicant Information</span>
                        </div>

                        {/* Avatar + name row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#f8faff', borderRadius: 12, marginBottom: 10 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#081f4e,#1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ color: '#fff', fontWeight: 900, fontSize: '.82rem', fontFamily: 'Poppins,sans-serif' }}>
                                    {enrollment.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                </span>
                            </div>
                            <div>
                                <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, color: '#081f4e', fontSize: '.95rem' }}>{enrollment.name}</div>
                                <div style={{ fontSize: '.75rem', color: '#64748b', fontFamily: 'Poppins,sans-serif' }}>{enrollment.email}</div>
                            </div>
                        </div>

                        <InfoRow icon="fas fa-phone"          label="Phone"       value={enrollment.phone}                                       color="#3b82f6" />
                        <InfoRow icon="fas fa-hand-holding-heart" label="Sponsorship" value={enrollment.sponsorship === 'guardian' ? 'Guardian / Sponsor' : 'Self-Sponsored'} color="#f59e0b" />
                    </div>

                    {/* Guardian section */}
                    {sp && (
                        <div style={{ marginBottom: 18, background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: 14, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}></div>
                                <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Guardian / Sponsor</span>
                            </div>
                            <InfoRow icon="fas fa-user-tie"  label="Name"  value={enrollment.sponsor_name}  color="#8b5cf6" />
                            <InfoRow icon="fas fa-envelope"  label="Email" value={enrollment.sponsor_email} color="#8b5cf6" />
                            <InfoRow icon="fas fa-phone"     label="Phone" value={enrollment.sponsor_phone} color="#8b5cf6" />
                        </div>
                    )}

                    {/* Status update */}
                    {(canApprove || canReject) && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <div style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(135deg,#fe730c,#f97316)' }}></div>
                                <span style={{ fontSize: '.72rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: 'Poppins,sans-serif' }}>Update Status</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                                {[
                                    { s: 'pending',  show: canApprove || canReject },
                                    { s: 'approved', show: canApprove },
                                    { s: 'rejected', show: canReject },
                                ].filter(x => x.show).map(({ s }) => {
                                    const cfg    = STATUS[s];
                                    const active = status === s;
                                    return (
                                        <button key={s} onClick={() => setStatus(s)} style={{ padding: '12px 8px', borderRadius: 12, border: `2px solid ${active ? cfg.color : '#e8eaf0'}`, background: active ? cfg.bg : '#fff', color: active ? cfg.color : '#94a3b8', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.77rem', cursor: 'pointer', transition: 'all .2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, boxShadow: active ? `0 4px 12px ${cfg.color}25` : 'none' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 9, background: active ? cfg.gradient : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
                                                <i className={cfg.icon} style={{ color: active ? '#fff' : '#cbd5e1', fontSize: '.82rem' }}></i>
                                            </div>
                                            {cfg.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafbff' }}>
                    <button className="btn-modal-cancel" onClick={onClose}>Close</button>
                    {(canApprove || canReject) && (
                        <button className="btn-modal-save" onClick={submit} disabled={saving}>
                            {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> Save Status</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   DELETE MODAL
───────────────────────────────────────── */
function DeleteModal({ enrollment, onConfirm, onClose, saving }) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 420 }}>
                <div className="modal-header" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-trash-alt" style={{ color: '#fff', fontSize: '1rem' }}></i>
                        </div>
                        <div>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '.95rem', fontWeight: 800, fontFamily: 'Poppins,sans-serif' }}>Delete Enrollment</h3>
                            <p style={{ margin: 0, fontSize: '.72rem', color: 'rgba(255,255,255,.6)', fontFamily: 'Poppins,sans-serif' }}>This action is irreversible</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><i className="fas fa-times"></i></button>
                </div>
                <div className="modal-body" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 16px' }}>
                        <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }}></i>
                        <p style={{ margin: 0, color: '#7f1d1d', fontFamily: 'Poppins,sans-serif', fontSize: '.86rem', lineHeight: 1.6 }}>
                            You are about to permanently delete the enrollment for <strong>{enrollment.name}</strong>. This cannot be undone.
                        </p>
                    </div>
                </div>
                <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fafbff' }}>
                    <button className="btn-modal-cancel" onClick={onClose}>Cancel</button>
                    <button className="btn-modal-save" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,.35)' }} onClick={onConfirm} disabled={saving}>
                        {saving ? <><i className="fas fa-spinner fa-spin"></i> Deleting…</> : <><i className="fas fa-trash-alt"></i> Delete Enrollment</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function AdminEnrollments() {
    const { token, can } = useAuth();
    if (!can('enrollments', 'view')) return <AccessDenied />;

    const [enrollments, setEnrollments] = useState([]);
    const [meta, setMeta]               = useState({});
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [statusFilter, setStatus]     = useState('');
    const [intakeFilter, setIntakeFilter]   = useState('');
    const [schoolFilter, setSchoolFilter]   = useState('');
    const [courseFilter, setCourseFilter]   = useState('');
    const [classFilter,  setClassFilter]    = useState('');
    const [filterOptions, setFilterOptions] = useState({ intakes: [], schools: [], courses: [], classes: [] });
    const [page, setPage]               = useState(1);
    const [perPage, setPerPage]         = useState(15);
    const [detail, setDetail]           = useState(null);
    const [enrollOpen, setEnrollOpen]   = useState(false);
    const [editTarget, setEditTarget]   = useState(null);
    const [delTarget, setDelTarget]     = useState(null);
    const [delSaving, setDelSaving]     = useState(false);
    const [toast, setToast]             = useState({ message: '', type: '' });
    const [downloading, setDownloading] = useState(false);
    const [exportOpen, setExportOpen]   = useState(false);
    const exportRef                     = useRef(null);

    const notify = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: '', type: '' }), 3500);
    };

    useEffect(() => {
        const h = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
        Promise.all([
            fetch('/api/active-intakes',              { headers: h }).then(r => r.json()),
            fetch('/api/public-schools',              { headers: h }).then(r => r.json()),
            fetch('/api/admin/courses?per_page=200',  { headers: h }).then(r => r.json()),
            fetch('/api/public-classes',              { headers: h }).then(r => r.json()),
        ]).then(([i, s, c, cl]) => setFilterOptions({
            intakes: Array.isArray(i)  ? i  : (i.data  ?? []),
            schools: Array.isArray(s)  ? s  : (s.data  ?? []),
            courses: c.data ?? (Array.isArray(c) ? c : []),
            classes: Array.isArray(cl) ? cl : (cl.data ?? []),
        }));
    }, [token]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, per_page: perPage });
            if (search)       params.set('search',    search);
            if (statusFilter) params.set('status',    statusFilter);
            if (intakeFilter) params.set('intake_id', intakeFilter);
            if (schoolFilter) params.set('school_id', schoolFilter);
            if (courseFilter) params.set('course_id', courseFilter);
            if (classFilter)  params.set('class_id',  classFilter);
            const res  = await fetch(`/api/enrollments?${params}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setEnrollments(data.data ?? []);
            setMeta({ total: data.total, lastPage: data.last_page, from: data.from, to: data.to });
        } finally {
            setLoading(false);
        }
    }, [token, page, perPage, search, statusFilter, intakeFilter, schoolFilter, courseFilter, classFilter]);

    useEffect(() => { load(); }, [load]);

    const handleEdited = updated => {
        setEnrollments(list => list.map(e => e.id === updated.id ? { ...e, ...updated } : e));
        setEditTarget(null);
        notify('Enrollment updated successfully');
    };

    const handleEnrolled = enrollment => {
        setEnrollOpen(false);
        notify('Student enrolled successfully');
        load();
    };

    useEffect(() => {
        const handler = e => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleStatusSave = updated => {
        setEnrollments(list => list.map(e => e.id === updated.id ? { ...e, ...updated } : e));
        setDetail(null);
        notify(`Enrollment ${updated.status === 'approved' ? 'approved' : updated.status === 'rejected' ? 'rejected' : 'updated'} successfully`);
    };

    const confirmDelete = async () => {
        setDelSaving(true);
        try {
            await fetch(`/api/enrollments/${delTarget.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            setEnrollments(list => list.filter(e => e.id !== delTarget.id));
            setDelTarget(null);
            notify('Enrollment deleted');
        } catch {
            notify('Delete failed', 'error');
        } finally {
            setDelSaving(false);
        }
    };

    const exportData = async (format) => {
        setExportOpen(false);
        setDownloading(true);
        try {
            const params = new URLSearchParams({ per_page: 9999, page: 1 });
            if (search)       params.set('search',    search);
            if (statusFilter) params.set('status',    statusFilter);
            if (intakeFilter) params.set('intake_id', intakeFilter);
            if (schoolFilter) params.set('school_id', schoolFilter);
            if (courseFilter) params.set('course_id', courseFilter);
            if (classFilter)  params.set('class_id',  classFilter);
            const res  = await fetch(`/api/enrollments?${params}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
            const data = await res.json();
            const rows = data.data ?? [];
            const date = new Date().toISOString().slice(0, 10);

            /* ── build active-filter summary ── */
            const activeFilters = [];
            if (search)       activeFilters.push(`Search: "${search}"`);
            if (statusFilter) activeFilters.push(`Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`);
            if (intakeFilter) {
                const found = filterOptions.intakes.find(i => String(i.id) === String(intakeFilter));
                activeFilters.push(`Intake: ${found?.intake_name ?? intakeFilter}`);
            }
            if (courseFilter) {
                const found = filterOptions.courses.find(c => String(c.id) === String(courseFilter));
                activeFilters.push(`Course: ${found?.title ?? courseFilter}`);
            }
            if (schoolFilter) {
                const found = filterOptions.schools.find(s => String(s.id) === String(schoolFilter));
                activeFilters.push(`School: ${found?.school_name ?? schoolFilter}`);
            }
            if (classFilter) {
                const found = filterOptions.classes.find(c => String(c.id) === String(classFilter));
                activeFilters.push(`Class: ${found?.name ?? classFilter}`);
            }
            const filterSummary  = activeFilters.length ? activeFilters.join('  |  ') : 'All records (no filters applied)';
            const generatedLine  = `Generated: ${new Date().toLocaleString()}`;
            const totalLine      = `Total records: ${rows.length}`;

            const headers = ['#', 'Name', 'Email', 'Phone', 'Course', 'Intake', 'Sponsorship', 'Sponsor Name', 'Sponsor Email', 'Sponsor Phone', 'Status', 'Applied Date'];
            const toRow = (e, i) => [
                i + 1, e.name ?? '', e.email ?? '', e.phone ?? '',
                e.course?.title ?? '', e.intake?.intake_name ?? '',
                e.sponsorship ?? '', e.sponsor_name ?? '', e.sponsor_email ?? '', e.sponsor_phone ?? '',
                e.status ?? '',
                e.created_at ? new Date(e.created_at).toLocaleDateString('en-GB') : '',
            ];

            if (format === 'csv') {
                const escape = v => `"${String(v).replace(/"/g, '""')}"`;
                const lines  = [
                    escape('Enrollments Report'),
                    escape(generatedLine),
                    escape(`Filters: ${filterSummary}`),
                    escape(totalLine),
                    '',
                    headers.map(escape).join(','),
                    ...rows.map((e, i) => toRow(e, i).map(escape).join(',')),
                ];
                const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
                const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `enrollments-${date}.csv` });
                a.click(); URL.revokeObjectURL(a.href);

            } else if (format === 'excel') {
                const metaRows = [
                    ['Enrollments Report'],
                    [generatedLine],
                    [`Filters: ${filterSummary}`],
                    [totalLine],
                    [],
                    headers,
                    ...rows.map(toRow),
                ];
                const ws = XLSX.utils.aoa_to_sheet(metaRows);
                /* bold + large title */
                ws['A1'].s = { font: { bold: true, sz: 14 } };
                /* merge title across all columns */
                ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
                /* freeze header row (row 6 = index 5) */
                ws['!freeze'] = { xSplit: 0, ySplit: 6 };
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Enrollments');
                XLSX.writeFile(wb, `enrollments-${date}.xlsx`);

            } else if (format === 'pdf') {
                const doc = new jsPDF({ orientation: 'landscape' });
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(8, 31, 78);
                doc.text('Enrollments Report', 14, 16);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(90, 90, 90);
                doc.text(generatedLine, 14, 23);
                doc.text(totalLine, 14, 29);

                /* filter pill box */
                const boxY = 34;
                doc.setFillColor(240, 247, 255);
                doc.setDrawColor(180, 210, 255);
                doc.roundedRect(14, boxY, doc.internal.pageSize.width - 28, 10, 2, 2, 'FD');
                doc.setFontSize(7.5);
                doc.setTextColor(30, 58, 138);
                doc.setFont('helvetica', 'bold');
                doc.text('Filters applied:', 17, boxY + 6.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(50, 50, 50);
                const filterText = doc.splitTextToSize(filterSummary, doc.internal.pageSize.width - 60);
                doc.text(filterText, 46, boxY + 6.5);

                autoTable(doc, {
                    startY: boxY + 16,
                    head: [headers],
                    body: rows.map(toRow),
                    styles: { fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: [8, 31, 78], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 255] },
                    didDrawPage: (hookData) => {
                        /* page footer */
                        const pageCount = doc.internal.getNumberOfPages();
                        doc.setFontSize(7);
                        doc.setTextColor(150);
                        doc.text(`Page ${hookData.pageNumber} of ${pageCount}`, doc.internal.pageSize.width - 28, doc.internal.pageSize.height - 8);
                    },
                });
                doc.save(`enrollments-${date}.pdf`);
            }
        } finally {
            setDownloading(false);
        }
    };

    /* ── aggregated counts from the current page (for display only) ── */
    const counts = { pending: 0, approved: 0, rejected: 0 };
    enrollments.forEach(e => { if (counts[e.status] !== undefined) counts[e.status]++; });

    const statCards = [
        { label: 'Total Applications', value: meta.total ?? 0,  color: '#081f4e', bg: 'rgba(8,31,78,.08)',         icon: 'fas fa-layer-group',   gradient: 'linear-gradient(135deg,#081f4e,#1e3a8a)' },
        { label: 'Pending Review',      value: counts.pending,   color: '#d97706', bg: 'rgba(245,158,11,.1)',       icon: 'fas fa-hourglass-half', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
        { label: 'Approved',            value: counts.approved,  color: '#059669', bg: 'rgba(16,185,129,.1)',       icon: 'fas fa-user-check',    gradient: 'linear-gradient(135deg,#10b981,#059669)' },
        { label: 'Rejected',            value: counts.rejected,  color: '#dc2626', bg: 'rgba(239,68,68,.1)',        icon: 'fas fa-user-times',    gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
    ];

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="Enrollments" />
                <div className="db-content">
                <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />

                <div className="db-topbar">
                    <div>
                        <h1 className="db-page-title"><i className="fas fa-file-alt"></i> Enrollments</h1>
                        <p className="db-page-sub">Review and manage course enrollment applications</p>
                    </div>
                </div>


{/* ── Stat cards ── */}
                {can('enrollments', 'view_stats') && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
                    {statCards.map(c => (
                        <div key={c.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid #eef0f6', display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: c.gradient, borderRadius: '16px 0 0 16px' }}></div>
                            <div style={{ width: 48, height: 48, borderRadius: 13, background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 6px 16px ${c.color}30` }}>
                                <i className={c.icon} style={{ color: '#fff', fontSize: '1.05rem' }}></i>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.7rem', fontWeight: 900, color: c.color, lineHeight: 1, fontFamily: 'Poppins,sans-serif' }}>{c.value}</div>
                                <div style={{ fontSize: '.72rem', color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontWeight: 600, marginTop: 2 }}>{c.label}</div>
                            </div>
                        </div>
                    ))}
                </div>}

                {/* ── Filters bar ── */}
                <div style={{ background: '#fff', borderRadius: 16, padding: '14px 20px', boxShadow: '0 2px 10px rgba(0,0,0,.05)', border: '1px solid #eef0f6', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* Row 1: Search + Enroll button + Status pills + Per page */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: '1 1 220px', position: 'relative' }}>
                            <i className="fas fa-search" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '.82rem' }}></i>
                            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email or phone…"
                                style={{ width: '100%', paddingLeft: 38, paddingRight: 14, paddingTop: 9, paddingBottom: 9, border: '1.5px solid #e8eaf0', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', outline: 'none', color: '#374151', background: '#f8faff', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#fe730c'} onBlur={e => e.target.style.borderColor = '#e8eaf0'} />
                        </div>
                        {can('enrollments', 'create') && (
                            <button onClick={() => setEnrollOpen(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg,#fe730c,#f97316)', border: 'none', borderRadius: 10, padding: '9px 16px', color: '#fff', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(254,115,12,.35)', whiteSpace: 'nowrap', flexShrink: 0 }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                <i className="fas fa-user-plus" style={{ fontSize: '.78rem' }}></i>
                                Enroll Student
                            </button>
                        )}
                        <div ref={exportRef} style={{ position: 'relative', flexShrink: 0 }}>
                            <button onClick={() => setExportOpen(o => !o)} disabled={downloading}
                                style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1.5px solid #e8eaf0', borderRadius: 10, padding: '8px 14px', color: '#16a34a', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', cursor: downloading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: downloading ? .7 : 1 }}
                                onMouseEnter={e => { if (!downloading) { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac'; } }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e8eaf0'; }}>
                                <i className={`fas ${downloading ? 'fa-spinner fa-spin' : 'fa-download'}`} style={{ fontSize: '.78rem' }}></i>
                                {downloading ? 'Exporting…' : 'Export'}
                                {!downloading && <i className="fas fa-chevron-down" style={{ fontSize: '.6rem', marginLeft: 2 }}></i>}
                            </button>
                            {exportOpen && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1.5px solid #e8eaf0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 50, minWidth: 160, overflow: 'hidden' }}>
                                    {[
                                        { fmt: 'pdf',   icon: 'fas fa-file-pdf',   label: 'PDF',          color: '#dc2626' },
                                        { fmt: 'excel', icon: 'fas fa-file-excel',  label: 'Excel (.xlsx)', color: '#16a34a' },
                                        { fmt: 'csv',   icon: 'fas fa-file-csv',    label: 'CSV',           color: '#0d9488' },
                                    ].map(({ fmt, icon, label, color }) => (
                                        <button key={fmt} onClick={() => exportData(fmt)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: 600, color: '#374151', textAlign: 'left' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                            <i className={icon} style={{ color, fontSize: '.9rem', width: 18 }}></i>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {['', 'pending', 'approved', 'rejected'].map(s => {
                                const cfg = s ? STATUS[s] : null; const active = statusFilter === s;
                                return (
                                    <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                                        style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${active ? (cfg?.color ?? '#081f4e') : '#e8eaf0'}`, background: active ? (cfg ? cfg.bg : 'rgba(8,31,78,.08)') : '#fff', color: active ? (cfg?.color ?? '#081f4e') : '#64748b', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.75rem', cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        {s ? <><i className={STATUS[s].icon} style={{ fontSize: '.62rem' }}></i>{STATUS[s].label}</> : <><i className="fas fa-th" style={{ fontSize: '.62rem' }}></i>All</>}
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ position: 'relative', marginLeft: 'auto' }}>
                            <select value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(1); }}
                                style={{ padding: '8px 30px 8px 12px', border: '1.5px solid #e8eaf0', borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', color: '#374151', background: '#f8faff', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                                {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                            </select>
                            <i className="fas fa-chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.62rem', pointerEvents: 'none' }}></i>
                        </div>
                    </div>

                    {/* Row 2: Intake, Course, School dropdowns */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <i className="fas fa-filter" style={{ color: '#94a3b8', fontSize: '.78rem', flexShrink: 0 }}></i>
                        {[
                            { label: 'All Intakes', value: intakeFilter, set: setIntakeFilter, icon: 'fas fa-calendar-alt', color: '#0d9488',
                              options: filterOptions.intakes.map(i => ({ value: i.id, label: i.intake_name })) },
                            { label: 'All Courses', value: courseFilter, set: setCourseFilter, icon: 'fas fa-book-open', color: '#2563eb',
                              options: filterOptions.courses.map(c => ({ value: c.id, label: c.title })) },
                            { label: 'All Schools', value: schoolFilter, set: setSchoolFilter, icon: 'fas fa-school', color: '#7c3aed',
                              options: filterOptions.schools.map(s => ({ value: s.id, label: s.school_name })) },
                            { label: 'All Classes', value: classFilter,  set: setClassFilter,  icon: 'fas fa-chalkboard-teacher', color: '#be185d',
                              options: filterOptions.classes.map(c => ({ value: c.id, label: c.name })) },
                        ].map(f => (
                            <div key={f.label} style={{ position: 'relative', flex: '1 1 180px' }}>
                                <i className={f.icon} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: f.value ? f.color : '#cbd5e1', fontSize: '.72rem', pointerEvents: 'none' }}></i>
                                <select value={f.value} onChange={e => { f.set(e.target.value); setPage(1); }}
                                    style={{ width: '100%', padding: '8px 28px 8px 30px', border: `1.5px solid ${f.value ? f.color + '55' : '#e8eaf0'}`, borderRadius: 10, fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', color: f.value ? '#1e293b' : '#94a3b8', background: f.value ? `${f.color}08` : '#f8faff', cursor: 'pointer', appearance: 'none', outline: 'none', fontWeight: f.value ? 600 : 400, boxSizing: 'border-box' }}>
                                    <option value="">{f.label}</option>
                                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <i className="fas fa-chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.6rem', pointerEvents: 'none' }}></i>
                            </div>
                        ))}
                        {(intakeFilter || courseFilter || schoolFilter || classFilter) && (
                            <button onClick={() => { setIntakeFilter(''); setCourseFilter(''); setSchoolFilter(''); setClassFilter(''); setPage(1); }}
                                style={{ padding: '7px 12px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <i className="fas fa-times" style={{ fontSize: '.65rem' }}></i> Clear filters
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Table card ── */}
                <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid #eef0f6', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <colgroup>
                                <col style={{ width: 50 }} />
                                <col style={{ width: '28%' }} />
                                <col style={{ width: '25%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '18%' }} />
                                <col style={{ width: '16%' }} />
                            </colgroup>
                            <thead>
                                <tr style={{ background: 'linear-gradient(135deg,#081f4e 0%,#1e3a8a 100%)' }}>
                                    {['#', 'Applicant', 'Course & Intake', 'Sponsorship', 'Status & Date', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '13px 14px', textAlign: 'left', color: 'rgba(255,255,255,.8)', fontSize: '.68rem', fontFamily: 'Poppins,sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', whiteSpace: 'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                                                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#fe730c,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(254,115,12,.3)' }}>
                                                    <i className="fas fa-spinner fa-spin" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
                                                </div>
                                                <span style={{ color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', fontWeight: 600 }}>Loading enrollments…</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : enrollments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '64px 20px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#f8faff,#eff4ff)', border: '2px solid #e8eaf0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <i className="fas fa-inbox" style={{ fontSize: '1.8rem', color: '#cbd5e1' }}></i>
                                                </div>
                                                <div>
                                                    <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, color: '#475569', fontSize: '.95rem', marginBottom: 4 }}>No enrollments found</div>
                                                    <div style={{ color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.8rem' }}>
                                                        {search || statusFilter ? 'Try adjusting your search or filter' : 'Enrollments will appear here once applicants submit'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : enrollments.map((e, i) => (
                                    <tr key={e.id}
                                        style={{ borderBottom: '1px solid #f4f6fb', transition: 'background .15s', cursor: 'default' }}
                                        onMouseEnter={ev => ev.currentTarget.style.background = '#f8faff'}
                                        onMouseLeave={ev => ev.currentTarget.style.background = ''}>

                                        {/* # */}
                                        <td style={{ padding: '12px 14px', width: 46 }}>
                                            <span style={{ width: 26, height: 26, borderRadius: 7, background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '.72rem', fontFamily: 'Poppins,sans-serif', fontWeight: 700 }}>
                                                {(meta.from ?? 0) + i}
                                            </span>
                                        </td>

                                        {/* Applicant */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#081f4e,#1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <span style={{ color: '#fff', fontWeight: 900, fontSize: '.68rem', fontFamily: 'Poppins,sans-serif' }}>
                                                        {e.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                                    </span>
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#1e293b', fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{e.name}</div>
                                                    <div style={{ fontSize: '.7rem', color: '#64748b', fontFamily: 'Poppins,sans-serif' }}>{e.email}</div>
                                                    {e.phone && <div style={{ fontSize: '.68rem', color: '#94a3b8', fontFamily: 'Poppins,sans-serif' }}>{e.phone}</div>}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Course & Intake combined */}
                                        <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                                            <div style={{ fontWeight: 600, fontSize: '.8rem', color: '#334155', fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={e.course?.title}>
                                                {e.course?.title ?? '—'}
                                            </div>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(13,148,136,.08)', border: '1px solid rgba(13,148,136,.2)', fontSize: '.68rem', color: '#0d9488', fontFamily: 'Poppins,sans-serif', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                <i className="fas fa-calendar-alt" style={{ fontSize: '.58rem' }}></i>
                                                {e.intake?.intake_name ?? '—'}
                                            </span>
                                        </td>

                                        {/* Sponsorship */}
                                        <td style={{ padding: '12px 14px' }}>
                                            {e.sponsorship === 'guardian'
                                                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(139,92,246,.1)', color: '#7c3aed', fontSize: '.68rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif', border: '1px solid rgba(139,92,246,.22)', whiteSpace: 'nowrap' }}>
                                                    <i className="fas fa-user-friends" style={{ fontSize: '.58rem' }}></i> Guardian
                                                  </span>
                                                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(14,165,233,.1)', color: '#0284c7', fontSize: '.68rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif', border: '1px solid rgba(14,165,233,.22)', whiteSpace: 'nowrap' }}>
                                                    <i className="fas fa-user" style={{ fontSize: '.58rem' }}></i> Self
                                                  </span>
                                            }
                                        </td>

                                        {/* Status & Applied date combined */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <StatusBadge status={e.status} />
                                            <div style={{ fontSize: '.68rem', color: '#94a3b8', fontFamily: 'Poppins,sans-serif', marginTop: 4, whiteSpace: 'nowrap' }}>
                                                <i className="fas fa-clock" style={{ marginRight: 3, fontSize: '.6rem' }}></i>{fmt(e.created_at)}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                <button title="View Details" onClick={() => setDetail(e)}
                                                    style={{ width: 34, height: 34, borderRadius: 9, border: '1.5px solid #e8eaf0', background: '#fff', color: '#081f4e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
                                                    onMouseEnter={ev => { ev.currentTarget.style.background = '#081f4e'; ev.currentTarget.style.color = '#fff'; ev.currentTarget.style.borderColor = '#081f4e'; }}
                                                    onMouseLeave={ev => { ev.currentTarget.style.background = '#fff'; ev.currentTarget.style.color = '#081f4e'; ev.currentTarget.style.borderColor = '#e8eaf0'; }}>
                                                    <i className="fas fa-eye" style={{ fontSize: '.78rem' }}></i>
                                                </button>
                                                {can('enrollments', 'update') && (
                                                    <button title="Edit Enrollment" onClick={() => setEditTarget(e)}
                                                        style={{ width: 34, height: 34, borderRadius: 9, border: '1.5px solid #bfdbfe', background: '#fff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
                                                        onMouseEnter={ev => { ev.currentTarget.style.background = '#2563eb'; ev.currentTarget.style.color = '#fff'; ev.currentTarget.style.borderColor = '#2563eb'; }}
                                                        onMouseLeave={ev => { ev.currentTarget.style.background = '#fff'; ev.currentTarget.style.color = '#2563eb'; ev.currentTarget.style.borderColor = '#bfdbfe'; }}>
                                                        <i className="fas fa-edit" style={{ fontSize: '.78rem' }}></i>
                                                    </button>
                                                )}
                                                {can('enrollments', 'delete') && (
                                                    <button title="Delete" onClick={() => setDelTarget(e)}
                                                        style={{ width: 34, height: 34, borderRadius: 9, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
                                                        onMouseEnter={ev => { ev.currentTarget.style.background = '#dc2626'; ev.currentTarget.style.color = '#fff'; ev.currentTarget.style.borderColor = '#dc2626'; }}
                                                        onMouseLeave={ev => { ev.currentTarget.style.background = '#fff'; ev.currentTarget.style.color = '#dc2626'; ev.currentTarget.style.borderColor = '#fecaca'; }}>
                                                        <i className="fas fa-trash-alt" style={{ fontSize: '.78rem' }}></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* ── Pagination ── */}
                    {(meta.lastPage > 1 || enrollments.length > 0) && (
                        <div style={{ padding: '14px 20px', borderTop: '1px solid #f4f6fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#fafbff' }}>
                            <span style={{ fontSize: '.78rem', color: '#94a3b8', fontFamily: 'Poppins,sans-serif' }}>
                                {meta.from && meta.to
                                    ? <>Showing <strong style={{ color: '#475569' }}>{meta.from}–{meta.to}</strong> of <strong style={{ color: '#475569' }}>{meta.total}</strong> enrollments</>
                                    : `${enrollments.length} enrollment${enrollments.length !== 1 ? 's' : ''}`
                                }
                            </span>
                            {meta.lastPage > 1 && (
                                <div style={{ display: 'flex', gap: 5 }}>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                        style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8eaf0', background: '#fff', color: '#64748b', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? .4 : 1 }}>
                                        <i className="fas fa-chevron-left" style={{ fontSize: '.65rem' }}></i>
                                    </button>
                                    {Array.from({ length: meta.lastPage }, (_, i) => i + 1).map(p => (
                                        <button key={p} onClick={() => setPage(p)}
                                            style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${page === p ? '#081f4e' : '#e8eaf0'}`, background: page === p ? '#081f4e' : '#fff', color: page === p ? '#fff' : '#374151', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer', transition: 'all .2s' }}>
                                            {p}
                                        </button>
                                    ))}
                                    <button onClick={() => setPage(p => Math.min(meta.lastPage, p + 1))} disabled={page === meta.lastPage}
                                        style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8eaf0', background: '#fff', color: '#64748b', cursor: page === meta.lastPage ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === meta.lastPage ? .4 : 1 }}>
                                        <i className="fas fa-chevron-right" style={{ fontSize: '.65rem' }}></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                </div>
            </div>

            {editTarget && (
                <EditEnrollmentModal enrollment={editTarget} token={token} onSaved={handleEdited} onClose={() => setEditTarget(null)} />
            )}
            {enrollOpen && (
                <EnrollModal token={token} onSaved={handleEnrolled} onClose={() => setEnrollOpen(false)} />
            )}
            {detail && (
                <DetailModal enrollment={detail} onSave={handleStatusSave} onClose={() => setDetail(null)} token={token} canUpdate={can('enrollments', 'update')} canApprove={can('enrollments', 'approve')} canReject={can('enrollments', 'reject')} />
            )}
            {delTarget && (
                <DeleteModal enrollment={delTarget} onConfirm={confirmDelete} onClose={() => setDelTarget(null)} saving={delSaving} />
            )}
        </div>
    );
}
