import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GuesserMap from '../components/GuesserMap';
import ResultScreen from '../components/ResultScreen';
import '../styles/Guesser.css';

function Guesser() {
  const { gameId } = useParams();
  const [gameState, setGameState] = useState('loading'); // 'loading', 'guessing', 'won'
  const [photo, setPhoto] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}`);
        if (!response.ok) throw new Error('Game not found');
        const data = await response.json();
        setPhoto(data.photoUrl);
        setGameState('guessing');
      } catch (err) {
        setError('Failed to load game: ' + err.message);
      }
    };

    fetchGame();
  }, [gameId]);

  const handleGuess = async (coordinates) => {
    try {
      const response = await fetch(`/api/games/${gameId}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coordinates)
      });

      if (!response.ok) throw new Error('Failed to submit guess');
      const feedback = await response.json();

      setGuesses([...guesses, { coordinates, feedback }]);
      setLastFeedback(feedback);

      if (feedback.correct) {
        setGameState('won');
      }
    } catch (err) {
      setError('Failed to submit guess: ' + err.message);
    }
  };

  if (gameState === 'loading') {
    return <div className="container"><p>Loading game...</p></div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-card card">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>← Go Home</button>
        </div>
      </div>
    );
  }

  if (gameState === 'won') {
    return (
      <ResultScreen
        guessCount={guesses.length}
        lastFeedback={lastFeedback}
        onPlayAgain={() => navigate('/')}
      />
    );
  }

  return (
    <div className="guesser-container">
      <div className="guesser-photo">
        {photo && <img src={photo} alt="Guess this location" />}
        <div className="guess-counter">
          Guess #{guesses.length + 1}
        </div>
      </div>
      <div className="guesser-map">
        <GuesserMap onGuess={handleGuess} lastFeedback={lastFeedback} />
      </div>
    </div>
  );
}

export default Guesser;
