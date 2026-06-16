import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/AccessDenied';

export default function StudentAdmissionLetter() {
    const { user, token, can } = useAuth();
    const [dlLoading, setDlLoading] = useState(false);

    if (!can('admission_letter', 'view')) {
        return <div className="db-content"><AccessDenied /></div>;
    }

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

    return (
        <div className="db-content" style={{ overflowY: 'auto', padding: '28px 28px 48px', flex: 1 }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>

                {/* Header card */}
                <div style={{ background: 'linear-gradient(135deg,#081f4e,#0d2d6b)', borderRadius: 16, padding: '32px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(254,115,12,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fas fa-envelope-open-text" style={{ color: '#fe730c', fontSize: '1.5rem' }}></i>
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Poppins,sans-serif' }}>Admission Letter</div>
                        <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.83rem', marginTop: 4 }}>Your official admission letter from the institution.</div>
                    </div>
                </div>

                {/* Info card */}
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '24px 28px', marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 12px', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', color: '#111827', fontWeight: 700 }}>
                        <i className="fas fa-info-circle" style={{ color: '#2563eb', marginRight: 8 }}></i>
                        About Your Admission Letter
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: '.85rem', lineHeight: 1.8 }}>
                        <li>Your admission letter is generated based on your most recent <strong>approved</strong> enrollment.</li>
                        <li>It includes your admission number, course details, fee structure, and orientation schedule.</li>
                        <li>The letter is downloaded as a PDF file.</li>
                    </ul>
                </div>

                {/* Download section */}
                {can('admission_letter', 'download') ? (
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827', fontFamily: 'Poppins,sans-serif' }}>Download PDF</div>
                            <div style={{ color: '#6b7280', fontSize: '.8rem', marginTop: 3 }}>Requires an approved enrollment on your account.</div>
                        </div>
                        <button
                            onClick={downloadAdmissionLetter}
                            disabled={dlLoading}
                            style={{ background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 26px', fontWeight: 700, fontSize: '.85rem', cursor: dlLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, opacity: dlLoading ? .75 : 1, fontFamily: 'Poppins,sans-serif' }}
                        >
                            {dlLoading
                                ? <><i className="fas fa-spinner fa-spin"></i> Generating…</>
                                : <><i className="fas fa-download"></i> Download Letter</>}
                        </button>
                    </div>
                ) : (
                    <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 14, padding: '18px 24px', color: '#92400e', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <i className="fas fa-lock"></i>
                        You can view this page but do not have permission to download the admission letter. Please contact your administrator.
                    </div>
                )}
            </div>
        </div>
    );
}
