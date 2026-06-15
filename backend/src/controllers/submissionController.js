'use strict';
const Submission = require('../models/Submission');
const AIExplanation = require('../models/AIExplanation');
const Statistics = require('../models/Statistics');
const { pushSolution } = require('../services/githubService');
const { generateExplanation } = require('../services/geminiService');
const { monthUTC, todayUTC, computeStreaks } = require('../utils/stats');

const DIFF_FIELD = { Easy: 'easySolved', Medium: 'mediumSolved', Hard: 'hardSolved' };

function sanitizeKey(k) {
  // Mongo object keys cannot contain dots/$; normalize topic/lang/platform keys.
  return String(k || 'unknown').replace(/[.$]/g, '_').trim() || 'unknown';
}

/**
 * Atomically bump all counters for one solved submission, then recompute
 * streaks. Counters use $inc (safe under concurrency); the date set uses
 * $addToSet; streaks are derived from the resulting activeDates array.
 */
async function bumpStatistics(userId, submission) {
  const inc = { totalSolved: 1 };
  if (DIFF_FIELD[submission.difficulty]) inc[DIFF_FIELD[submission.difficulty]] = 1;
  inc[`byPlatform.${sanitizeKey(submission.platform)}`] = 1;
  inc[`byLanguage.${sanitizeKey(submission.language)}`] = 1;
  inc[`byMonth.${monthUTC()}`] = 1;
  for (const t of submission.topics || []) {
    inc[`byTopic.${sanitizeKey(t)}`] = (inc[`byTopic.${sanitizeKey(t)}`] || 0) + 1;
  }

  const stats = await Statistics.findOneAndUpdate(
    { user: userId },
    { $inc: inc, $addToSet: { activeDates: todayUTC() }, $setOnInsert: { user: userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const { currentStreak, longestStreak } = computeStreaks(stats.activeDates);
  stats.currentStreak = currentStreak;
  stats.longestStreak = Math.max(longestStreak, stats.longestStreak || 0);
  stats.activeDates = Array.from(new Set(stats.activeDates)).sort();
  await stats.save();
  return stats;
}

/**
 * Background pipeline: GitHub push -> AI explanation -> completed.
 * Runs detached from the request; updates the submission status as it goes.
 * Failures in AI never fail the submission; failures in GitHub mark failed.
 */
async function processSubmission(submissionId, user) {
  const submission = await Submission.findById(submissionId);
  if (!submission) return;

  try {
    // --- GitHub ---
    const token = user.githubAccessToken;
    if (!token) throw new Error('No GitHub token on file for user');
    const { htmlUrl, path } = await pushSolution({
      token,
      repo: user.solutionsRepo || 'gitsolve-solutions',
      submission,
    });
    submission.githubUrl = htmlUrl || '';
    submission.githubPath = path || '';
    submission.status = 'github_saved';
    await submission.save();
  } catch (err) {
    submission.status = 'failed';
    submission.statusError = `github: ${err.message}`;
    await submission.save();
    console.error('[pipeline] github failed:', err.message);
    return; // do not attempt AI / stats if we never saved
  }

  // --- AI (never fatal) ---
  submission.status = 'ai_processing';
  await submission.save();

  const explanationData = await generateExplanation(submission);
  const explanation = await AIExplanation.create({
    user: user._id,
    submission: submission._id,
    ...explanationData,
  });
  submission.aiExplanation = explanation._id;
  submission.status = 'completed';
  await submission.save();

  // --- Statistics ---
  try {
    await bumpStatistics(user._id, submission);
  } catch (err) {
    console.error('[pipeline] stats failed:', err.message);
  }
}

// POST /api/submissions  -> respond 201 immediately, then process async.
async function createSubmission(req, res, next) {
  try {
    const b = req.body || {};
    if (!b.platform || !b.problemSlug || !b.code) {
      return res.status(400).json({ error: 'platform, problemSlug and code are required' });
    }

    // Server-side dedup: same external id for same user/platform is a no-op.
    if (b.externalSubmissionId) {
      const dup = await Submission.findOne({
        user: req.user._id,
        platform: b.platform,
        externalSubmissionId: String(b.externalSubmissionId),
      });
      if (dup) {
        return res.status(200).json({ submission: dup, duplicate: true });
      }
    }

    const submission = await Submission.create({
      user: req.user._id,
      platform: b.platform,
      problemSlug: b.problemSlug,
      problemTitle: b.problemTitle || '',
      problemUrl: b.problemUrl || '',
      difficulty: ['Easy', 'Medium', 'Hard'].includes(b.difficulty) ? b.difficulty : 'Unknown',
      language: b.language || 'unknown',
      topics: Array.isArray(b.topics) ? b.topics.slice(0, 25) : [],
      code: b.code,
      externalSubmissionId: b.externalSubmissionId ? String(b.externalSubmissionId) : '',
      status: 'pending',
    });

    // Respond immediately; do the heavy lifting in the background.
    res.status(201).json({ submission });

    // Detached — capture the (token-bearing) user document by closure.
    setImmediate(() => {
      processSubmission(submission._id, req.user).catch((e) =>
        console.error('[pipeline] uncaught:', e)
      );
    });
  } catch (err) {
    // Unique-index collision (race) -> treat as duplicate, not error.
    if (err && err.code === 11000) {
      return res.status(200).json({ duplicate: true });
    }
    next(err);
  }
}

// GET /api/submissions?page=1&limit=20
async function listSubmissions(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = { user: req.user._id };
    if (req.query.platform) filter.platform = req.query.platform;

    const [items, total] = await Promise.all([
      Submission.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-code'), // keep list light; code fetched on detail view
      Submission.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/submissions/:id  (full code + populated AI explanation)
async function getSubmission(req, res, next) {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('aiExplanation');
    if (!submission) return res.status(404).json({ error: 'Not found' });
    res.json({ submission });
  } catch (err) {
    next(err);
  }
}

// GET /api/statistics
async function getStatistics(req, res, next) {
  try {
    let stats = await Statistics.findOne({ user: req.user._id });
    if (!stats) stats = await Statistics.create({ user: req.user._id });
    res.json({ statistics: stats });
  } catch (err) {
    next(err);
  }
}

// GET /api/me
async function getMe(req, res) {
  res.json({ user: req.user });
}

module.exports = {
  createSubmission,
  listSubmissions,
  getSubmission,
  getStatistics,
  getMe,
  // exported for tests / manual reprocessing
  processSubmission,
  bumpStatistics,
};
