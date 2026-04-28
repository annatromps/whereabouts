import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDb } from '../db.js';
import { generateGameId, calculateDistance, getDirection, getTemperature } from '../utils/gameUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// POST /api/games - Create a new game
router.post('/', upload.single('photo'), (req, res) => {
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
    const photoPath = req.file.filename;
    const db = getDb();

    db.run(
      'INSERT INTO games (id, photo_path, answer_lat, answer_lng) VALUES (?, ?, ?, ?)',
      [gameId, photoPath, answerLat, answerLng],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to create game' });
        }

        const shareUrl = `${BASE_URL}/game/${gameId}`;
        res.json({ gameId, shareUrl });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/games/:gameId - Get game photo (doesn't reveal answer)
router.get('/:gameId', (req, res) => {
  try {
    const { gameId } = req.params;
    const db = getDb();

    db.get('SELECT photo_path FROM games WHERE id = ?', [gameId], (err, row) => {
      if (err) {
        console.error('DB error fetching game:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Game not found — it may have expired or the link is invalid' });
      }

      const photoUrl = `/uploads/${row.photo_path}`;
      res.json({ gameId, photoUrl });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/games/:gameId/guess - Submit a guess
router.post('/:gameId/guess', (req, res) => {
  try {
    const { gameId } = req.params;
    const { lat, lng } = req.body;
    const guessLat = parseFloat(lat);
    const guessLng = parseFloat(lng);

    if (isNaN(guessLat) || isNaN(guessLng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const db = getDb();

    // Get the game and answer
    db.get('SELECT * FROM games WHERE id = ?', [gameId], (err, game) => {
      if (err || !game) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const distance = calculateDistance(guessLat, guessLng, game.answer_lat, game.answer_lng);
      const direction = getDirection(guessLat, guessLng, game.answer_lat, game.answer_lng);
      const { label, color } = getTemperature(distance);
      const correct = distance <= 50;

      // Store the guess
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/games/:gameId/guesses - Get all guesses for a game
router.get('/:gameId/guesses', (req, res) => {
  try {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
