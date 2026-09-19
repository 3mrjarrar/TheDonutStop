import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultFeatured, validFeatured, featuredItems } from '../src/lib/featuredProducts.js';

test('featured selection preserves the four requested products and order', () => {
  const selection = ['36-strawberry-jam-cream.png', '18-oreo-filling.png', '01-original-glaze.png', '35-blueberry-cheesecake.png'];
  assert.equal(validFeatured(selection), true);
  assert.deepEqual(featuredItems(selection).map(item => item[0]), ['Strawberry Jam & Cream', 'Oreo Filling', 'Original Glaze', 'Blueberry Cheesecake']);
});
test('invalid, missing, or repeated featured products retain a complete default section', () => {
  for (const value of [null, [], defaultFeatured.slice(1), [...defaultFeatured, defaultFeatured[0]], Array(4).fill(defaultFeatured[0]), ['missing.png', ...defaultFeatured.slice(1)]]) {
    assert.equal(validFeatured(value), false);
    assert.deepEqual(featuredItems(value).map(item => item[2]), defaultFeatured);
  }
});
