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
  if (file === '202609230001_dynamic_offers.sql') {
    // Reproduce the production failure plus partially installed columns.
    await db.exec('alter table shared_offers drop constraint shared_offers_code_check; alter table branch_offers drop constraint branch_offers_code_check; alter table shared_offers add column image_url text;');
  }
  await db.exec(readFileSync(new URL(file, directory), 'utf8'));
  if (file === '202609170001_catalog.sql') await db.exec(readFileSync(new URL('../seed.sql', import.meta.url), 'utf8'));
}
const owner=crypto.randomUUID(), staff=crypto.randomUUID(), manager=crypto.randomUUID();
const branch=(await db.query('select id from branches order by sort_order limit 1')).rows[0].id;
for (const [id,role] of [[owner,'owner'],[staff,'order_staff'],[manager,'manager']]) {
  await db.query('insert into auth.users values ($1)',[id]);
  await db.query('insert into staff_profiles values ($1,$2,$2,true)',[id,role]);
  await db.query('insert into staff_branches values ($1,$2)',[id,branch]);
}
async function asUser(id,role='authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await db.exec(`set role ${role}`);
}
const definition={buy_quantity:6,free_quantity:2,weekdays:[1,2,3,4,5,6,7],start_time:'',end_time:'',starts_on:'',ends_on:'',image_url:''};
const save=async (value=definition,code=null,stamp=null)=>(await db.query('select save_shared_offer($1,$2,$3) as code',[code,JSON.stringify(value),stamp])).rows[0].code;
await asUser('', 'anon'); await assert.rejects(save());
await asUser(staff); await assert.rejects(save());
await asUser(manager);
await assert.rejects(db.query("insert into shared_offers(code) values('tampered')"));
for (const invalid of [{buy_quantity:0},{free_quantity:-1},{free_quantity:94},{weekdays:[]},{weekdays:[8]},{weekdays:[null]},{start_time:'09:00'}, {start_time:'09:00',end_time:'09:00'}, {starts_on:'2026-10-01',ends_on:'2026-09-01'}, {image_url:'javascript:alert(1)'}]) await assert.rejects(save({...definition,...invalid}));
const code=await save();
let row=(await db.query('select * from shared_offers where code=$1',[code])).rows[0];
assert.equal(row.enabled,false); assert.equal(row.image_url,null); assert.equal(row.custom,true);
assert.equal((await db.query('select count(*)::int as n from branch_offers where code=$1',[code])).rows[0].n,3);
await db.query('select set_shared_offer($1,true,false)',[code]);
row=(await db.query('select *, updated_at::text as stamp from shared_offers where code=$1',[code])).rows[0];
await assert.rejects(save(definition,code,'2000-01-01'),/Offer changed/);
await save({...definition,image_url:'https://example.com/offer.png'},code,row.stamp);
assert.equal((await db.query('select image_url from shared_offers where code=$1',[code])).rows[0].image_url,'https://example.com/offer.png');
await db.exec('reset role');
const schedule=async (days,start,end,from,until,at)=>(await db.query('select offer_schedule_active($1,$2,$3,$4,$5,$6) as active',[days,start,end,from,until,at])).rows[0].active;
assert.equal(await schedule([1],'09:00','11:00',null,null,'2026-09-21 09:00+03'),true);
assert.equal(await schedule([1],'09:00','11:00',null,null,'2026-09-21 11:00+03'),false);
assert.equal(await schedule([2],'09:00','11:00',null,null,'2026-09-21 10:00+03'),false);
assert.equal(await schedule([1],'22:00','02:00','2026-09-21','2026-09-21','2026-09-22 01:59+03'),true);
assert.equal(await schedule([1],'22:00','02:00',null,null,'2026-09-22 02:00+03'),false);
assert.equal(await schedule([1],null,null,'2026-09-22',null,'2026-09-21 10:00+03'),false);
assert.equal(await schedule([1],null,null,null,'2026-09-20','2026-09-21 10:00+03'),false);
assert.equal(await schedule([1],'09:00','11:00',null,null,'2026-12-21 09:00+02'),true);
const variant=(await db.query("select v.id from product_variants v join products p on p.id=v.product_id where p.slug='donuts-original-glaze'")).rows[0].id;
await db.query('update branch_inventory set quantity=99,price_override=6 where branch_id=$1 and variant_id=$2',[branch,variant]);
const items=[{variant_id:variant,quantity:8}];
await asUser('', 'anon');
const quote=async ()=>(await db.query('select get_guest_order_quote($1,$2) as q',[branch,JSON.stringify(items)])).rows[0].q;
let q=await quote();
assert.equal(q.discount,12); assert.equal(q.total,36); assert.equal(q.offer_code,code);
assert.equal(q.offer_rules.find(rule=>rule.code===code).free,2);
await asUser(owner);
row=(await db.query('select updated_at::text as stamp from shared_offers where code=$1',[code])).rows[0];
await save({...definition,starts_on:'2099-01-01'},code,row.stamp);
await asUser('', 'anon');
q=await quote();assert.equal(q.discount,0);assert.equal(q.enabled_offers.includes(code),false);
// Checkout revalidates schedules instead of trusting a previously discounted total.
await db.exec('reset role');
// This suite isolates offers from opening-hour controls, which have separate tests.
await db.exec("create or replace function public.is_branch_accepting_orders(p_branch uuid) returns boolean language sql stable as $$select true$$");
const customer={name:'Dynamic offer',phone:'0591234567',fulfillment:'pickup',address:'',notes:'',payment_method:'cash'};
await asUser('', 'anon');
await assert.rejects(db.query('select place_guest_order($1,$2,$3,$4,$5)',[crypto.randomUUID(),branch,JSON.stringify(items),JSON.stringify(customer),36]),/PRICE_CHANGED/);
await asUser(owner);
await db.query('select set_shared_offer($1,false,true)',[code]);
assert.equal((await db.query('select count(*)::int as n from branch_offers where code=$1 and enabled',[code])).rows[0].n,0);
// Delete is restricted, concurrency-safe, audited, shared across branches and retry-safe.
await asUser('', 'anon'); await assert.rejects(db.query('select delete_shared_offer($1,$2)',[code,row.updated_at]));
await asUser(staff); await assert.rejects(db.query('select delete_shared_offer($1,$2)',[code,row.updated_at]));
await asUser(manager);
row=(await db.query('select updated_at::text as stamp from shared_offers where code=$1',[code])).rows[0];
await assert.rejects(db.query('select delete_shared_offer($1,$2)',[code,'2000-01-01']),/Offer changed/);
const auditBeforeDelete=Number((await db.query('select count(*) from offer_events where code=$1',[code])).rows[0].count);
const branchRowsBeforeDelete=Number((await db.query('select count(*) from branch_offers where code=$1',[code])).rows[0].count);
await db.query('select delete_shared_offer($1,$2)',[code,row.stamp]);
await db.query('select delete_shared_offer($1,$2)',[code,row.stamp]);
assert.equal((await db.query('select count(*)::int as n from shared_offers where code=$1',[code])).rows[0].n,0);
assert.equal((await db.query('select count(*)::int as n from branch_offers where code=$1',[code])).rows[0].n,0);
assert.ok(Number((await db.query('select count(*) from offer_events where code=$1',[code])).rows[0].count)>auditBeforeDelete);
// Built-in offers can also be removed, and an empty offer list is a valid setup.
await asUser(owner);
const builtIn=(await db.query("select updated_at::text as stamp from shared_offers where code='daily'")).rows[0];
const builtInRows=Number((await db.query("select count(*) from branch_offers where code='daily'")).rows[0].count);
await db.query('select delete_shared_offer($1,$2)',['daily',builtIn.stamp]);
assert.equal((await db.query('select count(*)::int as n from branch_offers')).rows[0].n,21-builtInRows);
await asUser(manager);
for (const setting of (await db.query('select code,updated_at::text as stamp from shared_offers')).rows) await db.query('select delete_shared_offer($1,$2)',[setting.code,setting.stamp]);
assert.equal((await db.query('select count(*) from shared_offers')).rows[0].count,0);
await db.exec('reset role');
// Reapplying storage setup repairs partial setup without removing stored objects.
await db.exec('reset role');
await db.exec(readFileSync(new URL('../migrations/202609230002_offer_image_uploads.sql',import.meta.url),'utf8'));
// Storage policies apply the same owner/manager permission boundary as offer editing.
const upload=()=>db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['offer-images',crypto.randomUUID()+'.png']);
await asUser('', 'anon'); await assert.rejects(upload());
await asUser(staff); await assert.rejects(upload());
await asUser(manager); await upload();
await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('offer-images','unsafe.svg')"));
await asUser(owner); await upload();
assert.equal((await db.query("update storage.objects set name='overwritten.png' returning id")).rows.length,0);
await asUser('', 'anon'); assert.equal((await db.query("select * from storage.objects where bucket_id='offer-images'")).rows.length,2);
await db.exec('reset role');
const bucket=(await db.query("select * from storage.buckets where id='offer-images'")).rows[0];
assert.equal(Number(bucket.file_size_limit),5242880);
assert.deepEqual(bucket.allowed_mime_types,['image/jpeg','image/png','image/webp','image/gif']);
await db.query('update staff_profiles set active=false where user_id=$1',[manager]);
await asUser(manager); await assert.rejects(upload());
await db.exec('reset role');
await db.exec(readFileSync(new URL('../migrations/202609230002_offer_image_uploads.sql',import.meta.url),'utf8'));
assert.equal((await db.query("select count(*)::int as n from storage.objects where bucket_id='offer-images'")).rows[0].n,2);
await db.exec("update shared_offers set weekdays=array[1,3],start_time='12:00',end_time='15:00' where code='tuesday'; update shared_offers set start_time=null,end_time=null where code='morning';");
const beforeRerun=(await db.query('select * from shared_offers order by code')).rows;
const branchesBefore=(await db.query('select * from branch_offers order by branch_id,code')).rows;
const rerunnable=readFileSync(new URL('../migrations/202609230001_dynamic_offers.sql',import.meta.url),'utf8');
await db.exec(rerunnable);
await db.exec(rerunnable);
assert.deepEqual((await db.query('select * from shared_offers order by code')).rows,beforeRerun);
assert.deepEqual((await db.query('select * from branch_offers order by branch_id,code')).rows,branchesBefore);
console.log('PASS: missing old constraints, partial columns and repeated dynamic migrations preserve all offer data and schedules.');
console.log('PASS: offer image storage permissions, immutable paths, public reads and bucket limits.');
console.log('PASS: shared offer deletion, role restrictions, stale edit protection, audit history and idempotent retries.');
console.log('PASS: dynamic offer creation/editing, permissions, optional images, constraints, schedule boundaries/overnight/DST, branch synchronization, quotes and stale checkout.');
await db.close();
