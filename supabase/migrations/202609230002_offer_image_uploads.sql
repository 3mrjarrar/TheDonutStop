begin;

-- Storage validates MIME types and size independently of browser validation.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('offer-images','offer-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.can_upload_offer_image()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_profiles s where s.user_id=auth.uid() and s.active and
   (s.role='owner' or (s.role='manager' and exists(select 1 from public.staff_branches sb
     join public.branches b on b.id=sb.branch_id where sb.user_id=s.user_id and b.active))));
$$;
revoke all on function public.can_upload_offer_image() from public,anon;
grant execute on function public.can_upload_offer_image() to authenticated;

drop policy if exists public_offer_images on storage.objects;
create policy public_offer_images on storage.objects for select to anon,authenticated
using (bucket_id='offer-images');
drop policy if exists staff_upload_offer_images on storage.objects;
create policy staff_upload_offer_images on storage.objects for insert to authenticated
with check (bucket_id='offer-images' and public.can_upload_offer_image()
  and name ~ '^[0-9a-f-]{36}\.(jpg|png|webp|gif)$');
-- Unique immutable filenames prevent replacing an image used by another offer.
commit;
