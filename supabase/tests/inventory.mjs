// Run: PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node supabase/tests/inventory.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
for (const file of ['migrations/202609170001_catalog.sql','seed.sql','migrations/202609170002_admin_inventory.sql','migrations/202609170003_drink_availability.sql']) await db.exec(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
const ids = ['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'];
for (let i=0;i<3;i++) { await db.query('insert into auth.users values ($1)',[ids[i]]); await db.query('insert into public.staff_profiles values ($1,$2,$3,true)',[ids[i],'Test '+i,['owner','manager','order_staff'][i]]); }
const branches = (await db.query('select id from branches order by sort_order')).rows;
const branch = branches[0].id, other = branches[1].id;
const variant = (await db.query("select v.id from product_variants v join products p on p.id=v.product_id where p.category='donuts' limit 1")).rows[0].id;
await db.query('insert into staff_branches values ($1,$2)',[ids[1],branch]);
async function asUser(id,role='authenticated') { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]); await db.exec('set role '+role); }
let request = 0;
async function adjust(b,action,amount,expected,unavailable=false,key) { return db.query('select public.adjust_inventory($1,$2,$3,$4,$5,$6,$7,$8)',[b,variant,action,amount,'test adjustment',expected,unavailable,key || `10000000-0000-0000-0000-${String(++request).padStart(12,'0')}`]); }
await asUser('', 'anon'); await assert.rejects(adjust(branch,'restock',5,0));
await asUser(ids[2]); await assert.rejects(adjust(branch,'restock',5,0));
await asUser(ids[1]); await assert.rejects(adjust(other,'restock',5,0));
await assert.rejects(db.query('update branch_inventory set quantity=99 where branch_id=$1',[branch]));
await assert.rejects(db.query("update staff_profiles set role='owner' where user_id=$1",[ids[1]]));
const key='20000000-0000-0000-0000-000000000001';
await adjust(branch,'restock',20,0,false,key); await adjust(branch,'restock',20,0,false,key);
await assert.rejects(adjust(branch,'restock',30,0,false,key));
assert.equal((await db.query('select quantity from branch_inventory where branch_id=$1 and variant_id=$2',[branch,variant])).rows[0].quantity,20);
await assert.rejects(adjust(branch,'restock',3,0));
await assert.rejects(adjust(branch,'waste',21,20));
await adjust(branch,'waste',2,20); await adjust(branch,'unavailable',0,18); await adjust(branch,'restock',2,18,true);
await adjust(branch,'count',4,20); await adjust(branch,'unavailable',0,4); await adjust(branch,'available',0,4,true);
await asUser(ids[0]); await adjust(other,'restock',5,0);
assert.equal((await db.query('select * from inventory_events')).rows.length,8);
await asUser(ids[1]); assert.equal((await db.query('select * from inventory_events')).rows.length,7);
await db.exec('reset role'); await db.query('update staff_profiles set active=false where user_id=$1',[ids[1]]);
await asUser(ids[1]); await assert.rejects(adjust(branch,'restock',1,4));
assert.equal((await db.query('select * from inventory_events')).rows.length,0);
await asUser(ids[0]);
const drink = (await db.query("select v.id from product_variants v join products p on p.id=v.product_id where p.category='cold' limit 1")).rows[0].id;
for (const action of ['restock','waste','count']) await assert.rejects(db.query('select public.adjust_inventory($1,$2,$3,1,$4,0,false,$5)',[branch,drink,action,'drink check',crypto.randomUUID()]));
for (const [action, previous] of [['unavailable',false],['available',true]]) await db.query('select public.adjust_inventory($1,$2,$3,0,$4,0,$5,$6)',[branch,drink,action,'drink status',previous,crypto.randomUUID()]);
const drinkStock = (await db.query('select quantity,manual_unavailable from branch_inventory where branch_id=$1 and variant_id=$2',[branch,drink])).rows[0];
assert.equal(drinkStock.quantity,0); assert.equal(drinkStock.manual_unavailable,false);
await db.close();
console.log('PASS: anonymous/order-staff denial, branch isolation, direct-write denial, role escalation denial, idempotency, stale stock, waste bounds, stock actions, audit visibility, deactivation.');
