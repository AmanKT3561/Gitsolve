'use strict';
const axios = require('axios');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// One-time sanity check. AI Studio keys come in two formats: the older
// "AIza…" and the newer "AQ.…". Either is valid.
(function warnKey() {
  const k = process.env.GEMINI_API_KEY || '';
  if (!k) {
    console.warn('[gemini] GEMINI_API_KEY is not set — explanations will use the fallback.');
  } else if (!/^(AIza|AQ\.)/.test(k)) {
    console.warn(`[gemini] GEMINI_API_KEY has an unusual format (starts with "${k.slice(0, 4)}…"). If requests fail, generate a key at https://aistudio.google.com/apikey.`);
  }
})();

const FALLBACK = {
  intuition: 'AI explanation unavailable — the Gemini request failed. Check the backend terminal for the "[gemini] request failed" line for the exact reason.',
  approach: 'See the source code for the implemented approach.',
  dryRun: '',
  timeComplexity: 'Unknown',
  spaceComplexity: 'Unknown',
  keyLearning: '',
};

function buildPrompt(submission) {
  return `You are a competitive programming mentor. Analyze the accepted solution below and respond with ONLY a JSON object (no markdown, no code fences, no prose) with exactly these string fields:
"intuition", "approach", "dryRun", "timeComplexity", "spaceComplexity", "keyLearning".

Guidelines:
- intuition: the core idea in 2-3 sentences.
- approach: the step-by-step method used by THIS code.
- dryRun: a short trace on a small example.
- timeComplexity / spaceComplexity: Big-O with a one-line reason.
- keyLearning: the reusable takeaway.

Problem: ${submission.problemTitle || submission.problemSlug}
Platform: ${submission.platform}
Difficulty: ${submission.difficulty}
Language: ${submission.language}

Code:
\`\`\`
${(submission.code || '').slice(0, 12000)}
\`\`\``;
}

/** Remove ```json ... ``` fences and grab the first {...} block. */
function extractJson(text) {
  if (!text) return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/**
 * Generate a structured explanation. NEVER throws: on any failure it returns
 * the fallback object with isFallback:true so the submission pipeline can
 * continue and the row still gets marked completed.
 */
async function generateExplanation(submission) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ...FALLBACK, isFallback: true };

  try {
    const res = await axios.post(
      ENDPOINT,
      {
        contents: [{ role: 'user', parts: [{ text: buildPrompt(submission) }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      },
      {
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        timeout: 30000,
        validateStatus: () => true,
      }
    );

    if (res.status !== 200) {
      const errMsg = (res.data && res.data.error && res.data.error.message) || JSON.stringify(res.data);
      console.warn(`[gemini] request failed (HTTP ${res.status}) using model "${MODEL}": ${errMsg}`);
      return { ...FALLBACK, isFallback: true };
    }

    const text =
      res.data &&
      res.data.candidates &&
      res.data.candidates[0] &&
      res.data.candidates[0].content &&
      res.data.candidates[0].content.parts &&
      res.data.candidates[0].content.parts[0] &&
      res.data.candidates[0].content.parts[0].text;

    const parsed = extractJson(text);
    if (!parsed) return { ...FALLBACK, isFallback: true };

    return {
      intuition: String(parsed.intuition || FALLBACK.intuition),
      approach: String(parsed.approach || FALLBACK.approach),
      dryRun: String(parsed.dryRun || ''),
      timeComplexity: String(parsed.timeComplexity || 'Unknown'),
      spaceComplexity: String(parsed.spaceComplexity || 'Unknown'),
      keyLearning: String(parsed.keyLearning || ''),
      generatedBy: MODEL,
      isFallback: false,
    };
  } catch (err) {
    console.warn('[gemini] error:', err.message);
    return { ...FALLBACK, isFallback: true };
  }
}

module.exports = { generateExplanation };