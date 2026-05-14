import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/AccessDenied';

function scoreColor(score, passMark) {
    if (score === null) return '#9ca3af';
    if (score >= passMark) return '#16a34a';
    if (score >= passMark * 0.7) return '#d97706';
    return '#dc2626';
}

function ScoreBar({ score, passMark }) {
    const pct   = score !== null ? Math.min(score, 100) : 0;
    const color = scoreColor(score, passMark ?? 50);
    return (
        <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .6s ease' }}></div>
            {/* pass-mark tick */}
            {passMark && (
                <div style={{
                    position: 'absolute', top: 0, left: `${passMark}%`, width: 2, height: '100%',
                    background: 'rgba(0,0,0,.2)', transform: 'translateX(-50%)',
                }}></div>
            )}
        </div>
    );
}

function ScoreBadge({ score, passMark }) {
    if (score === null) return (
        <span style={{ fontSize: '.7rem', fontWeight: 600, color: '#9ca3af', background: '#f1f5f9', borderRadius: 6, padding: '3px 8px' }}>
            Not attempted
        </span>
    );
    const passed = score >= passMark;
    return (
        <span style={{
            fontSize: '.7rem', fontWeight: 700, borderRadius: 6, padding: '3px 9px',
            background: passed ? '#f0fdf4' : '#fef2f2',
            color: passed ? '#16a34a' : '#dc2626',
            border: `1px solid ${passed ? '#bbf7d0' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: 4,
        }}>
            <i className={`fas fa-${passed ? 'check' : 'times'}-circle`} style={{ fontSize: '.65rem' }}></i>
            {passed ? 'Passed' : 'Failed'}
        </span>
    );
}

function CircleScore({ score, size = 64, stroke = 6 }) {
    const r   = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const pct  = score !== null ? Math.min(score, 100) : 0;
    const dash = (pct / 100) * circ;
    const color = score === null ? '#e2e8f0'
        : score >= 70 ? '#16a34a'
        : score >= 50 ? '#d97706'
        : '#dc2626';
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                    strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: size > 56 ? '.95rem' : '.75rem', color: score === null ? '#9ca3af' : color, lineHeight: 1 }}>
                    {score !== null ? `${score}%` : '—'}
                </span>
            </div>
        </div>
    );
}

function ModuleSection({ mod, courseSlug }) {
    const [open, setOpen] = useState(true);
    const attempted = mod.lessons.filter(l => l.best_score !== null).length;

    const avgColor = mod.avg_score === null ? '#9ca3af'
        : mod.avg_score >= 70 ? '#16a34a'
        : mod.avg_score >= 50 ? '#d97706'
        : '#dc2626';

    return (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            {/* Module header */}
            <button onClick={() => setOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: open ? '#f8fafc' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '.8rem', flexShrink: 0 }}>
                    <i className="fas fa-layer-group"></i>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: '.88rem', fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mod.module_title}</div>
                    <div style={{ fontSize: '.73rem', color: '#6b7280', marginTop: 2 }}>
                        {mod.exam_count} assessment{mod.exam_count !== 1 ? 's' : ''} · {attempted} attempted · {mod.passed_count} passed
                    </div>
                </div>

                {/* Module average */}
                <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 10 }}>
                    <div style={{ fontSize: '.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Module Avg</div>
                    <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '1.1rem', color: avgColor }}>
                        {mod.avg_score !== null ? `${mod.avg_score}%` : '—'}
                    </div>
                </div>

                <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: '#9ca3af', fontSize: '.8rem', flexShrink: 0 }}></i>
            </button>

            {/* Lessons */}
            {open && (
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                    {mod.lessons.map((lesson, idx) => (
                        <div key={lesson.lesson_id}
                            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: idx < mod.lessons.length - 1 ? '1px solid #f8fafc' : 'none', background: '#fff' }}>

                            {/* Lesson icon */}
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: lesson.best_score !== null ? (lesson.passed ? '#f0fdf4' : '#fef2f2') : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${lesson.best_score !== null ? (lesson.passed ? '#bbf7d0' : '#fca5a5') : '#e2e8f0'}` }}>
                                <i className={`fas fa-${lesson.best_score !== null ? (lesson.passed ? 'check' : 'times') : 'clock'}`}
                                    style={{ fontSize: '.65rem', color: lesson.best_score !== null ? (lesson.passed ? '#16a34a' : '#dc2626') : '#9ca3af' }}></i>
                            </div>

                            {/* Title */}
                            <div style={{ flex: '0 0 220px', minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '.83rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.lesson_title}</div>
                                <div style={{ fontSize: '.7rem', color: '#94a3b8', marginTop: 2 }}>Pass mark: {lesson.pass_mark}%</div>
                            </div>

                            {/* Score bar */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <ScoreBar score={lesson.best_score} passMark={lesson.pass_mark} />
                                <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: '.9rem', color: scoreColor(lesson.best_score, lesson.pass_mark), minWidth: 42, textAlign: 'right' }}>
                                    {lesson.best_score !== null ? `${lesson.best_score}%` : '—'}
                                </span>
                            </div>

                            {/* Badge */}
                            <div style={{ flexShrink: 0 }}>
                                <ScoreBadge score={lesson.best_score} passMark={lesson.pass_mark} />
                            </div>

                            {/* Attempts */}
                            <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 60 }}>
                                <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#374151' }}>{lesson.attempts_count}</div>
                                <div style={{ fontSize: '.65rem', color: '#9ca3af' }}>attempt{lesson.attempts_count !== 1 ? 's' : ''}</div>
                            </div>

                            {/* Link to lesson */}
                            <Link to={`/dashboard/learning/${courseSlug}`}
                                style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', textDecoration: 'none', fontSize: '.75rem' }}
                                title="Go to lesson">
                                <i className="fas fa-arrow-right"></i>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function generateCertificate(studentName, courseTitle, avgScore) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const certNo  = `TTI/${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Certificate – ${courseTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Dancing+Script:wght@700&family=Poppins:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4 landscape;margin:0}
  body{width:297mm;height:210mm;background:#fff;display:flex;align-items:center;justify-content:center;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .page{width:283mm;height:200mm;border:6px double #0a5276;border-radius:6px;position:relative;padding:16px 56px 20px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;background:#fff;overflow:hidden}
  .corner{position:absolute;width:72px;height:72px}
  .tl{top:10px;left:10px;border-top:5px solid #fe730c;border-left:5px solid #fe730c}
  .tr{top:10px;right:10px;border-top:5px solid #fe730c;border-right:5px solid #fe730c}
  .bl{bottom:10px;left:10px;border-bottom:5px solid #fe730c;border-left:5px solid #fe730c}
  .br{bottom:10px;right:10px;border-bottom:5px solid #fe730c;border-right:5px solid #fe730c}
  .wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.04;font-family:'Cinzel',serif;font-size:110px;font-weight:900;color:#0a5276;transform:rotate(-30deg);pointer-events:none;white-space:nowrap}
  .cert-no{position:absolute;top:18px;right:84px;font-family:'Poppins',sans-serif;font-size:12px;color:#6b7280;letter-spacing:.06em}
  .header{display:flex;align-items:center;gap:20px;width:100%}
  .logo{width:110px;height:110px;object-fit:contain;flex-shrink:0}
  .org{font-family:'Cinzel',serif;font-size:46px;font-weight:900;color:#0a5276;letter-spacing:.04em}
  .sub{font-family:'Cinzel',serif;font-size:22px;color:#607d8b;letter-spacing:.22em;margin-top:6px}
  .qr{position:absolute;bottom:22px;right:30px;display:flex;flex-direction:column;align-items:center;gap:4px}
  .qr img{width:90px;height:90px;border:1px solid #e2e8f0;border-radius:4px}
  .qr-lbl{font-family:'Poppins',sans-serif;font-size:8px;color:#9ca3af;letter-spacing:.06em;text-transform:uppercase}
  .body{display:flex;flex-direction:column;align-items:center;gap:0;flex:1;justify-content:center;width:100%;text-align:center}
  .div{width:82%;height:2.5px;background:linear-gradient(90deg,transparent,#fe730c,transparent)}
  .certify{font-family:'Poppins',sans-serif;font-size:15px;color:#374151;font-style:italic;margin:10px 0 6px}
  .name{font-family:'Dancing Script',cursive;font-size:64px;color:#0e6b7c;line-height:1.1}
  .name-line{width:60%;height:2px;background:#0e6b7c;margin:4px auto 10px}
  .award{font-family:'Poppins',sans-serif;font-size:14px;color:#374151;margin-bottom:8px}
  .course{font-family:'Cinzel',serif;font-size:22px;font-weight:900;color:#0e6b7c;letter-spacing:.08em;text-transform:uppercase}
  .cdiv{width:36%;height:1.5px;background:#0e6b7c;margin:6px auto 10px}
  .awn{font-family:'Poppins',sans-serif;font-size:14px;color:#374151;margin-bottom:3px}
  .date{font-family:'Poppins',sans-serif;font-size:15px;font-weight:700;color:#0a5276;border-bottom:1.5px solid #0a5276;padding-bottom:3px}
  .sigs{display:flex;justify-content:space-around;width:82%;padding-top:6px}
  .sig{display:flex;flex-direction:column;align-items:center;gap:4px}
  .sig-name{font-family:'Dancing Script',cursive;font-size:30px;color:#374151}
  .sig-line{width:160px;height:1.5px;background:#374151}
  .sig-lbl{font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;color:#374151;letter-spacing:.12em;text-transform:uppercase}
</style>
</head>
<body>
<div class="page">
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>
  <div class="wm">TECHSPHERE</div>
  <div class="cert-no">CERT. NO. ${certNo}</div>

  <div class="header">
    <img class="logo" src="/logo/Logo.jpeg" alt="Techsphere Logo" />
    <div>
      <div class="org">TECHSPHERE INSTITUTE</div>
      <div class="sub">Certificate of Merit</div>
    </div>
  </div>

  <div class="body">
    <div class="div"></div>
    <p class="certify">This is to certify that;</p>
    <div class="name">${studentName}</div>
    <div class="name-line"></div>
    <p class="award">has satisfactorily fulfilled the requirements for the award of the Certificate in</p>
    <div class="course">${courseTitle}</div>
    <div class="cdiv"></div>
    <p class="awn">Awarded on this</p>
    <p class="date">${dateStr}</p>
    <div class="div" style="margin-top:10px"></div>
  </div>

  <div class="sigs">
    <div class="sig">
      <div class="sig-name">Director</div>
      <div class="sig-line"></div>
      <div class="sig-lbl">Director</div>
    </div>
    <div class="sig">
      <div class="sig-name">Principal</div>
      <div class="sig-line"></div>
      <div class="sig-lbl">Principal</div>
    </div>
  </div>

  <div class="qr">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(certNo + ' | ' + studentName + ' | ' + courseTitle)}" alt="QR Code" />
    <span class="qr-lbl">Verify Certificate</span>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},400);}</script>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=1000,height=750');
    if (win) { win.document.write(html); win.document.close(); }
}

function CourseSection({ course, studentName }) {
    const [open, setOpen] = useState(true);

    const avgColor = course.avg_score === null ? '#9ca3af'
        : course.avg_score >= 70 ? '#16a34a'
        : course.avg_score >= 50 ? '#d97706'
        : '#dc2626';

    return (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 18, marginBottom: 24, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
            {/* Course header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderBottom: open ? '1.5px solid #e2e8f0' : 'none' }}>
                <CircleScore score={course.avg_score} size={64} stroke={6} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>Course</div>
                    <h3 style={{ margin: '0 0 4px', fontFamily: 'Poppins,sans-serif', fontWeight: 800, color: '#0c1a3a', fontSize: '1rem' }}>{course.course_title}</h3>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {[
                            { icon: 'fa-clipboard-list', val: course.total_exams,  label: 'Total assessments', col: '#6366f1' },
                            { icon: 'fa-check-circle',   val: course.total_passed, label: 'Passed',             col: '#16a34a' },
                            { icon: 'fa-times-circle',   val: course.total_exams - course.total_passed, label: 'Failed', col: '#dc2626' },
                        ].map(s => (
                            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.75rem', color: '#6b7280' }}>
                                <i className={`fas ${s.icon}`} style={{ color: s.col, fontSize: '.7rem' }}></i>
                                <strong style={{ color: '#374151' }}>{s.val}</strong> {s.label}
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.08em' }}>Course Average</div>
                        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 900, fontSize: '1.6rem', color: avgColor, lineHeight: 1 }}>
                            {course.avg_score !== null ? `${course.avg_score}%` : '—'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {course.avg_score !== null && course.avg_score >= 50 ? (
                            <button onClick={() => generateCertificate(studentName, course.course_title, course.avg_score)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg,#081f4e,#1a3a6e)', color: '#fff', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(8,31,78,.25)', transition: 'opacity .2s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                title="Download Certificate">
                                <i className="fas fa-certificate" style={{ color: '#fe730c', fontSize: '.75rem' }}></i>
                                Certificate
                            </button>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#9ca3af', fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', fontWeight: 600, cursor: 'not-allowed' }}
                                title="Score must be 50% or above to download certificate">
                                <i className="fas fa-lock" style={{ fontSize: '.7rem' }}></i>
                                Certificate
                            </span>
                        )}
                        <button onClick={() => setOpen(o => !o)}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>
                            <i className={`fas fa-chevron-${open ? 'up' : 'down'}`}></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Modules */}
            {open && (
                <div style={{ padding: '18px 22px' }}>
                    {course.modules.map(mod => (
                        <ModuleSection key={mod.module_id} mod={mod} courseSlug={course.course_slug} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function LearnerScores() {
    const { token, can, user } = useAuth();

    if (!can('learning', 'view_scores')) {
        return <div className="db-content"><AccessDenied /></div>;
    }
    const [data,    setData]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        if (!token) return;
        fetch('/api/learning/my-scores', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setData(d); else setError(d.message || 'Error loading scores.'); })
            .catch(() => setError('Network error — please check your connection.'))
            .finally(() => setLoading(false));
    }, [token]);

    // Global summary stats
    const totalExams   = data.reduce((s, c) => s + c.total_exams,  0);
    const totalPassed  = data.reduce((s, c) => s + c.total_passed, 0);
    const totalFailed  = totalExams - totalPassed;
    const coursesWithScores = data.filter(c => c.avg_score !== null);
    const overallAvg = coursesWithScores.length
        ? Math.round(coursesWithScores.reduce((s, c) => s + c.avg_score, 0) / coursesWithScores.length * 10) / 10
        : null;

    return (
        <div className="db-content" style={{ overflowY: 'auto' }}>
                <div>

                    {/* Page header with inline summary chips */}
                    <div style={{
                        background: '#fff',
                        borderRadius: 18, padding: '26px 32px', marginBottom: 28,
                        border: '1.5px solid #e8ecf4', boxShadow: '0 2px 12px rgba(8,31,78,.05)',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position:'absolute', top:-40, right:40, width:180, height:180, borderRadius:'50%', background:'rgba(99,102,241,.05)', pointerEvents:'none' }}></div>
                        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24, flexWrap:'wrap' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:18 }}>
                                <div style={{ width:52, height:52, borderRadius:16, background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <i className="fas fa-chart-bar" style={{ fontSize:'1.4rem', color:'#7c3aed' }}></i>
                                </div>
                                <div>
                                    <p style={{ margin:'0 0 3px', color:'#94a3b8', fontSize:'.75rem', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }}>Assessment Results</p>
                                    <h1 style={{ margin:0, color:'#081f4e', fontSize:'1.4rem', fontWeight:800 }}>My Scores</h1>

                                </div>
                            </div>

                            {!loading && !error && totalExams > 0 && (
                                <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                                    {[
                                        { icon: 'fa-chart-bar',      label: 'Overall Average',   val: overallAvg !== null ? `${overallAvg}%` : '—', bg: '#f5f3ff', col: '#7c3aed' },
                                        { icon: 'fa-clipboard-list', label: 'Total Assessments', val: totalExams,  bg: '#eff6ff', col: '#1d4ed8' },
                                        { icon: 'fa-check-circle',   label: 'Passed',            val: totalPassed, bg: '#f0fdf4', col: '#16a34a' },
                                        { icon: 'fa-times-circle',   label: 'Failed',            val: totalFailed, bg: '#fef2f2', col: '#dc2626' },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <i className={`fas ${s.icon}`} style={{ color: s.col, fontSize: '1rem', flexShrink: 0 }}></i>
                                            <div>
                                                <div style={{ color: s.col, fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, fontFamily: 'Poppins,sans-serif' }}>{s.val}</div>
                                                <div style={{ color: '#94a3b8', fontSize: '.7rem', marginTop: 2 }}>{s.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* States */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: 12, display: 'block', color: '#6366f1' }}></i>
                            Loading your scores…
                        </div>
                    )}
                    {error && (
                        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '16px 20px', color: '#991b1b', fontSize: '.88rem' }}>
                            <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>{error}
                        </div>
                    )}
                    {!loading && !error && data.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', border: '1.5px dashed #e2e8f0', borderRadius: 18 }}>
                            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '1.8rem', color: '#6366f1' }}>
                                <i className="fas fa-chart-bar"></i>
                            </div>
                            <h3 style={{ margin: '0 0 8px', color: '#374151', fontFamily: 'Poppins,sans-serif', fontWeight: 700 }}>No assessment scores yet</h3>
                            <p style={{ margin: '0 0 20px', color: '#9ca3af', fontSize: '.87rem' }}>You haven't taken any assessments. Start a course and complete lesson exams to see your scores here.</p>
                            <Link to="/dashboard/learning"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', textDecoration: 'none', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.86rem' }}>
                                <i className="fas fa-book-reader"></i> Go to My Learning
                            </Link>
                        </div>
                    )}

                    {/* Course sections */}
                    {!loading && !error && data.map(course => (
                        <CourseSection key={course.course_id} course={course} studentName={user?.name || 'Student'} />
                    ))}

                </div>
                </div>
    );
}
