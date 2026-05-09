import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';

/* ── Helpers ── */
function scoreColor(score, passMark) {
    if (score == null) return { bg: 'transparent', fg: '#cbd5e1' };
    if (score >= passMark) return { bg: '#dcfce7', fg: '#16a34a' };
    return { bg: '#fee2e2', fg: '#dc2626' };
}

function avgColor(avg) {
    if (avg == null) return { bg: 'transparent', fg: '#cbd5e1' };
    if (avg >= 70) return { bg: '#dcfce7', fg: '#16a34a' };
    if (avg >= 50) return { bg: '#fef9c3', fg: '#ca8a04' };
    return { bg: '#fee2e2', fg: '#dc2626' };
}

const cell = {
    padding: '8px 10px', fontSize: '.78rem', borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap', verticalAlign: 'middle',
};
const th = {
    padding: '8px 10px', fontSize: '.72rem', fontWeight: 700,
    background: '#f8fafc', color: '#475569', whiteSpace: 'nowrap',
    borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle',
};
const thModule = {
    ...th, background: '#1e293b', color: '#fff',
    textAlign: 'center', borderBottom: '2px solid #0f172a',
};
const thExam = {
    ...th, background: '#334155', color: '#e2e8f0',
    textAlign: 'center', borderBottom: '2px solid #1e293b',
    maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis',
};
const thAvg = {
    ...th, background: '#0f172a', color: '#94a3b8',
    textAlign: 'center', borderBottom: '2px solid #020617',
};

function ScoreCell({ scoreData, passMark }) {
    if (!scoreData) {
        return <td style={{ ...cell, textAlign: 'center', color: '#cbd5e1' }}>—</td>;
    }
    const { score, passed, attempts } = scoreData;
    const { bg, fg } = scoreColor(score, passMark);
    return (
        <td style={{ ...cell, textAlign: 'center', background: bg }}>
            <span style={{ color: fg, fontWeight: 700 }}>{score}%</span>
            <span style={{ display: 'block', color: '#94a3b8', fontSize: '.65rem' }}>
                {passed ? '✓ passed' : '✗ failed'} · {attempts} {attempts === 1 ? 'try' : 'tries'}
            </span>
        </td>
    );
}

function AvgCell({ avg, isClass }) {
    if (avg == null) {
        return <td style={{ ...cell, textAlign: 'center', color: '#cbd5e1', background: isClass ? '#f8fafc' : undefined }}>—</td>;
    }
    const { bg, fg } = avgColor(avg);
    return (
        <td style={{ ...cell, textAlign: 'center', background: isClass ? '#f0f4ff' : bg + 'aa', fontWeight: 700, color: fg }}>
            {avg}%
        </td>
    );
}

