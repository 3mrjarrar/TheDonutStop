import test from 'node:test';
import assert from 'node:assert/strict';
import { offerPrompt } from '../src/lib/offers.js';
const donuts = quantity => [{category:'donuts',quantity}];
test('offer prompts count donuts only and guide complete bundles', () => {
  assert.equal(offerPrompt([{category:'hot',quantity:5}],false),null);
  assert.equal(offerPrompt(donuts(4),false),null);
  assert.deepEqual(offerPrompt(donuts(5),false),{type:'daily',remaining:1,count:5});
  assert.equal(offerPrompt(donuts(6),false),null);
  assert.deepEqual(offerPrompt(donuts(11),false),{type:'daily',remaining:1,count:11});
  assert.deepEqual(offerPrompt(donuts(5),true),{type:'daily',remaining:1,count:5});
  assert.deepEqual(offerPrompt(donuts(7),true),{type:'tuesday',remaining:5,count:7});
  assert.deepEqual(offerPrompt(donuts(11),true),{type:'tuesday',remaining:1,count:11});
  assert.equal(offerPrompt(donuts(12),true),null);
});
