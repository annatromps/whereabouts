import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import exifr from 'exifr';
import MapPicker from '../components/MapPicker';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../context/AuthContext';
import '../styles/Creator.css';

function Creator() {
  const { user, openAuth } = useAuth();
  const [step, setStep] = useState('photo');
  const [photo, setPhoto] = useState(null);
  const [detectedCoordinates, setDetectedCoordinates] = useState(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessingPhoto(true);
    setError('');

    try {
      const [gps, dataUrl] = await Promise.all([
        // EXIF extraction — always fail silently
        exifr.gps(file).catch(() => null),
        // FileReader — must handle onerror or the promise hangs forever
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target.result);
          reader.onerror = () => reject(new Error('Could not read the selected photo'));
          reader.readAsDataURL(file);
        }),
      ]);

      setDetectedCoordinates(gps ? { lat: gps.latitude, lng: gps.longitude } : null);
      setPhoto(dataUrl);
      setStep('map');
    } catch (err) {
      setError('Failed to load photo — please try a different image.');
    } finally {
      setProcessingPhoto(false);
      // Reset so the same file can be re-selected if needed
      e.target.value = '';
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

    const stream = video.srcObject;
    stream.getTracks().forEach(track => track.stop());

    document.querySelector('.creator-photo-section').style.display = 'block';
    document.querySelector('.camera-view').style.display = 'none';
    setStep('map');
  };

  const handleMapConfirm = async (coordinates) => {
    setLoading(true);
    setError('');
    try {
      // Promisify image → canvas → blob so setLoading(false) waits for the whole chain
      const blob = await new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob(
            b => (b ? resolve(b) : reject(new Error('Image conversion failed'))),
            'image/jpeg',
            0.9
          );
        };
        img.onerror = () => reject(new Error('Failed to process image'));
        img.src = photo;
      });

      const formData = new FormData();
      formData.append('photo', blob);
      formData.append('lat', coordinates.lat);
      formData.append('lng', coordinates.lng);

      const response = await fetch('/api/games', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to create game');

      const data = await response.json();
      setGameData({
        ...data,
        shareUrl: `${window.location.origin}/game/${data.gameId}`
      });
      setStep('share');
    } catch (err) {
      setError('Failed to create game: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="creator-container">
        <div className="creator-photo-section card">
          <h1>📸 Create a Game</h1>
          <p>You need to be logged in to create a game.</p>
          <div className="button-group">
            <button onClick={() => openAuth('login')} className="btn btn-primary">
              Log in
            </button>
            <button onClick={() => openAuth('register')} className="btn btn-ghost">
              Register
            </button>
            <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ borderColor: 'transparent', color: '#6b7280' }}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="creator-container">
      {step === 'photo' && (
        <div className="creator-photo-section card">
          <h1>📸 Create a Game</h1>

          {processingPhoto ? (
            <div className="photo-processing">
              <div className="photo-spinner" />
              <p>Processing photo…</p>
            </div>
          ) : (
            <>
              <p>Choose how you want to add a photo:</p>
              <div className="button-group">
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="btn btn-primary"
                >
                  📤 Upload from Device
                </button>
                <button onClick={startCamera} className="btn btn-secondary">
                  📷 Take a Photo
                </button>
                <button onClick={() => navigate('/')} className="btn btn-ghost">
                  ← Back
                </button>
              </div>
            </>
          )}

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
            detectedCoordinates={detectedCoordinates}
            onConfirm={handleMapConfirm}
            loading={loading}
            onBack={() => { setStep('photo'); setDetectedCoordinates(null); }}
          />
        </div>
      )}

      {step === 'share' && gameData && <ShareModal gameData={gameData} />}
    </div>
  );
}

export default Creator;
