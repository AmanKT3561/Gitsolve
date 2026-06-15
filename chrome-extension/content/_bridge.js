// GitSolve AI — bridge (runs in the DEFAULT/ISOLATED world, has chrome.* access)
//
// MAIN-world detectors cannot talk to the service worker, so they post a
// window message shaped { __gitsolve: true, payload: {...} }. This bridge
// validates the message origin and relays the payload to background.js.
(function () {
  if (window.__gitsolve_bridge) return;
  window.__gitsolve_bridge = true;

  window.addEventListener('message', (event) => {
    // Only accept messages from THIS window (not iframes / other origins).
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.__gitsolve !== true || !data.payload) return;

    try {
      chrome.runtime.sendMessage(
        { type: 'GITSOLVE_SUBMISSION', payload: data.payload },
        (resp) => {
          // Surface a tiny confirmation back into the page for the toast.
          window.postMessage(
            { __gitsolve_ack: true, ok: resp && resp.ok, error: resp && resp.error },
            '*'
          );
          if (chrome.runtime.lastError) {
            // Service worker may have been asleep; ignore — message still queued.
          }
        }
      );
    } catch (e) {
      // Extension context can be invalidated on reload; ignore.
    }
  });
})();
