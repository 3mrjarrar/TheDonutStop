begin;
alter table public.inventory_events add column request_id uuid unique;
alter table public.inventory_events add column action text;
alter table public.inventory_events add column request_payload jsonb;
alter table public.inventory_events add column quantity_after integer;
alter table public.inventory_events add column unavailable_after boolean;

create function public.can_manage_inventory(p_branch uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles s
    where s.user_id = auth.uid() and s.active and
      (s.role = 'owner' or (s.role = 'manager' and exists (
        select 1 from public.staff_branches b where b.user_id = s.user_id and b.branch_id = p_branch
      )))
  );
$$;
revoke all on function public.can_manage_inventory(uuid) from public, anon;
grant execute on function public.can_manage_inventory(uuid) to authenticated;

grant select on public.inventory_events to authenticated;
create policy managed_events on public.inventory_events for select to authenticated
  using (public.can_manage_inventory(branch_id));
create policy managed_inventory on public.branch_inventory for select to authenticated
  using (public.can_manage_inventory(branch_id));

create function public.adjust_inventory(
  p_branch uuid, p_variant uuid, p_action text, p_amount integer,
  p_reason text, p_expected_quantity integer, p_expected_unavailable boolean,
  p_request_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  stock public.branch_inventory%rowtype;
  previous_event public.inventory_events%rowtype;
  next_quantity integer;
  next_unavailable boolean;
  payload jsonb;
begin
  if not public.can_manage_inventory(p_branch) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_request_id is null or p_action is null or p_action not in ('restock','waste','count','unavailable','available') then
    raise exception 'Invalid operation';
  end if;
  if p_reason is null or length(trim(p_reason)) < 2 or length(p_reason) > 500 then
    raise exception 'A reason is required (2–500 characters)';
  end if;
  payload := jsonb_build_object('amount', p_amount, 'reason', p_reason, 'expected_quantity', p_expected_quantity, 'expected_unavailable', p_expected_unavailable);
  -- Serialize retries and concurrent adjustments for this inventory row.
  select * into stock from public.branch_inventory
    where branch_id = p_branch and variant_id = p_variant for update;
  if not found then raise exception 'Inventory row not found'; end if;
  select * into previous_event from public.inventory_events where request_id = p_request_id;
  if found then
    if previous_event.actor_id = auth.uid() and previous_event.branch_id = p_branch
       and previous_event.variant_id = p_variant and previous_event.action = p_action
       and previous_event.request_payload = payload then return; end if;
    raise exception 'Request ID already used';
  end if;
  if p_expected_quantity is distinct from stock.quantity or
     p_expected_unavailable is distinct from stock.manual_unavailable then
    raise exception 'Stock changed. Refresh before saving.' using errcode = '40001';
  end if;
  next_quantity := stock.quantity;
  next_unavailable := stock.manual_unavailable;
  if p_action in ('restock','waste','count') then
    if p_amount is null or p_amount < 0 or p_amount > 1000000 or
       (p_action <> 'count' and p_amount = 0) then raise exception 'Invalid quantity'; end if;
    next_quantity := case p_action when 'restock' then stock.quantity + p_amount
      when 'waste' then stock.quantity - p_amount else p_amount end;
    if next_quantity < 0 then raise exception 'Waste exceeds stock'; end if;
    if p_action = 'restock' then next_unavailable := false; end if;
  elsif p_action = 'unavailable' then next_unavailable := true;
  else next_unavailable := false;
  end if;
  update public.branch_inventory set quantity = next_quantity, manual_unavailable = next_unavailable
    where branch_id = p_branch and variant_id = p_variant;
  insert into public.inventory_events
    (branch_id, variant_id, actor_id, delta, reason, request_id, action, quantity_after, unavailable_after, request_payload)
    values (p_branch, p_variant, auth.uid(), next_quantity-stock.quantity, trim(p_reason),
      p_request_id, p_action, next_quantity, next_unavailable, payload);
end;
$$;
revoke all on function public.adjust_inventory(uuid,uuid,text,integer,text,integer,boolean,uuid) from public, anon;
grant execute on function public.adjust_inventory(uuid,uuid,text,integer,text,integer,boolean,uuid) to authenticated;
commit;
