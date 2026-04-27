# PhotoGuessr

A web app where creators upload photos and mark locations, while guessers try to pinpoint where photos were taken on a map.

## Features

### Creator Flow
- 📸 Take a photo with device camera or upload from gallery
- 📍 Mark the exact answer location on a world map
- 🔗 Generate a shareable game link
- 📱 QR code for easy mobile sharing

### Guesser Flow
- 🎯 See the photo and guess the location on a map
- 🌡️ Receive warm/cold directional feedback
- 📊 Track number of guesses
- ✅ Win when within 50 km of the answer

## Tech Stack

- **Frontend**: React + Vite + Leaflet.js
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Storage**: Local file system (uploads directory)

## Setup

### Prerequisites
- Node.js 16+
- npm

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd whereabouts
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp .env.example .env
```

4. Start development servers
```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3000`
- Frontend development server on `http://localhost:5173`

## API Endpoints

### Create Game
```
POST /api/games
Body: FormData with photo (file) and lat/lng (floats)
Response: { gameId, shareUrl }
```

### Get Game
```
GET /api/games/:gameId
Response: { photoUrl }
```

### Submit Guess
```
POST /api/games/:gameId/guess
Body: { lat, lng }
Response: { distance, direction, temperature, temperatureColor, correct, answerLat?, answerLng? }
```

### Get Guesses
```
GET /api/games/:gameId/guesses
Response: { guesses: [...] }
```

## Database Schema

### Games Table
```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  photo_path TEXT NOT NULL,
  answer_lat REAL NOT NULL,
  answer_lng REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);
```

### Guesses Table
```sql
CREATE TABLE guesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  distance_km REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games (id)
);
```

## Temperature Thresholds

| Distance | Label | Color |
|----------|-------|-------|
| 0–50 km | Correct! | Green |
| 51–200 km | Scorching | Deep Red |
| 201–500 km | Hot | Orange |
| 501–1000 km | Warm | Amber |
| 1001–2000 km | Cool | Light Blue |
| 2001–4000 km | Cold | Blue |
| 4000+ km | Freezing | Dark Blue |

## Environment Variables

- `PORT`: Server port (default: 3000)
- `UPLOAD_DIR`: Directory for uploaded photos (default: ./uploads)
- `BASE_URL`: Base URL for sharing (default: http://localhost:3000)
- `NODE_ENV`: Environment (development/production)

## License

MIT
