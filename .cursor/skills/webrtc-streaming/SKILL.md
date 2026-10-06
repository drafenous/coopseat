---
name: webrtc-streaming
description: Architecture, cost model and abuse controls of CoopSeat's Gaming-Party streaming (WebRTC P2P mesh with up to 10 streamers, Cloudflare Realtime TURN as fallback), including the coopseat-signal Worker, room tokens, /api/turn, the relay kill switches in Postgres, the monthly egress budget, credential revocation and the client WebRTC library. Use when working on WebRTC, peer connections, ICE/STUN/TURN, relay, signaling, Gaming-Party / watch party rooms, streaming, bitrate or resolution limits, TURN costs, or when the user asks how streaming works or how to block relay abuse.
---

# WebRTC streaming (Gaming-Party)

## Topology

- **Mesh P2P**: every streamer opens one `RTCPeerConnection` per viewer (`pc` id `streamerId>viewerId`); no SFU or media server. Up to `party_policy.maxStreamers` (hard cap 10) streamers per session; others only stream while the owner streams.
- **Signaling**: `coopseat-signal/` Cloudflare Worker, one Durable Object per session (`src/session.ts`). All logic is the pure `RoomEngine` (`src/engine.ts`, tested in `tests/engine.test.ts`); the DO only wires sockets, alarms and storage. SDP/ICE is relayed only along subscribe links.
- **Room tokens**: the BFF (`coopseat-web/src/server/party/`) decides access (`decideAccess`) and signs an Ed25519 JWT (10 min, refreshed every 8 min via `/api/party/<nick>/token`); the Worker verifies it offline. Room limits are frozen into the token `cfg`. Wire types and HMAC helpers: `packages/ui/src/party/protocol.ts` (`@coopseat/ui/party-protocol`).
- **BFF ↔ Worker**: HMAC-signed HTTP both ways (`PARTY_SIGNAL_SECRET`, 60 s skew, nonce): BFF → `/internal/sessions/<sid>` (end/remove/approve/deny/refresh), Worker → `/api/party/internal/events`.
- ICE servers come from `POST /api/turn` with `{ roomToken }`: Cloudflare STUN always, TURN only when the relay policy allows and the token is admitted to a live session.
- Clients: `packages/ui/src/lib/webrtc/` (`@coopseat/ui/webrtc`) and `packages/ui/src/hooks/` (`useParty`, `usePeerMesh`, `useSignal`). Desktop screen capture goes through `desktopCapturer` + `setDisplayMediaRequestHandler` in `coopseat/electron/main.cjs`.

## Cost model (drives every decision)

- Only TURN egress is billed: US$0.05/GB, first 1,000 GB/month free (shared with Cloudflare SFU, unused). P2P media, STUN and credential generation are free.
- Expect ~10–20% of sessions to need TURN (symmetric NAT, restrictive CGNAT, corporate firewalls, VPN). IPv6 on both sides avoids NAT.
- Bitrate: 1080p60 ≈ 6–8 Mbps (3–4.5 GB/h per viewer); 720p30 ≈ 1.5–2.5 Mbps (0.7–1.1 GB/h). In mesh, host upload = bitrate × viewers.
- P2P exposes each participant's public IP to the others (disclosed in the privacy policy and terms). Mitigations: pending users (approval queue) get no peers, chat or ICE until approved; room protections (password, approval, allow list, at least one required by a DB check); per-room cap; kick/ban; platform sanctions. A future opt-in "privacy mode" would force `iceTransportPolicy: 'relay'` (all traffic billed) and must go through the relay policy.

## Client media pipeline (`@coopseat/ui/webrtc`)

