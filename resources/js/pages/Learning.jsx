import { useState, useEffect, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageTitleContext } from '../components/LearningLayout';
import AccessDenied from '../components/AccessDenied';

const PROGRESS_STATUS = (pct) => {
    if (pct === 100) return { label: 'Completed',   bg: '#d1fae5', color: '#065f46' };
    if (pct > 0)     return { label: 'In Progress',  bg: '#dbeafe', color: '#1e40af' };
    return               { label: 'Not Started',  bg: '#f1f5f9', color: '#475569' };
};

export default function Learning() {
    const { token, can, loading: authLoading } = useAuth();
    const { setPageTitle } = useContext(PageTitleContext);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [apiError, setApiError]       = useState('');
    const [search, setSearch]           = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => { setPageTitle('My Learning'); }, []);

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

    if (!can('learning', 'view')) {
        return <div className="db-content"><AccessDenied /></div>;
    }

    const notStarted = enrollments.filter(e => e.progress_percent === 0).length;
    const inProgress = enrollments.filter(e => e.progress_percent > 0 && e.progress_percent < 100).length;
    const completed  = enrollments.filter(e => e.progress_percent === 100).length;

    const STATUS_TABS = [
        { key: 'all',         label: 'All',        icon: 'fa-th-large',    count: enrollments.length },
        { key: 'not_started', label: 'Not Started', icon: 'fa-flag',        count: notStarted },
        { key: 'in_progress', label: 'In Progress', icon: 'fa-play-circle', count: inProgress },
        { key: 'completed',   label: 'Completed',   icon: 'fa-check-circle',count: completed  },
    ];

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return enrollments.filter(item => {
            const c = item.course;
            const matchQ = !q || c.title?.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q);
            const pct = item.progress_percent;
            const matchStatus =
                statusFilter === 'all'         ? true :
                statusFilter === 'not_started' ? pct === 0 :
                statusFilter === 'in_progress' ? (pct > 0 && pct < 100) :
                statusFilter === 'completed'   ? pct === 100 : true;
            return matchQ && matchStatus;
        });
    }, [enrollments, search, statusFilter]);

    return (
        <div className="db-content" style={{ padding: '28px 24px' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                <div>
                    <h1 style={{ fontFamily:'Poppins,sans-serif', color:'#081f4e', fontSize:'1.5rem', fontWeight:700, margin:0 }}>
                        <i className="fas fa-book-reader" style={{ color:'#fe730c', marginRight:10 }}></i>
                        My Learning
                    </h1>
                    <p style={{ color:'#666', margin:'4px 0 0', fontSize:'.9rem' }}>Track your enrolled courses, progress and assessment scores</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
                {[
                    { label:'Total Courses',  value: enrollments.length, icon:'fa-graduation-cap', color:'#8b5cf6' },
                    { label:'Not Started',    value: notStarted,          icon:'fa-flag',           color:'#64748b' },
                    { label:'In Progress',    value: inProgress,          icon:'fa-play-circle',    color:'#3b82f6' },
                    { label:'Completed',      value: completed,           icon:'fa-check-circle',   color:'#10b981' },
                ].map(card => (
                    <div key={card.label} style={{ background:'#fff', borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 6px rgba(0,0,0,.08)', borderLeft:`4px solid ${card.color}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                            <i className={`fas ${card.icon}`} style={{ color:card.color, fontSize:'1.1rem' }}></i>
                            <span style={{ color:'#666', fontSize:'.82rem', fontWeight:600 }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize:'1.3rem', fontWeight:700, color:'#081f4e' }}>{card.value}</div>
                    </div>
                ))}
            </div>

            {/* Filter tabs + Search */}
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {STATUS_TABS.map(({ key, label, icon, count }) => {
                        const active = statusFilter === key;
                        return (
                            <button key={key} onClick={() => setStatusFilter(key)}
                                style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:50, border:`1.5px solid ${active ? '#081f4e' : '#e2e8f0'}`, background: active ? '#081f4e' : '#fff', color: active ? '#fff' : '#475569', fontSize:'.8rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s' }}>
                                <i className={`fas ${icon}`} style={{ fontSize:'.72rem' }}></i>
                                {label}
                                <span style={{ background: active ? 'rgba(255,255,255,.2)' : '#f1f5f9', color: active ? '#fff' : '#64748b', fontSize:'.68rem', fontWeight:700, padding:'1px 7px', borderRadius:20 }}>{count}</span>
                            </button>
                        );
                    })}
                </div>
                <div style={{ flex:1, minWidth:200, position:'relative' }}>
                    <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:'.85rem', pointerEvents:'none' }}></i>
                    <input
                        type="text"
                        placeholder="Search your courses…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width:'100%', padding:'9px 14px 9px 36px', border:'1px solid #ddd', borderRadius:8, fontSize:'.9rem', boxSizing:'border-box' }}
                    />
                </div>
            </div>

            {/* Error */}
            {apiError && (
                <div style={{ background:'#fff5f5', border:'1.5px solid #fca5a5', borderRadius:12, padding:'14px 18px', marginBottom:20, color:'#7f1d1d', fontSize:'.85rem' }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight:8 }}></i>{apiError}
                </div>
            )}

            {/* Table */}
            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.88rem' }}>
                        <thead>
                            <tr style={{ background:'#081f4e', color:'#fff' }}>
                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Course</th>
                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600, minWidth:140 }}>Progress</th>
                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Assessments</th>
                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Lessons</th>
                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Status</th>
                                <th style={{ padding:'12px 14px', textAlign:'center', fontWeight:600 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ marginRight:8 }}></i>Loading your courses…
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign:'center', padding:48, color:'#999' }}>
                                    <i className="fas fa-book-open" style={{ fontSize:'2rem', display:'block', marginBottom:10 }}></i>
                                    {enrollments.length === 0 ? 'No enrolled courses yet.' : 'No courses match your search.'}
                                    {enrollments.length === 0 && (
                                        <div style={{ marginTop:14 }}>
                                            <Link to="/dashboard/learning/browse"
                                                style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#fe730c,#f97316)', color:'#fff', borderRadius:8, padding:'9px 22px', textDecoration:'none', fontWeight:700, fontSize:'.85rem' }}>
                                                <i className="fas fa-search"></i> Browse Courses
                                            </Link>
                                        </div>
                                    )}
                                </td></tr>
                            ) : filtered.map((item, i) => {
                                const c   = item.course;
                                const pct = item.progress_percent;
                                const st  = PROGRESS_STATUS(pct);
                                const score      = item.avg_exam_score;
                                const scoreColor = score === null ? '#9ca3af' : score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';

                                const btnBg   = pct === 100 ? '#10b981' : pct === 0 ? '#6366f1' : '#fe730c';
                                const btnIcon = pct === 100 ? 'fa-check-double' : pct === 0 ? 'fa-play' : 'fa-play-circle';
                                const btnText = pct === 100 ? 'Review' : pct === 0 ? 'Start' : 'Continue';

                                return (
                                    <tr key={item.enrollment_id} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>

                                        {/* Course */}
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                <div style={{ width:38, height:38, borderRadius:10, background: c.image_url ? `url(${c.image_url}) center/cover no-repeat` : 'linear-gradient(135deg,#fe730c,#f97316)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                                                    {!c.image_url && <i className={c.icon || c.icon_class || 'fas fa-book'} style={{ color:'#fff', fontSize:'.85rem' }}></i>}
                                                </div>
                                                <div style={{ minWidth:0 }}>
                                                    <div style={{ fontWeight:700, color:'#081f4e', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:220 }}>{c.title}</div>
                                                    {c.level && <div style={{ fontSize:'.72rem', color:'#888', marginTop:1, textTransform:'capitalize' }}>{c.level}</div>}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Progress */}
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                <div style={{ flex:1, height:6, background:'#e5e7eb', borderRadius:50, overflow:'hidden', minWidth:80 }}>
                                                    <div style={{ width:`${pct}%`, height:'100%', background: pct === 100 ? '#10b981' : '#fe730c', borderRadius:50, transition:'width .4s' }}></div>
                                                </div>
                                                <span style={{ fontSize:'.78rem', fontWeight:700, color: pct === 100 ? '#10b981' : '#fe730c', whiteSpace:'nowrap' }}>{pct}%</span>
                                            </div>
                                        </td>

                                        {/* Assessments */}
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                            {item.exam_count > 0 ? (
                                                <div>
                                                    <div style={{ fontWeight:700, color:scoreColor, fontSize:'.88rem' }}>
                                                        {score !== null ? `${score}%` : 'Not attempted'}
                                                    </div>
                                                    <div style={{ fontSize:'.72rem', color:'#888' }}>{item.exam_count} assessment{item.exam_count !== 1 ? 's' : ''}</div>
                                                </div>
                                            ) : (
                                                <span style={{ color:'#bbb', fontSize:'.82rem' }}>—</span>
                                            )}
                                        </td>

                                        {/* Lessons */}
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                            <div style={{ fontWeight:600, color:'#081f4e', fontSize:'.88rem' }}>
                                                {item.completed_lessons}/{item.total_lessons}
                                            </div>
                                            <div style={{ fontSize:'.72rem', color:'#888' }}>
                                                {item.total_lessons} lesson{item.total_lessons !== 1 ? 's' : ''}
                                                {c.duration && ` · ${c.duration}`}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                            <span style={{ background:st.bg, color:st.color, padding:'3px 10px', borderRadius:20, fontSize:'.75rem', fontWeight:700, whiteSpace:'nowrap' }}>
                                                {st.label}
                                            </span>
                                        </td>

                                        {/* Action */}
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'center' }}>
                                            <Link to={`/dashboard/learning/${c.slug}`}
                                                style={{ display:'inline-flex', alignItems:'center', gap:6, background:btnBg, color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', textDecoration:'none', fontSize:'.78rem', fontWeight:700, whiteSpace:'nowrap' }}>
                                                <i className={`fas ${btnIcon}`}></i> {btnText}
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
