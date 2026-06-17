import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';

const PAYMENT_METHODS = ['Mpesa', 'Bank', 'Cash', 'Cheque', 'Card'];

const STATUS_COLORS = {
    approved: { bg: '#d1fae5', color: '#065f46' },
    pending:  { bg: '#fef3c7', color: '#92400e' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
};

function Toast({ msg, type, onClose }) {
    useEffect(() => {
        if (!msg) return;
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [msg, onClose]);
    if (!msg) return null;
    const bg = type === 'error' ? '#fee2e2' : '#d1fae5';
    const cl = type === 'error' ? '#991b1b' : '#065f46';
    return (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:bg, color:cl, padding:'12px 20px', borderRadius:8, boxShadow:'0 4px 16px rgba(0,0,0,.15)', fontWeight:600, maxWidth:360 }}>
            {msg}
            <button onClick={onClose} style={{ marginLeft:12, background:'none', border:'none', cursor:'pointer', color:cl, fontWeight:700 }}>✕</button>
        </div>
    );
}

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

export default function AdminFeeManagement() {
    const { token } = useAuth();
    const h = useCallback(() => ({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
    }), [token]);

    const [enrollments, setEnrollments] = useState([]);
    const [meta, setMeta]               = useState(null);
    const [page, setPage]               = useState(1);
    const [search, setSearch]           = useState('');
    const [statusFilter, setStatus]     = useState('');
    const [loading, setLoading]         = useState(false);
    const [toast, setToast]             = useState({ msg: '', type: 'success' });

    // Selected enrollment for payment panel
    const [selected, setSelected]       = useState(null);
    const [payments, setPayments]       = useState([]);
    const [panelLoading, setPanelLoading] = useState(false);
    const [panelDebit, setPanelDebit]   = useState(0);
    const [panelCredit, setPanelCredit] = useState(0);
    const [panelBalance, setPanelBalance] = useState(0);

    // Fee modal
    const [feeModal, setFeeModal]       = useState(null);
    const [feeInput, setFeeInput]       = useState('');
    const [feeSaving, setFeeSaving]     = useState(false);

    // Payment modal
    const [payModal, setPayModal]       = useState(null);
    const [payForm, setPayForm]         = useState({ amount_paid: '', date_paid: '', payment_ref_no: '', payment_method: 'Mpesa' });
    const [payErrors, setPayErrors]     = useState({});
    const [paySaving, setPaySaving]     = useState(false);

    // Summary totals
    const [totals, setTotals]           = useState({ debit: 0, credit: 0, balance: 0, count: 0 });

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    const loadEnrollments = useCallback(async (pg = 1, q = search, st = statusFilter) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, per_page: 20 });
            if (q)  params.set('search', q);
            if (st) params.set('status', st);
            const res  = await fetch(`/api/fee-management?${params}`, { headers: h() });
            const data = await res.json();
            setEnrollments(data.data ?? []);
            setMeta(data);
            // compute totals
            const all = data.data ?? [];
            setTotals({
                count:   data.total ?? all.length,
                debit:   all.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0),
                credit:  all.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0),
                balance: all.reduce((s, e) => s + (parseFloat(e.balance) || 0), 0),
            });
        } catch {
            showToast('Failed to load enrollments.', 'error');
        } finally {
            setLoading(false);
        }
    }, [h, search, statusFilter]);

    useEffect(() => { loadEnrollments(1, search, statusFilter); }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadEnrollments(1, search, statusFilter);
    };

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

    const handleDeletePayment = async (payment) => {
        if (!window.confirm(`Delete this payment of Ksh ${payment.amount_paid}?`)) return;
        try {
            const res = await fetch(`/api/fee-management/enrollments/${selected.id}/payments/${payment.id}`, {
                method: 'DELETE', headers: h(),
            });
            const data = await res.json();
            setPayments(prev => prev.filter(p => p.id !== payment.id));
            setPanelDebit(parseFloat(data.debit) || 0);
            setPanelCredit(parseFloat(data.credit) || 0);
            setPanelBalance(parseFloat(data.balance) || 0);
            // refresh table row
            setEnrollments(prev => prev.map(e => e.id === selected.id
                ? { ...e, credit: data.credit, balance: data.balance }
                : e
            ));
            showToast('Payment deleted.');
        } catch {
            showToast('Failed to delete payment.', 'error');
        }
    };

    const handleDownloadReceipt = (payment) => {
        window.open(`/api/fee-management/enrollments/${selected.id}/payments/${payment.id}/receipt?token=${token}`, '_blank');
    };

    // Set fee modal
    const openFeeModal = (enrollment) => {
        setFeeModal(enrollment);
        setFeeInput(enrollment.course_fee ?? '');
    };

    const saveFee = async () => {
        if (!feeInput || isNaN(feeInput)) {
            showToast('Enter a valid amount.', 'error');
            return;
        }
        setFeeSaving(true);
        try {
            const res  = await fetch(`/api/fee-management/enrollments/${feeModal.id}/fee`, {
                method: 'PATCH',
                headers: h(),
                body: JSON.stringify({ course_fee: parseFloat(feeInput) }),
            });
            const data = await res.json();
            setEnrollments(prev => prev.map(e => e.id === feeModal.id
                ? { ...e, course_fee: data.enrollment.course_fee, debit: data.debit, balance: data.balance }
                : e
            ));
            if (selected?.id === feeModal.id) {
                setPanelDebit(parseFloat(data.debit) || 0);
                setPanelBalance(parseFloat(data.balance) || 0);
            }
            showToast('Course fee updated.');
            setFeeModal(null);
        } catch {
            showToast('Failed to update fee.', 'error');
        } finally {
            setFeeSaving(false);
        }
    };

    // Payment modal
    const openPayModal = (enrollment) => {
        setPayModal(enrollment);
        setPayForm({ amount_paid: '', date_paid: new Date().toISOString().slice(0, 10), payment_ref_no: '', payment_method: 'Mpesa' });
        setPayErrors({});
    };

    const savePayment = async () => {
        setPayErrors({});
        const errs = {};
        if (!payForm.amount_paid || isNaN(payForm.amount_paid) || parseFloat(payForm.amount_paid) <= 0) errs.amount_paid = 'Required.';
        if (!payForm.date_paid) errs.date_paid = 'Required.';
        if (!payForm.payment_method) errs.payment_method = 'Required.';
        if (Object.keys(errs).length) { setPayErrors(errs); return; }

        setPaySaving(true);
        try {
            const res  = await fetch(`/api/fee-management/enrollments/${payModal.id}/payments`, {
                method: 'POST',
                headers: h(),
                body: JSON.stringify({ ...payForm, amount_paid: parseFloat(payForm.amount_paid) }),
            });
            if (!res.ok) {
                const d = await res.json();
                if (d.errors) setPayErrors(d.errors);
                else showToast(d.message ?? 'Failed.', 'error');
                return;
            }
            const data = await res.json();
            // Update table row
            setEnrollments(prev => prev.map(e => e.id === payModal.id
                ? { ...e, credit: data.credit, balance: data.balance }
                : e
            ));
            // Update panel if open
            if (selected?.id === payModal.id) {
                setPayments(prev => [...prev, data.payment]);
                setPanelCredit(parseFloat(data.credit) || 0);
                setPanelBalance(parseFloat(data.balance) || 0);
            }
            showToast('Payment recorded.');
            setPayModal(null);
        } catch {
            showToast('Failed to save payment.', 'error');
        } finally {
            setPaySaving(false);
        }
    };

    const totalDebit  = enrollments.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
    const totalCredit = enrollments.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
    const totalBal    = totalDebit - totalCredit;

    return (
        <div className="dashboard-container">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar />
                <div className="db-content" style={{ padding: '28px 24px' }}>

                    {/* Header */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                        <div>
                            <h1 style={{ fontFamily:'Poppins,sans-serif', color:'#081f4e', fontSize:'1.5rem', fontWeight:700, margin:0 }}>
                                <i className="fas fa-money-bill-wave" style={{ color:'#fe730c', marginRight:10 }}></i>
                                Fee Management
                            </h1>
                            <p style={{ color:'#666', margin:'4px 0 0', fontSize:'.9rem' }}>Track student debits, credits and balances</p>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
                        {[
                            { label:'Total Expected', value: fmtKsh(totalDebit),  icon:'fa-file-invoice-dollar', color:'#3b82f6' },
                            { label:'Total Collected', value: fmtKsh(totalCredit), icon:'fa-check-circle',        color:'#10b981' },
                            { label:'Outstanding',     value: fmtKsh(totalBal),    icon:'fa-exclamation-circle',  color: totalBal > 0 ? '#e53e3e' : '#10b981' },
                            { label:'Enrollments',     value: meta?.total ?? enrollments.length, icon:'fa-users', color:'#8b5cf6' },
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

                    {/* Filters */}
                    <form onSubmit={handleSearch} style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ flex:1, minWidth:200, padding:'9px 14px', border:'1px solid #ddd', borderRadius:8, fontSize:'.9rem' }}
                        />
                        <select
                            value={statusFilter}
                            onChange={e => { setStatus(e.target.value); setPage(1); loadEnrollments(1, search, e.target.value); }}
                            style={{ padding:'9px 14px', border:'1px solid #ddd', borderRadius:8, fontSize:'.9rem' }}
                        >
                            <option value="">All Statuses</option>
                            <option value="approved">Approved</option>
                            <option value="pending">Pending</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <button type="submit" style={{ padding:'9px 20px', background:'#081f4e', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                            <i className="fas fa-search" style={{ marginRight:6 }}></i>Search
                        </button>
                    </form>

                    <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

                        {/* Main Table */}
                        <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
                                <div style={{ overflowX:'auto' }}>
                                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.88rem' }}>
                                        <thead>
                                            <tr style={{ background:'#081f4e', color:'#fff' }}>
                                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Student</th>
                                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Course / Intake</th>
                                                <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Status</th>
                                                <th style={{ padding:'12px 14px', textAlign:'right', fontWeight:600 }}>Debit (Fee)</th>
                                                <th style={{ padding:'12px 14px', textAlign:'right', fontWeight:600 }}>Credit (Paid)</th>
                                                <th style={{ padding:'12px 14px', textAlign:'right', fontWeight:600 }}>Balance</th>
                                                <th style={{ padding:'12px 14px', textAlign:'center', fontWeight:600 }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                                    <i className="fas fa-spinner fa-spin" style={{ marginRight:8 }}></i>Loading...
                                                </td></tr>
                                            ) : enrollments.length === 0 ? (
                                                <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                                    No enrollments found.
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
                                                            <div style={{ fontWeight:600, color:'#081f4e' }}>{e.name}</div>
                                                            <div style={{ fontSize:'.78rem', color:'#888' }}>{e.email}</div>
                                                        </td>
                                                        <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                                            <div style={{ fontWeight:500 }}>{e.course?.title ?? '—'}</div>
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
                                                        <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'center' }} onClick={ev => ev.stopPropagation()}>
                                                            <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                                                                <button title="Set Course Fee" onClick={() => openFeeModal(e)}
                                                                    style={{ background:'#3b82f6', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:'.78rem' }}>
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                <button title="Add Payment" onClick={() => openPayModal(e)}
                                                                    style={{ background:'#10b981', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:'.78rem' }}>
                                                                    <i className="fas fa-plus"></i>
                                                                </button>
                                                                <button title="View Payments" onClick={() => loadPayments(e)}
                                                                    style={{ background:'#8b5cf6', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:'.78rem' }}>
                                                                    <i className="fas fa-list"></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {meta && meta.last_page > 1 && (
                                    <div style={{ display:'flex', justifyContent:'center', gap:8, padding:'14px', borderTop:'1px solid #f0f0f0' }}>
                                        {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(pg => (
                                            <button key={pg} onClick={() => { setPage(pg); loadEnrollments(pg); }}
                                                style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #ddd', background: pg === page ? '#081f4e' : '#fff', color: pg === page ? '#fff' : '#333', cursor:'pointer', fontWeight:600 }}>
                                                {pg}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Panel */}
                        {selected && (
                            <div style={{ width:380, flexShrink:0 }}>
                                <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
                                    {/* Panel Header */}
                                    <div style={{ background:'#081f4e', color:'#fff', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight:700, fontSize:'.95rem' }}>{selected.name}</div>
                                            <div style={{ fontSize:'.75rem', opacity:.7, marginTop:2 }}>{selected.course?.title ?? '—'}</div>
                                        </div>
                                        <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:'1.1rem' }}>✕</button>
                                    </div>

                                    {/* Fee Summary */}
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, borderBottom:'1px solid #f0f0f0' }}>
                                        {[
                                            { label:'Debit', value: fmtKsh(panelDebit),   color:'#3b82f6' },
                                            { label:'Credit', value: fmtKsh(panelCredit),  color:'#10b981' },
                                            { label:'Balance', value: fmtKsh(panelBalance), color: balanceColor(panelBalance) },
                                        ].map(c => (
                                            <div key={c.label} style={{ padding:'12px', textAlign:'center', borderRight:'1px solid #f0f0f0' }}>
                                                <div style={{ fontSize:'.7rem', color:'#999', fontWeight:600, textTransform:'uppercase' }}>{c.label}</div>
                                                <div style={{ fontWeight:700, color:c.color, fontSize:'.9rem', marginTop:3 }}>{c.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Payment Button */}
                                    <div style={{ padding:'12px 16px', borderBottom:'1px solid #f0f0f0', display:'flex', gap:8 }}>
                                        <button onClick={() => openFeeModal(selected)}
                                            style={{ flex:1, padding:'8px', background:'#eff6ff', color:'#3b82f6', border:'1px solid #bfdbfe', borderRadius:7, fontWeight:600, cursor:'pointer', fontSize:'.82rem' }}>
                                            <i className="fas fa-edit" style={{ marginRight:5 }}></i>Set Fee
                                        </button>
                                        <button onClick={() => openPayModal(selected)}
                                            style={{ flex:1, padding:'8px', background:'#d1fae5', color:'#065f46', border:'1px solid #6ee7b7', borderRadius:7, fontWeight:600, cursor:'pointer', fontSize:'.82rem' }}>
                                            <i className="fas fa-plus" style={{ marginRight:5 }}></i>Add Payment
                                        </button>
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
                                                        {p.date_paid} &bull; {p.payment_method}
                                                        {p.payment_ref_no && <span style={{ marginLeft:5, color:'#3b82f6' }}>{p.payment_ref_no}</span>}
                                                    </div>
                                                </div>
                                                <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                                                    <button title="Download Receipt" onClick={() => handleDownloadReceipt(p)}
                                                        style={{ background:'#fef3c7', color:'#92400e', border:'none', borderRadius:6, padding:'5px 8px', cursor:'pointer', fontSize:'.75rem' }}>
                                                        <i className="fas fa-download"></i>
                                                    </button>
                                                    <button title="Delete" onClick={() => handleDeletePayment(p)}
                                                        style={{ background:'#fee2e2', color:'#991b1b', border:'none', borderRadius:6, padding:'5px 8px', cursor:'pointer', fontSize:'.75rem' }}>
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Set Fee Modal */}
            {feeModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ background:'#fff', borderRadius:14, padding:28, width:400, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
                        <h3 style={{ margin:'0 0 6px', color:'#081f4e', fontFamily:'Poppins,sans-serif' }}>Set Course Fee</h3>
                        <p style={{ color:'#666', fontSize:'.88rem', margin:'0 0 18px' }}>{feeModal.name}</p>
                        <label style={{ display:'block', fontWeight:600, marginBottom:6, fontSize:'.88rem' }}>Total Course Fee (KES)</label>
                        <input
                            type="number" min="0" step="0.01"
                            value={feeInput}
                            onChange={e => setFeeInput(e.target.value)}
                            placeholder="e.g. 30500"
                            style={{ width:'100%', padding:'10px 14px', border:'1px solid #ddd', borderRadius:8, fontSize:'1rem', boxSizing:'border-box' }}
                            autoFocus
                        />
                        <div style={{ display:'flex', gap:10, marginTop:20 }}>
                            <button onClick={() => setFeeModal(null)} style={{ flex:1, padding:'10px', border:'1px solid #ddd', borderRadius:8, background:'#f9f9f9', cursor:'pointer', fontWeight:600 }}>Cancel</button>
                            <button onClick={saveFee} disabled={feeSaving}
                                style={{ flex:1, padding:'10px', background:'#081f4e', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                                {feeSaving ? 'Saving...' : 'Save Fee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Payment Modal */}
            {payModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ background:'#fff', borderRadius:14, padding:28, width:440, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
                        <h3 style={{ margin:'0 0 4px', color:'#081f4e', fontFamily:'Poppins,sans-serif' }}>Record Payment</h3>
                        <p style={{ color:'#666', fontSize:'.88rem', margin:'0 0 20px' }}>{payModal.name}</p>

                        {[
                            { label:'Amount Paid (KES)', key:'amount_paid', type:'number', placeholder:'e.g. 7000' },
                            { label:'Date Paid',         key:'date_paid',   type:'date',   placeholder:'' },
                            { label:'Payment Ref No',    key:'payment_ref_no', type:'text', placeholder:'e.g. UC8HO8NJTK' },
                        ].map(field => (
                            <div key={field.key} style={{ marginBottom:14 }}>
                                <label style={{ display:'block', fontWeight:600, marginBottom:5, fontSize:'.88rem' }}>{field.label}</label>
                                <input
                                    type={field.type}
                                    value={payForm[field.key]}
                                    onChange={e => setPayForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    style={{ width:'100%', padding:'9px 12px', border:`1px solid ${payErrors[field.key] ? '#e53e3e' : '#ddd'}`, borderRadius:8, fontSize:'.9rem', boxSizing:'border-box' }}
                                />
                                {payErrors[field.key] && <div style={{ color:'#e53e3e', fontSize:'.78rem', marginTop:3 }}>{payErrors[field.key]}</div>}
                            </div>
                        ))}

                        <div style={{ marginBottom:14 }}>
                            <label style={{ display:'block', fontWeight:600, marginBottom:5, fontSize:'.88rem' }}>Payment Method</label>
                            <select
                                value={payForm.payment_method}
                                onChange={e => setPayForm(prev => ({ ...prev, payment_method: e.target.value }))}
                                style={{ width:'100%', padding:'9px 12px', border:`1px solid ${payErrors.payment_method ? '#e53e3e' : '#ddd'}`, borderRadius:8, fontSize:'.9rem', boxSizing:'border-box' }}>
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {payErrors.payment_method && <div style={{ color:'#e53e3e', fontSize:'.78rem', marginTop:3 }}>{payErrors.payment_method}</div>}
                        </div>

                        <div style={{ display:'flex', gap:10, marginTop:20 }}>
                            <button onClick={() => setPayModal(null)} style={{ flex:1, padding:'10px', border:'1px solid #ddd', borderRadius:8, background:'#f9f9f9', cursor:'pointer', fontWeight:600 }}>Cancel</button>
                            <button onClick={savePayment} disabled={paySaving}
                                style={{ flex:1, padding:'10px', background:'#10b981', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                                {paySaving ? 'Saving...' : 'Save Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
        </div>
    );
}
