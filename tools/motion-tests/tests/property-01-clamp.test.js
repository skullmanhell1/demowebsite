'use strict';

// Feature: website-animation-ux-polish, Property 1: Duration clamp is total, bounded, and idempotent
// For all real-valued duration inputs d, clampDuration(d) returns a value within [150,500];
// returns d unchanged when in range; maps d<150 to 150 and d>500 to 500; and is idempotent.
// Validates: Requirements 7.5

const test = require('node:test');
const assert = require('node:assert');
const fc = require('fast-check');
const { clampDuration } = require('../reference/motion-system.js');

const MIN = 150;
const MAX = 500;
const RUNS = 200;

test('Property 1: clampDuration is bounded within [150,500] for arbitrary reals', () => {
  fc.assert(
    fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), (d) => {
      const r = clampDuration(d);
      return r >= MIN && r <= MAX;
    }),
    { numRuns: RUNS }
  );
});

test('Property 1: returns input unchanged when already in range', () => {
  fc.assert(
    fc.property(fc.double({ min: MIN, max: MAX, noNaN: true }), (d) => {
      return clampDuration(d) === d;
    }),
    { numRuns: RUNS }
  );
});

test('Property 1: maps below-range to 150 and above-range to 500', () => {
  fc.assert(
    fc.property(fc.double({ min: -1e9, max: MIN - 0.001, noNaN: true }), (d) => {
      return clampDuration(d) === MIN;
    }),
    { numRuns: RUNS }
  );
  fc.assert(
    fc.property(fc.double({ min: MAX + 0.001, max: 1e9, noNaN: true }), (d) => {
      return clampDuration(d) === MAX;
    }),
    { numRuns: RUNS }
  );
});

test('Property 1: idempotent — clamp(clamp(d)) === clamp(d)', () => {
  fc.assert(
    fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), (d) => {
      const once = clampDuration(d);
      return clampDuration(once) === once;
    }),
    { numRuns: RUNS }
  );
});

test('Property 1: boundary values 150 and 500 are fixed points; non-finite falls back to a safe bound', () => {
  assert.strictEqual(clampDuration(150), 150);
  assert.strictEqual(clampDuration(500), 500);
  // Total function: NaN/Infinity resolve to a value inside the band.
  for (const bad of [NaN, Infinity, -Infinity, 'abc', undefined, null]) {
    const r = clampDuration(bad);
    assert.ok(r >= MIN && r <= MAX, 'non-finite input clamps into band: ' + String(bad));
  }
});
