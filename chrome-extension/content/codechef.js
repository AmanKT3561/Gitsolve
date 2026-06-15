// GitSolve AI — codechef detector (runs in world:'MAIN', fully self-contained, NO imports)
(function () {
  if (window.__gitsolve_codechef) return;        // double-injection guard
  window.__gitsolve_codechef = true;
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
    if (window.__gitsolve_fetch_hooked_codechef) return;
    window.__gitsolve_fetch_hooked_codechef = true;
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
  // CodeChef submits via /api/ide/submit then polls /api/ide/status; an accepted
  // run reads result 'AC' / result_code 'accepted'. These go over fetch OR
  // XMLHttpRequest depending on the page, so hook both, plus a DOM fallback.
  function ccEmit(node, langHint) {
    if (window._gsSeen.has('cc' + node)) return;
    window._gsSeen.add('cc' + node);
    var slug = (location.pathname.match(/problems\/([^\/?#]+)/) || [])[1] || 'unknown';
    var title = gsText('h1, .problem-name, .breadcrumbs li:last-child') || slug;
    var code = gsGetCode();
    try { console.log('[gitsolve codechef] emit', { node: node, slug: slug, codeLen: code.length }); } catch (e) {}
    gsPost({
      platform: 'codechef',
      externalSubmissionId: String(node),
      problemSlug: slug,
      problemTitle: title,
      problemUrl: location.href.split('?')[0],
      difficulty: 'Unknown',
      language: langHint || 'unknown',
      code: code,
      topics: [],
    });
  }

  function ccHandler(url, data) {
    if (!url || (url.indexOf('/api/ide/submit') === -1 && url.indexOf('/api/ide/status') === -1)) return;
    var ok = data && (data.result === 'AC' || data.result_code === 'accepted' ||
                      (data.data && (data.data.result === 'AC' || data.data.result_code === 'accepted')));
    if (!ok) return;
    var node = (data && (data.upid || data.token)) || (data.data && (data.data.upid || data.data.token)) || ('' + Date.now());
    ccEmit(node, (data && data.language) || 'unknown');
  }

  function gsHookXHR(handler) {
    if (window.__gitsolve_xhr_hooked_cc) return;
    window.__gitsolve_xhr_hooked_cc = true;
    var _open = XMLHttpRequest.prototype.open;
    var _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) { this.__gs_url = u; return _open.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      var xhr = this;
      xhr.addEventListener('load', function () {
        try {
          var t = xhr.responseText || ''; var d = null;
          if (t && (t[0] === '{' || t[0] === '[')) { try { d = JSON.parse(t); } catch (e) {} }
          handler(xhr.__gs_url || '', d, xhr);
        } catch (e) {}
      });
      return _send.apply(this, arguments);
    };
  }

  gsHookFetch(ccHandler);
  gsHookXHR(ccHandler);

  // DOM fallback: CodeChef shows a "Correct Answer" verdict on full accept.
  gsObserve(function () {
    var hay = (document.body && (document.body.innerText || document.body.textContent)) || '';
    if (!/correct answer|all test cases passed/i.test(hay)) return;
    var slug = (location.pathname.match(/problems\/([^\/?#]+)/) || [])[1] || 'unknown';
    ccEmit('dom-' + slug, 'unknown');
  });

})();
