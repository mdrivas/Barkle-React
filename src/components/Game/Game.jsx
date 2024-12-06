import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameState } from '../../hooks/useGameState';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { generateSeedFromDate, seededRandom } from '../../utils/gameUtils';
import NamePrompt from '../NamePrompt/NamePrompt';
import ErrorMessage from '../ErrorMessage/ErrorMessage';
import CompletionModal from '../CompletionModal/CompletionModal';

const MAX_ATTEMPTS = 5;

const errorMessages = {
  general: "Ruh roh! Something went wrong. Let's fetch those dog pics again!",
  network: "Woof! Seems like our dog pics are playing hide and seek. Try again?",
  image: "Paw snap! This puppy picture is being stubborn. Fetching another...",
  api: "Our dog database is taking a nap. Come back later today!"
};

const Game = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useGameState();
  const { playHappySound, playSadSound } = useSoundEffects();
  const [error, setError] = useState(null);
  const [showNamePrompt, setShowNamePrompt] = useState(!localStorage.getItem('playerName'));
  const [currentImage, setCurrentImage] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const loadNextRound = useCallback(async () => {
    try {
      const currentAttempt = gameState.attempts.length;
      const currentBreed = gameState.dailyBreeds[currentAttempt];
      
      setLoading(true);
      const allImagesResponse = await fetch(`https://dog.ceo/api/breed/${currentBreed}/images`);
      if (!allImagesResponse.ok) throw new Error('image');
      
      const allImagesData = await allImagesResponse.json();
      const allImages = allImagesData.message;
      
      const imageIndex = Math.floor(seededRandom(gameState.todaysSeed + currentAttempt * 1000) * allImages.length);
      setCurrentImage(allImages[imageIndex]);
      
      const options = [currentBreed];
      let wrongSeed = gameState.todaysSeed + (currentAttempt * 100);
      
      while (options.length < 4) {
        wrongSeed++;
        const wrongIndex = Math.floor(seededRandom(wrongSeed) * gameState.allBreeds.length);
        const wrong = gameState.allBreeds[wrongIndex];
        if (!options.includes(wrong)) options.push(wrong);
      }
      
      options.sort((a, b) => seededRandom(wrongSeed + options.length) - 0.5);
      setOptions(options);
      
    } catch (error) {
      setError(errorMessages[error.message] || errorMessages.general);
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('https://dog.ceo/api/breeds/list/all');
      if (!response.ok) throw new Error('api');
      
      const data = await response.json();
      setGameState(prev => ({
        ...prev,
        allBreeds: Object.keys(data.message)
      }));
      
      await loadNextRound();
    } catch (error) {
      setError(errorMessages[error.message] || errorMessages.general);
    } finally {
      setLoading(false);
    }
  }, [setGameState, loadNextRound]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const generateDailyBreeds = (allBreeds) => {
    const breeds = new Set();
    const dailyBreeds = [];
    let attempts = 0;
    const maxAttempts = 100;
    const todaysSeed = generateSeedFromDate(new Date());

    while (breeds.size < MAX_ATTEMPTS && attempts < maxAttempts) {
      const seed = todaysSeed * (breeds.size + 1) * 16807;
      const random = seededRandom(seed);
      const index = Math.floor(random * allBreeds.length);
      const breed = allBreeds[index];
      
      if (!breeds.has(breed)) {
        breeds.add(breed);
        dailyBreeds.push(breed);
      }
      attempts++;
    }
    
    return dailyBreeds;
  };

  const resumeGame = async () => {
    try {
      setLoading(true);
      const currentAttempt = gameState.attempts.length;
      const currentBreed = gameState.dailyBreeds[currentAttempt];
      
      // Get breed images
      const response = await fetch(`https://dog.ceo/api/breed/${currentBreed}/images`);
      if (!response.ok) throw new Error('image');
      
      const data = await response.json();
      const allImages = data.message;
      const imageIndex = Math.floor(seededRandom(gameState.todaysSeed + currentAttempt * 1000) * allImages.length);
      setCurrentImage(allImages[imageIndex]);
      
      // Generate options
      const options = generateOptions(currentBreed, gameState.allBreeds, currentAttempt, gameState.todaysSeed);
      setOptions(options);
      
    } catch (error) {
      setError(errorMessages[error.message] || errorMessages.general);
    } finally {
      setLoading(false);
    }
  };

  const generateOptions = (currentBreed, allBreeds, currentAttempt, todaysSeed) => {
    const options = [currentBreed];
    let wrongSeed = todaysSeed + (currentAttempt * 100);
    
    while (options.length < 4) {
      wrongSeed++;
      const wrongIndex = Math.floor(seededRandom(wrongSeed) * allBreeds.length);
      const wrong = allBreeds[wrongIndex];
      if (!options.includes(wrong)) options.push(wrong);
    }

    return options.sort((a, b) => seededRandom(wrongSeed + options.length) - 0.5);
  };

  const handleGuess = (breed) => {
    const isCorrect = breed === gameState.currentBreed;
    if (isCorrect) {
      playHappySound();
    } else {
      playSadSound();
    }
    setFeedback({
      message: isCorrect ? 'Correct!' : `Wrong! It was a ${gameState.currentBreed}`,
      type: isCorrect ? 'correct' : 'incorrect'
    });

    // Update game state
    const newAttempts = [...gameState.attempts, { breed, correct: isCorrect }];
    setGameState(prev => ({
      ...prev,
      attempts: newAttempts,
      score: isCorrect ? prev.score + 1 : prev.score
    }));

    // Check if game is over
    if (newAttempts.length >= MAX_ATTEMPTS) {
      setShowCompletionModal(true);
    } else {
      // Continue to next round after delay
      setTimeout(() => {
        setFeedback({ message: '', type: '' });
        loadNextRound();
      }, 1500);
    }
  };

  const displayLeaderboard = useCallback((scores) => {
    const leaderboardContent = document.getElementById('leaderboardContent');
    if (!leaderboardContent) return;

    // Sort scores by score value (descending) and date (most recent first)
    const sortedScores = Object.values(scores).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.date) - new Date(a.date);
    });

    // Get today's date string for highlighting today's scores
    const today = new Date().toDateString();

    // Create the leaderboard HTML
    const leaderboardHTML = `
      <div class="leaderboard-header">
        <h2>🏆 Top Dogs 🏆</h2>
      </div>
      <div class="leaderboard-table">
        <div class="leaderboard-row header">
          <div class="rank">Rank</div>
          <div class="player">Player</div>
          <div class="score">Score</div>
          <div class="date">Date</div>
          <div class="streak">Streak</div>
        </div>
        ${sortedScores.slice(0, 10).map((score, index) => `
          <div class="leaderboard-row ${score.date === today ? 'today' : ''}">
            <div class="rank">${index + 1}</div>
            <div class="player">${score.name}</div>
            <div class="score">${score.score}/${MAX_ATTEMPTS}</div>
            <div class="date">${new Date(score.date).toLocaleDateString()}</div>
            <div class="streak">${score.streak || 1}🔥</div>
          </div>
        `).join('')}
      </div>
    `;

    leaderboardContent.innerHTML = leaderboardHTML;
  }, []);

  return (
    <div className="game-container">
      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
      {showNamePrompt && <NamePrompt onClose={() => setShowNamePrompt(false)} />}
      
      <div className="game-content">
        <div className="image-container">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <img src={currentImage} alt="Dog breed to guess" className="dog-image" />
          )}
        </div>

        <div id="leaderboardContent"></div>

        <div className="options-container">
          {options.map((breed, index) => (
            <button
              key={index}
              className="option-btn"
              onClick={() => handleGuess(breed)}
              disabled={loading}
            >
              {breed}
            </button>
          ))}
        </div>
      </div>

      {showCompletionModal && (
        <CompletionModal
          score={gameState.score}
          attempts={gameState.attempts}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  );
};

export default Game; 