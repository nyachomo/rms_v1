import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardSidebar from '../components/DashboardSidebar';
import DashboardNavbar from '../components/DashboardNavbar';
import AccessDenied from '../components/AccessDenied';
import zoomCssUrl from '@zoom/meetingsdk/dist/ui/zoom-meetingsdk.css?url';

function Toast({ toast }) {
    if (!toast) return null;
    const isErr = toast.type === 'error';
    return (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: isErr ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isErr ? '#fca5a5' : '#86efac'}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)', maxWidth: 380, fontFamily: 'Poppins,sans-serif' }}>
            <i className={`fas ${isErr ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ color: isErr ? '#dc2626' : '#16a34a', fontSize: '1.1rem', flexShrink: 0 }}></i>
            <span style={{ fontSize: '.83rem', color: isErr ? '#991b1b' : '#15803d' }}>{toast.message}</span>
        </div>
    );
}

/* ── Zoom Meeting Modal — joins as attendee (role 0) ── */
function ZoomMeetingModal({ cls, onClose, token }) {
    const clientRef             = useRef(null);
    const [status, setStatus]   = useState('connecting');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = zoomCssUrl;
        document.head.appendChild(link);
        return () => { if (document.head.contains(link)) document.head.removeChild(link); };
    }, []);

    useEffect(() => {
        if (!cls) return;
        let active = true;

        const init = async () => {
            try {
                // role=0 → attendee
                const res  = await fetch(`/api/techsphere-classes/${cls.id}/meeting/signature?role=0`, {
                    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                });
                const data = await res.json();

                if (!res.ok || !data.signature) {
                    throw new Error(data.message || 'Could not get meeting signature.');
                }

                if (!active) return;

                const { default: ZoomMtgEmbedded } = await import('@zoom/meetingsdk/embedded');

                if (!active) return;

                const client = ZoomMtgEmbedded.createClient();
                clientRef.current = client;

                const el = document.getElementById('zoomSDKRootStudent');
                if (!el) throw new Error('Meeting container not found in DOM.');

                await client.init({
                    zoomAppRoot:  el,
                    language:     'en-US',
                    patchJsMedia: true,
                    assetPath:    `${window.location.origin}/zoom/lib/av`,
                });

                if (!active) return;

                await client.join({
                    signature:     data.signature,
                    sdkKey:        data.sdk_key,
                    meetingNumber: data.meeting_number,
                    password:      data.password ?? '',
                    userName:      'Student',
                    userEmail:     data.host_email,
                });

                if (active) setStatus('ready');
            } catch (err) {
                if (active) {
                    setErrorMsg(err?.reason ?? err?.message ?? JSON.stringify(err) ?? 'Failed to join meeting.');
                    setStatus('error');
                }
            }
        };

        init();

        return () => {
            active = false;
            try { clientRef.current?.leaveMeeting(); } catch {}
        };
    }, [cls, token]);

    if (!cls) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', flexDirection: 'column', background: '#1c1c2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 24px', background: '#081f4e', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-video" style={{ color: '#60a5fa', fontSize: '1rem' }}></i>
                    </div>
                    <div>
                        <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '.95rem', color: '#fff' }}>{cls.name}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {cls.zoom_join_url && (
                        <a href={cls.zoom_join_url} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600, textDecoration: 'none' }}>
                            <i className="fas fa-external-link-alt" style={{ fontSize: '.7rem' }}></i> Open in Zoom
                        </a>
                    )}
                    <button onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 8, background: 'rgba(220,38,38,.25)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
                        <i className="fas fa-times"></i> Close
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {status !== 'ready' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, zIndex: 20, background: '#1c1c2e' }}>
                        {status === 'connecting' ? (
                            <>
                                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: '#fe730c' }}></i>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ color: 'rgba(255,255,255,.8)', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', fontWeight: 600, margin: '0 0 6px' }}>Joining class…</p>
                                    <p style={{ color: 'rgba(255,255,255,.35)', fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', margin: 0 }}>Loading Zoom SDK, allow camera &amp; microphone when prompted</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ width: 72, height: 72, borderRadius: 50, background: 'rgba(220,38,38,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '1.8rem', color: '#f87171' }}></i>
                                </div>
                                <div style={{ textAlign: 'center', maxWidth: 440 }}>
                                    <p style={{ color: '#fca5a5', fontFamily: 'Poppins,sans-serif', fontSize: '.95rem', fontWeight: 700, margin: '0 0 8px' }}>Could not join class</p>
                                    <p style={{ color: 'rgba(255,255,255,.4)', fontFamily: 'Poppins,sans-serif', fontSize: '.8rem', margin: '0 0 20px' }}>{errorMsg}</p>
                                    {cls.zoom_join_url && (
                                        <a href={cls.zoom_join_url} target="_blank" rel="noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, background: '#1d4ed8', color: '#fff', fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', fontWeight: 700, textDecoration: 'none' }}>
                                            <i className="fas fa-external-link-alt"></i> Open in Zoom App instead
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
                <div id="zoomSDKRootStudent" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
            </div>
        </div>
    );
}

export default function MyTechsphereClasses() {
    const { token, can } = useAuth();

    const [classes, setClasses]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [toast, setToast]       = useState(null);
    const [zoomCls, setZoomCls]   = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        setLoading(true);
        fetch('/api/techsphere-classes/my-classes', {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
            .then(r => r.json())
            .then(d => setClasses(Array.isArray(d) ? d : []))
            .catch(() => showToast('Failed to load your classes.', 'error'))
            .finally(() => setLoading(false));
    }, [token]);

    if (!can('techsphere_classes', 'join')) {
        return (
            <div className="db-wrap">
                <DashboardSidebar />
                <div className="db-main">
                    <DashboardNavbar page="My Classes" />
                    <div className="db-content"><AccessDenied /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="db-wrap">
            <DashboardSidebar />
            <div className="db-main">
                <DashboardNavbar page="My Classes" />
                <div className="db-content">
                    <Toast toast={toast} />

                    <div className="db-topbar">
                        <div>
                            <h1 className="db-page-title"><i className="fas fa-laptop-code"></i> My Classes</h1>
                            <p className="db-page-sub">Your enrolled Techsphere online classes</p>
                        </div>
                    </div>

                    {/* Class cards */}
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 14 }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#fe730c' }}></i>
                            <p style={{ color: '#94a3b8', fontFamily: 'Poppins,sans-serif', fontSize: '.9rem', margin: 0 }}>Loading your classes…</p>
                        </div>
                    ) : classes.length === 0 ? (
                        <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #e8ecf4', padding: '60px 20px', textAlign: 'center' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <i className="fas fa-laptop-code" style={{ fontSize: '1.6rem', color: '#1d4ed8' }}></i>
                            </div>
                            <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: '1rem', fontWeight: 700, color: '#081f4e', margin: '0 0 6px' }}>No classes yet</p>
                            <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.83rem', color: '#94a3b8', margin: 0 }}>You have not been enrolled in any Techsphere classes.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                            {classes.map(cls => {
                                const isActive  = cls.status === 'active';
                                const hasZoom   = !!cls.zoom_meeting_id;
                                const teachers  = cls.teachers ?? [];

                                return (
                                    <div key={cls.id} style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #e8ecf4', overflow: 'hidden', boxShadow: '0 2px 12px rgba(8,31,78,.05)', display: 'flex', flexDirection: 'column' }}>
                                        {/* Card header */}
                                        <div style={{ background: 'linear-gradient(135deg,#081f4e,#0d2d6b)', padding: '20px 22px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className="fas fa-laptop-code" style={{ color: '#93c5fd', fontSize: '1.1rem' }}></i>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 700, fontSize: '1rem', color: '#fff', lineHeight: 1.3 }}>{cls.name}</div>
                                                {cls.description && (
                                                    <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.72rem', color: 'rgba(255,255,255,.55)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                        {cls.description}
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: isActive ? 'rgba(16,185,129,.2)' : 'rgba(100,116,139,.2)', color: isActive ? '#6ee7b7' : '#cbd5e1', fontSize: '.68rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                <i className={isActive ? 'fas fa-circle' : 'fas fa-archive'} style={{ fontSize: '.4rem' }}></i>
                                                {isActive ? 'Active' : 'Archived'}
                                            </span>
                                        </div>

                                        {/* Card body */}
                                        <div style={{ padding: '16px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {/* Teachers */}
                                            {teachers.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <i className="fas fa-chalkboard-teacher" style={{ color: '#64748b', fontSize: '.8rem', flexShrink: 0 }}></i>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                                        {teachers.map(t => (
                                                            <span key={t.id} style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.75rem', color: '#374151', background: '#f1f5f9', padding: '2px 9px', borderRadius: 20 }}>
                                                                {t.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Venue */}
                                            {cls.venue && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <i className="fas fa-map-marker-alt" style={{ color: '#64748b', fontSize: '.8rem', flexShrink: 0 }}></i>
                                                    <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', color: '#374151' }}>{cls.venue}</span>
                                                </div>
                                            )}

                                            {/* Capacity */}
                                            {cls.capacity && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <i className="fas fa-users" style={{ color: '#64748b', fontSize: '.8rem', flexShrink: 0 }}></i>
                                                    <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: '.78rem', color: '#374151' }}>Capacity: {cls.capacity}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card footer — Join button */}
                                        <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9' }}>
                                            {hasZoom ? (
                                                <button
                                                    onClick={() => setZoomCls(cls)}
                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', border: 'none', fontFamily: 'Poppins,sans-serif', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer' }}>
                                                    <i className="fas fa-video"></i> Join Class Meeting
                                                </button>
                                            ) : (
                                                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 10, background: '#f8fafc', border: '1.5px solid #e8ecf4', fontFamily: 'Poppins,sans-serif', fontSize: '.82rem', color: '#94a3b8' }}>
                                                    <i className="fas fa-clock"></i> No meeting scheduled yet
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {zoomCls && <ZoomMeetingModal cls={zoomCls} onClose={() => setZoomCls(null)} token={token} />}
        </div>
    );
}
