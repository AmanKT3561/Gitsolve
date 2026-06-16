'use strict';

/**
 * Best-effort language detection from source code. Used as a fallback when a
 * judge's page didn't expose the language (so we don't store "unknown").
 * Ordered most-specific-first; tuned for competitive-programming languages.
 */
function guessLanguage(code) {
  const c = String(code || '');
  if (!c.trim()) return 'unknown';

  if (/#include\b|std::|cout\s*<<|cin\s*>>|\bvector\s*<|using\s+namespace\s+std|\b(public|private|protected)\s*:/.test(c)) return 'cpp';
  if (/\bpackage\s+main\b|\bfunc\s+main\s*\(|\bfmt\.[A-Z]/.test(c)) return 'go';
  if (/\bfn\s+main\s*\(|\blet\s+mut\b|println!\s*\(|::<|->\s*\w+\s*\{/.test(c)) return 'rust';
  if (/\bpublic\s+(static\s+)?(class|void)\b|System\.out\.|import\s+java\./.test(c)) return 'java';
  if (/\busing\s+System\b|Console\.(Write|Read)|namespace\s+\w+\s*\{/.test(c)) return 'csharp';
  if (/\bconsole\.log\b|=>|\bfunction\s*\*?\s*\(|\b(const|let)\s+\w+\s*=|\brequire\s*\(/.test(c)) return 'javascript';
  if (/\bdef\s+\w+\s*\(|\bprint\s*\(|\bif\s+__name__\b|^\s*import\s+\w+/m.test(c)) return 'python';
  if (/\bputs\b|\.each\b|\bend\b\s*$/m.test(c)) return 'ruby';
  if (/^\s*(SELECT|WITH|INSERT|UPDATE|DELETE)\b/im.test(c)) return 'sql';
  return 'unknown';
}

/**
 * Returns a clean language: the supplied one unless it's empty/unknown, in
 * which case it's guessed from the code.
 */
function normalizeLanguage(language, code) {
  const l = String(language || '').trim();
  if (l && l.toLowerCase() !== 'unknown') return l;
  return guessLanguage(code);
}

module.exports = { guessLanguage, normalizeLanguage };
