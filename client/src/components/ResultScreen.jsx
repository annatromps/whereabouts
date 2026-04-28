import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import '../styles/ResultScreen.css';

function calcScore(distanceKm, guessCount) {
  // Max 5000 pts at 0 km, 0 pts at 50 km (the winning threshold)
  const base = Math.round(5000 * Math.max(0, 1 - distanceKm / 50));
  // -500 pts per guess beyond the first
  return Math.max(0, base - (guessCount - 1) * 500);
}

function scoreLabel(score) {
  if (score >= 4500) return '🎯 Incredible!';
  if (score >= 3000) return '🔥 So close!';
  if (score >= 1500) return '🌍 Not bad!';
  return '🥶 Freezing cold!';
}

function ResultScreen({ guessCount, lastFeedback, onPlayAgain, gameId }) {
  const [copied, setCopied] = useState(false);

  const score = calcScore(lastFeedback.distance, guessCount);

  const answerIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNDQ5NDciIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
    iconSize: [32, 41],
    iconAnchor: [16, 41]
  });

  const handleShare = async () => {
    const gameUrl = `${window.location.origin}/game/${gameId}`;
    const label = scoreLabel(score);
    const shareText = `${label} I scored ${score}/5000 on Whereabouts! Can you beat me?`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Whereabouts', text: shareText, url: gameUrl });
      } catch {
        // cancelled or unsupported — ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${gameUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // clipboard unavailable
      }
    }
  };

  return (
    <div className="result-container">
      <div className="result-content card">
        <h1 className="result-title">🎉 You found it!</h1>

        <div className="result-stats">
          <div className="stat">
            <span className="label">Score</span>
            <span className="value score-value">{score}<span className="score-max">/5000</span></span>
          </div>
          <div className="stat">
            <span className="label">Guesses</span>
            <span className="value">{guessCount}</span>
          </div>
          <div className="stat">
            <span className="label">Distance</span>
            <span className="value">{lastFeedback.distance} km</span>
          </div>
          <div className="stat stat--label">
            <span className="score-label-text">{scoreLabel(score)}</span>
          </div>
        </div>

        <MapContainer center={[lastFeedback.answerLat, lastFeedback.answerLng]} zoom={6} className="result-map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker position={[lastFeedback.answerLat, lastFeedback.answerLng]} icon={answerIcon}>
            <Popup>Correct location</Popup>
          </Marker>
        </MapContainer>

        <button onClick={handleShare} className="btn btn-primary btn-large" style={{ marginBottom: '12px' }}>
          {copied ? '✅ Copied to clipboard!' : '📤 Share your score'}
        </button>
        <button onClick={onPlayAgain} className="btn btn-large" style={{ background: '#FFCCD6', color: '#E44947' }}>
          🎮 Play Again
        </button>
      </div>
    </div>
  );
}

export default ResultScreen;
