begin;
create table public.homepage_featured (
  id integer primary key check (id=1),
  photos text[] not null check (cardinality(photos)=4),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.homepage_featured(id,photos) values
(1,array['10-dubai-donut.png','13-pistachio-filling.png','16-lotus-filling.png','01-original-glaze.png']);
alter table public.homepage_featured enable row level security;
revoke all on public.homepage_featured from public,anon,authenticated;
grant select on public.homepage_featured to anon,authenticated;
create policy public_homepage_featured on public.homepage_featured for select to anon,authenticated using(true);

create function public.set_homepage_featured(p_photos text[],p_expected_revision integer)
returns integer language plpgsql security definer set search_path='' as $$
declare current_revision integer;
begin
  if not exists (
    select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active
    and (s.role='owner' or (s.role='manager' and exists (
      select 1 from public.staff_branches sb join public.branches b on b.id=sb.branch_id
      where sb.user_id=s.user_id and b.active
    )))
  ) then raise exception 'Not authorized' using errcode='42501'; end if;
  if p_photos is null or array_ndims(p_photos) is distinct from 1 or cardinality(p_photos)<>4
    or (select count(distinct photo) from unnest(p_photos) photo)<>4
    or exists(select 1 from unnest(p_photos) photo where not exists(
      select 1 from public.products p where p.active and p.category='donuts' and p.image_path='/assets/donuts/'||photo
    )) then raise exception 'Select four distinct donut products' using errcode='22023'; end if;
  select revision into current_revision from public.homepage_featured where id=1 for update;
  if not found then raise exception 'Settings missing'; end if;
  if p_expected_revision is distinct from current_revision then raise exception 'Selection changed' using errcode='40001'; end if;
  update public.homepage_featured set photos=p_photos,revision=revision+1,updated_at=clock_timestamp(),updated_by=auth.uid() where id=1;
  return current_revision+1;
end;
$$;
revoke all on function public.set_homepage_featured(text[],integer) from public,anon;
grant execute on function public.set_homepage_featured(text[],integer) to authenticated;
commit;
