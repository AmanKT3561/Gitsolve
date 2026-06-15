'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');

const connectDB = require('./config/db');
const configurePassport = require('./config/passport-github');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Core middleware ---
app.use(
  cors({
    // The extension sends requests from chrome-extension://<id> (Origin: null
    // in some flows) and the dashboard from FRONTEND_URL. Allow both plus the
    // success page. Credentials aren't used (JWT is sent as a bearer header).
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '2mb' }));

// --- Passport (stateless) ---
configurePassport();
app.use(passport.initialize());

// --- Routes ---
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// 404 + error handler (must be last)
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

// --- Boot ---
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`[server] GitSolve AI backend listening on port ${PORT}`));
  } catch (err) {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
})();

module.exports = app;
