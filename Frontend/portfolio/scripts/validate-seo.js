#!/usr/bin/env node
/**
 * SEO Validation Script
 *
 * Validates the built Angular application for SEO compliance by:
 *   1. Checking required meta tags are present in index.html
 *   2. Validating JSON-LD structured data syntax
 *   3. Checking image alt text on key images
 *   4. Reporting missing or invalid tags
 *
 * Usage:
 *   node scripts/validate-seo.js [--dist <path>]
 *
 * Defaults to reading ./dist/portfolio/browser/index.html
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ─── Config ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const distFlagIndex = args.indexOf('--dist');
const distPath =
  distFlagIndex !== -1
    ? args[distFlagIndex + 1]
    : path.join(__dirname, '..', 'dist', 'portfolio', 'browser');

const indexPath = path.join(distPath, 'index.html');

// ─── Required meta tag checks ─────────────────────────────────────────────────

const REQUIRED_META = [
  { type: 'name', key: 'description', label: '<meta name="description">' },
  { type: 'name', key: 'keywords',    label: '<meta name="keywords">' },
  { type: 'name', key: 'author',      label: '<meta name="author">' },
  { type: 'name', key: 'robots',      label: '<meta name="robots">' },
  { type: 'property', key: 'og:title',       label: '<meta property="og:title">' },
  { type: 'property', key: 'og:description', label: '<meta property="og:description">' },
  { type: 'property', key: 'og:type',        label: '<meta property="og:type">' },
  { type: 'property', key: 'og:url',         label: '<meta property="og:url">' },
  { type: 'name', key: 'twitter:card',        label: '<meta name="twitter:card">' },
  { type: 'name', key: 'twitter:title',       label: '<meta name="twitter:title">' },
  { type: 'name', key: 'twitter:description', label: '<meta name="twitter:description">' },
];

const REQUIRED_LINK_TAGS = [
  { rel: 'canonical', label: '<link rel="canonical">' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;

function pass(msg)  { console.log(`  ✓ ${msg}`); }
function fail(msg)  { console.error(`  ✗ ${msg}`); errors++; }
function warn(msg)  { console.warn(`  ⚠ ${msg}`); warnings++; }
function section(name) { console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 55 - name.length))}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('SEO Validation Report');
  console.log('='.repeat(60));
  console.log(`Source: ${indexPath}`);

  if (!fs.existsSync(indexPath)) {
    console.error(`\nERROR: index.html not found at: ${indexPath}`);
    console.error('Run "npm run build" first, or specify --dist <path>');
    process.exit(1);
  }

  const html = fs.readFileSync(indexPath, 'utf-8');

  // ── 1. Title tag ─────────────────────────────────────────────────────────
  section('Title Tag');
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    const title = titleMatch[1].trim();
    if (title.length === 0) {
      fail('Title tag is empty');
    } else if (title.length > 60) {
      warn(`Title may be truncated in SERPs (${title.length} chars, recommended ≤60): "${title}"`);
    } else {
      pass(`Title: "${title}" (${title.length} chars)`);
    }
  } else {
    fail('Missing <title> tag');
  }

  // ── 2. Meta tags ─────────────────────────────────────────────────────────
  section('Meta Tags');
  for (const meta of REQUIRED_META) {
    const attr = meta.type === 'property' ? 'property' : 'name';
    const regex = new RegExp(
      `<meta[^>]+${attr}=["']${escapeRegex(meta.key)}["'][^>]*content=["']([^"']*)["']`,
      'i',
    );
    const altRegex = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${escapeRegex(meta.key)}["']`,
      'i',
    );
    const match = html.match(regex) || html.match(altRegex);
    if (match) {
      const content = match[1].trim();
      if (content.length === 0) {
        fail(`${meta.label} is present but content is empty`);
      } else if (meta.key === 'description' && content.length > 160) {
        warn(`Meta description may be truncated (${content.length} chars, recommended ≤160)`);
        pass(`${meta.label} exists`);
      } else {
        pass(`${meta.label} — "${content.slice(0, 60)}${content.length > 60 ? '...' : ''}"`);
      }
    } else {
      // For dynamically set tags, warn rather than fail
      warn(`${meta.label} not found in SSR-rendered HTML (may be set client-side)`);
    }
  }

  // ── 3. Link tags ─────────────────────────────────────────────────────────
  section('Link Tags');
  for (const link of REQUIRED_LINK_TAGS) {
    const regex = new RegExp(`<link[^>]+rel=["']${escapeRegex(link.rel)}["'][^>]*>`, 'i');
    if (regex.test(html)) {
      pass(`${link.label} present`);
    } else {
      warn(`${link.label} not found (may be set client-side by SeoService)`);
    }
  }

  // Viewport
  if (/<meta[^>]+name=["']viewport["'][^>]*>/i.test(html)) {
    pass('<meta name="viewport"> present');
  } else {
    fail('Missing <meta name="viewport">');
  }

  // ── 4. JSON-LD Structured Data ────────────────────────────────────────────
  section('JSON-LD Structured Data');
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const jsonLdMatches = [...html.matchAll(jsonLdRegex)];

  if (jsonLdMatches.length === 0) {
    warn('No JSON-LD structured data found (may be injected client-side)');
  } else {
    for (let i = 0; i < jsonLdMatches.length; i++) {
      const raw = jsonLdMatches[i][1].trim();
      try {
        const parsed = JSON.parse(raw);
        const type = parsed['@type'] || (parsed['@graph'] ? '@graph' : 'unknown');
        const context = parsed['@context'];
        if (!context) {
          fail(`JSON-LD block ${i + 1}: missing @context`);
        } else if (context !== 'https://schema.org') {
          warn(`JSON-LD block ${i + 1}: @context is "${context}", expected "https://schema.org"`);
        } else {
          pass(`JSON-LD block ${i + 1}: valid (type: ${type})`);
        }
      } catch (err) {
        fail(`JSON-LD block ${i + 1}: invalid JSON — ${err.message}`);
      }
    }
  }

  // ── 5. Image alt text ─────────────────────────────────────────────────────
  section('Image Alt Text');
  const imgRegex = /<img[^>]*>/gi;
  const imgMatches = [...html.matchAll(imgRegex)];

  if (imgMatches.length === 0) {
    warn('No <img> elements found in SSR HTML (may be rendered client-side)');
  } else {
    let missingAlt = 0;
    let emptyAlt = 0;
    let validAlt = 0;

    for (const imgMatch of imgMatches) {
      const imgTag = imgMatch[0];
      const altMatch = imgTag.match(/alt=["'](.*?)["']/i);
      if (!altMatch) {
        missingAlt++;
      } else if (altMatch[1].trim() === '') {
        // Empty alt is OK for decorative images
        emptyAlt++;
      } else {
        validAlt++;
      }
    }

    if (missingAlt > 0) {
      fail(`${missingAlt} image(s) missing alt attribute`);
    }
    if (emptyAlt > 0) {
      warn(`${emptyAlt} image(s) with empty alt (decorative — verify these are intentional)`);
    }
    if (validAlt > 0) {
      pass(`${validAlt} image(s) with valid alt text`);
    }
  }

  // ── 6. Robots meta tag content ────────────────────────────────────────────
  section('Robots Policy');
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']robots["']/i);
  if (robotsMatch) {
    const policy = robotsMatch[1];
    if (policy.includes('noindex') || policy.includes('nofollow')) {
      warn(`Robots policy contains blocking directives: "${policy}"`);
    } else {
      pass(`Robots policy: "${policy}"`);
    }
  }

  // ── 7. sitemap.xml reachability ────────────────────────────────────────────
  section('Sitemap');
  const sitemapPath = path.join(distPath, 'assets', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    const urlCount = (sitemap.match(/<url>/g) || []).length;
    pass(`sitemap.xml found with ${urlCount} URL(s)`);
  } else {
    warn(`sitemap.xml not found at dist/assets/sitemap.xml (ensure it is copied during build)`);
  }

  // ── 8. robots.txt ─────────────────────────────────────────────────────────
  section('robots.txt');
  const robotsPath = path.join(distPath, 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    const robotsTxt = fs.readFileSync(robotsPath, 'utf-8');
    if (robotsTxt.toLowerCase().includes('disallow: /admin')) {
      pass('robots.txt present and disallows /admin');
    } else {
      warn('robots.txt present but does not explicitly disallow /admin');
    }
    if (robotsTxt.toLowerCase().includes('sitemap:')) {
      pass('robots.txt includes Sitemap directive');
    } else {
      warn('robots.txt missing Sitemap directive');
    }
  } else {
    warn('robots.txt not found in dist/ (ensure it is copied during build)');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  if (errors === 0 && warnings === 0) {
    console.log('  ALL CHECKS PASSED — No issues found.');
  } else {
    if (errors > 0) console.error(`  ✗ ${errors} error(s) found`);
    if (warnings > 0) console.warn(`  ⚠ ${warnings} warning(s) found`);
  }
  console.log('');

  if (errors > 0) process.exit(1);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main();
