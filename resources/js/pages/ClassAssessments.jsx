import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function Toast({ toast }) {
    if (!toast) return null;
    const err = toast.type === 'error';
    return (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: err ? '#fef2f2' : '#f0fdf4', border: `1px solid ${err ? '#fca5a5' : '#86efac'}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', maxWidth: 380, fontFamily: 'Poppins,sans-serif' }}>
            <i className={`fas ${err ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ color: err ? '#dc2626' : '#16a34a', fontSize: '1.1rem', flexShrink: 0 }} />
            <span style={{ fontSize: '.83rem', color: err ? '#991b1b' : '#15803d' }}>{toast.message}</span>
        </div>
    );
}

/* ── Status badge ────────────────────────────────────────────────────────── */
const STATUS_STYLE = {
    active: { bg: '#d1fae5', color: '#065f46', label: 'Active' },
    closed: { bg: '#fee2e2', color: '#991b1b', label: 'Closed' },
    draft:  { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
};

function StatusBadge({ status }) {
    const s = STATUS_STYLE[status] || STATUS_STYLE.draft;
    return (
        <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.3px' }}>
            {s.label}
        </span>
    );
}

/* ── Delete confirm modal ────────────────────────────────────────────────── */
function DeleteModal({ title, onConfirm, onClose, loading }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 380, fontFamily: 'Poppins,sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <i className="fas fa-trash" style={{ fontSize: '1.5rem', color: '#dc2626' }} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Delete Assessment</h3>
                    <p style={{ margin: '8px 0 0', fontSize: '.82rem', color: '#6b7280' }}>
                        Delete "<strong>{title}</strong>"? All student submissions will also be deleted. This cannot be undone.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.82rem', color: '#374151' }}>Cancel</button>
                    <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', opacity: loading ? .6 : 1 }}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Assessment form modal ────────────────────────────────────────────────── */
function AssessmentModal({ item, classes, token, onClose, onSave }) {
    const [form, setForm] = useState({
        title: item?.title || '',
        description: item?.description || '',
        class_id: item?.class_id || '',
        due_date: item?.due_date ? item.due_date.slice(0, 16) : '',
        status: item?.status || 'active',
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        setSaving(true);
        setErrors({});
        const method = item ? 'PUT' : 'POST';
        const url    = item ? `/api/admin/class-assessments/${item.id}` : '/api/admin/class-assessments';
        const res = await fetch(url, {
            method,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ ...form, class_id: form.class_id || null, due_date: form.due_date || null }),
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) { setErrors(data.errors || {}); return; }
        onSave(data.assessment);
    };

    const inp = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', boxSizing: 'border-box', outline: 'none' };
    const lbl = { display: 'block', marginBottom: 5, fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600, color: '#374151' };
    const err = (k) => errors[k] ? <span style={{ color: '#dc2626', fontSize: '.72rem' }}>{errors[k][0]}</span> : null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 520, maxHeight: '90vh', overflowY: 'auto', fontFamily: 'Poppins,sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#081f4e' }}>
                        <i className="fas fa-clipboard-list" style={{ marginRight: 10, color: 'var(--red,#e53e3e)' }} />
                        {item ? 'Edit Assessment' : 'New Assessment'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}><i className="fas fa-times" /></button>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>Title *</label>
                    <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Mid-term Assignment 1" />
                    {err('title')}
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>Description</label>
                    <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Instructions for students…" />
                    {err('description')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                        <label style={lbl}>Assign to Class</label>
                        <select style={inp} value={form.class_id} onChange={e => set('class_id', e.target.value)}>
                            <option value="">All classes</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {err('class_id')}
                    </div>
                    <div>
                        <label style={lbl}>Due Date &amp; Time</label>
                        <input type="datetime-local" style={inp} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
                        {err('due_date')}
                    </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={lbl}>Status *</label>
                    <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="closed">Closed</option>
                    </select>
                    {err('status')}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.82rem', color: '#374151' }}>Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--navy,#081f4e)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', opacity: saving ? .6 : 1 }}>
                        {saving ? 'Saving…' : (item ? 'Update' : 'Create')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Upload assessment file modal ────────────────────────────────────────── */
function UploadFileModal({ assessment, token, onClose, onSaved }) {
    const [file, setFile]       = useState(null);
    const [dragOver, setDrag]   = useState(false);
    const [uploading, setUpl]   = useState(false);
    const [error, setError]     = useState('');
    const inputRef              = useRef();

    const pick = f => {
        if (!f) return;
        const allowed = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','zip'];
        const ext = f.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) { setError('Unsupported file type.'); return; }
        if (f.size > 20 * 1024 * 1024) { setError('File must be under 20 MB.'); return; }
        setError('');
        setFile(f);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUpl(true);
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/admin/class-assessments/${assessment.id}/upload-file`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            body: fd,
        });
        const data = await res.json();
        setUpl(false);
        if (!res.ok) { setError(data.message || 'Upload failed.'); return; }
        onSaved(data.assessment);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 460, fontFamily: 'Poppins,sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#081f4e' }}>
                        <i className="fas fa-upload" style={{ marginRight: 9, color: 'var(--red,#e53e3e)' }} />
                        Upload Assessment File
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}><i className="fas fa-times" /></button>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '.8rem', color: '#6b7280' }}>
                    For: <strong>{assessment.title}</strong>
                    {assessment.assessment_file_name && <span style={{ display: 'block', color: '#f59e0b', marginTop: 4 }}><i className="fas fa-exclamation-triangle" style={{ marginRight: 5 }} />Uploading will replace the existing file.</span>}
                </p>

                <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                    style={{ border: `2px dashed ${dragOver ? 'var(--navy,#081f4e)' : '#d1d5db'}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#f0f4ff' : '#fafafa', transition: 'all .2s', marginBottom: 12 }}
                >
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: 8, display: 'block' }} />
                    {file
                        ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '.85rem' }}><i className="fas fa-check-circle" style={{ marginRight: 6 }} />{file.name}</span>
                        : <span style={{ color: '#9ca3af', fontSize: '.82rem' }}>Drop a file here or click to browse<br /><span style={{ fontSize: '.75rem' }}>PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP — max 20 MB</span></span>
                    }
                    <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" style={{ display: 'none' }} onChange={e => pick(e.target.files[0])} />
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '.78rem', margin: '0 0 12px' }}>{error}</p>}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.82rem', color: '#374151' }}>Cancel</button>
                    <button onClick={handleUpload} disabled={!file || uploading} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--navy,#081f4e)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', opacity: (!file || uploading) ? .5 : 1 }}>
                        {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Mark submission modal ────────────────────────────────────────────────── */
function MarkModal({ submission, assessment, token, onClose, onSaved }) {
    const [grade, setGrade]     = useState(submission.grade || '');
    const [feedback, setFb]     = useState(submission.feedback || '');
    const [file, setFile]       = useState(null);
    const [dragOver, setDrag]   = useState(false);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');
    const inputRef              = useRef();

    const pick = f => {
        if (!f) return;
        const allowed = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','zip'];
        const ext = f.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) { setError('Unsupported file type.'); return; }
        if (f.size > 20 * 1024 * 1024) { setError('File must be under 20 MB.'); return; }
        setError('');
        setFile(f);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        const fd = new FormData();
        if (grade) fd.append('grade', grade);
        if (feedback) fd.append('feedback', feedback);
        if (file) fd.append('file', file);
        const res = await fetch(`/api/admin/class-assessments/${assessment.id}/submissions/${submission.id}/mark`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            body: fd,
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) { setError(data.message || 'Failed to save.'); return; }
        onSaved(data.submission);
    };

    const inp = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', boxSizing: 'border-box' };
    const lbl = { display: 'block', marginBottom: 5, fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600, color: '#374151' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 30, width: 480, maxHeight: '90vh', overflowY: 'auto', fontFamily: 'Poppins,sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#081f4e' }}>
                        <i className="fas fa-marker" style={{ marginRight: 8, color: 'var(--red,#e53e3e)' }} />
                        Mark Submission
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}><i className="fas fa-times" /></button>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '.8rem', color: '#6b7280' }}>
                    Student: <strong>{submission.student?.name}</strong>
                </p>

                <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Grade / Score</label>
                    <input style={inp} value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. 85%, A, 42/50" />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>Feedback</label>
                    <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={feedback} onChange={e => setFb(e.target.value)} placeholder="Comments for the student…" />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={lbl}>Upload Marked File (optional)</label>
                    {submission.marked_file_name && (
                        <p style={{ margin: '0 0 8px', fontSize: '.76rem', color: '#f59e0b' }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginRight: 5 }} />
                            Replaces existing: <strong>{submission.marked_file_name}</strong>
                        </p>
                    )}
                    <div
                        onClick={() => inputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                        style={{ border: `2px dashed ${dragOver ? '#081f4e' : '#d1d5db'}`, borderRadius: 10, padding: '18px 16px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#f0f4ff' : '#fafafa' }}
                    >
                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: '1.5rem', color: '#94a3b8', marginBottom: 6, display: 'block' }} />
                        {file
                            ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '.82rem' }}><i className="fas fa-check-circle" style={{ marginRight: 5 }} />{file.name}</span>
                            : <span style={{ color: '#9ca3af', fontSize: '.78rem' }}>Drop or click — PDF, DOC, DOCX, XLS… max 20 MB</span>
                        }
                        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" style={{ display: 'none' }} onChange={e => pick(e.target.files[0])} />
                    </div>
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '.78rem', margin: '0 0 12px' }}>{error}</p>}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.82rem', color: '#374151' }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--navy,#081f4e)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', opacity: saving ? .6 : 1 }}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Submissions panel ───────────────────────────────────────────────────── */
function SubmissionsPanel({ assessment, token, onClose, onAssessmentUpdated }) {
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [markTarget, setMark]     = useState(null);
    const [toast, setToast]         = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/admin/class-assessments/${assessment.id}/submissions`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [assessment.id, token]);

    useEffect(() => { load(); }, [load]);

    const downloadSubmission = (sub) => {
        window.open(`/api/admin/class-assessments/${assessment.id}/submissions/${sub.id}/download?token=${token}`, '_blank');
    };

    const downloadMarked = (sub) => {
        window.open(`/api/admin/class-assessments/${assessment.id}/submissions/${sub.id}/download-marked?token=${token}`, '_blank');
    };

    const removeMarkedFile = async (sub) => {
        if (!confirm('Remove the marked file for this student?')) return;
        const res = await fetch(`/api/admin/class-assessments/${assessment.id}/submissions/${sub.id}/marked-file`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const d = await res.json();
        if (!res.ok) { showToast(d.message || 'Failed.', 'error'); return; }
        setData(prev => ({ ...prev, submissions: prev.submissions.map(s => s.id === sub.id ? d.submission : s) }));
        showToast('Marked file removed.');
    };

    const handleMarkSaved = (updated) => {
        setMark(null);
        setData(prev => ({ ...prev, submissions: prev.submissions.map(s => s.id === updated.id ? updated : s) }));
        showToast('Submission marked successfully!');
    };

    const SUB_STATUS = {
        pending:   { bg: '#f1f5f9', color: '#64748b', label: 'Not Submitted' },
        submitted: { bg: '#dbeafe', color: '#1d4ed8', label: 'Submitted' },
        graded:    { bg: '#d1fae5', color: '#065f46', label: 'Graded' },
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Toast toast={toast} />
            <div style={{ background: '#fff', width: '100%', maxWidth: 720, height: '100vh', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,.2)', fontFamily: 'Poppins,sans-serif', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#081f4e' }}>
                            <i className="fas fa-users" style={{ marginRight: 10, color: 'var(--red,#e53e3e)' }} />
                            Student Submissions
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '.8rem', color: '#6b7280' }}>{assessment.title}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8', marginTop: 2 }}><i className="fas fa-times" /></button>
                </div>

                {/* Body */}
                <div style={{ padding: 28, flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }} /></div>
                    ) : !data?.submissions?.length ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <i className="fas fa-inbox" style={{ fontSize: '2.5rem', color: '#d1d5db', marginBottom: 12, display: 'block' }} />
                            <p style={{ color: '#6b7280', fontSize: '.85rem', margin: 0 }}>No submissions yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {data.submissions.map(sub => {
                                const ss = SUB_STATUS[sub.status] || SUB_STATUS.pending;
                                return (
                                    <div key={sub.id} style={{ border: '1.5px solid #f1f5f9', borderRadius: 12, padding: '16px 18px', background: '#fafafa' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#111827', fontSize: '.9rem' }}>{sub.student?.name || '—'}</div>
                                                <div style={{ fontSize: '.76rem', color: '#6b7280', marginTop: 2 }}>{sub.student?.user?.email || sub.student?.email || ''}</div>
                                                {sub.submitted_at && <div style={{ fontSize: '.73rem', color: '#9ca3af', marginTop: 3 }}>Submitted: {new Date(sub.submitted_at).toLocaleString()}</div>}
                                            </div>
                                            <span style={{ background: ss.bg, color: ss.color, borderRadius: 20, padding: '3px 10px', fontSize: '.72rem', fontWeight: 700 }}>{ss.label}</span>
                                        </div>

                                        {sub.grade && (
                                            <div style={{ marginTop: 10, fontSize: '.8rem', color: '#374151' }}>
                                                <strong>Grade:</strong> {sub.grade}
                                                {sub.feedback && <span style={{ marginLeft: 12 }}><strong>Feedback:</strong> {sub.feedback}</span>}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                            {sub.submission_file_path && (
                                                <button onClick={() => downloadSubmission(sub)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1.5px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', fontWeight: 600 }}>
                                                    <i className="fas fa-download" />Download Work
                                                </button>
                                            )}
                                            <button onClick={() => setMark(sub)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1.5px solid var(--navy,#081f4e)', background: '#f0f4ff', color: 'var(--navy,#081f4e)', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', fontWeight: 600 }}>
                                                <i className="fas fa-marker" />{sub.status === 'graded' ? 'Edit Mark' : 'Mark'}
                                            </button>
                                            {sub.marked_file_path && (
                                                <>
                                                    <button onClick={() => downloadMarked(sub)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1.5px solid #10b981', background: '#ecfdf5', color: '#065f46', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', fontWeight: 600 }}>
                                                        <i className="fas fa-file-download" />Marked File
                                                    </button>
                                                    <button onClick={() => removeMarkedFile(sub)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', fontWeight: 600 }}>
                                                        <i className="fas fa-trash" />Remove Marked
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {markTarget && (
                <MarkModal
                    submission={markTarget}
                    assessment={assessment}
                    token={token}
                    onClose={() => setMark(null)}
                    onSaved={handleMarkSaved}
                />
            )}
        </div>
    );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function ClassAssessments() {
    const { can, token } = useAuth();

    const [assessments, setAssessments] = useState([]);
    const [meta, setMeta]               = useState({ total: 0, last_page: 1 });
    const [classes, setClasses]         = useState([]);
    const [loading, setLoading]         = useState(true);

    const [search, setSearch]           = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [statusFilter, setStatus]     = useState('');
    const [page, setPage]               = useState(1);

    const [addModal, setAddModal]       = useState(false);
    const [editItem, setEdit]           = useState(null);
    const [deleteItem, setDelete]       = useState(null);
    const [deleting, setDeleting]       = useState(false);
    const [uploadTarget, setUpload]     = useState(null);
    const [subsTarget, setSubs]         = useState(null);
    const [toast, setToast]             = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load class list for filter dropdowns
    useEffect(() => {
        fetch('/api/classes', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
            .then(r => r.json())
            .then(d => setClasses(Array.isArray(d) ? d : (d.data || [])))
            .catch(() => {});
    }, [token]);

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ page, per_page: 15 });
        if (search) params.set('search', search);
        if (classFilter) params.set('class_id', classFilter);
        if (statusFilter) params.set('status', statusFilter);

        fetch(`/api/admin/class-assessments?${params}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => { setAssessments(d.data || []); setMeta(d); })
            .finally(() => setLoading(false));
    }, [token, page, search, classFilter, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleSave = (saved) => {
        setAssessments(prev => {
            const idx = prev.findIndex(a => a.id === saved.id);
            return idx >= 0 ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev];
        });
        setAddModal(false);
        setEdit(null);
        showToast(editItem ? 'Assessment updated.' : 'Assessment created.');
    };

    const handleDelete = async () => {
        setDeleting(true);
        const res = await fetch(`/api/admin/class-assessments/${deleteItem.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        setDeleting(false);
        if (!res.ok) { showToast('Delete failed.', 'error'); setDelete(null); return; }
        setAssessments(prev => prev.filter(a => a.id !== deleteItem.id));
        setDelete(null);
        showToast('Assessment deleted.');
    };

    const handleFileSaved = (saved) => {
        setAssessments(prev => prev.map(a => a.id === saved.id ? { ...a, ...saved } : a));
        setUpload(null);
        showToast('File uploaded successfully.');
    };

    const removeAssessmentFile = async (assessment) => {
        if (!confirm('Remove the assessment file?')) return;
        const res = await fetch(`/api/admin/class-assessments/${assessment.id}/file`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        const d = await res.json();
        if (!res.ok) { showToast(d.message || 'Failed.', 'error'); return; }
        setAssessments(prev => prev.map(a => a.id === assessment.id ? { ...a, ...d.assessment } : a));
        showToast('File removed.');
    };

    const Pagination = () => {
        if (meta.last_page <= 1) return null;
        return (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid', borderColor: p === page ? 'var(--navy,#081f4e)' : '#e5e7eb', background: p === page ? 'var(--navy,#081f4e)' : '#fff', color: p === page ? '#fff' : '#374151', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.82rem' }}>{p}</button>
                ))}
            </div>
        );
    };

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="Class Assessments" />
                <div className="db-content">
                    <Toast toast={toast} />

                    {!can('class_assessments', 'view') && <AccessDenied />}
                    {can('class_assessments', 'view') && (
                        <>
                            {/* Topbar */}
                            <div className="db-topbar">
                                <h1 className="db-page-title">
                                    <i className="fas fa-clipboard-list" style={{ marginRight: 10 }} />
                                    Class Assessments
                                </h1>
                                {can('class_assessments', 'create') && (
                                    <button className="db-btn-primary" onClick={() => setAddModal(true)}>
                                        <i className="fas fa-plus" /> New Assessment
                                    </button>
                                )}
                            </div>

                            {/* Stats */}
                            <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
                                {[
                                    { label: 'Total', value: meta.total, icon: 'fa-clipboard-list', bg: '#eff6ff', color: '#1d4ed8' },
                                ].map(s => (
                                    <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '14px 20px', minWidth: 140, display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <i className={`fas ${s.icon}`} style={{ fontSize: '1.6rem', color: s.color }} />
                                        <div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, fontFamily: 'Poppins,sans-serif' }}>{s.value}</div>
                                            <div style={{ fontSize: '.72rem', color: '#6b7280', fontFamily: 'Poppins,sans-serif' }}>{s.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Filters */}
                            <div className="db-controls" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                                <input
                                    className="db-search"
                                    placeholder="Search assessments…"
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    style={{ flex: 1, minWidth: 200 }}
                                />
                                <select className="db-select" value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }}>
                                    <option value="">All classes</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select className="db-select" value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                                    <option value="">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="closed">Closed</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>

                            {/* Table */}
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem' }} />
                                </div>
                            ) : assessments.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                    <i className="fas fa-clipboard" style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: 14, display: 'block' }} />
                                    <p style={{ color: '#6b7280', fontSize: '.9rem', fontFamily: 'Poppins,sans-serif' }}>No assessments found.</p>
                                    {can('class_assessments', 'create') && (
                                        <button className="db-btn-primary" onClick={() => setAddModal(true)} style={{ marginTop: 14 }}>
                                            <i className="fas fa-plus" /> Create First Assessment
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="db-table-wrap">
                                    <table className="db-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Assessment</th>
                                                <th>Class</th>
                                                <th>Due Date</th>
                                                <th>File</th>
                                                <th>Submissions</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assessments.map((a, i) => (
                                                <tr key={a.id}>
                                                    <td style={{ color: '#94a3b8', fontSize: '.78rem' }}>{(page - 1) * 15 + i + 1}</td>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '.85rem' }}>{a.title}</div>
                                                        {a.description && <div style={{ fontSize: '.73rem', color: '#6b7280', marginTop: 2 }}>{a.description.length > 60 ? a.description.slice(0, 60) + '…' : a.description}</div>}
                                                    </td>
                                                    <td style={{ fontSize: '.82rem', color: '#374151' }}>{a.school_class?.name || <span style={{ color: '#94a3b8' }}>All classes</span>}</td>
                                                    <td style={{ fontSize: '.78rem', color: '#374151' }}>
                                                        {a.due_date ? new Date(a.due_date).toLocaleString() : <span style={{ color: '#94a3b8' }}>No deadline</span>}
                                                    </td>
                                                    <td>
                                                        {a.assessment_file_path ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                <a href={`/${a.assessment_file_path}`} target="_blank" rel="noreferrer" style={{ fontSize: '.73rem', color: '#1d4ed8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                    <i className="fas fa-file" />{a.assessment_file_name?.length > 20 ? a.assessment_file_name.slice(0, 20) + '…' : a.assessment_file_name}
                                                                </a>
                                                                {can('class_assessments', 'update') && (
                                                                    <span onClick={() => removeAssessmentFile(a)} style={{ fontSize: '.7rem', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                        <i className="fas fa-trash" />Remove
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            can('class_assessments', 'update') && (
                                                                <button onClick={() => setUpload(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1.5px dashed #d1d5db', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 600 }}>
                                                                    <i className="fas fa-upload" />Upload
                                                                </button>
                                                            )
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button onClick={() => setSubs(a)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', background: '#f8fafc', color: '#374151', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600 }}>
                                                            <i className="fas fa-users" />{a.submissions_count} submission{a.submissions_count !== 1 ? 's' : ''}
                                                        </button>
                                                    </td>
                                                    <td><StatusBadge status={a.status} /></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {can('class_assessments', 'update') && (
                                                                <>
                                                                    <button onClick={() => setUpload(a)} title="Upload file" style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#f8fafc', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
                                                                        <i className="fas fa-upload" />
                                                                    </button>
                                                                    <button onClick={() => setEdit(a)} title="Edit" style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
                                                                        <i className="fas fa-edit" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {can('class_assessments', 'delete') && (
                                                                <button onClick={() => setDelete(a)} title="Delete" style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
                                                                    <i className="fas fa-trash" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <Pagination />
                        </>
                    )}
                </div>
            </div>

            {addModal && <AssessmentModal classes={classes} token={token} onClose={() => setAddModal(false)} onSave={handleSave} />}
            {editItem && <AssessmentModal item={editItem} classes={classes} token={token} onClose={() => setEdit(null)} onSave={handleSave} />}
            {deleteItem && <DeleteModal title={deleteItem.title} loading={deleting} onConfirm={handleDelete} onClose={() => setDelete(null)} />}
            {uploadTarget && <UploadFileModal assessment={uploadTarget} token={token} onClose={() => setUpload(null)} onSaved={handleFileSaved} />}
            {subsTarget && <SubmissionsPanel assessment={subsTarget} token={token} onClose={() => setSubs(null)} />}
        </div>
    );
}
