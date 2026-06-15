'use strict';
const mongoose = require('mongoose');

const SUBMISSION_STATUS = [
  'pending',
  'github_saved',
  'ai_processing',
  'completed',
  'failed',
];

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    platform: { type: String, required: true, index: true }, // leetcode, codeforces, ...
    problemSlug: { type: String, required: true },
    problemTitle: { type: String, default: '' },
    problemUrl: { type: String, default: '' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', 'Unknown'], default: 'Unknown' },
    language: { type: String, default: 'unknown' },
    topics: { type: [String], default: [] },

    code: { type: String, required: true },

    status: { type: String, enum: SUBMISSION_STATUS, default: 'pending', index: true },
    statusError: { type: String, default: '' },

    githubUrl: { type: String, default: '' },
    githubPath: { type: String, default: '' },

    aiExplanation: { type: mongoose.Schema.Types.ObjectId, ref: 'AIExplanation' },

    // Platform-native submission id, used for dedup on the server too.
    externalSubmissionId: { type: String, default: '' },
  },
  { timestamps: true }
);

// Prevent duplicate saves of the exact same platform submission per user.
// partialFilterExpression only permits a limited operator set ($eq/$gt/$gte/
// $lt/$lte/$type/$exists) — NOT $ne — so we select non-empty strings with $gt:''.
submissionSchema.index(
  { user: 1, platform: 1, externalSubmissionId: 1 },
  { unique: true, partialFilterExpression: { externalSubmissionId: { $gt: '' } } }
);

submissionSchema.statics.STATUS = SUBMISSION_STATUS;

module.exports = mongoose.model('Submission', submissionSchema);
