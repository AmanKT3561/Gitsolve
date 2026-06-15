'use strict';
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Bearer-token auth. Accepts `Authorization: Bearer <jwt>`.
 * Loads the user WITH the encrypted token field so downstream services
 * (GitHub push) can read `req.user.githubAccessToken`.
 */
module.exports = async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub).select('+githubAccessTokenEnc');
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
