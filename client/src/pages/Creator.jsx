import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker';
import ShareModal from '../components/ShareModal';
import '../styles/Creator.css';

function Creator() {
  const [step, setStep] = useState('photo'); // 'photo', 'map', 'share'
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhoto(event.target.result);
        setStep('map');
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      videoRef.current.srcObject = stream;
      document.querySelector('.creator-photo-section').style.display = 'none';
      document.querySelector('.camera-view').style.display = 'block';
    } catch (err) {
      setError('Camera access denied');
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    setPhoto(imageData);

    // Stop camera
    const stream = video.srcObject;
    stream.getTracks().forEach((track) => track.stop());

    document.querySelector('.creator-photo-section').style.display = 'block';
    document.querySelector('.camera-view').style.display = 'none';
    setStep('map');
  };

  const handleMapConfirm = async (coordinates) => {
    setLoading(true);
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          const formData = new FormData();
          formData.append('photo', blob);
          formData.append('lat', coordinates.lat);
          formData.append('lng', coordinates.lng);

          const response = await fetch('/api/games', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) throw new Error('Failed to create game');
          const data = await response.json();
          setGameData(data);
          setStep('share');
        });
      };
      img.src = photo;
    } catch (err) {
      setError('Failed to create game: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="creator-container">
      {step === 'photo' && (
        <div className="creator-photo-section card">
          <h1>📸 Create a Game</h1>
          <p>Choose how you want to add a photo:</p>
          <div className="button-group">
            <button onClick={() => fileInputRef.current.click()} className="btn btn-primary">
              📤 Upload from Device
            </button>
            <button onClick={startCamera} className="btn btn-secondary">
              📷 Take a Photo
            </button>
            <button onClick={() => navigate('/')} className="btn btn-ghost">
              ← Back
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {error && <p className="error">{error}</p>}
        </div>
      )}

      <div className="camera-view" style={{ display: 'none' }}>
        <video ref={videoRef} autoPlay playsInline></video>
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        <button onClick={capturePhoto} className="btn btn-primary capture-btn">
          📸 Capture
        </button>
      </div>

      {step === 'map' && photo && (
        <div className="creator-map-section">
          <MapPicker
            photo={photo}
            onConfirm={handleMapConfirm}
            loading={loading}
            onBack={() => setStep('photo')}
          />
        </div>
      )}

      {step === 'share' && gameData && <ShareModal gameData={gameData} />}
    </div>
  );
}

export default Creator;
