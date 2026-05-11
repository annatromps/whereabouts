// Generate a random game ID (6 character alphanumeric)
export function generateGameId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Haversine formula to calculate distance between two coordinates
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Get direction from guess to answer
export function getDirection(lat1, lon1, lat2, lon2) {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const bearing = Math.atan2(dLon, dLat) * (180 / Math.PI);
  const normalizedBearing = (bearing + 360) % 360;

  if (normalizedBearing >= 337.5 || normalizedBearing < 22.5) return 'North';
  if (normalizedBearing >= 22.5 && normalizedBearing < 67.5) return 'North-east';
  if (normalizedBearing >= 67.5 && normalizedBearing < 112.5) return 'East';
  if (normalizedBearing >= 112.5 && normalizedBearing < 157.5) return 'South-east';
  if (normalizedBearing >= 157.5 && normalizedBearing < 202.5) return 'South';
  if (normalizedBearing >= 202.5 && normalizedBearing < 247.5) return 'South-west';
  if (normalizedBearing >= 247.5 && normalizedBearing < 292.5) return 'West';
  if (normalizedBearing >= 292.5 && normalizedBearing < 337.5) return 'North-west';
}

// Get temperature label and color based on distance
export function getTemperature(distanceKm) {
  if (distanceKm <= 50) return { label: 'Correct!', color: '#10b981' }; // Green
  if (distanceKm <= 200) return { label: 'Scorching', color: '#dc2626' }; // Deep Red
  if (distanceKm <= 500) return { label: 'Hot', color: '#f97316' }; // Orange
  if (distanceKm <= 1000) return { label: 'Warm', color: '#fbbf24' }; // Amber
  if (distanceKm <= 2000) return { label: 'Cool', color: '#93c5fd' }; // Light Blue
  if (distanceKm <= 4000) return { label: 'Cold', color: '#3b82f6' }; // Blue
  return { label: 'Freezing', color: '#1e3a8a' }; // Dark Blue
}

// Round score: 5000 × (1 - distance / 20000)², clamped to 0
export function calcRoundScore(distanceKm) {
  return Math.max(0, 5000 * Math.pow(1 - distanceKm / 20000, 2));
}

// Final score: best round × 0.75^(guesses-1) − 400 per hint, clamped to 0
export function calcFinalScore(distances, hintsUsed = 0) {
  if (distances.length === 0) return 0;
  const best = Math.max(...distances.map(calcRoundScore));
  return Math.max(0, Math.round(best * Math.pow(0.75, distances.length - 1) - hintsUsed * 400));
}