function SummaryCard({ icon, label, value, color }) {
    return (
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={icon} style={{ color, fontSize: '1rem' }}></i>
            </div>
            <div>
                <div style={{ fontSize: '.72rem', color: '#94a3b8', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
            </div>
        </div>
    );
}

export default function AdminScores() {
    const { token, can } = useAuth();

    if (!can('student_scores', 'view')) return <AccessDenied />;

    return <AdminScoresInner token={token} />;
}

function AdminScoresInner({ token }) {
    const [courses, setCourses]         = useState([]);
    const [courseId, setCourseId]       = useState('');
    const [data, setData]               = useState(null);
    const [loadingCourses, setLCourses] = useState(true);
    const [loading, setLoading]         = useState(false);
    const [search, setSearch]           = useState('');

    useEffect(() => {
        fetch('/api/admin/scores/courses', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(setCourses)
            .finally(() => setLCourses(false));
    }, [token]);

    useEffect(() => {
        if (!courseId) { setData(null); return; }
        setLoading(true);
        setData(null);
        fetch(`/api/admin/courses/${courseId}/scores`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [courseId, token]);

    const filtered = useMemo(() => {
        if (!data?.students) return [];
        const q = search.trim().toLowerCase();
        if (!q) return data.students;
        return data.students.filter(s =>
            s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
        );
    }, [data, search]);

    /* ── Summary stats ── */
    const summary = useMemo(() => {
        if (!data?.students?.length) return null;
        const total   = data.students.length;
        const attempted = data.students.filter(s => s.course_avg !== null).length;
        const passed  = data.students.filter(s => {
            if (!s.scores) return false;
            return Object.values(s.scores).some(v => v?.passed);
        }).length;
        return { total, attempted, passed, classAvg: data.course_avg };
    }, [data]);

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="Student Scores" />
                <div className="db-content">

                    <div className="db-topbar">
                        <div>
                            <h1 className="db-page-title">Student Scores</h1>
                            <p className="db-page-sub">Gradebook — scores per assessment, module and course</p>
                        </div>
                    </div>

                    {/* Course selector */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', marginBottom: 20 }}>
                        <label style={{ fontSize: '.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                            Select Course
                        </label>
                        {loadingCourses ? (
                            <div style={{ color: '#94a3b8', fontSize: '.85rem' }}>Loading courses…</div>
                        ) : courses.length === 0 ? (
                            <div style={{ color: '#f97316', fontSize: '.85rem' }}>
                                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                                No courses have assessments configured yet.
                            </div>
                        ) : (
                            <select
                                value={courseId}
                                onChange={e => { setCourseId(e.target.value); setSearch(''); }}
                                style={{
                                    padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                                    fontSize: '.88rem', color: '#1e293b', background: '#fff',
                                    minWidth: 300, cursor: 'pointer', outline: 'none',
                                }}
                            >
                                <option value="">— Choose a course —</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem' }}></i>
                            <div style={{ marginTop: 10, fontSize: '.9rem' }}>Loading gradebook…</div>
                        </div>
                    )}

                    {/* No exams in course */}
                    {data && data.modules.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                            <i className="fas fa-clipboard-list" style={{ fontSize: '2rem' }}></i>
                            <div style={{ marginTop: 10 }}>This course has no published assessments.</div>
                        </div>
                    )}

                    {data && data.modules.length > 0 && (
                        <>
                            {/* Summary cards */}
                            {summary && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
                                    <SummaryCard icon="fas fa-users"        label="Enrolled Students" value={summary.total}                        color="#6366f1" />
                                    <SummaryCard icon="fas fa-pen-alt"      label="Attempted Any Exam" value={summary.attempted}                   color="#0ea5e9" />
                                    <SummaryCard icon="fas fa-check-circle" label="Has a Passing Score" value={summary.passed}                    color="#22c55e" />
                                    <SummaryCard icon="fas fa-chart-line"   label="Class Average"
                                        value={summary.classAvg !== null ? `${summary.classAvg}%` : '—'}                                          color="#f59e0b" />
                                </div>
                            )}

                            {/* Search */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
                                    <i className="fas fa-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.8rem' }}></i>
                                    <input
                                        type="text"
                                        placeholder="Filter students by name or email…"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                    {search && (
                                        <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                            <i className="fas fa-times"></i>
                                        </button>
                                    )}
                                </div>
                                <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>
                                    {filtered.length} student{filtered.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Gradebook */}
                            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
                                        <thead>
                                            {/* Row 1: module group headers */}
                                            <tr>
                                                <th style={{ ...th, textAlign: 'left' }} rowSpan={2}>Student</th>
                                                {data.modules.map(m => (
                                                    <th key={m.id} style={{ ...thModule }}
                                                        colSpan={m.exams.length + 1}
                                                        title={m.title}>
                                                        {m.title}
                                                    </th>
                                                ))}
                                                <th style={{ ...thAvg, background: '#4f46e5', color: '#c7d2fe' }} rowSpan={2}>
                                                    Course<br />Avg
                                                </th>
                                            </tr>

                                            {/* Row 2: exam names + module avg */}
                                            <tr>
                                                {data.modules.map(m => (
                                                    <>
                                                        {m.exams.map(e => (
                                                            <th key={e.id} style={{ ...thExam }} title={e.title}>
                                                                <span style={{ display: 'block', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {e.title}
                                                                </span>
                                                                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '.65rem' }}>
                                                                    pass ≥{e.pass_mark}%
                                                                </span>
                                                            </th>
                                                        ))}
                                                        <th key={`avg-${m.id}`} style={{ ...thAvg }}>Mod Avg</th>
                                                    </>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {/* Student rows */}
                                            {filtered.length === 0 ? (
                                                <tr>
                                                    <td colSpan={999} style={{ ...cell, textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                                                        No students match your search.
                                                    </td>
                                                </tr>
                                            ) : filtered.map(student => (
                                                <tr key={student.user_id} style={{ transition: 'background .15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                    <td style={{ ...cell, minWidth: 180 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{
                                                                width: 30, height: 30, borderRadius: '50%', background: '#6366f11a',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0, fontSize: '.72rem', fontWeight: 700, color: '#6366f1',
                                                            }}>
                                                                {student.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                                            </div>
                                                            <div style={{ minWidth: 0 }}>
                                                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '.82rem' }}>{student.name}</div>
                                                                <div style={{ color: '#94a3b8', fontSize: '.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {data.modules.map(m => (
                                                        <>
                                                            {m.exams.map(e => (
                                                                <ScoreCell
                                                                    key={e.id}
                                                                    scoreData={student.scores[e.id]}
                                                                    passMark={e.pass_mark}
                                                                />
                                                            ))}
                                                            <AvgCell key={`mavg-${m.id}`} avg={student.module_avgs[m.id]} />
                                                        </>
                                                    ))}
                                                    <AvgCell avg={student.course_avg} />
                                                </tr>
                                            ))}

                                            {/* Class average row */}
                                            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                                <td style={{ ...cell, fontWeight: 700, color: '#475569', fontSize: '.78rem' }}>
                                                    <i className="fas fa-chart-bar" style={{ marginRight: 6, color: '#6366f1' }}></i>
                                                    Class Average
                                                </td>
                                                {data.modules.map(m => (
                                                    <>
                                                        {m.exams.map(e => {
                                                            const avg = data.exam_avgs[e.id];
                                                            return <AvgCell key={e.id} avg={avg} isClass />;
                                                        })}
                                                        <AvgCell key={`mavg-${m.id}`} avg={data.module_avgs[m.id]} isClass />
                                                    </>
                                                ))}
                                                <AvgCell avg={data.course_avg} isClass />
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                                {[
                                    { bg: '#dcfce7', fg: '#16a34a', label: 'Passed' },
                                    { bg: '#fee2e2', fg: '#dc2626', label: 'Failed' },
                                    { bg: '#f0f4ff', fg: '#4f46e5', label: 'Average (class row)' },
                                    { label: '— = not attempted', fg: '#94a3b8', bg: '#fff', border: '1px solid #e2e8f0' },
                                ].map(({ bg, fg, label, border }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.72rem', color: '#64748b' }}>
                                        <span style={{ width: 14, height: 14, borderRadius: 4, background: bg, border, display: 'inline-block', flexShrink: 0 }}></span>
                                        <span style={{ color: fg, fontWeight: 600 }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
