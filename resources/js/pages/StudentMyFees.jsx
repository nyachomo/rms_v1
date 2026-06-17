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
    const canDownload = can('fee_management', 'download');

    useEffect(() => { setPageTitle('My Fees'); }, []);

    const h = useCallback(() => ({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
    }), [token]);

    const [enrollments, setEnrollments] = useState([]);
    const [meta, setMeta]               = useState(null);
    const [loading, setLoading]         = useState(false);
    const [toast, setToast]             = useState({ msg: '', type: 'success' });

    const [selected, setSelected]       = useState(null);
    const [payments, setPayments]       = useState([]);
    const [panelLoading, setPanelLoading] = useState(false);
    const [panelDebit, setPanelDebit]   = useState(0);
    const [panelCredit, setPanelCredit] = useState(0);
    const [panelBalance, setPanelBalance] = useState(0);

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    const loadEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await fetch('/api/fee-management', { headers: h() });
            const data = await res.json();
            setEnrollments(data.data ?? []);
            setMeta(data);
        } catch {
            showToast('Failed to load fee information.', 'error');
        } finally {
            setLoading(false);
        }
    }, [h]);

    useEffect(() => { loadEnrollments(); }, []);

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
            showToast('Failed to load payments.', 'error');
        } finally {
            setPanelLoading(false);
        }
    }, [h]);

    const handleDownloadReceipt = (payment) => {
        window.open(
            `/api/fee-management/enrollments/${selected.id}/payments/${payment.id}/receipt?token=${token}`,
            '_blank'
        );
    };

    const totalDebit  = enrollments.reduce((s, e) => s + (parseFloat(e.debit)  || 0), 0);
    const totalCredit = enrollments.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
    const totalBal    = totalDebit - totalCredit;

    return (
        <div className="db-content" style={{ padding: '28px 24px' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                <div>
                    <h1 style={{ fontFamily:'Poppins,sans-serif', color:'#081f4e', fontSize:'1.5rem', fontWeight:700, margin:0 }}>
                        <i className="fas fa-money-bill-wave" style={{ color:'#fe730c', marginRight:10 }}></i>
                        My Fees
                    </h1>
                    <p style={{ color:'#666', margin:'4px 0 0', fontSize:'.9rem' }}>View your course fee details and download payment receipts</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
                {[
                    { label:'Total Expected',  value: fmtKsh(totalDebit),   icon:'fa-file-invoice-dollar', color:'#3b82f6' },
                    { label:'Total Paid',       value: fmtKsh(totalCredit),  icon:'fa-check-circle',        color:'#10b981' },
                    { label:'Outstanding',      value: fmtKsh(totalBal),     icon:'fa-exclamation-circle',  color: totalBal > 0 ? '#e53e3e' : '#10b981' },
                    { label:'Enrollments',      value: meta?.total ?? enrollments.length, icon:'fa-graduation-cap', color:'#8b5cf6' },
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

            <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

                {/* Main Table */}
                <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
                        <div style={{ overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.88rem' }}>
                                <thead>
                                    <tr style={{ background:'#081f4e', color:'#fff' }}>
                                        <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Course / Intake</th>
                                        <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Status</th>
                                        <th style={{ padding:'12px 14px', textAlign:'right', fontWeight:600 }}>Course Fee</th>
                                        <th style={{ padding:'12px 14px', textAlign:'right', fontWeight:600 }}>Paid</th>
                                        <th style={{ padding:'12px 14px', textAlign:'right', fontWeight:600 }}>Balance</th>
                                        <th style={{ padding:'12px 14px', textAlign:'center', fontWeight:600 }}>Payments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                            <i className="fas fa-spinner fa-spin" style={{ marginRight:8 }}></i>Loading...
                                        </td></tr>
                                    ) : enrollments.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                            No fee records found.
                                        </td></tr>
                                    ) : enrollments.map((e, i) => {
                                        const isActive = selected?.id === e.id;
                                        const sc = STATUS_COLORS[e.status] ?? STATUS_COLORS.pending;
                                        const debit   = parseFloat(e.debit)   || 0;
                                        const credit  = parseFloat(e.credit)  || 0;
                                        const balance = parseFloat(e.balance) || 0;
                                        return (
                                            <tr key={e.id} style={{ background: isActive ? '#eff6ff' : i % 2 === 0 ? '#fafafa' : '#fff', cursor:'pointer' }}
                                                onClick={() => loadPayments(e)}>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                                    <div style={{ fontWeight:600, color:'#081f4e' }}>{e.course?.title ?? '—'}</div>
                                                    <div style={{ fontSize:'.78rem', color:'#888' }}>{e.intake?.intake_name ?? '—'}</div>
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                                    <span style={{ background:sc.bg, color:sc.color, padding:'3px 10px', borderRadius:20, fontSize:'.75rem', fontWeight:700 }}>
                                                        {e.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'right', fontWeight:600 }}>
                                                    {debit > 0 ? fmtKsh(debit) : <span style={{ color:'#bbb' }}>Not set</span>}
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'right', color:'#10b981', fontWeight:600 }}>
                                                    {fmtKsh(credit)}
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'right', fontWeight:700, color: balanceColor(balance) }}>
                                                    {debit > 0 ? fmtKsh(balance) : '—'}
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'center' }}>
                                                    <button title="View Payments"
                                                        style={{ background:'#8b5cf6', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:'.78rem' }}>
                                                        <i className="fas fa-list"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Payment Panel */}
                {selected && (
                    <div style={{ width:380, flexShrink:0 }}>
                        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
                            {/* Panel Header */}
                            <div style={{ background:'#081f4e', color:'#fff', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <div>
                                    <div style={{ fontWeight:700, fontSize:'.95rem' }}>{selected.course?.title ?? '—'}</div>
                                    <div style={{ fontSize:'.75rem', opacity:.7, marginTop:2 }}>{selected.intake?.intake_name ?? '—'}</div>
                                </div>
                                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:'1.1rem' }}>✕</button>
                            </div>

                            {/* Fee Summary */}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, borderBottom:'1px solid #f0f0f0' }}>
                                {[
                                    { label:'Course Fee', value: fmtKsh(panelDebit),   color:'#3b82f6' },
                                    { label:'Credit',     value: fmtKsh(panelCredit),  color:'#10b981' },
                                    { label:'Balance',    value: fmtKsh(panelBalance), color: balanceColor(panelBalance) },
                                ].map(c => (
                                    <div key={c.label} style={{ padding:'12px', textAlign:'center', borderRight:'1px solid #f0f0f0' }}>
                                        <div style={{ fontSize:'.7rem', color:'#999', fontWeight:600, textTransform:'uppercase' }}>{c.label}</div>
                                        <div style={{ fontWeight:700, color:c.color, fontSize:'.9rem', marginTop:3 }}>{c.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Payments List */}
                            <div style={{ maxHeight:420, overflowY:'auto' }}>
                                {panelLoading ? (
                                    <div style={{ textAlign:'center', padding:24, color:'#999' }}>
                                        <i className="fas fa-spinner fa-spin"></i> Loading...
                                    </div>
                                ) : payments.length === 0 ? (
                                    <div style={{ textAlign:'center', padding:24, color:'#999', fontSize:'.88rem' }}>
                                        No payments recorded yet.
                                    </div>
                                ) : payments.map((p, idx) => (
                                    <div key={p.id} style={{ padding:'12px 16px', borderBottom:'1px solid #f5f5f5', display:'flex', alignItems:'center', gap:10 }}>
                                        <div style={{ width:28, height:28, background:'#eff6ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'.75rem', fontWeight:700, color:'#3b82f6' }}>
                                            {idx + 1}
                                        </div>
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ fontWeight:700, color:'#081f4e', fontSize:'.9rem' }}>Ksh {parseFloat(p.amount_paid).toLocaleString()}</div>
                                            <div style={{ fontSize:'.75rem', color:'#888', marginTop:1 }}>
                                                {p.date_paid?.slice(0, 10)} &bull; {p.payment_method}
                                                {p.payment_ref_no && <span style={{ marginLeft:5, color:'#3b82f6' }}>{p.payment_ref_no}</span>}
                                            </div>
                                        </div>
                                        {canDownload && (
                                            <button title="Download Receipt" onClick={() => handleDownloadReceipt(p)}
                                                style={{ background:'#fef3c7', color:'#92400e', border:'none', borderRadius:6, padding:'5px 8px', cursor:'pointer', fontSize:'.75rem' }}>
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

            {/* Toast */}
            {toast.msg && (
                <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background: toast.type === 'error' ? '#fee2e2' : '#d1fae5', color: toast.type === 'error' ? '#991b1b' : '#065f46', padding:'12px 20px', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.15)', fontWeight:600, maxWidth:360 }}>
                    {toast.msg}
                    <button onClick={() => setToast({ msg:'', type:'success' })} style={{ marginLeft:12, background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>✕</button>
                </div>
            )}
        </div>
    );
}
