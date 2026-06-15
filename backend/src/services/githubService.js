'use strict';
const axios = require('axios');

const GH = 'https://api.github.com';

function client(token) {
  return axios.create({
    baseURL: GH,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitSolve-AI',
    },
    timeout: 20000,
    validateStatus: () => true, // we inspect status manually
  });
}

const EXTENSION_BY_LANG = {
  python: 'py', python3: 'py', py: 'py',
  cpp: 'cpp', 'c++': 'cpp', c: 'c',
  java: 'java', javascript: 'js', js: 'js', typescript: 'ts',
  go: 'go', golang: 'go', rust: 'rs', kotlin: 'kt', swift: 'swift',
  csharp: 'cs', 'c#': 'cs', ruby: 'rb', php: 'php', scala: 'scala',
};

function extensionFor(language) {
  if (!language) return 'txt';
  const key = String(language).toLowerCase().trim();
  return EXTENSION_BY_LANG[key] || 'txt';
}

function metadataHeader({ platform, problemTitle, problemUrl, difficulty, language }, ext) {
  const commentByExt = {
    py: '#', rb: '#',
  };
  const line = commentByExt[ext] || '//';
  const wrap = (txt) => `${line} ${txt}`;
  return [
    wrap('Solved with GitSolve AI'),
    wrap(`Platform   : ${platform}`),
    wrap(`Problem    : ${problemTitle || problemUrl}`),
    wrap(`URL        : ${problemUrl}`),
    wrap(`Difficulty : ${difficulty}`),
    wrap(`Language   : ${language}`),
    wrap(`Saved at   : ${new Date().toISOString()}`),
    '',
    '',
  ].join('\n');
}

async function getAuthedLogin(api) {
  const res = await api.get('/user');
  if (res.status !== 200) {
    throw new Error(`GitHub /user failed (${res.status}): ${res.data && res.data.message}`);
  }
  return res.data.login;
}

async function ensureRepo(api, owner, repo) {
  const existing = await api.get(`/repos/${owner}/${repo}`);
  if (existing.status === 200) return existing.data;
  if (existing.status !== 404) {
    throw new Error(`GitHub repo check failed (${existing.status})`);
  }
  const created = await api.post('/user/repos', {
    name: repo,
    description: 'Accepted competitive programming solutions, auto-saved by GitSolve AI.',
    private: false,
    auto_init: true,
  });
  if (created.status !== 201) {
    throw new Error(`GitHub repo create failed (${created.status}): ${created.data && created.data.message}`);
  }
  return created.data;
}

/**
 * Push (create or update) a single solution file using the Contents API.
 * Returns { htmlUrl, path }.
 */
async function pushSolution({ token, repo, submission }) {
  const api = client(token);
  const owner = await getAuthedLogin(api);
  await ensureRepo(api, owner, repo);

  const ext = extensionFor(submission.language);
  const slug = (submission.problemSlug || 'solution').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const path = `solutions/${slug}.${ext}`;

  const fileBody = metadataHeader(submission, ext) + (submission.code || '');
  const contentB64 = Buffer.from(fileBody, 'utf8').toString('base64');

  // If the file already exists we must supply its blob sha to update it.
  const existing = await api.get(`/repos/${owner}/${repo}/contents/${path}`);
  const sha = existing.status === 200 && existing.data && existing.data.sha ? existing.data.sha : undefined;

  const put = await api.put(`/repos/${owner}/${repo}/contents/${path}`, {
    message: `${sha ? 'update' : 'add'}: ${submission.problemTitle || slug} [${submission.platform}]`,
    content: contentB64,
    ...(sha ? { sha } : {}),
  });

  if (put.status !== 200 && put.status !== 201) {
    throw new Error(`GitHub put contents failed (${put.status}): ${put.data && put.data.message}`);
  }

  return {
    htmlUrl: put.data.content && put.data.content.html_url,
    path,
  };
}

module.exports = { pushSolution, extensionFor };
