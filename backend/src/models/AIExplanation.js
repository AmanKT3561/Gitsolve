'use strict';
const mongoose = require('mongoose');

const aiExplanationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    intuition: { type: String, default: '' },
    approach: { type: String, default: '' },
    dryRun: { type: String, default: '' },
    timeComplexity: { type: String, default: '' },
    spaceComplexity: { type: String, default: '' },
    keyLearning: { type: String, default: '' },
    generatedBy: { type: String, default: 'gemini-1.5-flash' },
    isFallback: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIExplanation', aiExplanationSchema);
