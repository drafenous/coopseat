---
name: webrtc-streaming
description: Architecture, cost model and abuse controls of CoopSeat's Gaming-Party streaming (WebRTC P2P mesh with up to 10 streamers, Cloudflare Realtime TURN as fallback), including the coopseat-signal Worker, room tokens, /api/turn, the relay kill switches in Postgres, the monthly egress budget, credential revocation and the client WebRTC library. Use when working on WebRTC, peer connections, ICE/STUN/TURN, relay, signaling, Gaming-Party / watch party rooms, streaming, bitrate or resolution limits, TURN costs, or when the user asks how streaming works or how to block relay abuse.
---

# WebRTC streaming (Gaming-Party)

## Topology

- **Mesh P2P**: every streamer opens one `RTCPeerConnection` per viewer (`pc` id `streamerId>viewerId`); no SFU or media server. Up to `party_policy.maxStreamers` (hard cap 10) streamers per session. Anyone with a durable or session stream grant can stream whether or not the owner is connected. The session ends when the room stays empty (reconnect grace), which revokes session-only access and stream grants.
- **Signaling**: `coopseat-signal/` Cloudflare Worker, one Durable Object per session (`src/session.ts`). All logic is the pure `RoomEngine` (`src/engine.ts`, tested in `tests/engine.test.ts`); the DO only wires sockets, alarms and storage. SDP/ICE is relayed only along subscribe links.
- **Room tokens**: the BFF (`coopseat-web/src/server/party/`) decides access (`decideAccess`) and signs an Ed25519 JWT (10 min, refreshed every 8 min via `/api/party/<nick>/token`); the Worker verifies it offline. Room limits are frozen into the token `cfg`. Wire types and HMAC helpers: `packages/ui/src/party/protocol.ts` (`@coopseat/ui/party-protocol`).
- **BFF ↔ Worker**: HMAC-signed HTTP both ways (`PARTY_SIGNAL_SECRET`, 60 s skew, nonce): BFF → `/internal/sessions/<sid>` (end/remove/approve/deny/refresh), Worker → `/api/party/internal/events`.
- ICE servers come from `POST /api/turn` with `{ roomToken }`: Cloudflare STUN always, TURN only when the relay policy allows and the token is admitted to a live session.
- Clients: `packages/ui/src/lib/webrtc/` (`@coopseat/ui/webrtc`) and `packages/ui/src/hooks/` (`useParty`, `usePeerMesh`, `useSignal`). Desktop screen capture goes through `desktopCapturer` + `setDisplayMediaRequestHandler` in `coopseat-desktop/electron/main.cjs`.

## Cost model (drives every decision)

- Only TURN egress is billed: US$0.05/GB, first 1,000 GB/month free (shared with Cloudflare SFU, unused). P2P media, STUN and credential generation are free.
- Expect ~10–20% of sessions to need TURN (symmetric NAT, restrictive CGNAT, corporate firewalls, VPN). IPv6 on both sides avoids NAT.
- Bitrate: 1080p60 ≈ 6–8 Mbps (3–4.5 GB/h per viewer); 720p30 ≈ 1.5–2.5 Mbps (0.7–1.1 GB/h). In mesh, host upload = bitrate × viewers.
- P2P exposes each participant's public IP to the others (disclosed in the privacy policy and terms). Mitigations: pending users (approval queue) get no peers, chat or ICE until approved; optional room protections (password, approval, allow list — public rooms may use none); identity/age gateway; per-room cap; kick/ban; platform sanctions. A future opt-in "privacy mode" would force `iceTransportPolicy: 'relay'` (all traffic billed) and must go through the relay policy.

## Client media pipeline (`@coopseat/ui/webrtc`)

- `PlainMesh` (`plain.ts`), owned by `usePeerMesh`: one `RTCPeerConnection` per viewer (`pc` id `streamerId>viewerId`). The streamer `addTrack`s the capture and offers; the viewer only answers. ICE candidates trickle as they appear, including the final null. A visible tile subscribes at `high`; a hidden tile unsubscribes and the connection closes. When the viewer's ICE reaches `failed`, that link is closed and subscribed again after 1 s, up to 3 times. A connection that returns to `connected` clears the count. Hiding the tile or closing the mesh cancels the wait. No `restartIce`, no relay bitrate cap, no TURN credential refresh, no stats sampling.
- Every video sender is capped at 720p30 (`SEND_MAX_WIDTH` 1280, `SEND_MAX_HEIGHT` 720, `SEND_MAX_FPS` 30, `SEND_MAX_KBPS` 2500) via `capVideoSender` after the tracks are added and again after `setLocalDescription`. `sendScale` is the source size over that box, so 1080p becomes exactly 720p and a smaller window is not enlarged. The local preview keeps the capture track. If the track settings have no size, the first outbound `frameWidth` above 720p sets the scale. `degradationPreference` is `maintain-framerate`, so a heavy scene softens instead of skipping frames.
- `lockFrameRate` (`frame-clock.ts`) is the send clock. One gate per mesh reads the capture and forwards at most one frame per `SEND_FRAME_US` (33333). `takeFrame` emits the first frame of a burst and does not backfill. The frame keeps its capture timestamp. The preview is not gated. Without `MediaStreamTrackProcessor`, the mesh sends the capture track and only `maxFramerate` applies.
- Screen and window shares (`displaySource` in `stream-source.ts`) pass the `getDisplayMedia` stream through. The remote `StreamTile` sets `video.srcObject` to the received stream. The capture card (`cardSource`) clones the preview and sends those tracks the same way.
- Native frames (`native-media.ts`) are written as they arrive. The timestamp starts at 1 µs and steps by that buffer's duration: video uses the gap since the previous frame, clamped to 1–100 ms (33 ms for the first); audio uses `samples / sampleRate`. A busy video writer drops the frame. The preview ack stays immediate. The page clock is not a timestamp.
- Layouts (`packages/ui/src/lib/party/layout.ts`) still decide which tiles are visible. `slotQuality` may say `low`; the live mesh treats every visible tile as `high`.
- `PeerLink`, `PeerMesh`, codec ordering, Opus SDP munging, the jitter-buffer hint and `BitrateAdapter` stay in the package so existing tests keep importing them. The room does not construct them.

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
- `applyRelayBitrateCap(pc, maxKbps)`: caps video senders only when on `relay`. The live `PlainMesh` does not call it, and it does not send `rtc_connected`.
- Limits are client-enforced (the server never sees P2P media); real abuse protection is the server-side quota, budget, revocation and the room-token requirement.

## Party controls

`party_policy` (singleton, kill switch `enabled`, `maxParticipants`, `maxStreamers`, `sessionMaxHours`, `ownerGraceSeconds`, `chatEnabled`) and `platform_sanctions` (scopes `platform | party_host | party_stream | party_join | party_chat`, `expiresAt` null = permanent). `ownerGraceSeconds` is still stored but does not end a session; the room ends with reason `empty` after `RECONNECT_GRACE_MS` with no admitted member left. Apply sanctions with `npm run party:sanction` (`coopseat-web/scripts/party-sanction.mjs`), which also cuts live sessions; SQL lives in the README section "Controle da Gaming-Party".

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
