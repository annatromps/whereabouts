import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import gamesRouter from './routes/games.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prevent any unhandled error from silently crashing the process — log and keep running.
// Without this, exceptions thrown inside sqlite3 callbacks (which fire from C++ land)
// would exit Node, tear down the TCP socket, and the browser sees "Failed to fetch".
process.on('uncaughtException', (err) => {
  console.error('[server] UNCAUGHT EXCEPTION (server kept alive):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] UNHANDLED REJECTION (server kept alive):', reason);
});

const START_TIME = new Date().toISOString();

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Initialize database
await initDb();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', port: PORT, startedAt: START_TIME });
});
app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Global error handler — ensures API errors always return JSON (not HTML)
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: `Server error: ${err.message}` });
});

app.listen(PORT, () => {
  const distPath = path.join(__dirname, '../client/dist');
  const distExists = fs.existsSync(distPath);
  console.log(`📍 Whereabouts server running on http://localhost:${PORT}`);
  console.log(`📦 client/dist: ${distExists ? '✅ found' : '❌ MISSING — frontend will not load'}`);
});
