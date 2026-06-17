import { useEffect, useState } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/AccessDenied';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#0ea5e9'];

const tooltipStyle = {
    contentStyle: { borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.12)', fontSize: '.8rem' },
    labelStyle: { fontWeight: 600, color: '#1e293b', marginBottom: 4 },
};

function StatCard({ icon, label, value, sub, color = '#6366f1' }) {
    return (
        <div style={{
            background: '#fff', borderRadius: 14, padding: '20px 22px',
            boxShadow: '0 1px 4px rgba(0,0,0,.07)', display: 'flex',
            alignItems: 'flex-start', gap: 16,
        }}>
            <div style={{
                width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <i className={icon} style={{ fontSize: '1.15rem', color }}></i>
            </div>
            <div>
                <div style={{ fontSize: '.75rem', color: '#94a3b8', fontWeight: 500, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.1 }}>{value ?? '—'}</div>
                {sub && <div style={{ fontSize: '.72rem', color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
            </div>
        </div>
    );
}

function ChartCard({ title, children, style }) {
    return (
        <div style={{
            background: '#fff', borderRadius: 14, padding: '20px 22px',
            boxShadow: '0 1px 4px rgba(0,0,0,.07)', ...style,
        }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: '#1e293b', marginBottom: 18 }}>{title}</div>
            {children}
        </div>
    );
}

function EmptyChart({ label = 'No data yet' }) {
    return (
        <div style={{
            height: 180, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8, color: '#cbd5e1',
        }}>
            <i className="fas fa-chart-bar" style={{ fontSize: '2rem' }}></i>
            <span style={{ fontSize: '.8rem' }}>{label}</span>
        </div>
    );
}

function PieLegend({ data, colors }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 6 }}>
            {data.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.72rem', color: '#64748b' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: colors[i % colors.length], display: 'inline-block', flexShrink: 0 }}></span>
                    {d.name} ({d.value})
                </div>
            ))}
        </div>
    );
}

function DonutChart({ data, colors, height = 180, total, totalLabel }) {
    return (
        <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3}
                        startAngle={90} endAngle={-270} labelLine={false}>
                        {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                </PieChart>
            </ResponsiveContainer>
            {total != null && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none',
                    lineHeight: 1.2,
                }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>{total}</div>
                    {totalLabel && <div style={{ fontSize: '.6rem', color: '#94a3b8' }}>{totalLabel}</div>}
                </div>
            )}
        </div>
    );
}

export default function Dashboard() {
    const { token, can } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/dashboard/stats', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => setStats(data))
            .catch(() => setError('Failed to load dashboard data.'))
            .finally(() => setLoading(false));
    }, [token]);

    if (!can('dashboard', 'view')) return <AccessDenied />;

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="Dashboard" />
                <div className="db-content">
                    <div className="db-topbar">
                        <div>
                            <h1 className="db-page-title"><i className="fas fa-chart-pie"></i> Dashboard</h1>
                            <p className="db-page-sub">System overview &amp; analytics</p>
                        </div>
                    </div>

                    {can('dashboard', 'view_stats') && loading && (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                            <div style={{ marginTop: 12, fontSize: '.9rem' }}>Loading dashboard…</div>
                        </div>
                    )}

                    {can('dashboard', 'view_stats') && error && (
                        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px 20px', borderRadius: 10, marginBottom: 24 }}>
                            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>{error}
                        </div>
                    )}

                    {can('dashboard', 'view_stats') && stats && <DashboardContent stats={stats} />}
                </div>
            </div>
        </div>
    );
}

