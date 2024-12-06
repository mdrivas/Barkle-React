import React from 'react';

const ErrorMessage = ({ message, onClose }) => (
  <div className="error-message">
    <div className="error-content">
      <p>🐕 {message} 🐕</p>
      <button className="close-btn" onClick={onClose}>×</button>
    </div>
  </div>
);

export default ErrorMessage; 