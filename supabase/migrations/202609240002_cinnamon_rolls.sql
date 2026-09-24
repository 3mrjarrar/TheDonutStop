-- Deploy public/assets/donuts/40-cinnamon-rolls.png before applying.
begin;
insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('donuts-cinnamon-rolls','Cinnamon Rolls','donuts','رول القرفة بطبقة جليز حلوة وخفيفة','A cinnamon roll with a light, sweet glaze','/assets/donuts/40-cinnamon-rolls.png',
  (select coalesce(max(sort_order),-1)+1 from public.products where category='donuts'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;
insert into public.product_variants (product_id,size,price)
select id,'standard',8 from public.products where slug='donuts-cinnamon-rolls'
on conflict (product_id,size) do update set price=excluded.price;
update public.branch_inventory i set price_override=8
from public.product_variants v join public.products p on p.id=v.product_id
where i.variant_id=v.id and v.size='standard' and i.price_override is not null and p.slug='donuts-cinnamon-rolls';
-- Staff enter actual stock; existing quantities and availability are preserved.
insert into public.branch_inventory (branch_id,variant_id,quantity,carried,manual_unavailable)
select b.id,v.id,0,true,false from public.branches b cross join public.product_variants v join public.products p on p.id=v.product_id
where b.active and p.slug='donuts-cinnamon-rolls'
on conflict (branch_id,variant_id) do nothing;
commit;
