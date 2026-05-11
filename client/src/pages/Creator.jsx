import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../context/AuthContext';
import '../styles/Creator.css';

// Resize a File/Blob to maxDim on its longest side, re-encode as JPEG.
// Returns a Blob. Falls back to the original if anything goes wrong.
// 10-second safety timeout guards against canvas.toBlob never firing.
function resizeImage(source, maxDim = 1200) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(source), 10000);

    const url = URL.createObjectURL(source);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const tw = Math.round(w * scale);
      const th = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      canvas.getContext('2d').drawImage(img, 0, 0, tw, th);

      canvas.toBlob((blob) => {
        clearTimeout(timer);
        resolve(blob ?? source);
      }, 'image/jpeg', 0.85);
    };

    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(source);
    };

    img.src = url;
  });
}

function Creator() {
  const { getToken } = useAuth();
  const [step, setStep] = useState('photo');
  const [photo, setPhoto] = useState(null);   // object URL — instant, never crashes
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');
  const [sizeWarning, setSizeWarning] = useState('');
  const [originalFile, setOriginalFile] = useState(null); // passed to MapPicker for EXIF + upload
  const [photoSource, setPhotoSource] = useState('upload'); // 'upload' | 'camera'
  const [cameraLocation, setCameraLocation] = useState(null); // {lat,lng} from geo at capture time

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const originalFileRef = useRef(null);  // File/Blob kept for upload
  const previewUrlRef = useRef(null);    // tracked so we can revoke on unmount
  const navigate = useNavigate();

  // Revoke the object URL when the component unmounts to free memory
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const sizeMB = file.size / 1024 / 1024;

    try { e.target.value = ''; } catch { /* ignore reset errors */ }

    // Revoke any previous preview URL
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);

    // Instant preview — URL.createObjectURL never fails regardless of file size
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    originalFileRef.current = file;

    setPhoto(previewUrl);
    setOriginalFile(file);
    setPhotoSource('upload');
    setError('');
    setSizeWarning(sizeMB > 8 ? `Large file (${sizeMB.toFixed(1)} MB) — will compress before uploading` : '');

    // Navigate to map — MapPicker handles EXIF reading with the raw file
    setStep('map');
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      document.querySelector('.creator-photo-section').style.display = 'none';
      document.querySelector('.camera-view').style.display = 'block';
    } catch {
      setError('Camera access denied');
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    video.srcObject.getTracks().forEach(t => t.stop());

    // Request device location immediately at capture time.
    // The result (or null on failure) is passed to MapPicker so the pin
    // is pre-placed as soon as — or before — the map view opens.
    setCameraLocation(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setCameraLocation({ lat: coords.latitude, lng: coords.longitude }),
        () => setCameraLocation(null),
        { timeout: 10000, maximumAge: 60000 }
      );
    }

    canvas.toBlob((blob) => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      originalFileRef.current = blob;
      setOriginalFile(blob);
      setPhotoSource('camera');
      setPhoto(url);
      setSizeWarning('');
      document.querySelector('.creator-photo-section').style.display = 'block';
      document.querySelector('.camera-view').style.display = 'none';
      setStep('map');
    }, 'image/jpeg');
  };

  const handleMapConfirm = async (coordinates) => {
    if (!originalFileRef.current) {
      setError('No photo to upload — please go back and select one');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const blob = await resizeImage(originalFileRef.current, 1200);
      setSizeWarning('');

      const formData = new FormData();
      formData.append('photo', blob, 'photo.jpg');
      formData.append('lat', coordinates.lat);
      formData.append('lng', coordinates.lng);

      console.log('[Creator] POST /api/games payload:', {
        blobSize: blob.size,
        blobType: blob.type,
        lat: coordinates.lat,
        lng: coordinates.lng,
        latType: typeof coordinates.lat,
        lngType: typeof coordinates.lng,
        latValid: Number.isFinite(coordinates.lat),
        lngValid: Number.isFinite(coordinates.lng),
      });

      const token = getToken();
      const response = await fetch('/api/games', {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[Creator] Server error:', response.status, text);
        let body = {};
        try { body = JSON.parse(text); } catch { /* non-JSON body */ }
        throw new Error(body.error || `Server error (${response.status})`);
      }

      const data = await response.json();
      console.log('[Creator] Game created:', data.gameId);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      setGameData({
        ...data,
        shareUrl: `${window.location.origin}/game/${data.gameId}`,
      });
      setStep('share');
    } catch (err) {
      const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
      console.error('[Creator] Upload failed — type:', err.constructor.name, '| message:', err.message, '| isNetworkError:', isNetworkError);
      setError(isNetworkError
        ? 'Could not reach the server — check your connection and try again'
        : err.message.startsWith('Server error') ? err.message : 'Upload failed: ' + err.message);
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
          </div>
          <button onClick={() => navigate('/')} className="creator-back-link">
            ← Back
          </button>
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
        <video ref={videoRef} autoPlay playsInline />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <button onClick={capturePhoto} className="btn btn-primary capture-btn">
          📸 Capture
        </button>
      </div>

      {step === 'map' && photo && (
        <div className="creator-map-section">
          {sizeWarning && <div className="size-warning">{sizeWarning}</div>}
          {error && <div className="error-banner">⚠️ {error}</div>}
          <MapPicker
            file={originalFile}
            photoSource={photoSource}
            cameraLocation={photoSource === 'camera' ? cameraLocation : null}
            onConfirm={handleMapConfirm}
            loading={loading}
            onBack={() => { setStep('photo'); setSizeWarning(''); setOriginalFile(null); setError(''); setCameraLocation(null); }}
          />
        </div>
      )}

      {step === 'share' && gameData && <ShareModal gameData={gameData} />}
    </div>
  );
}

export default Creator;
