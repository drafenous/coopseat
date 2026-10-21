# CoopSeat

Stream a game to a room, up to 720p, or play only on your PC through a capture card. Nothing is recorded. The app runs on Windows 10 and 11. Chrome and Edge can play locally, with nothing to install.

Site and download: [coopseat.com](https://coopseat.com) · [coopseat.com/download](https://coopseat.com/download)

The installer is not code-signed yet. On first launch Windows shows an unknown-publisher warning. Choose "More info", then "Run anyway".

## What's in this repository

npm workspaces. The apps never import each other. Shared code lives in `@coopseat/ui`.

| Directory | What it is |
| --- | --- |
| `coopseat-desktop/` | Electron app: native Windows capture (Media Foundation, Direct3D, WASAPI) and the browser mode as a fallback |
| `coopseat-web/` | Next.js site and BFF: accounts, rooms, and the download page |
| `coopseat-signal/` | Cloudflare Worker that signals each room. No database |
| `packages/ui/` | Interface, client WebRTC, and the room protocol |

Details: [coopseat-desktop/README.md](coopseat-desktop/README.md) and [coopseat-web/README.md](coopseat-web/README.md).

## Development

Node.js 22. From the repository root:

```bash
npm ci
npm run dev:web       # http://localhost:3000
npm run dev:signal    # http://localhost:8787
npm run dev:desktop   # Vite on 127.0.0.1:5173 plus Electron
npm test
npm run typecheck
```

A local room needs the site and the Worker running together. Unpackaged, the desktop app talks to `http://localhost:3000`. The installer talks to `https://coopseat.com`.

The site needs a `.env.local`. The template and the rest of the setup are in [coopseat-web/README.md](coopseat-web/README.md).

## License

[MIT](LICENSE)
