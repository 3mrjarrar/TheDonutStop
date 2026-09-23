begin;
create function public.delete_shared_offer(p_code text,p_expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare old public.shared_offers%rowtype;
begin
 if not exists(select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and
   (s.role='owner' or (s.role='manager' and exists(select 1 from public.staff_branches sb join public.branches b on b.id=sb.branch_id where sb.user_id=s.user_id and b.active))))
 then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_code is null or p_expected_updated_at is null then raise exception 'Invalid offer'; end if;
 select * into old from public.shared_offers where code=p_code for update;
 -- A retry after a successful delete is safe when the request outcome was ambiguous.
 if not found then return; end if;
 if old.updated_at is distinct from p_expected_updated_at then raise exception 'Offer changed' using errcode='40001'; end if;
 perform 1 from public.branch_offers where code=p_code order by branch_id for update;
 insert into public.offer_events(branch_id,code,enabled,actor_id)
   select branch_id,p_code,false,auth.uid() from public.branch_offers where code=p_code;
 delete from public.branch_offers where code=p_code;
 delete from public.shared_offers where code=p_code;
end;
$$;
revoke all on function public.delete_shared_offer(text,timestamptz) from public,anon;
grant execute on function public.delete_shared_offer(text,timestamptz) to authenticated;
notify pgrst,'reload schema';
commit;
