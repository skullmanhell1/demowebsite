'use strict';

// Feature: website-animation-ux-polish, Property 6: Stagger ordering and spacing
// For all groups animating together (entrance hero elements or sibling scroll-reveals),
// the assigned start offsets are strictly increasing with the primary/first element first,
// and consecutive pairs are separated such that entrance staggers stay in [50,300]ms and
// reveal staggers in [50,150]ms, with no two starts within the same 50ms window.
// Validates: Requirements 2.2, 3.3

const test = require('node:test');
const fc = require('fast-check');
const { computeStaggerDelays } = require('../reference/motion-system.js');

const RUNS = 200;

test('Property 6: offsets are strictly increasing, primary-first, and start at 0', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 50, max: 300 }),
      (count, step) => {
        const delays = computeStaggerDelays(count, step);
        if (delays.length !== count) { return false; }
        if (delays[0] !== 0) { return false; }
        for (let i = 1; i < delays.length; i++) {
          if (!(delays[i] > delays[i - 1])) { return false; }
        }
        return true;
      }
    ),
    { numRuns: RUNS }
  );
});

test('Property 6: entrance stagger step in [50,300]ms keeps consecutive starts >50ms apart', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 2, max: 8 }),
      fc.integer({ min: 50, max: 300 }),
      (count, step) => {
        const delays = computeStaggerDelays(count, step);
        for (let i = 1; i < delays.length; i++) {
          const gap = delays[i] - delays[i - 1];
          if (gap < 50 || gap > 300) { return false; }
        }
        return true;
      }
    ),
    { numRuns: RUNS }
  );
});

test('Property 6: reveal stagger step in [50,150]ms keeps consecutive starts within reveal band', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 2, max: 8 }),
      fc.integer({ min: 50, max: 150 }),
      (count, step) => {
        const delays = computeStaggerDelays(count, step);
        for (let i = 1; i < delays.length; i++) {
          const gap = delays[i] - delays[i - 1];
          if (gap < 50 || gap > 150) { return false; }
          // no two starts within the same 50ms window
          if (gap < 50) { return false; }
        }
        return true;
      }
    ),
    { numRuns: RUNS }
  );
});

test('Property 6: no two starts fall within the same 50ms window for any valid step', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 2, max: 10 }),
      fc.integer({ min: 50, max: 300 }),
      (count, step) => {
        const delays = computeStaggerDelays(count, step);
        // Bucket each start into 50ms windows; all must be distinct.
        const windows = delays.map((d) => Math.floor(d / 50));
        return new Set(windows).size === windows.length;
      }
    ),
    { numRuns: RUNS }
  );
});
