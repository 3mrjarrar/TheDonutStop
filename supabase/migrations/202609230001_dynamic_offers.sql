begin;

-- Safe after a partial setup or a successful earlier run. Preserve admin data.
alter table public.shared_offers drop constraint if exists shared_offers_code_check;
alter table public.branch_offers drop constraint if exists branch_offers_code_check;
alter table public.shared_offers
  add column if not exists buy_quantity integer,
  add column if not exists free_quantity integer,
  add column if not exists custom boolean not null default false,
  add column if not exists image_url text,
  add column if not exists weekdays integer[],
  add column if not exists starts_on date,
  add column if not exists ends_on date;

-- Seed the original morning hours only when installing its schedule columns.
do $$
declare new_times boolean;
begin
  new_times := not exists(select 1 from information_schema.columns where table_schema='public' and table_name='shared_offers' and column_name='start_time');
  alter table public.shared_offers add column if not exists start_time time, add column if not exists end_time time;
  if new_times then
    update public.shared_offers set start_time='07:30',end_time='11:00' where code='morning';
  end if;
end $$;

update public.shared_offers set weekdays=case when code='tuesday' then array[2] else array[1,2,3,4,5,6,7] end where weekdays is null;
alter table public.shared_offers alter column weekdays set default array[1,2,3,4,5,6,7], alter column weekdays set not null;
update public.shared_offers s set buy_quantity=coalesce(s.buy_quantity,r.buy),free_quantity=coalesce(s.free_quantity,r.free)
from (values ('daily',5,1),('tuesday',7,5),('buy6get2',6,2),('buy7get3',7,3),('buy8get4',8,4),('buy6get6',6,6)) r(code,buy,free)
where s.code=r.code and (s.buy_quantity is null or s.free_quantity is null);

alter table public.shared_offers
  drop constraint if exists offer_quantities,
  drop constraint if exists offer_weekdays,
  drop constraint if exists offer_times,
  drop constraint if exists offer_dates,
  drop constraint if exists offer_image;
alter table public.shared_offers
  add constraint offer_quantities check ((code='morning' and buy_quantity is null and free_quantity is null) or
    (buy_quantity is not null and free_quantity is not null and buy_quantity between 1 and 99 and free_quantity between 1 and 99 and buy_quantity+free_quantity<=99)),
  add constraint offer_weekdays check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7] and array_position(weekdays,null) is null),
  add constraint offer_times check ((start_time is null and end_time is null) or (start_time is not null and end_time is not null and start_time<>end_time)),
  add constraint offer_dates check (starts_on is null or ends_on is null or ends_on>=starts_on),
  add constraint offer_image check (image_url is null or (length(image_url)<=2048 and image_url ~ '^https://[^[:space:]]+$'));
alter table public.branch_offers drop constraint if exists branch_offers_definition;
alter table public.branch_offers add constraint branch_offers_definition foreign key(code) references public.shared_offers(code);

-- Overnight windows belong to the weekday/date on which they start. End is exclusive.
create or replace function public.offer_schedule_active(p_days integer[],p_start time,p_end time,p_from date,p_until date,p_at timestamptz)
returns boolean language sql immutable set search_path='' as $$
 with local as (select p_at at time zone 'Asia/Hebron' as t), anchor as (
 select t, t::date - case when p_start>p_end and t::time<p_end then 1 else 0 end as d from local)
 select extract(isodow from d)::integer=any(p_days)
   and (p_from is null or d>=p_from) and (p_until is null or d<=p_until)
   and (p_start is null or (p_start<p_end and t::time>=p_start and t::time<p_end)
     or (p_start>p_end and (t::time>=p_start or t::time<p_end))) from anchor;
$$;
revoke all on function public.offer_schedule_active(integer[],time,time,date,date,timestamptz) from public,anon,authenticated;

