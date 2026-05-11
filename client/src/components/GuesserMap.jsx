import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvent, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import '../styles/GuesserMap.css';

const isValidPos = (pos) =>
  Array.isArray(pos) && Number.isFinite(pos[0]) && Number.isFinite(pos[1]);

// Tabler ti-current-location equivalent: outer circle + inner dot + 4 crosshair stubs
const LocationIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <circle cx="12" cy="12" r="7.5"/>
    <line x1="12" y1="2"  x2="12" y2="4.5"/>
    <line x1="12" y1="19.5" x2="12" y2="22"/>
    <line x1="2"  y1="12" x2="4.5" y2="12"/>
    <line x1="19.5" y1="12" x2="22" y2="12"/>
  </svg>
);

// Active (not-yet-submitted) pin — red teardrop
const activePinIcon = L.icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E44947" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9 -6 -9 -13a9 9 0 0 1 18 0z"/></svg>'
  ),
  iconSize: [32, 41],
  iconAnchor: [16, 41],
  popupAnchor: [0, -41]
});

// Numbered circle using the guess's temperature colour
const makeNumberedIcon = (color, number) => L.divIcon({
  className: '',
  html: `<div class="guess-pin" style="background:${color}">${number}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16]
});

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!isValidPos(target)) return;
    map.flyTo(target, Math.max(map.getZoom(), 5));
  }, [target]);
  return null;
}

function MapClickHandler({ onMarkerChange }) {
  useMapEvent('click', (e) => {
    const { lat, lng } = e.latlng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      onMarkerChange([lat, lng]);
    }
  });
  return null;
}

function InvalidateSize({ trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!trigger) return;
    const id = setTimeout(() => map.invalidateSize(), 370);
    return () => clearTimeout(id);
  }, [trigger]);
  return null;
}

function GuesserMap({ markerPos, onMarkerChange, isVisible, pastGuesses = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

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

  const handlePanToMyLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFlyTarget([coords.latitude, coords.longitude]);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    onMarkerChange([lat, lng]);
    setFlyTarget([lat, lng]);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  return (
    <div className="guesser-map-container">
      {/* Search overlay */}
      <div className="guesser-search">
        <div className="guesser-search-input-wrapper">
          <span className="guesser-search-icon">🔍</span>
          <input
            type="text"
            className="guesser-search-input"
            placeholder="Search a place..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
          />
          {searchLoading && <span className="tl-search-spin" aria-label="Searching" />}
          <button
            className="guesser-location-icon-btn"
            onClick={handlePanToMyLocation}
            disabled={geoLoading}
            aria-label="Pan to my location"
          >
            {geoLoading ? <span className="tl-search-spin" /> : <LocationIcon />}
          </button>
        </div>
        {showResults && searchResults.length > 0 && (
          <ul className="guesser-search-results">
            {searchResults.map((result) => (
              <li
                key={result.place_id}
                className="guesser-search-result"
                onMouseDown={() => handleSelectResult(result)}
              >
                {result.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <MapContainer center={[20, 0]} zoom={2} className="guesser-map-instance" zoomControl={false} attributionControl={false}>
        <ZoomControl position="bottomright" />
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapClickHandler onMarkerChange={onMarkerChange} />
        <FlyTo target={flyTarget} />
        <InvalidateSize trigger={isVisible} />
        {pastGuesses.map((g, i) => {
          const pos = [g.coordinates.lat, g.coordinates.lng];
          if (!isValidPos(pos)) return null;
          const icon = makeNumberedIcon(g.feedback.temperatureColor, i + 1);
          return (
            <Marker key={`past-${i}`} position={pos} icon={icon}>
              <Popup>
                <div>
                  <strong>Guess #{i + 1}</strong>
                  <p>{g.feedback.temperature} · {g.feedback.distance} km {g.feedback.direction}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {isValidPos(markerPos) && (
          <Marker position={markerPos} icon={activePinIcon}>
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
  );
}

export default GuesserMap;
