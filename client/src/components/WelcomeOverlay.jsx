import React, { useState } from 'react';
import '../styles/WelcomeOverlay.css';

const STORAGE_KEY = 'wa_seen_intro';

const STEPS = [
  {
    icon: '📸',
    heading: 'Study the photo',
    detail: 'Look for clues — signs, landscapes, architecture, vegetation',
  },
  {
    icon: '📍',
    heading: 'Drop a pin on the map',
    detail: 'Tap anywhere you think the photo was taken',
  },
  {
    icon: '🌡️',
    heading: 'Get hot/cold feedback',
    detail: 'Narrow it down and keep guessing until you find the spot',
  },
];

function WelcomeOverlay() {
  // 'visible' | 'hiding' | 'gone'
  const [phase, setPhase] = useState(() =>
    localStorage.getItem(STORAGE_KEY) ? 'gone' : 'visible'
  );

  if (phase === 'gone') return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setPhase('hiding');
  };

  const handleAnimationEnd = (e) => {
    // Only act on the backdrop's own animation, not bubbled events from children
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
          <div className="wo-logo" aria-hidden="true">W</div>
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
