import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
for (const file of ['migrations/202609170001_catalog.sql','seed.sql','migrations/202609170002_admin_inventory.sql','migrations/202609170003_drink_availability.sql','migrations/202609170004_orders.sql','migrations/202609180001_order_tracking.sql','migrations/202609180002_donut_offers.sql','migrations/202609190001_managed_offers.sql','migrations/202609190002_manage_all_offers.sql']) await db.exec(readFileSync(new URL('../'+file,import.meta.url),'utf8'));

const line=(id,price,quantity=1,category='donuts')=>({variant_id:id,unit_price:price,quantity,category});
async function calculate(lines,tuesday=false,enabled=['daily','tuesday']) { return (await db.query('select calculate_donut_offer($1,$2,$3) as quote',[JSON.stringify(lines),tuesday,enabled])).rows[0].quote; }
let q=await calculate([line('a',10,5),line('b',7)]);
assert.equal(q.discount,7); assert.equal(q.total,50); assert.equal(q.lines.find(x=>x.variant_id==='b').free_quantity,1);
assert.equal((await calculate([line('a',8,6)])).discount,0);
assert.equal((await calculate([line('a',7,5)])).discount,0);
assert.equal((await calculate([line('a',7,5,'hot'),line('b',6)])).discount,0);
q=await calculate([line('a',10,7),line('b',8,5)],true);
assert.equal(q.total,70);assert.equal(q.discount,40);assert.equal(q.offer_code,'tuesday');
assert.equal((await calculate([line('a',10,7),line('b',8,5)],false)).discount,0);
q=await calculate([line('a',7,7),line('b',1,5)],true);
assert.equal(q.offer_code,'daily');assert.equal(q.discount,14); // daily is better than five cheap free donuts
q=await calculate([line('a',7,12)],true);assert.equal(q.discount,35); // no stacking with daily's 14
q=await calculate([line('a',10,14),line('b',6,10),line('drink',20,1,'cold')],true);
assert.equal(q.total,160); assert.equal(q.discount,60);
q=await calculate([line('a',6,13)]);assert.equal(q.discount,12);assert.equal(q.total,66);
await db.exec('set role anon');
await assert.rejects(db.query("select calculate_donut_offer($1,true,array['daily'])",[JSON.stringify([line('a',7,12)])]));
await db.exec('reset role');
const branch=(await db.query('select id from branches order by sort_order limit 1')).rows[0].id;
const variant=(await db.query("select v.id from product_variants v join products p on p.id=v.product_id where p.category='donuts' and v.price=6 limit 1")).rows[0].id;
await db.query('update branch_inventory set quantity=100,price_override=7 where branch_id=$1 and variant_id=$2',[branch,variant]);
const customer={name:'Offer Test',phone:'0592223333',fulfillment:'pickup',address:'',notes:'',payment_method:'cash'};
const items=[{variant_id:variant,quantity:6}];
await db.exec('set role anon');
q=(await db.query('select get_guest_order_quote($1,$2) as q',[branch,JSON.stringify(items)])).rows[0].q;
assert.equal(q.total,35);assert.equal(q.discount,7);
await assert.rejects(db.query('select place_guest_order($1,$2,$3,$4,0)',[crypto.randomUUID(),branch,JSON.stringify(items),JSON.stringify(customer)]));
const key=crypto.randomUUID();
const args=[key,branch,JSON.stringify(items),JSON.stringify(customer),35];
const receipt=(await db.query('select place_guest_order($1,$2,$3,$4,$5) as r',args)).rows[0].r;
assert.equal(receipt.total,35);
assert.deepEqual((await db.query('select place_guest_order($1,$2,$3,$4,$5) as r',args)).rows[0].r,receipt);
await db.exec('reset role');
assert.equal((await db.query('select free_quantity from order_items')).rows[0].free_quantity,1);
assert.equal(Number((await db.query('select discount from orders')).rows[0].discount),7);
assert.equal((await db.query('select quantity from branch_inventory where branch_id=$1 and variant_id=$2',[branch,variant])).rows[0].quantity,94);
// Test the live quote + checkout path on a deterministic Tuesday, in this isolated database only.
const migration=readFileSync(new URL('../migrations/202609190001_managed_offers.sql',import.meta.url),'utf8');
let quoteFunction=migration.slice(migration.indexOf('create or replace function public.get_guest_order_quote'),migration.indexOf('revoke all on function public.get_guest_order_quote'));
quoteFunction=quoteFunction.replace("extract(isodow from now() at time zone 'Asia/Hebron')=2",'true');
await db.exec(quoteFunction);
await db.query('update branches set delivery_enabled=true,delivery_fee=5 where id=$1',[branch]);
await db.exec('set role anon');
const dozen=[{variant_id:variant,quantity:12}];
q=(await db.query('select get_guest_order_quote($1,$2) as q',[branch,JSON.stringify(dozen)])).rows[0].q;
assert.equal(q.is_tuesday,true);assert.equal(q.total,49);assert.equal(q.offer_code,'tuesday');
const delivered=(await db.query('select place_guest_order($1,$2,$3,$4,$5) as r',[crypto.randomUUID(),branch,JSON.stringify(dozen),JSON.stringify({...customer,fulfillment:'delivery',address:'Test delivery address'}),54])).rows[0].r;
assert.equal(delivered.total,54);
await db.exec('reset role');
// Cancelling restores all donuts, including the free ones.
const owner='00000000-0000-0000-0000-000000000001';
await db.query('insert into auth.users values ($1)',[owner]);
await db.query("insert into staff_profiles values ($1,'Owner','owner',true)",[owner]);
const id=(await db.query('select id from orders where order_number=$1',[delivered.order_number])).rows[0].id;
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
await db.exec('set role authenticated');
await db.query("select set_order_status($1,'cancelled')",[id]);
await db.exec('reset role');
assert.equal((await db.query('select quantity from branch_inventory where branch_id=$1 and variant_id=$2',[branch,variant])).rows[0].quantity,94);
await db.query('update branch_inventory set quantity=5 where branch_id=$1 and variant_id=$2',[branch,variant]);
await db.exec('set role anon');
await assert.rejects(db.query('select get_guest_order_quote($1,$2)',[branch,JSON.stringify(items)]));
// New bundle math: all prices eligible, lowest-priced units free, repeat complete bundles.
await db.exec('reset role');
for (const [code,buy,free] of [['buy6get2',6,2],['buy7get3',7,3],['buy8get4',8,4],['buy6get6',6,6]]) {
  const size=buy+free;
  const priced=await calculate([line('expensive',10,buy*2),line('cheap',6,free*2),line('drink',25,4,'cold')],false,[code]);
  assert.equal(priced.offer_code,code); assert.equal(priced.discount,6*free*2);
  assert.equal(priced.lines.find(x=>x.variant_id==='cheap').free_quantity,free*2);
  assert.equal(priced.lines.find(x=>x.variant_id==='drink').free_quantity,0);
  assert.equal((await calculate([line('a',10,size-1)],false,[code])).discount,0);
  assert.equal((await calculate([line('a',10,size+1)],false,[code])).discount,10*free);
  assert.equal((await calculate([line('a',10,size*2)],false,[])).discount,0);
}
q=await calculate([line('a',10,12)],true,['daily','tuesday','buy6get2','buy7get3','buy8get4','buy6get6']);
assert.equal(q.offer_code,'buy6get6'); assert.equal(q.discount,60); assert.equal(q.total,60);
assert.equal((await calculate([line('a',10,12)],true,['morning'])).discount,0);
// Every existing branch gets all seven settings, with only the old offers enabled.
assert.equal(Number((await db.query('select count(*) from branch_offers where branch_id=$1',[branch])).rows[0].count),7);
assert.equal(Number((await db.query("select count(*) from branch_offers where code like 'buy%' and enabled")).rows[0].count),0);
const manager='00000000-0000-0000-0000-000000000002',staff='00000000-0000-0000-0000-000000000003';
for (const [uid,role] of [[manager,'manager'],[staff,'order_staff']]) {
 await db.query('insert into auth.users values ($1)',[uid]);
 await db.query('insert into staff_profiles values ($1,$2,$2,true)',[uid,role]);
 await db.query('insert into staff_branches values ($1,$2)',[uid,branch]);
}
const other=(await db.query('select id from branches where id<>$1 limit 1',[branch])).rows[0].id;
async function asUser(uid,role='authenticated') { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]); await db.exec('set role '+role); }
const toggle=(b,code,enabled,previous)=>db.query('select set_branch_offer($1,$2,$3,$4)',[b,code,enabled,previous]);
await asUser('', 'anon'); await assert.rejects(toggle(branch,'buy6get6',true,false));
await asUser(staff); await assert.rejects(toggle(branch,'buy6get6',true,false));
await asUser(manager);
await assert.rejects(toggle(other,'buy6get6',true,false));
await toggle(branch,'daily',false,true);
await toggle(branch,'daily',true,false);
await assert.rejects(toggle(other,'daily',false,true));
await toggle(branch,'tuesday',false,true);
await toggle(branch,'tuesday',true,false);
await assert.rejects(toggle(other,'tuesday',false,true));
await toggle(branch,'morning',false,true);
await toggle(branch,'morning',true,false);
await assert.rejects(toggle(other,'morning',false,true));
await assert.rejects(db.query("update branch_offers set enabled=true where branch_id=$1",[branch]));
await toggle(branch,'buy6get6',true,false);
await toggle(branch,'buy6get6',true,false); // retry creates no duplicate event
assert.equal(Number((await db.query('select count(*) from offer_events')).rows[0].count),7);
await asUser(owner); for (const code of ['daily','tuesday','morning']) await toggle(branch,code,false,true);
await toggle(other,'buy8get4',true,false); // owner may manage every branch
await db.exec('reset role'); await db.query('update branch_inventory set quantity=100 where branch_id=$1 and variant_id=$2',[branch,variant]);
await asUser('', 'anon');
const activeQuote=(await db.query('select get_guest_order_quote($1,$2) as q',[branch,JSON.stringify(dozen)])).rows[0].q;
assert.equal(activeQuote.offer_code,'buy6get6'); assert.equal(activeQuote.total,42);
assert.deepEqual(activeQuote.enabled_offers,['buy6get6']);
// Owner disables after a shopper sees a quote: old price must not be accepted.
await asUser(owner); await toggle(branch,'buy6get6',false,true);
await asUser('', 'anon');
q=(await db.query('select get_guest_order_quote($1,$2) as q',[branch,JSON.stringify(dozen)])).rows[0].q;
assert.equal(q.discount,0); assert.equal(q.total,84);
await assert.rejects(db.query('select place_guest_order($1,$2,$3,$4,$5)',[crypto.randomUUID(),branch,JSON.stringify(dozen),JSON.stringify({...customer,phone:'0591112222'}),42]),/PRICE_CHANGED/);
await asUser(owner); await toggle(branch,'buy6get6',true,false);
await asUser('', 'anon');
const newReceipt=(await db.query('select place_guest_order($1,$2,$3,$4,$5) as r',[crypto.randomUUID(),branch,JSON.stringify(dozen),JSON.stringify({...customer,phone:'0591112222'}),42])).rows[0].r;
assert.equal(newReceipt.total,42);
await db.exec('reset role');
const newOrder=(await db.query('select id,discount,offer_code from orders where order_number=$1',[newReceipt.order_number])).rows[0];
assert.equal(newOrder.offer_code,'buy6get6'); assert.equal(Number(newOrder.discount),42);
assert.equal((await db.query('select free_quantity from order_items where order_id=$1',[newOrder.id])).rows[0].free_quantity,6);
await asUser(owner); await db.query("select set_order_status($1,'cancelled')",[newOrder.id]);
await db.exec('reset role');
assert.equal((await db.query('select quantity from branch_inventory where branch_id=$1 and variant_id=$2',[branch,variant])).rows[0].quantity,100);
await db.query('update staff_profiles set active=false where user_id=$1',[manager]);
await asUser(manager); await assert.rejects(toggle(branch,'buy6get2',true,false));
console.log('PASS: four new bundles, repetition, least-price freebies, best-only pricing, branch defaults, owner/manager permissions, audit, disabled offers, immediate quote changes, stale-checkout rejection and new-offer cancellation.');

