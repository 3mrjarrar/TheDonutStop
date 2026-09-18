import test from 'node:test';
import assert from 'node:assert/strict';
import { offerPrompt } from '../src/lib/offers.js';
import { offerCatalog, offerTitle } from '../src/lib/offerCatalog.js';
import { existsSync } from 'node:fs';
const donuts = quantity => [{category:'donuts',quantity}];
test('prompts never advertise disabled offers and count donuts only', () => {
  assert.equal(offerPrompt(donuts(11),true),null);
  assert.equal(offerPrompt(donuts(11),true,[]),null);
  assert.equal(offerPrompt([{category:'hot',quantity:5}],false,['daily']),null);
  assert.equal(offerPrompt(donuts(4),false,['daily']),null);
  assert.deepEqual(offerPrompt(donuts(5),false,['daily']),{type:'daily',remaining:1,count:5});
  assert.equal(offerPrompt(donuts(6),false,['daily']),null);
  assert.deepEqual(offerPrompt(donuts(11),false,['daily']),{type:'daily',remaining:1,count:11});
  assert.deepEqual(offerPrompt(donuts(7),true,['tuesday']),{type:'tuesday',remaining:5,count:7});
  assert.equal(offerPrompt(donuts(7),false,['tuesday']),null);
  assert.equal(offerPrompt(donuts(12),true,['tuesday']),null);
});
test('all four new bundles prompt at paid quantity and stop at full bundles', () => {
  for (const offer of offerCatalog.filter(offer => offer.isNew)) {
    assert.deepEqual(offerPrompt(donuts(offer.buy),false,[offer.code]),{type:offer.code,remaining:offer.free,count:offer.buy});
    assert.equal(offerPrompt(donuts(offer.buy+offer.free),false,[offer.code]),null);
    assert.ok(existsSync(`public/assets/offers/${offer.image}.png`));
    assert.ok(offerTitle(offer.code).includes(String(offer.free)));
  }
});

import { visibleOffers } from '../src/lib/offerCatalog.js';
test('hiding every offer across every branch leaves no original or new cards', () => {
  const rows = ['NAB','ICON','TERI'].flatMap(branch_id => offerCatalog.map(offer => ({branch_id, code:offer.code, enabled:false, admin_activated:true})));
  assert.deepEqual(visibleOffers(rows), []);
  assert.deepEqual(visibleOffers([]), []);
  rows.find(row => row.branch_id === 'ICON' && row.code === 'daily').enabled = true;
  assert.deepEqual(visibleOffers(rows).map(offer => offer.code), ['daily']);
  rows.find(row => row.branch_id === 'ICON' && row.code === 'daily').enabled = false;
  assert.deepEqual(visibleOffers(rows), []);
});

import { isOfferEnabled } from '../src/lib/offerCatalog.js';
test('legacy default rows never create cards without explicit admin activation', () => {
  const rows = ['daily','tuesday','morning'].map(code => ({code,enabled:true}));
  assert.deepEqual(visibleOffers(rows), []);
  assert.deepEqual(visibleOffers(rows.map(row=>({...row,admin_activated:false}))), []);
  for (const row of rows) {
    assert.equal(isOfferEnabled(row), false);
    assert.deepEqual(visibleOffers([{...row,admin_activated:true}]).map(offer=>offer.code), [row.code]);
    assert.deepEqual(visibleOffers([{...row,admin_activated:true,enabled:false}]), []);
  }
  assert.equal(isOfferEnabled(undefined), false);
  assert.deepEqual(visibleOffers([{code:'buy6get2',enabled:true}]).map(offer=>offer.code), ['buy6get2']);
});

import { offerAvailability } from '../src/lib/offerCatalog.js';
test('shared offer labels include every branch except Terah for drinks', () => {
  for (const offer of offerCatalog) {
    assert.match(offerAvailability(offer), /جميع الفروع/);
    assert.equal(offerAvailability(offer).includes('ما عدا الطيرة'), offer.code === 'morning');
    assert.equal(offerAvailability(offer,true).includes('except Terah'), offer.code === 'morning');
  }
});
