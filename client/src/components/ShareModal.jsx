import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/ShareModal.css';

function ShareModal({ gameData, onBackToMap }) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const { user } = useAuth();

  const shareUrl = gameData.shareUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const header = user?.username
      ? `Whereabouts is ${user.username}? 📍`
      : 'Whereabouts - can you guess where this was taken? 📍';
    const shareText = `${header}\nCan you guess where this photo was taken?`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Whereabouts', text: shareText, url: `https://${shareUrl}` });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch { /* unavailable */ }
    }
  };

  return (
    <div className="share-modal-container">
      <div className="share-modal card">
        <h2>🎉 Game Created!</h2>
        <p className="game-id">Game ID: <strong>{gameData.gameId}</strong></p>

        <button onClick={handleShare} className="share-primary-btn">
          {shareCopied ? '✅ Copied to clipboard!' : '📤 Share Challenge'}
        </button>

        <div className="share-section">
          <p className="share-link-label">Or copy the link manually</p>
          <div className="share-link-box">
            <input type="text" value={shareUrl} readOnly />
            <button onClick={handleCopyLink} className="btn btn-ghost share-copy-btn">
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        <button onClick={onBackToMap} className="creator-back-link">
          ← Back to map
        </button>
      </div>
    </div>
  );
}

export default ShareModal;
