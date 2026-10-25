'use strict';

// extractJobInfo and isRecruiterText are provided by extractor.js
// (listed before this script in manifest content_scripts)

let pillObserver = null;
let lastPillContent = null;

function currentPillContent() {
  const paras = document.querySelectorAll('p');
  for (const p of paras) {
    const t = p.textContent.trim();
    if (/^[\d,]+[\s\-–]+[\d,]+\+?\s*employees$/i.test(t) ||
        /^[\d,]+\+\s*employees$/i.test(t)) {
      const row = p.parentElement && p.parentElement.parentElement;
      return row ? row.textContent.trim() : t;
    }
  }
  // Old layout fallback
  const span = document.querySelector('.jobs-company__inline-information');
  return span ? span.textContent.trim() : null;
}

function startWatching() {
  if (pillObserver) pillObserver.disconnect();

  // Snapshot current state — observer fires only when content changes from this
  lastPillContent = currentPillContent();

  pillObserver = new MutationObserver(() => {
    const current = currentPillContent();
    if (current && current !== lastPillContent) {
      lastPillContent = current;
      browser.runtime.sendMessage({ type: 'PAGE_UPDATED' });
    }
  });

  pillObserver.observe(document.body, { childList: true, subtree: true });

  // Safety: stop after 30s
  setTimeout(() => {
    if (pillObserver) { pillObserver.disconnect(); pillObserver = null; }
  }, 30000);
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'GET_JOB_INFO') {
    startWatching();
    return Promise.resolve(extractJobInfo(document));
  }
});

// Also start watching on initial load (catches cases where sidebar is already open)
startWatching();
