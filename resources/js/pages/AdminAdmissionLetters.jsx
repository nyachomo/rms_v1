import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';

const NAV_ITEMS = [
    { key: 'Settings',    icon: 'fas fa-cog',            label: 'Settings' },
    { key: 'Enrollments', icon: 'fas fa-list-alt',        label: 'Enrollments' },
];

const FIELD = (label, key, type = 'text', placeholder = '') => ({ label, key, type, placeholder });

const CONFIG_SECTIONS = [
    {
        title: 'Institute & Letter',
        icon: 'fas fa-building',
        fields: [
            FIELD('Institute Prefix (for Adm No.)', 'institute_prefix', 'text', 'e.g. TTI'),
            FIELD('Director Name', 'director_name', 'text', 'e.g. Ibrahim Gichemba'),
            FIELD('Director Title', 'director_title', 'text', 'e.g. Director Techsphere Training Institute'),
        ],
    },
    {
        title: 'Dates & Schedule',
        icon: 'fas fa-calendar-alt',
        fields: [
            FIELD('Orientation Date', 'orientation_date', 'date'),
            FIELD('Orientation Time', 'orientation_time', 'text', 'e.g. 10:00 a.m.'),
            FIELD('Class Start Date', 'class_start_date', 'date'),
            FIELD('Class Schedule', 'schedule', 'text', 'e.g. Monday–Friday 11:00pm – 1:00pm'),
            FIELD('Course Duration (weeks)', 'duration_weeks', 'number', 'e.g. 18'),
        ],
    },
    {
        title: 'Online Class Details',
        icon: 'fas fa-video',
        fields: [
            FIELD('Zoom / Class Link', 'zoom_link', 'text', 'https://us05web.zoom.us/j/...'),
            FIELD('Meeting ID', 'meeting_id', 'text', 'e.g. 817 7100 1961'),
            FIELD('Passcode', 'zoom_passcode', 'text', 'e.g. 5aVq7J'),
        ],
    },
    {
        title: 'Fee Structure',
        icon: 'fas fa-money-bill-wave',
        fields: [
            FIELD('Total Fee (KES)', 'total_fee', 'number', 'e.g. 30500'),
            FIELD('First Installment Label', 'first_installment_label', 'text', 'e.g. First Installment (50%)'),
            FIELD('First Installment Amount', 'first_installment_amount', 'number', ''),
            FIELD('Second Installment Label', 'second_installment_label', 'text', 'e.g. Second Installment (25%)'),
            FIELD('Second Installment Amount', 'second_installment_amount', 'number', ''),
            FIELD('Third Installment Label', 'third_installment_label', 'text', 'e.g. Third Installment (25%)'),
            FIELD('Third Installment Amount', 'third_installment_amount', 'number', ''),
            FIELD('Monthly Fee Label', 'monthly_fee_label', 'text', 'e.g. Per Month'),
            FIELD('Monthly Fee Amount', 'monthly_fee_amount', 'number', 'e.g. 7625'),
        ],
    },
    {
        title: 'Payment Details',
        icon: 'fas fa-credit-card',
        fields: [
            FIELD('M-Pesa Business Name', 'mpesa_business_name', 'text', 'e.g. Techsphere Training Institute'),
            FIELD('M-Pesa Paybill', 'mpesa_paybill', 'text', 'e.g. 522533'),
            FIELD('M-Pesa Account No.', 'mpesa_acc_no', 'text', 'e.g. 7855887'),
            FIELD('Bank Name', 'bank_name', 'text', 'e.g. Kenya Commercial Bank'),
            FIELD('Bank Account Name', 'bank_acc_name', 'text', 'e.g. Techsphere Training Institute'),
            FIELD('Bank Account No.', 'bank_acc_no', 'text', 'e.g. 1327338564'),
        ],
    },
];

