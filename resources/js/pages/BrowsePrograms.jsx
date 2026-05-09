import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';

/* ─── helpers ─── */
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
};
const badgeStyle = b => BADGE_COLORS[b?.toLowerCase()] ?? { bg: '#6b7280', color: '#fff' };

const CAT_ICONS = [
    'fas fa-th-large', 'fas fa-tag', 'fas fa-leaf', 'fas fa-chart-line',
    'fas fa-graduation-cap', 'fas fa-calendar-alt', 'fas fa-flask', 'fas fa-code',
    'fas fa-paint-brush', 'fas fa-cogs',
];

function StatusBadge({ status }) {
    const s = STATUS[status];
    if (!s) return null;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: '.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
            <i className={`fas ${s.icon}`}></i> {s.label}
        </span>
    );
}

export default function BrowsePrograms() {
    const { token } = useAuth();

    const [courses, setCourses]         = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [categories, setCategories]   = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [catFilter, setCatFilter]     = useState('all');

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

    /* Counts per category slug */
    const catCounts = useMemo(() => {
        const m = {};
        courses.forEach(c => { m[c.category] = (m[c.category] ?? 0) + 1; });
        return m;
    }, [courses]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return courses.filter(c => {
            const matchQ   = !q || c.title?.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
            const matchCat = catFilter === 'all' || c.category === catFilter;
            return matchQ && matchCat;
        });
    }, [courses, search, catFilter]);

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
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="Browse Programs" />
                <div className="db-content" style={{ padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                    {/* Toast */}
                    {toast && (
                        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', maxWidth: 380, fontFamily: 'Poppins,sans-serif' }}>
                            <i className={`fas ${toast.type === 'error' ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ color: toast.type === 'error' ? '#dc2626' : '#16a34a', fontSize: '1.1rem', flexShrink: 0 }}></i>
                            <span style={{ fontSize: '.83rem', color: toast.type === 'error' ? '#991b1b' : '#15803d' }}>{toast.message}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

                        {/* ── LEFT CATEGORY SIDEBAR ── */}
                        <aside className="browse-cat-sidebar" style={{ width: 265, flexShrink: 0, background: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRight: '1px solid #e8ecf4' }}>
                            <div style={{ padding: '28px 22px 18px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                                <p style={{ margin: '0 0 4px', fontSize: '.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, fontFamily: 'Poppins,sans-serif' }}>Browse By</p>
                                <h2 style={{ margin: 0, fontSize: '.95rem', fontWeight: 800, color: '#081f4e', fontFamily: 'Poppins,sans-serif', lineHeight: 1.3 }}>Courses / Program<br/>Categories</h2>
                            </div>

                            <div style={{ padding: '0 10px 24px' }}>
                                {/* All Courses */}
                                <button
                                    onClick={() => setCatFilter('all')}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, border: 'none', outline: 'none', boxShadow: 'none', WebkitAppearance: 'none', appearance: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', background: catFilter === 'all' ? 'rgba(254,115,12,.1)' : 'none', borderLeft: catFilter === 'all' ? '3px solid #fe730c' : '3px solid transparent', marginBottom: 4, transition: 'all .15s' }}
                                >
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: catFilter === 'all' ? 'rgba(254,115,12,.2)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className="fas fa-th-large" style={{ color: catFilter === 'all' ? '#fe730c' : '#64748b', fontSize: '.8rem' }}></i>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                                        <div style={{ fontSize: '.83rem', fontWeight: 700, color: catFilter === 'all' ? '#fe730c' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>All Courses</div>
                                        <div style={{ fontSize: '.68rem', color: '#94a3b8', marginTop: 1 }}>All programs available</div>
                                    </div>
                                    <span style={{ flexShrink: 0, background: '#fe730c', color: '#fff', fontSize: '.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, minWidth: 24, textAlign: 'center' }}>{courses.length}</span>
                                </button>

                                {/* Per-category */}
                                {categories.map((cat, idx) => {
                                    const slug    = cat.slug || cat.name;
                                    const active  = catFilter === slug;
                                    const count   = catCounts[slug] ?? 0;
                                    const icon    = CAT_ICONS[(idx + 1) % CAT_ICONS.length];
                                    return (
                                        <button
                                            key={cat.id ?? slug}
                                            onClick={() => setCatFilter(slug)}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, border: 'none', outline: 'none', boxShadow: 'none', WebkitAppearance: 'none', appearance: 'none', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', background: active ? 'rgba(254,115,12,.1)' : 'none', borderLeft: `3px solid ${active ? '#fe730c' : 'transparent'}`, marginBottom: 4, transition: 'all .15s' }}
                                        >
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? 'rgba(254,115,12,.2)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className={icon} style={{ color: active ? '#fe730c' : '#64748b', fontSize: '.85rem' }}></i>
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                                                <div style={{ fontSize: '.83rem', fontWeight: 700, color: active ? '#fe730c' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                                                {cat.description && <div style={{ fontSize: '.68rem', color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description}</div>}
                                            </div>
                                            <span style={{ flexShrink: 0, background: active ? '#fe730c' : '#e8ecf4', color: active ? '#fff' : '#64748b', fontSize: '.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, minWidth: 24, textAlign: 'center' }}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </aside>

                        {/* ── MAIN CONTENT ── */}
                        <div style={{ flex: 1, minWidth: 0, padding: '28px 28px 48px', overflowY: 'auto' }}>

                            {/* Search bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <i className="fas fa-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.88rem', pointerEvents: 'none' }}></i>
                                    <input
                                        type="text"
                                        placeholder="Search course, topics, programs..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        style={{ width: '100%', padding: '13px 16px 13px 42px', borderRadius: 50, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.88rem', outline: 'none', background: '#fff', boxShadow: '0 2px 8px rgba(8,31,78,.05)', boxSizing: 'border-box' }}
                                    />
                                </div>
                                {!loading && (
                                    <span style={{ flexShrink: 0, padding: '10px 20px', borderRadius: 50, background: '#f1f5f9', color: '#475569', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: 700, border: '1.5px solid #e8ecf4', whiteSpace: 'nowrap' }}>
                                        {filtered.length} course{filtered.length !== 1 ? 's' : ''} found
                                    </span>
                                )}
                            </div>

                            {/* Grid */}
                            {loading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 14, flexDirection: 'column' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#fe730c' }}></i>
                                    <p style={{ color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.88rem', margin: 0 }}>Loading programs…</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '70px 20px', color: '#94a3b8', fontFamily: 'Poppins,sans-serif' }}>
                                    <i className="fas fa-search" style={{ fontSize: '2.5rem', marginBottom: 16, display: 'block' }}></i>
                                    <p style={{ fontSize: '.95rem', margin: 0 }}>No programs match your search.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 22 }}>
                                    {filtered.map(course => {
                                        const status  = enrollmentMap[course.id];
                                        const lvlSt   = levelStyle(course.level);
                                        const bdgSt   = course.badge ? badgeStyle(course.badge) : null;
                                        const tags    = Array.isArray(course.tags) ? course.tags.slice(0, 4) : [];

                                        return (
                                            <div key={course.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #e8ecf4', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(8,31,78,.06)', transition: 'transform .2s,box-shadow .2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(8,31,78,.12)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(8,31,78,.06)'; }}
                                            >
                                                {/* Hero image */}
                                                <div style={{ height: 170, background: course.image_url ? `url(${course.image_url}) center/cover no-repeat` : 'linear-gradient(135deg,#081f4e,#1a1254)', position: 'relative', flexShrink: 0 }}>
                                                    {!course.image_url && (
                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className={course.icon || course.icon_class || 'fas fa-book-open'} style={{ fontSize: '3rem', color: 'rgba(255,255,255,.18)' }}></i>
                                                        </div>
                                                    )}
                                                    {/* Level chip — left */}
                                                    {course.level && (
                                                        <span style={{ position: 'absolute', top: 12, left: 12, padding: '4px 11px', borderRadius: 20, background: lvlSt.bg, color: lvlSt.color, fontSize: '.67rem', fontWeight: 800, textTransform: 'capitalize', letterSpacing: '.03em', backdropFilter: 'blur(4px)' }}>
                                                            {course.level}
                                                        </span>
                                                    )}
                                                    {/* Badge chip — right */}
                                                    {bdgSt && (
                                                        <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 11px', borderRadius: 20, background: bdgSt.bg, color: bdgSt.color, fontSize: '.67rem', fontWeight: 800, textTransform: 'capitalize', letterSpacing: '.03em' }}>
                                                            {course.badge}
                                                        </span>
                                                    )}
                                                    {/* Enrollment status — bottom right */}
                                                    {status && (
                                                        <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
                                                            <StatusBadge status={status} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Card body */}
                                                <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    {/* Icon + Title */}
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                                                        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#fe730c,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <i className={course.icon || course.icon_class || 'fas fa-book'} style={{ color: '#fff', fontSize: '.95rem' }}></i>
                                                        </div>
                                                        <h3 style={{ margin: 0, fontSize: '.92rem', fontWeight: 800, color: '#081f4e', fontFamily: 'Poppins,sans-serif', lineHeight: 1.3 }}>{course.title}</h3>
                                                    </div>

                                                    {/* Description */}
                                                    {(course.subtitle || course.description) && (
                                                        <p style={{ margin: '0 0 12px', fontSize: '.78rem', color: '#64748b', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                                                            {course.subtitle || course.description}
                                                        </p>
                                                    )}

                                                    {/* Tags */}
                                                    {tags.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                                                            {tags.map((t, i) => (
                                                                <span key={i} style={{ fontSize: '.67rem', color: '#64748b', background: '#f1f5f9', padding: '3px 9px', borderRadius: 20, fontFamily: 'Poppins,sans-serif' }}>{t}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action footer */}
                                                <div style={{ padding: '10px 18px 16px', borderTop: '1px solid #f8fafc' }}>
                                                    {!status && (
                                                        <button onClick={() => openEnroll(course)}
                                                            style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                                                            <i className="fas fa-plus-circle"></i> Enroll Now
                                                        </button>
                                                    )}
                                                    {status === 'pending' && (
                                                        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '.8rem', color: '#b45309', fontFamily: 'Poppins,sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                                                            <i className="fas fa-hourglass-half"></i> Awaiting admin approval
                                                        </div>
                                                    )}
                                                    {status === 'approved' && (
                                                        <Link to={`/dashboard/learning/${course.slug}`}
                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: 700 }}>
                                                            <i className="fas fa-play-circle"></i> Continue Learning
                                                        </Link>
                                                    )}
                                                    {status === 'rejected' && (
                                                        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '.8rem', color: '#991b1b', fontFamily: 'Poppins,sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                                                            <i className="fas fa-times-circle"></i> Enrollment not approved
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Enroll Modal ── */}
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
