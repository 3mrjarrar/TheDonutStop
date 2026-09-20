begin;

alter table public.branches
  add column if not exists orders_paused boolean not null default false,
  add column if not exists orders_pause_reason text not null default '',
  add column if not exists orders_pause_version integer not null default 0;

-- Existing projects can already have orders_paused from an earlier ordering setup.
-- Preserve every existing pause; give legacy pauses a public explanation.
update public.branches set orders_pause_reason = 'استقبال الطلبات متوقف مؤقتًا. يرجى المحاولة لاحقًا. / Orders are temporarily paused. Please check back later.'
where orders_paused and length(trim(orders_pause_reason)) < 2;
-- Permit a legacy ordering control to resume without clearing our reason column.
-- The public RPC below hides the previous reason whenever ordering is resumed.

create table if not exists public.order_hold_events (
  id bigint generated always as identity primary key,
  branch_id uuid not null references public.branches(id),
  actor_id uuid not null references auth.users(id),
  paused boolean not null,
  reason text not null,
  version integer not null,
  created_at timestamptz not null default now()
);
alter table public.order_hold_events enable row level security;
revoke all on public.order_hold_events from public, anon, authenticated;
grant select on public.order_hold_events to authenticated;
drop policy if exists managed_order_holds on public.order_hold_events;
create policy managed_order_holds on public.order_hold_events for select to authenticated
  using (public.can_manage_inventory(branch_id));

create or replace function public.get_branch_order_hold(p_branch uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare b public.branches%rowtype;
begin
  select * into b from public.branches where id = p_branch and active;
  if not found then raise exception 'BRANCH_UNAVAILABLE'; end if;
  return jsonb_build_object('paused', coalesce(b.orders_paused, false), 'reason', case when b.orders_paused then coalesce(nullif(trim(b.orders_pause_reason), ''), 'استقبال الطلبات متوقف مؤقتًا. / Orders are temporarily paused.') else '' end, 'version', b.orders_pause_version);
end;
$$;
revoke all on function public.get_branch_order_hold(uuid) from public;
grant execute on function public.get_branch_order_hold(uuid) to anon, authenticated;

create or replace function public.set_branch_order_hold(p_branch uuid, p_paused boolean, p_reason text, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare b public.branches%rowtype; reason text;
begin
  -- Owners manage all branches; managers only their assigned branches.
  if not public.can_manage_inventory(p_branch) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_paused is null or p_expected_version is null then raise exception 'INVALID_HOLD'; end if;
  reason := case when p_paused then trim(coalesce(p_reason, '')) else '' end;
  if p_paused and length(reason) not between 2 and 500 then raise exception 'HOLD_REASON_REQUIRED'; end if;
  -- Serializes pause/resume with checkout, which also locks the branch row.
  select * into b from public.branches where id = p_branch and active for update;
  if not found then raise exception 'BRANCH_UNAVAILABLE'; end if;
  if b.orders_pause_version <> p_expected_version then
    raise exception 'HOLD_CHANGED' using errcode = '40001';
  end if;
  update public.branches set orders_paused = p_paused, orders_pause_reason = reason,
    orders_pause_version = orders_pause_version + 1 where id = p_branch;
  insert into public.order_hold_events(branch_id, actor_id, paused, reason, version)
    values(p_branch, auth.uid(), p_paused, reason, b.orders_pause_version + 1);
  return public.get_branch_order_hold(p_branch);
end;
$$;
revoke all on function public.set_branch_order_hold(uuid,boolean,text,integer) from public, anon;
grant execute on function public.set_branch_order_hold(uuid,boolean,text,integer) to authenticated;

create or replace function public.enforce_order_hold()
returns trigger language plpgsql security definer set search_path = '' as $$
declare b public.branches%rowtype;
begin
  select * into b from public.branches where id = new.branch_id for share;
  if b.orders_paused then
    raise exception 'ORDERS_PAUSED' using errcode = 'P0001', detail = b.orders_pause_reason;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_order_hold() from public, anon, authenticated;
-- New orders are blocked, but previously accepted order retries and status updates work.
drop trigger if exists enforce_order_hold on public.orders;
create trigger enforce_order_hold before insert on public.orders
for each row execute function public.enforce_order_hold();

notify pgrst, 'reload schema';
commit;
