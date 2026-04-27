import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="title">🎮 PhotoGuessr</h1>
        <p className="subtitle">Upload a photo, mark the location, and challenge others to guess where it was taken!</p>

        <div className="button-group">
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            📸 Create Game
          </button>
        </div>

        <div className="features">
          <div className="feature">
            <span className="feature-icon">🎯</span>
            <h3>Create</h3>
            <p>Upload or take a photo and mark the correct location</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🌍</span>
            <h3>Share</h3>
            <p>Generate a shareable link or QR code</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🌡️</span>
            <h3>Guess</h3>
            <p>Get warm/cold feedback as you guess on the map</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
