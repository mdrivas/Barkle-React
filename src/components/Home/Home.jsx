import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, query, orderByChild, equalTo, get } from 'firebase/database';
import { db } from '../../firebase/config';
import LeaderboardModal from '../LeaderboardModal/LeaderboardModal';
import '../../styles/global.css';

const Home = () => {
  const navigate = useNavigate();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [totalGames, setTotalGames] = useState(0);

  useEffect(() => {
    loadTotalGames();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showLeaderboard') === 'true') {
      setShowLeaderboard(true);
    }
  }, []);

  const loadTotalGames = async () => {
    try {
      const scoresRef = ref(db, 'scores');
      const scoresQuery = query(
        scoresRef,
        orderByChild('date'),
        equalTo(new Date().toDateString())
      );
      
      const snapshot = await get(scoresQuery);
      const totalGames = snapshot.size;
      setTotalGames(totalGames);
    } catch (error) {
      console.error('Error loading total games:', error);
    }
  };

  return (
    <>
      <div className="top-right-links">
        <a href="/privacy">Privacy Policy</a> |
        <a href="/terms">Terms of Service</a>
      </div>

      <div className="page-container">
        <div className="landing-container">
          <div className="logo-container">
            <img src="/logo.webp" alt="Barkle Logo" className="logo-image" />
          </div>
          
          <div className="landing-logo">BARKLE</div>
          
          <div className="landing-description">
            5 chances to guess different dog breeds from their photos.
            A new set of pups every day!
          </div>

          <div className="button-group">
            <button className="play-button" onClick={() => navigate('/play')}>
              Play
            </button>
            <button className="leaderboard-button" onClick={() => setShowLeaderboard(true)}>
              Leaderboard
            </button>
          </div>

          <div className="total-games-played">
            🐾 {totalGames.toLocaleString()} Games Played Today 🐾
          </div>

          <div className="ad-container-mobile">
            <iframe 
              data-aa='2368927' 
              src='https://ad.a-ads.com/2368927?size=320x50' 
              style={{
                width: '320px',
                height: '50px',
                border: '0px',
                padding: 0,
                overflow: 'hidden',
                backgroundColor: 'transparent'
              }}
              title="advertisement"
            />
          </div>
        </div>
      </div>

      <LeaderboardModal 
        isOpen={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)}
      />
    </>
  );
};

export default Home; 