import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import exifr from 'exifr';
import MapPicker from '../components/MapPicker';
import ShareModal from '../components/ShareModal';
import '../styles/Creator.css';

function Creator() {
  const [step, setStep] = useState('photo');
  const [photo, setPhoto] = useState(null);
  const [detectedCoordinates, setDetectedCoordinates] = useState(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const logsEndRef = useRef(null);
  const navigate = useNavigate();

  // Stable log helper — also mirrors to console
  const dbg = useCallback((msg, level = 'ok') => {
    const t = new Date().toTimeString().slice(0, 8);
    const entry = { t, msg, level, id: `${Date.now()}-${Math.random()}` };
    if (level === 'error') console.error('[Creator]', msg);
    else if (level === 'warn') console.warn('[Creator]', msg);
    else console.log('[Creator]', msg);
    setLogs(prev => [...prev, entry]);
  }, []);

  // Keep a stable ref so the global handlers can call dbg without stale closures
  const dbgRef = useRef(dbg);
  useEffect(() => { dbgRef.current = dbg; }, [dbg]);

  // Catch unhandled promise rejections (blank-screen culprit candidate)
  useEffect(() => {
    const onReject = (e) => {
      dbgRef.current(`UNHANDLED REJECTION: ${e.reason?.message ?? String(e.reason)}`, 'error');
    };
    const onError = (e) => {
      dbgRef.current(`UNCAUGHT ERROR: ${e.message} (${e.filename}:${e.lineno})`, 'error');
    };
    window.addEventListener('unhandledrejection', onReject);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onReject);
      window.removeEventListener('error', onError);
    };
  }, []);

  // Auto-scroll log panel to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      dbg('onChange fired but files[0] is empty — ignoring', 'warn');
      return;
    }

    dbg(`File selected: "${file.name}" type=${file.type} size=${(file.size / 1024).toFixed(1)} KB`);

    // Reset input so the same file can be re-selected if needed
    try { e.target.value = ''; dbg('File input reset OK'); }
    catch (resetErr) { dbg(`File input reset failed: ${resetErr.message}`, 'warn'); }

    setProcessingPhoto(true);
    setError('');

    try {
      // ── Step 1: FileReader ────────────────────────────────────────────────
      dbg('Starting FileReader.readAsDataURL…');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadstart = () => dbg('FileReader: loadstart');
        reader.onprogress = (ev) => {
          if (ev.lengthComputable)
            dbg(`FileReader: progress ${Math.round((ev.loaded / ev.total) * 100)}%`);
        };
        reader.onload = (ev) => {
          const len = ev.target.result?.length ?? 0;
          dbg(`FileReader: onload — dataUrl length ${len}`);
          resolve(ev.target.result);
        };
        reader.onerror = (ev) => {
          const msg = reader.error?.message ?? 'unknown FileReader error';
          dbg(`FileReader: onerror — ${msg}`, 'error');
          reject(new Error(msg));
        };
        reader.onabort = () => {
          dbg('FileReader: onabort', 'error');
          reject(new Error('File read was aborted'));
        };

        reader.readAsDataURL(file);
      });

      dbg(`File read complete (${(dataUrl.length / 1024).toFixed(1)} KB as base64)`);

      // ── Step 2: Set photo state ───────────────────────────────────────────
      dbg('Calling setPhoto()…');
      setPhoto(dataUrl);
      dbg('setPhoto() called — photo state queued');

      // ── Step 3: EXIF GPS (optional, 3s timeout) ───────────────────────────
      dbg('Starting EXIF extraction (3 s timeout)…');
      let gps = null;
      try {
        gps = await Promise.race([
          exifr.gps(file).catch((err) => {
            dbg(`EXIF rejected: ${err?.message}`, 'warn');
            return null;
          }),
          new Promise((resolve) =>
            setTimeout(() => {
              dbg('EXIF timed out after 3 s — continuing without GPS', 'warn');
              resolve(null);
            }, 3000)
          ),
        ]);
        dbg(gps ? `EXIF GPS: lat=${gps.latitude} lng=${gps.longitude}` : 'EXIF: no GPS data');
      } catch (exifErr) {
        dbg(`EXIF threw: ${exifErr?.message}`, 'warn');
        gps = null;
      }

      setDetectedCoordinates(gps ? { lat: gps.latitude, lng: gps.longitude } : null);

      // ── Step 4: Advance to map ────────────────────────────────────────────
      dbg('Calling setStep("map")…');
      setStep('map');
      dbg('✅ Done — should now show map');

    } catch (err) {
      dbg(`handleFileSelect FAILED: ${err.message}`, 'error');
      setError(`Failed to load photo: ${err.message}`);
    } finally {
      setProcessingPhoto(false);
      dbg('processingPhoto set to false');
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

  // ── Debug log panel ─────────────────────────────────────────────────────
  const DebugPanel = logs.length > 0 && (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <span>📋 Upload debug log</span>
        <button className="debug-clear-btn" onClick={() => setLogs([])}>Clear</button>
      </div>
      <div className="debug-entries">
        {logs.map((entry) => (
          <div key={entry.id} className={`debug-entry debug-${entry.level}`}>
            <span className="debug-time">{entry.t}</span>
            <span className="debug-msg">{entry.msg}</span>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );

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

          {DebugPanel}
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
