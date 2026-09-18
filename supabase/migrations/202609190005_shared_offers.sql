begin;

-- One switch per campaign, shared by every branch. Preserve any explicitly
-- enabled campaign; do not revive the old default-enabled legacy offers.
lock table public.branch_offers in share row exclusive mode;
create table public.shared_offers (
  code text primary key check (code in ('daily','tuesday','morning','buy6get2','buy7get3','buy8get4','buy6get6')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.shared_offers enable row level security;
revoke all on public.shared_offers from public,anon,authenticated;
grant select on public.shared_offers to anon,authenticated;
create policy public_shared_offers on public.shared_offers for select to anon,authenticated using (true);
insert into public.shared_offers(code,enabled)
select codes.code,coalesce(bool_or(o.enabled and (codes.code not in ('daily','tuesday','morning') or o.admin_activated)) filter (where b.active),false)
from (values ('daily'),('tuesday'),('morning'),('buy6get2'),('buy7get3'),('buy8get4'),('buy6get6')) codes(code)
left join public.branch_offers o on o.code=codes.code
left join public.branches b on b.id=o.branch_id
group by codes.code;

update public.branch_offers o
set enabled=s.enabled and not (s.code='morning' and b.code='TERI'),
    admin_activated=s.enabled and not (s.code='morning' and b.code='TERI'),updated_at=clock_timestamp()
from public.shared_offers s,public.branches b where o.code=s.code and o.branch_id=b.id;

create function public.set_shared_offer(p_code text,p_enabled boolean,p_expected_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare current_enabled boolean; setting record;
begin
  if not exists (
    select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active
    and (s.role='owner' or (s.role='manager' and exists (
      select 1 from public.staff_branches sb join public.branches b on b.id=sb.branch_id
      where sb.user_id=s.user_id and b.active
    )))
  ) then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_enabled is null or p_expected_enabled is null then raise exception 'Invalid state'; end if;
  select enabled into current_enabled from public.shared_offers where code=p_code for update;
  if not found then raise exception 'Offer not found'; end if;
  if current_enabled=p_enabled then return; end if;
  if current_enabled is distinct from p_expected_enabled then raise exception 'Offer changed' using errcode='40001'; end if;
  -- Serialize stock/offer readers against each affected row in a stable order.
  for setting in
    select o.branch_id,o.enabled,b.code as branch_code from public.branch_offers o
    join public.branches b on b.id=o.branch_id where o.code=p_code
    order by o.branch_id for update of o
  loop
    update public.branch_offers
    set enabled=p_enabled and not (p_code='morning' and setting.branch_code='TERI'),
        admin_activated=p_enabled and not (p_code='morning' and setting.branch_code='TERI'),updated_at=clock_timestamp()
    where branch_id=setting.branch_id and code=p_code;
    if setting.enabled is distinct from (p_enabled and not (p_code='morning' and setting.branch_code='TERI')) then
      insert into public.offer_events(branch_id,code,enabled,actor_id)
      values(setting.branch_id,p_code,p_enabled and not (p_code='morning' and setting.branch_code='TERI'),auth.uid());
    end if;
  end loop;
  update public.shared_offers set enabled=p_enabled,updated_at=clock_timestamp() where code=p_code;
end;
$$;
revoke all on function public.set_shared_offer(text,boolean,boolean) from public,anon;
grant execute on function public.set_shared_offer(text,boolean,boolean) to authenticated;

-- Older clients must also change the shared state rather than desynchronize it.
create or replace function public.set_branch_offer(p_branch uuid,p_code text,p_enabled boolean,p_expected_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.can_manage_inventory(p_branch) then raise exception 'Not authorized' using errcode='42501'; end if;
  if not exists(select 1 from public.branches where id=p_branch and active) then raise exception 'Branch unavailable'; end if;
  perform public.set_shared_offer(p_code,p_enabled,p_expected_enabled);
end;
$$;

create or replace function public.initialize_branch_offers() returns trigger
language plpgsql security definer set search_path='' as $$
declare setting record; available boolean;
begin
  for setting in select code,enabled from public.shared_offers order by code for share loop
    available:=setting.enabled and not (setting.code='morning' and new.code='TERI');
    insert into public.branch_offers(branch_id,code,enabled,admin_activated)
    values(new.id,setting.code,available,available);
  end loop;
  return new;
end;
$$;

do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
   alter publication supabase_realtime add table public.shared_offers;
 end if;
end $$;
commit;
