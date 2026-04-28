import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ThemedLoader from './ThemedLoader';
import '../styles/AuthModal.css';

function AuthModal() {
  const { modalOpen, modalTab, closeAuth, login, openAuth } = useAuth();
  const [tab, setTab] = useState(modalTab);
  const [fields, setFields] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync tab when parent changes it
  useEffect(() => {
    setTab(modalTab);
    setError('');
    setFields({ username: '', email: '', password: '' });
  }, [modalTab, modalOpen]);

  if (!modalOpen) return null;

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setFields({ username: '', email: '', password: '' });
  };

  const handleChange = (e) => {
    setFields(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = tab === 'login'
      ? { email: fields.email, password: fields.password }
      : { username: fields.username, email: fields.email, password: fields.password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }
      login(data.token);
      closeAuth();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) closeAuth();
  };

  return (
    <div className="auth-backdrop" onClick={handleBackdropClick}>
      <div className="auth-modal">
        <button className="auth-close" onClick={closeAuth} aria-label="Close">✕</button>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
            type="button"
          >
            Log in
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => switchTab('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {tab === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                name="username"
                type="text"
                value={fields.username}
                onChange={handleChange}
                placeholder="Your display name"
                autoComplete="username"
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              value={fields.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              value={fields.password}
              onChange={handleChange}
              placeholder={tab === 'register' ? 'At least 6 characters' : ''}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <><ThemedLoader variant="dots" />Please wait…</> : tab === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {tab === 'login' ? (
            <>No account? <button type="button" className="auth-link" onClick={() => switchTab('register')}>Register</button></>
          ) : (
            <>Already have an account? <button type="button" className="auth-link" onClick={() => switchTab('login')}>Log in</button></>
          )}
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
