import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GuesserMap from '../components/GuesserMap';
import ResultScreen from '../components/ResultScreen';
import ThemedLoader from '../components/ThemedLoader';
import WelcomeOverlay from '../components/WelcomeOverlay';
import '../styles/Guesser.css';

function Guesser() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState('loading');
  const [view, setView] = useState('photo'); // 'photo' | 'map'
  const [photo, setPhoto] = useState(null);
  const [creatorName, setCreatorName] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [guessing, setGuessing] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [instructionsSeen, setInstructionsSeen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
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
        setMarkerPos(null);
      }
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

  /* ── Photo view ── */
  if (view === 'photo') {
    return (
      <div className="guesser-photo-screen">
        {(!instructionsSeen || instructionsOpen) && (
          <WelcomeOverlay
            onDismiss={() => {
              setInstructionsSeen(true);
              setInstructionsOpen(false);
            }}
          />
        )}

        <div className="guesser-guess-badge">Guess #{guesses.length + 1}</div>

        {instructionsSeen && (
          <button
            className="guesser-info-btn"
            onClick={() => setInstructionsOpen(true)}
            aria-label="Show instructions"
          >
            i
          </button>
        )}

        <div className="guesser-photo-area">
          <div className="guesser-photo-frame">
            {photo && <img src={photo} alt="Guess this location" />}
            <span className="photo-corner photo-corner--tl" />
            <span className="photo-corner photo-corner--tr" />
            <span className="photo-corner photo-corner--bl" />
            <span className="photo-corner photo-corner--br" />
          </div>
        </div>

        <div className="guesser-bottom-bar">
          <button
            className="guesser-primary-btn"
            onClick={() => { setInstructionsSeen(true); setView('map'); }}
          >
            🗺️ Guess location
          </button>
        </div>
      </div>
    );
  }

  /* ── Map view ── */
  return (
    <div className="guesser-container">
      <div className="guesser-map-fullscreen">
        <GuesserMap
          markerPos={markerPos}
          onMarkerChange={setMarkerPos}
          isVisible={true}
          pastGuesses={guesses}
        />
      </div>

      <div className="guesser-guess-badge">Guess #{guesses.length + 1}</div>

      {lastFeedback && (
        <div key={guesses.length} className="guesser-feedback-pill slideIn">
          <span className="gfp-temp" style={{ color: lastFeedback.temperatureColor }}>
            {lastFeedback.temperature}
          </span>
          <span className="gfp-sep" />
          <span>📍 {lastFeedback.distance} km</span>
          <span className="gfp-sep" />
          <span>🧭 {lastFeedback.direction}</span>
        </div>
      )}

      <div className="guesser-map-bottom-bar">
        {isValidPos(markerPos) && (
          <button
            className="guesser-submit-btn"
            onClick={handleSubmitGuess}
            disabled={guessing}
          >
            {guessing ? <><ThemedLoader variant="dots" />Submitting…</> : '🎯 Submit guess'}
          </button>
        )}
        {!isValidPos(markerPos) && !guessing && (
          <p className="guesser-map-hint">📍 Tap the map to place your pin</p>
        )}
        <button className="guesser-view-photo-btn" onClick={() => setView('photo')}>
          📷 View photo
        </button>
      </div>
    </div>
  );
}

export default Guesser;
