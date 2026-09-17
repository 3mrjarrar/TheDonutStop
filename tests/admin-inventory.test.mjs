import test from 'node:test';
import assert from 'node:assert/strict';
import { menu } from '../src/components/menu/menuData.js';
import { inventoryGroup, inventoryPrice, byInventoryPrice } from '../src/pages/Admin/inventory.js';

test('every current menu product maps into the separate admin inventory sections', () => {
  const counts = {};
  for (const [category, products] of Object.entries(menu)) for (const [name] of products) {
    const group = inventoryGroup({ category, name });
    counts[group] = (counts[group] || 0) + 1;
  }
  assert.deepEqual(counts, { donuts: 34, hot: 20, cold: 10, mojito: 17, smoothies: 7, frappe: 3 });
});

test('inventory sorts numerically by actual branch price, including overrides and sizes', () => {
  const row = (price, override, size = 'standard') => ({ price_override: override, product_variants: { price, size, products: { name: 'Test' } } });
  const rows = [row('10', null), row('8', '12'), row('14', '6'), row('10', '0'), row('9', null, 'S')];
  assert.deepEqual(rows.sort(byInventoryPrice).map(inventoryPrice), [0, 6, 9, 10, 12]);
});
