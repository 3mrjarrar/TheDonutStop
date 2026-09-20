# Order holds — handoff for the next chat

Updated September 20, 2026. Repository: TheDonutStop. Working branch: `hold-order`.

## User's agreed request

Admins need a control at the top of the Orders section to temporarily stop **new orders for a chosen branch**, with a required reason. Customers see the reason at checkout. Existing accepted orders remain processable. Admins manually resume reception using the same control.

The user uses GitHub Desktop and wants features developed separately from `dev`, then tested before merging into `dev` and `main`. These order-hold changes are still uncommitted as of this handoff. Do not assume the user wants them merged or deployed automatically.

## Current status and the reported error

The implementation and isolated database tests are complete locally. Admin pause/resume interactions were checked in the browser with mocked data, without pausing any live branch. The live Supabase migration has **not** been applied by this chat, so full live integration still needs verification.

The September 20 screenshots showed repeated HTTP 404 responses from `/rest/v1/rpc/get_branch_order_hold`. A read-only request to the configured Supabase project confirmed error `PGRST202`: `public.get_branch_order_hold(p_branch)` was not found in the API schema cache.

A second read-only check found these existing live branch columns: `id`, `code`, `name_ar`, `name_en`, `sort_order`, `active`, `delivery_enabled`, `delivery_fee`, `orders_paused`, `preparation_minutes`, `weekly_hours`. Supabase also suggested an existing `set_branch_ordering` function. Its implementation was not available to this chat; do not assume its signature or overwrite it. The original local migration tried to add `orders_paused` unconditionally, which would fail on this existing schema. That has been corrected.

Only the app's publishable credentials are configured locally. There is no connected privileged Supabase tool/CLI or accessible authenticated SQL Editor session here. No credentials belong in this document. The user must run the corrected migration in their Supabase SQL Editor, or provide an authorized database administration connection in a future task.

## Files and responsibilities

| File | Change |
| --- | --- |
| `src/pages/Admin/Admin.jsx` | Passes available branches and staff role into `Orders`. |
| `src/pages/Admin/Orders.jsx` | Renders `OrderHoldControl` before the existing order list. |
| `src/pages/Admin/OrderHoldControl.jsx` | Arabic/English pause/resume UI, branch selector, required public reason, permission-dependent controls, status and error feedback. |
| `src/pages/Admin/order-hold.css` | Responsive admin control styling. |
| `src/lib/useOrderHold.js` | Shared status RPC hook; polls every 15 seconds and on window focus; aborts stale requests and times out at 10 seconds. |
| `src/components/cart/Cart.jsx` | Reads hold status, displays public reason, blocks new confirmations, handles database pause rejection, preserves ambiguous-request retry behavior. |
| `src/components/cart/order-hold-notice.css` | Customer-facing pause notice styling. |
| `supabase/migrations/202609190011_order_holds.sql` | Additive database setup, public status RPC, admin mutation RPC, audit records, order-insert enforcement. |
| `supabase/tests/order-holds.mjs` | Isolated PGlite integration tests; no live order writes. |
| `supabase/ORDER_HOLDS_SETUP.md` | SQL application instructions and operational behavior. |

Temporary `tests/hold-preview.html` and `tests/hold-preview.jsx` files were used for browser QA and removed afterward. They mocked RPCs and were never production routes or database migrations.

## Database contract

The migration adds missing columns to `public.branches`:

- `orders_paused`: boolean; existing values are preserved.
- `orders_pause_reason`: text; new pauses require 2–500 trimmed characters in the mutation RPC.
- `orders_pause_version`: integer for detecting stale admin changes.

Legacy paused branches without a reason receive a generic bilingual explanation. When unpaused, the status RPC returns an empty public reason even if an older ordering control left a stored reason behind. Existing `preparation_minutes` and `weekly_hours` fields are untouched.

RPCs:

- `get_branch_order_hold(p_branch uuid)` returns `{ paused, reason, version }`. Callable by anonymous and authenticated users; exposes current status only.
- `set_branch_order_hold(p_branch uuid, p_paused boolean, p_reason text, p_expected_version integer)` returns the updated status. Uses the existing `can_manage_inventory` permission helper: owners manage all branches, managers manage assigned branches, order-only staff cannot pause/resume. Locks the branch row and rejects stale versions with `40001` / `HOLD_CHANGED`.

