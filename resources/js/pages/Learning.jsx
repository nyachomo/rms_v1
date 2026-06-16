import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/AccessDenied';

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

export default function Learning() {
    const { user, token, can, loading: authLoading } = useAuth();
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [apiError, setApiError]       = useState('');
    const [search, setSearch]           = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dlLoading, setDlLoading]     = useState(false);

    const downloadAdmissionLetter = async () => {
        setDlLoading(true);
        try {
            const r = await fetch('/api/learning/admission-letter', {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            if (!r.ok) {
                const data = await r.json().catch(() => ({}));
                alert(data.message || 'No approved enrollment found for your account.');
                return;
            }
            const blob = await r.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `Admission_Letter_${user?.name?.replace(/\s+/g, '_') ?? 'Student'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Download failed. Please try again.');
        } finally {
            setDlLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading || !token) return;
        fetch('/api/learning/my-courses', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(async r => {
                if (r.status === 401) { setApiError('Session expired. Please log in again.'); return []; }
                const data = await r.json();
                if (!r.ok) { setApiError(data.message || `Server error (${r.status}).`); return []; }
                return Array.isArray(data) ? data : [];
            })
            .then(d => setEnrollments(d))
            .catch(() => setApiError('Network error — please check your connection.'))
            .finally(() => setLoading(false));
    }, [token, authLoading]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return enrollments.filter(item => {
            const c = item.course;
            const matchQ = !q || c.title?.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q);
            const pct = item.progress_percent;
            const matchStatus =
                statusFilter === 'all' ? true :
                statusFilter === 'not_started' ? pct === 0 :
                statusFilter === 'in_progress' ? pct > 0 && pct < 100 :
                statusFilter === 'completed'   ? pct === 100 : true;
            return matchQ && matchStatus;
        });
    }, [enrollments, search, statusFilter]);

    if (!can('learning', 'view')) {
        return <div className="db-content"><AccessDenied /></div>;
    }

    const notStarted = enrollments.filter(c => c.progress_percent === 0).length;
    const inProgress = enrollments.filter(c => c.progress_percent > 0 && c.progress_percent < 100).length;
    const completed  = enrollments.filter(c => c.progress_percent === 100).length;

    const STATUS_TABS = [
        { key: 'all',         label: 'All',         icon: 'fa-th-large',     count: enrollments.length },
        { key: 'not_started', label: 'Not Started',  icon: 'fa-flag',         count: notStarted },
        { key: 'in_progress', label: 'In Progress',  icon: 'fa-play-circle',  count: inProgress },
        { key: 'completed',   label: 'Completed',    icon: 'fa-check-circle', count: completed  },
    ];

    return (
        <div className="db-content" style={{ overflowY: 'auto', padding: '28px 28px 48px', flex: 1 }}>

                    {/* ── Admission Letter Banner ── */}
                    {can('admission_letter', 'view') && <div style={{ background: 'linear-gradient(135deg,#081f4e,#0d2d6b)', borderRadius: 12, padding: '16px 22px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(254,115,12,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fas fa-envelope-open-text" style={{ color: '#fe730c', fontSize: '1.1rem' }}></i>
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: '.92rem' }}>Admission Letter</div>
                                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.78rem', marginTop: 2 }}>Download your official admission letter (requires approved enrollment).</div>
                            </div>
                        </div>
                        {can('admission_letter', 'download') && <button
                            onClick={downloadAdmissionLetter}
                            disabled={dlLoading}
                            style={{ background: '#fe730c', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: '.83rem', cursor: dlLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, opacity: dlLoading ? .75 : 1 }}
                        >
                            {dlLoading
                                ? <><i className="fas fa-spinner fa-spin"></i> Generating…</>
                                : <><i className="fas fa-download"></i> Download Letter</>}
                        </button>}
                    </div>}

                    {/* ── Status filter tabs ── */}
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 18, scrollbarWidth: 'none' }}>
                        {STATUS_TABS.map(({ key, label, icon, count }) => {
                            const active = statusFilter === key;
                            return (
                                <button key={key} onClick={() => setStatusFilter(key)}
                                    style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 50, border: `1.5px solid ${active ? '#081f4e' : '#e2e8f0'}`, background: active ? '#081f4e' : '#fff', color: active ? '#fff' : '#475569', fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                                    <i className={`fas ${icon}`} style={{ fontSize: '.72rem' }}></i>
                                    {label}
                                    <span style={{ background: active ? 'rgba(255,255,255,.2)' : '#f1f5f9', color: active ? '#fff' : '#64748b', fontSize: '.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Search + count ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <i className="fas fa-search" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.88rem', pointerEvents: 'none' }}></i>
                            <input
                                type="text"
                                placeholder="Search your courses…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ width: '100%', padding: '13px 16px 13px 42px', borderRadius: 50, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.88rem', outline: 'none', background: '#fff', boxShadow: '0 2px 8px rgba(8,31,78,.05)', boxSizing: 'border-box' }}
                            />
                        </div>
                        {!loading && (
                            <span style={{ flexShrink: 0, padding: '10px 20px', borderRadius: 50, background: '#f1f5f9', color: '#475569', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: 700, border: '1.5px solid #e8ecf4', whiteSpace: 'nowrap' }}>
                                {filtered.length} course{filtered.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* ── Error ── */}
                    {apiError && (
                        <div style={{ background: '#fff5f5', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <i className="fas fa-exclamation-circle" style={{ color: '#dc2626', marginTop: 2, flexShrink: 0 }}></i>
                            <p style={{ margin: 0, color: '#7f1d1d', fontSize: '.85rem' }}>{apiError}</p>
                        </div>
                    )}

                    {/* ── Loading ── */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 14, flexDirection: 'column' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#fe730c' }}></i>
                            <p style={{ color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.88rem', margin: 0 }}>Loading your courses…</p>
                        </div>

                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '70px 20px', color: '#94a3b8', fontFamily: 'Poppins,sans-serif' }}>
                            <i className="fas fa-book-open" style={{ fontSize: '2.5rem', marginBottom: 16, display: 'block' }}></i>
                            <p style={{ fontSize: '.95rem', margin: '0 0 16px' }}>
                                {enrollments.length === 0 ? 'No enrolled courses yet.' : 'No courses match your search.'}
                            </p>
                            {enrollments.length === 0 && (
                                <Link to="/dashboard/learning/browse"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', borderRadius: 12, padding: '11px 26px', textDecoration: 'none', fontWeight: 700, fontSize: '.88rem' }}>
                                    <i className="fas fa-search"></i> Browse Courses
                                </Link>
                            )}
                        </div>

                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 22 }}>
                            {filtered.map(item => <CourseCard key={item.enrollment_id} item={item} />)}
                        </div>
                    )}
        </div>
    );
}

function CourseCard({ item }) {
    const c   = item.course;
    const pct = item.progress_percent;
    const isComplete   = pct === 100;
    const isNotStarted = pct === 0;

    const lvlSt  = levelStyle(c.level);
    const bdgSt  = c.badge ? badgeStyle(c.badge) : null;
    const tags   = Array.isArray(c.tags) ? c.tags.slice(0, 4) : [];

    const score       = item.avg_exam_score;
    const scoreColor  = score === null ? '#9ca3af' : score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
    const scoreBg     = score === null ? '#f8fafc'  : score >= 70 ? '#f0fdf4'  : score >= 50 ? '#fffbeb'  : '#fef2f2';
    const scoreBorder = score === null ? '#e2e8f0'  : score >= 70 ? '#bbf7d0'  : score >= 50 ? '#fde68a'  : '#fca5a5';

    const btnBg   = isComplete ? 'linear-gradient(135deg,#059669,#10b981)' : isNotStarted ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'linear-gradient(135deg,#fe730c,#f97316)';
    const btnIcon = isComplete ? 'fa-check-double' : isNotStarted ? 'fa-play' : 'fa-play-circle';
    const btnText = isComplete ? 'Review Course'  : isNotStarted ? 'Start Learning' : 'Continue Learning';

    return (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #e8ecf4', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(8,31,78,.06)', transition: 'transform .2s,box-shadow .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(8,31,78,.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 10px rgba(8,31,78,.06)'; }}>

            {/* Hero image */}
            <div style={{ height: 170, background: c.image_url ? `url(${c.image_url}) center/cover no-repeat` : 'linear-gradient(135deg,#081f4e,#1a1254)', position: 'relative', flexShrink: 0 }}>
                {!c.image_url && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={c.icon || c.icon_class || 'fas fa-book-open'} style={{ fontSize: '3rem', color: 'rgba(255,255,255,.18)' }}></i>
                    </div>
                )}
                {/* Level chip */}
                {c.level && (
                    <span style={{ position: 'absolute', top: 12, left: 12, padding: '4px 11px', borderRadius: 20, background: lvlSt.bg, color: lvlSt.color, fontSize: '.67rem', fontWeight: 800, textTransform: 'capitalize' }}>
                        {c.level}
                    </span>
                )}
                {/* Badge chip */}
                {bdgSt && (
                    <span style={{ position: 'absolute', top: 12, right: 12, padding: '4px 11px', borderRadius: 20, background: bdgSt.bg, color: bdgSt.color, fontSize: '.67rem', fontWeight: 800, textTransform: 'capitalize' }}>
                        {c.badge}
                    </span>
                )}
                {/* Progress bar overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.25)', borderRadius: 50, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: isComplete ? '#4ade80' : '#fe730c', borderRadius: 50, transition: 'width .5s' }}></div>
                    </div>
                    <span style={{ fontSize: '.7rem', fontWeight: 800, color: isComplete ? '#4ade80' : '#fdba74', whiteSpace: 'nowrap' }}>{pct}%</span>
                </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Icon + Title */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#fe730c,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={c.icon || c.icon_class || 'fas fa-book'} style={{ color: '#fff', fontSize: '.95rem' }}></i>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '.92rem', fontWeight: 800, color: '#081f4e', fontFamily: 'Poppins,sans-serif', lineHeight: 1.3 }}>{c.title}</h3>
                </div>

                {/* Subtitle */}
                {(c.subtitle || c.description) && (
                    <p style={{ margin: '0 0 10px', fontSize: '.78rem', color: '#64748b', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {c.subtitle || c.description}
                    </p>
                )}

                {/* Exam score */}
                {item.exam_count > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, background: scoreBg, borderRadius: 8, padding: '6px 10px', border: `1px solid ${scoreBorder}` }}>
                        <i className="fas fa-clipboard-check" style={{ color: scoreColor, fontSize: '.72rem', flexShrink: 0 }}></i>
                        <span style={{ fontSize: '.72rem', color: '#64748b', flex: 1 }}>{item.exam_count} assessment{item.exam_count !== 1 ? 's' : ''}</span>
                        <span style={{ fontWeight: 800, fontSize: '.82rem', color: scoreColor }}>{score !== null ? `${score}%` : 'Not attempted'}</span>
                    </div>
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

            {/* Lessons meta + CTA */}
            <div style={{ padding: '8px 18px 16px', borderTop: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: '.72rem', color: '#94a3b8' }}>
                    <span><i className="fas fa-layer-group" style={{ marginRight: 4 }}></i>{item.total_lessons} lesson{item.total_lessons !== 1 ? 's' : ''}</span>
                    {item.completed_lessons > 0 && (
                        <span style={{ color: '#16a34a' }}><i className="fas fa-check" style={{ marginRight: 4 }}></i>{item.completed_lessons} done</span>
                    )}
                    {c.duration && <span><i className="fas fa-clock" style={{ marginRight: 4 }}></i>{c.duration}</span>}
                </div>
                <Link to={`/dashboard/learning/${c.slug}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px', borderRadius: 10, background: btnBg, color: '#fff', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: 700, boxSizing: 'border-box' }}>
                    <i className={`fas ${btnIcon}`}></i> {btnText}
                </Link>
            </div>
        </div>
    );
}
