---
name: monorepo-workspaces
description: >-
  Layout and dependency rules of the CoopSeat npm workspaces (coopseat-web,
  coopseat-desktop, coopseat-signal) and the shared package @coopseat/ui.
  Use when deciding where code belongs, adding a dependency, importing across
  apps, running a workspace script, or when the user mentions workspaces,
  packages, the monorepo, the BFF, the desktop app, the signal Worker, or
  @coopseat/ui.
---

# Workspaces and packages

npm workspaces, installed from the repository root. The apps never import each other. They share code only through `@coopseat/ui` (`packages/ui`), which is consumed as TypeScript source (no build step).

| Directory           | npm name           | What it is                                                                 |
| ------------------- | ------------------ | -------------------------------------------------------------------------- |
| `coopseat-web/`     | `coopseat-web`     | Next.js site and BFF (accounts, Postgres, party access, TURN, downloads)  |
| `coopseat-desktop/` | `coopseat-desktop` | Electron app: Vite renderer, CommonJS main process, native C++ capture    |
| `coopseat-signal/`  | `coopseat-signal`  | Cloudflare Worker: one Durable Object per party session, no database      |
| `packages/ui/`      | `@coopseat/ui`     | Shared UI, client WebRTC, and the framework-free party wire protocol      |

The desktop package name matches its directory: `-w coopseat-desktop`.

## Who owns what

**Web** decides. `coopseat-web/src/server/` is the only place that reads Postgres (Prisma 8), issues room tokens, grants access, and mints TURN credentials. Pages under `src/app/(main)/` are the site (auth, account, marketing). `/play` and `/party/[nickname]` mount the shared capture app. Path alias `@/*` exists only inside this workspace. Read `coopseat-web/AGENTS.md` before writing Next.js code.

**Signal** relays. `coopseat-signal/src/index.ts` routes WebSocket upgrades and HMAC-signed internal HTTP; `session.ts` is the Durable Object; `engine.ts` is the pure room logic. It verifies the room token offline and never opens the database. Its tsconfig lib is `ES2022` with Workers types — no DOM.

**Desktop** captures. `src/` is the renderer (Vite, React) and only mounts `CoopSeatPage`. `electron/*.cjs` is the main process and preload (`window.input`); the renderer tsconfig does not include it, and Vite ignores it so a main-process change restarts Electron instead of hot-reloading the page. `native/` is the Windows capture executable. Packaged builds always talk to production. Unpackaged, `COOPSEAT_BFF_URL` / `COOPSEAT_SIGNAL_URL` win, otherwise `COOPSEAT_ENV`, otherwise development (`electron/environments.json`, `electron/signals.json`).

**UI** is the shared surface. It must not import a workspace. React is a peer dependency.

## `@coopseat/ui` exports

Import the subpath that matches the runtime. The root export pulls in the capture app.

| Subpath            | Use it from                                      | Must stay free of                         |
| ------------------ | ------------------------------------------------ | ----------------------------------------- |
| `@coopseat/ui`     | Desktop renderer, `/play`, `/party/[nickname]`   | — (React, DOM)                            |
| `@coopseat/ui/design` | Site and auth pages, including server components | Capture app, hooks on server-rendered parts |
| `@coopseat/ui/party-protocol` | Web server, signal Worker, clients          | React, DOM, Node-only or Workers-only APIs |
| `@coopseat/ui/webrtc` | Clients and web tests                         | The signal Worker                         |
| `@coopseat/ui/party-layout` | Clients and web tests                    | The signal Worker                         |
| `@coopseat/ui/base.css`, `theme.css` | App hosts                              | The signal Worker                         |

`coopseat-web/next.config.ts` lists `@coopseat/ui` in `transpilePackages`. Adding a new shared package that Next compiles requires the same entry.

Each app calls `configurePlatform` once, before the first render:

- Desktop renderer (`coopseat-desktop/src/main.tsx`): `{ kind: 'desktop', bridge: window.input }` when the preload is present.
- Web play and party (`PlayApp.tsx`, `PartyApp.tsx`): `{ kind: 'web', accounts: true }`.

A new native capability needs both sides: a method on `DesktopBridge` in `packages/ui/src/platform.ts` and the matching `contextBridge` / `ipcMain` handler in `electron/`.

## Where a change goes

1. Wire types, token claims, HMAC, or message shapes used by the BFF, the Worker, and clients → `packages/ui/src/party/protocol.ts`.
2. Capture UI, party room UI, or client hooks → `packages/ui` (root export).
3. Visual pieces used by the marketing site and the app → `src/design.ts`. Keep them hook-free when a server component renders them.
4. Accounts, schema, auth routes, downloads, access decisions, TURN issuance → `coopseat-web`.
5. Session membership, signaling, chat relay → `coopseat-signal`.
6. Windows capture, installer, deep links, secure storage, preload → `coopseat-desktop` (`electron/`, `native/`).

Do not add a workspace or a package under `packages/` unless the user asks. Do not duplicate a type that `party-protocol` already exports.

Streaming behavior (mesh, TURN, relay policy) is in the `webrtc-streaming` skill. Version bumps and tags are in the `semver-release` skill. Database work follows the Prisma 8 skill in `coopseat-web`.

## Dependencies

- Apps depend on `@coopseat/ui` with an exact version equal to `packages/ui`'s `version`. npm workspaces link the local source; the pin is what the release script rewrites. Do not switch it to `*` or `workspace:*`.
- Install from the repository root (`npm install`). A new dependency goes in the workspace that imports it (`npm install <pkg> -w <name>`), not the root, unless it is a root tooling package such as Prettier.
- `@coopseat/ui` declares `react` and `react-dom` as peers. Desktop lists them as devDependencies; web lists them as dependencies. Keep those versions aligned.

## Commands

From the repository root:

```bash
npm run dev:web          # Next.js, http://localhost:3000
npm run dev:signal       # wrangler dev --env dev, http://localhost:8787
npm run dev:desktop      # Vite on 127.0.0.1:5173 plus Electron
npm run typecheck        # every workspace that has the script
npm test                 # every workspace that has the script
npm run typecheck -w coopseat-web
npm test -w coopseat-signal
npm run typecheck -w @coopseat/ui
npm test -w coopseat-desktop     # node --test tests/*.test.cjs
```

A local party needs the web app and the signal Worker together. The desktop dev environment and the signal `dev` env already point at `localhost:3000` and `localhost:8787`. `@coopseat/ui` has typecheck only.

Desktop `electron/*.cjs` is outside `tsc`. Behavior that lives there is covered by `coopseat-desktop/tests/*.test.cjs`.
