import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';

/* ────────── Toast ────────── */
function Toast({ toast, onClose }) {
    if (!toast) return null;
    const ok = toast.type === 'success';
    return (
        <div style={{ background: ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${ok ? '#86efac' : '#fca5a5'}`, borderRadius: 10, padding: '11px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem' }}>
            <i className={`fas fa-${ok ? 'check-circle' : 'exclamation-circle'}`} style={{ color: ok ? '#16a34a' : '#dc2626' }}></i>
            <span style={{ flex: 1, color: ok ? '#15803d' : '#991b1b' }}>{toast.message}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><i className="fas fa-times"></i></button>
        </div>
    );
}

/* ────────── Assessment modal (Add / Edit) ────────── */
function AssessmentModal({ initial, onSave, onClose }) {
    const [name, setName]         = useState(initial?.name || '');
    const [maxScore, setMaxScore] = useState(initial?.max_score ?? 100);
    const [err, setErr]           = useState('');
    const isEdit = !!initial?.id;

    const submit = e => {
        e.preventDefault();
        if (!name.trim()) { setErr('Name is required.'); return; }
        if (!maxScore || maxScore < 1) { setErr('Max score must be at least 1.'); return; }
        onSave({ name: name.trim(), max_score: parseFloat(maxScore) });
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,31,78,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg,#081f4e,#0d2d6b)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <i className={`fas fa-${isEdit ? 'edit' : 'plus'}`}></i>
                    </div>
                    <h3 style={{ margin: 0, color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', fontWeight: 700 }}>
                        {isEdit ? 'Edit Assessment' : 'Add Assessment'}
                    </h3>
                </div>
                <form onSubmit={submit} style={{ padding: '22px 24px' }}>
                    {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: '.82rem', color: '#991b1b', marginBottom: 14 }}>{err}</div>}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Assessment Name <span style={{ color: '#dc2626' }}>*</span></label>
                        <input
                            autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
                            placeholder="e.g. CAT 1, Mid-Term Exam, Assignment 2…"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.9rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Maximum Score <span style={{ color: '#dc2626' }}>*</span></label>
                        <input
                            type="number" min="1" max="9999" step="0.5" value={maxScore}
                            onChange={e => setMaxScore(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.9rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.85rem' }}>Cancel</button>
                        <button type="submit" style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.85rem' }}>
                            <i className={`fas fa-${isEdit ? 'save' : 'plus'}`} style={{ marginRight: 6 }}></i>{isEdit ? 'Save' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ────────── Editable score cell ────────── */
function ScoreCell({ value, maxScore, onSave, onClear }) {
    const [editing, setEditing] = useState(false);
    const [input, setInput]     = useState('');
    const [saving, setSaving]   = useState(false);
    const ref = useRef();

    const startEdit = () => {
        setInput(value !== null ? String(value) : '');
        setEditing(true);
        setTimeout(() => ref.current?.select(), 50);
    };

    const commit = async () => {
        const val = input.trim();
        if (val === '' && value === null) { setEditing(false); return; }
        if (val === '') { await onClear(); setEditing(false); return; }
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > maxScore) { setEditing(false); return; }
        setSaving(true);
        await onSave(num);
        setSaving(false);
        setEditing(false);
    };

    const pct = value !== null ? Math.round((value / maxScore) * 100) : null;
    const bg  = pct === null ? 'transparent' : pct >= 70 ? '#f0fdf4' : pct >= 50 ? '#fffbeb' : '#fff5f5';
    const fg  = pct === null ? '#cbd5e1'     : pct >= 70 ? '#15803d' : pct >= 50 ? '#b45309' : '#b91c1c';

    if (editing) {
        return (
            <td style={{ padding: '4px 6px', textAlign: 'center', background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
                <input
                    ref={ref} type="number" min="0" max={maxScore} step="0.5"
                    value={input} onChange={e => setInput(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
                    style={{ width: 64, padding: '4px 6px', borderRadius: 6, border: '2px solid #2563eb', fontSize: '.82rem', textAlign: 'center', outline: 'none' }}
                />
            </td>
        );
    }

    return (
        <td
            onClick={startEdit}
            title="Click to enter score"
            style={{ padding: '8px 10px', textAlign: 'center', background: bg, cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background .1s', position: 'relative' }}>
            {saving
                ? <i className="fas fa-circle-notch fa-spin" style={{ color: '#94a3b8', fontSize: '.75rem' }}></i>
                : value !== null
                    ? <>
                        <span style={{ color: fg, fontWeight: 700, fontSize: '.85rem' }}>{value}</span>
                        <span style={{ display: 'block', fontSize: '.62rem', color: '#94a3b8' }}>{pct}%</span>
                      </>
                    : <span style={{ color: '#d1d5db', fontSize: '.75rem' }}>—</span>
            }
        </td>
    );
}

/* ────────── Main page ────────── */
export default function ManualGradebook() {
    const { token, can } = useAuth();

    const [courses, setCourses]         = useState([]);
    const [categories, setCategories]   = useState([]);
    const [categoryId, setCategoryId]   = useState('');
    const [courseId, setCourseId]       = useState('');
    const [data, setData]               = useState(null);
    const [loadingCourses, setLC]       = useState(true);
    const [loading, setLoading]         = useState(false);
    const [search, setSearch]           = useState('');
    const [toast, setToast]             = useState(null);
    const [addModal, setAddModal]       = useState(false);
    const [editAssmt, setEditAssmt]     = useState(null);
    const [delAssmt, setDelAssmt]       = useState(null);

    const hdr = useCallback((path, method = 'GET', body) => ({
        method,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
    }), [token]);

    /* Load courses + derive categories */
    useEffect(() => {
        fetch('/api/manual-gradebook/courses', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
            .then(r => r.json())
            .then(list => {
                const arr = Array.isArray(list) ? list : [];
                setCourses(arr);
                const seen = new Map();
                arr.forEach(c => {
                    if (c.course_category && !seen.has(c.course_category.id)) {
                        seen.set(c.course_category.id, c.course_category);
                    }
                });
                setCategories([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
            })
            .catch(() => [])
            .finally(() => setLC(false));
    }, [token]);

    const loadGrid = useCallback(() => {
        if (!courseId) return;
        setLoading(true);
        setData(null);
        fetch(`/api/courses/${courseId}/manual-gradebook`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
            .then(r => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [courseId, token]);

    useEffect(() => { loadGrid(); }, [loadGrid]);

    const filtered = useMemo(() => {
        if (!data?.students) return [];
        const q = search.trim().toLowerCase();
        if (!q) return data.students;
        return data.students.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }, [data, search]);

    /* ── Assessment CRUD ── */
    const saveAssessment = async (formData) => {
        const isEdit = !!editAssmt?.id;
        const url    = isEdit ? `/api/assessments/${editAssmt.id}` : `/api/courses/${courseId}/assessments`;
        const res    = await fetch(url, hdr(url, isEdit ? 'PUT' : 'POST', formData));
        const json   = await res.json();
        if (!res.ok) { setToast({ message: json.message || 'Failed.', type: 'error' }); return; }
        setToast({ message: isEdit ? 'Assessment updated.' : 'Assessment added.', type: 'success' });
        setAddModal(false); setEditAssmt(null);
        loadGrid();
    };

    const deleteAssessment = async (a) => {
        const res  = await fetch(`/api/assessments/${a.id}`, hdr('', 'DELETE'));
        const json = await res.json();
        if (!res.ok) { setToast({ message: json.message || 'Failed.', type: 'error' }); return; }
        setToast({ message: 'Assessment deleted.', type: 'success' });
        setDelAssmt(null);
        loadGrid();
    };

    /* ── Score CRUD ── */
    const saveScore = async (assessmentId, userId, score) => {
        await fetch(`/api/assessments/${assessmentId}/scores/${userId}`, hdr('', 'PUT', { score }));
        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                students: prev.students.map(s =>
                    s.user_id === userId
                        ? { ...s, scores: { ...s.scores, [assessmentId]: score } }
                        : s
                ),
            };
        });
    };

    const clearScore = async (assessmentId, userId) => {
        await fetch(`/api/assessments/${assessmentId}/scores/${userId}`, hdr('', 'DELETE'));
        setData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                students: prev.students.map(s =>
                    s.user_id === userId
                        ? { ...s, scores: { ...s.scores, [assessmentId]: null } }
                        : s
                ),
            };
        });
    };

    const filtCourses = categoryId ? courses.filter(c => String(c.category_id) === String(categoryId)) : courses;

    const cell = { padding: '8px 10px', fontSize: '.78rem', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', verticalAlign: 'middle' };
    const th   = { padding: '8px 10px', fontSize: '.72rem', fontWeight: 700, background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle' };
    const thA  = { ...th, background: '#1e293b', color: '#e2e8f0', textAlign: 'center', borderBottom: '2px solid #0f172a', maxWidth: 110 };

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="Manual Gradebook" />
                <div className="db-content">

                    <div className="db-topbar">
                        <div>
                            <h1 className="db-page-title">Manual Gradebook</h1>
                            <p className="db-page-sub">Create assessments and record student scores manually</p>
                        </div>
                    </div>

                    <Toast toast={toast} onClose={() => setToast(null)} />

                    {/* Course selector */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', marginBottom: 20 }}>
                        {loadingCourses ? <div style={{ color: '#94a3b8', fontSize: '.85rem' }}>Loading courses…</div> : (
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ flex: '1 1 200px' }}>
                                    <label style={{ fontSize: '.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                        <i className="fas fa-layer-group" style={{ marginRight: 6, color: '#6366f1' }}></i>Step 1 — Category
                                    </label>
                                    <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setCourseId(''); setData(null); }}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.88rem', color: '#1e293b', background: '#fff', outline: 'none' }}>
                                        <option value="">— All Categories —</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '1.1rem', paddingBottom: 10, flexShrink: 0 }}><i className="fas fa-arrow-right"></i></div>
                                <div style={{ flex: '1 1 240px' }}>
                                    <label style={{ fontSize: '.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                        <i className="fas fa-book-open" style={{ marginRight: 6, color: '#0ea5e9' }}></i>Step 2 — Course
                                    </label>
                                    <select value={courseId} onChange={e => { setCourseId(e.target.value); setSearch(''); }}
                                        disabled={filtCourses.length === 0}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.88rem', color: '#1e293b', background: '#fff', outline: 'none', cursor: filtCourses.length === 0 ? 'not-allowed' : 'pointer' }}>
                                        <option value="">{filtCourses.length === 0 ? '— No courses —' : '— Choose a course —'}</option>
                                        {filtCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem' }}></i>
                            <div style={{ marginTop: 10 }}>Loading gradebook…</div>
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Action bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                                    <i className="fas fa-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.8rem' }}></i>
                                    <input type="text" placeholder="Filter students…" value={search} onChange={e => setSearch(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
                                <div style={{ marginLeft: 'auto' }}>
                                    <button onClick={() => setAddModal(true)}
                                        style={{ background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(254,115,12,.3)' }}>
                                        <i className="fas fa-plus"></i> Add Assessment
                                    </button>
                                </div>
                            </div>

                            {data.assessments.length === 0 && (
                                <div style={{ background: '#fff', borderRadius: 14, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
                                    <i className="fas fa-clipboard-list" style={{ fontSize: '2.5rem', color: '#cbd5e1', display: 'block', marginBottom: 14 }}></i>
                                    <p style={{ color: '#94a3b8', fontFamily: 'Poppins,sans-serif', marginBottom: 16 }}>No assessments yet. Add your first one to start recording scores.</p>
                                    <button onClick={() => setAddModal(true)}
                                        style={{ background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.88rem' }}>
                                        <i className="fas fa-plus" style={{ marginRight: 7 }}></i>Add First Assessment
                                    </button>
                                </div>
                            )}

                            {data.assessments.length > 0 && (
                                <>
                                    {/* Info tip */}
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontSize: '.8rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <i className="fas fa-info-circle"></i>
                                        Click any <strong>—</strong> cell to enter a score. Click an existing score to edit it. Press <strong>Enter</strong> to save or <strong>Esc</strong> to cancel.
                                    </div>

                                    {/* Gradebook table */}
                                    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden', marginBottom: 16 }}>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 500 }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ ...th, textAlign: 'left', minWidth: 180 }}>Student</th>
                                                        {data.assessments.map(a => (
                                                            <th key={a.id} style={{ ...thA }}>
                                                                <div style={{ fontSize: '.72rem', fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }} title={a.name}>{a.name}</div>
                                                                <div style={{ fontSize: '.62rem', color: '#94a3b8', fontWeight: 400, marginBottom: 4 }}>out of {a.max_score}</div>
                                                                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                                    <button title="Edit" onClick={() => setEditAssmt(a)}
                                                                        style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: '#e2e8f0', fontSize: '.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <i className="fas fa-edit"></i>
                                                                    </button>
                                                                    <button title="Delete" onClick={() => setDelAssmt(a)}
                                                                        style={{ background: 'rgba(239,68,68,.25)', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: '#fca5a5', fontSize: '.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <i className="fas fa-trash-alt"></i>
                                                                    </button>
                                                                </div>
                                                            </th>
                                                        ))}
                                                        <th style={{ ...th, background: '#4f46e5', color: '#c7d2fe', textAlign: 'center', borderBottom: '2px solid #3730a3', minWidth: 80 }}>Average</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filtered.length === 0 ? (
                                                        <tr><td colSpan={999} style={{ ...cell, textAlign: 'center', padding: '32px', color: '#94a3b8' }}>No students match your search.</td></tr>
                                                    ) : filtered.map(student => {
                                                        const attempted = Object.values(student.scores).filter(v => v !== null);
                                                        const avg       = attempted.length > 0 ? Math.round(attempted.reduce((a, b) => a + b, 0) / attempted.length * 10) / 10 : null;
                                                        const avgColor  = avg === null ? '#94a3b8' : avg >= 70 ? '#15803d' : avg >= 50 ? '#b45309' : '#b91c1c';
                                                        const avgBg     = avg === null ? 'transparent' : avg >= 70 ? '#f0fdf4' : avg >= 50 ? '#fffbeb' : '#fee2e2';
                                                        return (
                                                            <tr key={student.user_id}>
                                                                <td style={{ ...cell, minWidth: 180 }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6366f11a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: '#6366f1', flexShrink: 0 }}>
                                                                            {student.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '.82rem' }}>{student.name}</div>
                                                                            <div style={{ color: '#94a3b8', fontSize: '.68rem' }}>{student.email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                {data.assessments.map(a => (
                                                                    <ScoreCell
                                                                        key={a.id}
                                                                        value={student.scores[a.id]}
                                                                        maxScore={parseFloat(a.max_score)}
                                                                        onSave={score => saveScore(a.id, student.user_id, score)}
                                                                        onClear={() => clearScore(a.id, student.user_id)}
                                                                    />
                                                                ))}
                                                                <td style={{ ...cell, textAlign: 'center', background: avgBg, fontWeight: 700, color: avgColor }}>
                                                                    {avg !== null ? `${avg}` : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}

                                                    {/* Class average row */}
                                                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                                        <td style={{ ...cell, fontWeight: 700, color: '#475569', fontSize: '.78rem' }}>
                                                            <i className="fas fa-chart-bar" style={{ marginRight: 6, color: '#6366f1' }}></i>Class Average
                                                        </td>
                                                        {data.assessments.map(a => {
                                                            const vals = filtered.map(s => s.scores[a.id]).filter(v => v !== null);
                                                            const avg  = vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length * 10) / 10 : null;
                                                            const fg   = avg === null ? '#94a3b8' : avg >= 70 ? '#15803d' : avg >= 50 ? '#b45309' : '#b91c1c';
                                                            return (
                                                                <td key={a.id} style={{ ...cell, textAlign: 'center', background: '#f0f4ff', fontWeight: 700, color: fg }}>
                                                                    {avg !== null ? avg : '—'}
                                                                </td>
                                                            );
                                                        })}
                                                        <td style={{ ...cell, textAlign: 'center', background: '#eef2ff', fontWeight: 700, color: '#4f46e5' }}>
                                                            {data.overall_avg !== null ? data.overall_avg : '—'}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.72rem', color: '#64748b' }}>
                                        {[['#f0fdf4','#15803d','≥70% Good'],['#fffbeb','#b45309','50–69% Average'],['#fee2e2','#b91c1c','<50% Below Average'],['transparent','#cbd5e1','— Not entered']].map(([bg,fg,label]) => (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: '1px solid #e2e8f0', flexShrink: 0 }}></span>
                                                <span style={{ color: fg, fontWeight: 600 }}>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {addModal && <AssessmentModal onSave={saveAssessment} onClose={() => setAddModal(false)} />}
            {editAssmt && <AssessmentModal initial={editAssmt} onSave={saveAssessment} onClose={() => setEditAssmt(null)} />}
            {delAssmt && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,31,78,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDelAssmt(null)}>
                    <div style={{ background: '#fff', borderRadius: 16, maxWidth: 400, width: '100%', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '18px 22px' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', fontWeight: 700 }}><i className="fas fa-trash-alt" style={{ marginRight: 8 }}></i>Delete Assessment</h3>
                        </div>
                        <div style={{ padding: '20px 24px' }}>
                            <p style={{ color: '#374151', marginBottom: 8 }}>Delete <strong>{delAssmt.name}</strong>?</p>
                            <p style={{ color: '#9ca3af', fontSize: '.85rem' }}>All student scores for this assessment will be permanently removed.</p>
                        </div>
                        <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button onClick={() => setDelAssmt(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.85rem' }}>Cancel</button>
                            <button onClick={() => deleteAssessment(delAssmt)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.85rem' }}>
                                <i className="fas fa-trash-alt" style={{ marginRight: 6 }}></i>Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
