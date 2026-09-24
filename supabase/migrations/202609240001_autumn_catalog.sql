-- Seasonal catalog additions. Apply after deploying the matching public/assets files.

-- Existing product IDs, stock, availability and order history are preserved.

begin;

insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('donuts-peanut-butter-jam','Peanut Butter & Jam','donuts','دونات بزبدة الفول السوداني والمربّى','A donut with peanut butter and jam','/assets/donuts/37-peanut-butter-jam.png',(select coalesce(max(sort_order),-1)+1 from public.products where category='donuts'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;

insert into public.product_variants (product_id,size,price) select id,'standard',10 from public.products where slug='donuts-peanut-butter-jam' on conflict (product_id,size) do update set price=excluded.price;

insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('donuts-halawa','Halawa','donuts','دونات بالحلاوة والفستق','A donut topped with halawa and pistachios','/assets/donuts/38-halawa.png',(select coalesce(max(sort_order),-1)+1 from public.products where category='donuts'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;

insert into public.product_variants (product_id,size,price) select id,'standard',7 from public.products where slug='donuts-halawa' on conflict (product_id,size) do update set price=excluded.price;

insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('donuts-pumpkin','Pumpkin','donuts','دونات بنكهة اليقطين','A pumpkin-flavored donut','/assets/donuts/39-pumpkin.png',(select coalesce(max(sort_order),-1)+1 from public.products where category='donuts'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;

insert into public.product_variants (product_id,size,price) select id,'standard',10 from public.products where slug='donuts-pumpkin' on conflict (product_id,size) do update set price=excluded.price;

insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('hot-pumpkin-spice-latte','Pumpkin Spice Latte','hot','لاتيه ساخن بنكهة اليقطين والتوابل','A hot pumpkin spice latte','/assets/hot-drinks/Pumpkin Spice Latte.png',(select coalesce(max(sort_order),-1)+1 from public.products where category='hot'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;

insert into public.product_variants (product_id,size,price) select id,'standard',15 from public.products where slug='hot-pumpkin-spice-latte' on conflict (product_id,size) do update set price=excluded.price;

insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('hot-chai-pumpkin-spice','Chai Pumpkin Spice','hot','شاي ساخن بنكهة اليقطين والتوابل','Hot chai with pumpkin and spices','/assets/hot-drinks/Chai Pumpkin Spice.png',(select coalesce(max(sort_order),-1)+1 from public.products where category='hot'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;

insert into public.product_variants (product_id,size,price) select id,'standard',15 from public.products where slug='hot-chai-pumpkin-spice' on conflict (product_id,size) do update set price=excluded.price;

insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('hot-caramel-pumpkin-latte','Caramel Pumpkin Latte','hot','لاتيه ساخن بنكهة اليقطين والكراميل','A hot latte with pumpkin and caramel','/assets/hot-drinks/Caramel Pumpkin Latte.png',(select coalesce(max(sort_order),-1)+1 from public.products where category='hot'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;

insert into public.product_variants (product_id,size,price) select id,'standard',15 from public.products where slug='hot-caramel-pumpkin-latte' on conflict (product_id,size) do update set price=excluded.price;

insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('cold-ice-pumpkin-latte','Ice Pumpkin Latte','cold','لاتيه بارد بنكهة اليقطين','An iced pumpkin latte','/assets/cold-drinks/Ice Pumpkin Latte.png',(select coalesce(max(sort_order),-1)+1 from public.products where category='cold'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;

insert into public.product_variants (product_id,size,price) select id,'standard',16 from public.products where slug='cold-ice-pumpkin-latte' on conflict (product_id,size) do update set price=excluded.price;

insert into public.products (slug,name,category,description_ar,description_en,image_path,sort_order)
values ('cold-ice-pumpkin','Ice Pumpkin','cold','مشروب اليقطين البارد بالكريمة والتوابل','A chilled pumpkin drink with cream and spices','/assets/cold-drinks/Ice Pumpkin.png',(select coalesce(max(sort_order),-1)+1 from public.products where category='cold'))
on conflict (slug) do update set name=excluded.name,description_ar=excluded.description_ar,description_en=excluded.description_en,image_path=excluded.image_path;

insert into public.product_variants (product_id,size,price) select id,'standard',15 from public.products where slug='cold-ice-pumpkin' on conflict (product_id,size) do update set price=excluded.price;

-- Match the requested prices even where this product has a branch override.
update public.branch_inventory i set price_override=v.price
from public.product_variants v join public.products p on p.id=v.product_id
where i.variant_id=v.id and v.size='standard' and i.price_override is not null and p.slug in ('donuts-peanut-butter-jam','donuts-halawa','donuts-pumpkin','hot-pumpkin-spice-latte','hot-chai-pumpkin-spice','hot-caramel-pumpkin-latte','cold-ice-pumpkin-latte','cold-ice-pumpkin');

-- New donuts start at zero stock; staff enter actual quantities. Icon Mall carries donuts only.
insert into public.branch_inventory (branch_id,variant_id,quantity,carried,manual_unavailable)
select b.id,v.id,0,true,false from public.branches b cross join public.product_variants v join public.products p on p.id=v.product_id
where b.active and p.slug in ('donuts-peanut-butter-jam','donuts-halawa','donuts-pumpkin','hot-pumpkin-spice-latte','hot-chai-pumpkin-spice','hot-caramel-pumpkin-latte','cold-ice-pumpkin-latte','cold-ice-pumpkin') and (b.code <> 'ICON' or p.category='donuts')
on conflict (branch_id,variant_id) do nothing;

commit;
