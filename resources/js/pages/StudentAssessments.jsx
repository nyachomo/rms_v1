import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

/* ── Status configs ──────────────────────────────────────────────────────── */
const ASSESS_STATUS = {
    active: { bg: '#d1fae5', color: '#065f46', label: 'Active' },
    closed: { bg: '#fee2e2', color: '#991b1b', label: 'Closed' },
    draft:  { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
};

const SUB_STATUS = {
    pending:   { bg: '#f1f5f9', color: '#64748b', icon: 'fa-clock',        label: 'Not Submitted' },
    submitted: { bg: '#dbeafe', color: '#1d4ed8', icon: 'fa-paper-plane',  label: 'Submitted' },
    graded:    { bg: '#d1fae5', color: '#065f46', icon: 'fa-check-circle', label: 'Graded' },
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function parseScorePercent(grade) {
    if (!grade) return null;
    const g = String(grade).trim();
    if (g.includes('/')) {
        const [n, d] = g.split('/').map(Number);
        if (d > 0) return (n / d) * 100;
    }
    const n = parseFloat(g);
    return isNaN(n) ? null : n;
}

function moduleAverage(assessments) {
    const graded = assessments.filter(a => a.my_submission?.status === 'graded' && a.my_submission?.grade);
    if (!graded.length) return null;
    const scores = graded.map(a => parseScorePercent(a.my_submission.grade)).filter(s => s !== null);
    if (!scores.length) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) + '%';
}

function cumulativeAverage(assessments) {
    const graded = assessments.filter(a => a.my_submission?.status === 'graded' && a.my_submission?.grade);
    if (!graded.length) return null;
    const scores = graded.map(a => parseScorePercent(a.my_submission.grade)).filter(s => s !== null);
    if (!scores.length) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) + '%';
}

function groupByModule(assessments) {
    const map = new Map();
    const unassigned = [];
    assessments.forEach(a => {
        if (a.module?.id) {
            if (!map.has(a.module.id)) map.set(a.module.id, { module: a.module, items: [] });
            map.get(a.module.id).items.push(a);
        } else {
            unassigned.push(a);
        }
    });
    const groups = Array.from(map.values());
    if (unassigned.length) groups.push({ module: null, items: unassigned });
    return groups;
}

