'use strict';
const Submission = require('../models/Submission');
const AIExplanation = require('../models/AIExplanation');
const Statistics = require('../models/Statistics');
const { pushSolution } = require('../services/githubService');
const { generateExplanation } = require('../services/geminiService');
const { monthUTC, todayUTC, computeStreaks } = require('../utils/stats');
const { normalizeLanguage } = require('../utils/lang');

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

  // --- AI (never fatal: the solution is already saved to GitHub) ---
  try {
    submission.status = 'ai_processing';
    await submission.save();

    const explanationData = await generateExplanation(submission);
    const explanation = await AIExplanation.create({
      user: user._id,
      submission: submission._id,
      ...explanationData,
    });
    submission.aiExplanation = explanation._id;
    // Topics are inferred by the AI; copy onto the submission for stats.
    if (Array.isArray(explanationData.topics) && explanationData.topics.length) {
      submission.topics = explanationData.topics;
    }
  } catch (err) {
    console.error('[pipeline] ai failed (non-fatal):', err.message);
  }

  // Mark completed regardless of AI outcome — the solve is saved.
  submission.status = 'completed';
  await submission.save();

  // --- Statistics (best-effort; getStatistics also aggregates live) ---
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
      language: normalizeLanguage(b.language, b.code),
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

    // Self-heal: if the host slept/restarted during background processing, a
    // submission can be stranded in 'github_saved'/'ai_processing'. The solution
    // is already saved, so promote anything stuck for >2 min to 'completed'.
    await Submission.updateMany(
      {
        user: req.user._id,
        status: { $in: ['github_saved', 'ai_processing'] },
        updatedAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) },
      },
      { $set: { status: 'completed' } }
    );

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
// Computed live from the submissions themselves so the numbers always reflect
// reality (a solve counts once saved, regardless of the AI explanation status).
async function getStatistics(req, res, next) {
  try {
    const userId = req.user._id;
    // Every submission is an accepted solve (the extension only fires on AC).
    // Count all of them except ones whose GitHub save hard-failed.
    const subs = await Submission.find({ user: userId, status: { $ne: 'failed' } })
      .select('difficulty platform language topics createdAt')
      .lean();

    const dayKey = (d) => new Date(d).toISOString().slice(0, 10);   // YYYY-MM-DD
    const monthKey = (d) => new Date(d).toISOString().slice(0, 7);  // YYYY-MM

    const stats = {
      totalSolved: subs.length,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      byPlatform: {},
      byLanguage: {},
      byTopic: {},
      byMonth: {},
      activeDates: [],
      currentStreak: 0,
      longestStreak: 0,
    };

    const days = new Set();
    for (const s of subs) {
      const field = DIFF_FIELD[s.difficulty];
      if (field) stats[field] += 1;

      const p = sanitizeKey(s.platform || 'unknown');
      stats.byPlatform[p] = (stats.byPlatform[p] || 0) + 1;

      const l = sanitizeKey(s.language || 'unknown');
      stats.byLanguage[l] = (stats.byLanguage[l] || 0) + 1;

      const m = monthKey(s.createdAt);
      stats.byMonth[m] = (stats.byMonth[m] || 0) + 1;

      for (const t of s.topics || []) {
        const tk = sanitizeKey(t);
        if (tk) stats.byTopic[tk] = (stats.byTopic[tk] || 0) + 1;
      }

      days.add(dayKey(s.createdAt));
    }

    stats.activeDates = Array.from(days).sort();
    const { currentStreak, longestStreak } = computeStreaks(stats.activeDates);
    stats.currentStreak = currentStreak;
    stats.longestStreak = longestStreak;

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
