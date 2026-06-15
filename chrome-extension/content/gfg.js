// GitSolve AI — gfg detector (runs in world:'MAIN', fully self-contained, NO imports)
(function () {
  if (window.__gitsolve_gfg) return;        // double-injection guard
  window.__gitsolve_gfg = true;
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
    if (window.__gitsolve_fetch_hooked_gfg) return;
    window.__gitsolve_fetch_hooked_gfg = true;
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

  // GfG submits/polls over XMLHttpRequest (jQuery), not fetch — hook both.
  function gsHookXHR(handler) {
    if (window.__gitsolve_xhr_hooked_gfg) return;
    window.__gitsolve_xhr_hooked_gfg = true;
    var _open = XMLHttpRequest.prototype.open;
    var _send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) { this.__gs_url = url; return _open.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function () {
      var xhr = this;
      xhr.addEventListener('load', function () {
        try {
          var txt = xhr.responseText || '';
          var data = null;
          if (txt && (txt[0] === '{' || txt[0] === '[')) { try { data = JSON.parse(txt); } catch (e) {} }
          handler(xhr.__gs_url || '', data, xhr);
        } catch (e) {}
      });
      return _send.apply(this, arguments);
    };
  }

  // ---- platform-specific detection ----
  // GeeksforGeeks practice. The verdict arrives on a submit/result/run endpoint
  // and reads "Correct Answer" / "Problem Solved" (not always "Accepted").
  var GFG_ENDPOINT = /(submit|result|run|status|judge|verdict)/i;

  function gfgVerdictText(data) {
    var out = [];
    (function walk(o, d) {
      if (o == null || d > 4) return;
      if (typeof o === 'string') { out.push(o); return; }
      if (typeof o === 'object') {
        ['verdict', 'result', 'status', 'status_description', 'statusDescription', 'message', 'msg', 'description', 'data', 'output'].forEach(function (k) {
          if (o[k] != null) walk(o[k], d + 1);
        });
      }
    })(data, 0);
    return out.join(' | ').toLowerCase();
  }

  function gfgIsAccepted(data) {
    return /correct answer|accepted|problem solved|solved successfully|all (test ?)?cases? passed|compilation successful.*passed/.test(gfgVerdictText(data));
  }

  function gfgHandler(url, data) {
    if (!url || !GFG_ENDPOINT.test(url)) return;
    // Targeted debug — remove once stable. Shows the shape of any judge response.
    try { if (data) console.log('[gitsolve gfg] candidate', url, data); } catch (e) {}

    if (!gfgIsAccepted(data)) return;
    var key = (data && (data.submission_id || data.id || data.run_id ||
      (data.data && (data.data.submission_id || data.data.id)))) || ('' + Date.now());
    if (window._gsSeen.has('gfg' + key)) return;
    window._gsSeen.add('gfg' + key);

    var slug = (location.pathname.match(/problems\/([^\/?#]+)/) || [])[1] || 'unknown';
    var title = gsText('.problems_header_content__title__L2cB2, h3.problemTitle, h1') ||
                document.title.replace(/\s*\|\s*Practice.*$/, '').trim() || slug;
    var code = gsGetCode();
    gsPost({
      platform: 'gfg',
      externalSubmissionId: String(key),
      problemSlug: slug,
      problemTitle: title,
      problemUrl: location.href.split('?')[0],
      difficulty: gsDifficulty(gsText('.problems_header_description__t_8PB, [class*="difficulty"]')),
      language: (data && (data.language || data.lang)) || 'unknown',
      code: code,
      topics: [],
    });
  }

  gsHookFetch(gfgHandler);
  gsHookXHR(gfgHandler);

  // Path 2 (DOM, robust): GfG shows a strong success banner on accept.
  gsObserve(function () {
    var hay = (document.body && (document.body.innerText || document.body.textContent)) || '';
    // Use GfG's distinctive success wording to avoid matching the statement text.
    if (!/problem solved successfully|all (test ?)?cases?\s+(passed|matched)|compilation completed.*passed/i.test(hay)) return;
    var slug = (location.pathname.match(/problems\/([^\/?#]+)/) || [])[1] || 'unknown';
    if (window._gsSeen.has('gfgdom-' + slug)) return;
    window._gsSeen.add('gfgdom-' + slug);

    var title = gsText('.problems_header_content__title__L2cB2, h3.problemTitle, h1') ||
                document.title.replace(/\s*\|\s*Practice.*$/, '').trim() || slug;
    var code = gsGetCode();
    try { console.log('[gitsolve gfg] DOM emit', { slug: slug, codeLen: code.length }); } catch (e) {}
    gsPost({
      platform: 'gfg',
      externalSubmissionId: 'gfg-' + slug,
      problemSlug: slug,
      problemTitle: title,
      problemUrl: location.href.split('?')[0],
      difficulty: gsDifficulty(gsText('.problems_header_description__t_8PB, [class*="difficulty"]')),
      language: 'unknown',
      code: code,
      topics: [],
    });
  });

})();
