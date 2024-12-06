import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase/config';
import { generateSeedFromDate, seededRandom } from '../utils/gameUtils';

export const useGameState = () => {
  const [gameState, setGameState] = useState({
    score: 0,
    attempts: [],
    gameOver: false,
    currentBreed: null,
    dailyBreeds: null,
    allBreeds: [],
    todaysSeed: generateSeedFromDate(new Date()),
    gameDate: new Date()
  });

  const loadGameState = () => {
    const savedState = JSON.parse(localStorage.getItem('barkleState') || '{}');
    const today = new Date();
    
    if (savedState.gameDate !== today.toDateString()) {
      clearGameState();
    } else {
      setGameState(prevState => ({
        ...prevState,
        score: savedState.score || 0,
        attempts: savedState.attempts || [],
        gameOver: savedState.gameOver || false,
        dailyBreeds: savedState.dailyBreeds || null,
        currentBreed: savedState.currentBreed || null
      }));
    }
  };

  const saveGameState = () => {
    localStorage.setItem('barkleState', JSON.stringify({
      gameDate: gameState.gameDate.toDateString(),
      score: gameState.score,
      attempts: gameState.attempts,
      gameOver: gameState.gameOver,
      currentBreed: gameState.currentBreed,
      dailyBreeds: gameState.dailyBreeds
    }));
  };

  const clearGameState = () => {
    localStorage.removeItem('barkleState');
    setGameState(prevState => ({
      ...prevState,
      score: 0,
      attempts: [],
      gameOver: false,
      dailyBreeds: null
    }));
  };

  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  useEffect(() => {
    saveGameState();
  }, [saveGameState]);

  return [gameState, setGameState, clearGameState];
}; 