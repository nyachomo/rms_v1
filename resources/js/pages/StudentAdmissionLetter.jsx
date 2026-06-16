import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/AccessDenied';

export default function StudentAdmissionLetter() {
    const { token, can } = useAuth();
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
            const blob     = await r.blob();
            const url      = URL.createObjectURL(blob);
            const a        = document.createElement('a');
            const course   = enrollment.course?.title?.replace(/\s+/g, '_') ?? 'Course';
            a.href         = url;
            a.download     = `Admission_Letter_${course}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Download failed. Please try again.');
        } finally {
            setDlLoading(prev => ({ ...prev, [enrollment.id]: false }));
        }
    };

    return (
        <div className="db-content" style={{ overflowY: 'auto', padding: '28px 28px 48px', flex: 1 }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#081f4e,#0d2d6b)', borderRadius: 16, padding: '28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(254,115,12,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-envelope-open-text" style={{ color: '#fe730c', fontSize: '1.4rem' }}></i>
                </div>
                <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', fontFamily: 'Poppins,sans-serif' }}>Admission Letters</div>
                    <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.82rem', marginTop: 3 }}>Download your official admission letter for each enrolled course.</div>
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: 12, display: 'block' }}></i>
                    Loading your enrollments…
                </div>
            ) : error ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '18px 22px', color: '#b91c1c', fontSize: '.87rem' }}>
                    <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>{error}
                </div>
            ) : enrollments.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '48px 28px', textAlign: 'center' }}>
                    <i className="fas fa-folder-open" style={{ fontSize: '2rem', color: '#d1d5db', marginBottom: 12, display: 'block' }}></i>
                    <div style={{ fontWeight: 700, color: '#374151', fontFamily: 'Poppins,sans-serif', marginBottom: 6 }}>No approved enrollments</div>
                    <div style={{ color: '#9ca3af', fontSize: '.84rem' }}>Your admission letter will appear here once your enrollment is approved.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {enrollments.map(enrollment => {
                        const course    = enrollment.course;
                        const intake    = enrollment.intake;
                        const busy      = dlLoading[enrollment.id] ?? false;
                        const canDl     = can('admission_letter', 'download');

                        return (
                            <div key={enrollment.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>

                                {/* Course icon */}
                                <div style={{ width: 46, height: 46, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                    {course?.image_url
                                        ? <img src={course.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                                        : <i className={`fas ${course?.icon_class ?? 'fa-graduation-cap'}`} style={{ fontSize: '1.1rem', color: '#6366f1' }}></i>
                                    }
                                </div>

                                {/* Course info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '.92rem', color: '#111827', fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {course?.title ?? 'Course'}
                                    </div>
                                    {intake?.intake_name && (
                                        <div style={{ color: '#6b7280', fontSize: '.78rem', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <i className="fas fa-calendar-alt" style={{ fontSize: '.7rem' }}></i>
                                            {intake.intake_name}
                                        </div>
                                    )}
                                </div>

                                {/* Download button */}
                                {canDl ? (
                                    <button
                                        onClick={() => download(enrollment)}
                                        disabled={busy}
                                        style={{ background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 20px', fontWeight: 700, fontSize: '.8rem', cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, opacity: busy ? .75 : 1, fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap' }}
                                    >
                                        {busy
                                            ? <><i className="fas fa-spinner fa-spin"></i> Generating…</>
                                            : <><i className="fas fa-download"></i> Download Letter</>}
                                    </button>
                                ) : (
                                    <span style={{ color: '#9ca3af', fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <i className="fas fa-lock"></i> No download access
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
