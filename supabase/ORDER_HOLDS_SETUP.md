# Pause new orders by branch

Apply `migrations/202609190011_order_holds.sql` in the Supabase SQL Editor before deploying this feature. It is independent of the opening-hours migration on the separate feature branch. No live database changes are applied by the local build.

The migration preserves existing `orders_paused` values. Branches without that field start accepting orders. Legacy pauses without a reason get a generic bilingual explanation. Owners can pause/resume any active branch; managers can pause/resume their assigned branches. Order-only staff can view the state and process existing orders, but cannot pause a branch. Each change made through the new control is recorded with the staff user, reason, time, and version. Customers see only the current public reason, never the audit history.

## Fix the 404 reported on September 20, 2026

A read-only live check returned `PGRST202`: `public.get_branch_order_hold(p_branch)` was absent from the API schema cache. The live branch table already has `orders_paused`, so the original draft migration would fail with a duplicate-column error. The corrected migration uses `IF NOT EXISTS`, replaces its own functions and trigger safely, preserves existing pauses, and requests a PostgREST schema reload. It has been tested both on a database with the pre-existing flag and on repeated execution.

1. Open the matching project in Supabase → SQL Editor.
2. Paste the entire corrected `migrations/202609190011_order_holds.sql` file into a new query and run it.
3. Confirm the SQL completes successfully, then click **Retry** in the local admin Orders section or refresh the page.
4. Use **Pause orders**, choose the branch, enter a reason, and confirm. Check the customer cart, then resume the branch after testing.

Saving or committing the SQL file in Git does not run it in Supabase. Until this update is applied, the new frontend intentionally blocks confirmation when it cannot verify order reception status. Missing setup stops automatic polling to avoid repeated 404s; manual Retry remains available.

In the dashboard's Orders section, open **Pause orders**, choose the branch, and enter a reason (2–500 characters). The form explicitly labels the reason as customer-visible. Confirm the named branch. Use the same control to resume orders manually; resuming clears the public reason. This does not override opening hours when that separate feature is installed.

Customers can browse, add items, and fill in checkout details while paused. Confirmation is disabled, with the reason shown. The status refreshes every 15 seconds and on window focus. The database also rejects new orders from stale checkout pages and older clients. Existing orders can still be processed; retrying a request that was already accepted returns its original receipt even after a pause.

If the migration is missing or status cannot be checked, checkout confirmation is unavailable until status can be verified. The admin control shows a connection/setup message. Apply the SQL before testing the feature against Supabase.

Local database validation (uses an isolated PGlite database; never the live store):

```sh
node supabase/tests/order-holds.mjs
```

Optional: set `PGLITE_MODULE` to an installed PGlite module path if it is not installed in this workspace.