console.log('PASS: daily eligibility, Tuesday highest-seven pricing, best offer, no stacking, bundles, drinks exclusion, server price overrides, tampering, retry idempotency, stock, delivery fee, cancellation and private calculator.');

// Reproduce automatically enabled legacy offers, then apply the corrective migration.
await db.exec('reset role');
const automaticBefore = Number((await db.query(`select count(*) from branch_offers b where enabled and not exists (select 1 from offer_events e where e.branch_id=b.branch_id and e.code=b.code)`)).rows[0].count);
assert.ok(automaticBefore > 0);
const explicitBefore = (await db.query(`select b.branch_id,b.code,b.enabled from branch_offers b where exists (select 1 from offer_events e where e.branch_id=b.branch_id and e.code=b.code) order by b.branch_id,b.code`)).rows;
const correction = readFileSync(new URL('../migrations/202609190003_remove_automatic_offers.sql',import.meta.url),'utf8');
await db.exec(correction);
assert.equal(Number((await db.query(`select count(*) from branch_offers b where enabled and not exists (select 1 from offer_events e where e.branch_id=b.branch_id and e.code=b.code)`)).rows[0].count),0);
assert.deepEqual((await db.query(`select b.branch_id,b.code,b.enabled from branch_offers b where exists (select 1 from offer_events e where e.branch_id=b.branch_id and e.code=b.code) order by b.branch_id,b.code`)).rows, explicitBefore);
await asUser(owner);
for (const setting of (await db.query('select branch_id,code from branch_offers where enabled')).rows) await toggle(setting.branch_id,setting.code,false,true);
await asUser('', 'anon');
assert.equal((await db.query('select code from branch_offers where enabled')).rows.length,0);
await asUser(owner);
for (const code of ['daily','tuesday','morning']) {
 await toggle(other,code,true,false);
 await asUser('', 'anon');
 assert.deepEqual((await db.query('select code from branch_offers where enabled')).rows.map(row=>row.code),[code]);
 await asUser(owner);
 await toggle(other,code,false,true);
}
await db.exec('reset role');
await db.exec(correction);
assert.equal((await db.query('select code from branch_offers where enabled')).rows.length,0);
console.log('PASS: automatic legacy offers removed, explicit admin choices preserved, all-hidden public result empty, and each legacy offer can be explicitly enabled and hidden.');




