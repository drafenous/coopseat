-- Trigger, constraints, RLS, grants and the access token hook.
-- Run with `npm run db:test` (wrapped in a transaction that is rolled back).

insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'alice@test.coopseat', '{"avatar_url":"https://cdn.example/a.png"}'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'bob@test.coopseat', '{}');

-- The auth.users trigger creates a profile with the provider avatar.
do $$
begin
  assert (select count(*) from public.profiles where id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')) = 2,
    'trigger should create one profile per auth user';
  assert (select "avatarUrl" from public.profiles where id = '11111111-1111-4111-8111-111111111111') = 'https://cdn.example/a.png',
    'trigger should copy avatar_url';
  raise notice 'trigger: ok';
end $$;

-- Nickname constraints: format, lowercase key and case-insensitive uniqueness.
update public.profiles set nickname = 'Alice', "nicknameKey" = 'alice' where id = '11111111-1111-4111-8111-111111111111';
do $$
begin
  begin
    update public.profiles set nickname = 'com espaço', "nicknameKey" = 'com espaço' where id = '22222222-2222-4222-8222-222222222222';
    raise exception 'invalid nickname format was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set nickname = 'Bob', "nicknameKey" = 'BOB' where id = '22222222-2222-4222-8222-222222222222';
    raise exception 'nicknameKey different from lower(nickname) was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set nickname = 'ALICE', "nicknameKey" = 'alice' where id = '22222222-2222-4222-8222-222222222222';
    raise exception 'duplicate nickname (case-insensitive) was accepted';
  exception when unique_violation then null;
  end;
  raise notice 'nickname constraints: ok';
end $$;

-- One document can approve only one account; rejected attempts may repeat it.
insert into public.identity_verifications (id, "profileId", provider, "providerSessionId", status, "documentFingerprint", "createdAt")
values
  (gen_random_uuid(), '11111111-1111-4111-8111-111111111111', 'mock', 'test_s1', 'approved', 'fp-1', now()),
  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', 'mock', 'test_s2', 'rejected', 'fp-1', now());
do $$
begin
  begin
    insert into public.identity_verifications (id, "profileId", provider, "providerSessionId", status, "documentFingerprint", "createdAt")
    values (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', 'mock', 'test_s3', 'approved', 'fp-1', now());
    raise exception 'the same document approved two accounts';
  exception when unique_violation then null;
  end;
  raise notice 'document fingerprint: ok';
end $$;

-- Access token hook claims.
update public.profiles set "ageStatus" = 'VERIFIED' where id = '11111111-1111-4111-8111-111111111111';
do $$
declare
  alice jsonb := public.custom_access_token_hook('{"user_id":"11111111-1111-4111-8111-111111111111","claims":{"sub":"11111111-1111-4111-8111-111111111111"}}');
  bob jsonb := public.custom_access_token_hook('{"user_id":"22222222-2222-4222-8222-222222222222","claims":{}}');
begin
  assert (alice #>> '{claims,age_verified}')::boolean and (alice #>> '{claims,nickname_set}')::boolean, 'alice claims';
  assert (alice #>> '{claims,sub}') = '11111111-1111-4111-8111-111111111111', 'hook must keep existing claims';
  assert not (bob #>> '{claims,age_verified}')::boolean and not (bob #>> '{claims,nickname_set}')::boolean, 'bob claims';
  assert not has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'execute'), 'clients must not call the hook';
  raise notice 'access token hook: ok';
end $$;

-- RLS: a signed-in user reads only their own profile and cannot write it.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert (select count(*) from public.profiles) = 1, 'authenticated must see only its own profile';
  assert (select id from public.profiles) = '11111111-1111-4111-8111-111111111111', 'wrong profile visible';
  begin
    update public.profiles set nickname = 'Hacker', "nicknameKey" = 'hacker';
    raise exception 'authenticated could update profiles';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.auth_tickets;
    raise exception 'authenticated could read auth_tickets';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.identity_verifications;
    raise exception 'authenticated could read identity_verifications';
  exception when insufficient_privilege then null;
  end;
  raise notice 'rls authenticated: ok';
end $$;
reset role;

set local role anon;
do $$
begin
  begin
    assert (select count(*) from public.profiles) = 0, 'anon must not see profiles';
  exception when insufficient_privilege then null;
  end;
  raise notice 'rls anon: ok';
end $$;
reset role;
