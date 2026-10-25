'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const { extractJobInfo, isRecruiterText } = require('../extractor');

function loadPage(filename) {
  const html = fs.readFileSync(path.join(__dirname, 'resources', filename), 'utf8');
  const dom = new JSDOM(html, { url: 'https://www.linkedin.com/' });
  return dom.window.document;
}

// --- isRecruiterText ---

test('isRecruiterText: detects staffing', () => {
  assert.equal(isRecruiterText('Staffing and Recruiting'), true);
});

test('isRecruiterText: detects recruiting (case insensitive)', () => {
  assert.equal(isRecruiterText('RECRUITING agency'), true);
});

test('isRecruiterText: ignores unrelated industry', () => {
  assert.equal(isRecruiterText('Financial Services'), false);
});

test('isRecruiterText: handles null/empty', () => {
  assert.equal(isRecruiterText(null), false);
  assert.equal(isRecruiterText(''), false);
});

// --- extractJobInfo: Morson Edge LinkedIn page ---

test('Morson Edge: extracts company name', () => {
  const doc = loadPage('morson-edge-job.html');
  const info = extractJobInfo(doc);
  assert.equal(info.company, 'Morson Edge (Financial Services)');
});

test('Morson Edge: extracts industry as Staffing and Recruiting', () => {
  const doc = loadPage('morson-edge-job.html');
  const info = extractJobInfo(doc);
  assert.equal(info.industry, 'Staffing and Recruiting');
});

test('Morson Edge: extracts company size', () => {
  const doc = loadPage('morson-edge-job.html');
  const info = extractJobInfo(doc);
  assert.match(info.size, /employees/i);
});

test('Morson Edge: extracts followers count', () => {
  const doc = loadPage('morson-edge-job.html');
  const info = extractJobInfo(doc);
  assert.ok(info.followers, 'should have followers count');
  assert.match(info.followers, /^\d[\d,]*$/);
});

test('Morson Edge: verdict is recruiter', () => {
  const doc = loadPage('morson-edge-job.html');
  const info = extractJobInfo(doc);
  assert.equal(isRecruiterText(info.industry), true, 'industry should trigger recruiter flag');
});

// --- extractJobInfo: SimCorp LinkedIn page ---

test('SimCorp: extracts company name', () => {
  const doc = loadPage('simcorp-job.html');
  const info = extractJobInfo(doc);
  assert.equal(info.company, 'SimCorp');
});

test('SimCorp: extracts industry as Software Development', () => {
  const doc = loadPage('simcorp-job.html');
  const info = extractJobInfo(doc);
  assert.equal(info.industry, 'Software Development');
});

test('SimCorp: extracts company size', () => {
  const doc = loadPage('simcorp-job.html');
  const info = extractJobInfo(doc);
  assert.match(info.size, /employees/i);
});

test('SimCorp: extracts followers count', () => {
  const doc = loadPage('simcorp-job.html');
  const info = extractJobInfo(doc);
  assert.ok(info.followers, 'should have followers count');
  assert.match(info.followers, /^\d[\d,]*$/);
});

test('SimCorp: verdict is direct employer', () => {
  const doc = loadPage('simcorp-job.html');
  const info = extractJobInfo(doc);
  assert.equal(isRecruiterText(info.company), false);
  assert.equal(isRecruiterText(info.industry), false, 'Software Development should not flag as recruiter');
});

// --- extractJobInfo: HCLTech — job list view (iframe detail panel, old layout) ---

test('HCLTech: extracts company name', () => {
  const doc = loadPage('hcltech-job-detail-iframe.html');
  const info = extractJobInfo(doc);
  assert.equal(info.company, 'HCLTech');
});

test('HCLTech: extracts industry', () => {
  const doc = loadPage('hcltech-job-detail-iframe.html');
  const info = extractJobInfo(doc);
  assert.equal(info.industry, 'IT Services and IT Consulting');
});

test('HCLTech: extracts company size', () => {
  const doc = loadPage('hcltech-job-detail-iframe.html');
  const info = extractJobInfo(doc);
  assert.equal(info.size, '10,001+ employees');
});

test('HCLTech: extracts followers count', () => {
  const doc = loadPage('hcltech-job-detail-iframe.html');
  const info = extractJobInfo(doc);
  assert.equal(info.followers, '251,435');
});

test('HCLTech: verdict is direct employer', () => {
  const doc = loadPage('hcltech-job-detail-iframe.html');
  const info = extractJobInfo(doc);
  assert.equal(isRecruiterText(info.company), false);
  assert.equal(isRecruiterText(info.industry), false, 'IT Services should not flag as recruiter');
});
