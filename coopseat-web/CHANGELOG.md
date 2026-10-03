# Changelog

All notable changes to the CoopSeat website and BFF are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-03

### Added
- CoopSeat accounts: sign up with email and password (with email confirmation) or with Google, Facebook, X and Discord. Providers can be linked and unlinked from the account page.
- Unique nicknames, optional two-factor authentication (TOTP) and account deletion.
- Age verification (18+) through a pluggable identity provider. Only the result is stored, never document images.
- Account API for the desktop app, including browser sign-in that hands the session back to the app through `coopseat://` links.
- `/play`: the capture app in the browser, in compatibility mode.
- TURN credentials endpoint for the upcoming watch party sessions.
