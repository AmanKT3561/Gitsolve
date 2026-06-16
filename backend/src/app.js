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
// Open the port FIRST so the platform's port scan succeeds immediately, then
// connect to MongoDB in the background. A slow/misconfigured DB no longer
// prevents the service (and /health) from coming up — it just logs and retries.
app.listen(PORT, () => console.log(`[server] GitSolve AI backend listening on port ${PORT}`));

async function connectWithRetry(attempt = 1) {
  try {
    await connectDB();
  } catch (err) {
    console.error(`[server] MongoDB connection failed (attempt ${attempt}): ${err.message}`);
    if (/not set/i.test(err.message)) return; // misconfig: retrying won't help
    if (attempt < 12) {
      setTimeout(() => connectWithRetry(attempt + 1), 5000);
    } else {
      console.error('[server] giving up on MongoDB after 12 attempts; check MONGODB_URI and Atlas Network Access (allow 0.0.0.0/0).');
    }
  }
}
connectWithRetry();

module.exports = app;
