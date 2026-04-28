import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import '../styles/ResultScreen.css';

function ResultScreen({ guessCount, lastFeedback, onPlayAgain, gameId }) {
  const [copied, setCopied] = useState(false);

  const guessIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
    iconSize: [32, 41],
    iconAnchor: [16, 41]
  });

  const answerIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
    iconSize: [32, 41],
    iconAnchor: [16, 41]
  });

  const handleShare = async () => {
    const gameUrl = `${window.location.origin}/game/${gameId}`;
    const shareText = `I found the location in ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'} on Whereabouts! Can you do better?`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Whereabouts', text: shareText, url: gameUrl });
      } catch {
        // User cancelled or share failed — ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${gameUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Clipboard not available
      }
    }
  };

  return (
    <div className="result-container">
      <div className="result-content card">
        <h1 className="result-title">🎉 You Got It!</h1>
        <div className="result-stats">
          <div className="stat">
            <span className="label">Guesses:</span>
            <span className="value">{guessCount}</span>
          </div>
          <div className="stat">
            <span className="label">Distance:</span>
            <span className="value">{lastFeedback.distance} km</span>
          </div>
        </div>

        <MapContainer center={[lastFeedback.answerLat, lastFeedback.answerLng]} zoom={6} className="result-map">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker position={[lastFeedback.answerLat, lastFeedback.answerLng]} icon={answerIcon}>
            <Popup>Correct Answer</Popup>
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
