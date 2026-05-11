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
  const [photoOpen, setPhotoOpen] = useState(false);
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

  return (
    <div className="guesser-container">
      <WelcomeOverlay />

      {/* Full-screen map */}
      <div className="guesser-map-fullscreen">
        <GuesserMap
          markerPos={markerPos}
          onMarkerChange={setMarkerPos}
          isVisible={true}
          pastGuesses={guesses}
        />
      </div>

      {/* Top-left: View Photo button */}
      <button className="guesser-view-photo-btn" onClick={() => setPhotoOpen(true)}>
        📷 View photo
      </button>

      {/* Top-right: Guess counter */}
      <div className="guesser-guess-badge">Guess #{guesses.length + 1}</div>

      {/* Feedback pill — appears after each wrong guess, sits above submit bar */}
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

      {/* Bottom: floating submit button */}
      <div className="guesser-submit-bar">
        <button
          onClick={handleSubmitGuess}
          className="guesser-submit-btn"
          disabled={!isValidPos(markerPos) || guessing}
        >
          {guessing
            ? <><ThemedLoader variant="dots" />Submitting…</>
            : isValidPos(markerPos)
              ? '🎯 Submit guess'
              : '📍 Tap the map to place your pin'}
        </button>
      </div>

      {photoOpen && (
        <Lightbox src={photo} alt="Location photo" onClose={() => setPhotoOpen(false)} />
      )}
    </div>
  );
}

export default Guesser;
