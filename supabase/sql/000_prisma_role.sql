-- Dedicated login role for Prisma (migrations + BFF runtime). Run once as `postgres`
-- in the Supabase SQL editor, replacing the password, then use
-- postgres://prisma.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
-- as DATABASE_URL / DIRECT_URL (session pooler; never the 6543 transaction pooler).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'prisma') then
    create role prisma with login password 'CHANGE_ME' bypassrls createdb;
  end if;
end;
$$;

-- The supabase() runtime switches to these roles per request.
grant anon, authenticated, service_role to prisma;
grant usage, create on schema public to prisma;
alter default privileges for role prisma in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role prisma in schema public
  grant all on sequences to anon, authenticated, service_role;

-- Needed by the FK to auth.users and by the triggers in 001_auth.sql.
grant usage on schema auth to prisma;
grant references, select on auth.users to prisma;
