import React from 'react';
import { useNavigate } from 'react-router-dom';

const CompletionModal = ({ isOpen, onClose, score, attempts, onShare }) => {
  const navigate = useNavigate();
  const yesterdayPlayed = localStorage.getItem('yesterdayPlayed') === 'true';
  const correctGuesses = attempts.filter(attempt => attempt.correct).length;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>🐕 All Done for Today! 🐕</h2>
        <p>Score: {correctGuesses}/{attempts.length}</p>
        <p>Come back tomorrow for more Barkle!</p>
        <div className="button-group">
          <button className="option-btn" onClick={onShare}>
            Share Results
          </button>
          <button 
            className="option-btn" 
            onClick={() => navigate('/?showLeaderboard=true')}
          >
            View Leaderboard
          </button>
          {!yesterdayPlayed && (
            <button 
              className="option-btn" 
              onClick={() => {/* Implement playYesterday logic */}}
            >
              Play Yesterday's Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompletionModal; 