---
name: webrtc-streaming
description: Architecture, cost model and abuse controls of CoopSeat's watch-party streaming (WebRTC P2P with Cloudflare Realtime TURN as fallback), including /api/turn, the relay kill switches in Postgres, the monthly egress budget, credential revocation and client-side relay detection. Use when working on WebRTC, peer connections, ICE/STUN/TURN, relay, watch party or room streaming, invites/guests, bitrate or resolution limits, TURN costs, or when the user asks how streaming works or how to block relay abuse.
---

# WebRTC streaming (watch party)

## Topology

- Host streams the game to guests over **WebRTC P2P (mesh)**: one `RTCPeerConnection` per guest, no SFU or media server.
- ICE servers come from `POST /api/turn` (`coopseat-web/src/app/api/turn/route.ts`): Cloudflare STUN always, Cloudflare Realtime TURN only when the relay policy allows.
- Signaling is not implemented yet. Client WebRTC code does not exist yet; `coopseat-web/src/lib/webrtc/relay.ts` holds the helpers it must use.
- Rooms are **private only** in the initial release (invite links). Anonymous guests will get ICE servers from a future room-join route bound to a valid invite; `evaluateRelay` already supports `audience: 'guest'`.

## Cost model (drives every decision)

- Only TURN egress is billed: US$0.05/GB, first 1,000 GB/month free (shared with Cloudflare SFU, unused). P2P media, STUN and credential generation are free.
- Expect ~10–20% of sessions to need TURN (symmetric NAT, restrictive CGNAT, corporate firewalls, VPN). IPv6 on both sides avoids NAT.
- Bitrate: 1080p60 ≈ 6–8 Mbps (3–4.5 GB/h per viewer); 720p30 ≈ 1.5–2.5 Mbps (0.7–1.1 GB/h). In mesh, host upload = bitrate × viewers.
- P2P exposes each participant's public IP to the others (host ↔ guests). Mitigations, in priority order: waiting room where the host approves a guest **before** ICE starts; expiring/limited/revocable invites; per-room participant cap; kick/ban. A future opt-in "privacy mode" would force `iceTransportPolicy: 'relay'` (all traffic billed) and must go through the relay policy.

## `/api/turn` contract

Request: authenticated (`requireAuth`), rate limit bucket `turn`. Desktop sends `X-CoopSeat-Version`; browsers don't, so version rules never apply to them.

```ts
// allowed
{ iceServers, expiresAt, relay: true, maxRelayBitrateKbps }
// denied: still 200, STUN only, so direct connections keep working
{ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }], relay: false,
  reason: 'relay_unavailable' | 'relay_quota_exceeded' | 'relay_app_outdated', message }
```

Never turn a denial into an HTTP error. Public `reason` codes are deliberately vague (blocks, kill switches and budget all map to `relay_unavailable`); the internal reason is only logged (`console.warn('TURN relay denied', ...)`). Messages live in `src/i18n/dictionaries/{en,pt-BR}.tsx` under `errors`.

## Relay policy (`coopseat-web/src/server/relay-policy.ts`)

`evaluateRelay({ audience, profileId, appVersion })` reads the database on every call (no cache) and checks, in order:

1. `relay_policy.enabled` → `disabled`
2. `membersEnabled` / `guestsEnabled` → `audience_disabled`
3. `minAppVersion` / `blockedAppVersions` (comma list, `compareSemver`) → `app_version_blocked`
4. `relay_user_overrides` (`blocked`, ignored once `expiresAt` passes) → `user_blocked`
5. Credentials issued in the last 24 h vs `override.dailyQuota ?? dailyCredentialQuota` → `quota_exceeded`
6. Monthly budget (below) → `budget_exceeded` / `budget_unverified`

Cheap checks run before the budget, which may call Cloudflare.

Tables (Prisma contract `coopseat-web/src/prisma/contract.prisma`, all `@@rls` without policies, so backend-only):

| Table | Purpose |
|---|---|
| `relay_policy` | Singleton row `id = 'global'`; missing row = `DEFAULT_RELAY_POLICY`. `updatedAt` has no DB default: raw SQL inserts must set it |
| `relay_user_overrides` | Per-user block / quota, PK `profileId` |
| `relay_credentials` | Every issued credential (username, audience, appVersion, expiresAt, revokedAt): quota, audit, revocation |
| `relay_usage` | Month-to-date TURN egress cache (`month` = `YYYY-MM` UTC) |

Operators edit these with SQL in Supabase; ready-made statements are in `coopseat-web/README.md`, section "Controle do relay". There are no admin routes by design.

## Monthly budget (`coopseat-web/src/server/relay-usage.ts`)

- Reads account-wide TURN egress via Cloudflare GraphQL (`callsTurnUsageAdaptiveGroups`, `sum.egressBytes`, from the 1st of the UTC month), with `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_ANALYTICS_API_TOKEN` (permission Account Analytics: Read only).
- Cached in `relay_usage` for 5 min; on Cloudflare failure, a reading up to 1 h old is reused.
- **Fails closed**: unverifiable usage denies the relay. Exception: outside production with analytics env unset, the budget is skipped.
- Default `monthlyBudgetGb = 900` leaves margin for metric lag and sessions still holding credentials; `null` disables the budget.

## Revocation

Blocking only stops new credentials. `npm run relay:revoke -- --user <uuid> | --all` (`coopseat-web/scripts/relay-revoke.mjs`, uses `DIRECT_URL`) revokes still-valid credentials at Cloudflare (`POST .../credentials/{username}/revoke`) and sets `revokedAt`. Last resort: rotate the TURN key in the Cloudflare dashboard.

## Client helpers (`coopseat-web/src/lib/webrtc/relay.ts`)

- `getSelectedCandidateType(pc)`: `host | srflx | prflx | relay` from the nominated succeeded candidate pair.
- `applyRelayBitrateCap(pc, maxKbps)`: caps video senders only when on `relay`; pass `maxRelayBitrateKbps` from `/api/turn`.
- After connecting, send telemetry `rtc_connected` with `candidateType` (`/api/telemetry`) to measure the real relay rate.
- Credentials expire (`expiresAt`); refresh with a new `/api/turn` call and `pc.setConfiguration()`.
- Limits are client-enforced (the server never sees P2P media); real abuse protection is the server-side quota, budget and revocation.

## Changing the relay rules

```
- [ ] Add the column/model to contract.prisma, then `npm run contract:emit`
- [ ] Plan the migration with an explicit origin: `npx prisma migration plan --from <previous contract hash> --name <slug>`
      (no `db` ref exists; plain `migration:plan` fails with MIGRATION.PLAN_ORIGIN_UNKNOWN)
- [ ] Mirror defaults in DEFAULT_RELAY_POLICY and in tests/fake-db.ts
- [ ] New deny reason: add to RelayDenyReason and DENY_MESSAGE in the route (map to a vague public code)
- [ ] Tests: tests/turn.test.ts, tests/relay-policy.test.ts, tests/relay-budget.test.ts
- [ ] Update the "Controle do relay" section of coopseat-web/README.md with the SQL to operate it
- [ ] The user applies the migration (`npm run db:migrate`); do not run it against their database
```

The previous contract hash is the `to` field of the newest `coopseat-web/migrations/app/*/migration.json`.
