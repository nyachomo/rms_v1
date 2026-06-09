import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';

/* ── Certificate generator (same design as student-side) ── */
function generateCertificate(studentName, courseTitle) {
    const now     = new Date();
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
<script>window.onload=function(){setTimeout(function(){window.print();},600);}</script>
</body>
</html>`;
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (win) { win.document.write(html); win.document.close(); }
}

/* ── Transcript generator ── */
function generateTranscript(student, courseTitle, modules, manualAssessments = []) {
    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const refNo   = `TTI/TR/${now.getFullYear()}/${String(student.user_id).padStart(4,'0')}`;

    const rowsBg  = (i) => i % 2 === 0 ? '#f8fafc' : '#fff';

    const moduleRows = modules.map(m => {
        const examRows = m.exams.map((e, ei) => {
            const s        = student.scores[e.id];
            const score    = s ? `${s.score}%` : '—';
            const passed   = s ? (s.passed ? 'Pass' : 'Fail') : 'Not Attempted';
            const attempts = s ? s.attempts : 0;
            const passColor = s ? (s.passed ? '#15803d' : '#b91c1c') : '#9ca3af';
            const bg        = s ? (s.passed ? '#f0fdf4' : '#fff5f5') : '#fff';
            return `
            <tr style="background:${bg}">
              <td style="padding:7px 12px;font-size:12px;color:#374151;border-bottom:1px solid #f1f5f9;padding-left:32px">${e.title}</td>
              <td style="padding:7px 12px;font-size:12px;color:#64748b;text-align:center;border-bottom:1px solid #f1f5f9">≥${e.pass_mark}%</td>
              <td style="padding:7px 12px;font-size:13px;font-weight:700;text-align:center;color:#1e293b;border-bottom:1px solid #f1f5f9">${score}</td>
              <td style="padding:7px 12px;font-size:12px;font-weight:700;text-align:center;color:${passColor};border-bottom:1px solid #f1f5f9">${passed}</td>
              <td style="padding:7px 12px;font-size:12px;text-align:center;color:#94a3b8;border-bottom:1px solid #f1f5f9">${attempts > 0 ? attempts : '—'}</td>
            </tr>`;
        }).join('');

        return `
        <tr style="background:#1e293b">
          <td colspan="4" style="padding:8px 12px;font-size:12px;font-weight:700;color:#e2e8f0;text-transform:uppercase;letter-spacing:.06em">
            <span style="color:#fe730c;margin-right:6px">▶</span>${m.title}
          </td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;color:#94a3b8;text-align:center">Attempts</td>
        </tr>
        ${examRows}`;
    }).join('');

    const gradeRow = (pct, name, idx) => {
        const rounded = pct !== null ? Math.round(pct) : null;
        const score   = rounded !== null ? `${rounded}%` : '—';
        const grade   = rounded === null ? '—'
            : rounded >= 80 ? 'A' : rounded >= 70 ? 'B' : rounded >= 60 ? 'C' : rounded >= 50 ? 'D' : 'F';
        const comment = rounded === null ? 'Not Attempted'
            : rounded >= 80 ? 'Distinction' : rounded >= 70 ? 'Credit' : rounded >= 50 ? 'Pass' : 'Fail';
        const commentColor = rounded === null ? '#9ca3af'
            : rounded >= 80 ? '#15803d' : rounded >= 70 ? '#0369a1' : rounded >= 50 ? '#b45309' : '#b91c1c';
        const gradeColor = rounded === null ? '#9ca3af'
            : rounded >= 80 ? '#15803d' : rounded >= 70 ? '#0369a1' : rounded >= 60 ? '#b45309' : rounded >= 50 ? '#92400e' : '#b91c1c';
        const bg = idx % 2 === 0 ? '#f8fafc' : '#fff';
        return `
        <tr style="background:${bg}">
          <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9">${name}</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:800;text-align:center;color:#1e293b;border-bottom:1px solid #f1f5f9">${score}</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;text-align:center;color:${gradeColor};border-bottom:1px solid #f1f5f9">${grade}</td>
          <td style="padding:8px 12px;font-size:12px;font-weight:700;text-align:center;color:${commentColor};border-bottom:1px solid #f1f5f9">${comment}</td>
        </tr>`;
    };

    const moduleRows2   = modules.map((m, idx) => gradeRow(student.module_avgs[m.id], m.title, idx));
    const manualRows2   = manualAssessments.map((a, i) => {
        const raw = student.manual_scores?.[a.id] ?? null;
        const pct = raw !== null ? (raw / parseFloat(a.max_score)) * 100 : null;
        return gradeRow(pct, a.name, modules.length + i);
    });
    const moduleSummaryRows = [...moduleRows2, ...manualRows2].join('');

    const allScores = [
        ...modules.map(m => student.module_avgs[m.id]),
        ...manualAssessments.map(a => {
            const raw = student.manual_scores?.[a.id] ?? null;
            return raw !== null ? (raw / parseFloat(a.max_score)) * 100 : null;
        }),
    ].filter(v => v !== null);
    const courseAvg = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : null;
    const courseColor = courseAvg === null ? '#9ca3af' : courseAvg >= 70 ? '#15803d' : courseAvg >= 50 ? '#b45309' : '#b91c1c';
    const courseBg    = courseAvg === null ? '#f8fafc' : courseAvg >= 70 ? '#dcfce7' : courseAvg >= 50 ? '#fef9c3' : '#fee2e2';
    const gradeLabel  = courseAvg === null ? 'N/A'
        : courseAvg >= 80 ? 'Distinction'
        : courseAvg >= 70 ? 'Credit'
        : courseAvg >= 50 ? 'Pass'
        : 'Fail';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Transcript – ${student.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Poppins:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4 portrait;margin:0}
  body{width:210mm;background:#fff;font-family:'Poppins',sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .page{width:210mm;min-height:297mm;padding:0;position:relative;background:#fff}
  .header{background:#fff;padding:22px 32px 18px;display:flex;align-items:center;gap:18px;border-bottom:2px solid #e2e8f0}
  .logo{width:100px;height:100px;object-fit:contain;border-radius:50%;flex-shrink:0}
  .hd-text{flex:1}
  .org{font-family:'Cinzel',serif;font-size:22px;font-weight:900;color:#081f4e;letter-spacing:.04em}
  .sub{font-size:11px;color:#64748b;letter-spacing:.18em;text-transform:uppercase;margin-top:4px}
  .hd-right{text-align:right}
  .ref{font-size:10px;color:#64748b;letter-spacing:.06em}
  .ref strong{color:#fe730c;display:block;font-size:11px;margin-bottom:2px}
  .title-band{background:#fff;padding:8px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #e2e8f0}
  .title-band h2{font-family:'Cinzel',serif;font-size:15px;font-weight:700;color:#081f4e;letter-spacing:.12em;text-transform:uppercase}
  .title-band span{font-size:10px;color:#64748b;letter-spacing:.06em}

  .student-card{margin:18px 32px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px 20px;display:flex;gap:32px;align-items:flex-start}
  .sc-col{flex:1}
  .sc-label{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px}
  .sc-value{font-size:13px;font-weight:600;color:#1e293b}
  .sc-email{font-size:11px;color:#64748b}

  .course-band{margin:0 32px 14px;background:#081f4e;border-radius:8px;padding:12px 18px;display:flex;align-items:center;justify-content:space-between}
  .cb-title{font-size:14px;font-weight:700;color:#fff}
  .cb-label{font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em}

  .table-wrap{margin:0 32px 16px;border-radius:10px;overflow:hidden;border:1.5px solid #e2e8f0}
  table{width:100%;border-collapse:collapse}
  th{padding:9px 12px;font-size:11px;font-weight:700;color:#94a3b8;background:#f1f5f9;text-align:left;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e2e8f0}
  th.center{text-align:center}

  .total-row{margin:0 32px 24px;background:${courseBg};border:2px solid ${courseColor}33;border-radius:10px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between}
  .tr-label{font-size:13px;font-weight:700;color:#1e293b}
  .tr-label span{font-size:11px;font-weight:400;color:#64748b;display:block;margin-top:2px}
  .tr-score{font-size:32px;font-weight:900;color:${courseColor};line-height:1}
  .tr-grade{font-size:11px;font-weight:700;color:${courseColor};text-align:right;margin-top:4px;text-transform:uppercase;letter-spacing:.08em}

  .footer{margin:0 32px;padding-top:12px;border-top:2.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:24px}
  .sig-block{text-align:center}
  .sig-name{font-size:22px;color:#374151;font-style:italic;margin-bottom:4px;font-family:Georgia,serif}
  .sig-line{width:150px;height:1.5px;background:#374151;margin:0 auto 4px}
  .sig-lbl{font-size:10px;font-weight:700;color:#374151;letter-spacing:.12em;text-transform:uppercase}
  .print-note{font-size:9px;color:#cbd5e1;text-align:center;margin:8px 32px 0;padding-bottom:16px}
  .legend{display:flex;gap:16px;flex-wrap:wrap;margin:0 32px 14px;font-size:10px;color:#64748b}
  .leg-item{display:flex;align-items:center;gap:5px}
  .leg-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <img class="logo" src="/logo/Logo.jpeg" alt="Logo" onerror="this.style.display='none'" />
    <div class="hd-text">
      <div class="org">TECHSPHERE INSTITUTE</div>
      <div class="sub">Official Academic Transcript</div>
    </div>
    <div class="hd-right">
      <div class="ref"><strong>REF NO.</strong>${refNo}</div>
      <div class="ref" style="margin-top:6px"><strong>PRINTED</strong>${dateStr}</div>
    </div>
  </div>

  <!-- Title band -->
  <div class="title-band">
    <h2>Student Academic Transcript</h2>
    <span>Confidential — For Official Use Only</span>
  </div>

  <!-- Student card -->
  <div class="student-card">
    <div class="sc-col">
      <div class="sc-label">Student Name</div>
      <div class="sc-value">${student.name}</div>
    </div>
    <div class="sc-col">
      <div class="sc-label">Email Address</div>
      <div class="sc-email">${student.email}</div>
    </div>
    <div class="sc-col">
      <div class="sc-label">Course</div>
      <div class="sc-value">${courseTitle}</div>
    </div>
    <div class="sc-col">
      <div class="sc-label">Date of Issue</div>
      <div class="sc-value">${dateStr}</div>
    </div>
  </div>

  <!-- Module Performance Summary -->
  <div style="margin:0 32px 16px;border-radius:10px;overflow:hidden;border:1.5px solid #e2e8f0">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#081f4e">
          <th style="padding:9px 12px;font-size:11px;font-weight:700;color:#e2e8f0;text-align:left;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #fe730c">Module</th>
          <th style="padding:9px 12px;font-size:11px;font-weight:700;color:#e2e8f0;text-align:center;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #fe730c">Score</th>
          <th style="padding:9px 12px;font-size:11px;font-weight:700;color:#e2e8f0;text-align:center;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #fe730c">Grade</th>
          <th style="padding:9px 12px;font-size:11px;font-weight:700;color:#e2e8f0;text-align:center;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #fe730c">Comment</th>
        </tr>
      </thead>
      <tbody>
        ${moduleSummaryRows}
      </tbody>
    </table>
  </div>

  <!-- Legend -->
  <div class="legend">
    <div class="leg-item"><div class="leg-dot" style="background:#dcfce7;border:1px solid #86efac"></div> Pass</div>
    <div class="leg-item"><div class="leg-dot" style="background:#fee2e2;border:1px solid #fca5a5"></div> Fail</div>
    <div class="leg-item"><div class="leg-dot" style="background:#f8fafc;border:1px solid #e2e8f0"></div> Not Attempted</div>
    <div style="margin-left:auto;color:#9ca3af">Grading: ≥80% Distinction · ≥70% Credit · ≥50% Pass · &lt;50% Fail</div>
  </div>

  <!-- Course total -->
  <div class="total-row">
    <div class="tr-label">
      Overall Course Performance
      <span>${courseTitle}</span>
    </div>
    <div style="text-align:right">
      <div class="tr-score">${courseAvg !== null ? courseAvg+'%' : '—'}</div>
      <div class="tr-grade">${gradeLabel}</div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="footer">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-lbl">Director</div>
    </div>
    <div style="text-align:center;font-size:10px;color:#cbd5e1">
      <div style="margin-bottom:4px">This transcript is issued by Techsphere Institute</div>
      <div>and is valid only with an official stamp or signature.</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-lbl">Registrar</div>
    </div>
  </div>

  <div class="print-note">Generated on ${now.toLocaleString('en-GB')} · ${refNo} · Techsphere Institute</div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},600);}</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=1100');
    if (win) { win.document.write(html); win.document.close(); }
}

/* ── Helpers ── */
function scoreColor(score, passMark) {
    if (score == null) return { bg: 'transparent', fg: '#cbd5e1' };
    if (score >= passMark) return { bg: '#dcfce7', fg: '#16a34a' };
    return { bg: '#fee2e2', fg: '#dc2626' };
}

function avgColor(avg) {
    if (avg == null) return { bg: 'transparent', fg: '#cbd5e1' };
    if (avg >= 70) return { bg: '#dcfce7', fg: '#16a34a' };
    if (avg >= 50) return { bg: '#fef9c3', fg: '#ca8a04' };
    return { bg: '#fee2e2', fg: '#dc2626' };
}

const cell = {
    padding: '8px 10px', fontSize: '.78rem', borderBottom: '1px solid #f1f5f9',
    whiteSpace: 'nowrap', verticalAlign: 'middle',
};
const th = {
    padding: '8px 10px', fontSize: '.72rem', fontWeight: 700,
    background: '#f8fafc', color: '#475569', whiteSpace: 'nowrap',
    borderBottom: '2px solid #e2e8f0', verticalAlign: 'middle',
};
const thModule = {
    ...th, background: '#1e293b', color: '#fff',
    textAlign: 'center', borderBottom: '2px solid #0f172a',
};
const thExam = {
    ...th, background: '#334155', color: '#e2e8f0',
    textAlign: 'center', borderBottom: '2px solid #1e293b',
    maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis',
};
const thAvg = {
    ...th, background: '#0f172a', color: '#94a3b8',
    textAlign: 'center', borderBottom: '2px solid #020617',
};

function ScoreCell({ scoreData, passMark, onReset }) {
    const [hovered, setHovered] = useState(false);

    if (!scoreData) {
        return <td style={{ ...cell, textAlign: 'center', color: '#cbd5e1' }}>—</td>;
    }
    const { score, passed, attempts } = scoreData;
    const { bg, fg } = scoreColor(score, passMark);
    return (
        <td
            style={{ ...cell, textAlign: 'center', background: hovered ? bg : bg, position: 'relative', minWidth: 90 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span style={{ color: fg, fontWeight: 700 }}>{score}%</span>
            <span style={{ display: 'block', color: '#94a3b8', fontSize: '.65rem' }}>
                {passed ? '✓ passed' : '✗ failed'} · {attempts} {attempts === 1 ? 'try' : 'tries'}
            </span>
            {hovered && (
                <button
                    title="Reset — allow student to retake"
                    onClick={e => { e.stopPropagation(); onReset(); }}
                    style={{
                        position: 'absolute', top: 3, right: 3,
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 5,
                        width: 20, height: 20, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#f97316', fontSize: '.6rem', boxShadow: '0 1px 4px rgba(0,0,0,.12)',
                        padding: 0,
                    }}>
                    <i className="fas fa-redo-alt"></i>
                </button>
            )}
        </td>
    );
}

/* ── Reset confirm modal ── */
function ResetModal({ studentName, examTitle, onConfirm, onClose, loading }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,31,78,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={onClose}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>
                        <i className="fas fa-redo-alt"></i>
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '.68rem', color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Reset Exam</p>
                        <h3 style={{ margin: 0, color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', fontWeight: 700 }}>Allow Retake</h3>
                    </div>
                </div>
                <div style={{ padding: '22px 24px' }}>
                    <p style={{ color: '#374151', marginBottom: 8, fontSize: '.9rem' }}>
                        Reset <strong>{examTitle}</strong> for <strong>{studentName}</strong>?
                    </p>
                    <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '.82rem', color: '#92400e' }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginTop: 2, flexShrink: 0 }}></i>
                        <span>All previous attempts and scores for this exam will be permanently deleted. The lesson will also be unmarked as complete so the student can retake it.</span>
                    </div>
                </div>
                <div style={{ padding: '0 24px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={onClose}
                        style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '.85rem' }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={loading}
                        style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#ea580c,#f97316)', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 7, opacity: loading ? .7 : 1 }}>
                        {loading ? <><i className="fas fa-circle-notch fa-spin"></i> Resetting…</> : <><i className="fas fa-redo-alt"></i> Yes, Reset</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AvgCell({ avg, isClass }) {
    if (avg == null) {
        return <td style={{ ...cell, textAlign: 'center', color: '#cbd5e1', background: isClass ? '#f8fafc' : undefined }}>—</td>;
    }
    const { bg, fg } = avgColor(avg);
    return (
        <td style={{ ...cell, textAlign: 'center', background: isClass ? '#f0f4ff' : bg + 'aa', fontWeight: 700, color: fg }}>
            {avg}%
        </td>
    );
}

function SummaryCard({ icon, label, value, color }) {
    return (
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={icon} style={{ color, fontSize: '1rem' }}></i>
            </div>
            <div>
                <div style={{ fontSize: '.72rem', color: '#94a3b8', fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
            </div>
        </div>
    );
}

export default function AdminScores() {
    const { token, can } = useAuth();

    if (!can('student_scores', 'view')) return <AccessDenied />;

    return <AdminScoresInner token={token} />;
}

function AdminScoresInner({ token }) {
    const [courses, setCourses]             = useState([]);
    const [categories, setCategories]       = useState([]);
    const [categoryId, setCategoryId]       = useState('');
    const [courseId, setCourseId]           = useState('');
    const [data, setData]                   = useState(null);
    const [loadingCourses, setLCourses]     = useState(true);
    const [loading, setLoading]             = useState(false);
    const [search, setSearch]               = useState('');
    const [resetTarget, setResetTarget]     = useState(null);
    const [resetLoading, setResetLoading]   = useState(false);
    const [toast, setToast]                 = useState(null);

    useEffect(() => {
        // Fetch categories and courses in parallel — categories from their own table, not derived
        Promise.all([
            fetch('/api/public-course-categories', { headers: { Accept: 'application/json' } }).then(r => r.json()).catch(() => []),
            fetch('/api/admin/scores/courses', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }).then(r => r.json()).catch(() => []),
        ]).then(([cats, courses]) => {
            const catList = Array.isArray(cats) ? cats : [];
            const crsList = Array.isArray(courses) ? courses : [];
            setCategories(catList.sort((a, b) => a.name.localeCompare(b.name)));
            setCourses(crsList);
        }).finally(() => setLCourses(false));
    }, [token]);

    useEffect(() => {
        if (!courseId) { setData(null); return; }
        setLoading(true);
        setData(null);
        fetch(`/api/admin/courses/${courseId}/scores`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(setData)
            .finally(() => setLoading(false));
    }, [courseId, token]);

    const confirmReset = async () => {
        if (!resetTarget) return;
        setResetLoading(true);
        try {
            const res = await fetch(`/api/admin/scores/lessons/${resetTarget.lessonId}/students/${resetTarget.userId}/attempts`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) { setToast({ message: data.message || 'Reset failed.', type: 'error' }); return; }
            setToast({ message: `Exam reset for ${resetTarget.studentName}. They can now retake it.`, type: 'success' });
            setResetTarget(null);
            // Reload gradebook
            if (courseId) {
                setLoading(true);
                setData(null);
                fetch(`/api/admin/courses/${courseId}/scores`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                }).then(r => r.json()).then(setData).finally(() => setLoading(false));
            }
        } catch {
            setToast({ message: 'Reset failed.', type: 'error' });
        } finally {
            setResetLoading(false);
        }
    };


    const filtered = useMemo(() => {
        if (!data?.students) return [];
        const q = search.trim().toLowerCase();
        if (!q) return data.students;
        return data.students.filter(s =>
            s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
        );
    }, [data, search]);

    /* ── Summary stats ── */
    const summary = useMemo(() => {
        if (!data?.students?.length) return null;
        const total   = data.students.length;
        const attempted = data.students.filter(s => s.course_avg !== null).length;
        const passed  = data.students.filter(s => {
            if (!s.scores) return false;
            return Object.values(s.scores).some(v => v?.passed);
        }).length;
        return { total, attempted, passed, classAvg: data.course_avg };
    }, [data]);

    return (
        <>
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="Student Scores" />
                <div className="db-content">

                    <div className="db-topbar">
                        <div>
                            <h1 className="db-page-title">Student Scores</h1>
                            <p className="db-page-sub">Gradebook — scores per assessment, module and course</p>
                        </div>
                    </div>

                    {/* Toast */}
                    {toast && (
                        <div style={{ background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`, borderRadius: 10, padding: '11px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem' }}>
                            <i className={`fas fa-${toast.type === 'error' ? 'exclamation-circle' : 'check-circle'}`} style={{ color: toast.type === 'error' ? '#dc2626' : '#16a34a' }}></i>
                            <span style={{ flex: 1, color: toast.type === 'error' ? '#991b1b' : '#15803d' }}>{toast.message}</span>
                            <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '.8rem' }}><i className="fas fa-times"></i></button>
                        </div>
                    )}

                    {/* Course selector — category first, then course */}
                    <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,.07)', marginBottom: 20 }}>
                        {loadingCourses ? (
                            <div style={{ color: '#94a3b8', fontSize: '.85rem' }}>Loading courses…</div>
                        ) : courses.length === 0 ? (
                            <div style={{ color: '#f97316', fontSize: '.85rem' }}>
                                <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                                No courses have assessments configured yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                {/* Step 1 — Category */}
                                <div style={{ flex: '1 1 220px' }}>
                                    <label style={{ fontSize: '.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                        <i className="fas fa-layer-group" style={{ marginRight: 6, color: '#6366f1' }}></i>
                                        Step 1 — Course Category
                                    </label>
                                    <select
                                        value={categoryId}
                                        onChange={e => {
                                            setCategoryId(e.target.value);
                                            setCourseId('');
                                            setData(null);
                                            setSearch('');
                                        }}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.88rem', color: '#1e293b', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                    >
                                        <option value="">— All Categories —</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Arrow */}
                                <div style={{ flexShrink: 0, color: '#cbd5e1', fontSize: '1.1rem', paddingBottom: 10 }}>
                                    <i className="fas fa-arrow-right"></i>
                                </div>

                                {/* Step 2 — Course */}
                                <div style={{ flex: '1 1 260px' }}>
                                    <label style={{ fontSize: '.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                        <i className="fas fa-book-open" style={{ marginRight: 6, color: '#0ea5e9' }}></i>
                                        Step 2 — Select Course
                                    </label>
                                    {(() => {
                                        const filtered = categoryId
                                            ? courses.filter(c => String(c.category_id) === String(categoryId))
                                            : courses;
                                        return (
                                            <select
                                                value={courseId}
                                                onChange={e => { setCourseId(e.target.value); setSearch(''); }}
                                                disabled={filtered.length === 0}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.88rem', color: filtered.length === 0 ? '#94a3b8' : '#1e293b', background: '#fff', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', outline: 'none' }}
                                            >
                                                <option value="">
                                                    {filtered.length === 0 ? '— No courses in this category —' : '— Choose a course —'}
                                                </option>
                                                {filtered.map(c => (
                                                    <option key={c.id} value={c.id}>{c.title}</option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem' }}></i>
                            <div style={{ marginTop: 10, fontSize: '.9rem' }}>Loading gradebook…</div>
                        </div>
                    )}

                    {/* No exams in course */}
                    {data && data.modules.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                            <i className="fas fa-clipboard-list" style={{ fontSize: '2rem' }}></i>
                            <div style={{ marginTop: 10 }}>This course has no published assessments.</div>
                        </div>
                    )}

                    {data && data.modules.length > 0 && (
                        <>
                            {/* Summary cards */}
                            {summary && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
                                    <SummaryCard icon="fas fa-users"        label="Enrolled Students" value={summary.total}                        color="#6366f1" />
                                    <SummaryCard icon="fas fa-pen-alt"      label="Attempted Any Exam" value={summary.attempted}                   color="#0ea5e9" />
                                    <SummaryCard icon="fas fa-check-circle" label="Has a Passing Score" value={summary.passed}                    color="#22c55e" />
                                    <SummaryCard icon="fas fa-chart-line"   label="Class Average"
                                        value={summary.classAvg !== null ? `${summary.classAvg}%` : '—'}                                          color="#f59e0b" />
                                </div>
                            )}

                            {/* Search */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
                                    <i className="fas fa-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '.8rem' }}></i>
                                    <input
                                        type="text"
                                        placeholder="Filter students by name or email…"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                    {search && (
                                        <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                            <i className="fas fa-times"></i>
                                        </button>
                                    )}
                                </div>
                                <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>
                                    {filtered.length} student{filtered.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Gradebook */}
                            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,.07)', overflow: 'hidden' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
                                        <thead>
                                            {/* Row 1: group headers */}
                                            <tr>
                                                <th style={{ ...th, textAlign: 'left' }} rowSpan={2}>Student</th>
                                                {data.modules.map(m => (
                                                    <th key={m.id} style={{ ...thModule }} colSpan={m.exams.length + 1} title={m.title}>
                                                        {m.title}
                                                    </th>
                                                ))}
                                                <th style={{ ...thAvg, background: '#4f46e5', color: '#c7d2fe' }} rowSpan={2}>
                                                    Course<br />Avg
                                                </th>
                                                {data.manual_assessments?.length > 0 && (
                                                    <th style={{ ...thModule, background: '#065f46', borderLeft: '3px solid #059669' }}
                                                        colSpan={data.manual_assessments.length + 1}>
                                                        <i className="fas fa-pen-alt" style={{ marginRight: 6, color: '#6ee7b7' }}></i>
                                                        Manual Assessments
                                                    </th>
                                                )}
                                            </tr>

                                            {/* Row 2: exam names + module avg + manual assessment names */}
                                            <tr>
                                                {data.modules.map(m => (
                                                    <>
                                                        {m.exams.map(e => (
                                                            <th key={e.id} style={{ ...thExam }} title={e.title}>
                                                                <span style={{ display: 'block', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                                                                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '.65rem' }}>pass ≥{e.pass_mark}%</span>
                                                            </th>
                                                        ))}
                                                        <th key={`avg-${m.id}`} style={{ ...thAvg }}>Mod Avg</th>
                                                    </>
                                                ))}
                                                {data.manual_assessments?.map(a => (
                                                    <th key={`ma-${a.id}`} style={{ ...thExam, background: '#047857', borderLeft: a === data.manual_assessments[0] ? '3px solid #059669' : undefined }} title={a.name}>
                                                        <span style={{ display: 'block', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                                                        <span style={{ fontWeight: 400, color: '#6ee7b7', fontSize: '.65rem' }}>out of {a.max_score}</span>
                                                    </th>
                                                ))}
                                                {data.manual_assessments?.length > 0 && (
                                                    <th style={{ ...thAvg, background: '#064e3b' }}>Manual<br />Avg</th>
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {filtered.length === 0 ? (
                                                <tr><td colSpan={999} style={{ ...cell, textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>No students match your search.</td></tr>
                                            ) : filtered.map(student => (
                                                <tr key={student.user_id} style={{ transition: 'background .15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                    <td style={{ ...cell, minWidth: 200 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#6366f11a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '.72rem', fontWeight: 700, color: '#6366f1' }}>
                                                                {student.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                                            </div>
                                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '.82rem' }}>{student.name}</div>
                                                                <div style={{ color: '#94a3b8', fontSize: '.68rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</div>
                                                            </div>
                                                            {(() => {
                                                                const hasPassed = student.scores && Object.values(student.scores).some(s => s?.passed);
                                                                return (
                                                                    <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                                                                        <button title={hasPassed ? 'Download Certificate' : 'No passing score yet'} disabled={!hasPassed}
                                                                            onClick={() => hasPassed && generateCertificate(student.name, data.course.title)}
                                                                            style={{ background: hasPassed ? 'linear-gradient(135deg,#081f4e,#0d2d6b)' : '#f1f5f9', border: 'none', borderRadius: 5, padding: '3px 7px', cursor: hasPassed ? 'pointer' : 'not-allowed', color: hasPassed ? '#fff' : '#cbd5e1', fontSize: '.63rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                                                            <i className="fas fa-certificate" style={{ color: hasPassed ? '#fe730c' : '#cbd5e1', fontSize: '.6rem' }}></i> Cert
                                                                        </button>
                                                                        <button title="Print Transcript"
                                                                            onClick={() => generateTranscript(student, data.course.title, data.modules, data.manual_assessments || [])}
                                                                            style={{ background: 'linear-gradient(135deg,#0f766e,#0d9488)', border: 'none', borderRadius: 5, padding: '3px 7px', cursor: 'pointer', color: '#fff', fontSize: '.63rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                                                            <i className="fas fa-file-alt" style={{ fontSize: '.6rem' }}></i> Report
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>

                                                    {data.modules.map(m => (
                                                        <>
                                                            {m.exams.map(e => (
                                                                <ScoreCell key={e.id} scoreData={student.scores[e.id]} passMark={e.pass_mark}
                                                                    onReset={() => setResetTarget({ userId: student.user_id, lessonId: e.id, studentName: student.name, examTitle: e.title })} />
                                                            ))}
                                                            <AvgCell key={`mavg-${m.id}`} avg={student.module_avgs[m.id]} />
                                                        </>
                                                    ))}
                                                    <AvgCell avg={student.course_avg} />

                                                    {/* Manual assessment score cells */}
                                                    {data.manual_assessments?.map((a, i) => {
                                                        const score  = student.manual_scores?.[a.id] ?? null;
                                                        const pct    = score !== null ? Math.round((score / parseFloat(a.max_score)) * 100) : null;
                                                        const bg     = pct === null ? 'transparent' : pct >= 70 ? '#f0fdf4' : pct >= 50 ? '#fffbeb' : '#fff5f5';
                                                        const fg     = pct === null ? '#cbd5e1'     : pct >= 70 ? '#15803d' : pct >= 50 ? '#b45309' : '#b91c1c';
                                                        return (
                                                            <td key={a.id} style={{ ...cell, textAlign: 'center', background: bg, borderLeft: i === 0 ? '3px solid #059669' : undefined }}>
                                                                {score !== null
                                                                    ? <><span style={{ color: fg, fontWeight: 700 }}>{score}</span><span style={{ display: 'block', fontSize: '.62rem', color: '#94a3b8' }}>{pct}%</span></>
                                                                    : <span style={{ color: '#d1d5db' }}>—</span>
                                                                }
                                                            </td>
                                                        );
                                                    })}
                                                    {data.manual_assessments?.length > 0 && (
                                                        <AvgCell avg={student.manual_avg ?? null} />
                                                    )}
                                                </tr>
                                            ))}

                                            {/* Class average row */}
                                            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                                <td style={{ ...cell, fontWeight: 700, color: '#475569', fontSize: '.78rem' }}>
                                                    <i className="fas fa-chart-bar" style={{ marginRight: 6, color: '#6366f1' }}></i>Class Average
                                                </td>
                                                {data.modules.map(m => (
                                                    <>
                                                        {m.exams.map(e => <AvgCell key={e.id} avg={data.exam_avgs[e.id]} isClass />)}
                                                        <AvgCell key={`mavg-${m.id}`} avg={data.module_avgs[m.id]} isClass />
                                                    </>
                                                ))}
                                                <AvgCell avg={data.course_avg} isClass />
                                                {data.manual_assessments?.map((a, i) => (
                                                    <td key={a.id} style={{ ...cell, textAlign: 'center', background: '#f0f4ff', fontWeight: 700, borderLeft: i === 0 ? '3px solid #059669' : undefined }}>
                                                        {data.manual_avgs?.[a.id] !== null && data.manual_avgs?.[a.id] !== undefined
                                                            ? <span style={{ color: '#047857' }}>{data.manual_avgs[a.id]}</span>
                                                            : <span style={{ color: '#cbd5e1' }}>—</span>
                                                        }
                                                    </td>
                                                ))}
                                                {data.manual_assessments?.length > 0 && (
                                                    <AvgCell avg={(() => {
                                                        const vals = filtered.map(s => s.manual_avg).filter(v => v !== null && v !== undefined);
                                                        return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : null;
                                                    })()} isClass />
                                                )}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Legend */}
                            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                                {[
                                    { bg: '#dcfce7', fg: '#16a34a', label: 'Passed' },
                                    { bg: '#fee2e2', fg: '#dc2626', label: 'Failed' },
                                    { bg: '#f0f4ff', fg: '#4f46e5', label: 'Average (class row)' },
                                    { label: '— = not attempted', fg: '#94a3b8', bg: '#fff', border: '1px solid #e2e8f0' },
                                ].map(({ bg, fg, label, border }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.72rem', color: '#64748b' }}>
                                        <span style={{ width: 14, height: 14, borderRadius: 4, background: bg, border, display: 'inline-block', flexShrink: 0 }}></span>
                                        <span style={{ color: fg, fontWeight: 600 }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>

        {resetTarget && (
            <ResetModal
                studentName={resetTarget.studentName}
                examTitle={resetTarget.examTitle}
                loading={resetLoading}
                onConfirm={confirmReset}
                onClose={() => setResetTarget(null)}
            />
        )}
        </>
    );
}
