#!/usr/bin/env node
/**
 * Lighthouse Performance Automation Script (T114)
 *
 * Runs Lighthouse against the portfolio URL, asserts minimum scores,
 * and writes an HTML report to the ./lighthouse-reports/ directory.
 *
 * Usage:
 *   node scripts/lighthouse-perf.mjs [URL]
 *   node scripts/lighthouse-perf.mjs http://localhost:4200
 *
 * Prerequisites:
 *   npm install -D lighthouse chrome-launcher
 *
 * Minimum score thresholds (Lighthouse 0-1 scale):
 *   Performance  ≥ 0.85 (≥ 85)
 *   Accessibility≥ 0.90 (≥ 90)
 *   Best Practices ≥ 0.85 (≥ 85)
 *   SEO          ≥ 0.90 (≥ 90)
 */

import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const URL = process.argv[2] ?? 'http://localhost:4200';
const REPORTS_DIR = resolve('lighthouse-reports');

/** Minimum acceptable Lighthouse scores (0–1). */
const THRESHOLDS = {
  performance: 0.85,
  accessibility: 0.90,
  'best-practices': 0.85,
  seo: 0.90,
};

async function run() {
  console.log(`\n[Lighthouse] Running audit against: ${URL}\n`);

  const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });

  const result = await lighthouse(URL, {
    port: chrome.port,
    output: ['html', 'json'],
    logLevel: 'error',
    onlyCategories: Object.keys(THRESHOLDS),
    formFactor: 'desktop',
    throttlingMethod: 'simulate',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
  });

  await chrome.kill();

  if (!result?.lhr || !result.report) {
    console.error('[Lighthouse] No result returned. Is the server running?');
    process.exit(1);
  }

  // ── Write reports ──────────────────────────────────────────────────────────
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = join(REPORTS_DIR, `lighthouse-${timestamp}.html`);
  const jsonPath = join(REPORTS_DIR, `lighthouse-${timestamp}.json`);

  const [htmlReport, jsonReport] = Array.isArray(result.report)
    ? result.report
    : [result.report, null];

  writeFileSync(htmlPath, htmlReport);
  if (jsonReport) writeFileSync(jsonPath, jsonReport);
  console.log(`[Lighthouse] HTML report: ${htmlPath}`);
  if (jsonReport) console.log(`[Lighthouse] JSON report: ${jsonPath}`);

  // ── Score summary ──────────────────────────────────────────────────────────
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│  Lighthouse Score Summary                       │');
  console.log('├─────────────────────┬───────────┬───────────────┤');
  console.log('│ Category            │  Score    │  Result       │');
  console.log('├─────────────────────┼───────────┼───────────────┤');

  let failed = false;
  for (const [category, minScore] of Object.entries(THRESHOLDS)) {
    const score = result.lhr.categories[category]?.score ?? 0;
    const pct = Math.round(score * 100);
    const pass = score >= minScore;
    if (!pass) failed = true;
    const statusIcon = pass ? '✓ PASS' : '✗ FAIL';
    console.log(
      `│ ${category.padEnd(19)} │  ${String(pct).padStart(3)} / 100  │  ${statusIcon.padEnd(13)} │`,
    );
  }
  console.log('└─────────────────────┴───────────┴───────────────┘');

  // ── Core Web Vitals ────────────────────────────────────────────────────────
  const audits = result.lhr.audits;
  const fcp = audits['first-contentful-paint']?.numericValue;
  const lcp = audits['largest-contentful-paint']?.numericValue;
  const cls = audits['cumulative-layout-shift']?.numericValue;
  const tbt = audits['total-blocking-time']?.numericValue;

  console.log('\n  Core Web Vitals:');
  console.log(`    FCP  : ${fcp != null ? `${(fcp / 1000).toFixed(2)}s` : 'n/a'} (target < 2s)`);
  console.log(`    LCP  : ${lcp != null ? `${(lcp / 1000).toFixed(2)}s` : 'n/a'} (target < 2.5s)`);
  console.log(`    CLS  : ${cls != null ? cls.toFixed(3) : 'n/a'} (target < 0.1)`);
  console.log(`    TBT  : ${tbt != null ? `${tbt.toFixed(0)}ms` : 'n/a'}`);

  if (fcp != null && fcp > 2000) console.warn('  ⚠  FCP exceeds 2s target');
  if (lcp != null && lcp > 2500) console.warn('  ⚠  LCP exceeds 2.5s target');
  if (cls != null && cls > 0.1)  console.warn('  ⚠  CLS exceeds 0.1 target');

  if (failed) {
    console.error('\n[Lighthouse] One or more score thresholds failed. See report for details.\n');
    process.exit(1);
  }

  console.log('\n[Lighthouse] All thresholds passed. ✓\n');
}

run().catch((err) => {
  console.error('[Lighthouse] Unexpected error:', err);
  process.exit(1);
});
