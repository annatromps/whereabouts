import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvent, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../styles/GuesserMap.css';

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 5));
  }, [target]);
  return null;
}

function MapClickHandler({ onMarkerChange }) {
  useMapEvent('click', (e) => {
    onMarkerChange([e.latlng.lat, e.latlng.lng]);
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

function GuesserMap({ markerPos, onMarkerChange, isVisible }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  const guesserIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjEgMTBjMCA3LTkgMTMtOSAxM3MtOSAtNiAtOSAtMTNhOSA5IDAgMCAxIDE4IDB6Ii8+PC9zdmc+',
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

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
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
            placeholder="Search a place to navigate the map…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
          />
          {searchLoading && <span className="tl-search-spin" aria-label="Searching" />}
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

      <MapContainer center={[20, 0]} zoom={2} className="guesser-map-instance">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapClickHandler onMarkerChange={onMarkerChange} />
        <FlyTo target={flyTarget} />
        <InvalidateSize trigger={isVisible} />
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
    </div>
  );
}

export default GuesserMap;
