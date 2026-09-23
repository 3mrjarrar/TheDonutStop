import test from 'node:test';
import assert from 'node:assert/strict';
import { offerCapacity, addOfferSelection } from '../src/lib/offerSelection.js';
import { offerCatalog } from '../src/lib/offerCatalog.js';
const row = (id, quantity = 20, price = 6) => ({ quantity, product_variants: { id, price, products: { name: id, category: 'donuts' } } });
test('every offer accepts repeated flavors in a single immutable batch', () => {
  for (const offer of offerCatalog.filter(offer => !offer.displayOnly)) {
    const cart = [{ id: 'a', quantity: offer.buy, category: 'donuts' }];
    const result = addOfferSelection(cart, [row('a'), row('b')], { b: offer.free }, { type: offer.code, remaining: offer.free });
    assert.equal(result[1].quantity, offer.free);
    assert.equal(cart.length, 1);
  }
});
test('stock, existing quantities, offer quota and eligibility are enforced atomically', () => {
  const offer = { type: 'tuesday', remaining: 6 };
  const cart = [{ id: 'a', quantity: 3 }];
  assert.equal(offerCapacity(row('a', 5), cart, offer.type), 2);
  assert.equal(addOfferSelection(cart, [row('a', 5), row('b')], { a: 3, b: 1 }, offer), null);
  assert.equal(addOfferSelection([], [row('a')], { a: 7 }, offer), null);
  for (const quantity of [-1, 1.5, NaN, 0]) assert.equal(addOfferSelection([], [row('a')], { a: quantity }, offer), null);
  assert.equal(addOfferSelection([], [{ ...row('a'), manual_unavailable: true }], { a: 1 }, offer), null);
  assert.equal(addOfferSelection([], [row('mini donut')], { 'mini donut': 1 }, offer), null);
  assert.equal(addOfferSelection(cart, [row('a', 5)], { a: 2 }, offer)[0].quantity, 5);
});
test('cart line limits, per-flavor limits, and price-restricted offers remain enforced', () => {
  const cart = Array.from({ length: 49 }, (_, index) => ({ id: String(index), quantity: 1 }));
  assert.equal(addOfferSelection(cart, [row('a'), row('b')], { a: 1, b: 1 }, { type: 'tuesday', remaining: 6 }), null);
  assert.equal(offerCapacity(row('a', 120), [{ id: 'a', quantity: 98 }], 'tuesday'), 1);
  for (const offer of offerCatalog.filter(offer => offer.eligiblePrices)) {
    assert.equal(offerCapacity(row('a', 20, 100), [], offer.code), 0);
  }
});
