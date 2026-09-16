-- Foundation only: checkout and all staff mutations require later migrations.
begin;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('donuts', 'hot', 'cold', 'blends')),
  description_ar text not null default '',
  description_en text not null default '',
  image_path text,
  sort_order integer not null default 0,
  active boolean not null default true
);

-- Each size is a separate sellable variant with its own stock and price.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  size text not null default 'standard',
  price numeric(10,2) not null check (price >= 0),
  unique (product_id, size)
);

create table public.branch_inventory (
  branch_id uuid not null references public.branches(id),
  variant_id uuid not null references public.product_variants(id),
  quantity integer not null default 0 check (quantity >= 0),
  carried boolean not null default true,
  manual_unavailable boolean not null default false,
  price_override numeric(10,2) check (price_override >= 0),
  primary key (branch_id, variant_id)
);

create table public.staff_profiles (
  user_id uuid primary key references auth.users(id),
  name text not null,
  role text not null check (role in ('owner', 'manager', 'order_staff')),
  active boolean not null default true
);

create table public.staff_branches (
  user_id uuid not null references public.staff_profiles(user_id),
  branch_id uuid not null references public.branches(id),
  primary key (user_id, branch_id)
);

create table public.inventory_events (
  id bigint generated always as identity primary key,
  branch_id uuid not null,
  variant_id uuid not null,
  actor_id uuid references auth.users(id),
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  foreign key (branch_id, variant_id) references public.branch_inventory(branch_id, variant_id)
);

alter table public.branches enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.branch_inventory enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.staff_branches enable row level security;
alter table public.inventory_events enable row level security;

-- No client may mutate inventory or assign themselves a staff role.
revoke all on public.branches, public.products, public.product_variants,
  public.branch_inventory, public.staff_profiles, public.staff_branches,
  public.inventory_events from anon, authenticated;
grant select on public.branches, public.products, public.product_variants,
  public.branch_inventory to anon, authenticated;
grant select on public.staff_profiles, public.staff_branches to authenticated;

create policy branches_read on public.branches for select to anon, authenticated using (active);
create policy products_read on public.products for select to anon, authenticated using (active);
create policy variants_read on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.active));
create policy inventory_read on public.branch_inventory for select to anon, authenticated
  using (carried
    and exists (select 1 from public.branches b where b.id = branch_id and b.active)
    and exists (select 1 from public.product_variants v where v.id = variant_id));
create policy own_profile on public.staff_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy own_assignments on public.staff_branches for select to authenticated
  using (user_id = (select auth.uid()));

insert into public.branches (code, name_ar, name_en, sort_order) values
  ('NAB', 'نابلس', 'Nablus', 1),
  ('ICON', 'Icon Mall', 'Icon Mall', 2),
  ('TERI', 'الطيرة', 'Teri', 3);

commit;
