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
  const [guesses, setGuesses] = useState([]);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [guessing, setGuessing] = useState(false);
  const [error, setError] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
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

  const handleSubmitGuess = async () => {
    if (!markerPos || guessing) return;
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
      if (feedback.correct) setGameState('won');
    } catch (err) {
      setError('Failed to submit guess: ' + err.message);
    } finally {
      setGuessing(false);
    }
  };

  if (gameState === 'error') {
    return (
      <div className="container">
        <div className="error-card card">
          <h2>Couldn't load game</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button
              className="btn btn-primary"
              onClick={() => setRetryCount(n => n + 1)}
            >
              ↩ Retry
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              ← Go Home
            </button>
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
      />
    );
  }

  return (
    <div className="guesser-container">
      <WelcomeOverlay />

      <div className="guesser-photo" onClick={() => setLightboxOpen(true)}>
        {photo && <img src={photo} alt="Guess this location" />}
        <div className="guess-counter">Guess #{guesses.length + 1}</div>
        <div className="photo-zoom-hint">🔍 Tap to zoom</div>
      </div>

      {lightboxOpen && (
        <Lightbox src={photo} alt="Location photo" onClose={() => setLightboxOpen(false)} />
      )}

      {lastFeedback && (
        <div
          key={guesses.length}
          className="feedback-bar slideIn"
          style={{ backgroundColor: lastFeedback.temperatureColor }}
        >
          <span className="feedback-temp">{lastFeedback.temperature}</span>
          <span className="feedback-divider" />
          <span className="feedback-dist">📍 {lastFeedback.distance} km away</span>
          <span className="feedback-dir">🧭 {lastFeedback.direction}</span>
        </div>
      )}

      <div className="guesser-map">
        <GuesserMap
          markerPos={markerPos}
          onMarkerChange={setMarkerPos}
        />
      </div>
      <div className="guesser-footer">
        <button
          onClick={handleSubmitGuess}
          className="btn btn-primary"
          disabled={!markerPos || guessing}
        >
          {guessing ? <><ThemedLoader variant="dots" />Submitting…</> : '🎯 Guess this location'}
        </button>
      </div>
    </div>
  );
}

export default Guesser;
