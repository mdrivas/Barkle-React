import React, { useEffect, useState } from 'react';
import { getDatabase, ref, query, orderByChild, equalTo, get } from 'firebase/database';
import '../../styles/global.css';

const LeaderboardModal = ({ isOpen, onClose }) => {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadTodayScores();
    }
  }, [isOpen]);

  const loadTodayScores = async () => {
    const db = getDatabase();
    const today = new Date().toDateString();
    
    try {
      const scoresRef = ref(db, 'scores');
      const scoresQuery = query(scoresRef, orderByChild('date'), equalTo(today));
      const snapshot = await get(scoresQuery);
      
      const scoresArray = [];
      snapshot.forEach((childSnapshot) => {
        scoresArray.push(childSnapshot.val());
      });
      
      setScores(scoresArray.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if ((b.guessStreak || 0) !== (a.guessStreak || 0)) 
          return (b.guessStreak || 0) - (a.guessStreak || 0);
        return (b.streak || 0) - (a.streak || 0);
      }));
    } catch (error) {
      console.error('Database error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <span className="close-button" onClick={onClose}>&times;</span>
        <h2>🏆 Today's Top Scores 🏆</h2>
        <div className="leaderboard-content">
          {scores.length === 0 ? (
            <p>No scores yet today! Be the first to play! 🐕</p>
          ) : (
            <>
              <div className="score-entry headers">
                <span className="score-rank">Rank</span>
                <span className="score-name">Player</span>
                <span className="score-value">Score</span>
                <span className="score-guess-streak">Guess Streak</span>
                <span className="score-daily-streak">Daily Streak</span>
              </div>
              {scores.map((score, index) => {
                let dogEmoji;
                if (score.score === 5) dogEmoji = '👑';
                else if (score.score >= 4) dogEmoji = '🐕‍🦺';
                else if (score.score >= 3) dogEmoji = '🐕';
                else dogEmoji = '🐶';

                return (
                  <div key={index} className={`score-entry ${index < 3 ? `top-${index + 1}` : ''}`}>
                    <span className="score-rank">#{index + 1}</span>
                    <span className="score-name">{score.name}</span>
                    <span className="score-value">{score.score}/5 {dogEmoji}</span>
                    <span className="score-guess-streak">{score.guessStreak || 0}🔥</span>
                    <span className="score-daily-streak">{score.streak || 0}🔥</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;