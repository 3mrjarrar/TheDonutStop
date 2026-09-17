begin;
-- The random request UUID is a guest-held capability, never exposed in staff SELECTs.
-- Return only display fields; customer details and order contents remain private.
create function public.get_guest_order_status(p_request_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
   'order_number', o.order_number, 'status', o.status,
   'fulfillment', o.fulfillment, 'total', o.total,
   'branch_name_ar', b.name_ar, 'branch_name_en', b.name_en
 ) from public.orders o join public.branches b on b.id=o.branch_id
 where o.request_id=p_request_id;
$$;
revoke all on function public.get_guest_order_status(uuid) from public;
grant execute on function public.get_guest_order_status(uuid) to anon,authenticated;
commit;
