'use strict';
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log('[db] MongoDB connected');

  // One-time cleanup: an older AIExplanation schema used a unique `submissionId`
  // field. It was renamed to `submission`, but the old unique index lingers in
  // MongoDB and rejects every new explanation (all have submissionId: null with
  // an E11000 duplicate-key error). Drop it if present. Idempotent.
  try {
    await mongoose.connection.db.collection('aiexplanations').dropIndex('submissionId_1');
    console.log('[db] dropped stale index aiexplanations.submissionId_1');
  } catch (e) {
    if (!/index not found|ns not found|index not exist/i.test(e.message)) {
      console.warn('[db] stale-index cleanup note:', e.message);
    }
  }

  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
}

module.exports = connectDB;
