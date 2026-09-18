begin;

-- Remove the legacy default publication. Keep the four new campaign settings.
-- This is a one-time reset: add the original offers back through the admin switches.
alter table public.branch_offers add column admin_activated boolean not null default false;
update public.branch_offers
set enabled = false, updated_at = clock_timestamp()
where code in ('daily','tuesday','morning');

create or replace function public.set_branch_offer(p_branch uuid,p_code text,p_enabled boolean,p_expected_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare current_enabled boolean; current_activated boolean;
begin
  if not public.can_manage_inventory(p_branch) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_enabled is null or p_expected_enabled is null then raise exception 'Invalid state'; end if;
  if not exists(select 1 from public.branches where id=p_branch and active) then raise exception 'Branch unavailable'; end if;
  select enabled,admin_activated into current_enabled,current_activated
  from public.branch_offers where branch_id=p_branch and code=p_code for update;
  if not found then raise exception 'Offer not found'; end if;
  if current_enabled=p_enabled and (not p_enabled or current_activated) then return; end if;
  if current_enabled is distinct from p_expected_enabled then raise exception 'Offer changed' using errcode='40001'; end if;
  update public.branch_offers set enabled=p_enabled,admin_activated=p_enabled,updated_at=clock_timestamp()
  where branch_id=p_branch and code=p_code;
  insert into public.offer_events(branch_id,code,enabled,actor_id) values(p_branch,p_code,p_enabled,auth.uid());
end;
$$;
revoke all on function public.set_branch_offer(uuid,text,boolean,boolean) from public,anon;
grant execute on function public.set_branch_offer(uuid,text,boolean,boolean) to authenticated;

commit;
