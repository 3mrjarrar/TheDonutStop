import test from 'node:test';
import assert from 'node:assert/strict';
import { offerDefinition, visibleOffers, offerTitle, offerSchedule } from '../src/lib/offerCatalog.js';
import { offerPrompt } from '../src/lib/offers.js';
import { addOfferSelection } from '../src/lib/offerSelection.js';
const definition={code:'custom_test',custom:true,buy_quantity:6,free_quantity:2,image_url:null,weekdays:[1,3],start_time:'09:00:00',end_time:'12:00:00',starts_on:'2026-09-01',ends_on:'2026-09-30'};
const row={code:definition.code,enabled:true,branches:{code:'NAB'},shared_offers:definition};
test('dynamic definitions appear as text offers only when enabled at the selected branch',()=>{
  const offers=visibleOffers([row,row],'NAB');
  assert.equal(offers.length,1);
  assert.equal(offers[0].buy,6);assert.equal(offers[0].free,2);
  assert.equal(offers[0].image,undefined);assert.equal(offers[0].imageUrl,null);
  assert.equal(offerTitle(offers[0],true),'Buy 6, get 2 free');
  assert.deepEqual(visibleOffers([{...row,enabled:false}]),[]);
  assert.deepEqual(visibleOffers([row],'ICON'),[]);
  assert.equal(offerDefinition({...definition,image_url:'https://example.com/offer.jpg'}).imageUrl,'https://example.com/offer.jpg');
});
test('schedules expose weekdays, dates, local hours and overnight ending in both languages',()=>{
  const offer=offerDefinition(row);
  assert.match(offerSchedule(offer,true),/Monday, Wednesday · 09:00–12:00/);
  assert.match(offerSchedule(offer,true),/From 2026-09-01 · Through 2026-09-30/);
  assert.doesNotMatch(offerSchedule(offer),/بتوقيت فلسطين/);
  assert.doesNotMatch(offerSchedule(offer,true),/Palestine time/);
  assert.match(offerSchedule({...offer,start_time:'22:00',end_time:'02:00'},true),/next day/);
  assert.match(offerSchedule({...offer,weekdays:[1,2,3,4,5,6,7],start_time:null,end_time:null},true),/Every day · All day/);
});
test('server-active custom rules drive the existing bulk overlay and stock constraints',()=>{
  const rules=[{code:'custom_test',buy:6,free:2}];
  const cart=[{id:'a',category:'donuts',quantity:6}];
  const prompt=offerPrompt(cart,false,['custom_test'],rules);
  assert.deepEqual(prompt,{type:'custom_test',remaining:2,count:6});
  assert.equal(offerPrompt(cart,false,[],rules),null);
  const inventory=[{quantity:8,product_variants:{id:'a',price:6,products:{name:'Glaze',category:'donuts'}}}];
  assert.equal(addOfferSelection(cart,inventory,{a:2},prompt)[0].quantity,8);
  assert.equal(addOfferSelection(cart,inventory,{a:3},prompt),null);
  // A scheduled legacy offer can now run on admin-selected days, as authorized by the server.
  assert.deepEqual(offerPrompt([{category:'donuts',quantity:7}],false,['tuesday'],[{code:'tuesday',buy:7,free:5}]),{type:'tuesday',remaining:5,count:7});
});
