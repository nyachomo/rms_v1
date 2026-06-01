import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../components/AccessDenied';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

const INIT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
</head>
<body>

  <h1>Hello, World! 🌍</h1>
  <p>Edit the <strong>HTML</strong>, <strong>CSS</strong> and
     <strong>JS</strong> tabs, then click <em>Run</em>.</p>

  <div class="card">
    <h2>Interactive Card</h2>
    <p id="counter-text">You haven't clicked yet.</p>
    <button id="btn">Click Me</button>
  </div>

</body>
</html>`;

const INIT_CSS = `/* --- Base styles --- */
body {
  font-family: Arial, sans-serif;
  padding: 30px;
  background: #f0f2f8;
  color: #333;
}

h1 { color: #081f4e; margin-bottom: 8px; }
p  { color: #555;    margin-bottom: 20px; }

/* --- Card component --- */
.card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  max-width: 380px;
  box-shadow: 0 4px 16px rgba(0,0,0,.1);
}

.card h2 { color: #081f4e; margin-top: 0; }

button {
  background: #fe730c;
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 8px;
  transition: background .2s, transform .15s;
}

button:hover { background: #d9600a; }`;

const INIT_JS = `// JavaScript is live inside the preview!
const btn = document.getElementById('btn');
const text = document.getElementById('counter-text');
let clicks = 0;

btn.addEventListener('click', () => {
  clicks++;
  text.textContent =
    \`You clicked \${clicks} time\${clicks === 1 ? '' : 's'} 🎉\`;
  btn.style.transform = 'scale(1.08)';
  setTimeout(() => (btn.style.transform = ''), 150);
});`;

function buildSrcDoc(htmlCode, cssCode, jsCode) {
    let doc = htmlCode;

    // Inject CSS into <head>
    if (doc.includes('</head>')) {
        doc = doc.replace('</head>', `<style>\n${cssCode}\n</style>\n</head>`);
    } else {
        doc = `<style>\n${cssCode}\n</style>\n` + doc;
    }

    // Inject JS before </body>
    if (doc.includes('</body>')) {
        doc = doc.replace('</body>', `<script>\n${jsCode}\n<\/script>\n</body>`);
    } else {
        doc = doc + `\n<script>\n${jsCode}\n<\/script>`;
    }

    return doc;
}

const TABS = [
    { id: 'html', label: 'HTML', icon: 'fa-code',        color: '#e34c26', ext: html() },
    { id: 'css',  label: 'CSS',  icon: 'fa-paint-brush', color: '#264de4', ext: css() },
    { id: 'js',   label: 'JS',   icon: 'fa-bolt',        color: '#f0db4f', ext: javascript() },
];

const PANEL_HEADER = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 14px',
    background: '#161b22',
    borderBottom: '1px solid #30363d',
    flexShrink: 0,
    userSelect: 'none',
};

const INIT_PYTHON = `# Python Playground
# Powered by Pyodide (runs in your browser)

print("Hello from Python! 🐍")

# Statistics example
data = [85, 92, 78, 95, 88, 76, 91, 84, 89, 93]
mean = sum(data) / len(data)
data_sorted = sorted(data)
n = len(data_sorted)
median = (data_sorted[n//2 - 1] + data_sorted[n//2]) / 2 if n % 2 == 0 else data_sorted[n//2]

print(f"\\nStudent Scores: {data}")
print(f"Mean:   {mean:.2f}")
print(f"Median: {median:.2f}")
print(f"Min:    {min(data)}, Max: {max(data)}")
print(f"Range:  {max(data) - min(data)}")
`;

const INIT_R = `# R Playground
# Powered by WebR (runs in your browser)

cat("Hello from R! 📊\\n\\n")

# Statistics example
scores <- c(85, 92, 78, 95, 88, 76, 91, 84, 89, 93)
cat("Student Scores:", scores, "\\n")
cat("Mean:  ", round(mean(scores), 2), "\\n")
cat("Median:", median(scores), "\\n")
cat("SD:    ", round(sd(scores), 2), "\\n")
cat("Min:", min(scores), "  Max:", max(scores), "\\n")
cat("\\nSummary:\\n")
print(summary(scores))
`;

export default function CodePractice({ initialMode = 'web' }) {
    const { token, loading: authLoading, can } = useAuth();
    const navigate = useNavigate();

    /* ── Web (HTML/CSS/JS) state ── */
    const [htmlCode,  setHtmlCode]  = useState(INIT_HTML);
    const [cssCode,   setCssCode]   = useState(INIT_CSS);
    const [jsCode,    setJsCode]    = useState(INIT_JS);
    const [srcDoc,    setSrcDoc]    = useState(() => buildSrcDoc(INIT_HTML, INIT_CSS, INIT_JS));
    const [autoRun,   setAutoRun]   = useState(false);
    const [activeTab, setActiveTab] = useState('html');

    /* ── Python / R state ── */
    const [mode,        setMode]        = useState(initialMode);
    const [pythonCode,  setPythonCode]  = useState(INIT_PYTHON);
    const [rCode,       setRCode]       = useState(INIT_R);
    const [output,      setOutput]      = useState([]);
    const [running,     setRunning]     = useState(false);
    const pyodideRef = useRef(null);
    const webRRef    = useRef(null);

    const [toast, setToast] = useState(null);

    useEffect(() => { if (!authLoading && !token) navigate('/login'); }, [authLoading, token]);
    useEffect(() => { setMode(initialMode); setOutput([]); }, [initialMode]);

    useEffect(() => {
        if (!autoRun || mode !== 'web') return;
        const t = setTimeout(() => setSrcDoc(buildSrcDoc(htmlCode, cssCode, jsCode)), 700);
        return () => clearTimeout(t);
    }, [htmlCode, cssCode, jsCode, autoRun, mode]);

    const showToast = (msg, color = '#238636') => {
        setToast({ msg, color });
        setTimeout(() => setToast(null), 2200);
    };

    const runWeb = () => {
        setSrcDoc(buildSrcDoc(htmlCode, cssCode, jsCode));
        showToast('Preview updated!');
    };

    const runPython = async () => {
        setRunning(true);
        setOutput([{ type: 'info', text: '▶  Running Python…' }]);
        try {
            if (!pyodideRef.current) {
                setOutput(o => [...o, { type: 'info', text: '⏳  Loading Python runtime (first run ~10s)…' }]);
                await new Promise((resolve, reject) => {
                    if (document.querySelector('script[data-pyodide]')) { resolve(); return; }
                    const s = document.createElement('script');
                    s.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.4/full/pyodide.js';
                    s.setAttribute('data-pyodide', '1');
                    s.onload = resolve; s.onerror = reject;
                    document.head.appendChild(s);
                });
                pyodideRef.current = await window.loadPyodide();
            }
            const py  = pyodideRef.current;
            const out = [];
            py.setStdout({ batched: t => out.push({ type: 'stdout', text: t }) });
            py.setStderr({ batched: t => out.push({ type: 'stderr', text: t }) });
            try { await py.runPythonAsync(pythonCode); }
            catch (e) { out.push({ type: 'stderr', text: e.message }); }
            setOutput(out.length ? out : [{ type: 'info', text: '✓  Done (no output)' }]);
        } catch (e) {
            setOutput([{ type: 'stderr', text: `Failed to load Python: ${e.message}` }]);
        } finally { setRunning(false); }
    };

    const runR = async () => {
        setRunning(true);
        setOutput([{ type: 'info', text: '▶  Running R…' }]);
        try {
            if (!webRRef.current) {
                setOutput(o => [...o, { type: 'info', text: '⏳  Loading R runtime (first run ~15s)…' }]);
                const { WebR } = await import(/* @vite-ignore */ 'https://webr.r-wasm.org/v0.4.2/webr.mjs');
                const webR = new WebR();
                await webR.init();
                webRRef.current = webR;
            }
            const webR = webRRef.current;
            const out  = [];
            await webR.writeConsole(rCode + '\n');
            const deadline = Date.now() + 30000;
            while (Date.now() < deadline) {
                const msg = await Promise.race([
                    webR.read(),
                    new Promise(r => setTimeout(() => r({ type: 'timeout' }), 5000)),
                ]);
                if (!msg || msg.type === 'timeout' || msg.type === 'prompt') break;
                if (msg.type === 'stdout') out.push({ type: 'stdout', text: msg.data });
                else if (msg.type === 'stderr') out.push({ type: 'stderr', text: msg.data });
            }
            setOutput(out.length ? out : [{ type: 'info', text: '✓  Done (no output)' }]);
        } catch (e) {
            setOutput([{ type: 'stderr', text: `Error: ${e.message}` }]);
        } finally { setRunning(false); }
    };

    const handleRun = () => {
        if (mode === 'python') runPython();
        else if (mode === 'r') runR();
        else runWeb();
    };

    const handleReset = () => {
        if (mode === 'python') { setPythonCode(INIT_PYTHON); setOutput([]); }
        else if (mode === 'r') { setRCode(INIT_R); setOutput([]); }
        else {
            setHtmlCode(INIT_HTML); setCssCode(INIT_CSS); setJsCode(INIT_JS);
            setSrcDoc(buildSrcDoc(INIT_HTML, INIT_CSS, INIT_JS));
        }
        showToast('Reset to starter code.', '#6e40c9');
    };

    const codeForTab    = { html: htmlCode, css: cssCode, js: jsCode };
    const setCodeForTab = { html: setHtmlCode, css: setCssCode, js: setJsCode };
    const activeTabMeta = TABS.find(t => t.id === activeTab);

    const MODES = [
        { id: 'web',    label: 'Web',    icon: 'fa-globe',     color: '#e34c26', desc: 'HTML · CSS · JS' },
        { id: 'python', label: 'Python', icon: 'fa-code',      color: '#3572A5', desc: 'Python 3 · Pyodide' },
        { id: 'r',      label: 'R',      icon: 'fa-chart-bar', color: '#198CE7', desc: 'R · WebR' },
    ];
    const activeMode = MODES.find(m => m.id === mode);

    if (authLoading) return (
        <div style={{ minHeight: '100vh', background: '#081f4e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#fe730c' }}></i>
        </div>
    );

    if (!can('learning', 'view')) return <div className="db-content"><AccessDenied /></div>;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d1117', minWidth: 0 }}>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: '#161b22', borderBottom: '1px solid #30363d', flexShrink: 0 }}>
                <i className="fas fa-terminal" style={{ color: '#fe730c' }}></i>

                {/* Mode switcher */}
                <div style={{ display: 'flex', gap: 2, background: '#0d1117', borderRadius: 8, padding: 3 }}>
                    {MODES.map(m => (
                        <button key={m.id} onClick={() => { setMode(m.id); setOutput([]); }}
                            style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: mode === m.id ? m.color : 'transparent', color: mode === m.id ? '#fff' : '#8b949e', fontFamily: 'Poppins,sans-serif', fontSize: '.74rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all .15s' }}>
                            <i className={`fas ${m.icon}`} style={{ fontSize: '.65rem' }}></i>{m.label}
                        </button>
                    ))}
                </div>

                <span style={{ color: '#484f58', fontSize: '.72rem', flex: 1 }}>{activeMode?.desc}</span>

                {/* Auto-run (web only) */}
                {mode === 'web' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#8b949e', fontSize: '.78rem' }}>
                        <div role="switch" aria-checked={autoRun} onClick={() => setAutoRun(v => !v)}
                            style={{ width: 34, height: 18, borderRadius: 9, background: autoRun ? '#fe730c' : '#30363d', position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
                            <div style={{ position: 'absolute', top: 2, left: autoRun ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
                        </div>
                        Auto-run
                    </label>
                )}

                {/* Clear output (Python/R) */}
                {(mode === 'python' || mode === 'r') && output.length > 0 && (
                    <button onClick={() => setOutput([])}
                        style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: '.75rem', fontFamily: 'Poppins,sans-serif', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fas fa-eraser" style={{ fontSize: '.65rem' }}></i> Clear
                    </button>
                )}

                <button onClick={handleReset}
                    style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: '.78rem', fontFamily: 'Poppins,sans-serif', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .18s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b949e'; e.currentTarget.style.color = '#c9d1d9'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e'; }}>
                    <i className="fas fa-undo" style={{ fontSize: '.7rem' }}></i> Reset
                </button>

                <button onClick={handleRun} disabled={running}
                    style={{ background: running ? '#30363d' : '#fe730c', border: 'none', color: '#fff', borderRadius: 6, padding: '5px 18px', cursor: running ? 'not-allowed' : 'pointer', fontSize: '.82rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif', display: 'flex', alignItems: 'center', gap: 7, boxShadow: running ? 'none' : '0 2px 8px rgba(254,115,12,.35)', transition: 'opacity .15s' }}>
                    <i className={`fas fa-${running ? 'spinner fa-spin' : 'play'}`} style={{ fontSize: '.7rem' }}></i>
                    {running ? 'Running…' : 'Run'}
                </button>
            </div>

            {/* ── WEB mode ── */}
            {mode === 'web' && (
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                    {/* Left: tabbed editor */}
                    <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: '2px solid #30363d', minWidth: 0 }}>
                        <div style={{ display: 'flex', background: '#161b22', borderBottom: '1px solid #30363d', flexShrink: 0 }}>
                            {TABS.map(tab => {
                                const active = activeTab === tab.id;
                                return (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                        style={{ background: active ? '#0d1117' : 'transparent', border: 'none', borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent', color: active ? '#c9d1d9' : '#8b949e', padding: '9px 22px', cursor: 'pointer', fontSize: '.8rem', fontFamily: 'Poppins,sans-serif', fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: 7, transition: 'all .15s' }}>
                                        <i className={`fas ${tab.icon}`} style={{ color: tab.color, fontSize: '.75rem' }}></i>{tab.label}
                                    </button>
                                );
                            })}
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: 14, color: '#484f58', fontSize: '.68rem' }}>Ctrl+Enter to run</div>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                            <CodeMirror key={activeTab} value={codeForTab[activeTab]} height="100%" extensions={[activeTabMeta.ext]} theme={oneDark}
                                onChange={setCodeForTab[activeTab]} style={{ fontSize: 13, height: '100%' }}
                                basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, bracketMatching: true }}
                                onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); setSrcDoc(buildSrcDoc(htmlCode, cssCode, jsCode)); showToast('Preview updated!'); } }} />
                        </div>
                    </div>
                    {/* Right: preview */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ ...PANEL_HEADER, gap: 10 }}>
                            <div style={{ display: 'flex', gap: 5, marginRight: 6 }}>{['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}</div>
                            <i className="fas fa-eye" style={{ color: '#8b949e', fontSize: '.78rem' }}></i>
                            <span style={{ color: '#8b949e', fontSize: '.78rem', fontWeight: 600 }}>Preview</span>
                            {autoRun && <span style={{ marginLeft: 'auto', fontSize: '.68rem', color: '#fe730c', display: 'flex', alignItems: 'center', gap: 4 }}><i className="fas fa-circle" style={{ fontSize: '.45rem' }}></i> live</span>}
                        </div>
                        <iframe key={srcDoc} srcDoc={srcDoc} title="Live Preview" sandbox="allow-scripts" style={{ flex: 1, border: 'none', background: '#fff', width: '100%' }} />
                    </div>
                </div>
            )}

            {/* ── PYTHON / R mode (shared layout) ── */}
            {(mode === 'python' || mode === 'r') && (
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                    {/* Left: code editor */}
                    <div style={{ width: '55%', display: 'flex', flexDirection: 'column', borderRight: '2px solid #30363d', minWidth: 0 }}>
                        <div style={{ ...PANEL_HEADER }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: mode === 'python' ? '#3572A5' : '#198CE7', flexShrink: 0 }}></span>
                            <span style={{ color: '#8b949e', fontSize: '.73rem' }}>
                                {mode === 'python' ? 'Python 3 · Pyodide (WebAssembly)' : 'R · WebR (WebAssembly)'}
                            </span>
                            <span style={{ marginLeft: 'auto', color: '#484f58', fontSize: '.68rem' }}>Ctrl+Enter to run</span>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                            {mode === 'python' && (
                                <CodeMirror value={pythonCode} height="100%" extensions={[python()]} theme={oneDark}
                                    onChange={setPythonCode} style={{ fontSize: 13, height: '100%' }}
                                    basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, bracketMatching: true }}
                                    onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runPython(); } }} />
                            )}
                            {mode === 'r' && (
                                <CodeMirror value={rCode} height="100%" extensions={[javascript()]} theme={oneDark}
                                    onChange={setRCode} style={{ fontSize: 13, height: '100%' }}
                                    basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: false, bracketMatching: true }}
                                    onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runR(); } }} />
                            )}
                        </div>
                    </div>

                    {/* Right: console output */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#010409' }}>
                        <div style={{ ...PANEL_HEADER }}>
                            <div style={{ display: 'flex', gap: 5, marginRight: 6 }}>{['#ff5f57','#ffbd2e','#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}</div>
                            <i className="fas fa-terminal" style={{ color: mode === 'python' ? '#3572A5' : '#198CE7', fontSize: '.78rem' }}></i>
                            <span style={{ color: '#8b949e', fontSize: '.78rem', fontWeight: 600 }}>Console Output</span>
                            {running && <span style={{ marginLeft: 'auto', fontSize: '.68rem', color: '#fe730c', display: 'flex', alignItems: 'center', gap: 4 }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '.6rem' }}></i> Running…</span>}
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', fontFamily: '"Fira Code","Cascadia Code",monospace', fontSize: '12.5px', lineHeight: 1.7 }}>
                            {output.length === 0
                                ? <span style={{ color: '#30363d' }}>▶  Click <strong style={{ color: '#fe730c' }}>Run</strong> (or Ctrl+Enter) to execute</span>
                                : output.map((o, i) => (
                                    <div key={i} style={{ color: o.type === 'stderr' ? '#f87171' : o.type === 'info' ? '#60a5fa' : '#4ade80', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{o.text}</div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: 28, right: 28, background: toast.color, color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: '.82rem', fontFamily: 'Poppins,sans-serif', boxShadow: '0 4px 16px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', gap: 8, zIndex: 9999 }}>
                    <i className="fas fa-check-circle"></i>{toast.msg}
                </div>
            )}
        </div>
    );
}
