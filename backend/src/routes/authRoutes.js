'use strict';
const express = require('express');
const passport = require('passport');
const { oauthCallback, successPage, failure } = require('../controllers/authController');

const router = express.Router();

// Step 1: start the OAuth dance.
router.get('/github', passport.authenticate('github', { session: false }));

/**
 * Step 2: GitHub redirects back to /auth/success?code=...  (this path is the
 * registered GITHUB_CALLBACK_URL).
 *
 * One route, two behaviors:
 *   - If ?code is present  -> run passport, mint JWT, redirect with #token.
 *   - If no ?code          -> serve the static success HTML page.
 *
 * The first middleware short-circuits to the HTML page when there is no code,
 * so passport only runs on the real callback hit.
 */
router.get(
  '/success',
  (req, res, next) => {
    if (req.query.code) return next();
    return successPage(req, res);
  },
  passport.authenticate('github', { session: false, failureRedirect: '/auth/failure' }),
  oauthCallback
);

router.get('/failure', failure);

module.exports = router;
