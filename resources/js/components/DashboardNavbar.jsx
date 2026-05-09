import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardNavbar({ page }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const dropRef = useRef(null);

    const initials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    const dateStr = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    const toggleSidebar = () => {
        const next = !document.body.classList.contains('sidebar-collapsed');
        document.body.classList.toggle('sidebar-collapsed', next);
        localStorage.setItem('sidebar_collapsed', String(next));
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
    };

    const handleLogout = async () => {
        setOpen(false);
        await logout();
        navigate('/login');
    };

    /* Close on outside click */
    useEffect(() => {
        const handler = e => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="db-navbar">
            <div className="db-navbar-left">
                {/* Sidebar toggle */}
                <button
                    onClick={toggleSidebar}
                    title="Toggle sidebar"
                    style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: '#f1f5f9', border: '1.5px solid #e4e7f0',
                        color: '#64748b', cursor: 'pointer', fontSize: '.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: 12, transition: 'all .2s', flexShrink: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#e8edf5'; e.currentTarget.style.color = '#081f4e'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                >
                    <i className="fas fa-bars"></i>
                </button>

                <div className="db-navbar-breadcrumb">
                    <Link to="/dashboard"><i className="fas fa-home"></i></Link>
                    <i className="fas fa-chevron-right"></i>
                    <span>{page}</span>
                </div>
            </div>

            <div className="db-navbar-right">
                <div className="db-navbar-date">
                    <i className="fas fa-calendar-alt" style={{ marginRight: 6, color: '#fe730c' }}></i>
                    {dateStr}
                </div>
                <div className="db-navbar-divider"></div>

                {user && (
                    <div className="db-navbar-user-wrap" ref={dropRef}>
                        <button
                            className={`db-navbar-user${open ? ' open' : ''}`}
                            onClick={() => setOpen(s => !s)}
                            aria-haspopup="true"
                            aria-expanded={open}
                        >
                            <div className="db-navbar-user-info">
                                <strong>{user.name}</strong>
                                <small>{user?.role?.name ?? 'Super Admin'}</small>
                            </div>
                            <div className="db-navbar-avatar">{initials}</div>
                            <i className={`fas fa-chevron-down db-navbar-chevron${open ? ' rotated' : ''}`}></i>
                        </button>

                        {open && (
                            <div className="db-navbar-dropdown">
                                <div className="db-navbar-dropdown-header">
                                    <div className="db-navbar-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>{initials}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#081f4e' }}>{user.name}</div>
                                        <div style={{ fontSize: '.72rem', color: '#94a3b8' }}>{user.email}</div>
                                    </div>
                                </div>
                                <div className="db-navbar-dropdown-divider"></div>
                                <Link
                                    to="/dashboard/profile"
                                    className="db-navbar-dropdown-item"
                                    onClick={() => setOpen(false)}
                                >
                                    <i className="fas fa-user-cog"></i>
                                    My Profile
                                </Link>
                                <div className="db-navbar-dropdown-divider"></div>
                                <button className="db-navbar-dropdown-item danger" onClick={handleLogout}>
                                    <i className="fas fa-sign-out-alt"></i>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
