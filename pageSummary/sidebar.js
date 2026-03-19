'use strict';

const RECRUITER_KEYWORDS = [
  'staffing', 'recruiting', 'recruitment', 'headhunting', 'talent acquisition',
  'executive search', 'placement', 'manpower', 'workforce solutions',
  'hr consulting', 'outsourcing', 'contractor supply'
];

function isRecruiterText(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return RECRUITER_KEYWORDS.some(k => lower.includes(k));
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function field(label, value, extraClass) {
  if (!value) return null;
  const wrap = el('div', 'ps-field');
  wrap.appendChild(el('div', 'ps-label', label));
  const v = el('div', 'ps-value' + (extraClass ? ' ' + extraClass : ''), value);
  wrap.appendChild(v);
  return wrap;
}

function buildContent(info) {
  const frag = document.createDocumentFragment();

  // Verdict
  const verdictReasons = [];
  if (isRecruiterText(info.industry)) verdictReasons.push('industry');
  if (isRecruiterText(info.company)) verdictReasons.push('company name');
  if (isRecruiterText(info.posterTitle)) verdictReasons.push('poster title');

  const verdict = el('div', 'ps-verdict');
  if (verdictReasons.length > 0) {
    verdict.classList.add('recruiter');
    verdict.appendChild(document.createTextNode('⚠ RECRUITER / AGENCY'));
    verdict.appendChild(el('div', 'ps-verdict-reason', '(matched: ' + verdictReasons.join(', ') + ')'));
  } else if (info.company || info.industry) {
    verdict.classList.add('direct');
    verdict.textContent = '✓ Direct Employer';
  } else {
    verdict.classList.add('unknown');
    verdict.textContent = '? Could not determine';
  }
  frag.appendChild(verdict);

  const industryCls = isRecruiterText(info.industry) ? 'highlight-bad' : '';
  const posterCls = isRecruiterText(info.posterTitle) ? 'highlight-bad' : '';

  [
    field('Company', info.company),
    field('Industry', info.industry, industryCls),
    field('Company size', info.size),
    field('Followers', info.followers ? info.followers + ' on LinkedIn' : null),
  ].forEach(f => f && frag.appendChild(f));

  frag.appendChild(el('hr', 'ps-divider'));

  [
    field('Role', info.title),
    field('Location', info.location),
    field('Posted by', info.posterTitle, posterCls),
  ].forEach(f => f && frag.appendChild(f));

  return frag;
}

function setContent(node) {
  const content = document.getElementById('content');
  content.replaceChildren(node);
}

async function scan() {
  setContent(el('span', 'ps-loading', 'Scanning…'));

  let tab;
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  } catch (e) {
    setContent(el('span', 'ps-error', 'Could not get active tab.'));
    return;
  }

  if (!tab || !tab.url || !tab.url.includes('linkedin.com/jobs')) {
    setContent(el('span', 'ps-hint', 'Open a LinkedIn job page to see info here.'));
    return;
  }

  try {
    await browser.tabs.executeScript(tab.id, { file: 'extractor.js' }).catch(() => {});
    await browser.tabs.executeScript(tab.id, { file: 'content.js' }).catch(() => {});
    const info = await browser.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' });
    setContent(buildContent(info));
  } catch (e) {
    const wrap = document.createDocumentFragment();
    wrap.appendChild(el('span', 'ps-error', 'Could not read page: ' + e.message));
    wrap.appendChild(el('p', 'ps-hint', 'Make sure you are on a LinkedIn job page and it has finished loading.'));
    setContent(wrap);
  }
}

let scanTimer = null;
function debouncedScan() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scan, 300);
}

document.getElementById('refresh-btn').addEventListener('click', scan);
browser.tabs.onActivated.addListener(debouncedScan);
browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === 'complete') debouncedScan();
});

// Content script notifies us when the pill row finishes rendering
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PAGE_UPDATED') scan();
});

scan();
