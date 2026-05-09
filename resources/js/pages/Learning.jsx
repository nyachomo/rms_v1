import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';

export default function Learning() {
    const { user, token, can, loading: authLoading } = useAuth();
    const [courses, setCourses]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [apiError, setApiError] = useState('');
    const [activeTab, setActiveTab] = useState('not_started');

    useEffect(() => {
        if (authLoading || !token) return;
        fetch('/api/learning/my-courses', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(async r => {
                if (r.status === 401) { setApiError('Session expired. Please log out and log in again.'); return []; }
                const data = await r.json();
                if (!r.ok) { setApiError(data.message || `Server error (${r.status}).`); return []; }
                return Array.isArray(data) ? data : [];
            })
            .then(d => setCourses(d))
            .catch(() => setApiError('Network error — please check your connection.'))
            .finally(() => setLoading(false));
    }, [token, authLoading]);

    const firstName       = user?.name?.split(' ')[0] ?? 'there';
    const totalCompleted  = courses.reduce((s, c) => s + c.completed_lessons, 0);
    const totalLessons    = courses.reduce((s, c) => s + c.total_lessons, 0);
    const avgProgress     = courses.length ? Math.round(courses.reduce((s, c) => s + c.progress_percent, 0) / courses.length) : 0;
    const scoredCourses   = courses.filter(c => c.avg_exam_score !== null);
    const overallAvgScore = scoredCourses.length
        ? Math.round(scoredCourses.reduce((s, c) => s + c.avg_exam_score, 0) / scoredCourses.length * 10) / 10
        : null;
    const inProgress      = courses.filter(c => c.progress_percent > 0 && c.progress_percent < 100);
    const completed       = courses.filter(c => c.progress_percent === 100);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    if (!can('learning', 'view')) {
        return (
            <div className="db-wrap">
                <DashboardSidebar />
                <div className="db-main">
                    <DashboardNavbar page="My Learning" />
                    <div className="db-content"><AccessDenied /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="My Learning" />
                <div className="db-content" style={{ overflowY: 'auto' }}>

                    {/* ── Welcome Banner ── */}
                    <div style={{
                        background: '#fff',
                        borderRadius: 20, padding: '32px 36px', marginBottom: 24,
                        border: '1.5px solid #e8ecf4',
                        boxShadow: '0 2px 16px rgba(8,31,78,.06)',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        {/* Decorative blobs */}
                        <div style={{ position:'absolute', top:-60, right:60, width:260, height:260, borderRadius:'50%', background:'rgba(254,115,12,.04)', pointerEvents:'none' }}></div>
                        <div style={{ position:'absolute', bottom:-40, right:-20, width:160, height:160, borderRadius:'50%', background:'rgba(8,31,78,.03)', pointerEvents:'none' }}></div>
                        <div style={{ position:'absolute', top:20, right:220, width:80, height:80, borderRadius:'50%', background:'rgba(99,102,241,.06)', pointerEvents:'none' }}></div>

                        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
                            <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ margin:'0 0 6px', color:'#94a3b8', fontSize:'.78rem', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>
                                    {greeting}
                                </p>
                                <h1 style={{ margin:'0 0 8px', color:'#081f4e', fontSize:'1.65rem', fontWeight:800, lineHeight:1.15 }}>
                                    {firstName}! Ready to learn?
                                </h1>
                                <p style={{ margin:'0 0 26px', color:'#64748b', fontSize:'.87rem', maxWidth:500 }}>
                                    {inProgress.length > 0
                                        ? `You have ${inProgress.length} course${inProgress.length !== 1 ? 's' : ''} in progress. Keep going!`
                                        : courses.length > 0
                                            ? "All caught up! Review your courses or explore something new."
                                            : "Start your learning journey by enrolling in a course."}
                                </p>

                                {/* Stat chips */}
                                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                                    {[
                                        { icon:'fa-book-open',    val: courses.length,    label:'Enrolled',                  bg:'#eff6ff', col:'#1d4ed8' },
                                        { icon:'fa-check-circle', val: totalCompleted,    label:`of ${totalLessons} lessons`, bg:'#f0fdf4', col:'#16a34a' },
                                        { icon:'fa-chart-line',   val:`${avgProgress}%`,  label:'Avg Progress',               bg:'#fff7ed', col:'#ea580c' },
                                        ...(overallAvgScore !== null ? [{ icon:'fa-star', val:`${overallAvgScore}%`, label:'Exam Avg', bg:'#f5f3ff', col:'#7c3aed' }] : []),
                                    ].map(s => (
                                        <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, border:`1px solid ${s.bg}` }}>
                                            <i className={`fas ${s.icon}`} style={{ color:s.col, fontSize:'1rem', flexShrink:0 }}></i>
                                            <div>
                                                <div style={{ color:s.col, fontWeight:800, fontSize:'1.1rem', lineHeight:1 }}>{s.val}</div>
                                                <div style={{ color:'#94a3b8', fontSize:'.7rem', marginTop:2 }}>{s.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ── Error banner ── */}
                    {apiError && (
                        <div style={{ background:'#fff5f5', border:'1.5px solid #fca5a5', borderRadius:12, padding:'14px 18px', marginBottom:20, display:'flex', gap:12, alignItems:'flex-start' }}>
                            <i className="fas fa-exclamation-circle" style={{ color:'#dc2626', marginTop:2, flexShrink:0 }}></i>
                            <div>
                                <p style={{ margin:'0 0 2px', fontWeight:700, color:'#991b1b', fontSize:'.88rem' }}>Could not load your courses</p>
                                <p style={{ margin:0, color:'#7f1d1d', fontSize:'.82rem' }}>{apiError}</p>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ textAlign:'center', padding:'70px 0', color:'#9ca3af' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize:'2rem', display:'block', color:'#fe730c', marginBottom:12 }}></i>
                            Loading your courses…
                        </div>
                    ) : courses.length === 0 && !apiError ? (
                        /* ── Empty state ── */
                        <div style={{ background:'#fff', borderRadius:20, border:'2px dashed #e2e8f0', padding:'70px 24px', textAlign:'center' }}>
                            <div style={{ width:80, height:80, borderRadius:24, background:'linear-gradient(135deg,#e0e7ff,#c7d2fe)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'2rem', color:'#6366f1' }}>
                                <i className="fas fa-book-open"></i>
                            </div>
                            <h3 style={{ margin:'0 0 8px', color:'#1e293b', fontWeight:800, fontSize:'1.15rem' }}>No courses yet</h3>
                            <p style={{ margin:'0 0 24px', color:'#9ca3af', fontSize:'.9rem' }}>Your approved enrollments will appear here. Browse available courses to get started.</p>
                            <Link to="/courses" style={{
                                display:'inline-flex', alignItems:'center', gap:8,
                                background:'linear-gradient(135deg,#081f4e,#1a3a7a)',
                                color:'#fff', borderRadius:12, padding:'11px 26px',
                                textDecoration:'none', fontWeight:700, fontSize:'.88rem',
                            }}>
                                <i className="fas fa-search"></i> Browse Courses
                            </Link>
                        </div>
                    ) : (() => {
                        const notStarted = courses.filter(c => c.progress_percent === 0);
                        const TABS = [
                            { key: 'not_started', label: 'Not Started',   icon: 'fa-flag',         color: '#6366f1', courses: notStarted },
                            { key: 'in_progress', label: 'In Progress',   icon: 'fa-play-circle',  color: '#fe730c', courses: inProgress },
                            { key: 'completed',   label: 'Completed',     icon: 'fa-check-circle', color: '#16a34a', courses: completed  },
                        ];
                        const current = TABS.find(t => t.key === activeTab);
                        return (
                            <>
                                {/* ── Tabs ── */}
                                <div style={{ display:'flex', gap:8, marginBottom:24, background:'#fff', borderRadius:14, padding:6, border:'1.5px solid #e8ecf4', boxShadow:'0 2px 8px rgba(8,31,78,.04)' }}>
                                    {TABS.map(t => {
                                        const active = activeTab === t.key;
                                        return (
                                            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                                                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                                                padding:'10px 16px', borderRadius:10, border:'none', cursor:'pointer',
                                                fontFamily:'Poppins,sans-serif', fontSize:'.83rem', fontWeight:600,
                                                background: active ? t.color : 'transparent',
                                                color: active ? '#fff' : '#64748b',
                                                transition:'all .2s',
                                            }}>
                                                <i className={`fas ${t.icon}`} style={{ fontSize:'.8rem' }}></i>
                                                {t.label}
                                                <span style={{
                                                    background: active ? 'rgba(255,255,255,.25)' : '#f1f5f9',
                                                    color: active ? '#fff' : '#64748b',
                                                    fontSize:'.7rem', fontWeight:700,
                                                    padding:'1px 8px', borderRadius:20,
                                                }}>
                                                    {t.courses.length}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* ── Tab content ── */}
                                {current.courses.length === 0 ? (
                                    <div style={{ background:'#fff', borderRadius:16, border:'2px dashed #e2e8f0', padding:'50px 24px', textAlign:'center' }}>
                                        <i className={`fas ${current.icon}`} style={{ fontSize:'2rem', color:'#e2e8f0', display:'block', marginBottom:12 }}></i>
                                        <p style={{ margin:0, color:'#94a3b8', fontSize:'.9rem', fontFamily:'Poppins,sans-serif' }}>No {current.label.toLowerCase()} courses.</p>
                                    </div>
                                ) : (
                                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:18 }}>
                                        {current.courses.map(item => <CourseCard key={item.enrollment_id} item={item} />)}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}


function CourseCard({ item }) {
    const c   = item.course;
    const pct = item.progress_percent;
    const isComplete  = pct === 100;
    const isNotStarted = pct === 0;

    const score      = item.avg_exam_score;
    const scoreColor = score === null ? '#9ca3af' : score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
    const scoreBg    = score === null ? '#f8fafc'  : score >= 70 ? '#f0fdf4'  : score >= 50 ? '#fffbeb'  : '#fef2f2';
    const scoreBorder= score === null ? '#e2e8f0'  : score >= 70 ? '#bbf7d0'  : score >= 50 ? '#fde68a'  : '#fca5a5';

    const btnBg    = isComplete
        ? 'linear-gradient(135deg,#16a34a,#15803d)'
        : isNotStarted
            ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
            : 'linear-gradient(135deg,#fe730c,#f97316)';
    const btnIcon = isComplete ? 'fa-check-double' : isNotStarted ? 'fa-play' : 'fa-play-circle';
    const btnText = isComplete ? 'Review Course' : isNotStarted ? 'Start Learning' : 'Continue';

    return (
        <div style={{
            background:'#fff', borderRadius:18, border:'1.5px solid #e8edf5',
            overflow:'hidden', boxShadow:'0 2px 10px rgba(8,31,78,.05)',
            display:'flex', flexDirection:'column',
            transition:'transform .2s, box-shadow .2s',
        }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 10px 32px rgba(8,31,78,.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 10px rgba(8,31,78,.05)'; }}>

            {/* Image / icon banner */}
            <div style={{ height:148, background:'linear-gradient(135deg,#081f4e,#0d2d6b)', position:'relative', overflow:'hidden', flexShrink:0 }}>
                {c.image_url
                    ? <img src={c.image_url} alt={c.title} style={{ width:'100%', height:'100%', objectFit:'cover', opacity:.75 }} />
                    : (
                        <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <i className={c.icon_class || c.icon || 'fas fa-book-open'} style={{ fontSize:'3rem', color:'rgba(255,255,255,.15)' }}></i>
                        </div>
                    )
                }
                {/* Gradient overlay */}
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 30%, rgba(8,31,78,.75))' }}></div>

                {/* Category chip */}
                {c.category && (
                    <span style={{ position:'absolute', top:12, left:12, fontSize:'.68rem', fontWeight:700, background:'rgba(255,255,255,.15)', backdropFilter:'blur(6px)', color:'#fff', borderRadius:50, padding:'3px 10px', border:'1px solid rgba(255,255,255,.2)' }}>
                        {c.category}
                    </span>
                )}

                {/* Progress badge on image */}
                <div style={{ position:'absolute', bottom:12, left:14, right:14, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ height:5, flex:1, background:'rgba(255,255,255,.2)', borderRadius:50, overflow:'hidden', marginRight:10 }}>
                        <div style={{ width:`${pct}%`, height:'100%', background: isComplete ? '#4ade80' : '#fe730c', borderRadius:50, transition:'width .5s' }}></div>
                    </div>
                    <span style={{ fontSize:'.72rem', fontWeight:800, color: isComplete ? '#4ade80' : '#fdba74', whiteSpace:'nowrap' }}>{pct}%</span>
                </div>
            </div>

            {/* Card body */}
            <div style={{ padding:'16px 18px 18px', flex:1, display:'flex', flexDirection:'column' }}>
                <h3 style={{ margin:'0 0 6px', fontSize:'.95rem', fontWeight:800, color:'#1e293b', lineHeight:1.3 }}>{c.title}</h3>

                <div style={{ display:'flex', gap:14, marginBottom:14, color:'#94a3b8', fontSize:'.75rem', flexWrap:'wrap' }}>
                    {c.duration && (
                        <span><i className="fas fa-clock" style={{ marginRight:4 }}></i>{c.duration}</span>
                    )}
                    <span><i className="fas fa-layer-group" style={{ marginRight:4 }}></i>{item.total_lessons} lesson{item.total_lessons !== 1 ? 's' : ''}</span>
                    {item.completed_lessons > 0 && (
                        <span style={{ color:'#16a34a' }}>
                            <i className="fas fa-check" style={{ marginRight:4 }}></i>{item.completed_lessons} done
                        </span>
                    )}
                </div>

                {/* Exam score row */}
                {item.exam_count > 0 && (
                    <div style={{
                        display:'flex', alignItems:'center', gap:8, marginBottom:14,
                        background: scoreBg, borderRadius:10, padding:'8px 12px',
                        border:`1px solid ${scoreBorder}`, flexShrink:0,
                    }}>
                        <i className="fas fa-clipboard-check" style={{ color: scoreColor, fontSize:'.75rem', flexShrink:0 }}></i>
                        <span style={{ fontSize:'.75rem', color:'#64748b', flex:1 }}>
                            {item.exam_count} assessment{item.exam_count !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontWeight:800, fontSize:'.9rem', color: scoreColor }}>
                            {score !== null ? `${score}%` : 'Not attempted'}
                        </span>
                    </div>
                )}

                {/* Spacer */}
                <div style={{ flex:1 }}></div>

                {/* CTA button */}
                <Link to={`/dashboard/learning/${c.slug}`} style={{
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    background: btnBg, color:'#fff', borderRadius:12,
                    padding:'11px 16px', textDecoration:'none', fontWeight:700,
                    fontSize:'.87rem', marginTop:4,
                }}>
                    <i className={`fas ${btnIcon}`}></i>
                    {btnText}
                    <i className="fas fa-arrow-right" style={{ marginLeft:'auto', fontSize:'.75rem', opacity:.7 }}></i>
                </Link>
            </div>
        </div>
    );
}
