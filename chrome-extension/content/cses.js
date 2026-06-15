// GitSolve AI — cses detector (runs in world:'MAIN', fully self-contained, NO imports)
(function () {
  if (window.__gitsolve_cses) return;        // double-injection guard
  window.__gitsolve_cses = true;
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
    if (window.__gitsolve_fetch_hooked_cses) return;
    window.__gitsolve_fetch_hooked_cses = true;
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
  // CSES: after judging, the page is at .../result/{id}/ and shows the verdict
  // ("ACCEPTED" when all tests pass) plus the submitted source in a <pre>.
  // We read verdict text from table cells/spans only (never the code block, so
  // a variable named "accepted" can't cause a false positive), wait until
  // judging is done, and require no failure verdict.
  function csesVerdictText() {
    var t = '';
    try {
      var nodes = document.querySelectorAll('td, th, span, .summary-table *, h1, h2');
      for (var i = 0; i < nodes.length && t.length < 8000; i++) {
        var n = nodes[i];
        if (n.closest && n.closest('pre')) continue; // skip the source block
        t += ' ' + (n.textContent || '');
      }
    } catch (e) {}
    return t;
  }

  function csesLang() {
    try {
      var rows = document.querySelectorAll('tr');
      for (var i = 0; i < rows.length; i++) {
        var cells = rows[i].querySelectorAll('td, th');
        if (cells.length >= 2 && /language/i.test(cells[0].textContent || '')) {
          var v = (cells[1].textContent || '').trim();
          if (v) return v;
        }
      }
    } catch (e) {}
    return 'unknown';
  }

  gsObserve(function () {
    if (location.pathname.indexOf('/result/') === -1) return;
    var v = csesVerdictText();
    if (/COMPILING|RUNNING|PENDING|IN QUEUE|TESTING/i.test(v)) return; // still judging
    if (/WRONG ANSWER|TIME LIMIT|RUNTIME ERROR|OUTPUT LIMIT|MEMORY LIMIT|COMPILE ERROR|INVALID/i.test(v)) return;
    var accepted = /\bACCEPTED\b/i.test(v) || !!document.querySelector('tr.full-score, td.full-score, .full-score');
    if (!accepted) return;

    var idMatch = location.pathname.match(/result\/(\d+)/) || location.search.match(/[?&]id=(\d+)/);
    var subId = idMatch ? idMatch[1] : ('' + location.pathname);
    if (window._gsSeen.has('cses' + subId)) return;
    window._gsSeen.add('cses' + subId);

    var taskLink = document.querySelector('a[href*="/task/"]');
    var slug = '';
    if (taskLink) { var tm = taskLink.getAttribute('href').match(/task\/(\d+)/); slug = tm ? ('task-' + tm[1]) : ''; }
    if (!slug) slug = 'cses-' + subId;
    var title = (taskLink && (taskLink.textContent || '').trim()) || gsText('h1') || slug;

    var code = gsGetCode();
    try { console.log('[gitsolve cses] emit', { subId: subId, slug: slug, codeLen: code.length }); } catch (e) {}
    gsPost({
      platform: 'cses',
      externalSubmissionId: String(subId),
      problemSlug: slug,
      problemTitle: title,
      problemUrl: location.href.split('?')[0],
      difficulty: 'Unknown',
      language: csesLang(),
      code: code,
      topics: [],
    });
  });

})();