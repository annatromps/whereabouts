import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import '../styles/ShareModal.css';

function ShareModal({ gameData }) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(gameData.shareUrl);
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
        await navigator.share({ title: 'Whereabouts', text: shareText, url: gameData.shareUrl });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${gameData.shareUrl}`);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch { /* unavailable */ }
    }
  };

  const handleDownloadQR = () => {
    const element = document.querySelector('canvas');
    const link = document.createElement('a');
    link.href = element.toDataURL('image/png');
    link.download = `whereabouts-${gameData.gameId}.png`;
    link.click();
  };

  return (
    <div className="share-modal-container">
      <div className="share-modal card">
        <h2>🎉 Game Created!</h2>
        <p className="game-id">Game ID: <strong>{gameData.gameId}</strong></p>

        <div className="share-section">
          <h3>Share Link</h3>
          <div className="share-link-box">
            <input type="text" value={gameData.shareUrl} readOnly />
            <button onClick={handleCopyLink} className="btn btn-primary">
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>

        <div className="qr-section">
          <h3>QR Code</h3>
          <div className="qr-container">
            <QRCode value={gameData.shareUrl} size={Math.min(256, window.innerWidth - 100)} level="H" includeMargin={true} />
          </div>
          <button onClick={handleDownloadQR} className="btn btn-secondary">
            📥 Download QR Code
          </button>
        </div>

        <div className="button-group">
          <button onClick={handleShare} className="btn btn-primary">
            {shareCopied ? '✅ Copied to clipboard!' : '📤 Share Challenge'}
          </button>
          <button onClick={() => navigate('/')} className="btn btn-ghost">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareModal;
