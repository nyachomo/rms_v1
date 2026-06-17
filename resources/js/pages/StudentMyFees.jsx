import { useState, useEffect, useCallback, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageTitleContext } from '../components/LearningLayout';

const STATUS_COLORS = {
    approved: { bg: '#d1fae5', color: '#065f46' },
    pending:  { bg: '#fef3c7', color: '#92400e' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
};

function fmtKsh(n) {
    if (n === null || n === undefined || n === '') return '—';
    const num = parseFloat(n);
    return 'Ksh ' + num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function balanceColor(balance) {
    if (balance > 0)  return '#e53e3e';
    if (balance < 0)  return '#2b6cb0';
    return '#38a169';
}

export default function StudentMyFees() {
    const { token, can } = useAuth();
    const { setPageTitle } = useContext(PageTitleContext);

    useEffect(() => { setPageTitle('My Fees'); }, []);

    const h = useCallback(() => ({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
    }), [token]);

    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');

    const [selected, setSelected]       = useState(null);
    const [payments, setPayments]       = useState([]);
    const [panelLoading, setPanelLoading] = useState(false);
    const [panelDebit, setPanelDebit]   = useState(0);
    const [panelCredit, setPanelCredit] = useState(0);
    const [panelBalance, setPanelBalance] = useState(0);

    const canDownload = can('fee_management', 'download');

    useEffect(() => {
        fetch('/api/fee-management', { headers: h() })
            .then(r => r.json())
            .then(data => {
                const list = data.data ?? [];
                setEnrollments(list);
                if (list.length === 1) loadPayments(list[0]);
            })
            .catch(() => setError('Failed to load fee information.'))
            .finally(() => setLoading(false));
    }, []);

    const loadPayments = useCallback(async (enrollment) => {
        setSelected(enrollment);
        setPanelLoading(true);
        try {
            const res  = await fetch(`/api/fee-management/enrollments/${enrollment.id}/payments`, { headers: h() });
            const data = await res.json();
            setPayments(data.payments ?? []);
            setPanelDebit(parseFloat(data.debit) || 0);
            setPanelCredit(parseFloat(data.credit) || 0);
            setPanelBalance(parseFloat(data.balance) || 0);
        } catch {
            setError('Failed to load payment details.');
        } finally {
            setPanelLoading(false);
        }
    }, [h]);

    const handleDownload = (payment) => {
        window.open(
            `/api/fee-management/enrollments/${selected.id}/payments/${payment.id}/receipt?token=${token}`,
            '_blank'
        );
    };

    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#081f4e' }}></i>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', fontFamily: 'Poppins,sans-serif' }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ color: '#081f4e', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                    <i className="fas fa-money-bill-wave" style={{ color: '#fe730c', marginRight: 10 }}></i>
                    My Fees
                </h1>
                <p style={{ color: '#666', margin: '4px 0 0', fontSize: '.9rem' }}>
                    View your course fee details and download payment receipts
                </p>
            </div>

            {error && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {enrollments.length === 0 && !error ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                    <i className="fas fa-file-invoice-dollar" style={{ fontSize: '3rem', marginBottom: 16 }}></i>
                    <p style={{ fontSize: '1rem' }}>No fee records found.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                    {/* Enrollment cards */}
                    <div style={{ flex: 1, minWidth: 280 }}>
                        {enrollments.map(e => {
                            const isActive = selected?.id === e.id;
                            const sc       = STATUS_COLORS[e.status] ?? STATUS_COLORS.pending;
                            const debit    = parseFloat(e.debit)   || 0;
                            const credit   = parseFloat(e.credit)  || 0;
                            const balance  = parseFloat(e.balance) || 0;
                            return (
                                <div key={e.id}
                                    onClick={() => loadPayments(e)}
                                    style={{
                                        background: isActive ? '#eff6ff' : '#fff',
                                        border: isActive ? '2px solid #3b82f6' : '2px solid #f0f0f0',
                                        borderRadius: 12, padding: '16px 20px', marginBottom: 14,
                                        cursor: 'pointer', transition: 'all .18s',
                                        boxShadow: isActive ? '0 2px 12px rgba(59,130,246,.15)' : '0 1px 4px rgba(0,0,0,.06)',
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#081f4e', fontSize: '.95rem' }}>
                                                {e.course?.title ?? '—'}
                                            </div>
                                            <div style={{ fontSize: '.78rem', color: '#888', marginTop: 2 }}>
                                                {e.intake?.intake_name ?? '—'}
                                            </div>
                                        </div>
                                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700, flexShrink: 0 }}>
                                            {e.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderTop: '1px solid #f0f0f0', paddingTop: 10, marginTop: 4 }}>
                                        {[
                                            { label: 'Course Fee', value: debit > 0 ? fmtKsh(debit) : 'Not set', color: '#3b82f6' },
                                            { label: 'Paid',       value: fmtKsh(credit),  color: '#10b981' },
                                            { label: 'Balance',    value: debit > 0 ? fmtKsh(balance) : '—', color: balanceColor(balance) },
                                        ].map(c => (
                                            <div key={c.label} style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '.65rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{c.label}</div>
                                                <div style={{ fontWeight: 700, color: c.color, fontSize: '.85rem' }}>{c.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Payments panel */}
                    {selected && (
                        <div style={{ width: 360, flexShrink: 0 }}>
                            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,.08)', overflow: 'hidden' }}>
                                <div style={{ background: '#081f4e', color: '#fff', padding: '14px 16px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{selected.course?.title ?? '—'}</div>
                                    <div style={{ fontSize: '.75rem', opacity: .65, marginTop: 2 }}>Payment History</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #f0f0f0' }}>
                                    {[
                                        { label: 'Course Fee', value: fmtKsh(panelDebit),   color: '#3b82f6' },
                                        { label: 'Paid',       value: fmtKsh(panelCredit),  color: '#10b981' },
                                        { label: 'Balance',    value: fmtKsh(panelBalance), color: balanceColor(panelBalance) },
                                    ].map(c => (
                                        <div key={c.label} style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #f0f0f0' }}>
                                            <div style={{ fontSize: '.65rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{c.label}</div>
                                            <div style={{ fontWeight: 700, color: c.color, fontSize: '.85rem' }}>{c.value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                                    {panelLoading ? (
                                        <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
                                            <i className="fas fa-spinner fa-spin"></i> Loading...
                                        </div>
                                    ) : payments.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 32, color: '#999', fontSize: '.88rem' }}>
                                            No payments recorded yet.
                                        </div>
                                    ) : payments.map((p, idx) => (
                                        <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 28, height: 28, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '.75rem', fontWeight: 700, color: '#3b82f6' }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, color: '#081f4e', fontSize: '.9rem' }}>
                                                    Ksh {parseFloat(p.amount_paid).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: '.73rem', color: '#888', marginTop: 1 }}>
                                                    {p.date_paid?.slice(0, 10)} &bull; {p.payment_method}
                                                    {p.payment_ref_no && (
                                                        <span style={{ marginLeft: 5, color: '#3b82f6' }}>{p.payment_ref_no}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {canDownload && (
                                                <button
                                                    title="Download Receipt"
                                                    onClick={() => handleDownload(p)}
                                                    style={{ background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: '.78rem', flexShrink: 0 }}>
                                                    <i className="fas fa-download"></i>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
