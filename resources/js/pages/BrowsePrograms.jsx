import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STATUS = {
    pending:  { label: 'Pending Approval', color: '#b45309', bg: '#fef3c7', icon: 'fa-clock' },
    approved: { label: 'Enrolled',         color: '#065f46', bg: '#d1fae5', icon: 'fa-check-circle' },
    rejected: { label: 'Rejected',         color: '#991b1b', bg: '#fee2e2', icon: 'fa-times-circle' },
};

const LEVEL_COLORS = {
    beginner:     { bg: '#d1fae5', color: '#065f46' },
    intermediate: { bg: '#ede9fe', color: '#5b21b6' },
    advanced:     { bg: '#dbeafe', color: '#1e40af' },
    mastery:      { bg: '#fce7f3', color: '#9d174d' },
};
const levelStyle = lvl => LEVEL_COLORS[lvl?.toLowerCase()] ?? { bg: '#f1f5f9', color: '#475569' };

const BADGE_COLORS = {
    new:        { bg: '#10b981', color: '#fff' },
    hot:        { bg: '#ef4444', color: '#fff' },
    bestseller: { bg: '#f59e0b', color: '#fff' },
    popular:    { bg: '#3b82f6', color: '#fff' },
    featured:   { bg: '#8b5cf6', color: '#fff' },
    premium:    { bg: '#ec4899', color: '#fff' },
};
const badgeStyle = b => BADGE_COLORS[b?.toLowerCase()] ?? { bg: '#6b7280', color: '#fff' };

const CAT_ICONS = [
    'fas fa-th-large', 'fas fa-tag', 'fas fa-leaf', 'fas fa-chart-line',
    'fas fa-graduation-cap', 'fas fa-calendar-alt', 'fas fa-flask', 'fas fa-code',
    'fas fa-paint-brush', 'fas fa-cogs',
];

