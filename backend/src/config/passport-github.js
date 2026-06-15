'use strict';
const passport = require('passport');
const { Strategy: GitHubStrategy } = require('passport-github2');
const User = require('../models/User');

/**
 * Stateless OAuth: we never use sessions (session:false everywhere), so we do
 * NOT register serializeUser/deserializeUser. The strategy verify callback
 * upserts the user, stores the (encrypted) access token, and hands the user
 * document to the route which then mints a JWT.
 *
 * Scope `repo` is required so we can create the solutions repo and push files.
 */
function configurePassport() {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL, // http://localhost:3001/auth/success
        scope: ['read:user', 'user:email', 'repo'],
      },
      async (accessToken, _refreshToken, profile, done) => {
        try {
          const githubId = String(profile.id);
          const update = {
            githubId,
            username: profile.username,
            displayName: profile.displayName || profile.username,
            avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            email:
              profile.emails && profile.emails[0] ? profile.emails[0].value : undefined,
          };

          let user = await User.findOneAndUpdate({ githubId }, update, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          }).select('+githubAccessTokenEnc');

          // virtual setter encrypts the token transparently
          user.githubAccessToken = accessToken;
          await user.save();

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  return passport;
}

module.exports = configurePassport;
