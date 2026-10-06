# Changelog

All notable changes to the CoopSeat desktop app are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-03

### Added

- Portable version (`CoopSeat-<version>-Portable.exe`) next to the installer, which runs without installing.
- Preferences (gear icon at the top) with the language, which moved out of the header, and anonymous usage statistics.
- Optional anonymous usage statistics: the app asks once, and only reports when it opens and when a capture starts, with the app version and capture mode. Never gameplay, images, audio, devices or your account.
- Cinema mode options in the arrow next to the Cinema button: enter it automatically after 1 to 5 seconds without keyboard or mouse activity, or never.
- Age verification can open the Didit verification page in the browser.

### Changed

- Menus, dialogs and notifications now show on top of the video in native mode, and dialogs dim the video behind them.
- Effects and filters have their own section in the settings panel.
- "Connect on open" is now called "Capture on open".
- The avatar in the header opens a menu with My account, which opens the account page on the website, and Sign out.

### Removed

- **Breaking:** Sign-in with Facebook, X and Discord. Google and email and password are the only ways to sign in.
- **Breaking:** The account window inside the app. Profile, age verification and security are managed on the website through My account.

## [0.1.1] - 2026-10-03

### Added

- English interface, alongside Portuguese, with a language menu in the header.
- Screen effects in native mode: retro CRT (curved or flat), handheld LCD, vivid colors and color-blindness filters (protanopia, deuteranopia, tritanopia).
- Optional edge smoothing (light or strong) to soften jagged pixels.
- Picture in Picture in compatibility mode, to keep the game in a floating window.
- Troubleshooting guide with step-by-step fixes for common capture card problems.
- The settings panel can be moved to the left or right side and collapsed.

### Changed

- When you pick a capture card, its own audio input is selected automatically when it can be identified.
- The account screen and sign-in now only mention chat; voice chat is not offered.
- Refreshed interface styling.
- New CoopSeat app icon for the installer, the shortcut and the window.

## [0.1.0] - 2026-10-03

First experimental release for Windows 10/11 x64. Native capture, real audio and end-to-end latency still need testing on more capture cards.

### Added

- Play a console in a Windows window through a USB capture card. The capture is never recorded or streamed.
- Native mode with Media Foundation capture and Direct3D 11 rendering. It supports NV12, YUY2, RGB32 and MJPEG and prefers about 60 FPS at 1080p by default.
- Compatibility mode (Chromium) for cards that the native mode cannot open.
- Audio passthrough over WASAPI, with an explicit choice of HDMI/USB input and output device. Audio stays off until you pick an input.
- Fullscreen (F11), automatic cinema mode that hides the controls while you play, always on top, mute (M), volume and VSync toggle.
- Remembers your last setup, with an option to connect on startup.
- Diagnostics panel with resolution, format, FPS and dropped frames.
- Optional CoopSeat account: sign in with Google, Discord, X, Facebook or email and password, with optional two-factor authentication. The session is stored encrypted with Windows DPAPI.
- Installer (NSIS) and portable build.

### Security

- The installer is not code-signed yet, so Windows SmartScreen shows an "unknown publisher" warning on first run.
