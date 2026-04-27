import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Creator from './pages/Creator';
import Guesser from './pages/Guesser';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Creator />} />
        <Route path="/game/:gameId" element={<Guesser />} />
      </Routes>
    </Router>
  );
}

export default App;
