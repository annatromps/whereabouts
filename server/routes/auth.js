import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'whereabouts-dev-secret-change-in-production';

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (username.trim().length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getDb();

  db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()], async (err, existing) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    try {
      const hash = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username.trim(), email.toLowerCase(), hash],
        function (err) {
          if (err) return res.status(500).json({ error: 'Failed to create account' });

          const token = jwt.sign(
            { userId: this.lastID, username: username.trim() },
            JWT_SECRET,
            { expiresIn: '30d' }
          );
          res.json({ token, username: username.trim() });
        }
      );
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();

  db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    try {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      res.json({ token, username: user.username });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

export default router;
