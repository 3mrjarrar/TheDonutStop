begin;

-- Minutes after midnight. A closing minute above 1440 belongs to the next day.
-- Sunday = 0. These schedules match the homepage's branch-hours cards.
create table public.branch_ordering_hours (
  branch_code text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  opens integer not null check (opens between 0 and 1439),
  closes integer not null check (closes between 1 and 2879 and closes > opens),
  primary key (branch_code, day_of_week)
);
alter table public.branch_ordering_hours enable row level security;
revoke all on public.branch_ordering_hours from public, anon, authenticated;

insert into public.branch_ordering_hours
select 'TERI', day, case when day = 5 then 540 else 450 end, 1440
from generate_series(0, 6) day;

create function public.branch_is_open_at(p_code text, p_at timestamptz)
returns boolean language sql stable set search_path = '' as $$
  with local_clock as (
    select p_at at time zone 'Asia/Hebron' as local_time
  ), clock_parts as (
    select extract(dow from local_time)::integer as day,
      extract(hour from local_time) * 60 + extract(minute from local_time)
        + extract(second from local_time) / 60 as minute
    from local_clock
  )
  select exists (
    select 1 from public.branch_ordering_hours h cross join clock_parts c
    where h.branch_code = p_code and (
      (h.day_of_week = c.day and c.minute >= h.opens and c.minute < h.closes)
      or (h.day_of_week = (c.day + 6) % 7 and c.minute + 1440 >= h.opens and c.minute + 1440 < h.closes)
    )
  );
$$;
revoke all on function public.branch_is_open_at(text,timestamptz) from public, anon, authenticated;

-- No client-supplied time: checkout always uses the database clock.
create function public.get_branch_ordering_status(p_branch uuid)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select jsonb_build_object('open', exists (
    select 1 from public.branches b where b.id = p_branch and b.active
      and public.branch_is_open_at(b.code, clock_timestamp())
  ));
$$;
revoke all on function public.get_branch_ordering_status(uuid) from public;
grant execute on function public.get_branch_ordering_status(uuid) to anon, authenticated;

-- The insert boundary protects every order-creation path, even older clients.
-- Existing-order retries return before this trigger and remain safe after closing.
create function public.enforce_ordering_hours()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.branches b where b.id = new.branch_id and b.active
      and public.branch_is_open_at(b.code, clock_timestamp())
  ) then
    raise exception 'BRANCH_CLOSED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_ordering_hours() from public, anon, authenticated;
create trigger enforce_ordering_hours before insert on public.orders
for each row execute function public.enforce_ordering_hours();

commit;
