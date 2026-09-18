begin;

-- The original migration enabled daily/tuesday/morning for every existing branch.
-- Remove that automatic activation. Preserve settings an admin actually changed.
-- New branches already start with every offer disabled.
lock table public.branch_offers in share row exclusive mode;
update public.branch_offers as offer
set enabled = false, updated_at = clock_timestamp()
where offer.enabled
  and not exists (
    select 1 from public.offer_events as event
    where event.branch_id = offer.branch_id and event.code = offer.code
  );

commit;
