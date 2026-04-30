import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvent, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import ThemedLoader from './ThemedLoader';
import '../styles/MapPicker.css';

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 12));
  }, [target]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvent('click', (e) => {
    onMapClick([e.latlng.lat, e.latlng.lng]);
  });
  return null;
}

function MapPicker({ photo, detectedCoordinates, exifStatus, onConfirm, loading, onBack }) {
  const [coordinates, setCoordinates] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [locationFromPhoto, setLocationFromPhoto] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const mapRef = useRef(null);
  // Track whether the user has manually placed a pin so EXIF won't clobber it
  const manualPinRef = useRef(false);

  const customIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZjAwMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
    iconSize: [32, 41],
    iconAnchor: [16, 41],
    popupAnchor: [0, -41]
  });

  // Debounced Nominatim search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
        );
        const data = await res.json();
        setSearchResults(data);
        setShowResults(true);
      } catch {
        // silent — search is best-effort
      } finally {
        setSearchLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Apply EXIF GPS coordinates once they arrive from Creator.
  // Only fires if the user hasn't already manually placed a pin.
  useEffect(() => {
    if (!detectedCoordinates) return;
    if (manualPinRef.current) return; // don't override a user-placed pin

    const pos = [detectedCoordinates.lat, detectedCoordinates.lng];
    setMarkerPos(pos);
    setCoordinates({ lat: pos[0], lng: pos[1] });
    setFlyTarget(pos);
    setLocationFromPhoto(true);
  }, [detectedCoordinates]);

  // Place a pin programmatically (EXIF / geolocation / search)
  const placePin = (pos) => {
    setMarkerPos(pos);
    setCoordinates({ lat: pos[0], lng: pos[1] });
  };

  // User tapped the map — mark as manual so EXIF won't override later
  const handleMapClick = (pos) => {
    manualPinRef.current = true;
    placePin(pos);
    setFlyTarget(null);
    setLocationFromPhoto(false);
  };

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const pos = [lat, lng];
    manualPinRef.current = true;
    placePin(pos);
    setFlyTarget(pos);
    setLocationFromPhoto(false);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = [coords.latitude, coords.longitude];
        manualPinRef.current = true;
        placePin(pos);
        setFlyTarget(pos);
        setLocationFromPhoto(false);
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
        <div className="map-picker-header">
          <h2>Mark the Location</h2>
          <p>Search for a place, or tap the map to drop a pin</p>
        </div>

        {exifStatus === 'reading' && (
          <div className="exif-status exif-status--reading">
            🔍 Reading location data…
          </div>
        )}
        {exifStatus === 'not-found' && (
          <div className="exif-status exif-status--none">
            ℹ️ No location data in this photo
          </div>
        )}
        {exifStatus === 'error' && (
          <div className="exif-status exif-status--error">
            ⚠️ Couldn't read location data from this photo
          </div>
        )}
        {locationFromPhoto && (
          <div className="location-detected-banner">
            📍 Location detected from photo — tap Confirm or move the pin to adjust
          </div>
        )}

        <div className="map-picker-map-area">
          {/* Search overlay — floats above the Leaflet map */}
          <div className="map-search">
            <div className="map-search-input-wrapper">
              <span className="map-search-icon">🔍</span>
              <input
                type="text"
                className="map-search-input"
                placeholder="Search address, postcode, city or country…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 150)}
              />
              {searchLoading && <span className="tl-search-spin" aria-label="Searching" />}
            </div>
            {showResults && searchResults.length > 0 && (
              <ul className="map-search-results">
                {searchResults.map((result) => (
                  <li
                    key={result.place_id}
                    className="map-search-result"
                    onMouseDown={() => handleSelectResult(result)}
                  >
                    {result.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <MapContainer center={[20, 0]} zoom={2} className="map-picker-map" ref={mapRef}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <FlyTo target={flyTarget} />
            {markerPos && (
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
        </div>

        <div className="map-picker-controls">
          <button onClick={onBack} className="btn btn-ghost" disabled={loading}>
            ← Back
          </button>
          <button
            onClick={handleUseMyLocation}
            className="btn btn-secondary"
            disabled={loading || geoLoading}
          >
            {geoLoading ? <><ThemedLoader variant="dots" />Locating…</> : '📍 Use my location'}
          </button>
          <button
            onClick={() => coordinates && onConfirm(coordinates)}
            className="btn btn-primary"
            disabled={!coordinates || loading}
          >
            {loading ? <><ThemedLoader variant="dots" />Creating…</> : '✓ Confirm Location'}
          </button>
        </div>
        {geoError && <p className="geo-error">{geoError}</p>}
      </div>
    </div>
  );
}

export default MapPicker;
