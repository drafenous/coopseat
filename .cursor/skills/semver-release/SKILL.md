---
name: semver-release
description: Versions and releases the CoopSeat monorepo packages (desktop app, web/BFF, @coopseat/ui) with semantic versioning, changelogs and git tags. Use when the user asks to release, cut a version, bump a version, tag, publish the installer, update the changelog, or asks "what version is next".
---

# Semver release

Three packages, each versioned and tagged independently:

| Key       | Directory       | Tag              | What the tag triggers                                                             |
| --------- | --------------- | ---------------- | --------------------------------------------------------------------------------- |
| `desktop` | `coopseat-desktop/` | `desktop-vX.Y.Z` | `.github/workflows/desktop.yml` builds the installer, creates a GitHub Release, and uploads both `.exe` files to the R2 bucket `coopseat-downloads` at `<version>/CoopSeat-<version>-Setup.exe` and `<version>/CoopSeat-<version>-Portable.exe` |
| `web`     | `coopseat-web/` | `web-vX.Y.Z`     | Nothing; marks what is deployed from `main`                                       |
| `ui`      | `packages/ui/`  | `ui-vX.Y.Z`      | Nothing; `@coopseat/ui` is private and consumed through npm workspaces            |

All commands run from the repository root. The helper script is the only way to change versions:

```bash
node .cursor/skills/semver-release/scripts/release.mjs status
node .cursor/skills/semver-release/scripts/release.mjs bump <desktop|web|ui> <major|minor|patch|x.y.z>
```

`bump` edits `package.json`, updates the exact `@coopseat/ui` pin in `coopseat-desktop/`, `coopseat-web/` and `coopseat-signal/` when bumping `ui`, and runs `npm install` so `package-lock.json` stays valid for `npm ci`.

## Workflow

```
- [ ] 1. Preflight
- [ ] 2. Decide the bump per package
- [ ] 3. Confirm the plan with the user
- [ ] 4. Bump, changelog, verify
- [ ] 5. Commit and tag locally
- [ ] 6. Ask before pushing
```

**1. Preflight.** Run `status`. Stop and report if the tree is dirty or the branch is not `main`. Run `git fetch origin` and stop if `main` is behind `origin/main`.

**2. Decide the bump.** For each package with commits since its last tag, read the diffs (`git diff <lastTag>..HEAD -- <paths>`), not just the commit subjects; commits here do not follow Conventional Commits. Apply the rules below and pick the highest level found. Skip packages with no commits.

If a package has no tag yet, its first release is the current version as-is (`bump <key> <current version>`), with a changelog entry summarizing what exists.

**3. Confirm.** Present one line per package: current version, proposed version, the one change that drove the level. Wait for the user's go-ahead or override.

**4. Bump, changelog, verify.** Release `ui` first when it is part of the batch, since the bump rewrites its dependents. For each package:

1. Run `bump`.
2. Update `<dir>/CHANGELOG.md` (format below).
3. Run `npm test -w <name>` and `npm run typecheck -w <name>` (names: `coopseat-desktop`, `coopseat-web`, `@coopseat/ui`; `ui` has no tests). Stop on failure.

**5. Commit and tag.** One commit for the whole batch, then one annotated tag per package:

```bash
git add -A
git commit -m "Release desktop 0.2.0, ui 0.1.1"
git tag -a desktop-v0.2.0 -m "desktop 0.2.0"
git tag -a ui-v0.1.1 -m "ui 0.1.1"
```

**6. Push only after the user confirms.** Pushing a `desktop-v*` tag publishes a public installer and uploads it to R2. The repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (Workers R2 Storage Edit) must already exist, and the bucket `coopseat-downloads` must be public at `downloads.coopseat.com`. Then:

```bash
git push origin main desktop-v0.2.0 ui-v0.1.1
```

If the user declines, leave the commit and tags local and say how to undo: `git tag -d <tag>` and `git reset --soft HEAD~1`.

## Bump rules

While a package is below 1.0.0, a breaking change bumps **minor** and everything else bumps **patch**. Never move to 1.0.0 unless the user asks.

From 1.0.0 on: breaking → major, new user-visible capability → minor, fix or internal change → patch.

Breaking means:

- **desktop**: removes a feature or setting, raises the minimum Windows version, changes the `coopseat://` deep links, or stops reading settings saved by older versions.
- **web**: changes or removes a BFF route, field or auth flow that already-installed desktop versions call (they keep running old code), or ships a destructive database migration.
- **ui**: removes or renames an export, a prop, or a CSS token from `src/index.ts`, `src/design.ts`, `base.css` or `theme.css`.

Changes only to tests, CI, docs or tooling do not need a release. Mention them and skip unless the user insists.

A `ui` change ships inside the desktop and web builds. When `ui` is released, also check whether `desktop` and `web` need a release to deliver it.

## Changelog format

One `CHANGELOG.md` per package directory, in English, in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style. Write for people using the product, not for reviewers: describe the effect, not the file that changed. Drop internal-only entries.

Move entries from `## [Unreleased]` into a new section under it, dated with today's date:

```markdown
## [Unreleased]

## [0.2.0] - 2026-10-03

### Added

- Microphone is requested together with the camera, so audio inputs show up in the device list.

### Changed

- The app picks the account server from the build environment instead of a machine variable.

### Fixed

- ...
```

Use only the headings that have entries, in this order: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. Breaking entries start with `**Breaking:**`.

The desktop release workflow uses the section matching the tag as the GitHub Release body, so the heading must be exactly `## [X.Y.Z] - YYYY-MM-DD`. Check it before committing: `node .cursor/skills/semver-release/scripts/release.mjs notes <key> <X.Y.Z>` must print the entries.