/* ── Submit modal ────────────────────────────────────────────────────────── */
function SubmitModal({ assessment, token, onClose, onSaved }) {
    const [file, setFile]     = useState(null);
    const [dragOver, setDrag] = useState(false);
    const [uploading, setUpl] = useState(false);
    const [error, setError]   = useState('');
    const inputRef            = useRef();
    const isResubmit = !!assessment.my_submission?.submission_file_path;

    const pick = f => {
        if (!f) return;
        const allowed = ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','zip'];
        const ext = f.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) { setError('Unsupported file type.'); return; }
        if (f.size > 20 * 1024 * 1024) { setError('File must be under 20 MB.'); return; }
        setError(''); setFile(f);
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
                        <i className="fas fa-paper-plane" style={{ marginRight: 9, color: '#e53e3e' }} />
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
                    style={{ border: `2px dashed ${dragOver ? '#081f4e' : '#d1d5db'}`, borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#f0f4ff' : '#fafafa', transition: 'all .2s', marginBottom: 14 }}
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
                    <button onClick={handleSubmit} disabled={!file || uploading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#081f4e', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.82rem', opacity: (!file || uploading) ? .5 : 1 }}>
                        {uploading ? 'Uploading…' : (isResubmit ? 'Replace' : 'Submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Single assessment row (no module/avg cells — rendered by parent) ─────── */
function AssessmentRow({ assessment, token, onUpdated, showToast }) {
    const [submitModal, setSubmit] = useState(false);

    const sub   = assessment.my_submission;
    const subSt = sub ? (SUB_STATUS[sub.status] || SUB_STATUS.pending) : SUB_STATUS.pending;
    const asSt  = ASSESS_STATUS[assessment.status] || ASSESS_STATUS.active;

    const downloadAssessment = async () => {
        const res = await fetch(`/api/student/class-assessments/${assessment.id}/download`, {
            headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
        });
        if (!res.ok) { showToast('Download failed.', 'error'); return; }
        const blob  = await res.blob();
        const cd    = res.headers.get('Content-Disposition') || '';
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
        const blob  = await res.blob();
        const cd    = res.headers.get('Content-Disposition') || '';
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

    const td = {
        padding: '10px 14px',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '.78rem',
        color: '#374151',
        fontFamily: 'Poppins,sans-serif',
        verticalAlign: 'middle',
    };

    /* Score cell */
    let scoreCell;
    if (sub?.status === 'graded' && sub.grade) {
        const pct = parseScorePercent(sub.grade);
        const color = pct === null ? '#374151' : pct >= 75 ? '#065f46' : pct >= 50 ? '#92400e' : '#991b1b';
        scoreCell = <span style={{ fontWeight: 700, color, fontSize: '.82rem' }}>{sub.grade}</span>;
    } else if (sub?.status === 'submitted') {
        scoreCell = (
            <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '3px 9px', fontSize: '.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <i className="fas fa-paper-plane" style={{ marginRight: 4 }} />Submitted
            </span>
        );
    } else {
        scoreCell = <span style={{ color: '#d1d5db' }}>—</span>;
    }

    return (
        <>
            <tr style={{ background: '#fff' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>

                {/* Assessment name */}
                <td style={td}>
                    <div style={{ fontWeight: 600, color: '#111827', marginBottom: 3 }}>{assessment.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ background: asSt.bg, color: asSt.color, borderRadius: 20, padding: '2px 8px', fontSize: '.65rem', fontWeight: 700 }}>{asSt.label}</span>
                        {assessment.due_date && (
                            <span style={{ color: isPastDue ? '#dc2626' : '#6b7280', fontSize: '.67rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <i className={`fas ${isPastDue ? 'fa-exclamation-circle' : 'fa-calendar-alt'}`} />
                                {new Date(assessment.due_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                        )}
                    </div>
                    {sub?.submission_file_name && (
                        <div style={{ marginTop: 4, fontSize: '.67rem', color: '#9ca3af' }}>
                            <i className="fas fa-file" style={{ marginRight: 3 }} />{sub.submission_file_name}
                            {sub.submitted_at && <span style={{ marginLeft: 6 }}>· {new Date(sub.submitted_at).toLocaleDateString()}</span>}
                        </div>
                    )}
                </td>

                {/* Score */}
                <td style={{ ...td, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{scoreCell}</td>

                {/* Comment / Feedback */}
                <td style={{ ...td, maxWidth: 200 }}>
                    {sub?.status === 'graded' && sub.feedback
                        ? <span style={{ color: '#374151' }}>{sub.feedback}</span>
                        : sub?.status === 'graded'
                            ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No feedback</span>
                            : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                </td>

                {/* Actions */}
                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {assessment.assessment_file_path && (
                            <button onClick={downloadAssessment} title="Download Assessment"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1.5px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 600 }}>
                                <i className="fas fa-download" />Download
                            </button>
                        )}
                        {canSubmit && (
                            <button onClick={() => setSubmit(true)} title={sub?.submission_file_path ? 'Re-submit' : 'Submit Work'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#081f4e', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 700 }}>
                                <i className="fas fa-paper-plane" />{sub?.submission_file_path ? 'Re-submit' : 'Submit'}
                            </button>
                        )}
                        {sub?.marked_file_path && (
                            <button onClick={downloadMarked} title="Download Marked Work"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1.5px solid #10b981', background: '#ecfdf5', color: '#065f46', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 600 }}>
                                <i className="fas fa-file-download" />Marked
                            </button>
                        )}
                        {sub?.submission_file_path && canSubmit && sub.status !== 'graded' && (
                            <button onClick={removeSubmission} title="Remove Submission"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 600 }}>
                                <i className="fas fa-times" />Remove
                            </button>
                        )}
                    </div>
                </td>
            </tr>

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
    const { token, user } = useAuth();
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

    const downloadReport = () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();

        /* ── Header ── */
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(8, 31, 78);
        doc.text('Students Progress Report', 14, 16);

        if (cumulative) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(8, 31, 78);
            doc.text(`Cumulative Score: ${cumulative}`, pageW - 14, 16, { align: 'right' });
        }

        /* ── Student info ── */
        const firstA = assessments[0];
        const infoLines = [
            `Trainee: ${user?.name ?? '—'}`,
            `Email: ${user?.email ?? '—'}`,
            `Course: ${firstA?.course?.title ?? '—'}`,
            `Class: ${firstA?.school_class?.name ?? '—'}`,
        ];
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        infoLines.forEach((line, i) => doc.text(line, 14, 25 + i * 5));

        /* ── Table body with rowSpan ── */
        const bodyRows = [];
        groups.forEach((group, gi) => {
            const avg = moduleAverage(group.items);
            group.items.forEach((assessment, ai) => {
                const sub     = assessment.my_submission;
                const score   = sub?.status === 'graded' && sub.grade ? sub.grade
                              : sub?.status === 'submitted' ? 'Submitted' : '—';
                const comment = sub?.status === 'graded' && sub.feedback ? sub.feedback : '—';

                if (ai === 0) {
                    bodyRows.push([
                        { content: String(gi + 1), rowSpan: group.items.length, styles: { halign: 'center', fontStyle: 'bold', fillColor: [8, 31, 78], textColor: [255, 255, 255], valign: 'middle' } },
                        { content: group.module?.title ?? 'General', rowSpan: group.items.length, styles: { fontStyle: 'bold', fillColor: [240, 244, 255], valign: 'middle' } },
                        { content: assessment.title },
                        { content: score,   styles: { halign: 'center' } },
                        { content: comment },
                        { content: avg ?? '—', rowSpan: group.items.length, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 244, 255], valign: 'middle' } },
                    ]);
                } else {
                    bodyRows.push([
                        { content: assessment.title },
                        { content: score,   styles: { halign: 'center' } },
                        { content: comment },
                    ]);
                }
            });
        });

        autoTable(doc, {
            startY: 48,
            head: [[
                { content: '#',                      styles: { halign: 'center' } },
                { content: 'Module' },
                { content: 'Exam Name' },
                { content: 'Score (100%)',            styles: { halign: 'center' } },
                { content: 'Comment' },
                { content: 'Module Average\nScore (100%)', styles: { halign: 'center' } },
            ]],
            body: bodyRows,
            styles: { fontSize: 8, cellPadding: 3, font: 'helvetica', overflow: 'linebreak' },
            headStyles: { fillColor: [8, 31, 78], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 38 },
                2: { cellWidth: 55 },
                3: { cellWidth: 22 },
                4: { cellWidth: 45 },
                5: { cellWidth: 22 },
            },
            alternateRowStyles: { fillColor: [250, 250, 255] },
            didDrawPage: ({ pageNumber }) => {
                const total = doc.internal.getNumberOfPages();
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text(`Page ${pageNumber} of ${total}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
            },
        });

        const safeName = (user?.name ?? 'student').replace(/\s+/g, '_').toLowerCase();
        doc.save(`progress_report_${safeName}.pdf`);
    };

    const cumulative   = cumulativeAverage(assessments);
    const groups       = groupByModule(assessments);

    const totalCount      = assessments.length;
    const notSubmitted    = assessments.filter(a => !a.my_submission?.submission_file_path).length;
    const submittedCount  = assessments.filter(a => a.my_submission?.status === 'submitted').length;
    const gradedCount     = assessments.filter(a => a.my_submission?.status === 'graded').length;

    /* shared styles */
    const thBase = {
        padding: '11px 14px',
        fontFamily: 'Poppins,sans-serif',
        fontSize: '.73rem',
        fontWeight: 700,
        color: '#fff',
        background: '#081f4e',
        borderRight: '1px solid rgba(255,255,255,.12)',
        whiteSpace: 'nowrap',
    };

    const moduleAvgTd = (avg) => ({
        padding: '10px 14px',
        fontFamily: 'Poppins,sans-serif',
        fontSize: '.78rem',
        fontWeight: 700,
        color: avg ? (parseFloat(avg) >= 75 ? '#065f46' : parseFloat(avg) >= 50 ? '#92400e' : '#991b1b') : '#9ca3af',
        background: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
        textAlign: 'center',
        verticalAlign: 'middle',
    });

    const moduleTd = {
        padding: '10px 14px',
        fontFamily: 'Poppins,sans-serif',
        fontSize: '.78rem',
        fontWeight: 700,
        color: '#081f4e',
        background: '#f0f4ff',
        borderBottom: '1px solid #e5e7eb',
        borderRight: '2px solid #081f4e',
        verticalAlign: 'middle',
        textAlign: 'center',
    };

    const numTd = {
        padding: '10px 14px',
        fontFamily: 'Poppins,sans-serif',
        fontSize: '.78rem',
        fontWeight: 700,
        color: '#fff',
        background: '#081f4e',
        borderBottom: '1px solid rgba(255,255,255,.15)',
        textAlign: 'center',
        verticalAlign: 'middle',
    };

    return (
        <div className="db-content" style={{ fontFamily: 'Poppins,sans-serif' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Toast toast={toast} />

            {/* Page header */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#081f4e' }}>
                        <i className="fas fa-clipboard-list" style={{ marginRight: 10, color: '#e53e3e' }} />
                        My Assessments
                    </h2>
                    <p style={{ margin: '6px 0 0', fontSize: '.82rem', color: '#6b7280' }}>
                        Download your assignments, submit your work, and view your graded results here.
                    </p>
                </div>
                {!loading && assessments.length > 0 && (
                    <button onClick={downloadReport}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#081f4e', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 8px rgba(8,31,78,.25)' }}>
                        <i className="fas fa-file-pdf" />Download Report
                    </button>
                )}
            </div>

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Total Assessments', value: totalCount,        icon: 'fa-clipboard-list', color: '#8b5cf6' },
                    { label: 'Not Submitted',      value: notSubmitted,      icon: 'fa-clock',          color: '#64748b' },
                    { label: 'Submitted',          value: submittedCount,    icon: 'fa-paper-plane',    color: '#3b82f6' },
                    { label: 'Graded',             value: gradedCount,       icon: 'fa-check-circle',   color: '#10b981' },
                    { label: 'Cumulative Score',   value: cumulative ?? '—', icon: 'fa-chart-line',     color: '#e53e3e' },
                ].map(card => (
                    <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,.08)', borderLeft: `4px solid ${card.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <i className={`fas ${card.icon}`} style={{ color: card.color, fontSize: '1.1rem' }} />
                            <span style={{ color: '#666', fontSize: '.82rem', fontWeight: 600, fontFamily: 'Poppins,sans-serif' }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#081f4e', fontFamily: 'Poppins,sans-serif' }}>{card.value}</div>
                    </div>
                ))}
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
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1.5px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,.07)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                        <thead>
                            <tr>
                                <th style={{ ...thBase, width: 36, textAlign: 'center' }}>#</th>
                                <th style={{ ...thBase, minWidth: 160 }}>Module</th>
                                <th style={{ ...thBase, minWidth: 220 }}>Assessment</th>
                                <th style={{ ...thBase, width: 100, textAlign: 'center' }}>Score (100%)</th>
                                <th style={{ ...thBase, minWidth: 180 }}>Comment</th>
                                <th style={{ ...thBase, width: 110, textAlign: 'center', background: '#0f2d6b', borderRight: 'none' }}>Module Avg Score (100%)</th>
                                <th style={{ ...thBase, minWidth: 180, background: '#0f2d6b', borderRight: 'none' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map((group, gi) => {
                                const avg      = moduleAverage(group.items);
                                const rowCount = group.items.length;
                                return group.items.map((assessment, ai) => {
                                    const isFirst = ai === 0;
                                    return (
                                        <tr key={assessment.id}
                                            style={{ background: '#fff' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>

                                            {/* # — only first row of module */}
                                            {isFirst && (
                                                <td rowSpan={rowCount} style={{ ...numTd }}>
                                                    {gi + 1}
                                                </td>
                                            )}

                                            {/* Module name — only first row */}
                                            {isFirst && (
                                                <td rowSpan={rowCount} style={moduleTd}>
                                                    {group.module?.title ?? 'General'}
                                                </td>
                                            )}

                                            {/* Assessment row content (renders Module Avg then Actions internally) */}
                                            <AssessmentRowCells
                                                assessment={assessment}
                                                token={token}
                                                onUpdated={handleUpdated}
                                                showToast={showToast}
                                                moduleAvg={avg}
                                                isFirst={isFirst}
                                                rowCount={rowCount}
                                                moduleAvgTd={moduleAvgTd}
                                            />
                                        </tr>
                                    );
                                });
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        </div>
    );
}

/* ── Inline row cells (used inside the main tr, alongside rowspan cells) ── */
function AssessmentRowCells({ assessment, token, onUpdated, showToast, moduleAvg, isFirst, rowCount, moduleAvgTd }) {
    const [submitModal, setSubmit] = useState(false);

    const sub      = assessment.my_submission;
    const asSt     = ASSESS_STATUS[assessment.status] || ASSESS_STATUS.active;
    const isPastDue = assessment.due_date && new Date(assessment.due_date) < new Date();
    const canSubmit = assessment.status === 'active' && !isPastDue;

    const download = async (url, fallback) => {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: '*/*' } });
        if (!res.ok) { showToast('Download failed.', 'error'); return; }
        const blob  = await res.blob();
        const cd    = res.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename="?([^"]+)"?/);
        const name  = match ? match[1] : fallback;
        const a     = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click();
        URL.revokeObjectURL(a.href);
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

    const td = {
        padding: '10px 14px',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '.78rem',
        color: '#374151',
        fontFamily: 'Poppins,sans-serif',
        verticalAlign: 'middle',
    };

    /* score display */
    let scoreNode;
    if (sub?.status === 'graded' && sub.grade) {
        const pct   = parseScorePercent(sub.grade);
        const color = pct === null ? '#374151' : pct >= 75 ? '#065f46' : pct >= 50 ? '#92400e' : '#991b1b';
        scoreNode = <span style={{ fontWeight: 700, color, fontSize: '.85rem' }}>{sub.grade}</span>;
    } else if (sub?.status === 'submitted') {
        scoreNode = (
            <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, padding: '3px 9px', fontSize: '.67rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <i className="fas fa-paper-plane" style={{ marginRight: 4 }} />Submitted
            </span>
        );
    } else {
        scoreNode = <span style={{ color: '#d1d5db' }}>—</span>;
    }

    return (
        <>
            {/* Assessment name cell */}
            <td style={td}>
                <div style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>{assessment.title}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ background: asSt.bg, color: asSt.color, borderRadius: 20, padding: '2px 8px', fontSize: '.65rem', fontWeight: 700 }}>{asSt.label}</span>
                    {assessment.due_date && (
                        <span style={{ color: isPastDue ? '#dc2626' : '#6b7280', fontSize: '.67rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <i className={`fas ${isPastDue ? 'fa-exclamation-circle' : 'fa-calendar-alt'}`} />
                            Due {new Date(assessment.due_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                    )}
                </div>
                {sub?.submission_file_name && (
                    <div style={{ marginTop: 4, fontSize: '.67rem', color: '#9ca3af' }}>
                        <i className="fas fa-file" style={{ marginRight: 3 }} />{sub.submission_file_name}
                        {sub.submitted_at && <span style={{ marginLeft: 5 }}>· {new Date(sub.submitted_at).toLocaleDateString()}</span>}
                    </div>
                )}
            </td>

            {/* Score cell */}
            <td style={{ ...td, textAlign: 'center' }}>{scoreNode}</td>

            {/* Comment / Feedback cell */}
            <td style={{ ...td }}>
                {sub?.status === 'graded' && sub.feedback
                    ? sub.feedback
                    : sub?.status === 'graded'
                        ? <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No feedback</span>
                        : <span style={{ color: '#d1d5db' }}>—</span>
                }
            </td>

            {/* Module Avg cell — rowspan, first row of module only */}
            {isFirst && (
                <td rowSpan={rowCount} style={moduleAvgTd(moduleAvg)}>
                    {moduleAvg ?? <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
            )}

            {/* Actions cell */}
            <td style={{ ...td, whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {assessment.assessment_file_path && (
                        <button onClick={() => download(`/api/student/class-assessments/${assessment.id}/download`, assessment.assessment_file_name || 'assessment')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1.5px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 600 }}>
                            <i className="fas fa-download" />Download
                        </button>
                    )}
                    {canSubmit && (
                        <button onClick={() => setSubmit(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#081f4e', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 700 }}>
                            <i className="fas fa-paper-plane" />{sub?.submission_file_path ? 'Re-submit' : 'Submit'}
                        </button>
                    )}
                    {sub?.marked_file_path && (
                        <button onClick={() => download(`/api/student/class-assessments/${assessment.id}/download-marked`, sub?.marked_file_name || 'marked')}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1.5px solid #10b981', background: '#ecfdf5', color: '#065f46', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 600 }}>
                            <i className="fas fa-file-download" />Marked
                        </button>
                    )}
                    {sub?.submission_file_path && canSubmit && sub.status !== 'graded' && (
                        <button onClick={removeSubmission}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 7, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 600 }}>
                            <i className="fas fa-times" />Remove
                        </button>
                    )}
                </div>
            </td>

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
