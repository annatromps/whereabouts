import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvent, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import '../styles/GuesserMap.css';

function GuesserMap({ onGuess, lastFeedback }) {
  const [markerPos, setMarkerPos] = useState(null);
  const [guessing, setGuessing] = useState(false);
  const mapRef = useRef(null);

  const guesserIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
    iconSize: [32, 41],
    iconAnchor: [16, 41],
    popupAnchor: [0, -41]
  });

  function MapClickHandler() {
    useMapEvent('click', (e) => {
      setMarkerPos([e.latlng.lat, e.latlng.lng]);
    });
    return null;
  }

  const handleSubmitGuess = () => {
    if (!markerPos) return;
    setGuessing(true);
    onGuess({ lat: markerPos[0], lng: markerPos[1] });
    setGuessing(false);
  };

  return (
    <div className="guesser-map-container">
      <MapContainer center={[20, 0]} zoom={2} className="guesser-map-instance" ref={mapRef}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapClickHandler />
        {markerPos && (
          <Marker position={markerPos} icon={guesserIcon}>
            <Popup>
              <div>
                <p>Lat: {markerPos[0].toFixed(4)}</p>
                <p>Lng: {markerPos[1].toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="feedback-panel">
        {lastFeedback && (
          <div className={`feedback slideIn`}>
            <div className="temperature-badge" style={{ backgroundColor: lastFeedback.temperatureColor }}>
              {lastFeedback.temperature}
            </div>
            <div className="feedback-text">
              <p className="distance">📍 {lastFeedback.distance} km away</p>
              <p className="direction">🧭 {lastFeedback.direction}</p>
            </div>
          </div>
        )}
      </div>

      <div className="guess-controls">
        <button
          onClick={handleSubmitGuess}
          className="btn btn-primary"
          disabled={!markerPos || guessing}
        >
          {guessing ? '⏳ Submitting...' : '🎯 Guess'}
        </button>
      </div>
    </div>
  );
}

export default GuesserMap;
