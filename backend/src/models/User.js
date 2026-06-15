'use strict';
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const userSchema = new mongoose.Schema(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    displayName: { type: String },
    email: { type: String },
    avatarUrl: { type: String },

    // The OAuth access token is stored ENCRYPTED in this real field.
    // Never read/write this directly outside the virtual below.
    githubAccessTokenEnc: { type: String, select: false },

    // Name of the repo we push solutions to (auto-created on first push).
    solutionsRepo: { type: String, default: 'gitsolve-solutions' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Transparent encrypt/decrypt of the GitHub token via a Mongoose virtual.
 * Code that needs the token reads `user.githubAccessToken`; the raw encrypted
 * value lives in `githubAccessTokenEnc` and is `select:false` so it is never
 * returned unless explicitly requested.
 */
userSchema
  .virtual('githubAccessToken')
  .get(function () {
    return this.githubAccessTokenEnc ? decrypt(this.githubAccessTokenEnc) : null;
  })
  .set(function (value) {
    this.githubAccessTokenEnc = value ? encrypt(value) : null;
  });

// Make sure the encrypted token never leaks through serialization.
userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.githubAccessTokenEnc;
    delete ret.githubAccessToken;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
