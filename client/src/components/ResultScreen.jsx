import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import '../styles/ResultScreen.css';

const TEMP_EMOJI = {
  'Correct!':  '✅',
  'Scorching': '🔥',
  'Hot':       '🌡️',
  'Warm':      '☀️',
  'Cool':      '🌤️',
  'Cold':      '❄️',
  'Freezing':  '🥶',
};

function guessLabel(n) {
  if (n === 1) return { emoji: '🎯', text: 'Got it in one!' };
  if (n === 2) return { emoji: '🔥', text: '2 guesses – almost perfect!' };
  if (n === 3) return { emoji: '👍', text: '3 guesses – nice work!' };
  if (n === 4) return { emoji: '🌡️', text: '4 guesses – getting there!' };
  return { emoji: '🌍', text: `${n} guesses – what a journey!` };
}

function ResultScreen({ guessCount, lastFeedback, onPlayAgain, gameId, creatorName, shareUrl }) {
  const [copied, setCopied] = useState(false);

  const { emoji, text } = guessLabel(guessCount);

  const answerLat = Number.isFinite(lastFeedback.answerLat) ? lastFeedback.answerLat : 0;
  const answerLng = Number.isFinite(lastFeedback.answerLng) ? lastFeedback.answerLng : 0;
  const hasValidAnswer = Number.isFinite(lastFeedback.answerLat) && Number.isFinite(lastFeedback.answerLng);

  const score = lastFeedback.score ?? 0;
  const temperatures = lastFeedback.guessTemperatures ?? [];
  const firstDist = lastFeedback.firstGuessDistance ?? Math.round(lastFeedback.distance);
  const emojiRow = temperatures.map(t => TEMP_EMOJI[t] ?? '📍').join('');

  const answerIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNDQ5NDciIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
    iconSize: [32, 41],
    iconAnchor: [16, 41]
  });

  const buildSummary = () => {
    const header = creatorName ? `📍 Whereabouts is ${creatorName}?` : '📍 Whereabouts';
    const guessLine = `🎯 ${guessCount} ${guessCount === 1 ? 'guess' : 'guesses'} · first guess ${firstDist}km off`;
    return [header, guessLine, emojiRow, `${score.toLocaleString()}pts`].join('\n');
  };

  const handleShare = async () => {
    const gameUrl = (shareUrl || `${window.location.origin}/game/${gameId}`).replace(/^https?:\/\//, '');
    const summary = buildSummary();

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Whereabouts', text: summary, url: gameUrl });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${summary}\n${gameUrl}`);
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

        {/* Emoji history row */}
        {emojiRow && (
          <div className="result-emoji-row">{emojiRow}</div>
        )}

        {hasValidAnswer ? (
          <MapContainer center={[answerLat, answerLng]} zoom={6} className="result-map" attributionControl={false}>
            <TileLayer
              url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <Marker position={[answerLat, answerLng]} icon={answerIcon}>
              <Popup>Correct location</Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="result-map result-map--no-coords" />
        )}

        <button onClick={handleShare} className="btn btn-primary btn-large" style={{ marginBottom: '12px' }}>
          {copied ? '✅ Copied to clipboard!' : '📤 Share result'}
        </button>
        <button onClick={onPlayAgain} className="btn btn-large" style={{ background: '#FFCCD6', color: '#E44947' }}>
          🎮 Create my own
        </button>
      </div>
    </div>
  );
}

export default ResultScreen;
