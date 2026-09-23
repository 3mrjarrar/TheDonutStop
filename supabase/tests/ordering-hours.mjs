import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    grant usage on schema auth to anon, authenticated;`);
  const directory = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(file, directory), 'utf8'));
    if (file === '202609170001_catalog.sql') await db.exec(readFileSync(new URL('../seed.sql', import.meta.url), 'utf8'));
  }
  const openAt = async (code, local) => (await db.query("select public.branch_is_open_at($1, $2::timestamp at time zone 'Asia/Hebron') as open", [code, local])).rows[0].open;
  assert.equal(await openAt('TERI', '2026-09-17 07:29:59'), false);
  assert.equal(await openAt('TERI', '2026-09-17 07:30:00'), true);
  assert.equal(await openAt('TERI', '2026-09-18 08:59:59'), false);
  assert.equal(await openAt('TERI', '2026-09-18 09:00:00'), true);
  assert.equal(await openAt('TERI', '2026-09-18 23:59:59'), true);
  assert.equal(await openAt('TERI', '2026-09-19 00:00:00'), false);
  assert.equal(await openAt('UNKNOWN', '2026-09-18 12:00:00'), false);
  for (const code of ['NAB', 'ICON', 'TERI']) {
    assert.equal(await openAt(code, '2026-09-22 18:31:00'), true, `${code} accepts orders at 6:31 PM`);
  }
  assert.equal(await openAt('NAB', '2026-09-22 10:59:59'), false);
  assert.equal(await openAt('NAB', '2026-09-22 11:00:00'), true);
  assert.equal(await openAt('NAB', '2026-09-25 00:59:59'), true);
  assert.equal(await openAt('NAB', '2026-09-25 01:00:00'), false);
  assert.equal(await openAt('NAB', '2026-09-23 00:00:00'), false);
  assert.equal(await openAt('ICON', '2026-09-22 22:59:59'), true);
  assert.equal(await openAt('ICON', '2026-09-22 23:00:00'), false);
  assert.equal(await openAt('ICON', '2026-09-24 23:59:59'), true);
  assert.equal(await openAt('ICON', '2026-09-25 00:00:00'), false);
  for (const date of ['2026-07-12', '2026-12-13']) {
    await db.exec("set time zone 'America/New_York'");
    assert.equal(await openAt('TERI', `${date} 07:30:00`), true);
    await db.exec("set time zone 'Asia/Tokyo'");
    assert.equal(await openAt('TERI', `${date} 07:29:59`), false);
  }
  const branch = (await db.query("select id from branches where code='TERI'")).rows[0].id;
  const product = (await db.query("select v.id from product_variants v join products p on p.id=v.product_id where p.category='donuts' and p.slug='donuts-original-glaze' limit 1")).rows[0].id;
  await db.query('update branch_inventory set quantity=10, manual_unavailable=false, carried=true where branch_id=$1 and variant_id=$2', [branch, product]);
  const items = [{ variant_id: product, quantity: 1 }];
  const customer = { name: 'Hours Test', phone: '0599998765', fulfillment: 'pickup', payment_method: 'cash', notes: '', address: '' };
  // Modify only this isolated test database's schedule to test the real current clock.
  await db.exec("delete from branch_ordering_hours where branch_code='TERI'");
  const key = crypto.randomUUID();
  await db.exec('set role anon');
  const status = async () => (await db.query('select get_branch_ordering_status($1) as status', [branch])).rows[0].status;
  assert.equal((await status()).open, false);
  await assert.rejects(db.query('select * from branch_ordering_hours'));
  const quote = (await db.query('select get_guest_order_quote($1,$2) as q', [branch, JSON.stringify(items)])).rows[0].q;
  const place = async requestId => (await db.query('select place_guest_order($1,$2,$3,$4,$5) as receipt', [requestId, branch, JSON.stringify(items), JSON.stringify(customer), quote.total])).rows[0].receipt;
  await assert.rejects(place(key), /BRANCH_CLOSED/);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n, 0);
  assert.equal((await db.query('select quantity from branch_inventory where branch_id=$1 and variant_id=$2', [branch, product])).rows[0].quantity, 10);
  await db.exec("insert into branch_ordering_hours select 'TERI', day, 0, 1440 from generate_series(0,6) day");
  await db.exec('set role anon');
  assert.equal((await status()).open, true);
  const receipt = await place(key);
  assert.ok(receipt.order_number);
  await db.exec("reset role; update branches set orders_paused=true, orders_pause_reason='Maintenance' where code='TERI'; set role anon");
  await assert.rejects(place(crypto.randomUUID()), /ORDERS_PAUSED/);
  assert.deepEqual(await place(key), receipt, 'accepted retries survive a hold during open hours');
  await db.exec("reset role; delete from branch_ordering_hours where branch_code='TERI'; set role anon");
  assert.equal((await status()).open, false);
  await assert.rejects(place(crypto.randomUUID()), /ORDERS_PAUSED|BRANCH_CLOSED/);
  assert.deepEqual(await place(key), receipt, 'accepted retries survive both restrictions');
  await db.exec("reset role; update branches set orders_paused=false, orders_pause_reason='' where code='TERI'; set role anon");
  assert.deepEqual(await place(key), receipt, 'accepted order retries still succeed after closing');
  await assert.rejects(place(crypto.randomUUID()), /BRANCH_CLOSED/, 'resuming orders must not bypass opening hours');
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n, 1);
  assert.equal((await db.query('select quantity from branch_inventory where branch_id=$1 and variant_id=$2', [branch, product])).rows[0].quantity, 9);
  console.log('Ordering hours: boundaries, time zones, anonymous checkout, stock rollback, and after-close retries passed.');
} finally { await db.close(); }