`order_hold_events` records branch, actor, paused state, reason, version and timestamp for changes through the new setter. RLS scopes audit reads to managers/owners who can manage that branch. Anonymous users cannot read the audit table or change holds.

`enforce_order_hold` is a `BEFORE INSERT` trigger on `orders`. It checks the branch under a row lock and raises `P0001` / `ORDERS_PAUSED`, with the public reason in error details. The existing checkout function also locks the branch, serializing checkout with pause/resume. Rejected new orders roll back without reserving stock. Existing-order status updates are unaffected. A retry for an already-created order returns the existing receipt before an insert, so it still succeeds after a pause.

The corrected SQL tolerates an existing flag and repeated application, preserves pauses, recreates only its own policy/trigger/functions, and ends with `NOTIFY pgrst, 'reload schema'`. It does not modify the existing `set_branch_ordering` function. Behavior of unrelated older ordering functions has not been tested live; verify integration after applying the SQL.

## UI behavior and error handling

Admin: Orders → **إيقاف الطلبات مؤقتًا / Pause orders** → choose a branch → enter customer-visible reason → confirm the named branch. A paused branch displays the reason and **Resume orders**. The component's branch selector may target a different branch than the order-list filter; its status and confirm button explicitly name the selected target.

Customer: browsing, cart changes and entering checkout details stay available. New confirmation is disabled when paused or status is unavailable. Existing ambiguous-request retries remain enabled, allowing the database to return an already-accepted order safely. Database enforcement catches stale pages even before the next polling interval.

Setup errors (`PGRST202`, `PGRST204`, `42883`, `42703`) are distinguished from network errors. The admin setup message names `202609190011_order_holds.sql`. Automatic polling stops while setup is missing, preventing repeated 404 spam. Manual **Retry** checks immediately after installation. Customer errors do not expose database setup details.

## Verification completed

- `node supabase/tests/order-holds.mjs`: passed. Covers permissions, required and oversized reasons, branch isolation, pause/resume, stale versions, stock rollback, processing existing orders, accepted-order retries, audit access, pre-existing `orders_paused` compatibility and repeated migration application.
- `npm test`: all 14 existing tests passed.
- `npm run build`: passed again on September 20 after the compatibility and error-handling fixes. Dependency directive/chunk-size warnings are non-fatal.
- Browser QA using isolated mocked RPCs: reason required before confirmation; selecting Icon Mall and pausing displays the reason; Nablus remains accepting; resuming Icon Mall restores accepting state; no browser console errors were observed in that fixture.
- The live API was checked read-only, confirming the missing-function error. No live order was submitted or branch paused during testing.

PGlite uses an isolated database and serializes queries. It does not prove concurrent behavior with separate production PostgreSQL connections. Live end-to-end confirmation awaits SQL installation and user testing.

## Next steps

1. Run the entire corrected `supabase/migrations/202609190011_order_holds.sql` in the matching Supabase project's SQL Editor. Saving the file or committing it does not apply the database change.
2. Click Retry in the local admin page, then confirm each branch status loads.
3. Test a branch pause with a clear reason, check the customer cart notice and blocked confirmation, then resume that branch. Prefer a test environment for placing actual orders.
4. Check compatibility with any existing remote ordering controls, since the live schema contains changes not represented in this checkout.
5. Review the diff and commit on `hold-order` only when the user is satisfied. The user normally performs commits and merges through GitHub Desktop.

## Separate opening-hours feature

`availble-time-order` is a separate branch (spelling is intentional). Its unfinished automatic opening-hours feature is not included here. Do not switch to it or merge it unintentionally. Its migration uses number `202609190010`; order holds use `202609190011`. If both features are merged later, keep both database checks and combine the checkout conditions so resuming manual holds does not bypass closed hours. At the last discussion the weekend-day definition for Nablus/Icon Mall was still awaiting clarification.
