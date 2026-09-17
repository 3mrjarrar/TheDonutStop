# Supabase foundation

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
