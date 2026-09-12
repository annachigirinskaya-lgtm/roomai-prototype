create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  plan text not null default 'free' check (plan in ('free','weekly','monthly','yearly')),
  stripe_customer_id text,
  stripe_subscription_id text,
  generation_count integer not null default 0,
  subscription_credits integer not null default 5 check (subscription_credits >= 0),
  purchased_credits integer not null default 0 check (purchased_credits >= 0),
  period_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  room_type text not null,
  style text not null,
  color_palette text not null,
  custom_colors text,
  budget numeric(10,2) not null check (budget > 0),
  budget_mode text not null check (budget_mode in ('save','balanced','premium')),
  keep_items text default '', replace_items text default '', notes text default '',
  source_image_path text not null,
  source_image_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  generated_image_path text,
  generated_image_url text,
  estimated_total numeric(10,2) not null default 0,
  prompt text,
  created_at timestamptz not null default now()
);
create table if not exists public.design_products (
  id uuid primary key default gen_random_uuid(), design_id uuid not null references public.designs(id) on delete cascade,
  category text not null, title text not null, store text not null, price numeric(10,2) not null,
  image_url text, product_url text, affiliate_url text, description text, in_stock boolean default true
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  kind text not null check (kind in ('topup','generation','adjustment')),
  design_id uuid references public.designs(id) on delete set null,
  stripe_session_id text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  design_product_id uuid references public.design_products(id) on delete set null,
  store text not null, clicked_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.designs enable row level security;
alter table public.design_products enable row level security;
alter table public.credit_transactions enable row level security;
create policy "profiles own" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "projects own" on public.projects for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "designs own" on public.designs for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "products via own design" on public.design_products for select using (exists(select 1 from public.designs d where d.id=design_id and d.user_id=auth.uid()));
create policy "credit transactions own" on public.credit_transactions for select using (auth.uid()=user_id);
insert into storage.buckets (id,name,public) values ('room-images','room-images',false) on conflict (id) do nothing;
insert into storage.buckets (id,name,public) values ('generated-designs','generated-designs',false) on conflict (id) do nothing;
create policy "room uploads own folder" on storage.objects for all to authenticated using (bucket_id='room-images' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='room-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "generated own folder" on storage.objects for select to authenticated using (bucket_id='generated-designs' and (storage.foldername(name))[1]=auth.uid()::text);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
