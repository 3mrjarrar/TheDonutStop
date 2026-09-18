begin;

create table public.branch_offers (
  branch_id uuid not null references public.branches(id) on delete cascade,
  code text not null check (code in ('daily','tuesday','morning','buy6get2','buy7get3','buy8get4','buy6get6')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (branch_id, code)
);
alter table public.branch_offers enable row level security;
revoke all on public.branch_offers from public, anon, authenticated;
grant select on public.branch_offers to anon, authenticated;
create policy public_branch_offers on public.branch_offers for select to anon,authenticated
  using (exists(select 1 from public.branches b where b.id=branch_id and b.active));

-- Preserve existing offers; new campaigns always start disabled.
insert into public.branch_offers(branch_id,code,enabled)
select b.id,o.code,o.code in ('daily','tuesday','morning') from public.branches b
cross join (values ('daily'),('tuesday'),('morning'),('buy6get2'),('buy7get3'),('buy8get4'),('buy6get6')) o(code);
create function public.initialize_branch_offers() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.branch_offers(branch_id,code,enabled)
  select new.id,o.code,false from (values ('daily'),('tuesday'),('morning'),('buy6get2'),('buy7get3'),('buy8get4'),('buy6get6')) o(code);
  return new;
end;
$$;
revoke all on function public.initialize_branch_offers() from public,anon,authenticated;
create trigger initialize_branch_offers after insert on public.branches
for each row execute function public.initialize_branch_offers();

create table public.offer_events (
  id bigint generated always as identity primary key,
  branch_id uuid not null references public.branches(id),
  code text not null,
  enabled boolean not null,
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.offer_events enable row level security;
revoke all on public.offer_events from public,anon,authenticated;
grant select on public.offer_events to authenticated;
create policy managed_offer_events on public.offer_events for select to authenticated
using (public.can_manage_inventory(branch_id));

create function public.set_branch_offer(p_branch uuid,p_code text,p_enabled boolean,p_expected_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare current_enabled boolean; owner boolean;
begin
  select exists(select 1 from public.staff_profiles where user_id=auth.uid() and active and role='owner') into owner;
  if not public.can_manage_inventory(p_branch) or
     (not owner and p_code not in ('buy6get2','buy7get3','buy8get4','buy6get6')) then
    raise exception 'Not authorized' using errcode='42501';
  end if;
  if p_enabled is null or p_expected_enabled is null then raise exception 'Invalid state'; end if;
  if not exists(select 1 from public.branches where id=p_branch and active) then raise exception 'Branch unavailable'; end if;
  select enabled into current_enabled from public.branch_offers where branch_id=p_branch and code=p_code for update;
  if not found then raise exception 'Offer not found'; end if;
  -- Repeating a successfully applied toggle is harmless.
  if current_enabled=p_enabled then return; end if;
  if current_enabled is distinct from p_expected_enabled then raise exception 'Offer changed' using errcode='40001'; end if;
  update public.branch_offers set enabled=p_enabled,updated_at=clock_timestamp() where branch_id=p_branch and code=p_code;
  insert into public.offer_events(branch_id,code,enabled,actor_id) values(p_branch,p_code,p_enabled,auth.uid());
end;
$$;
revoke all on function public.set_branch_offer(uuid,text,boolean,boolean) from public,anon;
grant execute on function public.set_branch_offer(uuid,text,boolean,boolean) to authenticated;

-- The calculator receives only server-priced lines and server-enabled offer codes.
create function public.calculate_donut_offer(p_lines jsonb,p_tuesday boolean,p_enabled text[])
returns jsonb language sql immutable set search_path='' as $$
 with lines as (
   select x->>'variant_id' as variant_id,x->>'category' as category,
     (x->>'quantity')::integer as quantity,(x->>'unit_price')::numeric as price
   from jsonb_array_elements(p_lines) x
 ), units as (
   select l.*,n from lines l cross join lateral generate_series(1,l.quantity) n where category='donuts'
 ), counts as (select count(*)::integer as n from units),
 rules(code,buy,free,restricted,priority) as (
   values ('daily',5,1,true,1),('tuesday',7,5,false,2),('buy6get2',6,2,false,3),
     ('buy7get3',7,3,false,4),('buy8get4',8,4,false,5),('buy6get6',6,6,false,6)
 ), active as (
   select * from rules where code=any(p_enabled) and (code<>'tuesday' or p_tuesday)
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
   select code,discount from savings where discount>0 order by discount desc,priority limit 1
 ), free as (
   select variant_id from free_candidates where code=(select code from chosen)
 )
 select jsonb_build_object('subtotal',coalesce(sum(l.price*l.quantity),0),
   'discount',coalesce((select discount from chosen),0),'offer_code',(select code from chosen),
   'total',coalesce(sum(l.price*l.quantity),0)-coalesce((select discount from chosen),0),
   'is_tuesday',p_tuesday,'enabled_offers',coalesce(to_jsonb(p_enabled),'[]'::jsonb),
   'lines',coalesce(jsonb_agg(jsonb_build_object('variant_id',l.variant_id,'unit_price',l.price,'quantity',l.quantity,
     'free_quantity',(select count(*) from free f where f.variant_id=l.variant_id))),'[]'::jsonb)) from lines l;
$$;
revoke all on function public.calculate_donut_offer(jsonb,boolean,text[]) from public,anon,authenticated;

create or replace function public.get_guest_order_quote(p_branch uuid,p_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry record; item record; lines jsonb:='[]'; result jsonb; b public.branches%rowtype;
begin
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_ITEMS'; end if;
 if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'INVALID_ITEMS'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x) is distinct from 'object'
   or coalesce(x->>'quantity','') !~ '^[1-9][0-9]?$' or coalesce(x->>'variant_id','') !~ '^[0-9a-fA-F-]{36}$') then raise exception 'INVALID_ITEMS'; end if;
 if (select count(distinct (x->>'variant_id')::uuid) from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'DUPLICATE_ITEM'; end if;
 select * into b from public.branches where id=p_branch and active;
 if not found then raise exception 'BRANCH_UNAVAILABLE'; end if;
 for entry in select (x->>'variant_id')::uuid as id,(x->>'quantity')::integer as quantity from jsonb_array_elements(p_items) x loop
   select p.category,coalesce(i.price_override,v.price) as price,i.quantity,i.manual_unavailable into item
   from public.branch_inventory i join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id
   where i.branch_id=p_branch and i.variant_id=entry.id and i.carried and p.active;
   if not found then raise exception 'ITEM_UNAVAILABLE'; end if;
   if item.manual_unavailable or (item.category='donuts' and item.quantity<entry.quantity) then raise exception 'ITEM_UNAVAILABLE'; end if;
   lines:=lines||jsonb_build_array(jsonb_build_object('variant_id',entry.id,'category',item.category,'quantity',entry.quantity,'unit_price',item.price));
 end loop;
 result:=public.calculate_donut_offer(lines,extract(isodow from now() at time zone 'Asia/Hebron')=2,
   array(select code from public.branch_offers where branch_id=p_branch and enabled order by code));
 return result||jsonb_build_object('delivery_fee',b.delivery_fee,'delivery_enabled',b.delivery_enabled);
end;
$$;
revoke all on function public.get_guest_order_quote(uuid,jsonb) from public;
grant execute on function public.get_guest_order_quote(uuid,jsonb) to anon,authenticated;

create or replace function public.place_guest_order(p_request_id uuid,p_branch uuid,p_items jsonb,p_customer jsonb,p_expected_total numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 old_order public.orders%rowtype; b public.branches%rowtype; payload jsonb;
 entry record; item record; new_id uuid; number text; total_amount numeric:=0;
 quote jsonb; fee numeric:=0; customer text; phone_number text; kind text; delivery_address text; customer_notes text;
begin
 if p_request_id is null or p_branch is null or p_expected_total is null then raise exception 'INVALID_ORDER'; end if;
 payload:=jsonb_build_object('branch',p_branch,'items',p_items,'customer',p_customer,'total',p_expected_total);
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into old_order from public.orders where request_id=p_request_id;
 if found then
   if old_order.request_payload<>payload then raise exception 'REQUEST_CONFLICT'; end if;
   return jsonb_build_object('order_number',old_order.order_number,'total',old_order.total);
 end if;
 if jsonb_typeof(p_customer) is distinct from 'object' or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_ORDER'; end if;
 if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'INVALID_ITEMS'; end if;
 customer:=trim(p_customer->>'name');
 phone_number:=regexp_replace(p_customer->>'phone','[[:space:]()-]','','g');
 kind:=p_customer->>'fulfillment'; delivery_address:=trim(coalesce(p_customer->>'address',''));
 customer_notes:=trim(coalesce(p_customer->>'notes',''));
 if customer is null or length(customer) not between 2 and 100 or phone_number is null or phone_number !~ '^\+?[0-9]{8,15}$'
 or kind is null or kind not in ('pickup','delivery') or length(delivery_address)>500 or length(customer_notes)>1000
 or p_customer->>'payment_method' is distinct from 'cash' then raise exception 'INVALID_CUSTOMER'; end if;
 select * into b from public.branches where id=p_branch and active for share;
 if not found then raise exception 'BRANCH_UNAVAILABLE'; end if;
 if kind='delivery' then
   if not b.delivery_enabled then raise exception 'DELIVERY_UNAVAILABLE'; end if;
   if length(delivery_address)<5 then raise exception 'INVALID_ADDRESS'; end if;
   fee:=b.delivery_fee;
 else delivery_address:=''; end if;
 -- Bound accidental repeated orders per phone; production abuse protection can add a verified challenge upstream.
 perform pg_advisory_xact_lock(hashtextextended(phone_number,1));
 if (select count(*) from public.orders where phone=phone_number and created_at>now()-interval '15 minutes')>=5 then raise exception 'TOO_MANY_ORDERS'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x) is distinct from 'object'
 or coalesce(x->>'quantity','') !~ '^[1-9][0-9]?$' or coalesce(x->>'variant_id','') !~ '^[0-9a-fA-F-]{36}$') then raise exception 'INVALID_ITEMS'; end if;
 if (select count(distinct (x->>'variant_id')::uuid) from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'DUPLICATE_ITEM'; end if;
 -- Lock all stock in deterministic order. Cancellation and inventory edits use the same rows.
 for entry in select (x->>'variant_id')::uuid as variant_id,(x->>'quantity')::integer as quantity from jsonb_array_elements(p_items) x order by 1 loop
   select i.*,p.name,p.category,v.size,coalesce(i.price_override,v.price) as price into item
   from public.branch_inventory i join public.product_variants v on v.id=i.variant_id
   join public.products p on p.id=v.product_id
   where i.branch_id=p_branch and i.variant_id=entry.variant_id and i.carried and p.active
   for update of i for share of v,p;
   if not found then raise exception 'ITEM_UNAVAILABLE'; end if;
   if item.manual_unavailable or (item.category='donuts' and item.quantity<entry.quantity) then raise exception 'ITEM_UNAVAILABLE: %',item.name; end if;
   total_amount:=total_amount+item.price*entry.quantity;
 end loop;
 -- Keep offer settings stable until the order transaction commits.
 perform 1 from public.branch_offers where branch_id=p_branch order by code for share;
 quote:=public.get_guest_order_quote(p_branch,p_items);
 total_amount:=(quote->>'total')::numeric+fee;
 if total_amount<>p_expected_total then raise exception 'PRICE_CHANGED'; end if;
 number:=b.code||'-'||nextval('public.order_number_seq');
 insert into public.orders(request_id,request_payload,branch_id,order_number,customer_name,phone,fulfillment,address,notes,delivery_fee,total,offer_code,discount)
 values(p_request_id,payload,p_branch,number,customer,phone_number,kind,delivery_address,customer_notes,fee,total_amount,quote->>'offer_code',(quote->>'discount')::numeric) returning id into new_id;
 for entry in select (x->>'variant_id')::uuid as variant_id,(x->>'quantity')::integer as quantity from jsonb_array_elements(p_items) x order by 1 loop
   select i.*,p.name,p.category,v.size,coalesce(i.price_override,v.price) as price into item from public.branch_inventory i
   join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id where i.branch_id=p_branch and i.variant_id=entry.variant_id;
   insert into public.order_items(order_id,variant_id,name,size,quantity,unit_price,tracks_stock,free_quantity)
   values(new_id,entry.variant_id,item.name,item.size,entry.quantity,item.price,item.category='donuts',coalesce((select (x->>'free_quantity')::integer from jsonb_array_elements(quote->'lines') x where x->>'variant_id'=entry.variant_id::text),0));
   if item.category='donuts' then
     update public.branch_inventory set quantity=quantity-entry.quantity where branch_id=p_branch and variant_id=entry.variant_id;
     insert into public.inventory_events(branch_id,variant_id,delta,reason,action,quantity_after,unavailable_after)
     values(p_branch,entry.variant_id,-entry.quantity,number,'order_reserved',item.quantity-entry.quantity,item.manual_unavailable);
   end if;
 end loop;
 insert into public.order_events(order_id,status) values(new_id,'new');
 return jsonb_build_object('order_number',number,'total',total_amount);
end;
$$;
revoke all on function public.place_guest_order(uuid,uuid,jsonb,jsonb,numeric) from public;
grant execute on function public.place_guest_order(uuid,uuid,jsonb,jsonb,numeric) to anon,authenticated;


drop function public.calculate_donut_offer(jsonb,boolean);
-- Supabase realtime gives open storefronts and carts immediate invalidation.
-- Polling remains a fallback when realtime is unavailable.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
   select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='branch_offers'
 ) then alter publication supabase_realtime add table public.branch_offers; end if;
end $$;
commit;