export default function BrowsePrograms() {
    const { token } = useAuth();

    const [courses, setCourses]           = useState([]);
    const [enrollments, setEnrollments]   = useState([]);
    const [categories, setCategories]     = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [catFilter, setCatFilter]       = useState('all');
    const [enrollFilter, setEnrollFilter] = useState('all');

    const [enrollModal, setEnrollModal]       = useState(null);
    const [intakes, setIntakes]               = useState([]);
    const [intakesLoading, setIntakesLoading] = useState(false);
    const [form, setForm]                     = useState({ intake_id: '', sponsorship: 'self', sponsor_name: '', sponsor_email: '', sponsor_phone: '' });
    const [submitting, setSubmitting]         = useState(false);
    const [formErrors, setFormErrors]         = useState({});
    const [toast, setToast]                   = useState(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/courses').then(r => r.json()),
            fetch('/api/learning/my-enrollments', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }).then(r => r.json()),
            fetch('/api/public-course-categories').then(r => r.json()),
        ])
            .then(([c, e, cats]) => {
                setCourses(Array.isArray(c) ? c : []);
                setEnrollments(Array.isArray(e) ? e : []);
                setCategories(Array.isArray(cats) ? cats : []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => {
        if (!enrollModal) return;
        setIntakesLoading(true);
        fetch('/api/active-intakes')
            .then(r => r.json())
            .then(d => setIntakes(Array.isArray(d) ? d : []))
            .catch(() => {})
            .finally(() => setIntakesLoading(false));
    }, [enrollModal]);

    const enrollmentMap = useMemo(() => {
        const m = {};
        enrollments.forEach(e => { m[e.course_id] = e.status; });
        return m;
    }, [enrollments]);

    const totalEnrolled = useMemo(() => Object.values(enrollmentMap).filter(s => s === 'approved').length, [enrollmentMap]);
    const totalPending  = useMemo(() => Object.values(enrollmentMap).filter(s => s === 'pending').length, [enrollmentMap]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return courses.filter(c => {
            const matchQ      = !q || c.title?.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
            const matchCat    = catFilter === 'all' || c.category === catFilter;
            const isEnrolled  = !!enrollmentMap[c.id];
            const matchEnroll = enrollFilter === 'all' || (enrollFilter === 'enrolled' ? isEnrolled : !isEnrolled);
            return matchQ && matchCat && matchEnroll;
        });
    }, [courses, search, catFilter, enrollFilter, enrollmentMap]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4500);
    };

    const openEnroll = course => {
        setEnrollModal(course);
        setForm({ intake_id: '', sponsorship: 'self', sponsor_name: '', sponsor_email: '', sponsor_phone: '' });
        setFormErrors({});
    };

    const handleEnroll = async e => {
        e.preventDefault();
        setFormErrors({});
        setSubmitting(true);
        try {
            const res = await fetch('/api/enrollments/self', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'application/json' },
                body: JSON.stringify({ course_id: enrollModal.id, ...form }),
            });
            const data = await res.json();
            if (!res.ok) {
                setFormErrors(data.errors || {});
                showToast(data.message || 'Enrollment failed. Check the form.', 'error');
                return;
            }
            setEnrollments(prev => [...prev, { course_id: enrollModal.id, status: 'pending' }]);
            setEnrollModal(null);
            showToast('Enrollment submitted! Awaiting admin approval.');
        } catch {
            showToast('An error occurred. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="db-content" style={{ padding: '28px 24px' }}>

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', maxWidth: 380 }}>
                    <i className={`fas ${toast.type === 'error' ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ color: toast.type === 'error' ? '#dc2626' : '#16a34a', fontSize: '1.1rem', flexShrink: 0 }}></i>
                    <span style={{ fontSize: '.83rem', color: toast.type === 'error' ? '#991b1b' : '#15803d' }}>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontFamily: 'Poppins,sans-serif', color: '#081f4e', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                        <i className="fas fa-graduation-cap" style={{ color: '#fe730c', marginRight: 10 }}></i>
                        Browse Programs
                    </h1>
                    <p style={{ color: '#666', margin: '4px 0 0', fontSize: '.9rem' }}>Explore available programs and enroll to start learning</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Total Programs', value: courses.length,  icon: 'fa-book-open',    color: '#8b5cf6' },
                    { label: 'Enrolled',        value: totalEnrolled,   icon: 'fa-check-circle', color: '#10b981' },
                    { label: 'Pending',         value: totalPending,    icon: 'fa-clock',        color: '#f59e0b' },
                    { label: 'Available',       value: courses.length - Object.keys(enrollmentMap).length, icon: 'fa-plus-circle', color: '#3b82f6' },
                ].map(card => (
                    <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,.08)', borderLeft: `4px solid ${card.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <i className={`fas ${card.icon}`} style={{ color: card.color, fontSize: '1.1rem' }}></i>
                            <span style={{ color: '#666', fontSize: '.82rem', fontWeight: 600 }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#081f4e' }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Category Tabs */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16, scrollbarWidth: 'none' }}>
                <button onClick={() => setCatFilter('all')}
                    style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 50, border: `1.5px solid ${catFilter === 'all' ? '#081f4e' : '#e2e8f0'}`, background: catFilter === 'all' ? '#081f4e' : '#fff', color: catFilter === 'all' ? '#fff' : '#475569', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                    <i className="fas fa-th-large" style={{ fontSize: '.72rem' }}></i> All
                </button>
                {categories.map((cat, idx) => {
                    const slug   = cat.slug || cat.name;
                    const active = catFilter === slug;
                    const icon   = CAT_ICONS[(idx + 1) % CAT_ICONS.length];
                    return (
                        <button key={cat.id ?? slug} onClick={() => setCatFilter(slug)}
                            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 50, border: `1.5px solid ${active ? '#081f4e' : '#e2e8f0'}`, background: active ? '#081f4e' : '#fff', color: active ? '#fff' : '#475569', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                            <i className={icon} style={{ fontSize: '.72rem' }}></i> {cat.name}
                        </button>
                    );
                })}
            </div>

            {/* Search + Enroll Filter */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.85rem', pointerEvents: 'none' }}></i>
                    <input type="text" placeholder="Search programs, topics…" value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 14px 9px 36px', border: '1px solid #ddd', borderRadius: 8, fontSize: '.9rem', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                        { value: 'all',          icon: 'fa-list',         label: 'All' },
                        { value: 'enrolled',     icon: 'fa-check-circle', label: 'Enrolled' },
                        { value: 'not-enrolled', icon: 'fa-plus-circle',  label: 'Not Enrolled' },
                    ].map(({ value, icon, label }) => {
                        const active = enrollFilter === value;
                        return (
                            <button key={value} onClick={() => setEnrollFilter(value)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 50, border: `1.5px solid ${active ? '#081f4e' : '#e2e8f0'}`, background: active ? '#081f4e' : '#fff', color: active ? '#fff' : '#475569', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                                <i className={`fas ${icon}`} style={{ fontSize: '.72rem' }}></i> {label}
                            </button>
                        );
                    })}
                </div>
                {!loading && (
                    <span style={{ padding: '7px 16px', borderRadius: 50, background: '#f1f5f9', color: '#475569', fontSize: '.8rem', fontWeight: 700, border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                        {filtered.length} program{filtered.length !== 1 ? 's' : ''} found
                    </span>
                )}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
                        <thead>
                            <tr style={{ background: '#081f4e', color: '#fff' }}>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Program</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Level</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Tags</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Price</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#999' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>Loading programs…
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#999' }}>
                                    <i className="fas fa-search" style={{ fontSize: '2rem', display: 'block', marginBottom: 10 }}></i>
                                    No programs match your search.
                                </td></tr>
                            ) : filtered.map((course, i) => {
                                const status = enrollmentMap[course.id];
                                const lvlSt  = levelStyle(course.level);
                                const bdgSt  = course.badge ? badgeStyle(course.badge) : null;
                                const tags   = Array.isArray(course.tags) ? course.tags.slice(0, 3) : [];
                                const st     = status ? STATUS[status] : null;

                                return (
                                    <tr key={course.id} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>

                                        {/* Program */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', minWidth: 220 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: 10, background: course.image_url ? `url(${course.image_url}) center/cover no-repeat` : 'linear-gradient(135deg,#fe730c,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                                    {!course.image_url && <i className={course.icon || course.icon_class || 'fas fa-book'} style={{ color: '#fff', fontSize: '.85rem' }}></i>}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: '#081f4e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{course.title}</div>
                                                    {(course.subtitle || course.description) && (
                                                        <div style={{ fontSize: '.72rem', color: '#888', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                                                            {course.subtitle || course.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Level */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                {course.level && (
                                                    <span style={{ background: lvlSt.bg, color: lvlSt.color, padding: '3px 9px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                        {course.level}
                                                    </span>
                                                )}
                                                {bdgSt && (
                                                    <span style={{ background: bdgSt.bg, color: bdgSt.color, padding: '3px 9px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                        {course.badge}
                                                    </span>
                                                )}
                                                {!course.level && !bdgSt && <span style={{ color: '#bbb', fontSize: '.78rem' }}>—</span>}
                                            </div>
                                        </td>

                                        {/* Tags */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
                                            {tags.length > 0 ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {tags.map((t, ti) => (
                                                        <span key={ti} style={{ fontSize: '.68rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>{t}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#bbb', fontSize: '.78rem' }}>—</span>
                                            )}
                                        </td>

                                        {/* Price */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontWeight: 700, color: course.price ? '#081f4e' : '#94a3b8', fontSize: '.85rem' }}>
                                                {course.price
                                                    ? <><i className="fas fa-tag" style={{ color: '#fe730c', marginRight: 5, fontSize: '.72rem' }}></i>{course.price}</>
                                                    : 'Contact Us'}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
                                            {st ? (
                                                <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <i className={`fas ${st.icon}`}></i> {st.label}
                                                </span>
                                            ) : (
                                                <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700 }}>Not Enrolled</span>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>
                                            {!status && (
                                                <button onClick={() => openEnroll(course)}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: '.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    <i className="fas fa-plus-circle"></i> Enroll Now
                                                </button>
                                            )}
                                            {status === 'pending' && (
                                                <span style={{ color: '#b45309', fontSize: '.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <i className="fas fa-hourglass-half"></i> Awaiting approval
                                                </span>
                                            )}
                                            {status === 'approved' && (
                                                <Link to={`/dashboard/learning/${course.slug}`}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#10b981', color: '#fff', borderRadius: 6, padding: '6px 14px', textDecoration: 'none', fontSize: '.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                    <i className="fas fa-play-circle"></i> Continue
                                                </Link>
                                            )}
                                            {status === 'rejected' && (
                                                <span style={{ color: '#991b1b', fontSize: '.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <i className="fas fa-times-circle"></i> Not approved
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enroll Modal */}
            {enrollModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
                    onClick={e => { if (e.target === e.currentTarget) setEnrollModal(null); }}>
                    <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 470, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>

                        <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                <div>
                                    <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#081f4e', fontFamily: 'Poppins,sans-serif' }}>Enroll in Program</h2>
                                    <p style={{ margin: 0, fontSize: '.8rem', color: '#64748b', fontFamily: 'Poppins,sans-serif' }}>{enrollModal.title}</p>
                                </div>
                                <button onClick={() => setEnrollModal(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleEnroll} style={{ padding: '22px 26px 26px' }}>
                            {/* Intake */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', marginBottom: 6, fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', fontWeight: 600, color: '#374151' }}>
                                    Intake <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                {intakesLoading ? (
                                    <p style={{ fontSize: '.8rem', color: '#94a3b8', fontFamily: 'Poppins,sans-serif' }}><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Loading intakes…</p>
                                ) : (
                                    <select required value={form.intake_id} onChange={e => setForm(f => ({ ...f, intake_id: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${formErrors.intake_id ? '#fca5a5' : '#e8ecf4'}`, fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', background: '#fff', outline: 'none', boxSizing: 'border-box' }}>
                                        <option value="">— Select intake —</option>
                                        {intakes.length === 0
                                            ? <option disabled>No active intakes available</option>
                                            : intakes.map(i => <option key={i.id} value={i.id}>{i.intake_name}</option>)}
                                    </select>
                                )}
                                {formErrors.intake_id && <p style={{ margin: '4px 0 0', fontSize: '.72rem', color: '#dc2626', fontFamily: 'Poppins,sans-serif' }}>{formErrors.intake_id[0]}</p>}
                            </div>

                            {/* Sponsorship */}
                            <div style={{ marginBottom: form.sponsorship === 'guardian' ? 16 : 24 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', fontWeight: 600, color: '#374151' }}>Sponsorship</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[['self', 'fas fa-user', 'Self-Sponsored'], ['guardian', 'fas fa-users', 'Guardian / Sponsor']].map(([val, ico, lbl]) => (
                                        <button key={val} type="button" onClick={() => setForm(f => ({ ...f, sponsorship: val }))}
                                            style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `1.5px solid ${form.sponsorship === val ? '#fe730c' : '#e8ecf4'}`, background: form.sponsorship === val ? 'rgba(254,115,12,.07)' : '#f8fafc', color: form.sponsorship === val ? '#fe730c' : '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <i className={ico}></i> {lbl}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Guardian fields */}
                            {form.sponsorship === 'guardian' && (
                                <div style={{ background: '#fafbff', border: '1.5px solid #e8ecf4', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
                                    <p style={{ margin: '0 0 14px', fontSize: '.78rem', fontWeight: 700, color: '#374151', fontFamily: 'Poppins,sans-serif' }}>Guardian / Sponsor Details</p>
                                    {[
                                        { name: 'sponsor_name',  label: 'Full Name', type: 'text',  required: true,  placeholder: 'Guardian full name' },
                                        { name: 'sponsor_email', label: 'Email',     type: 'email', required: true,  placeholder: 'guardian@example.com' },
                                        { name: 'sponsor_phone', label: 'Phone',     type: 'tel',   required: false, placeholder: '+1 234 567 8900' },
                                    ].map(f => (
                                        <div key={f.name} style={{ marginBottom: f.name === 'sponsor_phone' ? 0 : 12 }}>
                                            <label style={{ display: 'block', marginBottom: 5, fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600, color: '#374151' }}>
                                                {f.label} {f.required && <span style={{ color: '#dc2626' }}>*</span>}
                                            </label>
                                            <input type={f.type} required={f.required} placeholder={f.placeholder} value={form[f.name]}
                                                onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${formErrors[f.name] ? '#fca5a5' : '#e8ecf4'}`, fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', outline: 'none', background: '#fff', boxSizing: 'border-box' }} />
                                            {formErrors[f.name] && <p style={{ margin: '3px 0 0', fontSize: '.72rem', color: '#dc2626', fontFamily: 'Poppins,sans-serif' }}>{formErrors[f.name][0]}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setEnrollModal(null)}
                                    style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e8ecf4', background: '#f8fafc', color: '#64748b', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.84rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? .75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {submitting ? <><i className="fas fa-circle-notch fa-spin"></i> Submitting…</> : <><i className="fas fa-paper-plane"></i> Submit Enrollment</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