// Explicit publication resets legacy defaults and preserves the newer campaigns.
await db.exec('reset role');
await db.query('update staff_profiles set active=true where user_id=$1',[manager]);
await asUser(owner);
await toggle(other,'daily',true,false);
await toggle(other,'buy6get2',true,false);
await db.exec('reset role');
await db.exec(readFileSync(new URL('../migrations/202609190004_explicit_offer_activation.sql',import.meta.url),'utf8'));
assert.equal((await db.query("select code from branch_offers where code in ('daily','tuesday','morning') and (enabled or admin_activated)")).rows.length,0);
assert.equal((await db.query("select enabled from branch_offers where branch_id=$1 and code='buy6get2'",[other])).rows[0].enabled,true);
await asUser(manager);
for (const code of ['daily','tuesday','morning']) {
 await toggle(branch,code,true,false);
 assert.deepEqual((await db.query('select enabled,admin_activated from branch_offers where branch_id=$1 and code=$2',[branch,code])).rows[0],{enabled:true,admin_activated:true});
 await assert.rejects(toggle(other,code,true,false));
 await toggle(branch,code,false,true);
 assert.deepEqual((await db.query('select enabled,admin_activated from branch_offers where branch_id=$1 and code=$2',[branch,code])).rows[0],{enabled:false,admin_activated:false});
}
await asUser('', 'anon');
assert.equal((await db.query("select code from branch_offers where code in ('daily','tuesday','morning') and enabled")).rows.length,0);
console.log('PASS: legacy publication requires explicit admin activation, all three toggle on/off, newer campaigns preserved, cross-branch changes denied.');
await db.close();
