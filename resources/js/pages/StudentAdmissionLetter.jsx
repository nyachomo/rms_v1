import { useState, useEffect, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageTitleContext } from '../components/LearningLayout';
import AccessDenied from '../components/AccessDenied';

const STATUS_COLORS = {
    approved: { bg: '#d1fae5', color: '#065f46' },
    pending:  { bg: '#fef3c7', color: '#92400e' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
};

export default function StudentAdmissionLetter() {
    const { token, can } = useAuth();
    const { setPageTitle } = useContext(PageTitleContext);
    const canDownload = can('admission_letter', 'download');

    useEffect(() => { setPageTitle('Admission Letter'); }, []);

    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [dlLoading, setDlLoading]     = useState({});

    if (!can('admission_letter', 'view')) {
        return <div className="db-content"><AccessDenied /></div>;
    }

    useEffect(() => {
        fetch('/api/learning/my-approved-enrollments', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(async r => {
                const data = await r.json();
                if (!r.ok) { setError(data.message || 'Failed to load enrollments.'); return; }
                setEnrollments(Array.isArray(data) ? data : []);
            })
            .catch(() => setError('Network error — please check your connection.'))
            .finally(() => setLoading(false));
    }, [token]);

    const download = async (enrollment) => {
        setDlLoading(prev => ({ ...prev, [enrollment.id]: true }));
        try {
            const r = await fetch(`/api/learning/enrollments/${enrollment.id}/admission-letter`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            if (!r.ok) {
                const data = await r.json().catch(() => ({}));
                alert(data.message || 'Download failed. Please try again.');
                return;
            }
            const blob   = await r.blob();
            const url    = URL.createObjectURL(blob);
            const a      = document.createElement('a');
            a.href       = url;
            a.download   = `Admission_Letter_${enrollment.course?.title?.replace(/\s+/g, '_') ?? 'Course'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Download failed. Please try again.');
        } finally {
            setDlLoading(prev => ({ ...prev, [enrollment.id]: false }));
        }
    };

    const approved = enrollments.filter(e => e.status === 'approved').length;
    const pending  = enrollments.filter(e => e.status === 'pending').length;

    return (
        <div className="db-content" style={{ padding: '28px 24px' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                <div>
                    <h1 style={{ fontFamily:'Poppins,sans-serif', color:'#081f4e', fontSize:'1.5rem', fontWeight:700, margin:0 }}>
                        <i className="fas fa-envelope-open-text" style={{ color:'#fe730c', marginRight:10 }}></i>
                        Admission Letters
                    </h1>
                    <p style={{ color:'#666', margin:'4px 0 0', fontSize:'.9rem' }}>Download your official admission letter for each enrolled course</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
                {[
                    { label:'Total Enrollments', value: enrollments.length, icon:'fa-graduation-cap',      color:'#8b5cf6' },
                    { label:'Approved',           value: approved,           icon:'fa-check-circle',        color:'#10b981' },
                    { label:'Pending',            value: pending,            icon:'fa-clock',               color:'#f59e0b' },
                    { label:'Letters Available',  value: approved,           icon:'fa-envelope-open-text',  color:'#3b82f6' },
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

            {/* Table */}
            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.88rem' }}>
                        <thead>
                            <tr style={{ background:'#081f4e', color:'#fff' }}>
                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Course</th>
                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Intake</th>
                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Status</th>
                                <th style={{ padding:'12px 14px', textAlign:'center', fontWeight:600 }}>Admission Letter</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ marginRight:8 }}></i>Loading...
                                </td></tr>
                            ) : error ? (
                                <tr><td colSpan={4} style={{ textAlign:'center', padding:40, color:'#b91c1c' }}>
                                    <i className="fas fa-exclamation-circle" style={{ marginRight:8 }}></i>{error}
                                </td></tr>
                            ) : enrollments.length === 0 ? (
                                <tr><td colSpan={4} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                    <i className="fas fa-folder-open" style={{ marginRight:8 }}></i>
                                    No approved enrollments found.
                                </td></tr>
                            ) : enrollments.map((e, i) => {
                                const sc   = STATUS_COLORS[e.status] ?? STATUS_COLORS.pending;
                                const busy = dlLoading[e.id] ?? false;
                                return (
                                    <tr key={e.id} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                <div style={{ width:36, height:36, borderRadius:9, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                                                    {e.course?.image_url
                                                        ? <img src={e.course.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:9 }} />
                                                        : <i className={`fas ${e.course?.icon_class ?? 'fa-graduation-cap'}`} style={{ fontSize:'.95rem', color:'#6366f1' }}></i>
                                                    }
                                                </div>
                                                <span style={{ fontWeight:600, color:'#081f4e' }}>{e.course?.title ?? '—'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0', color:'#555' }}>
                                            {e.intake?.intake_name ?? '—'}
                                        </td>
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                            <span style={{ background:sc.bg, color:sc.color, padding:'3px 10px', borderRadius:20, fontSize:'.75rem', fontWeight:700 }}>
                                                {e.status}
                                            </span>
                                        </td>
                                        <td style={{ padding:'12px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'center' }}>
                                            {canDownload ? (
                                                <button
                                                    onClick={() => download(e)}
                                                    disabled={busy}
                                                    style={{ background: busy ? '#ccc' : '#f59e0b', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', cursor: busy ? 'not-allowed' : 'pointer', fontSize:'.78rem', fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
                                                    {busy
                                                        ? <><i className="fas fa-spinner fa-spin"></i> Generating…</>
                                                        : <><i className="fas fa-download"></i> Download</>
                                                    }
                                                </button>
                                            ) : (
                                                <span style={{ color:'#bbb', fontSize:'.78rem' }}>
                                                    <i className="fas fa-lock" style={{ marginRight:4 }}></i>No access
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
        </div>
    );
}
