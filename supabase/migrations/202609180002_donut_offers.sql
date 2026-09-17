begin;
alter table public.orders add column offer_code text;
alter table public.orders add column discount numeric(12,2) not null default 0 check(discount>=0);
alter table public.order_items add column free_quantity integer not null default 0 check(free_quantity between 0 and quantity);
grant select(offer_code,discount) on public.orders to authenticated;

-- Internal calculator. Only trusted, server-priced lines reach this function.
create function public.calculate_donut_offer(p_lines jsonb, p_tuesday boolean)
returns jsonb language sql immutable set search_path='' as $$
 with lines as (
   select x->>'variant_id' as variant_id, x->>'category' as category,
     (x->>'quantity')::integer as quantity, (x->>'unit_price')::numeric as price
   from jsonb_array_elements(p_lines) x
 ), units as (
   select l.*, n from lines l cross join lateral generate_series(1,l.quantity) n where category='donuts'
 ), counts as (select count(*)::integer as n from units),
 daily as (
   select *,row_number() over(order by price desc,variant_id,n) as rank from units where price in (6,7)
 ), tuesday as (
   select *,row_number() over(order by price,variant_id,n) as rank from units
 ), savings as (
   select coalesce((select sum(price) from daily where rank <= (select n/6 from counts)),0) as daily,
     case when p_tuesday then coalesce((select sum(price) from tuesday where rank <= (select (n/12)*5 from counts)),0) else 0 end as tuesday
 ), chosen as (
   select case when tuesday>daily then 'tuesday' when daily>0 then 'daily' else null end as code,
     greatest(daily,tuesday) as discount from savings
 ), free as (
   select variant_id from daily where rank <= (select n/6 from counts) and (select code from chosen)='daily'
   union all
   select variant_id from tuesday where rank <= (select (n/12)*5 from counts) and (select code from chosen)='tuesday'
 )
 select jsonb_build_object('subtotal',coalesce(sum(l.price*l.quantity),0),
   'discount',(select discount from chosen), 'offer_code',(select code from chosen),
   'total',coalesce(sum(l.price*l.quantity),0)-(select discount from chosen),
   'is_tuesday',p_tuesday,
   'lines',coalesce(jsonb_agg(jsonb_build_object('variant_id',l.variant_id,'unit_price',l.price,'quantity',l.quantity,
     'free_quantity',(select count(*) from free f where f.variant_id=l.variant_id))), '[]'::jsonb)) from lines l;
$$;
revoke all on function public.calculate_donut_offer(jsonb,boolean) from public,anon,authenticated;

create function public.get_guest_order_quote(p_branch uuid,p_items jsonb)
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
 result:=public.calculate_donut_offer(lines,extract(isodow from now() at time zone 'Asia/Hebron')=2);
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

commit;
