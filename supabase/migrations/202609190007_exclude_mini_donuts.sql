-- Resolve excluded products from the catalog, never from client-provided eligibility.
-- Mini donuts remain paid order lines but never count or become free.
begin;
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

commit;
