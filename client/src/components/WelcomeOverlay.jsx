import React, { useState } from 'react';
import '../styles/WelcomeOverlay.css';

const STEPS = [
  {
    icon: '📸',
    heading: 'Study the photo',
    detail: 'Look for clues — signs, landscapes, architecture, vegetation',
  },
  {
    icon: '📍',
    heading: 'Drop a pin on the map',
    detail: 'Open the map at the bottom, then tap where you think it was taken',
  },
  {
    icon: '🌡️',
    heading: 'Get hot/cold feedback',
    detail: 'Narrow it down and keep guessing until you find the spot',
  },
];

function WLogo() {
  return (
    <svg viewBox="0 0 512 512" width="58" height="58" className="wo-logo-svg" aria-hidden="true">
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

function WelcomeOverlay() {
  const [phase, setPhase] = useState('visible'); // always show on every visit

  if (phase === 'gone') return null;

  const dismiss = () => setPhase('hiding');

  const handleAnimationEnd = (e) => {
    if (e.target === e.currentTarget && phase === 'hiding') {
      setPhase('gone');
    }
  };

  return (
    <div
      className={`wo-backdrop${phase === 'hiding' ? ' wo-hiding' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="wo-modal" role="dialog" aria-modal="true" aria-label="How to play">
        <div className="wo-header">
          <WLogo />
          <h1 className="wo-title">Whereabouts</h1>
          <p className="wo-tagline">The photo location guessing game</p>
        </div>

        <div className="wo-steps">
          {STEPS.map(({ icon, heading, detail }) => (
            <div className="wo-step" key={heading}>
              <span className="wo-step-icon" aria-hidden="true">{icon}</span>
              <div>
                <strong>{heading}</strong>
                <p>{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="wo-footer">
          <button className="wo-cta" onClick={dismiss}>
            Let's Play! 🎯
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeOverlay;
