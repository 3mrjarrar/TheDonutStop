# Supabase foundation

## Ordering hours compatibility

The live database exposes `branch_ordering_status(p_branch)` with `accepting`,
`reason`, `orders_paused`, and preparation-time rules. Checkout uses that server
decision every 15 seconds, on focus/reconnection, and before placing an order.
It does not use the customer's device time. If that RPC is absent, the frontend
supports the original `get_branch_ordering_status` server-clock RPC. Network
and permission errors do not bypass the check; the ten-second timeout remains.

For databases built from this repository's original ordering-hours migration,
apply `202609220001_complete_ordering_hours.sql` after `202609190010_ordering_hours.sql`.
It adds the missing Nablus and Icon Mall schedules, with Thursday-Saturday
weekend closing times and Nablus's overnight hours, preserving existing rows.
The live frontend compatibility fix requires no database migration; do not apply
this schema-specific migration to a differently managed live hours schema.

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

## Branch price editing

Apply `migrations/202609190006_branch_prices.sql` before deploying the price editor. In Admin → Inventory, owners and assigned branch managers can use **تعديل السعر** on donuts or individual drink sizes. Order staff cannot change prices. Each edit sets `branch_inventory.price_override` for the selected branch and variant; menus, quotes and checkout already use that value. Previously placed orders retain their recorded prices.

The `set_branch_price` RPC validates a nonnegative price with at most two decimal places, requires a reason, checks the expected current price under a row lock, and handles retries by request ID. Changes are recorded in `price_events`, readable only by staff allowed to manage that branch. Direct client writes remain forbidden. Icon Mall's drink controls remain hidden.

Run the isolated database checks with `PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node supabase/tests/prices.mjs` (or install PGlite in the test environment and omit the variable). These cover permissions, direct-write denial, audit/retries, invalid and stale prices, branch isolation, and the guest quote using the updated price.

## Mini donut exclusion

Apply `migrations/202609190007_exclude_mini_donuts.sql` before publishing the updated offer UI. Mini Donut Bites are paid items only: they neither count toward offer bundles nor receive free quantities, regardless of branch, price overrides, repeated bundles or other cart contents. The calculator checks product identity in the database instead of trusting client eligibility. All offer descriptions, including the in-store morning offer, disclose the exclusion. The cart also excludes minis from offer prompts and suggested additions.

Run `PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node supabase/tests/mini-donuts.mjs` to check every calculated offer, mixed/repeated bundles, changed mini prices, and actual quotes/orders in every branch.

### Homepage featured products
Apply `migrations/202609190009_homepage_featured.sql` after the catalog seed and preceding migrations. Owners and managers assigned to an active branch can select four distinct donut products in **الصفحة الرئيسية** in the admin sidebar. Save commits the full ordered selection atomically; concurrent edits require a reload. Public pages fetch the selection on mount, window focus, and every 30 seconds. Before configuration is available, the original four products remain visible. Product images, descriptions, and base prices come from the website catalog; branch price overrides remain in the branch menu.

## Dynamic offers and schedules

Apply `migrations/202609230001_dynamic_offers.sql` after the preceding migrations,
before deploying this frontend. It preserves existing switches, images and bundle
quantities, seeds Tuesday's weekday and the morning window, and allows new bundle
codes. No existing offer is automatically activated.

Owners and managers assigned to an active branch can use **العروض → إضافة عرض جديد**
to set paid/free quantities, weekdays, optional daily hours, optional start/end
dates, and an optional image from their device. New offers are saved hidden; use their
normal switch to publish. Text-only cards require no image. Existing offers can
also have their schedule and optional image edited; custom offers additionally
allow quantity changes. Removing the image on a custom offer restores its
text-only card. All offers remain shared across branches, with the existing
Icon Mall exclusion for the in-store drink offer.

Schedules use `Asia/Hebron` (Palestine local time, including daylight saving).
Hours start inclusively and end exclusively. An overnight window belongs to its
starting weekday/date, including the early hours after its final scheduled date.
With no hours selected, the offer lasts all day. Enabled cards display their
schedule even outside their available hours; hiding removes them completely.
The server filters discount rules and cart prompts by the current schedule and
rechecks checkout totals, so client clocks and old quotes cannot grant expired
promotions. Mini exclusions, cheapest-free bundles and best-discount-only pricing
continue to apply. Existing stock and cart limits also apply to custom overlays.

Verification: `npm test`, `npm run build`,
`node supabase/tests/dynamic-offers.mjs`, `node supabase/tests/mini-donuts.mjs`,
and `node supabase/tests/offers.mjs`. Database suites use an isolated PGlite
instance (or `PGLITE_MODULE` pointing at its installed module); they do not change
the live database. Only a publishable key is available locally, so apply the SQL
through the project's trusted migration workflow or Supabase SQL editor.

### Device image uploads

Apply `migrations/202609230002_offer_image_uploads.sql` after the dynamic-offers migration. It creates the public `offer-images` Storage bucket with a 5 MB limit and JPEG, PNG, WebP and GIF support. Only active owners and managers assigned to an active branch may upload. Filenames are unique and existing images cannot be overwritten through the client. Images are uploaded on save; the stored public URL is internal and admins never need to enter a URL. Failed uploads leave the offer unchanged. Images can be previewed, replaced or removed in the editor; no image is required. Existing image URLs continue to display.

Schedules still use local branch time, but the redundant timezone label is omitted from the UI.


### Deleting offers

Apply `migrations/202609230003_delete_shared_offers.sql` after the dynamic-offers migration. Owners and active branch managers can delete any offer from the shared admin list. The function removes its setting from every branch in one transaction, records the action in offer events, and preserves past orders. The UI confirms before deleting.


### Deleting offers

Apply `migrations/202609230003_delete_shared_offers.sql` after the dynamic-offers migration. Owners and active branch managers can delete an offer from the shared admin list. The function removes its setting from every branch in one transaction, logs the action, and preserves past orders. The UI confirms before deleting.
