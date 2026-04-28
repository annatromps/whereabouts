import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="title">📍 Whereabouts</h1>
        <p className="subtitle">Upload a photo, mark the location, and challenge others to guess where it was taken!</p>

        <div className="button-group">
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            📸 Create Game
          </button>
        </div>

        <div className="how-it-works">
          <p className="how-it-works-label">How it works</p>
          <div className="features">
            <div className="feature">
              <div className="feature-left">
                <span className="feature-icon">🎯</span>
                <span className="step-number">01</span>
              </div>
              <div className="feature-right">
                <h3>Create</h3>
                <p>Upload a photo or snap one with your camera, then drop a pin on the map to mark the exact location</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-left">
                <span className="feature-icon">🌍</span>
                <span className="step-number">02</span>
              </div>
              <div className="feature-right">
                <h3>Share</h3>
                <p>Get a unique link and QR code to challenge your friends — no sign-up needed</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-left">
                <span className="feature-icon">🌡️</span>
                <span className="step-number">03</span>
              </div>
              <div className="feature-right">
                <h3>Guess</h3>
                <p>Place your guess on the map and get hot/cold feedback until you find the spot</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
