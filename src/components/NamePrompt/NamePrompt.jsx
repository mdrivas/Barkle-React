import React, { useState } from 'react';
import { containsBadWords } from '../../utils/gameUtils';

const NamePrompt = ({ onClose }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setName('Anonymous');
      localStorage.setItem('playerName', 'Anonymous');
      onClose();
      return;
    }

    if (containsBadWords(trimmedName)) {
      setError('Please choose a different name.');
      return;
    }

    localStorage.setItem('playerName', trimmedName);
    onClose();
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>🐕 Welcome to Barkle! 🐕</h2>
        <p>What should we call you?</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            maxLength={12}
            placeholder="Your name"
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="option-btn">
            Start Playing
          </button>
        </form>
      </div>
    </div>
  );
};

export default NamePrompt; 