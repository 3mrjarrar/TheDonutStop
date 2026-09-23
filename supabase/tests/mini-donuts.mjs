import { setupStorage } from './storage-fixture.mjs';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
await setupStorage(db);
const directory = new URL('../migrations/', import.meta.url);
for (const file of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(new URL(file, directory), 'utf8'));
  if (file === '202609170001_catalog.sql') await db.exec(readFileSync(new URL('../seed.sql', import.meta.url), 'utf8'));
}
const products = (await db.query("select v.id, p.slug from product_variants v join products p on p.id=v.product_id where p.slug in ('donuts-mini-donut-bites','donuts-original-glaze')")).rows;
const mini = products.find(p => p.slug.includes('mini')).id;
const regular = products.find(p => !p.slug.includes('mini')).id;
const line = (id, quantity, price) => ({variant_id:id,category:'donuts',quantity,unit_price:price});
// These tests isolate product eligibility; schedule boundaries have their own suite.
await db.exec('update shared_offers set weekdays=array[1,2,3,4,5,6,7]');
const rules = [['daily',5,1],['tuesday',7,5],['buy6get2',6,2],['buy7get3',7,3],['buy8get4',8,4],['buy6get6',6,6]];
const calculate = async (lines, codes) => (await db.query('select calculate_donut_offer($1,true,$2) as q',[JSON.stringify(lines),codes])).rows[0].q;
for (const [code,buy,free] of rules) {
  for (const price of [1,6,7,20]) {
    assert.equal((await calculate([line(mini,24,price)],[code])).discount,0);
    assert.equal((await calculate([line(regular,buy+free-1,7),line(mini,24,price)],[code])).discount,0);
    const q = await calculate([line(regular,(buy+free)*2,7),line(mini,24,price)],[code]);
    assert.equal(q.discount,free*2*7);
    assert.equal(q.lines.find(l=>l.variant_id===mini).free_quantity,0);
    assert.equal(q.total,(buy+free)*2*7+24*price-free*2*7);
  }
}
const codes = rules.map(r=>r[0]);
assert.equal((await calculate([line(mini,99,6)],codes)).discount,0);
await db.exec('update branch_inventory set quantity=100,manual_unavailable=false,carried=true; update branch_offers set enabled=true,admin_activated=true;');
const branches = (await db.query('select id from branches')).rows;
for (const {id:branch} of branches) {
  const items = [{variant_id:mini,quantity:12,category:'donuts',offer_eligible:true}];
  await db.exec('set role anon');
  const q = (await db.query('select get_guest_order_quote($1,$2) as q',[branch,JSON.stringify(items)])).rows[0].q;
  assert.equal(q.discount,0);
  assert.equal(q.total,240);
  const customer = {name:'Test Customer',phone:'0599999999',fulfillment:'pickup',payment_method:'cash'};
  const order = (await db.query('select place_guest_order($1,$2,$3,$4,$5) as r',[crypto.randomUUID(),branch,JSON.stringify(items),JSON.stringify(customer),240])).rows[0].r;
  assert.equal(order.total,240);
  await db.exec('reset role');
}
assert.equal((await db.query('select sum(free_quantity) as free from order_items where variant_id=$1',[mini])).rows[0].free,0);
await db.close();
console.log('Mini donuts excluded from every offer, repeated bundles, mixed carts, all branches, quotes and checkout.');
