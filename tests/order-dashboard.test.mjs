import test from 'node:test';
import assert from 'node:assert/strict';
import { orderDay, dayWindow, dashboardSummary, filterOrders, waitingMinutes, fetchOrderPages, incomingOrders } from '../src/pages/Admin/orderDashboard.js';
const order = (overrides = {}) => ({ id: '1', order_number: 'DS-1001', customer_name: 'أحمد', phone: '+970 599-123456', status: 'new', fulfillment: 'pickup', created_at: '2026-09-24T09:00:00Z', total: '12.30', order_items: [{ name: 'دونات', size: 'standard', quantity: 2 }], ...overrides });
const filter = { date: '', today: '2026-09-24', status: 'all', fulfillment: 'all', search: '' };
test('local business day includes orders after Palestine midnight, in winter and summer', () => {
  assert.equal(orderDay('2026-09-23T21:30:00Z'), '2026-09-24');
  assert.equal(orderDay('2026-01-23T22:30:00Z'), '2026-01-24');
  for (const day of ['2026-09-24', '2026-01-24']) {
    const [start, end] = dayWindow(day);
    assert.ok(Date.parse(start) < Date.parse(`${day}T00:00Z`));
    assert.ok(Date.parse(end) > Date.parse(`${day}T23:59Z`));
  }
});
test('summary counts the entire day and only completed order value and items', () => {
  const rows = Array.from({ length: 120 }, (_, i) => order({ id: `${i}`, status: 'completed' }));
  rows.push(order({ status: 'cancelled', total: 999 }), order({ status: 'new' }), order({ status: 'completed', created_at: '2026-09-22T09:00Z', total: 999 }));
  assert.deepEqual(dashboardSummary(rows, filter.today), { total: 122, completed: 120, cancelled: 1, revenue: 1476, top: [['دونات', 240]] });
});
test('default view retains old open orders but excludes old completed ones', () => {
  const rows = [order(), order({ id: '2', created_at: '2026-09-20T09:00Z' }), order({ id: '3', created_at: '2026-09-20T09:00Z', status: 'completed' })];
  assert.deepEqual(filterOrders(rows, filter).map(row => row.id), ['1', '2']);
  assert.deepEqual(filterOrders(rows, { ...filter, date: '2026-09-20', status: 'completed' }).map(row => row.id), ['3']);
});
test('search supports name, order number, formatted phones, and combined filters', () => {
  for (const search of ['أحمد', 'ds-1001', '599123456', '+970 (599) 123456']) assert.equal(filterOrders([order()], { ...filter, search }).length, 1);
  assert.equal(filterOrders([order()], { ...filter, fulfillment: 'delivery' }).length, 0);
  assert.equal(filterOrders([order()], { ...filter, status: 'ready' }).length, 0);
  assert.equal(filterOrders([order()], { ...filter, search: 'missing' }).length, 0);
});
test('wait time does not become negative and crosses the delay threshold correctly', () => {
  assert.equal(waitingMinutes(order(), Date.parse('2026-09-24T09:15Z')), 15);
  assert.equal(waitingMinutes(order(), Date.parse('2026-09-24T08:59Z')), 0);
});
test('pagination reads beyond 100 and 1000 rows; rejects a partial failed fetch', async () => {
  const rows = Array.from({ length: 1101 }, (_, id) => ({ id }));
  const loaded = await fetchOrderPages(() => ({ range: async (start, end) => ({ data: rows.slice(start, end + 1) }) }));
  assert.equal(loaded.length, 1101);
  await assert.rejects(fetchOrderPages(() => ({ range: async start => start ? { error: new Error('offline') } : { data: rows.slice(0, 500) } })), /offline/);
});

test('returning to the dashboard alerts for new orders on the first snapshot', () => {
  const rows = [order(), order({ id: '2', status: 'preparing' }), order({ id: '3', status: 'completed' })];
  assert.deepEqual(incomingOrders(rows, null).map(row => row.id), ['1']);
  assert.deepEqual(incomingOrders(rows, new Set(['1', '2', '3'])), []);
  assert.deepEqual(incomingOrders([...rows, order({ id: '4' })], new Set(['1', '2', '3'])).map(row => row.id), ['4']);
});
