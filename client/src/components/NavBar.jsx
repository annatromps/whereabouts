import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/NavBar.css';

function WLogo() {
  return (
    <svg viewBox="0 0 512 512" width="26" height="26"
         style={{ borderRadius: '22%', display: 'block', flexShrink: 0 }}
         aria-hidden="true">
      <rect width="512" height="512" rx="96" fill="#FFCCD6"/>
      <polyline
        points="68,90 154,296 256,194 358,296 444,90"
        fill="none"
        stroke="#E44947"
        strokeWidth="68"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavBar() {
  const { user, logout, openAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleNav = (path) => { navigate(path); close(); };
  const handleAuth = (tab) => { openAuth(tab); close(); };
  const handleLogout = () => { logout(); close(); };

  return (
    <nav className="navbar" ref={navRef}>
      <Link to="/" className="navbar-brand" onClick={close}>
        <WLogo />
        <span>Whereabouts</span>
      </Link>

      <button
        className="navbar-burger"
        onClick={() => setOpen(prev => !prev)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
            <rect width="20" height="2" rx="1" fill="currentColor"/>
            <rect y="6" width="20" height="2" rx="1" fill="currentColor"/>
            <rect y="12" width="20" height="2" rx="1" fill="currentColor"/>
          </svg>
        )}
      </button>

      {open && (
        <div className="nav-menu" role="menu">
          {user ? (
            <>
              <div className="nav-menu-header">👤 {user.username}</div>
              <div className="nav-menu-divider" />
              <button className="nav-menu-item" onClick={() => handleNav('/profile')}>My Profile</button>
              <button className="nav-menu-item" onClick={() => handleNav('/submissions')}>My Submissions</button>
              <button className="nav-menu-item" onClick={() => handleNav('/leaderboard')}>Leaderboard</button>
              <div className="nav-menu-divider" />
              <button className="nav-menu-item nav-menu-item--muted" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <p className="nav-menu-tagline">Log in to save your scores and track submissions</p>
              <div className="nav-menu-divider" />
              <button className="nav-menu-item" onClick={() => handleAuth('login')}>Log in</button>
              <button className="nav-menu-item nav-menu-item--accent" onClick={() => handleAuth('register')}>Create account</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default NavBar;
