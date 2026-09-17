begin;
alter table public.branches add column delivery_enabled boolean not null default false;
alter table public.branches add column delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0);
create sequence public.order_number_seq start 1001;
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 request_payload jsonb not null,
 branch_id uuid not null references public.branches(id),
 order_number text not null unique,
 customer_name text not null,
 phone text not null,
 fulfillment text not null check (fulfillment in ('pickup','delivery')),
 address text not null default '', notes text not null default '',
 payment_method text not null default 'cash' check (payment_method='cash'),
 delivery_fee numeric(10,2) not null,
 total numeric(12,2) not null,
 status text not null default 'new' check (status in ('new','preparing','ready','completed','cancelled')),
 created_at timestamptz not null default now()
);
create index orders_branch_date on public.orders(branch_id,created_at desc);
create index orders_phone_date on public.orders(phone,created_at desc);
create table public.order_items (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.orders(id),
 variant_id uuid not null references public.product_variants(id),
 name text not null, size text not null,
 quantity integer not null check (quantity between 1 and 99),
 unit_price numeric(10,2) not null,
 tracks_stock boolean not null,
 unique(order_id,variant_id)
);
create table public.order_events (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.orders(id),
 actor_id uuid references auth.users(id),
 status text not null, created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
revoke all on public.orders,public.order_items,public.order_events from anon,authenticated;
-- Private payload and retry token are never exposed to staff or guests through SELECT.
grant select(id,branch_id,order_number,customer_name,phone,fulfillment,address,notes,payment_method,delivery_fee,total,status,created_at) on public.orders to authenticated;
grant select on public.order_items,public.order_events to authenticated;
create function public.can_handle_orders(p_branch uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active
 and (s.role='owner' or (s.role in ('manager','order_staff') and exists
 (select 1 from public.staff_branches b where b.user_id=s.user_id and b.branch_id=p_branch))));
$$;
revoke all on function public.can_handle_orders(uuid) from public,anon;
grant execute on function public.can_handle_orders(uuid) to authenticated;
create policy branch_orders on public.orders for select to authenticated using(public.can_handle_orders(branch_id));
create policy branch_order_items on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id));
create policy branch_order_events on public.order_events for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id));

create function public.place_guest_order(p_request_id uuid,p_branch uuid,p_items jsonb,p_customer jsonb,p_expected_total numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 old_order public.orders%rowtype; b public.branches%rowtype; payload jsonb;
 entry record; item record; new_id uuid; number text; total_amount numeric:=0;
 fee numeric:=0; customer text; phone_number text; kind text; delivery_address text; customer_notes text;
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
 total_amount:=total_amount+fee;
 if total_amount<>p_expected_total then raise exception 'PRICE_CHANGED'; end if;
 number:=b.code||'-'||nextval('public.order_number_seq');
 insert into public.orders(request_id,request_payload,branch_id,order_number,customer_name,phone,fulfillment,address,notes,delivery_fee,total)
 values(p_request_id,payload,p_branch,number,customer,phone_number,kind,delivery_address,customer_notes,fee,total_amount) returning id into new_id;
 for entry in select (x->>'variant_id')::uuid as variant_id,(x->>'quantity')::integer as quantity from jsonb_array_elements(p_items) x order by 1 loop
   select i.*,p.name,p.category,v.size,coalesce(i.price_override,v.price) as price into item from public.branch_inventory i
   join public.product_variants v on v.id=i.variant_id join public.products p on p.id=v.product_id where i.branch_id=p_branch and i.variant_id=entry.variant_id;
   insert into public.order_items(order_id,variant_id,name,size,quantity,unit_price,tracks_stock)
   values(new_id,entry.variant_id,item.name,item.size,entry.quantity,item.price,item.category='donuts');
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

create function public.set_order_status(p_order uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; line record; stock public.branch_inventory%rowtype;
begin
 select * into o from public.orders where id=p_order for update;
 if not found or not public.can_handle_orders(o.branch_id) then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_status=o.status then return; end if;
 if p_status is null or not ((o.status='new' and p_status in ('preparing','cancelled')) or
 (o.status='preparing' and p_status in ('ready','cancelled')) or (o.status='ready' and p_status in ('completed','cancelled'))) then raise exception 'INVALID_TRANSITION'; end if;
 if p_status='cancelled' then
   for line in select * from public.order_items where order_id=o.id and tracks_stock order by variant_id loop
     select * into stock from public.branch_inventory where branch_id=o.branch_id and variant_id=line.variant_id for update;
     update public.branch_inventory set quantity=quantity+line.quantity where branch_id=o.branch_id and variant_id=line.variant_id;
     insert into public.inventory_events(branch_id,variant_id,actor_id,delta,reason,action,quantity_after,unavailable_after)
     values(o.branch_id,line.variant_id,auth.uid(),line.quantity,o.order_number,'order_cancelled',stock.quantity+line.quantity,stock.manual_unavailable);
   end loop;
 end if;
 update public.orders set status=p_status where id=o.id;
 insert into public.order_events(order_id,actor_id,status) values(o.id,auth.uid(),p_status);
end;
$$;
revoke all on function public.set_order_status(uuid,text) from public,anon;
grant execute on function public.set_order_status(uuid,text) to authenticated;
commit;
