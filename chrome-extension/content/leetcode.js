// GitSolve AI — leetcode detector (runs in world:'MAIN', fully self-contained, NO imports)
(function () {
  if (window.__gitsolve_leetcode) return;        // double-injection guard
  window.__gitsolve_leetcode = true;
  window._gsSeen = window._gsSeen || new Set();    // cross-injection dedup set

  function gsToast(message, ok) {
    try {
      var id = '__gitsolve_toast';
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = 'position:fixed;z-index:2147483647;right:18px;bottom:18px;max-width:340px;padding:12px 16px;border-radius:10px;font:13px/1.45 ui-sans-serif,system-ui,sans-serif;color:#fff;box-shadow:0 10px 34px rgba(0,0,0,.4);transition:opacity .3s;opacity:0;';
        (document.body || document.documentElement).appendChild(el);
      }
      el.style.background = ok === false ? '#b91c1c' : '#111827';
      el.textContent = 'GitSolve: ' + message;
      requestAnimationFrame(function () { el.style.opacity = '1'; });
      clearTimeout(window.__gitsolve_toast_t);
      window.__gitsolve_toast_t = setTimeout(function () { el.style.opacity = '0'; }, 4200);
    } catch (e) {}
  }

  // Reads the user's source from whatever editor the platform uses.
  function gsGetCode() {
    try {
      if (window.monaco && window.monaco.editor && window.monaco.editor.getModels) {
        var ms = window.monaco.editor.getModels(); var best = '';
        ms.forEach(function (m) { var v = (m.getValue && m.getValue()) || ''; if (v.length > best.length) best = v; });
        if (best.trim()) return best;
      }
    } catch (e) {}
    try {
      if (window.ace && window.ace.edit) {
        var els = document.querySelectorAll('.ace_editor'); var best = '';
        els.forEach(function (el) { try { var ed = window.ace.edit(el); var v = (ed.getValue && ed.getValue()) || ''; if (v.length > best.length) best = v; } catch (_) {} });
        if (best.trim()) return best;
      }
    } catch (e) {}
    try {
      var cm = document.querySelector('.CodeMirror');
      if (cm && cm.CodeMirror) { var v = cm.CodeMirror.getValue(); if (v && v.trim()) return v; }
      var cm6 = document.querySelector('.cm-content');
      var cm6t = cm6 && (cm6.innerText || cm6.textContent); if (cm6t && cm6t.trim()) return cm6t;
    } catch (e) {}
    try {
      var ta = document.querySelector('textarea[name="source"], textarea#sourceCodeTextarea, textarea#program-source-text');
      if (ta && ta.value && ta.value.trim()) return ta.value;
    } catch (e) {}
    try {
      var pre = document.querySelector('pre#program-source-text, pre#submission-code, pre.prettyprint');
      var pret = pre && (pre.innerText || pre.textContent); if (pret && pret.trim()) return pret;
    } catch (e) {}
    return '';
  }

  function gsText(sel) { try { var n = document.querySelector(sel); return n ? (n.textContent || '').trim() : ''; } catch (e) { return ''; } }

  function gsDifficulty(raw) {
    var s = (raw || '').toLowerCase();
    if (s.indexOf('easy') > -1) return 'Easy';
    if (s.indexOf('medium') > -1 || s.indexOf('moderate') > -1) return 'Medium';
    if (s.indexOf('hard') > -1) return 'Hard';
    return 'Unknown';
  }

  // Send to the ISOLATED-world bridge -> background -> backend.
  function gsPost(payload) {
    if (!payload || !payload.code || !payload.code.trim()) {
      gsToast('Accepted, but couldn\u2019t read your code from the editor.', false);
      return;
    }
    window.postMessage({ __gitsolve: true, payload: payload }, '*');
    gsToast('Saving \u201c' + (payload.problemTitle || payload.problemSlug) + '\u201d\u2026', true);
  }

  // Confirmation from the bridge.
  window.addEventListener('message', function (e) {
    if (e.source !== window) return;
    var d = e.data; if (!d || d.__gitsolve_ack !== true) return;
    if (d.ok) gsToast('Saved \u2713  pushing to GitHub + generating explanation.', true);
    else gsToast(d.error || 'Could not save.', false);
  });

  // Wrap window.fetch once; detectors that need it call gsOnFetch(handlerFn).
  function gsHookFetch(handler) {
    if (window.__gitsolve_fetch_hooked_leetcode) return;
    window.__gitsolve_fetch_hooked_leetcode = true;
    var _fetch = window.fetch;
    window.fetch = function () {
      var args = arguments;
      var promise = _fetch.apply(this, args);
      try {
        var url = (typeof args[0] === 'string') ? args[0] : (args[0] && args[0].url) || '';
        promise.then(function (res) {
          try {
            res.clone().json().then(function (data) {
              try { handler(url, data, res); } catch (e) {}
            }).catch(function () {});
          } catch (e) {}
        }).catch(function () {});
      } catch (e) {}
      return promise;
    };
  }

  function gsObserve(fn) {
    var t = null;
    function run() { try { fn(); } catch (e) {} }
    run();
    var mo = new MutationObserver(function () {
      if (t) return;
      t = setTimeout(function () { t = null; run(); }, 250);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    var last = location.href;
    setInterval(function () { if (location.href !== last) { last = location.href; run(); } }, 1000);
  }

  // ---- platform-specific detection ----
  function lcLang() {
    // LeetCode persists the selected language slug (e.g. "cpp", "python3").
    try {
      var raw = window.localStorage.getItem('global_lang');
      if (raw) return raw.replace(/^"|"$/g, '');
    } catch (e) {}
    // Fallback: a visible language selector button.
    var btn = document.querySelector('button[id^="headlessui-listbox-button"], [data-cy="lang-select"]');
    if (btn && btn.textContent) {
      var t = btn.textContent.trim().toLowerCase();
      if (t && t.length < 16) return t;
    }
    return '';
  }

  function lcEmit(subId, langHint) {
    if (!subId) return;
    if (window._gsSeen.has('lc' + subId)) return;
    window._gsSeen.add('lc' + subId);

    var slug = (location.pathname.match(/\/problems\/([^\/]+)/) || [])[1] || 'unknown';
    var title = gsText('div[data-cy="question-title"]') ||
                gsText('.text-title-large a') ||
                gsText('a[href^="/problems/' + slug + '"]') ||
                (document.title.replace(/\s*-\s*LeetCode.*$/, '').trim()) ||
                slug;
    var diff = gsDifficulty(
      gsText('[class*="text-difficulty-"]') ||
      gsText('[class*="difficulty"]') ||
      gsText('.text-olive, .text-yellow, .text-pink')
    );
    var code = gsGetCode();
    try { console.log('[gitsolve leetcode] emit', { subId: subId, slug: slug, codeLen: code.length }); } catch (e) {}
    gsPost({
      platform: 'leetcode',
      externalSubmissionId: String(subId),
      problemSlug: slug,
      problemTitle: title,
      problemUrl: location.origin + '/problems/' + slug + '/',
      difficulty: diff,
      language: langHint || lcLang() || 'unknown',
      code: code,
      topics: [],
    });
  }

  // Path 1 (network): catch the /check/ poll when window.fetch is hookable.
  gsHookFetch(function (url, data) {
    try {
      var m = url.match(/\/submissions\/detail\/(\d+)\/check\/?/);
      if (!m || !data || data.status_msg !== 'Accepted') return;
      lcEmit(m[1], data.pretty_lang || data.lang);
    } catch (e) {}
  });

  // Path 2 (DOM, robust): LeetCode renders the verdict in
  // [data-e2e-locator="submission-result"]; the submission id is in the URL.
  function lcIsAccepted() {
    var r = document.querySelector('[data-e2e-locator="submission-result"]');
    if (r && /accepted/i.test(r.textContent || '')) return true;
    // Fallbacks for DOM variants: a standalone green "Accepted" label.
    var cand = document.querySelector('span[class*="text-green"], div[class*="text-green"]');
    if (cand && /^accepted$/i.test((cand.textContent || '').trim())) return true;
    return false;
  }

  gsObserve(function () {
    if (!lcIsAccepted()) return;
    var subId = (location.pathname.match(/\/submissions\/(\d+)/) || [])[1];
    if (!subId) {
      var slug = (location.pathname.match(/\/problems\/([^\/]+)/) || [])[1] || 'x';
      subId = 'dom-' + slug; // stable per problem so we save once
    }
    lcEmit(subId);
  });

})();
