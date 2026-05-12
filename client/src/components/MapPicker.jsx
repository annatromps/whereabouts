import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvent, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import exifr from 'exifr';
import ThemedLoader from './ThemedLoader';
import '../styles/MapPicker.css';

const isValidPos = (pos) =>
  Array.isArray(pos) && Number.isFinite(pos[0]) && Number.isFinite(pos[1]);

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!isValidPos(target)) return;
    map.flyTo(target, Math.max(map.getZoom(), 12));
  }, [target]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvent('click', (e) => {
    const { lat, lng } = e.latlng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      onMapClick([lat, lng]);
    }
  });
  return null;
}

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

function MapPicker({ file, photoSource = 'upload', cameraLocation = null, onConfirm, loading, onBack }) {
  const [coordinates, setCoordinates] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [winRadius, setWinRadius] = useState(50);
  const [flyTarget, setFlyTarget] = useState(null);
  const [locationFromPhoto, setLocationFromPhoto] = useState(false);
  const [exifStatus, setExifStatus] = useState(null); // null|'reading'|'found'|'not-found'|'error'
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

  // If Creator resolved geo before the map opened, place the pin immediately.
  useEffect(() => {
    if (!cameraLocation || photoSource !== 'camera') return;
    if (manualPinRef.current) return;
    const pos = [cameraLocation.lat, cameraLocation.lng];
    setMarkerPos(pos);
    setCoordinates({ lat: pos[0], lng: pos[1] });
    setFlyTarget(pos);
    setLocationFromPhoto(true);
  }, [cameraLocation, photoSource]);

  // Fallback: if Creator's early geo request hasn't resolved yet, try from here.
  useEffect(() => {
    if (photoSource !== 'camera') return;
    if (cameraLocation) return; // already handled by prop-watching effect above
    if (!navigator.geolocation) {
      setGeoError('Location not available on this device');
      return;
    }
    setGeoLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (cancelled) return;
          setGeoLoading(false);
          if (manualPinRef.current) return;
          const pos = [coords.latitude, coords.longitude];
          setMarkerPos(pos);
          setCoordinates({ lat: pos[0], lng: pos[1] });
          setFlyTarget(pos);
          setLocationFromPhoto(true);
        },
        (err) => {
          if (cancelled) return;
          console.error('[GEO] Auto — code:', err.code, 'message:', err.message, 'full:', err);
          setGeoLoading(false);
          const msg = err.code === 1
            ? 'Location permission denied — tap \'Use my location\' or drop a pin manually'
            : 'Couldn\'t detect location automatically — tap \'Use my location\' or drop a pin manually';
          setGeoError(msg);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      );
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [photoSource]);

  // Read GPS from the raw file as soon as MapPicker mounts.
  // This runs on the original File before any resizing/compression, which is
  // the only time EXIF metadata is intact. Camera blobs never carry EXIF GPS.
  useEffect(() => {
    if (!file || photoSource === 'camera') return;
    let cancelled = false;
    setExifStatus('reading');
    console.log('[EXIF] Reading file:', file.name ?? '(blob)', file.type, file.size + ' bytes');

    const read = async () => {
      try {
        // Primary: exifr.gps() — fast GPS-only parse
        let gps = await exifr.gps(file);
        if (cancelled) return;
        console.log('[EXIF] exifr.gps() returned:', gps);

        // Fallback: full parse in case GPS sits in a non-standard IFD segment
        if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) {
          const parsed = await exifr.parse(file, { gps: true });
          if (cancelled) return;
          console.log('[EXIF] exifr.parse() fallback returned:', parsed);
          if (parsed?.latitude && parsed?.longitude) {
            gps = { latitude: parsed.latitude, longitude: parsed.longitude };
          }
        }

        if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
          console.log('[EXIF] GPS found — lat:', gps.latitude, 'lng:', gps.longitude);
          setExifStatus('found');
          if (!manualPinRef.current) {
            const pos = [gps.latitude, gps.longitude];
            setMarkerPos(pos);
            setCoordinates({ lat: pos[0], lng: pos[1] });
            setFlyTarget(pos);
            setLocationFromPhoto(true);
          }
        } else {
          console.log('[EXIF] No GPS data found in this photo');
          setExifStatus('not-found');
        }
      } catch (err) {
        if (!cancelled) {
          console.log('[EXIF] Error reading file:', err?.message);
          setExifStatus('error');
        }
      }
    };

    read();
    return () => { cancelled = true; };
  }, [file, photoSource]);

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
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
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
        console.log('[GEO] getCurrentPosition success:', coords.latitude, coords.longitude);
        const pos = [coords.latitude, coords.longitude];
        manualPinRef.current = true;
        placePin(pos);
        console.log('[GEO] coordinates stored in state:', { lat: pos[0], lng: pos[1] });
        setFlyTarget(pos);
        setLocationFromPhoto(false);
        setGeoLoading(false);
      },
      (err) => {
        console.error('[GEO] Manual — code:', err.code, 'message:', err.message, 'full:', err);
        setGeoError('Unable to retrieve your location');
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  return (
    <div className="map-picker-container">
      <div className="map-picker-content">
        <div className="map-picker-header">
          <h2>Mark the Location</h2>
          <p>Search for a place, or tap the map to drop a pin</p>
        </div>

        {photoSource === 'upload' && exifStatus === 'reading' && (
          <div className="exif-status exif-status--reading">
            🔍 Reading location data…
          </div>
        )}
        {photoSource === 'upload' && exifStatus === 'not-found' && (
          <div className="exif-status exif-status--none">
            ℹ️ No location in this photo — drop a pin or tap "Use my location"
          </div>
        )}
        {photoSource === 'upload' && exifStatus === 'error' && (
          <div className="exif-status exif-status--error">
            ⚠️ Couldn't read photo location — drop a pin or tap "Use my location"
          </div>
        )}
        {locationFromPhoto && (
          <div className="location-detected-banner">
            {photoSource === 'camera'
              ? '✓ Location set from your device — move the pin to adjust if needed'
              : '✓ Location found in photo — move the pin to adjust if needed'}
          </div>
        )}

        <div className="map-location-tools">
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
              <button
                className="map-location-icon-btn"
                onClick={handleUseMyLocation}
                disabled={loading || geoLoading}
                aria-label="Use my location"
              >
                {geoLoading ? <span className="tl-search-spin" /> : <LocationIcon />}
              </button>
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
          {geoError && <p className="geo-error">{geoError}</p>}
        </div>

        <div className="map-picker-map-area">
          <MapContainer center={[20, 0]} zoom={2} className="map-picker-map" ref={mapRef} zoomControl={false} attributionControl={false}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles © Esri'
            />
            <ZoomControl position="bottomright" />
            <MapClickHandler onMapClick={handleMapClick} />
            <FlyTo target={flyTarget} />
            {isValidPos(markerPos) && (
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

        <div className="map-radius-control">
          <div className="map-radius-header">
            <span className="map-radius-label">Win radius</span>
            <span className="map-radius-value">Within {winRadius} km</span>
          </div>
          <input
            type="range"
            className="map-radius-slider"
            min="10"
            max="500"
            step="5"
            value={winRadius}
            onChange={e => setWinRadius(Number(e.target.value))}
          />
        </div>

        <div className="map-picker-controls">
          <button onClick={onBack} className="btn btn-ghost" disabled={loading}>
            ← Back
          </button>
          <button
            onClick={() => coordinates && onConfirm(coordinates, winRadius)}
            className="btn btn-primary"
            disabled={!coordinates || loading}
          >
            {loading ? <><ThemedLoader variant="dots" />Creating…</> : '✓ Confirm Location'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MapPicker;
