// GitSolve AI — codeforces detector (runs in world:'MAIN', fully self-contained, NO imports)
(function () {
  if (window.__gitsolve_codeforces) return;        // double-injection guard
  window.__gitsolve_codeforces = true;
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
    if (window.__gitsolve_fetch_hooked_codeforces) return;
    window.__gitsolve_fetch_hooked_codeforces = true;
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
  // Codeforces shows an Accepted verdict as a .verdict-accepted cell, both on
  // the submissions table and the single submission view. The table has no
  // source, so we GET the submission page and parse pre#program-source-text
  // (a plain GET — no CSRF needed), with the /data/submitSource AJAX as fallback.

  function cfCsrf() {
    var m = document.querySelector('meta[name="X-Csrf-Token"]');
    if (m && m.getAttribute('content')) return m.getAttribute('content');
    var i = document.querySelector('input[name="csrf_token"]');
    if (i && i.value) return i.value;
    return '';
  }

  // Fallback: the same AJAX the site's "click to view" popup uses.
  function cfFetchSourceAjax(submissionId, cb) {
    try {
      var csrf = cfCsrf();
      if (!csrf) { cb(''); return; }
      fetch('/data/submitSource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Csrf-Token': csrf },
        body: 'submissionId=' + encodeURIComponent(submissionId) + '&csrf_token=' + encodeURIComponent(csrf),
        credentials: 'include',
      })
        .then(function (r) { return r.json(); })
        .then(function (j) { cb((j && (j.source || j.sourceCode)) || ''); })
        .catch(function () { cb(''); });
    } catch (e) { cb(''); }
  }

  // Primary: GET the submission page and parse the source block.
  function cfFetchSource(subUrl, submissionId, cb) {
    if (!subUrl) { cfFetchSourceAjax(submissionId, cb); return; }
    try {
      fetch(subUrl, { credentials: 'include' })
        .then(function (r) { return r.text(); })
        .then(function (html) {
          var code = '';
          try {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var pre = doc.querySelector('pre#program-source-text, pre.program-source');
            code = pre ? (pre.textContent || '') : '';
          } catch (e) {}
          if (code && code.trim()) { cb(code); return; }
          cfFetchSourceAjax(submissionId, cb); // fallback
        })
        .catch(function () { cfFetchSourceAjax(submissionId, cb); });
    } catch (e) { cfFetchSourceAjax(submissionId, cb); }
  }

  function cfProblemFromRow(row) {
    var out = { slug: 'unknown', title: 'unknown', url: location.href.split('?')[0] };
    try {
      var a = (row.querySelector && row.querySelector('a[href*="/problem/"]')) || null;
      if (a) {
        out.title = (a.textContent || '').trim() || out.title;
        out.url = a.href;
      }
      var href = a ? a.getAttribute('href') : location.pathname;
      var pm = href.match(/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/) ||
               href.match(/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/) ||
               href.match(/gym\/(\d+)\/problem\/([A-Za-z0-9]+)/);
      if (pm) out.slug = pm[1] + pm[2];
    } catch (e) {}
    return out;
  }

  function cfLangFromRow(row) {
    try {
      var cells = row.querySelectorAll ? row.querySelectorAll('td') : [];
      for (var i = 0; i < cells.length; i++) {
        var t = (cells[i].textContent || '').trim();
        if (/GCC|Clang|Python|PyPy|Java|Kotlin|Mono|C#|Rust|\bGo\b|Node|GNU|MS C\+\+|C\+\+/i.test(t)) return t;
      }
    } catch (e) {}
    return 'unknown';
  }

  function cfHandle(subId, scope, subUrl) {
    if (!subId) return;
    if (window._gsSeen.has('cf' + subId)) return;
    window._gsSeen.add('cf' + subId);

    var p = cfProblemFromRow(scope);
    var lang = cfLangFromRow(scope);

    function finish(code) {
      try { console.log('[gitsolve codeforces] emit', { subId: subId, slug: p.slug, codeLen: (code || '').length }); } catch (e) {}
      gsPost({
        platform: 'codeforces',
        externalSubmissionId: String(subId),
        problemSlug: p.slug,
        problemTitle: p.title,
        problemUrl: p.url,
        difficulty: 'Unknown',
        language: lang,
        code: code,
        topics: (function () {
          try { return Array.prototype.map.call(document.querySelectorAll('.tag-box'), function (t) { return (t.textContent || '').trim(); }).filter(Boolean).slice(0, 10); }
          catch (e) { return []; }
        })(),
      });
    }

    var local = gsGetCode(); // present on the submission view page (pre#program-source-text)
    if (local && local.trim()) { finish(local); return; }
    cfFetchSource(subUrl, subId, finish); // table page: fetch the submission page
  }

  gsObserve(function () {
    // (A) Single submission view page: /contest/{c}/submission/{id} — fire now.
    var viewId = (location.pathname.match(/\/submission\/(\d+)/) || [])[1];
    if (viewId && document.querySelector('.verdict-accepted')) {
      cfHandle(viewId, document, location.pathname);
      return;
    }

    // (B) Submissions table: fire for the MOST RECENT accepted row only (top of
    // the list), so we capture your latest solve without re-importing history.
    var cells = document.querySelectorAll('.verdict-accepted');
    for (var i = 0; i < cells.length; i++) {
      var row = cells[i].closest ? cells[i].closest('tr') : null;
      if (!row) continue;
      var link = row.querySelector('a[href*="/submission/"]');
      var sid = (link && (link.getAttribute('href').match(/submission\/(\d+)/) || [])[1]) ||
                row.getAttribute('data-submission-id') || row.getAttribute('data-submissionid');
      if (!sid) continue;
      cfHandle(sid, row, link ? link.getAttribute('href') : null);
      break; // only the most recent accepted row
    }
  });

})();