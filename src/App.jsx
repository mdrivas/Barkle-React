import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home/Home';
import './firebase/config'; // Import Firebase configuration

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Add other routes as needed */}
      </Routes>
    </Router>
  );
};

export default App; 