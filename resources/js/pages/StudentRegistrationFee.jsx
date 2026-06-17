import { useState, useEffect, useCallback, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageTitleContext } from '../components/LearningLayout';

function fmtKsh(n) {
    if (n === null || n === undefined || n === '') return '—';
    return 'Ksh ' + parseFloat(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StudentRegistrationFee() {
    const { token, can } = useAuth();
    const { setPageTitle } = useContext(PageTitleContext);
    const canDownload = can('registration_fees', 'download');

    useEffect(() => { setPageTitle('Registration Fee'); }, []);

    const h = useCallback(() => ({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
    }), [token]);

    const [record, setRecord]   = useState(null);  // the user row with registration_fee
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');

    useEffect(() => {
        fetch('/api/registration-fees', { headers: h() })
            .then(r => r.json())
            .then(data => {
                const row = (data.data ?? [])[0] ?? null;
                setRecord(row);
            })
            .catch(() => setError('Failed to load registration fee.'))
            .finally(() => setLoading(false));
    }, []);

    const handleDownload = () => {
        window.open(
            `/api/registration-fees/${record.registration_fee.id}/receipt?token=${token}`,
            '_blank'
        );
    };

    const fee = record?.registration_fee ?? null;

    return (
        <div className="db-content" style={{ padding: '28px 24px' }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: 'Poppins,sans-serif', color: '#081f4e', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                    <i className="fas fa-id-card" style={{ color: '#fe730c', marginRight: 10 }}></i>
                    Registration Fee
                </h1>
                <p style={{ color: '#666', margin: '4px 0 0', fontSize: '.9rem' }}>
                    Your one-time registration fee payment details
                </p>
            </div>

            {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                </div>
            ) : !fee ? (
                /* Not yet paid */
                <div style={{ background: '#fff', borderRadius: 14, padding: '40px 32px', boxShadow: '0 1px 6px rgba(0,0,0,.08)', textAlign: 'center', maxWidth: 480 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                        <i className="fas fa-exclamation-circle" style={{ color: '#e53e3e', fontSize: '2rem' }}></i>
                    </div>
                    <h2 style={{ fontFamily: 'Poppins,sans-serif', color: '#081f4e', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
                        Registration Fee Not Paid
                    </h2>
                    <p style={{ color: '#666', fontSize: '.9rem', lineHeight: 1.6, margin: 0 }}>
                        Your registration fee has not been recorded yet. Please contact the administration office to make your payment.
                    </p>
                </div>
            ) : (
                /* Paid */
                <div style={{ maxWidth: 560 }}>
                    {/* Status banner */}
                    <div style={{ background: 'linear-gradient(135deg,#065f46,#047857)', borderRadius: 14, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fas fa-check-circle" style={{ color: '#fff', fontSize: '1.6rem' }}></i>
                        </div>
                        <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem' }}>Registration Fee Paid</div>
                            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '.85rem', marginTop: 2 }}>
                                {fmtKsh(fee.amount_paid)} &bull; {fee.date_paid?.slice(0, 10)}
                            </div>
                        </div>
                    </div>

                    {/* Details card */}
                    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' }}>
                        <div style={{ background: '#081f4e', color: '#fff', padding: '14px 20px' }}>
                            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Payment Details</div>
                        </div>

                        {[
                            { label: 'Amount Paid',     value: fmtKsh(fee.amount_paid), color: '#10b981' },
                            { label: 'Date Paid',       value: fee.date_paid?.slice(0, 10) ?? '—' },
                            { label: 'Payment Method',  value: fee.payment_method ?? '—' },
                            { label: 'Reference No',    value: fee.payment_ref_no || '—', color: '#3b82f6' },
                        ].map(row => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid #f5f5f5' }}>
                                <span style={{ color: '#666', fontSize: '.88rem', fontWeight: 500 }}>{row.label}</span>
                                <span style={{ fontWeight: 700, color: row.color ?? '#081f4e', fontSize: '.9rem' }}>{row.value}</span>
                            </div>
                        ))}

                        {canDownload && (
                            <div style={{ padding: '16px 20px' }}>
                                <button onClick={handleDownload} style={{ width: '100%', padding: '11px', background: '#081f4e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '.9rem', fontFamily: 'Poppins,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <i className="fas fa-download"></i>
                                    Download Receipt
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
