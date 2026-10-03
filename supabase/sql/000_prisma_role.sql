-- Dedicated login role for the BFF runtime. Run once as `postgres` in the Supabase SQL
-- editor, replacing the password, then use
-- postgresql://prisma.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
-- as DATABASE_URL (session pooler; never the 6543 transaction pooler).
--
-- Migrations run as `postgres` (DIRECT_URL / SQL_ADMIN_URL): on Supabase only `postgres`
-- holds REFERENCES/TRIGGER on auth.users, and it cannot grant them to other roles.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'prisma') then
    create role prisma with login password 'CHANGE_ME' bypassrls;
  end if;
end;
$$;

-- The supabase() runtime switches to these roles per request. Tables created by
-- `postgres` in public are granted to them by Supabase's default privileges.
grant anon, authenticated, service_role to prisma;
grant usage on schema public to prisma;
