import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/NavBar.css';

function NavBar() {
  const { user, logout, openAuth } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        📍 Whereabouts
      </Link>
      <div className="navbar-actions">
        {user ? (
          <>
            <span className="navbar-username">👤 {user.username}</span>
            <button className="navbar-btn navbar-btn-ghost" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <button className="navbar-btn navbar-btn-ghost" onClick={() => openAuth('login')}>
              Log in
            </button>
            <button className="navbar-btn navbar-btn-primary" onClick={() => openAuth('register')}>
              Register
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
