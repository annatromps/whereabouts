import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/NavBar';
import AuthModal from './components/AuthModal';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Creator from './pages/Creator';
import Guesser from './pages/Guesser';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-layout">
          <NavBar />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<ErrorBoundary><Creator /></ErrorBoundary>} />
              <Route path="/game/:gameId" element={<Guesser />} />
            </Routes>
          </div>
        </div>
        <AuthModal />
      </Router>
    </AuthProvider>
  );
}

export default App;
