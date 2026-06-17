import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';

const PAYMENT_METHODS = ['Mpesa', 'Bank', 'Cash', 'Cheque', 'Card'];

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
    return 'Ksh ' + parseFloat(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPTY_FORM = { amount_paid: '', date_paid: new Date().toISOString().slice(0, 10), payment_ref_no: '', payment_method: 'Mpesa' };

export default function AdminRegistrationFees() {
    const { token, can } = useAuth();
    const canCreate   = can('registration_fees', 'create');
    const canUpdate   = can('registration_fees', 'update');
    const canDelete   = can('registration_fees', 'delete');
    const canDownload = can('registration_fees', 'download');

    const h = useCallback(() => ({
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
    }), [token]);

    const [users, setUsers]         = useState([]);
    const [meta, setMeta]           = useState(null);
    const [page, setPage]           = useState(1);
    const [search, setSearch]       = useState('');
    const [feeFilter, setFeeFilter] = useState('');
    const [loading, setLoading]     = useState(false);
    const [toast, setToast]         = useState({ msg: '', type: 'success' });

    // Modal state (used for both create and edit)
    const [modal, setModal]       = useState(null); // { mode: 'create'|'edit', user, fee }
    const [form, setForm]         = useState(EMPTY_FORM);
    const [errors, setErrors]     = useState({});
    const [saving, setSaving]     = useState(false);

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    const loadUsers = useCallback(async (pg = 1, q = search, fs = feeFilter) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: pg, per_page: 20 });
            if (q)  params.set('search', q);
            if (fs) params.set('fee_status', fs);
            const res  = await fetch(`/api/registration-fees?${params}`, { headers: h() });
            const data = await res.json();
            setUsers(data.data ?? []);
            setMeta(data);
        } catch {
            showToast('Failed to load students.', 'error');
        } finally {
            setLoading(false);
        }
    }, [h, search, feeFilter]);

    useEffect(() => { loadUsers(1, search, feeFilter); }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadUsers(1, search, feeFilter);
    };

    const openCreate = (user) => {
        setModal({ mode: 'create', user, fee: null });
        setForm(EMPTY_FORM);
        setErrors({});
    };

    const openEdit = (user) => {
        const fee = user.registration_fee;
        setModal({ mode: 'edit', user, fee });
        setForm({
            amount_paid:    fee.amount_paid ?? '',
            date_paid:      fee.date_paid?.slice(0, 10) ?? '',
            payment_ref_no: fee.payment_ref_no ?? '',
            payment_method: fee.payment_method ?? 'Mpesa',
        });
        setErrors({});
    };

    const saveForm = async () => {
        const errs = {};
        if (!form.amount_paid || isNaN(form.amount_paid) || parseFloat(form.amount_paid) <= 0) errs.amount_paid = 'Required.';
        if (!form.date_paid) errs.date_paid = 'Required.';
        if (!form.payment_method) errs.payment_method = 'Required.';
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSaving(true);
        try {
            let res;
            if (modal.mode === 'create') {
                res = await fetch('/api/registration-fees', {
                    method: 'POST',
                    headers: h(),
                    body: JSON.stringify({ ...form, user_id: modal.user.id, amount_paid: parseFloat(form.amount_paid) }),
                });
            } else {
                res = await fetch(`/api/registration-fees/${modal.fee.id}`, {
                    method: 'PUT',
                    headers: h(),
                    body: JSON.stringify({ ...form, amount_paid: parseFloat(form.amount_paid) }),
                });
            }

            if (!res.ok) {
                const d = await res.json();
                if (d.errors) setErrors(d.errors);
                else showToast(d.message ?? 'Failed.', 'error');
                return;
            }

            const saved = await res.json();
            setUsers(prev => prev.map(u => u.id === modal.user.id
                ? { ...u, registration_fee: saved }
                : u
            ));
            showToast(modal.mode === 'create' ? 'Registration fee recorded.' : 'Registration fee updated.');
            setModal(null);
        } catch {
            showToast('Failed to save.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Delete registration fee for ${user.name}?`)) return;
        try {
            const res = await fetch(`/api/registration-fees/${user.registration_fee.id}`, {
                method: 'DELETE', headers: h(),
            });
            if (!res.ok) { showToast('Failed to delete.', 'error'); return; }
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, registration_fee: null } : u));
            showToast('Registration fee deleted.');
        } catch {
            showToast('Failed to delete.', 'error');
        }
    };

    const handleDownload = (fee) => {
        window.open(`/api/registration-fees/${fee.id}/receipt?token=${token}`, '_blank');
    };

    const paidCount   = users.filter(u => u.registration_fee).length;
    const unpaidCount = users.filter(u => !u.registration_fee).length;
    const totalPaid   = users.reduce((s, u) => s + (parseFloat(u.registration_fee?.amount_paid) || 0), 0);

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
                                <i className="fas fa-id-card" style={{ color:'#fe730c', marginRight:10 }}></i>
                                Registration Fees
                            </h1>
                            <p style={{ color:'#666', margin:'4px 0 0', fontSize:'.9rem' }}>Manage one-time registration fee payments per student</p>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
                        {[
                            { label:'Total Students',   value: meta?.total ?? users.length, icon:'fa-users',              color:'#8b5cf6' },
                            { label:'Paid',             value: paidCount,                    icon:'fa-check-circle',        color:'#10b981' },
                            { label:'Unpaid',           value: unpaidCount,                  icon:'fa-exclamation-circle',  color:'#e53e3e' },
                            { label:'Amount Collected', value: fmtKsh(totalPaid),            icon:'fa-money-bill-wave',     color:'#3b82f6' },
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
                            value={feeFilter}
                            onChange={e => { setFeeFilter(e.target.value); setPage(1); loadUsers(1, search, e.target.value); }}
                            style={{ padding:'9px 14px', border:'1px solid #ddd', borderRadius:8, fontSize:'.9rem' }}
                        >
                            <option value="">All Students</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                        <button type="submit" style={{ padding:'9px 20px', background:'#081f4e', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                            <i className="fas fa-search" style={{ marginRight:6 }}></i>Search
                        </button>
                    </form>

                    {/* Table */}
                    <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 6px rgba(0,0,0,.08)', overflow:'hidden' }}>
                        <div style={{ overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.88rem' }}>
                                <thead>
                                    <tr style={{ background:'#081f4e', color:'#fff' }}>
                                        <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Student</th>
                                        <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Status</th>
                                        <th style={{ padding:'12px 14px', textAlign:'right', fontWeight:600 }}>Amount Paid</th>
                                        <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Date Paid</th>
                                        <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Method</th>
                                        <th style={{ padding:'12px 14px', textAlign:'left', fontWeight:600 }}>Ref No</th>
                                        <th style={{ padding:'12px 14px', textAlign:'center', fontWeight:600 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                            <i className="fas fa-spinner fa-spin" style={{ marginRight:8 }}></i>Loading...
                                        </td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#999' }}>
                                            No students found.
                                        </td></tr>
                                    ) : users.map((u, i) => {
                                        const fee  = u.registration_fee;
                                        const paid = !!fee;
                                        return (
                                            <tr key={u.id} style={{ background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                                    <div style={{ fontWeight:600, color:'#081f4e' }}>{u.name}</div>
                                                    <div style={{ fontSize:'.78rem', color:'#888' }}>{u.email}</div>
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0' }}>
                                                    {paid
                                                        ? <span style={{ background:'#d1fae5', color:'#065f46', padding:'3px 10px', borderRadius:20, fontSize:'.75rem', fontWeight:700 }}>Paid</span>
                                                        : <span style={{ background:'#fee2e2', color:'#991b1b', padding:'3px 10px', borderRadius:20, fontSize:'.75rem', fontWeight:700 }}>Unpaid</span>
                                                    }
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'right', fontWeight:600, color:'#10b981' }}>
                                                    {paid ? fmtKsh(fee.amount_paid) : <span style={{ color:'#bbb' }}>—</span>}
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', color:'#555' }}>
                                                    {paid ? fee.date_paid?.slice(0, 10) : '—'}
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', color:'#555' }}>
                                                    {paid ? fee.payment_method : '—'}
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', color:'#3b82f6', fontWeight:500 }}>
                                                    {paid ? (fee.payment_ref_no || '—') : '—'}
                                                </td>
                                                <td style={{ padding:'11px 14px', borderBottom:'1px solid #f0f0f0', textAlign:'center' }}>
                                                    <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                                                        {!paid && canCreate && (
                                                            <button title="Record Payment" onClick={() => openCreate(u)}
                                                                style={{ background:'#10b981', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:'.78rem' }}>
                                                                <i className="fas fa-plus"></i>
                                                            </button>
                                                        )}
                                                        {paid && canUpdate && (
                                                            <button title="Edit Payment" onClick={() => openEdit(u)}
                                                                style={{ background:'#3b82f6', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:'.78rem' }}>
                                                                <i className="fas fa-edit"></i>
                                                            </button>
                                                        )}
                                                        {paid && canDownload && (
                                                            <button title="Download Receipt" onClick={() => handleDownload(fee)}
                                                                style={{ background:'#f59e0b', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:'.78rem' }}>
                                                                <i className="fas fa-download"></i>
                                                            </button>
                                                        )}
                                                        {paid && canDelete && (
                                                            <button title="Delete" onClick={() => handleDelete(u)}
                                                                style={{ background:'#e53e3e', color:'#fff', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:'.78rem' }}>
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        )}
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
                                    <button key={pg} onClick={() => { setPage(pg); loadUsers(pg); }}
                                        style={{ padding:'5px 12px', borderRadius:6, border:'1px solid #ddd', background: pg === page ? '#081f4e' : '#fff', color: pg === page ? '#fff' : '#333', cursor:'pointer', fontWeight:600 }}>
                                        {pg}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create / Edit Modal */}
            {modal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ background:'#fff', borderRadius:14, padding:28, width:440, boxShadow:'0 8px 40px rgba(0,0,0,.2)' }}>
                        <h3 style={{ margin:'0 0 4px', color:'#081f4e', fontFamily:'Poppins,sans-serif' }}>
                            {modal.mode === 'create' ? 'Record Registration Fee' : 'Edit Registration Fee'}
                        </h3>
                        <p style={{ color:'#666', fontSize:'.88rem', margin:'0 0 20px' }}>{modal.user.name}</p>

                        {[
                            { label:'Amount Paid (KES)', key:'amount_paid', type:'number', placeholder:'e.g. 2000' },
                            { label:'Date Paid',         key:'date_paid',   type:'date',   placeholder:'' },
                            { label:'Payment Ref No',    key:'payment_ref_no', type:'text', placeholder:'e.g. QGH7TE0' },
                        ].map(field => (
                            <div key={field.key} style={{ marginBottom:14 }}>
                                <label style={{ display:'block', fontWeight:600, marginBottom:5, fontSize:'.88rem' }}>{field.label}</label>
                                <input
                                    type={field.type}
                                    value={form[field.key]}
                                    onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder}
                                    style={{ width:'100%', padding:'9px 12px', border:`1px solid ${errors[field.key] ? '#e53e3e' : '#ddd'}`, borderRadius:8, fontSize:'.9rem', boxSizing:'border-box' }}
                                />
                                {errors[field.key] && <div style={{ color:'#e53e3e', fontSize:'.78rem', marginTop:3 }}>{errors[field.key]}</div>}
                            </div>
                        ))}

                        <div style={{ marginBottom:14 }}>
                            <label style={{ display:'block', fontWeight:600, marginBottom:5, fontSize:'.88rem' }}>Payment Method</label>
                            <select
                                value={form.payment_method}
                                onChange={e => setForm(prev => ({ ...prev, payment_method: e.target.value }))}
                                style={{ width:'100%', padding:'9px 12px', border:`1px solid ${errors.payment_method ? '#e53e3e' : '#ddd'}`, borderRadius:8, fontSize:'.9rem', boxSizing:'border-box' }}>
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {errors.payment_method && <div style={{ color:'#e53e3e', fontSize:'.78rem', marginTop:3 }}>{errors.payment_method}</div>}
                        </div>

                        <div style={{ display:'flex', gap:10, marginTop:20 }}>
                            <button onClick={() => setModal(null)} style={{ flex:1, padding:'10px', border:'1px solid #ddd', borderRadius:8, background:'#f9f9f9', cursor:'pointer', fontWeight:600 }}>Cancel</button>
                            <button onClick={saveForm} disabled={saving}
                                style={{ flex:1, padding:'10px', background:'#081f4e', color:'#fff', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                                {saving ? 'Saving...' : modal.mode === 'create' ? 'Record Payment' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg:'', type:'success' })} />
        </div>
    );
}
