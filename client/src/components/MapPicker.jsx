import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvent, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../styles/MapPicker.css';

function FlyTo({ target }) {
  const map = useMap();
  if (target) map.setView(target, 10);
  return null;
}

function MapPicker({ photo, onConfirm, loading, onBack }) {
  const [coordinates, setCoordinates] = useState(null);
  const [markerPos, setMarkerPos] = useState([20, 0]);
  const [flyTarget, setFlyTarget] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const mapRef = useRef(null);

  const customIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZjAwMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
    iconSize: [32, 41],
    iconAnchor: [16, 41],
    popupAnchor: [0, -41]
  });

  function MapClickHandler() {
    useMapEvent('click', (e) => {
      setMarkerPos([e.latlng.lat, e.latlng.lng]);
      setCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng });
      setFlyTarget(null);
    });
    return null;
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMarkerPos([latitude, longitude]);
        setCoordinates({ lat: latitude, lng: longitude });
        setFlyTarget([latitude, longitude]);
        setGeoLoading(false);
      },
      () => {
        setGeoError('Unable to retrieve your location');
        setGeoLoading(false);
      }
    );
  };

  return (
    <div className="map-picker-container">
      <div className="map-picker-content">
        <h2>Mark the Location</h2>
        <p>Click on the map to place a marker at the correct location</p>

        <MapContainer center={[20, 0]} zoom={2} className="map-picker-map" ref={mapRef}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <MapClickHandler />
          <FlyTo target={flyTarget} />
          {coordinates && (
            <Marker position={markerPos} icon={customIcon}>
              <Popup>
                <div>
                  <p>Lat: {markerPos[0].toFixed(4)}</p>
                  <p>Lng: {markerPos[1].toFixed(4)}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        <div className="map-picker-controls">
          <button onClick={onBack} className="btn btn-ghost" disabled={loading}>
            ← Back
          </button>
          <button
            onClick={handleUseMyLocation}
            className="btn btn-secondary"
            disabled={loading || geoLoading}
          >
            {geoLoading ? '⏳ Locating...' : '📍 Use my current location'}
          </button>
          <button
            onClick={() => coordinates && onConfirm(coordinates)}
            className="btn btn-primary"
            disabled={!coordinates || loading}
          >
            {loading ? '⏳ Creating...' : '✓ Confirm Location'}
          </button>
        </div>
        {geoError && <p className="geo-error">{geoError}</p>}
      </div>
    </div>
  );
}

export default MapPicker;
