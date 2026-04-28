import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] React crash:', error, info?.componentStack);
    // Write to the persistent debug panel if it exists
    try {
      const ents = document.getElementById('wa-debug-entries');
      if (ents) {
        const row = document.createElement('div');
        row.style.cssText = 'color:#f87171;font-weight:700;font-size:0.72rem;line-height:1.5;word-break:break-all;';
        row.textContent = `REACT CRASH: ${error.message}`;
        ents.appendChild(row);
        const p = document.getElementById('wa-debug');
        if (p) p.classList.add('wa-visible');
      }
    } catch { /* never let the boundary itself throw */ }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="container">
        <div className="error-card card">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message ?? 'An unexpected error occurred.'}</p>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '20px' }}>
            The debug log at the bottom of the screen may have more details.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              ↩ Try again
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { window.location.href = '/'; }}
            >
              ← Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
