begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_upload_product_image()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff_profiles s
    where s.user_id = auth.uid() and s.active and
      (s.role = 'owner' or (s.role = 'manager' and exists (
        select 1 from public.staff_branches sb join public.branches b on b.id = sb.branch_id
        where sb.user_id = s.user_id and b.active
      )))
  );
$$;
revoke all on function public.can_upload_product_image() from public, anon;
grant execute on function public.can_upload_product_image() to authenticated;

drop policy if exists public_product_images on storage.objects;
create policy public_product_images on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
drop policy if exists staff_upload_product_images on storage.objects;
create policy staff_upload_product_images on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.can_upload_product_image()
    and name ~ '^[0-9a-f-]{36}\.(jpg|png|webp|gif)$');

create or replace function public.create_catalog_product(
  p_name text,
  p_category text,
  p_subgroup text,
  p_description_ar text,
  p_description_en text,
  p_image_path text,
  p_price numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  new_product uuid;
  new_variant uuid;
  product_slug text;
begin
  if not public.can_upload_product_image() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) < 2 or length(p_name) > 100
     or p_category is null or p_category not in ('donuts','hot','cold','blends')
     or p_description_ar is null or length(trim(p_description_ar)) = 0 or length(p_description_ar) > 500
     or p_description_en is null or length(trim(p_description_en)) = 0 or length(p_description_en) > 500
     or p_price is null or p_price < 0 or p_price > 9999.99 or p_price <> round(p_price, 2)
     or p_image_path is null or p_image_path not like '%/storage/v1/object/public/product-images/%'
     or p_subgroup is null then
    raise exception 'Invalid product details' using errcode = '22023';
  end if;
  if not ((p_category = 'donuts' and p_subgroup = 'donuts')
      or (p_category = 'hot' and p_subgroup = 'hot')
      or (p_category = 'cold' and p_subgroup in ('cold','mojito'))
      or (p_category = 'blends' and p_subgroup in ('frappe','smoothies'))) then
    raise exception 'Invalid product section' using errcode = '22023';
  end if;

  product_slug := 'custom-' || p_subgroup || '-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.products (slug, name, category, description_ar, description_en, image_path, sort_order, active)
    values (product_slug, trim(p_name), p_category, trim(p_description_ar), trim(p_description_en), p_image_path,
      coalesce((select max(sort_order) + 1 from public.products where category = p_category), 0), true)
    returning id into new_product;
  insert into public.product_variants (product_id, size, price)
    values (new_product, 'standard', p_price) returning id into new_variant;
  insert into public.branch_inventory (branch_id, variant_id, quantity, carried, manual_unavailable)
    select id, new_variant, 0, true, false from public.branches where active;
  return new_product;
end;
$$;
revoke all on function public.create_catalog_product(text,text,text,text,text,text,numeric) from public, anon;
grant execute on function public.create_catalog_product(text,text,text,text,text,text,numeric) to authenticated;

commit;