- `PeerLink` (`peer.ts`): perfect negotiation (streamer impolite/offers, viewer polite), ICE restart after `DISCONNECT_GRACE_MS` (5 s), at most `MAX_ICE_RESTARTS` (4) with backoff. Pausing uses `replaceTrack(null)` (no renegotiation).
- `PeerMesh` (`mesh.ts`): viewers subscribe with `high | low | paused`; hidden tiles send `paused`, then unwatch after `HIDDEN_CLOSE_MS` (20 s). No connection within `CONNECT_TIMEOUT_MS` (15 s) resubscribes. Stats tick every 2 s; TURN credentials refreshed 60 s before expiry via `setConfiguration`.
- `encoding.ts`: codec order H264 > AV1 > VP9 > VP8, `contentHint` motion/music, `maintain-framerate`, Opus stereo 128 kbps (SDP munging of the remote answer), `allocateBitrates` splits `DEFAULT_UPLOAD_BUDGET_KBPS` across viewers.
- `stats.ts`: `BitrateAdapter` (AIMD: ×0.75 on >5% loss / RTT >350 ms / bandwidth limitation, ×1.1 after 3 clean samples, ≤ 0.9 × available estimate).
- Layouts (`packages/ui/src/lib/party/layout.ts`): stage/grid/split/focus; `slotQuality` picks the layer, hidden tiles disconnect.

## `/api/turn` contract

Request: authenticated (`requireAuth`), body `{ roomToken }` (admitted, same `sub`, session still live), rate limit bucket `turn`. Desktop sends `X-CoopSeat-Version`; browsers don't, so version rules never apply to them.

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

| Table                  | Purpose                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `relay_policy`         | Singleton row `id = 'global'`; missing row = `DEFAULT_RELAY_POLICY`. `updatedAt` has no DB default: raw SQL inserts must set it |
| `relay_user_overrides` | Per-user block / quota, PK `profileId`                                                                                          |
| `relay_credentials`    | Every issued credential (username, audience, appVersion, expiresAt, revokedAt): quota, audit, revocation                        |
| `relay_usage`          | Month-to-date TURN egress cache (`month` = `YYYY-MM` UTC)                                                                       |

Operators edit these with SQL in Supabase; ready-made statements are in `coopseat-web/README.md`, section "Controle do relay". There are no admin routes by design.

## Monthly budget (`coopseat-web/src/server/relay-usage.ts`)

- Reads account-wide TURN egress via Cloudflare GraphQL (`callsTurnUsageAdaptiveGroups`, `sum.egressBytes`, from the 1st of the UTC month), with `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_ANALYTICS_API_TOKEN` (permission Account Analytics: Read only).
- Cached in `relay_usage` for 5 min; on Cloudflare failure, a reading up to 1 h old is reused.
- **Fails closed**: unverifiable usage denies the relay. Exception: outside production with analytics env unset, the budget is skipped.
- Default `monthlyBudgetGb = 900` leaves margin for metric lag and sessions still holding credentials; `null` disables the budget.

## Revocation

Blocking only stops new credentials. `npm run relay:revoke -- --user <uuid> | --all` (`coopseat-web/scripts/relay-revoke.mjs`, uses `DIRECT_URL`) revokes still-valid credentials at Cloudflare (`POST .../credentials/{username}/revoke`) and sets `revokedAt`. Last resort: rotate the TURN key in the Cloudflare dashboard.

## Relay helpers (`packages/ui/src/lib/webrtc/relay.ts`)

- `fetchIceConfig(roomToken)`: calls `/api/turn`.
- `getSelectedCandidateType(pc)`: `host | srflx | prflx | relay` from the nominated succeeded candidate pair.
- `applyRelayBitrateCap(pc, maxKbps)`: caps video senders only when on `relay`; `PeerMesh` applies it with `maxRelayBitrateKbps` once connected.
- `PeerMesh` sends telemetry `rtc_connected` with `candidateType` once per link to measure the real relay rate.
- Limits are client-enforced (the server never sees P2P media); real abuse protection is the server-side quota, budget, revocation and the room-token requirement.

## Party controls

`party_policy` (singleton, kill switch `enabled`, `maxParticipants`, `maxStreamers`, `sessionMaxHours`, `ownerGraceSeconds`, `chatEnabled`) and `platform_sanctions` (scopes `platform | party_host | party_stream | party_join | party_chat`, `expiresAt` null = permanent). Apply sanctions with `npm run party:sanction` (`coopseat-web/scripts/party-sanction.mjs`), which also cuts live sessions; SQL lives in the README section "Controle da Gaming-Party".

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
