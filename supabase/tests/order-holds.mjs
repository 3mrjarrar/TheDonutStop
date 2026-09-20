import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  const directory = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
    if (file === '202609190011_order_holds.sql') {
      // Match the existing live schema: this flag predates our feature.
      await db.exec("alter table branches add column orders_paused boolean not null default false; update branches set orders_paused=true where code='ICON'");
    }
    await db.exec(readFileSync(new URL(file, directory), 'utf8'));
    if (file === '202609170001_catalog.sql') await db.exec(readFileSync(new URL('../seed.sql', import.meta.url), 'utf8'));
  }
  const preserved = (await db.query("select orders_paused, orders_pause_reason, orders_pause_version from branches where code='ICON'")).rows[0];
  assert.equal(preserved.orders_paused, true, 'migration must preserve existing pauses');
  assert.ok(preserved.orders_pause_reason.length > 2, 'legacy pauses get an explanation');
  await db.exec(readFileSync(new URL('202609190011_order_holds.sql', directory), 'utf8'));
  assert.deepEqual((await db.query("select orders_paused, orders_pause_reason, orders_pause_version from branches where code='ICON'")).rows[0], preserved, 'migration is safely repeatable');
  await db.exec("update branches set orders_paused=false, orders_pause_reason='' where code='ICON'");
  // This suite isolates manual holds even if the independent hours feature is later merged.
  if ((await db.query("select to_regclass('public.branch_ordering_hours') as hours")).rows[0].hours) {
    await db.exec("insert into branch_ordering_hours select code, day, 0, 1440 from branches cross join generate_series(0,6) day on conflict (branch_code,day_of_week) do update set opens=0, closes=1440");
  }
  const owner = '00000000-0000-0000-0000-000000000001';
  const manager = '00000000-0000-0000-0000-000000000002';
  const staff = '00000000-0000-0000-0000-000000000003';
  const inactive = '00000000-0000-0000-0000-000000000004';
  await db.query('insert into auth.users values ($1),($2),($3),($4)', [owner, manager, staff, inactive]);
  await db.query("insert into staff_profiles values ($1,'Owner','owner',true),($2,'Manager','manager',true),($3,'Staff','order_staff',true),($4,'Inactive','owner',false)", [owner, manager, staff, inactive]);
  const branches = (await db.query('select id from branches order by sort_order')).rows;
  const branch = branches[0].id, other = branches[1].id;
  await db.query('insert into staff_branches values ($1,$3),($2,$3)', [manager, staff, branch]);
  const product = (await db.query("select v.id from product_variants v join products p on p.id=v.product_id where p.slug='donuts-original-glaze' limit 1")).rows[0].id;
  await db.query('update branch_inventory set quantity=20, carried=true, manual_unavailable=false where variant_id=$1', [product]);
  async function asUser(id = '', role = 'anon') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('set role ' + role);
  }
  const status = async (id = branch) => (await db.query('select get_branch_order_hold($1) as state', [id])).rows[0].state;
  const setHold = async (id, paused, reason, version) => (await db.query('select set_branch_order_hold($1,$2,$3,$4) as state', [id, paused, reason, version])).rows[0].state;
  const items = [{ variant_id: product, quantity: 1 }];
  const person = { name: 'Hold Test', phone: '0599998765', fulfillment: 'pickup', payment_method: 'cash', address: '', notes: '' };
  const quote = async id => (await db.query('select get_guest_order_quote($1,$2) as q', [id, JSON.stringify(items)])).rows[0].q;
  const place = async (id, key, total) => (await db.query('select place_guest_order($1,$2,$3,$4,$5) as receipt', [key, id, JSON.stringify(items), JSON.stringify(person), total])).rows[0].receipt;
  await asUser();
  assert.deepEqual(await status(), { paused: false, reason: '', version: 0 });
  await assert.rejects(setHold(branch, true, 'Busy', 0), /permission denied/);
  await assert.rejects(db.query('select * from order_hold_events'), /permission denied/);
  const total = (await quote(branch)).total;
  const key = crypto.randomUUID();
  const accepted = await place(branch, key, total);
  for (const id of [staff, inactive]) {
    await asUser(id, 'authenticated');
    await assert.rejects(setHold(branch, true, 'Busy', 0), /Not authorized/);
  }
  await asUser(manager, 'authenticated');
  await assert.rejects(setHold(other, true, 'Busy', 0), /Not authorized/);
  for (const reason of ['', ' ', 'x', 'x'.repeat(501), null]) await assert.rejects(setHold(branch, true, reason, 0), /HOLD_REASON_REQUIRED/);
  assert.deepEqual(await setHold(branch, true, '  Catching up on orders  ', 0), { paused: true, reason: 'Catching up on orders', version: 1 });
  await assert.rejects(setHold(branch, false, '', 0), /HOLD_CHANGED/);
  await asUser();
  assert.equal((await status()).reason, 'Catching up on orders');
  assert.equal((await status(other)).paused, false);
  await assert.rejects(place(branch, crypto.randomUUID(), total), /ORDERS_PAUSED/);
  assert.deepEqual(await place(branch, key, total), accepted, 'accepted-order retries survive a pause');
  assert.ok((await place(other, crypto.randomUUID(), (await quote(other)).total)).order_number);
  await db.exec('reset role');
  assert.equal((await db.query('select quantity from branch_inventory where branch_id=$1 and variant_id=$2', [branch, product])).rows[0].quantity, 19);
  const order = (await db.query('select id from orders where request_id=$1', [key])).rows[0].id;
  await asUser(staff, 'authenticated');
  await db.query("select set_order_status($1,'preparing')", [order]);
  assert.equal((await db.query('select status from orders where id=$1', [order])).rows[0].status, 'preparing');
  await asUser(owner, 'authenticated');
  assert.deepEqual(await setHold(branch, false, '', 1), { paused: false, reason: '', version: 2 });
  await setHold(other, true, 'Equipment maintenance', 0);
  assert.equal((await db.query('select count(*)::int as n from order_hold_events')).rows[0].n, 3);
  await asUser(manager, 'authenticated');
  assert.equal((await db.query('select count(*)::int as n from order_hold_events')).rows[0].n, 2, 'manager audit access is branch-scoped');
  await asUser();
  assert.ok((await place(branch, crypto.randomUUID(), total)).order_number);
  await assert.rejects(db.query("update branches set orders_paused=false where id=$1", [other]), /permission denied/);
  console.log('Order holds passed: permissions, reasons, branch isolation, pause/resume, stale updates, stock, existing orders, safe retries, and audit access.');
} finally { await db.close(); }
