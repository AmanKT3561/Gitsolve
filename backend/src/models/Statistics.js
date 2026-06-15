'use strict';
const mongoose = require('mongoose');

/**
 * One Statistics document per user. All increments are applied with the
 * atomic $inc operator (see submissionController) so concurrent submissions
 * never clobber each other. Dynamic buckets (byPlatform, byLanguage, ...)
 * are plain objects updated with dotted-path $inc, e.g. "byPlatform.leetcode".
 */
const statisticsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    totalSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },

    byPlatform: { type: Object, default: {} }, // { leetcode: 12, codeforces: 3 }
    byLanguage: { type: Object, default: {} }, // { python3: 9, cpp: 6 }
    byTopic: { type: Object, default: {} },    // { "dynamic-programming": 4 }
    byMonth: { type: Object, default: {} },    // { "2026-06": 7 }

    activeDates: { type: [String], default: [] }, // ["2026-06-14", ...] unique sorted
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model('Statistics', statisticsSchema);
