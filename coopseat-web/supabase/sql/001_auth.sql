-- Objects that are not Prisma 8 contract elements (functions, triggers, grants,
-- cron jobs). Idempotent: run after every `prisma db migrate` with `npm run db:sql`.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Creates an empty profile for every new auth user (email or OAuth).
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, "avatarUrl", "updatedAt")
  values (new.id, new.raw_user_meta_data ->> 'avatar_url', now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keeps "updatedAt" honest for writes that bypass the ORM.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new."updatedAt" := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Profiles are written only by the BFF (service role). Tickets and verifications
-- are never visible to client roles.
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
revoke all on public.auth_tickets from anon, authenticated;
revoke all on public.identity_verifications from anon, authenticated;
revoke all on public.rate_limit_hits from anon, authenticated;

-- Custom Access Token Hook: adds age_verified and nickname_set claims.
-- Enable it in Dashboard > Authentication > Hooks (public.custom_access_token_hook).
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  p record;
begin
  select "ageStatus", nickname
    into p
    from public.profiles
   where id = (event ->> 'user_id')::uuid;

  claims := jsonb_set(claims, '{age_verified}', to_jsonb(coalesce(p."ageStatus" = 'VERIFIED', false)));
  claims := jsonb_set(claims, '{nickname_set}', to_jsonb(p.nickname is not null));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- Purge expired auth tickets every 10 minutes (requires the pg_cron extension).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'coopseat-purge-auth-tickets',
      '*/10 * * * *',
      $cron$delete from public.auth_tickets where "expiresAt" < now()$cron$
    );
    perform cron.schedule(
      'coopseat-purge-rate-limit-hits',
      '17 * * * *',
      $cron$delete from public.rate_limit_hits where "createdAt" < now() - interval '1 day'$cron$
    );
  else
    raise notice 'pg_cron not enabled; expired auth tickets are only purged on read';
  end if;
end;
$$;
