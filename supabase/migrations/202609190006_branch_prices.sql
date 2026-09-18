begin;
create table public.price_events (
  request_id uuid primary key,
  branch_id uuid not null references public.branches(id),
  variant_id uuid not null references public.product_variants(id),
  actor_id uuid not null references auth.users(id),
  old_price numeric(10,2) not null,
  new_price numeric(10,2) not null,
  reason text not null,
  request_payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.price_events enable row level security;
revoke all on public.price_events from anon, authenticated;
grant select on public.price_events to authenticated;
create policy managed_prices on public.price_events for select to authenticated
  using (public.can_manage_inventory(branch_id));

create function public.set_branch_price(
  p_branch uuid, p_variant uuid, p_price numeric, p_expected_price numeric,
  p_reason text, p_request_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  stock public.branch_inventory%rowtype;
  previous public.price_events%rowtype;
  current_price numeric;
  payload jsonb;
begin
  if not public.can_manage_inventory(p_branch) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_request_id is null or p_price is null or p_price < 0 or p_price > 99999999.99
     or p_price <> round(p_price, 2) or p_expected_price is null
     or length(trim(coalesce(p_reason, ''))) < 2 or length(p_reason) > 500 then
    raise exception 'Invalid price or reason' using errcode = '22023';
  end if;
  payload := jsonb_build_object('price', p_price, 'expected_price', p_expected_price, 'reason', p_reason);
  select * into stock from public.branch_inventory
    where branch_id = p_branch and variant_id = p_variant for update;
  if not found then raise exception 'Inventory row not found' using errcode = '22023'; end if;
  select * into previous from public.price_events where request_id = p_request_id;
  if found then
    if previous.actor_id = auth.uid() and previous.branch_id = p_branch
       and previous.variant_id = p_variant and previous.request_payload = payload then return; end if;
    raise exception 'Request ID already used' using errcode = '22023';
  end if;
  select coalesce(stock.price_override, price) into current_price
    from public.product_variants where id = p_variant;
  if p_expected_price is distinct from current_price then
    raise exception 'Price changed. Refresh before saving.' using errcode = '40001';
  end if;
  update public.branch_inventory set price_override = p_price
    where branch_id = p_branch and variant_id = p_variant;
  insert into public.price_events (request_id, branch_id, variant_id, actor_id, old_price, new_price, reason, request_payload)
    values (p_request_id, p_branch, p_variant, auth.uid(), current_price, p_price, trim(p_reason), payload);
end;
$$;
revoke all on function public.set_branch_price(uuid,uuid,numeric,numeric,text,uuid) from public, anon;
grant execute on function public.set_branch_price(uuid,uuid,numeric,numeric,text,uuid) to authenticated;
commit;
