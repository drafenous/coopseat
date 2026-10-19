# Changelog

All notable changes to `@coopseat/ui` are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-10-18

### Added

- Gaming-Party stage and grid layouts with drag-and-drop, empty slots, and a strip for hidden streams.
- Capture filters and screen effects are baked into the outbound party stream so viewers see them.
- A clearer full-tile control to unmute remote streams when the browser blocks autoplay with sound.

### Fixed

- Native capture audio for party viewers no longer re-sends the same PCM buffer, which had made the stream choppy and distorted.

## [0.2.2] - 2026-10-06

### Added

- Gaming-Party room: a stage for up to 10 streams, chat, a people list, room settings, and a picker for a capture device, a screen, or a window.
- A window stream can include only that program's audio, and a screen stream can include the PC's audio except CoopSeat.
- When the camera or microphone cannot start, the app says whether Windows privacy, the site permission, or another program is blocking it.

## [0.2.1] - 2026-10-03

### Added

- `Platform` for the web accepts an optional `cookiePreferences()` that opens the host's cookie dialog from Preferences.
- `DesktopBridge.bounds()` accepts optional `holes` and `dim`, so menus and dialogs show over the native video.
- `CoopSeatPage` has Preferences, an opt-in anonymous telemetry prompt, a cinema mode menu and an account menu.

### Changed

- Effects and filters moved to their own settings section, and automatic cinema mode waits 1 to 5 seconds or never.

### Removed

- The in-app account window and the social sign-in buttons other than Google.

## [0.2.0] - 2026-10-03

### Added

- Internationalization exports: `I18nProvider`, `useT`, `useLocale`, `getLocale`, `setLocale`, `isUiLocale` and `UI_LOCALES`, with English and Portuguese.
- `theme.css` with the design tokens as Tailwind CSS v4 theme variables.
- Screen effects, edge smoothing, Picture in Picture, troubleshooting guide and a movable, collapsible settings panel in `CoopSeatPage`.

### Changed

- Components are styled with Tailwind CSS instead of per-component stylesheets. Apps must import `tailwindcss` and then `@coopseat/ui/theme.css`.
- The account permissions list no longer shows voice.

### Removed

- **Breaking:** `@coopseat/ui/tokens.css`. Use `@coopseat/ui/theme.css` instead.

## [0.1.0] - 2026-10-03

### Added

- `CoopSeatPage`: the capture app interface shared by the desktop app and the website, with `configurePlatform` to plug in the desktop bridge or the browser.
- Design system entry point (`@coopseat/ui/design`): `Button`, `TextButton`, `TextInput`, `Divider`, `FieldHint`, `Field`, `Alert`, `Brand`, `Card`, `ProviderButton` and `cx`.
- Shared styles in `base.css` and design tokens in `tokens.css`.
