import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { generateGameId, calculateDistance, getDirection, getTemperature } from '../utils/gameUtils.js';

const JWT_SECRET = process.env.JWT_SECRET || 'whereabouts-dev-secret-change-in-production';

const router = express.Router();

// Store uploads in memory — avoids all filesystem path issues on Railway/cloud
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB hard cap (client resizes to ~300 KB)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// POST /api/games — Create a new game
router.post('/', upload.single('photo'), (req, res) => {
  const { lat, lng } = req.body;
  console.log('[games] POST /api/games — file:', req.file ? `${req.file.size} bytes, ${req.file.mimetype}` : 'MISSING', '| lat:', lat, '| lng:', lng, '| lat type:', typeof lat);
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    const answerLat = parseFloat(lat);
    const answerLng = parseFloat(lng);
    console.log('[games] Parsed coords — answerLat:', answerLat, '| answerLng:', answerLng, '| isNaN:', isNaN(answerLat) || isNaN(answerLng));

    if (isNaN(answerLat) || isNaN(answerLng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const winRadiusRaw = parseInt(req.body.win_radius_km);
    const winRadius = Number.isFinite(winRadiusRaw) ? Math.min(500, Math.max(10, winRadiusRaw)) : 50;

    // Optional auth — attach creator username if a valid JWT is present
    let creatorUsername = null;
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        creatorUsername = payload.username || null;
      } catch { /* invalid/expired — anonymous game */ }
    }

    const gameId = generateGameId();
    const photoData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const db = getDb();

    db.run(
      'INSERT INTO games (id, photo_path, answer_lat, answer_lng, creator_username, win_radius_km) VALUES (?, ?, ?, ?, ?, ?)',
      [gameId, photoData, answerLat, answerLng, creatorUsername, winRadius],
      (err) => {
        if (err) {
          console.error('[games] DB insert error:', err);
          return res.status(500).json({ error: 'Failed to save game to database' });
        }
        const base = process.env.BASE_URL
          ? process.env.BASE_URL.replace(/\/$/, '')
          : `${req.protocol}://${req.get('host')}`;
        const shareUrl = `${base}/game/${gameId}`;
        console.log(`[games] Created game ${gameId} by ${creatorUsername ?? 'anonymous'} (photo ${req.file.size} bytes) shareUrl: ${shareUrl}`);
        res.json({ gameId, creatorName: creatorUsername, shareUrl });
      }
    );
  } catch (err) {
    console.error('[games] POST / error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// GET /api/games/:gameId — Return game photo URL (no answer revealed)
router.get('/:gameId', (req, res) => {
  const { gameId } = req.params;
  const db = getDb();

  db.get('SELECT photo_path, creator_username FROM games WHERE id = ?', [gameId], (err, row) => {
    if (err) {
      console.error('[games] DB fetch error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Game not found — it may have expired or the link is invalid' });
    }

    const photoUrl = row.photo_path.startsWith('data:')
      ? row.photo_path
      : `/uploads/${row.photo_path}`;

    const base = process.env.BASE_URL
      ? process.env.BASE_URL.replace(/\/$/, '')
      : `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${base}/game/${gameId}`;
    res.json({ gameId, photoUrl, creatorName: row.creator_username || null, shareUrl, winRadius: row.win_radius_km || 50 });
  });
});

// POST /api/games/:gameId/guess — Submit a guess
router.post('/:gameId/guess', (req, res) => {
  const { gameId } = req.params;
  const { lat, lng } = req.body;
  const guessLat = parseFloat(lat);
  const guessLng = parseFloat(lng);

  if (isNaN(guessLat) || isNaN(guessLng)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  const db = getDb();

  db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
    if (err || !game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const distance = calculateDistance(guessLat, guessLng, game.answer_lat, game.answer_lng);
    const direction = getDirection(guessLat, guessLng, game.answer_lat, game.answer_lng);
    const { label, color } = getTemperature(distance);
    const correct = distance <= (game.win_radius_km || 50);

    db.run(
      'INSERT INTO guesses (game_id, lat, lng, distance_km) VALUES (?, ?, ?, ?)',
      [gameId, guessLat, guessLng, distance],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to store guess' });
        }

        const response = {
          distance: Math.round(distance),
          direction,
          temperature: label,
          temperatureColor: color,
          correct
        };

        if (correct) {
          response.answerLat = game.answer_lat;
          response.answerLng = game.answer_lng;
        }

        res.json(response);
      }
    );
  });
});

// GET /api/games/:gameId/guesses — All guesses for a game
router.get('/:gameId/guesses', (req, res) => {
  const { gameId } = req.params;
  const db = getDb();

  db.all(
    'SELECT * FROM guesses WHERE game_id = ? ORDER BY created_at ASC',
    [gameId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch guesses' });
      }
      res.json({ guesses: rows || [] });
    }
  );
});

export default router;
