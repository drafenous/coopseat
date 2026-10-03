# Changelog

All notable changes to `@coopseat/ui` are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
