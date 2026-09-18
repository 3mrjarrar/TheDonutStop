# Supabase foundation

## Remove automatically enabled offers

After migrations `202609190001_managed_offers.sql` and
`202609190002_manage_all_offers.sql`, run
`migrations/202609190003_remove_automatic_offers.sql` in the SQL Editor.
The original migration enabled the three old offers in every existing branch.
This correction disables offers that have no recorded admin action, while
preserving explicit admin choices and order history. New branches already start
with all offers disabled. Managers can then enable any of the seven offers for
their assigned branches. The homepage shows an offer only while it is enabled
in at least one active branch, and lists those branches below it.

This is the catalog/inventory foundation, not a completed ordering system.
The menu reads branch inventory from Supabase after branch selection. Selection is saved on the device, and branch-image links can select a branch. Availability refreshes every 30 seconds and on window focus. Cart, guest cash checkout, and branch order handling are implemented; apply migration 004 using ORDERS_SETUP.md.

## Apply in the Supabase SQL Editor

1. Run `migrations/202609170001_catalog.sql` once on the new empty project.
2. Run `seed.sql` to import the existing menu and three branches.
3. Check Table Editor: branches should contain NAB, ICON, TERI. All inventory starts at zero; no fictional stock is published.

The migration is transactional. Do not rerun it after success. The seed is safe to
rerun: it does not overwrite prices or stock already entered. Regenerate the seed
with `node scripts/generate-catalog-seed.mjs` when preparing a fresh environment.

## Website configuration

Copy `.env.example` to `.env.local` and set the URL and publishable key.
The local project is already configured. Set the same two VITE variables in the
website host when deploying. Never put a secret/service-role key in a VITE variable.
`src/lib/supabase.js` exposes the client, branch query, and branch menu query.

## Security and remaining work

All seven tables have row-level security. Anonymous and signed-in clients can
only read the active catalog and carried branch inventory. Staff can read their
own profile and branch assignments. Clients have no write grants. Inventory
events are private and cannot yet be accessed through the dashboard.

Next migrations must add audited inventory functions, owner-managed invitations,
branch-scoped order access, transactional guest checkout, cancellation, and order
status transitions. Test concurrent purchases, duplicate checkout/cancellation,
and cross-branch access against a test database before accepting live orders.
Disable public staff sign-up before launching admin authentication; create the
first owner through a trusted administrative setup, never from browser inputs.

The user reported applying the SQL successfully. Read-only verification returned all three branches and 96 inventory variants for Nablus, all at zero stock. Only the publishable key is available locally; it cannot execute schema migrations.

## Explicit activation for the original three offers

Run `migrations/202609190004_explicit_offer_activation.sql` once before deploying
this frontend. It starts daily, Tuesday and morning offers hidden at every branch,
even if they were previously enabled, and adds explicit activation metadata.
The four newer campaign settings and existing orders are preserved.
An owner or assigned manager can then add any original offer back with its normal
admin switch. Hiding it removes its card entirely and stops its discount for new
orders. Until this migration is applied, the frontend hides the original cards
and reports the missing database update when attempting to activate them.
The SQL update is also necessary to stop any old server-side discounts.

## Shared offers across branches

After migration 004, run `migrations/202609190005_shared_offers.sql` before deploying
this frontend. It creates one shared switch per offer and applies it to every
branch. Existing offers explicitly enabled in any active branch remain enabled
and become shared. Offers hidden everywhere stay hidden. Morning coffee is always
excluded from branch code TERI (Terah). Managers with an active branch assignment
and owners can change shared settings; order staff cannot. New branches inherit
the shared settings, and existing checkout pricing still reads synchronized
branch offer rows. Apply this migration once.
