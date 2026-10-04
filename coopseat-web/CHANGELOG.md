# Changelog

All notable changes to the CoopSeat website and BFF are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-03

### Added
- Download page at `/download` with the installer and the portable version of the latest release, the steps after downloading and the system requirements.
- Real age verification through Didit (ID document, liveness and face match), enabled with `KYC_PROVIDER=didit`.
- Cookie banner. Google Analytics only loads after you accept analytics cookies, and you can change your choice from the footer.
- Anonymous usage statistics from the desktop app, only for people who opt in inside the app.
- Security notifications by e-mail (for example when the password or two-step verification changes), and every account e-mail now uses one bilingual CoopSeat layout.

### Changed
- Accounts are open from age 12. The watch party (watching, chat and creating rooms) needs an account verified as 18+.
- The Google sign-in screen now shows the CoopSeat address instead of the Supabase one.
- Account e-mails are sent from `no-reply@coopseat.com`.
- The account page opens with Play now and Download buttons, joins age verification with the watch party permissions and splits the rest into Profile, Sign-in & security and Account tabs. The site header links to My account when you are signed in.
- The download buttons open the new download page, which always serves the latest desktop release, so visitors no longer need access to GitHub.
- The site no longer says capture cards must be USB; internal cards recognized by Windows work too.

### Removed
- **Breaking:** Sign-in with Facebook, X and Discord. Google and email and password are the only ways to sign in. Desktop 0.1.1 still shows those buttons, and they no longer work.
- The GitHub link in the footer.

## [0.1.1] - 2026-10-03

### Added
- New landing page explaining CoopSeat in plain language, with features, a three-step guide, the upcoming watch party and an FAQ.
- English version of the whole site, chosen from the browser language or the language menu. API error messages follow the same language.
- CoopSeat favicon and app icons, a web app manifest and a link preview image for sharing.

### Changed
- Terms of Use and Privacy Policy now share the site header and footer and have a table of contents.
- Pages moved to English addresses (for example `/login`, `/signup`, `/account`, `/privacy`, `/terms`). The old Portuguese addresses redirect to the new ones.
- Voice chat is no longer mentioned; age verification now unlocks chat and creating rooms.

## [0.1.0] - 2026-10-03

### Added
- CoopSeat accounts: sign up with email and password (with email confirmation) or with Google, Facebook, X and Discord. Providers can be linked and unlinked from the account page.
- Unique nicknames, optional two-factor authentication (TOTP) and account deletion.
- Age verification (18+) through a pluggable identity provider. Only the result is stored, never document images.
- Account API for the desktop app, including browser sign-in that hands the session back to the app through `coopseat://` links.
- `/play`: the capture app in the browser, in compatibility mode.
- TURN credentials endpoint for the upcoming watch party sessions.
