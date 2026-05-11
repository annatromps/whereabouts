import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GuesserMap from '../components/GuesserMap';
import ResultScreen from '../components/ResultScreen';
import Lightbox from '../components/Lightbox';
import ThemedLoader from '../components/ThemedLoader';
import WelcomeOverlay from '../components/WelcomeOverlay';
import '../styles/Guesser.css';

function Guesser() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState('loading');
  const [photo, setPhoto] = useState(null);
  const [creatorName, setCreatorName] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [guessing, setGuessing] = useState(false);
  const [error, setError] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const fetchGame = async () => {
      setError('');
      setGameState('loading');
      try {
        const response = await fetch(`/api/games/${gameId}`, { signal: controller.signal });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Server error (${response.status})`);
        }
        const data = await response.json();
        if (!data.photoUrl) throw new Error('Game data missing photo URL');
        setPhoto(data.photoUrl);
        setCreatorName(data.creatorName || null);
        setGameState('guessing');
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Game took too long to load — the server may be starting up. Please retry.');
        } else {
          setError('Failed to load game: ' + err.message);
        }
        setGameState('error');
      } finally {
        clearTimeout(timeoutId);
      }
    };

    fetchGame();
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [gameId, retryCount]);

  const isValidPos = (pos) =>
    Array.isArray(pos) && Number.isFinite(pos[0]) && Number.isFinite(pos[1]);

  const handleSubmitGuess = async () => {
    if (!isValidPos(markerPos) || guessing) return;
    setGuessing(true);
    try {
      const response = await fetch(`/api/games/${gameId}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: markerPos[0], lng: markerPos[1] })
      });
      if (!response.ok) throw new Error('Failed to submit guess');
      const feedback = await response.json();
      setGuesses(prev => [...prev, { coordinates: { lat: markerPos[0], lng: markerPos[1] }, feedback }]);
      setLastFeedback(feedback);
      if (feedback.correct) {
        setGameState('won');
      } else {
        // Reset pin so the user places a fresh one for the next guess.
        // Collapse the map so the feedback in the handle is visible.
        setMarkerPos(null);
        setMapOpen(false);
      }
    } catch (err) {
      setError('Failed to submit guess: ' + err.message);
    } finally {
      setGuessing(false);
    }
  };

  // Handle always just toggles the map — no auto-submit on tap
  const handlePanelTap = () => setMapOpen(o => !o);

  if (gameState === 'error') {
    return (
      <div className="container">
        <div className="error-card card">
          <h2>Couldn't load game</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={() => setRetryCount(n => n + 1)}>↩ Retry</button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>← Go Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return <ThemedLoader variant="fullscreen" />;
  }

  if (gameState === 'won') {
    return (
      <ResultScreen
        guessCount={guesses.length}
        lastFeedback={lastFeedback}
        onPlayAgain={() => navigate('/')}
        gameId={gameId}
        creatorName={creatorName}
      />
    );
  }

  return (
    <div className="guesser-container">
      <WelcomeOverlay />

      {/* Photo area — shrinks when map is open */}
      <div
        className={`guesser-photo-area${mapOpen ? ' guesser-photo-area--shrunk' : ''}`}
        onClick={() => setLightboxOpen(true)}
      >
        <div className="guesser-photo-frame">
          {photo && <img src={photo} alt="Guess this location" />}
          {/* Decorative corner brackets */}
          <span className="photo-corner photo-corner--tl" />
          <span className="photo-corner photo-corner--tr" />
          <span className="photo-corner photo-corner--bl" />
          <span className="photo-corner photo-corner--br" />
          <div className="guess-counter">Guess #{guesses.length + 1}</div>
          <div className="photo-zoom-hint">🔍 Tap to zoom</div>
        </div>
      </div>

      {lightboxOpen && (
        <Lightbox src={photo} alt="Location photo" onClose={() => setLightboxOpen(false)} />
      )}

      {/* Collapsible map panel */}
      <div className={`guesser-panel${mapOpen ? ' guesser-panel--open' : ''}`}>

        {/*
          Handle doubles as feedback display:
          - Map open → "▼ Collapse map"
          - Map closed, feedback exists → temperature · km · direction
          - Map closed, no feedback → "📍 Place your guess on the map"
          Tapping always toggles the map.
        */}
        <button className="guesser-panel-handle" onClick={handlePanelTap}>
          <span className="panel-handle-bar" />
          {mapOpen ? (
            <span className="panel-handle-label">▼ Collapse map</span>
          ) : lastFeedback ? (
            <div key={guesses.length} className="panel-handle-feedback slideIn">
              <span
                className="phf-temp"
                style={{ color: lastFeedback.temperatureColor }}
              >
                {lastFeedback.temperature}
              </span>
              <span className="phf-sep" />
              <span className="phf-dist">📍 {lastFeedback.distance} km away</span>
              <span className="phf-sep" />
              <span className="phf-dir">🧭 {lastFeedback.direction}</span>
              <span className="phf-hint">— tap to guess again</span>
            </div>
          ) : (
            <span className="panel-handle-label">📍 Place your guess on the map</span>
          )}
        </button>

        <div className="guesser-panel-body">
          <div className="guesser-map">
            {/* isVisible triggers map.invalidateSize() after the CSS transition */}
            <GuesserMap
              markerPos={markerPos}
              onMarkerChange={setMarkerPos}
              isVisible={mapOpen}
              pastGuesses={guesses}
            />
          </div>
          <div className="guesser-footer">
            <button
              onClick={handleSubmitGuess}
              className="btn btn-primary"
              disabled={!isValidPos(markerPos) || guessing}
            >
              {guessing
                ? <><ThemedLoader variant="dots" />Submitting…</>
                : isValidPos(markerPos)
                  ? '🎯 Guess this location'
                  : '📍 Tap the map to place your pin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Guesser;
