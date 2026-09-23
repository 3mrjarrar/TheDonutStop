import test from 'node:test';
import assert from 'node:assert/strict';
import { hasDynamicOfferSetup, offerSaveError, dynamicOfferSetupMessage } from '../src/lib/offerSetup.js';
test('legacy shared offer rows cannot enable dynamic editing or image upload', () => {
  assert.equal(hasDynamicOfferSetup([{code:'daily',enabled:true,updated_at:'2026-09-23'}]),false);
  assert.equal(hasDynamicOfferSetup([]),true);
  assert.equal(hasDynamicOfferSetup([{buy_quantity:null,free_quantity:null,custom:false,weekdays:[1],image_url:null,start_time:null,end_time:null,starts_on:null,ends_on:null}]),true);
});
test('missing columns and RPCs identify the dynamic migration, not the storage migration', () => {
  for (const code of ['42703','42883','PGRST202','PGRST204']) assert.equal(offerSaveError({code}),dynamicOfferSetupMessage);
  assert.match(offerSaveError({code:'42501'}),/صلاحية/);
  assert.match(offerSaveError({code:'23514'}),/غير صالحة/);
});
