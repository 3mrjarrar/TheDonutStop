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
const owner = crypto.randomUUID(), manager = crypto.randomUUID(), staff = crypto.randomUUID();
for (const [id, role] of [[owner,'owner'],[manager,'manager'],[staff,'order_staff']]) {
  await db.query('insert into auth.users values ($1)', [id]);
  await db.query('insert into staff_profiles values ($1,$2,$2,true)', [id, role]);
}
const branches = (await db.query('select id from branches order by sort_order')).rows;
const branch = branches[0].id, other = branches[1].id;
await db.query('insert into staff_branches values ($1,$2)', [manager,branch]);
const variants = (await db.query("select v.id, v.price, p.category from product_variants v join products p on p.id=v.product_id where p.category in ('donuts','hot') order by p.category")).rows;
const donut = variants.find(v => v.category === 'donuts'), drink = variants.find(v => v.category === 'hot');
async function login(id, role = 'authenticated') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
  await db.exec(`set role ${role}`);
}
const save = (variant, price, expected, request = crypto.randomUUID(), selectedBranch = branch) => db.query('select set_branch_price($1,$2,$3,$4,$5,$6)', [selectedBranch,variant.id,price,expected,'تحديث الأسعار',request]);
await login(owner);
const request = crypto.randomUUID();
await save(donut, 8.25, donut.price, request);
await save(donut, 8.25, donut.price, request);
assert.equal((await db.query('select * from price_events')).rows.length,1);
await assert.rejects(save(donut,9,donut.price), e => e.code === '40001');
for (const value of [-1, 1.234, 'NaN', 'Infinity', 100000000]) await assert.rejects(save(donut,value,8.25), e => e.code === '22023');
await login(manager);
await save(drink, 17.5, drink.price);
await assert.rejects(save(drink,18,drink.price,crypto.randomUUID(),other), e => e.code === '42501');
await assert.rejects(db.query('update branch_inventory set price_override=1 where branch_id=$1',[branch]), e => e.code === '42501');
await login(staff);
await assert.rejects(save(donut,9,8.25), e => e.code === '42501');
await login(null,'anon');
await assert.rejects(save(donut,9,8.25), e => e.code === '42501');
await db.exec('reset role');
const rows = (await db.query('select branch_id,price_override from branch_inventory where variant_id=$1',[donut.id])).rows;
assert.equal(Number(rows.find(row => row.branch_id === branch).price_override),8.25);
assert.equal(rows.find(row => row.branch_id === other).price_override,null);
await db.query('update branch_inventory set quantity=10 where branch_id=$1 and variant_id=$2',[branch,donut.id]);
await login(null,'anon');
const quote = (await db.query('select get_guest_order_quote($1,$2) as q',[branch,JSON.stringify([{variant_id:donut.id,quantity:1}])])).rows[0].q;
assert.equal(Number(quote.total),8.25);
await db.close();
console.log('Price permissions, audit, retry, validation, stale edits, branch isolation and checkout quote passed.');