const STATUS_COLORS = {
    approved: { bg: '#d1fae5', color: '#065f46' },
    pending:  { bg: '#fef3c7', color: '#92400e' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
};

export default function AdminAdmissionLetters() {
    const { token } = useAuth();
    const headers   = { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' };

    const [tab, setTab] = useState('Settings');

    // ── Settings ────────────────────────────────────────────────────
    const [config, setConfig]         = useState({});
    const [cfgLoading, setCfgLoading]   = useState(true);
    const [saving, setSaving]           = useState(false);
    const [saveMsg, setSaveMsg]         = useState('');
    const [errors, setErrors]           = useState({});
    const [sigUploading, setSigUploading] = useState(false);
    const [sigMsg, setSigMsg]             = useState('');
    const [sigBlobUrl, setSigBlobUrl]     = useState(null);

    useEffect(() => {
        fetch('/api/admission-letter/config', { headers })
            .then(r => r.json())
            .then(data => {
                setConfig(data);
                if (data.director_signature) {
                    fetch('/api/admission-letter/signature', { headers })
                        .then(r => r.blob())
                        .then(blob => setSigBlobUrl(URL.createObjectURL(blob)))
                        .catch(() => {});
                }
            })
            .catch(() => {})
            .finally(() => setCfgLoading(false));
    }, [token]);

    const handleChange = e => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const saveConfig = async e => {
        e.preventDefault();
        setSaving(true); setSaveMsg(''); setErrors({});
        try {
            const r    = await fetch('/api/admission-letter/config', { method: 'PUT', headers, body: JSON.stringify(config) });
            const data = await r.json();
            if (!r.ok) {
                if (r.status === 422) setErrors(data.errors ?? {});
                else setSaveMsg(data.message || 'Failed to save settings.');
            } else {
                setConfig(data);
                setSaveMsg('Settings saved successfully.');
                setTimeout(() => setSaveMsg(''), 3000);
            }
        } catch { setSaveMsg('Network error.'); }
        finally { setSaving(false); }
    };

    const uploadSignature = async (file) => {
        setSigUploading(true); setSigMsg('');
        const form = new FormData();
        form.append('signature', file);
        try {
            const r    = await fetch('/api/admission-letter/signature', { method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, body: form });
            const data = await r.json();
            if (!r.ok) { setSigMsg(data.message || 'Upload failed.'); return; }
            setConfig(prev => ({ ...prev, director_signature: data.path, signature_url: data.url }));
            // Load blob preview via authenticated request
            fetch('/api/admission-letter/signature', { headers })
                .then(r2 => r2.blob())
                .then(blob => setSigBlobUrl(URL.createObjectURL(blob)))
                .catch(() => setSigBlobUrl(data.url));
            setSigMsg('Signature uploaded.');
            setTimeout(() => setSigMsg(''), 3000);
        } catch (err) { setSigMsg('Network error: ' + err.message); }
        finally { setSigUploading(false); }
    };

    const deleteSignature = async () => {
        setSigUploading(true); setSigMsg('');
        try {
            await fetch('/api/admission-letter/signature', { method: 'DELETE', headers });
            setConfig(prev => ({ ...prev, director_signature: null, signature_url: null }));
            setSigBlobUrl(null);
            setSigMsg('Signature removed.');
            setTimeout(() => setSigMsg(''), 3000);
        } catch { setSigMsg('Network error.'); }
        finally { setSigUploading(false); }
    };

    // ── Enrollments ─────────────────────────────────────────────────
    const [enrollments, setEnrollments] = useState([]);
    const [enrLoading, setEnrLoading]   = useState(false);
    const [enrPage, setEnrPage]         = useState(1);
    const [enrMeta, setEnrMeta]         = useState(null);
    const [enrSearch, setEnrSearch]     = useState('');
    const [enrStatus, setEnrStatus]     = useState('approved');
    const [downloading, setDownloading] = useState(null);

    const loadEnrollments = useCallback(async (p = 1) => {
        setEnrLoading(true);
        const params = new URLSearchParams({ page: p, per_page: 15, search: enrSearch, status: enrStatus });
        try {
            const r    = await fetch(`/api/enrollments?${params}`, { headers });
            const data = await r.json();
            setEnrollments(data.data ?? []);
            setEnrMeta(data);
            setEnrPage(p);
        } catch {}
        setEnrLoading(false);
    }, [token, enrSearch, enrStatus]);

    useEffect(() => {
        if (tab === 'Enrollments') loadEnrollments(1);
    }, [tab, enrSearch, enrStatus]);

    const downloadLetter = async (enrollment) => {
        setDownloading(enrollment.id);
        try {
            const r = await fetch(`/api/admin/enrollments/${enrollment.id}/admission-letter`, { headers });
            if (!r.ok) {
                const data = await r.json().catch(() => ({}));
                alert(data.message || 'Could not generate admission letter.');
                return;
            }
            const blob = await r.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `Admission_Letter_${enrollment.name.replace(/\s+/g, '_')}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Download failed. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
            <DashboardNavbar page="Admission Letters" />
            <div className="db-content">

            {/* Page header */}
            <div className="db-topbar">
                <div>
                    <h1 className="db-page-title">
                        <i className="fas fa-envelope-open-text" style={{ color: '#fe730c', marginRight: 10 }}></i>
                        Admission Letters
                    </h1>
                    <p className="db-page-sub">Configure the admission letter template and download letters for enrolled students.</p>
                </div>
            </div>

            {/* Two-column layout: left nav + content */}
            <div style={{ display: 'flex', minHeight: 0, gap: 0 }}>

                {/* ── Left sidebar nav ── */}
                <aside style={{
                    width: 220, flexShrink: 0,
                    background: '#fff',
                    borderRight: '1px solid #e2e8f0',
                    padding: '16px 0',
                    overflowY: 'auto',
                }}>
                    <div style={{ padding: '0 12px 10px', fontSize: '.68rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
                        Module
                    </div>
                    {NAV_ITEMS.map(item => {
                        const active = tab === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => setTab(item.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    width: '100%', padding: '10px 16px',
                                    border: 'none', cursor: 'pointer',
                                    background: active ? '#fff7ed' : 'transparent',
                                    color: active ? '#fe730c' : '#475569',
                                    fontWeight: active ? 700 : 500,
                                    fontSize: '.87rem',
                                    borderLeft: active ? '3px solid #fe730c' : '3px solid transparent',
                                    textAlign: 'left',
                                    transition: 'all .15s',
                                }}
                            >
                                <i className={item.icon} style={{ width: 16, textAlign: 'center', fontSize: '.82rem' }}></i>
                                {item.label}
                            </button>
                        );
                    })}

                    {/* Divider + info */}
                    <div style={{ margin: '16px 12px', borderTop: '1px solid #f1f5f9' }}></div>
                    <div style={{ padding: '0 14px' }}>
                        <div style={{ fontSize: '.72rem', color: '#94a3b8', lineHeight: 1.6 }}>
                            <i className="fas fa-info-circle" style={{ marginRight: 5, color: '#cbd5e1' }}></i>
                            Configure settings first, then download letters from Enrollments.
                        </div>
                    </div>
                </aside>

                {/* ── Main content ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 48px' }}>

                    {/* ── SETTINGS ── */}
                    {tab === 'Settings' && (
                        cfgLoading ? (
                            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
                                <i className="fas fa-spinner fa-spin fa-2x"></i>
                            </div>
                        ) : (
                            <form onSubmit={saveConfig}>
                                {CONFIG_SECTIONS.map(section => (
                                    <div key={section.title} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', border: '1px solid #f1f5f9', padding: '20px 24px', marginBottom: 18 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #f8fafc' }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <i className={section.icon} style={{ color: '#fe730c', fontSize: '.8rem' }}></i>
                                            </div>
                                            <h3 style={{ fontSize: '.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{section.title}</h3>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
                                            {section.fields.map(f => (
                                                <div key={f.key}>
                                                    <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#475569', marginBottom: 5 }}>{f.label}</label>
                                                    <input
                                                        name={f.key}
                                                        type={f.type}
                                                        value={config[f.key] ?? ''}
                                                        onChange={handleChange}
                                                        placeholder={f.placeholder}
                                                        step={f.type === 'number' ? 'any' : undefined}
                                                        style={{
                                                            width: '100%', padding: '8px 11px', border: `1px solid ${errors[f.key] ? '#ef4444' : '#e2e8f0'}`,
                                                            borderRadius: 7, fontSize: '.84rem', color: '#1e293b', outline: 'none',
                                                            background: '#f8fafc', boxSizing: 'border-box',
                                                        }}
                                                    />
                                                    {errors[f.key] && <div style={{ color: '#ef4444', fontSize: '.73rem', marginTop: 3 }}>{errors[f.key][0]}</div>}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Toggles: Online Class Details */}
                                        {section.title === 'Online Class Details' && (
                                            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {[
                                                    { key: 'show_meeting_id', label: 'Show Meeting ID on Letter', desc: 'When off, the Meeting ID is hidden from the printed letter.' },
                                                    { key: 'show_passcode',   label: 'Show Passcode on Letter',   desc: 'When off, the Passcode is hidden from the printed letter.' },
                                                ].map(({ key, label, desc }) => (
                                                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div>
                                                            <div style={{ fontSize: '.83rem', fontWeight: 600, color: '#1e293b' }}>{label}</div>
                                                            <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: 2 }}>{desc}</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfig(prev => ({ ...prev, [key]: !prev[key] }))}
                                                            style={{
                                                                flexShrink: 0, width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                                                                background: config[key] !== false ? '#081f4e' : '#cbd5e1',
                                                                position: 'relative', transition: 'background .2s',
                                                            }}
                                                        >
                                                            <span style={{
                                                                position: 'absolute', top: 3,
                                                                left: config[key] !== false ? 25 : 3,
                                                                width: 20, height: 20, borderRadius: '50%',
                                                                background: '#fff', transition: 'left .2s',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                                                            }} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Signature upload + director toggle — Institute & Letter only */}
                                        {section.title === 'Institute & Letter' && (
                                            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 16 }}>

                                                {/* Signature upload */}
                                                <div>
                                                    <div style={{ fontSize: '.83rem', fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>
                                                        <i className="fas fa-signature" style={{ color: '#fe730c', marginRight: 6 }}></i>
                                                        Director Signature
                                                    </div>
                                                    {config.director_signature ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, background: '#f8fafc', display: 'inline-block' }}>
                                                                {sigBlobUrl
                                                                    ? <img src={sigBlobUrl} alt="Director Signature" style={{ height: 60, maxWidth: 200, objectFit: 'contain', display: 'block' }} />
                                                                    : <div style={{ height: 60, width: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '.75rem' }}><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Loading…</div>
                                                                }
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '.78rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                                                                    <i className="fas fa-redo"></i> Replace
                                                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadSignature(e.target.files[0])} />
                                                                </label>
                                                                <button type="button" onClick={deleteSignature} disabled={sigUploading} style={{ padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: '.78rem', fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
                                                                    <i className="fas fa-trash"></i> Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', border: '2px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer', color: '#64748b', fontSize: '.83rem', background: '#f8fafc' }}>
                                                            {sigUploading
                                                                ? <><i className="fas fa-spinner fa-spin"></i> Uploading…</>
                                                                : <><i className="fas fa-upload" style={{ color: '#fe730c' }}></i> Upload Signature Image</>}
                                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadSignature(e.target.files[0])} disabled={sigUploading} />
                                                        </label>
                                                    )}
                                                    {sigMsg && <div style={{ marginTop: 6, fontSize: '.76rem', color: sigMsg.includes('upload') || sigMsg.includes('removed') ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{sigMsg}</div>}
                                                </div>

                                                {/* Toggle: show director name */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <div style={{ fontSize: '.83rem', fontWeight: 600, color: '#1e293b' }}>Show Director Name on Letter</div>
                                                        <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: 2 }}>When off, the director name is hidden from the printed letter.</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfig(prev => ({ ...prev, show_director_name: !prev.show_director_name }))}
                                                        style={{ flexShrink: 0, width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: config.show_director_name !== false ? '#081f4e' : '#cbd5e1', position: 'relative', transition: 'background .2s' }}
                                                    >
                                                        <span style={{ position: 'absolute', top: 3, left: config.show_director_name !== false ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{ background: '#081f4e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: '.87rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}
                                    >
                                        {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 7 }}></i>Saving…</> : <><i className="fas fa-save" style={{ marginRight: 7 }}></i>Save Settings</>}
                                    </button>
                                    {saveMsg && (
                                        <span style={{ color: saveMsg.includes('success') ? '#16a34a' : '#dc2626', fontSize: '.84rem', fontWeight: 600 }}>
                                            <i className={`fas ${saveMsg.includes('success') ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 6 }}></i>
                                            {saveMsg}
                                        </span>
                                    )}
                                </div>
                            </form>
                        )
                    )}

                    {/* ── ENROLLMENTS ── */}
                    {tab === 'Enrollments' && (
                        <div>
                            {/* Filters */}
                            <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                                    <i className="fas fa-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.78rem' }}></i>
                                    <input
                                        type="text"
                                        placeholder="Search by name or email…"
                                        value={enrSearch}
                                        onChange={e => { setEnrSearch(e.target.value); setEnrPage(1); }}
                                        style={{ width: '100%', paddingLeft: 32, padding: '8px 12px 8px 32px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '.84rem', color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <select
                                    value={enrStatus}
                                    onChange={e => { setEnrStatus(e.target.value); setEnrPage(1); }}
                                    style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '.84rem', color: '#1e293b', background: '#f8fafc', cursor: 'pointer' }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="approved">Approved</option>
                                    <option value="pending">Pending</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <button
                                    onClick={() => loadEnrollments(1)}
                                    style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '.84rem', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    <i className="fas fa-sync-alt" style={{ marginRight: 6 }}></i>Refresh
                                </button>
                            </div>

                            {enrLoading ? (
                                <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
                                    <i className="fas fa-spinner fa-spin fa-2x"></i>
                                </div>
                            ) : enrollments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
                                    <i className="fas fa-inbox fa-3x" style={{ marginBottom: 16, opacity: .4 }}></i>
                                    <div style={{ fontSize: '.9rem' }}>No enrollments found.</div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,.07)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                    {['#', 'Name', 'Email', 'Phone', 'Course', 'Enrolled', 'Status', 'Action'].map(h => (
                                                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '.76rem', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {enrollments.map((enr, i) => {
                                                    const sc = STATUS_COLORS[enr.status] ?? STATUS_COLORS.pending;
                                                    return (
                                                        <tr key={enr.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                                            <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '.78rem' }}>{((enrPage - 1) * 15) + i + 1}</td>
                                                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{enr.name}</td>
                                                            <td style={{ padding: '10px 14px', color: '#475569' }}>{enr.email}</td>
                                                            <td style={{ padding: '10px 14px', color: '#475569' }}>{enr.phone || '—'}</td>
                                                            <td style={{ padding: '10px 14px', color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {enr.course?.title || '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(enr.created_at)}</td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <span style={{ ...sc, borderRadius: 20, padding: '3px 10px', fontSize: '.74rem', fontWeight: 700, display: 'inline-block', textTransform: 'capitalize' }}>
                                                                    {enr.status}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <button
                                                                    onClick={() => downloadLetter(enr)}
                                                                    disabled={downloading === enr.id}
                                                                    title="Download Admission Letter"
                                                                    style={{ background: downloading === enr.id ? '#94a3b8' : '#081f4e', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: '.76rem', fontWeight: 600, cursor: downloading === enr.id ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                                                                >
                                                                    {downloading === enr.id
                                                                        ? <><i className="fas fa-spinner fa-spin"></i> Generating…</>
                                                                        : <><i className="fas fa-download"></i> Download</>}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {enrMeta && enrMeta.last_page > 1 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                                            <span style={{ fontSize: '.8rem', color: '#64748b' }}>
                                                Showing {enrMeta.from}–{enrMeta.to} of {enrMeta.total}
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => loadEnrollments(enrPage - 1)} disabled={enrPage === 1}
                                                    style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: enrPage === 1 ? 'not-allowed' : 'pointer', color: '#475569', fontSize: '.82rem', opacity: enrPage === 1 ? .5 : 1 }}>
                                                    <i className="fas fa-chevron-left"></i>
                                                </button>
                                                <span style={{ padding: '6px 14px', fontSize: '.82rem', color: '#475569', background: '#f8fafc', borderRadius: 7, border: '1px solid #e2e8f0' }}>
                                                    {enrPage} / {enrMeta.last_page}
                                                </span>
                                                <button onClick={() => loadEnrollments(enrPage + 1)} disabled={enrPage === enrMeta.last_page}
                                                    style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 7, background: '#fff', cursor: enrPage === enrMeta.last_page ? 'not-allowed' : 'pointer', color: '#475569', fontSize: '.82rem', opacity: enrPage === enrMeta.last_page ? .5 : 1 }}>
                                                    <i className="fas fa-chevron-right"></i>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            </div>{/* db-content */}
            </div>{/* db-main */}
        </div>
    );
}