create or replace function public.save_shared_offer(p_code text,p_definition jsonb,p_expected_updated_at timestamptz)
returns text language plpgsql security definer set search_path='' as $$
declare old public.shared_offers%rowtype; v_code text; v_buy integer; v_free integer; v_days integer[]; setting record;
begin
 if not exists(select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and
   (s.role='owner' or (s.role='manager' and exists(select 1 from public.staff_branches sb join public.branches b on b.id=sb.branch_id where sb.user_id=s.user_id and b.active))))
 then raise exception 'Not authorized' using errcode='42501'; end if;
 if jsonb_typeof(p_definition) is distinct from 'object' then raise exception 'Invalid offer'; end if;
 if p_code is null then
   v_code:='custom_'||gen_random_uuid()::text;
 else
   select * into old from public.shared_offers where code=p_code for update;
   if not found then raise exception 'Offer not found'; end if;
   if old.updated_at is distinct from p_expected_updated_at then raise exception 'Offer changed' using errcode='40001'; end if;
   v_code:=p_code;
 end if;
 v_buy:=(p_definition->>'buy_quantity')::integer;
 v_free:=(p_definition->>'free_quantity')::integer;
 if p_code is not null and not old.custom and (v_buy is distinct from old.buy_quantity or v_free is distinct from old.free_quantity)
 then raise exception 'Existing bundle quantities cannot change'; end if;
 select array_agg(distinct value::integer order by value::integer) into v_days from jsonb_array_elements_text(p_definition->'weekdays');
 if v_days is null then raise exception 'Choose weekdays'; end if;
 -- Same lock order as shared switches; checkout holds these rows while pricing.
 perform 1 from public.branch_offers where code=v_code order by branch_id for update;
 if p_code is null then
   insert into public.shared_offers(code,enabled,custom,buy_quantity,free_quantity) values(v_code,false,true,v_buy,v_free);
 end if;
 update public.shared_offers set buy_quantity=v_buy,free_quantity=v_free,
   image_url=nullif(trim(p_definition->>'image_url'),''),weekdays=v_days,
   start_time=nullif(p_definition->>'start_time','')::time,end_time=nullif(p_definition->>'end_time','')::time,
   starts_on=nullif(p_definition->>'starts_on','')::date,ends_on=nullif(p_definition->>'ends_on','')::date,
   updated_at=clock_timestamp() where code=v_code;
 if p_code is null then
   insert into public.branch_offers(branch_id,code,enabled,admin_activated) select id,v_code,false,false from public.branches;
 else
   update public.branch_offers set updated_at=clock_timestamp() where code=v_code;
 end if;
 for setting in select branch_id,enabled from public.branch_offers where code=v_code loop
   insert into public.offer_events(branch_id,code,enabled,actor_id) values(setting.branch_id,v_code,setting.enabled,auth.uid());
 end loop;
 return v_code;
end;
$$;
revoke all on function public.save_shared_offer(text,jsonb,timestamptz) from public,anon;
grant execute on function public.save_shared_offer(text,jsonb,timestamptz) to authenticated;

create or replace function public.calculate_donut_offer(p_lines jsonb,p_tuesday boolean,p_enabled text[])
returns jsonb language sql stable set search_path='' as $$
 with lines as (
   select x->>'variant_id' as variant_id,x->>'category' as category,
     (x->>'quantity')::integer as quantity,(x->>'unit_price')::numeric as price
   from jsonb_array_elements(p_lines) x
 ), units as (
   select l.*,n from lines l cross join lateral generate_series(1,l.quantity) n where category='donuts'
     and not exists (
       select 1 from public.product_variants v join public.products p on p.id=v.product_id
       where v.id::text=l.variant_id
         and (p.slug='donuts-mini-donut-bites'
           or (p.slug || ' ' || p.name) ~* '(^|[^a-z])mini([^a-z]|$)|ميني')
     )
 ), counts as (select count(*)::integer as n from units),
 active as (
   select s.code,s.buy_quantity as buy,s.free_quantity as free,s.code='daily' as restricted,
     case s.code when 'daily' then 1 when 'tuesday' then 2 when 'buy6get2' then 3 when 'buy7get3' then 4 when 'buy8get4' then 5 when 'buy6get6' then 6 else 7 end as priority
   from public.shared_offers s where s.code=any(p_enabled) and s.buy_quantity is not null
     and public.offer_schedule_active(s.weekdays,s.start_time,s.end_time,s.starts_on,s.ends_on,now())
 ), ranked as (
   select a.code,a.buy,a.free,a.priority,u.variant_id,u.price,
     row_number() over(partition by a.code order by
       case when a.restricted then -u.price else u.price end,u.variant_id,u.n) as rank
   from active a cross join units u where not a.restricted or u.price in (6,7)
 ), free_candidates as (
   select * from ranked where rank <= (select n/(buy+free)*free from counts)
 ), savings as (
   select code,sum(price) as discount,min(priority) as priority from free_candidates group by code
 ), chosen as (
   select code,discount from savings where discount>0 order by discount desc,priority,code limit 1
 ), free as (
   select variant_id from free_candidates where code=(select code from chosen)
 )
 select jsonb_build_object('subtotal',coalesce(sum(l.price*l.quantity),0),
   'discount',coalesce((select discount from chosen),0),'offer_code',(select code from chosen),
   'total',coalesce(sum(l.price*l.quantity),0)-coalesce((select discount from chosen),0),
   'is_tuesday',p_tuesday,'enabled_offers',coalesce((select jsonb_agg(code order by priority,code) from active),'[]'::jsonb),
   'offer_rules',coalesce((select jsonb_agg(jsonb_build_object('code',code,'buy',buy,'free',free,'eligiblePrices',case when restricted then '[6,7]'::jsonb else null end)) from active),'[]'::jsonb),
   'lines',coalesce(jsonb_agg(jsonb_build_object('variant_id',l.variant_id,'unit_price',l.price,'quantity',l.quantity,
     'free_quantity',(select count(*) from free f where f.variant_id=l.variant_id))),'[]'::jsonb)) from lines l;
$$;
revoke all on function public.calculate_donut_offer(jsonb,boolean,text[]) from public,anon,authenticated;

notify pgrst, 'reload schema';
commit;
