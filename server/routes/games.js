import express from 'express';
import multer from 'multer';
import { getDb } from '../db.js';
import { generateGameId, calculateDistance, getDirection, getTemperature } from '../utils/gameUtils.js';

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
  console.log('[games] POST /api/games hit — file:', req.file ? `${req.file.size} bytes, ${req.file.mimetype}` : 'MISSING', '| body keys:', Object.keys(req.body));
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    const { lat, lng } = req.body;
    const answerLat = parseFloat(lat);
    const answerLng = parseFloat(lng);

    if (isNaN(answerLat) || isNaN(answerLng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const gameId = generateGameId();
    // Encode the image as a data URL so it needs no filesystem at all
    const photoData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const db = getDb();

    db.run(
      'INSERT INTO games (id, photo_path, answer_lat, answer_lng) VALUES (?, ?, ?, ?)',
      [gameId, photoData, answerLat, answerLng],
      (err) => {
        if (err) {
          console.error('[games] DB insert error:', err);
          return res.status(500).json({ error: 'Failed to save game to database' });
        }
        console.log(`[games] Created game ${gameId} (photo ${req.file.size} bytes)`);
        res.json({ gameId });
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

  db.get('SELECT photo_path FROM games WHERE id = ?', [gameId], (err, row) => {
    if (err) {
      console.error('[games] DB fetch error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Game not found — it may have expired or the link is invalid' });
    }

    // photo_path is a data URL (new games) or a legacy filename (old games)
    const photoUrl = row.photo_path.startsWith('data:')
      ? row.photo_path
      : `/uploads/${row.photo_path}`;

    res.json({ gameId, photoUrl });
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
    const correct = distance <= 50;

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
