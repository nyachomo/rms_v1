import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

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
const ASSESS_STATUS = {
    active: { bg: '#d1fae5', color: '#065f46', label: 'Active' },
    closed: { bg: '#fee2e2', color: '#991b1b', label: 'Closed' },
    draft:  { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
};

const SUB_STATUS = {
    pending:   { bg: '#f1f5f9', color: '#64748b', icon: 'fa-clock', label: 'Not Submitted' },
    submitted: { bg: '#dbeafe', color: '#1d4ed8', icon: 'fa-paper-plane', label: 'Submitted' },
    graded:    { bg: '#d1fae5', color: '#065f46', icon: 'fa-check-circle', label: 'Graded' },
};

/* ── Submit / re-submit modal ────────────────────────────────────────────── */
function SubmitModal({ assessment, token, onClose, onSaved }) {
    const [file, setFile]       = useState(null);
    const [dragOver, setDrag]   = useState(false);
    const [uploading, setUpl]   = useState(false);
    const [error, setError]     = useState('');
    const inputRef              = useRef();

    const isResubmit = !!assessment.my_submission?.submission_file_path;

    const pick = f => {
        if (!f) return;
        const allowed = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','zip'];
        const ext = f.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) { setError('Unsupported file type. Please use PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, or ZIP.'); return; }
        if (f.size > 20 * 1024 * 1024) { setError('File must be under 20 MB.'); return; }
        setError('');
        setFile(f);
    };

    const handleSubmit = async () => {
        if (!file) return;
        setUpl(true);
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/student/class-assessments/${assessment.id}/submit`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            body: fd,
        });
        const data = await res.json();
        setUpl(false);
        if (!res.ok) { setError(data.message || 'Upload failed.'); return; }
        onSaved(data.submission);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 480, fontFamily: 'Poppins,sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#081f4e' }}>
                        <i className="fas fa-paper-plane" style={{ marginRight: 9, color: 'var(--red,#e53e3e)' }} />
                        {isResubmit ? 'Replace Submission' : 'Submit Your Work'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}><i className="fas fa-times" /></button>
                </div>

                <p style={{ margin: '0 0 16px', fontSize: '.82rem', color: '#6b7280' }}>
                    <strong>{assessment.title}</strong>
                    {isResubmit && (
                        <span style={{ display: 'block', marginTop: 6, color: '#f59e0b' }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginRight: 5 }} />
                            You already submitted: <strong>{assessment.my_submission.submission_file_name}</strong>. Uploading a new file will replace it.
                        </span>
                    )}
                </p>

                <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                    style={{ border: `2px dashed ${dragOver ? 'var(--navy,#081f4e)' : '#d1d5db'}`, borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#f0f4ff' : '#fafafa', transition: 'all .2s', marginBottom: 14 }}
                >
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2.2rem', color: '#94a3b8', marginBottom: 10, display: 'block' }} />
                    {file
                        ? <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '.9rem' }}><i className="fas fa-check-circle" style={{ marginRight: 7 }} />{file.name}</span>
                        : <>
                            <p style={{ margin: 0, color: '#374151', fontWeight: 600, fontSize: '.88rem' }}>Drop your file here or click to browse</p>
                            <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: '.76rem' }}>PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP — max 20 MB</p>
                          </>
                    }
                    <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" style={{ display: 'none' }} onChange={e => pick(e.target.files[0])} />
                </div>

                {error && <p style={{ color: '#dc2626', fontSize: '.78rem', margin: '0 0 12px' }}>{error}</p>}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.82rem', color: '#374151' }}>Cancel</button>
                    <button onClick={handleSubmit} disabled={!file || uploading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: 'var(--navy,#081f4e)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', opacity: (!file || uploading) ? .5 : 1 }}>
                        {uploading ? 'Uploading…' : (isResubmit ? 'Replace' : 'Submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Assessment detail card ──────────────────────────────────────────────── */
function AssessmentCard({ assessment, token, onUpdated }) {
    const [submitModal, setSubmit]  = useState(false);
    const [toast, setToast]         = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const sub = assessment.my_submission;
    const subSt = sub ? (SUB_STATUS[sub.status] || SUB_STATUS.pending) : SUB_STATUS.pending;
    const asSt  = ASSESS_STATUS[assessment.status] || ASSESS_STATUS.active;

    const downloadAssessment = async () => {
        const res = await fetch(`/api/student/class-assessments/${assessment.id}/download`, {
            headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
        });
        if (!res.ok) { showToast('Download failed.', 'error'); return; }
        const blob = await res.blob();
        const cd   = res.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename="?([^"]+)"?/);
        const name  = match ? match[1] : assessment.assessment_file_name || 'assessment';
        const url   = URL.createObjectURL(blob);
        const a     = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
    };

    const downloadMarked = async () => {
        const res = await fetch(`/api/student/class-assessments/${assessment.id}/download-marked`, {
            headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
        });
        if (!res.ok) { showToast('Download failed.', 'error'); return; }
        const blob = await res.blob();
        const cd   = res.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename="?([^"]+)"?/);
        const name  = match ? match[1] : sub?.marked_file_name || 'marked';
        const url   = URL.createObjectURL(blob);
        const a     = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
    };

    const removeSubmission = async () => {
        if (!confirm('Remove your submission? You can re-submit if the assessment is still active.')) return;
        const res = await fetch(`/api/student/class-assessments/${assessment.id}/submission`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (!res.ok) { showToast('Failed to remove submission.', 'error'); return; }
        onUpdated({ ...assessment, my_submission: null });
        showToast('Submission removed.');
    };

    const handleSubmitSaved = (submission) => {
        setSubmit(false);
        onUpdated({ ...assessment, my_submission: submission });
        showToast('Work submitted successfully!');
    };

    const isPastDue = assessment.due_date && new Date(assessment.due_date) < new Date();
    const canSubmit = assessment.status === 'active' && !isPastDue;

    return (
        <>
            <Toast toast={toast} />
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #f1f5f9', boxShadow: '0 2px 12px rgba(0,0,0,.06)', overflow: 'hidden', fontFamily: 'Poppins,sans-serif' }}>
                {/* Card header */}
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: '.95rem', fontWeight: 700, color: '#111827' }}>{assessment.title}</h3>
                            <span style={{ background: asSt.bg, color: asSt.color, borderRadius: 20, padding: '2px 9px', fontSize: '.68rem', fontWeight: 700 }}>{asSt.label}</span>
                        </div>
                        {assessment.school_class && (
                            <div style={{ marginTop: 5, fontSize: '.76rem', color: '#6b7280' }}>
                                <i className="fas fa-chalkboard" style={{ marginRight: 5 }} />{assessment.school_class.name}
                            </div>
                        )}
                        {assessment.description && (
                            <p style={{ margin: '8px 0 0', fontSize: '.8rem', color: '#374151', lineHeight: 1.5 }}>{assessment.description}</p>
                        )}
                    </div>
                    <span style={{ background: subSt.bg, color: subSt.color, borderRadius: 20, padding: '4px 12px', fontSize: '.72rem', fontWeight: 700, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <i className={`fas ${subSt.icon}`} />{subSt.label}
                    </span>
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 22px' }}>
                    {/* Due date */}
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
                        {assessment.due_date && (
                            <div style={{ fontSize: '.78rem', color: isPastDue ? '#dc2626' : '#374151', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <i className={`fas ${isPastDue ? 'fa-exclamation-circle' : 'fa-calendar-alt'}`} />
                                {isPastDue ? 'Overdue: ' : 'Due: '}
                                <strong>{new Date(assessment.due_date).toLocaleString()}</strong>
                            </div>
                        )}
                    </div>

                    {/* Grading info */}
                    {sub?.status === 'graded' && (
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                            <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#065f46', marginBottom: 4 }}>
                                <i className="fas fa-star" style={{ marginRight: 6, color: '#f59e0b' }} />Assessment Graded
                            </div>
                            {sub.grade && <div style={{ fontSize: '.8rem', color: '#374151' }}><strong>Grade:</strong> {sub.grade}</div>}
                            {sub.feedback && <div style={{ fontSize: '.8rem', color: '#374151', marginTop: 4 }}><strong>Feedback:</strong> {sub.feedback}</div>}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {/* Download assessment file */}
                        {assessment.assessment_file_path && (
                            <button onClick={downloadAssessment} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: '1.5px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600 }}>
                                <i className="fas fa-download" />Download Assessment
                            </button>
                        )}

                        {/* Submit / resubmit */}
                        {canSubmit && (
                            <button onClick={() => setSubmit(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: 'none', background: 'var(--navy,#081f4e)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 700 }}>
                                <i className="fas fa-paper-plane" />{sub?.submission_file_path ? 'Re-submit' : 'Submit Work'}
                            </button>
                        )}

                        {/* Download marked file */}
                        {sub?.marked_file_path && (
                            <button onClick={downloadMarked} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: '1.5px solid #10b981', background: '#ecfdf5', color: '#065f46', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600 }}>
                                <i className="fas fa-file-download" />Download Marked Work
                            </button>
                        )}

                        {/* Remove submission (only if active and not graded) */}
                        {sub?.submission_file_path && canSubmit && sub.status !== 'graded' && (
                            <button onClick={removeSubmission} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600 }}>
                                <i className="fas fa-times" />Remove Submission
                            </button>
                        )}
                    </div>

                    {/* Submission info */}
                    {sub?.submission_file_name && (
                        <div style={{ marginTop: 10, fontSize: '.73rem', color: '#6b7280' }}>
                            <i className="fas fa-file" style={{ marginRight: 5 }} />
                            Submitted: <strong>{sub.submission_file_name}</strong>
                            {sub.submitted_at && <span style={{ marginLeft: 8 }}>on {new Date(sub.submitted_at).toLocaleString()}</span>}
                        </div>
                    )}

                    {!assessment.assessment_file_path && !canSubmit && !sub && (
                        <p style={{ margin: 0, fontSize: '.78rem', color: '#94a3b8', fontStyle: 'italic' }}>No file uploaded for this assessment yet.</p>
                    )}
                </div>
            </div>

            {submitModal && (
                <SubmitModal
                    assessment={assessment}
                    token={token}
                    onClose={() => setSubmit(false)}
                    onSaved={handleSubmitSaved}
                />
            )}
        </>
    );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function StudentAssessments() {
    const { token } = useAuth();

    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [toast, setToast]             = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/student/class-assessments', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => setAssessments(d.assessments || []))
            .catch(() => showToast('Failed to load assessments.', 'error'))
            .finally(() => setLoading(false));
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const handleUpdated = (updated) => {
        setAssessments(prev => prev.map(a => a.id === updated.id ? updated : a));
    };

    const active = assessments.filter(a => a.status === 'active');
    const closed = assessments.filter(a => a.status !== 'active');

    return (
        <div style={{ fontFamily: 'Poppins,sans-serif', maxWidth: 860, margin: '0 auto', padding: '0 4px' }}>
            <Toast toast={toast} />

            <div style={{ marginBottom: 28 }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#081f4e' }}>
                    <i className="fas fa-clipboard-list" style={{ marginRight: 10, color: 'var(--red,#e53e3e)' }} />
                    My Assessments
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '.82rem', color: '#6b7280' }}>
                    Download your assignments, submit your work, and view your graded results here.
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem' }} />
                    <p style={{ margin: '12px 0 0', fontSize: '.85rem' }}>Loading assessments…</p>
                </div>
            ) : assessments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 16, border: '1.5px solid #f1f5f9' }}>
                    <i className="fas fa-clipboard" style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: 14, display: 'block' }} />
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '.9rem', fontWeight: 600 }}>No assessments assigned to your class yet.</p>
                    <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: '.8rem' }}>Check back later or contact your teacher.</p>
                </div>
            ) : (
                <>
                    {active.length > 0 && (
                        <section style={{ marginBottom: 32 }}>
                            <h3 style={{ margin: '0 0 14px', fontSize: '.85rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fas fa-circle" style={{ fontSize: '.5rem', color: '#10b981' }} />Active Assessments
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {active.map(a => (
                                    <AssessmentCard key={a.id} assessment={a} token={token} onUpdated={handleUpdated} />
                                ))}
                            </div>
                        </section>
                    )}

                    {closed.length > 0 && (
                        <section>
                            <h3 style={{ margin: '0 0 14px', fontSize: '.85rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fas fa-circle" style={{ fontSize: '.5rem', color: '#94a3b8' }} />Closed / Past Assessments
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {closed.map(a => (
                                    <AssessmentCard key={a.id} assessment={a} token={token} onUpdated={handleUpdated} />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
