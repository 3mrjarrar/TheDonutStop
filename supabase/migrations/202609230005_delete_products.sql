begin;

-- Archive the catalog entry so historical orders and inventory references remain intact.
create or replace function public.delete_catalog_product(p_product uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.staff_profiles s where s.user_id = auth.uid() and s.active
      and (s.role = 'owner' or (s.role = 'manager' and exists (
        select 1 from public.staff_branches sb join public.branches b on b.id = sb.branch_id
        where sb.user_id = s.user_id and b.active
      )))
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_product is null then
    raise exception 'Product is required' using errcode = '22023';
  end if;
  -- Existing read policies and checkout reject inactive products, including every size.
  -- Repeating a successful request is safe.
  update public.products set active = false where id = p_product and active;
end;
$$;
revoke all on function public.delete_catalog_product(uuid) from public, anon;
grant execute on function public.delete_catalog_product(uuid) to authenticated;
notify pgrst, 'reload schema';

commit;
