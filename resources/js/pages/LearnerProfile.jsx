import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
    PieChart, Pie,
} from 'recharts';

export default function LearnerProfile() {
    const { user, token } = useAuth();

    // Courses data
    const [courses, setCourses]       = useState([]);
    const [coursesLoading, setCoursesLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetch('/api/learning/my-courses', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setCourses(d); })
            .finally(() => setCoursesLoading(false));
    }, [token]);

    // Derived stats
    const totalEnrolled  = courses.length;
    const totalCompleted = courses.filter(c => c.progress_percent === 100).length;
    const avgProgress    = totalEnrolled
        ? Math.round(courses.reduce((s, c) => s + c.progress_percent, 0) / totalEnrolled)
        : 0;
    const scoredCourses  = courses.filter(c => c.avg_exam_score !== null);
    const accumScore     = scoredCourses.length
        ? Math.round(scoredCourses.reduce((s, c) => s + c.avg_exam_score, 0) / scoredCourses.length * 10) / 10
        : null;


    return (
        <div className="db-content" style={{ overflowY: 'auto' }}>
                    <div style={{ maxWidth: 1020, margin: '0 auto' }}>

                        {/* ── Stats row ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                            {[
                                { icon: 'fa-book-open',    label: 'Enrolled',        val: coursesLoading ? '…' : totalEnrolled,                        bg: '#eff6ff', col: '#1d4ed8', iconBg: '#dbeafe' },
                                { icon: 'fa-graduation-cap', label: 'Completed',     val: coursesLoading ? '…' : totalCompleted,                       bg: '#f0fdf4', col: '#16a34a', iconBg: '#dcfce7' },
                                { icon: 'fa-tasks',         label: 'Avg Progress',   val: coursesLoading ? '…' : `${avgProgress}%`,                    bg: '#fff7ed', col: '#c2410c', iconBg: '#fed7aa' },
                                { icon: 'fa-star',          label: 'Accum. Score',   val: coursesLoading ? '…' : (accumScore !== null ? `${accumScore}%` : '—'), bg: '#fdf4ff', col: '#7c3aed', iconBg: '#e9d5ff' },
                            ].map(s => (
                                <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, border: `1.5px solid ${s.iconBg}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <i className={`fas ${s.icon}`} style={{ color: s.col, fontSize: '1.1rem' }}></i>
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '1.5rem', color: s.col, lineHeight: 1 }}>{s.val}</div>
                                        <div style={{ fontSize: '.72rem', color: '#64748b', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Learning Analytics ── */}
                        {!coursesLoading && courses.length > 0 && (() => {
                            const short = t => t ? (t.length > 18 ? t.slice(0, 16) + '…' : t) : '';

                            const progressData = courses.map(c => ({
                                name: short(c.course?.title),
                                Progress: c.progress_percent,
                            }));

                            const scoreData = courses.map(c => ({
                                name: short(c.course?.title),
                                Score: c.avg_exam_score ?? 0,
                                hasScore: c.avg_exam_score !== null,
                            }));

                            const pieData = [
                                { name: 'Completed',   value: totalCompleted,                  fill: '#16a34a' },
                                { name: 'In Progress', value: totalEnrolled - totalCompleted,   fill: '#6366f1' },
                            ].filter(d => d.value > 0);

                            const PROGRESS_COLORS = ['#6366f1','#4f46e5','#7c3aed','#0ea5e9','#10b981'];
                            const SCORE_COLOR = s => s >= 70 ? '#16a34a' : s >= 50 ? '#d97706' : '#dc2626';

                            const CustomTooltip = ({ active, payload, label, suffix = '%' }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                    <div style={{ background: '#1e293b', borderRadius: 10, padding: '8px 14px', fontSize: '.78rem', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
                                        <p style={{ margin: 0, fontWeight: 700, marginBottom: 4 }}>{label}</p>
                                        {payload.map(p => (
                                            <p key={p.name} style={{ margin: 0, color: p.color || '#fe730c' }}>{p.name}: <strong>{p.value}{suffix}</strong></p>
                                        ))}
                                    </div>
                                );
                            };

                            return (
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className="fas fa-chart-bar" style={{ color: '#7c3aed', fontSize: '.9rem' }}></i>
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, color: '#081f4e', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.95rem' }}>Learning Analytics</h3>
                                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '.72rem' }}>Visual overview of your learning journey</p>
                                        </div>
                                    </div>

                                    {/* Row 1: Progress + Scores */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

                                        {/* Progress bar chart */}
                                        <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 16, padding: '20px 20px 14px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                                            <p style={{ margin: '0 0 16px', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', color: '#0c1a3a' }}>
                                                <i className="fas fa-tasks" style={{ color: '#6366f1', marginRight: 7 }}></i>Course Progress
                                            </p>
                                            <ResponsiveContainer width="100%" height={Math.max(140, courses.length * 38)}>
                                                <BarChart data={progressData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={90} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Bar dataKey="Progress" radius={[0, 6, 6, 0]} maxBarSize={18}>
                                                        {progressData.map((_, i) => (
                                                            <Cell key={i} fill={PROGRESS_COLORS[i % PROGRESS_COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Score bar chart */}
                                        <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 16, padding: '20px 20px 14px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                                            <p style={{ margin: '0 0 16px', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', color: '#0c1a3a' }}>
                                                <i className="fas fa-star" style={{ color: '#d97706', marginRight: 7 }}></i>Assessment Scores
                                            </p>
                                            <ResponsiveContainer width="100%" height={Math.max(140, courses.length * 38)}>
                                                <BarChart data={scoreData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={90} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Bar dataKey="Score" radius={[0, 6, 6, 0]} maxBarSize={18}>
                                                        {scoreData.map((d, i) => (
                                                            <Cell key={i} fill={d.hasScore ? SCORE_COLOR(d.Score) : '#e2e8f0'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Row 2: Donut + Legend */}
                                    {pieData.length > 0 && (
                                        <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 16, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', display: 'flex', alignItems: 'center', gap: 32 }}>
                                            <div style={{ flexShrink: 0 }}>
                                                <p style={{ margin: '0 0 12px', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', color: '#0c1a3a' }}>
                                                    <i className="fas fa-graduation-cap" style={{ color: '#16a34a', marginRight: 7 }}></i>Course Status
                                                </p>
                                                <PieChart width={190} height={160}>
                                                    <Pie data={pieData} cx={90} cy={75} innerRadius={46} outerRadius={72} paddingAngle={3} dataKey="value">
                                                        {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                                    </Pie>
                                                    <Tooltip formatter={(v, n) => [`${v} course${v !== 1 ? 's' : ''}`, n]} />
                                                </PieChart>
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {pieData.map(d => (
                                                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 12, height: 12, borderRadius: 3, background: d.fill, flexShrink: 0 }}></div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#374151' }}>{d.name}</div>
                                                            <div style={{ fontSize: '.7rem', color: '#94a3b8' }}>{d.value} course{d.value !== 1 ? 's' : ''}</div>
                                                        </div>
                                                        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '1.1rem', color: d.fill }}>
                                                            {Math.round((d.value / totalEnrolled) * 100)}%
                                                        </div>
                                                    </div>
                                                ))}
                                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: '#e2e8f0', flexShrink: 0 }}></div>
                                                    <div style={{ flex: 1, fontSize: '.78rem', color: '#94a3b8' }}>Overall completion rate</div>
                                                    <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#0c1a3a' }}>
                                                        {totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* ── Enrolled Courses ── */}
                        <div style={{ background: '#fff', border: '1.5px solid #e8ecf4', borderRadius: 18, marginBottom: 28, overflow: 'hidden', boxShadow: '0 2px 12px rgba(8,31,78,.04)' }}>
                            <div style={{ padding: '18px 24px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-layer-group" style={{ color: '#1d4ed8', fontSize: '.9rem' }}></i>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, color: '#081f4e', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.95rem' }}>My Courses</h3>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '.73rem' }}>Courses you are enrolled in</p>
                                </div>
                            </div>

                            {coursesLoading && (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: '#6366f1' }}></i>
                                </div>
                            )}

                            {!coursesLoading && courses.length === 0 && (
                                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                                    <i className="fas fa-book-open" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: 10, display: 'block' }}></i>
                                    <p style={{ color: '#9ca3af', fontSize: '.85rem', margin: '0 0 14px' }}>You haven't enrolled in any courses yet.</p>
                                    <Link to="/dashboard/learning/browse"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', textDecoration: 'none', fontSize: '.8rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif' }}>
                                        <i className="fas fa-search"></i> Browse Courses
                                    </Link>
                                </div>
                            )}

                            {!coursesLoading && courses.map((c, idx) => {
                                const pct = c.progress_percent ?? 0;
                                const score = c.avg_exam_score;
                                const scoreColor = score === null ? '#9ca3af' : score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
                                const isLast = idx === courses.length - 1;
                                return (
                                    <div key={c.enrollment_id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: isLast ? 'none' : '1px solid #f8fafc', background: '#fff' }}>
                                        {/* Icon */}
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className={c.course?.icon_class || 'fas fa-book'} style={{ color: '#fff', fontSize: '1rem' }}></i>
                                        </div>

                                        {/* Title + meta */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, color: '#0c1a3a', fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Poppins,sans-serif' }}>
                                                {c.course?.title}
                                            </div>
                                            <div style={{ fontSize: '.71rem', color: '#94a3b8', marginTop: 2 }}>
                                                {c.course?.category} · {c.completed_lessons}/{c.total_lessons} lessons
                                            </div>
                                            {/* Progress bar */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                                                <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : 'linear-gradient(90deg,#6366f1,#4f46e5)', borderRadius: 99, transition: 'width .5s ease' }}></div>
                                                </div>
                                                <span style={{ fontSize: '.68rem', fontWeight: 700, color: pct === 100 ? '#16a34a' : '#6366f1', minWidth: 34, textAlign: 'right' }}>{pct}%</span>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 62 }}>
                                            <div style={{ fontSize: '.62rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Score</div>
                                            <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '1.1rem', color: scoreColor }}>
                                                {score !== null ? `${score}%` : '—'}
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <div style={{ flexShrink: 0 }}>
                                            {pct === 100
                                                ? <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 20, padding: '4px 10px', fontSize: '.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><i className="fas fa-check-circle" style={{ fontSize: '.65rem' }}></i> Completed</span>
                                                : <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 10px', fontSize: '.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner" style={{ fontSize: '.65rem' }}></i> In Progress</span>
                                            }
                                        </div>

                                        {/* Go to course */}
                                        <Link to={`/dashboard/learning/${c.course?.slug}`}
                                            style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', textDecoration: 'none', fontSize: '.78rem' }}
                                            title="Go to course">
                                            <i className="fas fa-arrow-right"></i>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </div>
    );
}

