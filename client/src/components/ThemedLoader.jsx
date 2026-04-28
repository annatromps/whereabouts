import React, { useState, useEffect } from 'react';
import '../styles/ThemedLoader.css';

const GLOBE_MESSAGES = [
  'Scanning the globe…',
  'Checking coordinates…',
  'Zooming in…',
  'Triangulating position…',
  'Reading the map…',
  'Almost there…',
];

function ThemedLoader({ variant = 'fullscreen', message }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (variant !== 'fullscreen') return;
    const id = setInterval(() => {
      setMsgIdx(i => (i + 1) % GLOBE_MESSAGES.length);
    }, 2000);
    return () => clearInterval(id);
  }, [variant]);

  if (variant === 'fullscreen') {
    return (
      <div className="tl-fullscreen">
        <div className="tl-globe">🌍</div>
        <p className="tl-globe-message" key={msgIdx}>
          {message ?? GLOBE_MESSAGES[msgIdx]}
        </p>
      </div>
    );
  }

  if (variant === 'pin') {
    return (
      <div className="tl-pin-wrap">
        <div className="tl-pin">📍</div>
        <div className="tl-pin-shadow" />
        <p className="tl-pin-msg">{message ?? 'Processing…'}</p>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <span className="tl-dots" aria-label="Loading">
        <span /><span /><span />
      </span>
    );
  }

  return null;
}

export default ThemedLoader;
