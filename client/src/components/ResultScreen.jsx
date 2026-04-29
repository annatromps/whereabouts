import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import '../styles/ResultScreen.css';

function calcScore(distanceKm, guessCount) {
  const base = Math.round(5000 * Math.max(0, 1 - distanceKm / 50));
  return Math.max(0, base - (guessCount - 1) * 500);
}

function guessLabel(n) {
  if (n === 1) return { emoji: '🎯', text: 'Got it in one!' };
  if (n === 2) return { emoji: '🔥', text: '2 guesses – almost perfect!' };
  if (n === 3) return { emoji: '👍', text: '3 guesses – nice work!' };
  if (n === 4) return { emoji: '🌡️', text: '4 guesses – getting there!' };
  return { emoji: '🌍', text: `${n} guesses – what a journey!` };
}

function ResultScreen({ guessCount, lastFeedback, onPlayAgain, gameId }) {
  const [copied, setCopied] = useState(false);

  const score = calcScore(lastFeedback.distance, guessCount);
  const { emoji, text } = guessLabel(guessCount);

  const answerIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNDQ5NDciIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
    iconSize: [32, 41],
    iconAnchor: [16, 41]
  });

  const handleShare = async () => {
    const gameUrl = `${window.location.origin}/game/${gameId}`;
    const shareText = `${emoji} ${text} Can you beat me?`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Whereabouts', text: shareText, url: gameUrl });
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${gameUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch { /* unavailable */ }
    }
  };

  return (
    <div className="result-container">
      <div className="result-content card">
        <h1 className="result-title">🎉 You found it!</h1>

        {/* Primary: guess count */}
        <div className="result-hero">
          <span className="result-hero-emoji">{emoji}</span>
          <span className="result-hero-count">{guessCount === 1 ? '1 guess' : `${guessCount} guesses`}</span>
          <span className="result-hero-label">{text}</span>
        </div>

        {/* Secondary: score + distance */}
        <div className="result-secondary">
          <span>{score.toLocaleString()} pts</span>
          <span className="result-secondary-dot">·</span>
          <span>{lastFeedback.distance} km from the spot</span>
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
