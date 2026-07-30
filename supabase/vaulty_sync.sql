-- Vaulty cloud sync schema
-- Run this in the Supabase SQL editor for the project backing Vaulty sync.

create table if not exists public.vault_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection text not null check (collection in ('items', 'folders', 'pages', 'settings')),
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, collection, record_id)
);

alter table public.vault_records
drop constraint if exists vault_records_collection_check;

alter table public.vault_records
add constraint vault_records_collection_check
check (collection in ('items', 'folders', 'pages', 'settings'));

alter table public.vault_records enable row level security;

grant select, insert, update, delete on table public.vault_records to authenticated;
grant select, insert, update, delete on table public.vault_records to service_role;

create table if not exists public.sync_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'manual',
  plan text not null default 'sync_monthly',
  provider_customer_id text,
  provider_subscription_id text,
  provider_price_id text,
  status text not null default 'inactive',
  active_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.sync_entitlements
add column if not exists plan text not null default 'sync_monthly';

alter table public.sync_entitlements
alter column plan set default 'sync_monthly';

alter table public.sync_entitlements
add column if not exists provider_price_id text;

alter table public.sync_entitlements enable row level security;

grant select on table public.sync_entitlements to authenticated;
grant select, insert, update, delete on table public.sync_entitlements to service_role;

drop policy if exists "Users can read their own sync entitlement" on public.sync_entitlements;

create policy "Users can read their own sync entitlement"
on public.sync_entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.supporter_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'manual',
  provider_customer_id text,
  provider_checkout_session_id text,
  provider_subscription_id text,
  provider_price_id text,
  status text not null default 'inactive',
  active_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.supporter_entitlements enable row level security;

grant select on table public.supporter_entitlements to authenticated;
grant select, insert, update, delete on table public.supporter_entitlements to service_role;

drop policy if exists "Users can read their own supporter entitlement" on public.supporter_entitlements;

create policy "Users can read their own supporter entitlement"
on public.supporter_entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.has_sync_entitlement(target_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.sync_entitlements
    where user_id = target_user_id
      and plan in ('sync', 'sync_monthly', 'sync_yearly')
      and status in ('active', 'trialing')
      and (active_until is null or active_until > now())
  )
  or exists (
    select 1
    from public.supporter_entitlements
    where user_id = target_user_id
      and status in ('active', 'trialing')
      and (active_until is null or active_until > now())
  );
$$;

revoke all on function public.has_sync_entitlement(uuid) from public;
grant execute on function public.has_sync_entitlement(uuid) to authenticated;
grant execute on function public.has_sync_entitlement(uuid) to service_role;

create or replace function public.upsert_vault_records(records jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer := 0;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if records is null or jsonb_typeof(records) <> 'array' then
    raise exception 'records must be a JSON array.'
      using errcode = '22023';
  end if;

  insert into public.vault_records as existing (
    user_id,
    collection,
    record_id,
    payload,
    updated_at,
    deleted_at
  )
  select
    current_user_id,
    input.collection,
    input.record_id,
    coalesce(input.payload, '{}'::jsonb),
    coalesce(input.updated_at, now()),
    input.deleted_at
  from jsonb_to_recordset(records) as input(
    collection text,
    record_id text,
    payload jsonb,
    updated_at timestamptz,
    deleted_at timestamptz
  )
  where input.record_id is not null
    and input.record_id <> ''
  on conflict (user_id, collection, record_id)
  do update set
    payload = excluded.payload,
    updated_at = excluded.updated_at,
    deleted_at = excluded.deleted_at
  where excluded.updated_at > existing.updated_at;

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

revoke all on function public.upsert_vault_records(jsonb) from public;
grant execute on function public.upsert_vault_records(jsonb) to authenticated;
grant execute on function public.upsert_vault_records(jsonb) to service_role;

drop policy if exists "Users can read their own vault records" on public.vault_records;
drop policy if exists "Users can insert their own vault records" on public.vault_records;
drop policy if exists "Users can update their own vault records" on public.vault_records;
drop policy if exists "Users can delete their own vault records" on public.vault_records;

create policy "Users can read their own vault records"
on public.vault_records
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and public.has_sync_entitlement(user_id)
);

create policy "Users can insert their own vault records"
on public.vault_records
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and public.has_sync_entitlement(user_id)
);

create policy "Users can update their own vault records"
on public.vault_records
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and public.has_sync_entitlement(user_id)
)
with check (
  (select auth.uid()) = user_id
  and public.has_sync_entitlement(user_id)
);

create policy "Users can delete their own vault records"
on public.vault_records
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and public.has_sync_entitlement(user_id)
);

insert into storage.buckets (id, name, public)
values ('vault-assets', 'vault-assets', false)
on conflict (id) do update set public = false;

grant select, insert, update, delete on table storage.objects to authenticated;
grant select, insert, update, delete on table storage.objects to service_role;

drop policy if exists "Users can read their own vault assets" on storage.objects;
drop policy if exists "Users can insert their own vault assets" on storage.objects;
drop policy if exists "Users can update their own vault assets" on storage.objects;
drop policy if exists "Users can delete their own vault assets" on storage.objects;

create policy "Users can read their own vault assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vault-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_sync_entitlement((select auth.uid()))
);

create policy "Users can insert their own vault assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vault-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_sync_entitlement((select auth.uid()))
);

create policy "Users can update their own vault assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vault-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_sync_entitlement((select auth.uid()))
)
with check (
  bucket_id = 'vault-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_sync_entitlement((select auth.uid()))
);

create policy "Users can delete their own vault assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vault-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_sync_entitlement((select auth.uid()))
);

do $$
begin
  alter publication supabase_realtime add table public.vault_records;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
