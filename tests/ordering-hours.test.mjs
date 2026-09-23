import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrderingStatus } from '../src/lib/orderingHours.js';

test('live server acceptance enables checkout using the deployed RPC', async () => {
  const calls = [];
  const client = { rpc: async (...args) => { calls.push(args); return { data: { accepting: true, reason: 'open', orders_paused: false } }; } };
  assert.deepEqual(await getOrderingStatus(client, 'nablus'), { open: true, reason: 'open' });
  assert.deepEqual(calls, [['branch_ordering_status', { p_branch: 'nablus' }]]);
});

test('server closures and pauses cannot be bypassed', async () => {
  for (const data of [{ accepting: false, reason: 'closed' }, { accepting: false, orders_paused: true }, { accepting: true, orders_paused: true }]) {
    assert.equal((await getOrderingStatus({ rpc: async () => ({ data }) }, 'branch')).open, false);
  }
});

test('only a missing RPC falls back to the original server-clock endpoint', async () => {
  const calls = [];
  const client = { rpc: async name => {
    calls.push(name);
    return name === 'branch_ordering_status' ? { error: { code: 'PGRST202' } } : { data: { open: true } };
  } };
  assert.equal((await getOrderingStatus(client, 'branch')).open, true);
  assert.deepEqual(calls, ['branch_ordering_status', 'get_branch_ordering_status']);
  for (const response of [{ error: { code: '42501' } }, { error: { message: 'Network failure' } }, { data: {} }]) {
    let count = 0;
    await assert.rejects(getOrderingStatus({ rpc: async () => { count++; return response; } }, 'branch'));
    assert.equal(count, 1);
  }
});

test('the existing timeout signal also applies to the compatibility request', async () => {
  const controller = new AbortController();
  const signals = [];
  const client = { rpc: name => ({ abortSignal: async signal => {
    signals.push(signal);
    return name === 'branch_ordering_status' ? { error: { code: 'PGRST202' } } : { error: { message: 'Request aborted' } };
  } }) };
  await assert.rejects(getOrderingStatus(client, 'branch', controller.signal));
  assert.deepEqual(signals, [controller.signal, controller.signal]);
});