function DashboardContent({ stats }) {
    const { totals, enrollmentTrend, enrollmentByStatus, topCourses, studentsBySchool, ictByStatus, genderSplit, recentEnrollments } = stats;

    const statusBadge = s => {
        const map = {
            approved: ['#dcfce7', '#16a34a'],
            pending:  ['#fef9c3', '#ca8a04'],
            rejected: ['#fee2e2', '#dc2626'],
        };
        const [bg, fg] = map[s] || ['#f1f5f9', '#64748b'];
        return (
            <span style={{ background: bg, color: fg, fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {s}
            </span>
        );
    };

    const genderColors = ['#6366f1', '#ec4899', '#94a3b8'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── KPI cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 14 }}>
                <StatCard icon="fas fa-user-graduate"      label="Total Students"      value={totals.students}            sub={`${totals.active_students} active`}         color="#6366f1" />
                <StatCard icon="fas fa-chalkboard-teacher" label="Total Teachers"      value={totals.teachers}            sub={`${totals.active_teachers} active`}         color="#0ea5e9" />
                <StatCard icon="fas fa-book-open"          label="Published Courses"   value={totals.courses}                                                              color="#f59e0b" />
                <StatCard icon="fas fa-school"             label="Schools"             value={totals.schools}                                                              color="#22c55e" />
                <StatCard icon="fas fa-file-alt"           label="Total Enrollments"   value={totals.enrollments_total}   sub={`${totals.enrollments_approved} approved`}  color="#8b5cf6" />
                <StatCard icon="fas fa-clock"              label="Pending Enrollments" value={totals.enrollments_pending}                                                  color="#f97316" />
                <StatCard icon="fas fa-laptop-code"        label="ICT Club Members"    value={totals.ict_club_total}      sub={`${totals.ict_club_pending} pending`}        color="#ec4899" />
            </div>

            {/* ── Row 1: Enrollment trend (2fr) + Enrollment status donut (1fr) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <ChartCard title="Enrollment Trend — Last 6 Months">
                    {enrollmentTrend.every(m => m.approved === 0 && m.pending === 0) ? (
                        <EmptyChart />
                    ) : (
                        <ResponsiveContainer width="100%" height={230}>
                            <AreaChart data={enrollmentTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.28} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.28} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                <Tooltip {...tooltipStyle} />
                                <Legend wrapperStyle={{ fontSize: '.78rem' }} />
                                <Area type="monotone" dataKey="approved" name="Approved" stroke="#22c55e" fill="url(#gradApproved)" strokeWidth={2} dot={{ r: 3 }} />
                                <Area type="monotone" dataKey="pending"  name="Pending"  stroke="#f59e0b" fill="url(#gradPending)"  strokeWidth={2} dot={{ r: 3 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                <ChartCard title="Enrollments by Status">
                    {enrollmentByStatus.every(d => d.value === 0) ? (
                        <EmptyChart />
                    ) : (
                        <>
                            <DonutChart data={enrollmentByStatus} colors={PIE_COLORS} total={totals.enrollments_total} totalLabel="total" />
                            <PieLegend data={enrollmentByStatus} colors={PIE_COLORS} />
                        </>
                    )}
                </ChartCard>
            </div>

            {/* ── Row 2: Top courses (2fr) + ICT Club donut (1fr) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <ChartCard title="Top 5 Courses by Enrollment">
                    {topCourses.length === 0 ? (
                        <EmptyChart />
                    ) : (
                        <ResponsiveContainer width="100%" height={230}>
                            <BarChart data={topCourses} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="total" name="Enrollments" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                    {topCourses.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                <ChartCard title="ICT Club by Status">
                    {ictByStatus.every(d => d.value === 0) ? (
                        <EmptyChart />
                    ) : (
                        <>
                            <DonutChart data={ictByStatus} colors={PIE_COLORS} total={totals.ict_club_total} totalLabel="total" />
                            <PieLegend data={ictByStatus} colors={PIE_COLORS} />
                        </>
                    )}
                </ChartCard>
            </div>

            {/* ── Row 3: Students by school + Gender donut + Recent enrollments ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr 1fr', gap: 16 }}>
                <ChartCard title="Top 5 Schools by Student Count">
                    {studentsBySchool.length === 0 ? (
                        <EmptyChart />
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={studentsBySchool} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="total" name="Students" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                <ChartCard title="Student Gender">
                    {genderSplit.length === 0 ? (
                        <EmptyChart />
                    ) : (
                        <>
                            <DonutChart data={genderSplit} colors={genderColors} height={170} total={totals.students} totalLabel="total" />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                                {genderSplit.map((d, i) => (
                                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '.75rem', color: '#64748b' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: genderColors[i % genderColors.length], display: 'inline-block' }}></span>
                                            {d.name}
                                        </span>
                                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </ChartCard>

                <ChartCard title="Recent Enrollments">
                    {recentEnrollments.length === 0 ? (
                        <EmptyChart label="No enrollments yet" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {recentEnrollments.map((e, idx) => (
                                <div key={e.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 0',
                                    borderBottom: idx < recentEnrollments.length - 1 ? '1px solid #f1f5f9' : 'none',
                                }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                        background: '#6366f11a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '.72rem', fontWeight: 700, color: '#6366f1',
                                    }}>
                                        {e.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                                        <div style={{ fontSize: '.68rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.course}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                                        {statusBadge(e.status)}
                                        <span style={{ fontSize: '.64rem', color: '#cbd5e1' }}>{e.created_at}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ChartCard>
            </div>

        </div>
    );
}
