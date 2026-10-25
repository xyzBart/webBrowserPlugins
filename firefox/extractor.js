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

function getText(selectors, root) {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }
  return null;
}

// Find the company pill-row container by locating the "N employees" <p>,
// then walking up 2 levels. That container holds industry / size / followers pills.
function findPillRow(doc) {
  const paras = doc.querySelectorAll('p');
  for (const p of paras) {
    const t = p.textContent.trim();
    // Match only short standalone pill text like "1001-5000 employees", not sentences
    if (/^[\d,]+[\s\-–]+[\d,]+\+?\s*employees$/i.test(t) || /^[\d,]+\+\s*employees$/i.test(t)) {
      return p.parentElement && p.parentElement.parentElement;
    }
  }
  return null;
}

function extractJobInfo(doc) {
  const info = {};

  // --- Company name ---
  // New layout: aria-label="Company, <Name>."
  const companyDiv = doc.querySelector('[aria-label^="Company, "]');
  if (companyDiv) {
    info.company = companyDiv.getAttribute('aria-label')
      .replace(/^Company,\s*/, '')
      .replace(/\.$/, '')
      .trim();
  } else {
    // Old layout: .artdeco-entity-lockup__title inside jobs-company__box
    info.company = getText([
      '.jobs-company__box .artdeco-entity-lockup__title',
    ], doc);
  }

  // --- Job title ---
  info.title = getText([
    '.job-details-jobs-unified-top-card__job-title h1',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title h1',
    '.topcard__title',
    'h1.t-24',
  ], doc);

  // --- Location ---
  info.location = getText([
    '.job-details-jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__bullet',
    '.topcard__flavor--bullet',
  ], doc);

  // --- Industry / size / followers ---
  info.industry = null;
  info.size = null;
  info.followers = null;

  // New layout: pill row (obfuscated classes)
  const pillRow = findPillRow(doc);
  if (pillRow) {
    const pills = Array.from(pillRow.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(t => t && t !== '•');

    for (const t of pills) {
      if (/\d.*employees/i.test(t)) {
        info.size = t;
      } else if (/\d.*on LinkedIn/i.test(t)) {
        info.followers = t.replace(/\s*on LinkedIn/i, '').trim();
      } else if (!info.industry) {
        info.industry = t;
      }
    }
  }

  // Old layout: .jobs-company__box with stable class names
  if (!info.size || !info.industry) {
    const infoSpans = doc.querySelectorAll('.jobs-company__inline-information');
    for (const s of infoSpans) {
      const t = s.textContent.trim();
      if (/employees/i.test(t) && !info.size) info.size = t;
      if (/on LinkedIn/i.test(t) && !info.followers) {
        info.followers = t.replace(/\s*on LinkedIn/i, '').trim();
      }
    }

    if (!info.industry) {
      // Industry is the direct text node in .t-14.mt5 (before the inline-information spans)
      const infoDiv = doc.querySelector('.jobs-company__box .t-14.mt5');
      if (infoDiv) {
        const textNode = Array.from(infoDiv.childNodes)
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent.trim())
          .find(t => t.length > 0);
        if (textNode) info.industry = textNode;
      }
    }
  }

  // Fallback size from full page text
  if (!info.size) {
    const allText = (doc.body.innerText || doc.body.textContent);
    const m = allText.match(/\b([\d,]+\s*[–\-]\s*[\d,]+\+?\s*employees|[\d,]+\+\s*employees)\b/i);
    if (m) info.size = m[1].replace(/\s+/g, ' ').trim();
  }

  // --- Poster title ---
  info.posterTitle = getText([
    '.hirer-card__hirer-information .hirer-card__hirer-job-title',
    '.jobs-poster__title',
  ], doc);

  return info;
}

// CommonJS export for Node.js tests
if (typeof module !== 'undefined') {
  module.exports = { extractJobInfo, isRecruiterText };
}
