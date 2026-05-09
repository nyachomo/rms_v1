import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar  from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';

function getEmbedUrl(url) {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
    const vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
    return url;
}

const TYPE_COLOR = { text: '#3b82f6', video: '#a855f7', mixed: '#14b8a6' };
const TYPE_ICON  = { text: 'fas fa-file-alt', video: 'fas fa-play-circle', mixed: 'fas fa-layer-group' };
const TYPE_LABEL = { text: 'Reading', video: 'Video', mixed: 'Mixed' };

const MAX_VIOLATIONS = 3;

/* ── Exam Modal ── */
function ExamModal({ lesson, token, onPassed, onClose }) {
    const [examData,    setExamData]    = useState(null);
    const [loading,     setLoading]     = useState(true);
    const [started,     setStarted]     = useState(false);  // pre-exam → questions
    const [answers,     setAnswers]     = useState({});
    const [submitting,  setSubmitting]  = useState(false);
    const [result,      setResult]      = useState(null);
    const [timeLeft,    setTimeLeft]    = useState(null);
    const [timedOut,    setTimedOut]    = useState(false);
    // Anti-cheat
    const [violations,         setViolations]         = useState(0);
    const [violationAlert,     setViolationAlert]     = useState(null); // { count, final }
    const [finalCountdown,     setFinalCountdown]     = useState(null); // seconds before force-submit
    const submitRef       = useRef(null);
    const violationsRef   = useRef(0);
    const resultRef       = useRef(false);
    const startedRef      = useRef(false);
    const lastViolationTs = useRef(0);

    useEffect(() => { submitRef.current  = answers;          }, [answers]);
    useEffect(() => { resultRef.current  = !!result;         }, [result]);
    useEffect(() => { startedRef.current = started;          }, [started]);

    useEffect(() => {
        fetch(`/api/learning/lessons/${lesson.id}/exam`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(d => {
                setExamData(d);
                if (d.time_limit_minutes) setTimeLeft(d.time_limit_minutes * 60);
            })
            .finally(() => setLoading(false));
    }, [lesson.id]);

    /* ── Anti-cheat event listeners ── */
    useEffect(() => {
        if (!started || result) return;

        const recordViolation = (reason) => {
            if (resultRef.current || !startedRef.current) return;
            // debounce: ignore if another violation fired within 2 s
            const now = Date.now();
            if (now - lastViolationTs.current < 2000) return;
            lastViolationTs.current = now;

            violationsRef.current += 1;
            const count = violationsRef.current;
            setViolations(count);

            if (count >= MAX_VIOLATIONS) {
                setViolationAlert({ count, final: true, reason });
                setFinalCountdown(8);
            } else {
                setViolationAlert({ count, final: false, reason });
            }
        };

        const onVisibility = () => {
            if (document.hidden) recordViolation('tab switch');
        };
        const onBlur = () => recordViolation('window focus lost');
        const onFullscreenChange = () => {
            if (!document.fullscreenElement) recordViolation('fullscreen exited');
        };
        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = 'Your exam is in progress. Leaving will submit your current answers.';
        };
        const onKeyDown = (e) => {
            // Block common shortcuts that open new tabs/windows or dev-tools
            const blocked =
                (e.ctrlKey && (e.key === 't' || e.key === 'T' ||   // new tab
                               e.key === 'n' || e.key === 'N' ||   // new window
                               e.key === 'w' || e.key === 'W')) || // close tab
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && ['I','i','J','j','C','c'].includes(e.key));
            if (blocked) { e.preventDefault(); e.stopPropagation(); }
        };
        const onContextMenu = (e) => e.preventDefault();

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('blur', onBlur);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        window.addEventListener('beforeunload', onBeforeUnload);
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('contextmenu', onContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            window.removeEventListener('beforeunload', onBeforeUnload);
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('contextmenu', onContextMenu);
            // Exit fullscreen when exam ends/closes
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        };
    }, [started, result]);

    /* ── Final-violation countdown ── */
    useEffect(() => {
        if (finalCountdown === null) return;
        if (finalCountdown <= 0) { submit(true); return; }
        const id = setTimeout(() => setFinalCountdown(c => c - 1), 1000);
        return () => clearTimeout(id);
    }, [finalCountdown]);

    /* ── Begin exam: request fullscreen ── */
    const beginExam = () => {
        setStarted(true);
        document.documentElement.requestFullscreen().catch(() => {});
    };

    const submit = async (isAutoSubmit = false) => {
        if (submitting) return;
        setSubmitting(true);
        if (isAutoSubmit) setTimedOut(true);
        setViolationAlert(null);
        setFinalCountdown(null);
        // Exit fullscreen
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        try {
            const currentAnswers = submitRef.current ?? {};
            const res  = await fetch(`/api/learning/lessons/${lesson.id}/exam/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ answers: currentAnswers }),
            });
            const data = await res.json();
            setResult(data);
            setTimeLeft(null);
            if (data.passed) onPassed();
        } finally { setSubmitting(false); }
    };

    // Countdown timer
    useEffect(() => {
        if (timeLeft === null || result || !started) return;
        if (timeLeft <= 0) { submit(true); return; }
        const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(id);
    }, [timeLeft, result, started]);

    const allAnswered = examData?.questions?.length > 0 &&
        examData.questions.every(q => answers[q.id] != null);

    const fmtTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };
    const timerCritical = timeLeft !== null && timeLeft <= 60;

    /* ── Violation warning overlay ── */
    const ViolationOverlay = () => {
        if (!violationAlert) return null;
        const isFinal = violationAlert.final;
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ background: '#fff', borderRadius: 20, maxWidth: 460, width: '100%', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.5)' }}>
                    <div style={{ background: isFinal ? 'linear-gradient(135deg,#7f1d1d,#dc2626)' : 'linear-gradient(135deg,#78350f,#d97706)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#fff', flexShrink: 0 }}>
                            <i className={`fas ${isFinal ? 'fa-ban' : 'fa-exclamation-triangle'}`}></i>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '.65rem', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                                {isFinal ? 'Exam Terminated' : `Violation ${violationAlert.count} of ${MAX_VIOLATIONS}`}
                            </p>
                            <h3 style={{ margin: 0, color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '1rem', fontWeight: 800 }}>
                                {isFinal ? 'Maximum violations reached' : 'Suspicious activity detected'}
                            </h3>
                        </div>
                    </div>
                    <div style={{ padding: '22px 24px' }}>
                        <p style={{ margin: '0 0 14px', color: '#374151', fontSize: '.9rem', lineHeight: 1.6 }}>
                            {isFinal
                                ? `You have left the exam environment ${MAX_VIOLATIONS} times. Your exam is being auto-submitted now.`
                                : `You left the exam window (${violationAlert.reason}). This has been recorded. After ${MAX_VIOLATIONS} violations your exam will be auto-submitted.`}
                        </p>

                        {isFinal ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 16px' }}>
                                <i className="fas fa-hourglass-half" style={{ color: '#dc2626', fontSize: '1.1rem' }}></i>
                                <span style={{ fontSize: '.88rem', color: '#991b1b', fontWeight: 700 }}>
                                    Submitting in {finalCountdown} second{finalCountdown !== 1 ? 's' : ''}…
                                </span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '8px 12px' }}>
                                    <i className="fas fa-shield-alt" style={{ color: '#d97706', fontSize: '.85rem' }}></i>
                                    <span style={{ fontSize: '.78rem', color: '#92400e' }}>
                                        Remaining warnings: <strong>{MAX_VIOLATIONS - violationAlert.count}</strong> — stay on this page to avoid auto-submission.
                                    </span>
                                </div>
                                <button
                                    onClick={() => setViolationAlert(null)}
                                    style={{ padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <i className="fas fa-arrow-left"></i> Return to Exam
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
        <ViolationOverlay />
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,31,78,.65)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget && !started && !result) onClose(); }}>
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.35)' }}>

                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#081f4e,#1a3a7a)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(254,115,12,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fe730c', fontSize: '.95rem' }}>
                            <i className="fas fa-clipboard-list"></i>
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '.65rem', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Lesson Exam</p>
                            <h3 style={{ margin: 0, color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', fontWeight: 700 }}>{lesson.title}</h3>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Countdown timer */}
                        {timeLeft !== null && !result && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: timerCritical ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.12)', border: `1.5px solid ${timerCritical ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.2)'}`, borderRadius: 10, padding: '5px 12px', minWidth: 90 }}>
                                <i className={`fas fa-clock ${timerCritical ? 'fa-beat' : ''}`} style={{ color: timerCritical ? '#fca5a5' : '#fed7aa', fontSize: '.85rem' }}></i>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem', color: timerCritical ? '#fca5a5' : '#fff', letterSpacing: '.05em' }}>{fmtTime(timeLeft)}</span>
                            </div>
                        )}
                        {!result && (
                            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem', marginBottom: 10, display: 'block', color: '#fe730c' }}></i>
                            Loading exam…
                        </div>
                    ) : result ? (
                        /* ── Results view ── */
                        <div>
                            {/* Time's up banner */}
                            {timedOut && (
                                <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <i className="fas fa-hourglass-end" style={{ color: '#ea580c' }}></i>
                                    <span style={{ fontSize: '.82rem', color: '#7c2d12', fontWeight: 600 }}>Time's up! Your answers were submitted automatically.</span>
                                </div>
                            )}
                            {/* Score card */}
                            <div style={{ textAlign: 'center', padding: '24px 16px', background: result.passed ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#fff5f5,#fee2e2)', borderRadius: 14, border: `2px solid ${result.passed ? '#86efac' : '#fca5a5'}`, marginBottom: 22 }}>
                                <div style={{ fontSize: '3rem', marginBottom: 8 }}>{result.passed ? '🎉' : '😔'}</div>
                                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: result.passed ? '#16a34a' : '#dc2626', fontFamily: 'Poppins,sans-serif', lineHeight: 1 }}>{result.score}%</div>
                                <div style={{ fontSize: '.85rem', color: result.passed ? '#15803d' : '#b91c1c', fontWeight: 600, marginTop: 6 }}>
                                    {result.passed ? 'You passed! Lesson marked complete.' : `Not passed. Pass mark is ${result.pass_mark}%.`}
                                </div>
                                <div style={{ fontSize: '.78rem', color: '#6b7280', marginTop: 4 }}>
                                    {result.correct}/{result.total} correct · Attempt #{result.attempts_count}
                                </div>
                            </div>

                            {/* Per-question breakdown — only shown on pass */}
                            {result.passed ? (
                                <>
                                    <p style={{ fontWeight: 700, color: '#374151', fontSize: '.83rem', marginBottom: 10 }}>Answer Review</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {result.results.map((r, i) => (
                                            <div key={r.question_id} style={{ background: r.is_correct ? '#f0fdf4' : '#fff5f5', border: `1.5px solid ${r.is_correct ? '#bbf7d0' : '#fca5a5'}`, borderRadius: 10, padding: '12px 14px' }}>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                                                    <i className={`fas fa-${r.is_correct ? 'check-circle' : 'times-circle'}`} style={{ color: r.is_correct ? '#16a34a' : '#dc2626', marginTop: 3, flexShrink: 0 }}></i>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flex: 1 }}>
                                                        <span style={{ fontSize: '.8rem', fontWeight: 800, color: '#64748b', flexShrink: 0, marginTop: 2 }}>Q{i + 1}.</span>
                                                        <div className="exam-q-render" dangerouslySetInnerHTML={{ __html: r.question }} style={{ flex: 1, fontSize: '.85rem', fontWeight: 600, color: '#374151', lineHeight: 1.5 }} />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 22 }}>
                                                    {r.options?.map(opt => {
                                                        const isSelected = opt.id === r.selected_option_id;
                                                        const isCorrect  = opt.id === r.correct_option_id;
                                                        let bg = '#f1f5f9', color = '#6b7280', border = '#e2e8f0';
                                                        if (isCorrect) { bg = '#dcfce7'; color = '#16a34a'; border = '#86efac'; }
                                                        else if (isSelected && !isCorrect) { bg = '#fee2e2'; color = '#dc2626'; border = '#fca5a5'; }
                                                        return (
                                                            <span key={opt.id} style={{ padding: '3px 10px', borderRadius: 50, fontSize: '.72rem', fontWeight: 600, background: bg, color, border: `1.5px solid ${border}` }}>
                                                                {isCorrect && <i className="fas fa-check" style={{ marginRight: 4, fontSize: '.6rem' }}></i>}
                                                                {isSelected && !isCorrect && <i className="fas fa-times" style={{ marginRight: 4, fontSize: '.6rem' }}></i>}
                                                                {opt.option_text}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <i className="fas fa-lock" style={{ color: '#d97706', fontSize: '1.1rem', marginTop: 2, flexShrink: 0 }}></i>
                                    <div>
                                        <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#92400e', fontSize: '.85rem' }}>Answer review is not available</p>
                                        <p style={{ margin: 0, color: '#92400e', fontSize: '.8rem' }}>Correct answers are only shown after you pass. Review the lesson material and try again.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : !started ? (
                        /* ── Pre-exam start screen ── */
                        <div style={{ padding: '8px 0' }}>
                            {/* Exam summary card */}
                            <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border: '1.5px solid #bae6fd', borderRadius: 14, padding: '20px 22px', marginBottom: 18 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#0284c7,#0369a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '.9rem', flexShrink: 0 }}>
                                        <i className="fas fa-clipboard-check"></i>
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '.68rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Exam Summary</p>
                                        <h4 style={{ margin: 0, color: '#0c4a6e', fontFamily: 'Poppins,sans-serif', fontSize: '.92rem', fontWeight: 800 }}>{lesson.title}</h4>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                                    {[
                                        { icon: 'fa-question-circle', color: '#6366f1', label: 'Questions', value: examData?.questions?.length ?? '—' },
                                        { icon: 'fa-bullseye',        color: '#16a34a', label: 'Pass Mark',  value: examData?.pass_mark ? `${examData.pass_mark}%` : '—' },
                                        { icon: 'fa-clock',           color: '#7c3aed', label: 'Time Limit', value: examData?.time_limit_minutes ? `${examData.time_limit_minutes} min` : 'Unlimited' },
                                    ].map(({ icon, color, label, value }) => (
                                        <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', textAlign: 'center', border: '1px solid #e0f2fe' }}>
                                            <i className={`fas ${icon}`} style={{ color, fontSize: '1.1rem', display: 'block', marginBottom: 4 }}></i>
                                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '.95rem', fontFamily: 'Poppins,sans-serif' }}>{value}</div>
                                            <div style={{ fontSize: '.7rem', color: '#94a3b8', marginTop: 2 }}>{label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Anti-cheat notice */}
                            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                                    <i className="fas fa-shield-alt" style={{ color: '#dc2626', fontSize: '1rem', marginTop: 2, flexShrink: 0 }}></i>
                                    <div>
                                        <p style={{ margin: '0 0 4px', fontWeight: 800, color: '#7f1d1d', fontSize: '.88rem', fontFamily: 'Poppins,sans-serif' }}>Exam Integrity Rules</p>
                                        <p style={{ margin: 0, fontSize: '.8rem', color: '#991b1b', lineHeight: 1.6 }}>
                                            This exam is monitored. The following actions will be recorded as violations:
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingLeft: 28 }}>
                                    {[
                                        'Switching to another browser tab or window',
                                        'Minimising or leaving the browser window',
                                        'Exiting fullscreen mode during the exam',
                                    ].map(rule => (
                                        <div key={rule} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '.8rem', color: '#7f1d1d' }}>
                                            <i className="fas fa-times-circle" style={{ color: '#dc2626', flexShrink: 0, fontSize: '.75rem' }}></i>
                                            {rule}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 12, paddingLeft: 28, background: '#fff5f5', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <i className="fas fa-exclamation-circle" style={{ color: '#b91c1c', flexShrink: 0 }}></i>
                                    <span style={{ fontSize: '.78rem', color: '#7f1d1d', fontWeight: 700 }}>
                                        After <strong>{MAX_VIOLATIONS} violations</strong> your exam will be auto-submitted immediately.
                                    </span>
                                </div>
                            </div>

                            {/* Fullscreen notice */}
                            <div style={{ background: '#f5f3ff', border: '1.5px solid #c4b5fd', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                                <i className="fas fa-expand" style={{ color: '#7c3aed', flexShrink: 0 }}></i>
                                <span style={{ fontSize: '.8rem', color: '#4c1d95' }}>
                                    Clicking <strong>"Begin Exam"</strong> will enter fullscreen mode. Do not exit fullscreen until you have submitted your answers.
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* ── Questions view ── */
                        <div>
                            {/* Critical time warning */}
                            {timerCritical && (
                                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626' }}></i>
                                    <span style={{ fontSize: '.82rem', color: '#991b1b', fontWeight: 600 }}>
                                        Less than 1 minute remaining! Your exam will be submitted automatically when time runs out.
                                    </span>
                                </div>
                            )}
                            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <i className="fas fa-info-circle" style={{ color: '#d97706' }}></i>
                                <span style={{ fontSize: '.8rem', color: '#92400e' }}>
                                    Pass mark is <strong>{examData?.pass_mark}%</strong>
                                    {examData?.time_limit_minutes && <> · Time limit: <strong>{examData.time_limit_minutes} minutes</strong></>}
                                    {'. Answer all questions, then click Submit.'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {examData?.questions?.map((q, qi) => (
                                    <div key={q.id} style={{ background: '#f8fafc', border: `1.5px solid ${answers[q.id] ? '#c7d2fe' : '#e2e8f0'}`, borderRadius: 12, padding: '14px 16px', transition: 'border-color .2s' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: '#e0e7ff', color: '#4f46e5', fontSize: '.7rem', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{qi + 1}</span>
                                            <div className="exam-q-render" dangerouslySetInnerHTML={{ __html: q.question }} style={{ flex: 1, fontWeight: 600, color: '#1e1b4b', fontSize: '.87rem', lineHeight: 1.5 }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {q.options?.map(opt => {
                                                const selected = answers[q.id] === opt.id;
                                                return (
                                                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', borderRadius: 9, border: `1.5px solid ${selected ? '#818cf8' : '#e2e8f0'}`, background: selected ? '#eef2ff' : '#fff', cursor: 'pointer', transition: 'all .15s' }}>
                                                        <input type="radio" name={`q_${q.id}`} checked={selected}
                                                            onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                                            style={{ accentColor: '#6366f1', width: 16, height: 16, flexShrink: 0 }} />
                                                        <span style={{ fontSize: '.85rem', color: selected ? '#3730a3' : '#374151', fontWeight: selected ? 600 : 400 }}>{opt.option_text}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#fafbfc', display: 'flex', gap: 10, justifyContent: result ? 'center' : 'flex-end', flexShrink: 0 }}>
                    {result ? (
                        result.passed ? (
                            <button onClick={onClose}
                                style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fas fa-arrow-right"></i> Continue to Next Lesson
                            </button>
                        ) : (
                            <button onClick={() => {
                                setResult(null); setAnswers({}); setTimedOut(false);
                                setStarted(false); setViolations(0); violationsRef.current = 0;
                                setViolationAlert(null); setFinalCountdown(null);
                                if (examData?.time_limit_minutes) setTimeLeft(examData.time_limit_minutes * 60);
                            }}
                                style={{ padding: '10px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="fas fa-redo"></i> Try Again
                            </button>
                        )
                    ) : !started ? (
                        <>
                            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.86rem' }}>Cancel</button>
                            <button onClick={beginExam}
                                style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#081f4e,#1a3a7a)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.86rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(8,31,78,.35)' }}>
                                <i className="fas fa-expand"></i> Begin Exam (Enter Fullscreen)
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => submit(false)} disabled={submitting || !allAnswered}
                                style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: allAnswered ? 'linear-gradient(135deg,#fe730c,#f97316)' : '#e2e8f0', color: allAnswered ? '#fff' : '#9ca3af', cursor: submitting || !allAnswered ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.86rem', display: 'flex', alignItems: 'center', gap: 7, boxShadow: allAnswered ? '0 4px 14px rgba(254,115,12,.3)' : 'none' }}>
                                {submitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting…</> : <><i className="fas fa-paper-plane"></i> Submit Exam</>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
        </>
    );
}

/* ═══════════════ MAIN PAGE ═══════════════ */
export default function CourseLearner() {
    const { courseSlug } = useParams();
    const { user, token, can } = useAuth();
    const navigate = useNavigate();

    const [data, setData]             = useState(null);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState('');
    const [activeId, setActiveId]     = useState(null);
    const [completing, setCompleting] = useState(false);
    const [lessonPanelOpen, setLessonPanel] = useState(true);
    const [expandedMods, setExpandedMods]   = useState({});
    const [examOpen, setExamOpen]     = useState(false);
    const contentRef = useRef(null);

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetch(`/api/learning/courses/${courseSlug}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(async r => {
                if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? 'Access denied'); }
                return r.json();
            })
            .then(d => {
                setData(d);
                const allL = d.modules?.flatMap(m => m.lessons) ?? [];
                const first = allL.find(l => !l.completed) ?? allL[0];
                if (first) setActiveId(first.id);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [token, courseSlug]);

    if (!can('learning', 'view')) {
        return (
            <div className="db-wrap">
                <DashboardSidebar />
                <div className="db-main">
                    <DashboardNavbar page="My Learning" />
                    <div className="db-content"><AccessDenied /></div>
                </div>
            </div>
        );
    }

    const allLessons     = data?.modules?.flatMap(m => m.lessons) ?? [];
    const lesson         = allLessons.find(l => l.id === activeId);
    const completedCount = allLessons.filter(l => l.completed).length;
    const totalCount     = allLessons.length;
    const progressPct    = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const currentIndex   = allLessons.findIndex(l => l.id === activeId);
    const prevLesson     = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
    const nextLesson     = currentIndex < totalCount - 1 ? allLessons[currentIndex + 1] : null;

    // Update lesson completion state inside modules (fixes state sync)
    const updateLessonInData = (lessonId, updates) => {
        setData(prev => ({
            ...prev,
            modules: prev.modules.map(m => ({
                ...m,
                lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l),
            })),
        }));
    };

    // Called when student passes exam — lesson was auto-marked complete by backend
    const handleExamPassed = () => {
        updateLessonInData(lesson.id, { completed: true, exam_passed: true });
    };

    const toggleComplete = async (andNext = false) => {
        if (!lesson) return;
        // For lessons with exams that aren't passed yet, open the exam instead
        if (lesson.has_exam && !lesson.exam_passed && !lesson.completed) {
            setExamOpen(true);
            return;
        }
        setCompleting(true);
        const method = lesson.completed ? 'DELETE' : 'POST';
        try {
            await fetch(`/api/learning/lessons/${lesson.id}/complete`, {
                method, headers: { Authorization: `Bearer ${token}` },
            });
            updateLessonInData(lesson.id, { completed: !lesson.completed });
            if (andNext && nextLesson) goTo(nextLesson.id);
        } finally { setCompleting(false); }
    };

    const goTo = id => {
        setActiveId(id);
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const courseTitle = data?.course?.title ?? 'Course';

    if (loading) return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#fe730c' }}></i>
                <p style={{ color: '#9ca3af', fontFamily: 'Poppins,sans-serif', fontSize: '.9rem' }}>Loading course…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 24, textAlign: 'center' }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(254,115,12,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-lock" style={{ fontSize: '2rem', color: '#fe730c' }}></i>
                </div>
                <h2 style={{ color: '#081f4e', fontFamily: 'Poppins,sans-serif', margin: 0, fontSize: '1.3rem' }}>{error}</h2>
                <p style={{ color: '#6b7280', margin: 0, fontSize: '.9rem' }}>You need an approved enrollment to access this course.</p>
                <Link to="/dashboard/learning" style={{ background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', borderRadius: 10, padding: '11px 24px', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700, marginTop: 8 }}>
                    <i className="fas fa-arrow-left" style={{ marginRight: 8 }}></i>My Courses
                </Link>
            </div>
        </div>
    );

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main" style={{ height: '100vh', overflow: 'hidden' }}>
                <DashboardNavbar page={courseTitle} />

                {/* ── Course progress bar ── */}
                <div style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, height: 52, borderBottom: '1.5px solid #e8ecf4' }}>
                    {/* Toggle sidebar */}
                    <button onClick={() => setLessonPanel(s => !s)} title={lessonPanelOpen ? 'Hide lessons' : 'Show lessons'}
                        style={{ width: 34, height: 34, borderRadius: 9, cursor: 'pointer', fontSize: '.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', background: lessonPanelOpen ? 'rgba(254,115,12,.1)' : '#f1f5f9', border: `1.5px solid ${lessonPanelOpen ? 'rgba(254,115,12,.4)' : '#e2e8f0'}`, color: lessonPanelOpen ? '#fe730c' : '#64748b' }}>
                        <i className="fas fa-bars-staggered"></i>
                    </button>
                    {/* Progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <span style={{ fontSize: '.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                            {completedCount} / {totalCount} lessons
                        </span>
                        <div style={{ flex: 1, height: 7, background: '#f1f5f9', borderRadius: 50, overflow: 'hidden', maxWidth: 260 }}>
                            <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 50, transition: 'width .6s ease', background: progressPct === 100 ? 'linear-gradient(90deg,#16a34a,#22c55e)' : 'linear-gradient(90deg,#fe730c,#fb923c)' }}></div>
                        </div>
                        <span style={{ fontSize: '.78rem', fontWeight: 800, color: progressPct === 100 ? '#16a34a' : '#fe730c', minWidth: 36 }}>{progressPct}%</span>
                        {progressPct === 100 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 10px', fontSize: '.65rem', fontWeight: 700, color: '#16a34a' }}>
                                <i className="fas fa-trophy"></i> Complete!
                            </span>
                        )}
                    </div>
                    {/* Lesson counter */}
                    {lesson && (
                        <span style={{ fontSize: '.72rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Lesson {currentIndex + 1} of {totalCount}
                        </span>
                    )}
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                    {/* ── Lesson list panel ── */}
                    <div style={{ width: lessonPanelOpen ? 308 : 0, flexShrink: 0, background: '#fff', display: 'flex', flexDirection: 'column', transition: 'width .28s cubic-bezier(.4,0,.2,1)', overflow: 'hidden', borderRight: '1.5px solid #e8ecf4' }}>

                        {/* Panel header */}
                        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #e8ecf4', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#fe730c,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <i className="fas fa-list-ul" style={{ color: '#fff', fontSize: '.65rem' }}></i>
                                </div>
                                <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#1e293b', letterSpacing: '.02em', textTransform: 'uppercase' }}>Course Content</span>
                            </div>
                            {/* Progress ring area */}
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e8ecf4' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                                    <div style={{ flex: 1, height: 5, background: '#e8ecf4', borderRadius: 50, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? 'linear-gradient(90deg,#16a34a,#22c55e)' : 'linear-gradient(90deg,#fe730c,#fb923c)', borderRadius: 50, transition: 'width .6s ease' }}></div>
                                    </div>
                                    <span style={{ fontSize: '.72rem', fontWeight: 800, color: progressPct === 100 ? '#16a34a' : '#fe730c', minWidth: 32, textAlign: 'right' }}>{progressPct}%</span>
                                </div>
                                <div style={{ display: 'flex', gap: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }}></div>
                                        <span style={{ fontSize: '.68rem', color: '#64748b' }}><strong style={{ color: '#16a34a' }}>{completedCount}</strong> done</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#cbd5e1' }}></div>
                                        <span style={{ fontSize: '.68rem', color: '#64748b' }}><strong style={{ color: '#475569' }}>{totalCount - completedCount}</strong> left</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Module list */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 20px' }}>
                            {data?.modules?.map((mod, mi) => {
                                const modOpen      = expandedMods[mod.id] === true;
                                const modCompleted = mod.lessons.filter(l => l.completed).length;
                                const modTotal     = mod.lessons.length;
                                const modPct       = modTotal > 0 ? Math.round((modCompleted / modTotal) * 100) : 0;
                                const hasActive    = mod.lessons.some(l => l.id === activeId);
                                const modDone      = modCompleted === modTotal && modTotal > 0;
                                const accentColor  = hasActive ? '#fe730c' : modDone ? '#16a34a' : '#6366f1';
                                const cardShadow   = hasActive ? '0 4px 16px rgba(254,115,12,.13)' : modDone ? '0 4px 16px rgba(22,163,74,.1)' : '0 2px 10px rgba(8,31,78,.07)';
                                return (
                                    <div key={mod.id} style={{ marginBottom: 12, borderRadius: 14, background: '#fff', boxShadow: cardShadow, overflow: 'hidden', border: '1.5px solid #eef2f8', position: 'relative' }}>
                                        {/* Left accent bar */}
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: hasActive ? 'linear-gradient(180deg,#fe730c,#fb923c)' : modDone ? 'linear-gradient(180deg,#16a34a,#22c55e)' : 'linear-gradient(180deg,#c7d2fe,#a5b4fc)', borderRadius: '14px 0 0 14px' }}></div>
                                        {/* Module header */}
                                        <button onClick={() => setExpandedMods(e => ({ ...e, [mod.id]: !modOpen }))}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px 13px 18px', background: 'transparent', border: 'none', borderBottom: modOpen ? '1.5px solid #f1f5f9' : 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Poppins,sans-serif', transition: 'background .18s', position: 'relative', overflow: 'hidden' }}>
                                            {/* Decorative blob */}
                                            <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: hasActive ? 'rgba(254,115,12,.08)' : modDone ? 'rgba(22,163,74,.07)' : 'rgba(99,102,241,.06)', pointerEvents: 'none' }}></div>
                                            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 800, background: hasActive ? 'linear-gradient(135deg,#fe730c,#fb923c)' : modDone ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff', boxShadow: `0 3px 10px ${hasActive ? 'rgba(254,115,12,.35)' : modDone ? 'rgba(22,163,74,.3)' : 'rgba(99,102,241,.3)'}` }}>
                                                {modDone ? <i className="fas fa-check" style={{ fontSize: '.68rem' }}></i> : mi + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                                                <div style={{ fontSize: '.83rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{mod.title}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 50, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${modPct}%`, background: modDone ? 'linear-gradient(90deg,#16a34a,#22c55e)' : hasActive ? 'linear-gradient(90deg,#fe730c,#fb923c)' : 'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius: 50, transition: 'width .4s' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '.62rem', color: accentColor, fontWeight: 700, flexShrink: 0 }}>{modPct}%</span>
                                                </div>
                                                <div style={{ fontSize: '.62rem', color: '#94a3b8', marginTop: 3 }}>{modCompleted}/{modTotal} lessons</div>
                                            </div>
                                            <div style={{ width: 24, height: 24, borderRadius: 7, background: '#f8fafc', border: '1px solid #e8ecf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                                                <i className={`fas fa-chevron-${modOpen ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: '.5rem' }}></i>
                                            </div>
                                        </button>

                                        {/* Lessons inside card */}
                                        {modOpen && (
                                            <div style={{ padding: '6px 8px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                {mod.lessons.map((l, li) => {
                                                    const isActive     = l.id === activeId;
                                                    const tColor       = TYPE_COLOR[l.type] ?? '#6b7280';
                                                    const examPassed   = l.exam_passed;
                                                    const hasExamPending = l.has_exam && !l.completed && !examPassed;
                                                    return (
                                                        <button key={l.id} onClick={() => goTo(l.id)} style={{
                                                            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                                                            padding: '9px 10px', borderRadius: 9,
                                                            cursor: 'pointer', textAlign: 'left',
                                                            transition: 'all .15s', fontFamily: 'Poppins,sans-serif',
                                                            background: isActive ? 'linear-gradient(135deg,rgba(254,115,12,.12),rgba(251,146,60,.05))' : l.completed ? '#f0fdf4' : '#fafafa',
                                                            border: `1.5px solid ${isActive ? 'rgba(254,115,12,.35)' : l.completed ? '#d1fae5' : '#f1f5f9'}`,
                                                        }}>
                                                            <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 800, transition: 'all .15s', background: l.completed ? '#dcfce7' : isActive ? 'rgba(254,115,12,.15)' : '#f1f5f9', color: l.completed ? '#16a34a' : isActive ? '#fe730c' : '#94a3b8' }}>
                                                                {l.completed ? <i className="fas fa-check" style={{ fontSize: '.52rem' }}></i> : li + 1}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '.79rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#fe730c' : l.completed ? '#94a3b8' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.6rem', color: tColor, background: `${tColor}18`, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                                                        <i className={TYPE_ICON[l.type]} style={{ fontSize: '.5rem' }}></i> {TYPE_LABEL[l.type]}
                                                                    </span>
                                                                    {l.duration_minutes > 0 && <span style={{ fontSize: '.58rem', color: '#94a3b8' }}>{l.duration_minutes}m</span>}
                                                                    {hasExamPending && <span style={{ fontSize: '.56rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: 2 }}><i className="fas fa-clipboard-list"></i> Exam</span>}
                                                                    {examPassed && <span style={{ fontSize: '.56rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 2 }}><i className="fas fa-medal"></i> Passed</span>}
                                                                </div>
                                                            </div>
                                                            {isActive && <div style={{ width: 3, height: 26, background: 'linear-gradient(180deg,#fe730c,#fb923c)', borderRadius: 50, flexShrink: 0 }}></div>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Main lesson content ── */}
                    <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
                        {lesson ? (
                            <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 32px 52px' }}>

                                {/* Lesson header card */}
                                <div style={{ background: '#fff', borderRadius: 18, padding: '22px 26px', marginBottom: 24, position: 'relative', overflow: 'hidden', border: '1.5px solid #eef2f8', boxShadow: '0 4px 20px rgba(8,31,78,.08)' }}>
                                    <div style={{ position: 'absolute', top: -30, right: -20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(254,115,12,.09)', pointerEvents: 'none' }}></div>
                                    <div style={{ position: 'absolute', bottom: -30, right: 80, width: 100, height: 100, borderRadius: '50%', background: 'rgba(254,115,12,.05)', pointerEvents: 'none' }}></div>
                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        {/* Meta row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f1f5f9', color: '#64748b', fontSize: '.67rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                                                Lesson {currentIndex + 1} of {totalCount}
                                            </span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${TYPE_COLOR[lesson.type]}25`, color: TYPE_COLOR[lesson.type], border: `1px solid ${TYPE_COLOR[lesson.type]}40`, fontSize: '.67rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                                                <i className={TYPE_ICON[lesson.type]} style={{ fontSize: '.6rem' }}></i> {TYPE_LABEL[lesson.type]}
                                            </span>
                                            {lesson.duration_minutes > 0 && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#64748b', fontSize: '.67rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                                                    <i className="fas fa-clock" style={{ fontSize: '.55rem' }}></i> {lesson.duration_minutes} min
                                                </span>
                                            )}
                                            {lesson.has_exam && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: lesson.exam_passed ? 'rgba(22,163,74,.2)' : 'rgba(251,191,36,.15)', color: lesson.exam_passed ? '#4ade80' : '#fbbf24', border: `1px solid ${lesson.exam_passed ? 'rgba(34,197,94,.3)' : 'rgba(251,191,36,.3)'}`, fontSize: '.67rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                                                    <i className={`fas fa-${lesson.exam_passed ? 'medal' : 'clipboard-list'}`} style={{ fontSize: '.6rem' }}></i>
                                                    {lesson.exam_passed ? 'Exam Passed' : `Exam · ${lesson.pass_mark}% pass`}
                                                </span>
                                            )}
                                            {lesson.completed && (
                                                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 20, padding: '4px 12px', fontSize: '.68rem', fontWeight: 700 }}>
                                                    <i className="fas fa-check-circle"></i> Completed
                                                </span>
                                            )}
                                        </div>
                                        {/* Title */}
                                        <h1 style={{ margin: 0, fontFamily: 'Poppins,sans-serif', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>{lesson.title}</h1>
                                    </div>
                                </div>

                                {/* Video */}
                                {(lesson.type === 'video' || lesson.type === 'mixed') && lesson.video_url && (
                                    <div style={{ marginBottom: 24, borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 48px rgba(8,31,78,.18)', background: '#000', aspectRatio: '16/9', position: 'relative' }}>
                                        <iframe src={getEmbedUrl(lesson.video_url)} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={lesson.title} />
                                    </div>
                                )}

                                {/* Text content */}
                                {(lesson.type === 'text' || lesson.type === 'mixed') && lesson.content && (
                                    <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', border: '1px solid #e8edf5', boxShadow: '0 4px 20px rgba(8,31,78,.06)', marginBottom: 24 }}>
                                        <div className="lesson-content" dangerouslySetInnerHTML={{ __html: lesson.content }} style={{ fontSize: '.96rem', lineHeight: 1.9, color: '#374151' }} />
                                    </div>
                                )}

                                {!lesson.content && !lesson.video_url && (
                                    <div style={{ background: '#fff', borderRadius: 16, padding: '60px 30px', border: '1.5px dashed #dde4f0', textAlign: 'center', color: '#94a3b8', marginBottom: 24 }}>
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                            <i className="fas fa-book-open" style={{ fontSize: '1.4rem', color: '#cbd5e1' }}></i>
                                        </div>
                                        <p style={{ fontWeight: 700, color: '#374151', margin: '0 0 4px', fontSize: '1rem' }}>Content Coming Soon</p>
                                        <p style={{ fontSize: '.87rem', margin: 0 }}>Check back later or move to the next lesson.</p>
                                    </div>
                                )}

                                {/* Exam banner */}
                                {lesson.has_exam && !lesson.exam_passed && !lesson.completed && (
                                    <div style={{ background: 'linear-gradient(135deg,#fef9ec,#fffbeb)', border: '1.5px solid #fde68a', borderRadius: 16, padding: '18px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', boxShadow: '0 4px 16px rgba(217,119,6,.1)' }}>
                                        <div style={{ width: 46, height: 46, borderRadius: 13, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(217,119,6,.3)' }}>
                                            <i className="fas fa-clipboard-list" style={{ color: '#fff', fontSize: '1rem' }}></i>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: '0 0 3px', fontWeight: 800, color: '#92400e', fontFamily: 'Poppins,sans-serif', fontSize: '.9rem' }}>Lesson Exam Required</p>
                                            <p style={{ margin: 0, fontSize: '.8rem', color: '#a16207' }}>Score at least <strong>{lesson.pass_mark}%</strong> to unlock the next lesson.</p>
                                        </div>
                                        <button onClick={() => setExamOpen(true)}
                                            style={{ padding: '10px 22px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.84rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(217,119,6,.35)', flexShrink: 0, transition: 'opacity .2s' }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                            <i className="fas fa-play-circle"></i> Take Exam
                                        </button>
                                    </div>
                                )}

                                {/* ── Action bar ── */}
                                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8edf5', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(8,31,78,.07)', flexWrap: 'wrap' }}>
                                    <button onClick={() => prevLesson && goTo(prevLesson.id)} disabled={!prevLesson}
                                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: prevLesson ? '#374151' : '#d1d5db', cursor: prevLesson ? 'pointer' : 'not-allowed', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.83rem', transition: 'all .2s', flexShrink: 0 }}
                                        onMouseEnter={e => { if (prevLesson) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#c7d2fe'; } }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                        <i className="fas fa-arrow-left"></i> Previous
                                    </button>

                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 9, flexWrap: 'wrap' }}>
                                        {!lesson.completed ? (
                                            lesson.has_exam && !lesson.exam_passed ? (
                                                <button onClick={() => setExamOpen(true)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.85rem', boxShadow: '0 4px 16px rgba(217,119,6,.35)', transition: 'opacity .2s' }}>
                                                    <i className="fas fa-clipboard-list"></i> Take Exam to Complete
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => toggleComplete(false)} disabled={completing}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: '1.5px solid #d1fae5', background: '#f0fdf4', color: '#16a34a', cursor: completing ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.83rem', opacity: completing ? .6 : 1, transition: 'all .2s' }}>
                                                        {completing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                                                        Mark Complete
                                                    </button>
                                                    {nextLesson && (
                                                        <button onClick={() => toggleComplete(true)} disabled={completing}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#fe730c,#f97316)', color: '#fff', cursor: completing ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.85rem', opacity: completing ? .6 : 1, boxShadow: '0 4px 16px rgba(254,115,12,.38)', transition: 'opacity .2s' }}>
                                                            {completing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                                                            Complete &amp; Next
                                                        </button>
                                                    )}
                                                </>
                                            )
                                        ) : (
                                            <button onClick={() => toggleComplete(false)} disabled={completing}
                                                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 10, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', cursor: completing ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.83rem', opacity: completing ? .6 : 1 }}>
                                                {completing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                                                Completed — Undo
                                            </button>
                                        )}
                                    </div>

                                    <button onClick={() => nextLesson && goTo(nextLesson.id)} disabled={!nextLesson}
                                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: nextLesson ? 'linear-gradient(135deg,#fe730c,#f97316)' : '#f1f5f9', color: nextLesson ? '#fff' : '#d1d5db', cursor: nextLesson ? 'pointer' : 'not-allowed', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.83rem', boxShadow: nextLesson ? '0 4px 14px rgba(254,115,12,.3)' : 'none', transition: 'opacity .2s', flexShrink: 0 }}
                                        onMouseEnter={e => { if (nextLesson) e.currentTarget.style.opacity = '.88'; }}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                        Next <i className="fas fa-arrow-right"></i>
                                    </button>
                                </div>

                            </div>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#e8edf5,#dde4f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(8,31,78,.1)' }}>
                                    <i className="fas fa-book-open" style={{ fontSize: '1.8rem', color: '#94a3b8' }}></i>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontWeight: 800, color: '#081f4e', margin: '0 0 6px', fontFamily: 'Poppins,sans-serif', fontSize: '1.05rem' }}>Select a lesson to begin</p>
                                    <p style={{ fontSize: '.83rem', color: '#94a3b8', margin: 0 }}>Choose from the lesson panel on the left</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Exam modal */}
            {examOpen && lesson && (
                <ExamModal
                    lesson={lesson}
                    token={token}
                    onPassed={handleExamPassed}
                    onClose={() => setExamOpen(false)}
                />
            )}
        </div>
    );
}
