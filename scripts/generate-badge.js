#!/usr/bin/env node
/**
 * Generates a shields.io-style SVG coverage badge from Jest's coverage-summary.json.
 *
 * Usage:  node scripts/generate-badge.js
 *
 * Reads:  coverage/coverage-summary.json   (produced by `jest --coverage`)
 * Writes: .badges/coverage.svg
 *
 * Color thresholds:
 *   >= 80% → green  (#4c1)
 *   >= 60% → yellow (#e7c000)
 *    < 60% → red    (#e05d44)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Constants ──────────────────────────────────────────────────────────────
const CHAR_WIDTH = 7;   // approximate px width of one character (DejaVu Sans 11px)
const PADDING    = 10;  // horizontal padding per section (left + right = 10px)
const HEIGHT     = 20;  // badge height in px

// ── Read coverage data ─────────────────────────────────────────────────────
const summaryPath = path.resolve('coverage', 'coverage-summary.json');
if (!fs.existsSync(summaryPath)) {
  console.error(`Error: ${summaryPath} not found. Run "npm run test:cov" first.`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const pct = Math.round(summary.total.lines.pct);

// ── Determine badge color ──────────────────────────────────────────────────
const color = pct >= 80 ? '#4c1' : pct >= 60 ? '#e7c000' : '#e05d44';

// ── Layout calculations ────────────────────────────────────────────────────
const label = 'coverage';
const value = `${pct}%`;

const labelWidth = label.length * CHAR_WIDTH + PADDING;
const valueWidth = value.length * CHAR_WIDTH + PADDING;
const totalWidth = labelWidth + valueWidth;

// Text positions (stored ×10 for the SVG scale(.1) transform)
const labelCenterX10 = Math.round((labelWidth / 2) * 10);
const valueCenterX10 = Math.round((labelWidth + valueWidth / 2) * 10);
const labelTextLen   = (label.length * 60).toString();
const valueTextLen   = (value.length  * 60).toString();

// ── Build SVG ─────────────────────────────────────────────────────────────
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
  `     width="${totalWidth}" height="${HEIGHT}" role="img" aria-label="${label}: ${value}">`,
  `  <title>${label}: ${value}</title>`,
  `  <linearGradient id="s" x2="0" y2="100%">`,
  `    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>`,
  `    <stop offset="1" stop-opacity=".1"/>`,
  `  </linearGradient>`,
  `  <clipPath id="r">`,
  `    <rect width="${totalWidth}" height="${HEIGHT}" rx="3" fill="#fff"/>`,
  `  </clipPath>`,
  `  <g clip-path="url(#r)">`,
  `    <rect width="${labelWidth}" height="${HEIGHT}" fill="#555"/>`,
  `    <rect x="${labelWidth}" width="${valueWidth}" height="${HEIGHT}" fill="${color}"/>`,
  `    <rect width="${totalWidth}" height="${HEIGHT}" fill="url(#s)"/>`,
  `  </g>`,
  `  <g fill="#fff" text-anchor="middle"`,
  `     font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">`,
  `    <text x="${labelCenterX10}" y="150" fill="#010101" fill-opacity=".3"`,
  `          transform="scale(.1)" textLength="${labelTextLen}" lengthAdjust="spacing">${label}</text>`,
  `    <text x="${labelCenterX10}" y="140"`,
  `          transform="scale(.1)" textLength="${labelTextLen}" lengthAdjust="spacing">${label}</text>`,
  `    <text x="${valueCenterX10}" y="150" fill="#010101" fill-opacity=".3"`,
  `          transform="scale(.1)" textLength="${valueTextLen}" lengthAdjust="spacing">${value}</text>`,
  `    <text x="${valueCenterX10}" y="140"`,
  `          transform="scale(.1)" textLength="${valueTextLen}" lengthAdjust="spacing">${value}</text>`,
  `  </g>`,
  `</svg>`,
].join('\n');

// ── Write output ───────────────────────────────────────────────────────────
const outDir = path.resolve('.badges');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'coverage.svg');
fs.writeFileSync(outPath, svg);

console.log(`Coverage badge generated: ${pct}% lines (color: ${color})`);
console.log(`Output: ${outPath}`);
