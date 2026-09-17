import test from 'node:test';
import assert from 'node:assert/strict';
import { isAvailable } from '../src/lib/availability.js';
test('only donuts require stock; manual stops apply to every category', () => {
  for (const category of ['donuts', 'hot', 'cold', 'blends']) {
    assert.equal(isAvailable(category, { quantity: 0, manual_unavailable: false }), category !== 'donuts');
    assert.equal(isAvailable(category, { quantity: 5, manual_unavailable: false }), true);
    assert.equal(isAvailable(category, { quantity: 5, manual_unavailable: true }), false);
    assert.equal(isAvailable(category, { quantity: 5, manual_unavailable: false, carried: false }), false);
  }
});
