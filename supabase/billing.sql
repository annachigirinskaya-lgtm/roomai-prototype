-- Run once in the existing Supabase project's SQL Editor after schema.sql.
-- Users can read their billing balance, but only the server can change it.
drop policy if exists "profiles own" on public.profiles;
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select to authenticated using (auth.uid() = id);

create unique index if not exists credit_transactions_stripe_session_unique
  on public.credit_transactions(stripe_session_id) where stripe_session_id is not null;

create table if not exists public.stripe_invoice_fulfillments (
  invoice_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.stripe_invoice_fulfillments enable row level security;

create or replace function public.fulfill_credit_pack(
  p_user_id uuid, p_customer_id text, p_session_id text, p_pack text, p_credits integer
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_transaction_id uuid;
begin
  if p_credits <= 0 or p_credits > 100 or p_session_id is null then raise exception 'Invalid credit pack'; end if;
  perform 1 from public.profiles where id = p_user_id and stripe_customer_id = p_customer_id for update;
  if not found then raise exception 'Billing customer mismatch'; end if;
  insert into public.credit_transactions(user_id, amount, kind, stripe_session_id, note)
    values (p_user_id, p_credits, 'topup', p_session_id, 'Purchased ' || p_pack)
    on conflict do nothing returning id into v_transaction_id;
  if v_transaction_id is null then return false; end if;
  update public.profiles set purchased_credits = purchased_credits + p_credits where id = p_user_id;
  return true;
end; $$;

create or replace function public.fulfill_subscription_invoice(
  p_customer_id text, p_invoice_id text, p_plan text, p_credits integer
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_user_id uuid; v_invoice_id text;
begin
  if p_plan not in ('weekly','monthly','yearly') or p_credits < 0 or p_invoice_id is null then raise exception 'Invalid subscription invoice'; end if;
  select id into v_user_id from public.profiles where stripe_customer_id = p_customer_id for update;
  if v_user_id is null then raise exception 'Billing customer not found'; end if;
  insert into public.stripe_invoice_fulfillments(invoice_id,user_id)
    values (p_invoice_id,v_user_id) on conflict do nothing returning invoice_id into v_invoice_id;
  if v_invoice_id is null then return false; end if;
  update public.profiles set plan = p_plan, subscription_credits = p_credits, period_started_at = now() where id = v_user_id;
  return true;
end; $$;

revoke all on function public.fulfill_credit_pack(uuid,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.fulfill_subscription_invoice(text,text,text,integer) from public, anon, authenticated;
grant execute on function public.fulfill_credit_pack(uuid,text,text,text,integer) to service_role;
grant execute on function public.fulfill_subscription_invoice(text,text,text,integer) to service_role;
