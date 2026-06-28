# Kimai Tracker

A fast, lightweight desktop client for **[Kimai](https://www.kimai.org)**, the open-source
self-hosted time tracker. Kimai Tracker gives you a tracker, a system-tray
popover and a pinnable floating widget, so you can start and stop timers without opening the
Kimai web UI. Runs on **Windows, macOS and Linux**.

[![Release](https://img.shields.io/github/v/release/faeztgh/kimai-tracker?sort=semver)](https://github.com/faeztgh/kimai-tracker/releases)
[![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm--Noncommercial--1.0.0-blue.svg)](./LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-444)](https://github.com/faeztgh/kimai-tracker/releases)

> Think of it as a desktop app that talks to your own Kimai server.
> Point it at your Kimai URL (or several), paste an API token once per server, and track time from
> the tray.

## Features

- **Tracker bar** with a "What are you working on?" field, searchable color-coded project and
  activity pickers, optional tags, a billable toggle, and Timer / Manual modes with a live duration.
- **Time entries grouped by day** (Today / Yesterday / date) with per-day totals. Each row shows
  the description, project · activity, duration and time range.
- **Per-entry actions** from a row menu: resume, edit, duplicate, or split an entry at its midpoint.
  You can also discard a running timer you started by mistake.
- **Summary footer** with Today / This week / This month totals (and optional income), live while a
  timer runs (toggleable).
- **Dashboard** with running status, totals, a recent-days chart and a time-by-project breakdown.
- **Reports** for a chosen range (week / month / last 7 / last 30 days or a custom range): totals,
  a billable split, a per-day chart, and by-project / by-activity / by-tag breakdowns. Filter by
  project, activity, tag, or billable-only. Export to **CSV**, **Excel (.xlsx)**, or **PDF**.
- **Income tracking** — set an hourly rate and currency; optional secondary currency with an
  exchange rate for converted totals in the summary, dashboard, and reports.
- **Idle detection** — when you're away, prompts to discard idle time and restart the timer
  (threshold configurable in Settings).
- **Multiple organisations** — connect several Kimai servers, switch between them, and manage each
  from Settings (Bearer token or legacy header auth for old Kimai versions).
- **Floating widget** — an always-on-top, draggable mini window showing the running entry and timer.
- **System tray** to toggle the window, pin the widget, stop the timer, open settings or quit.
- **Appearance** — light / dark / system theme, accent color, font size and family, week-start day,
  and a configurable default project + activity.
- **17 languages** (including RTL for Persian and Arabic) — switch UI language in Settings.
- **Global shortcuts** — `Ctrl/Cmd+Shift+K` to show/hide the window, `Ctrl/Cmd+Shift+S` to start or
  stop the timer (full list in Settings).
- **Stays in sync** by polling Kimai's active timer, so it self-corrects when you change a timer in
  the web UI or on another device.

## Download

Grab the latest installer for your OS from the
[Releases page](https://github.com/faeztgh/kimai-tracker/releases):

- **Windows** — `.exe` (NSIS installer)
- **macOS** — `.dmg`
- **Linux** — `.AppImage` and `.deb`

Builds are produced for both x64 and arm64.

## First run

1. In Kimai, create an API token under your profile → API access (or use username + API password on
   old Kimai servers — enable **legacy header auth** on the setup screen).
2. Launch Kimai Tracker. On the setup screen enter your organisation name, server URL, and
   credentials, then **Test & Save**. Add more servers later from Settings.
3. Use the tray icon or `Ctrl/Cmd+Shift+K` to toggle the window; `Ctrl/Cmd+Shift+S` to start or
   stop the timer. Pin the floating widget from the header.

Your token is encrypted at rest with the OS keychain (DPAPI / Keychain / libsecret via Electron's
`safeStorage`) and never leaves the main process. On Linux with no keyring available it falls back to
weak encryption, and Settings warns you when that happens.

## Develop

Requires Node ≥ 20.19 (Node 24 works) and [pnpm](https://pnpm.io) 10+. This repo uses pnpm; don't mix
in npm or yarn.

```bash
pnpm install
pnpm dev          # Electron + Vite with HMR
```

If `pnpm install` reports "Ignored build scripts", the build allowlist is already in `package.json`
(`pnpm.onlyBuiltDependencies`). If Electron's binary is missing afterwards, run `pnpm rebuild electron`.

## Build & package

```bash
pnpm typecheck    # tsc for main/preload + renderer
pnpm build        # bundles to out/{main,preload,renderer}
pnpm dist         # installers for the current OS in release/<version>/
# or target one OS:
pnpm dist:win     # NSIS .exe
pnpm dist:mac     # .dmg
pnpm dist:linux   # .AppImage + .deb
```

## Test

```bash
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright end-to-end tests
```

## How it works

```
Renderer (React, Chromium, contextIsolation on)
  └─ window.api  ── contextBridge ──▶  Main process (Node)
                                         ├─ Kimai HTTP (Node fetch + Bearer or legacy auth)
                                         ├─ token vault (safeStorage, encrypted at rest)
                                         ├─ prefs.json (window position, non-secret settings)
                                         ├─ tray + two BrowserWindows
                                         └─ global shortcut / autostart / single-instance
                                                │ HTTPS
                                                ▼
                                          self-hosted Kimai /api/*
```

Every Kimai request goes out from the main process, not the renderer. That avoids webview CORS and
keeps credentials out of the renderer entirely. Both windows share one renderer bundle and learn
their role (`main` or `floating`) from a launch argument the preload reads.

## Releases & versioning

Releases are automated in `.github/workflows/release.yml`. On a push to `main` the version is derived
from [Conventional Commits](https://www.conventionalcommits.org/) (`fix:` → patch, `feat:` → minor,
`feat!:` / `BREAKING CHANGE` → major) and tagged. A Windows / macOS / Linux matrix then builds the
installers for x64 and arm64 and publishes them to the GitHub Release, which doubles as the
auto-update feed for `electron-updater`.

## Tech stack

Electron, React 19, TypeScript and Vite (built with electron-vite), Tailwind CSS, TanStack Query
for polling and caching, i18next for localization, and Zustand for state. Packaged with
electron-builder.

## Support this project

Kimai Tracker is a free, open-source project built and maintained in spare time. If it saves you
time or you find it useful, here are a few ways to help keep it alive — they all make a real
difference:

- **⭐ Star the repo** — [give it a star on GitHub](https://github.com/faeztgh/kimai-tracker). It
  costs nothing, takes a second, and is the single best way to boost visibility so more people
  discover the project.
- **💖 Donate** — if this app earns a place in your daily workflow, please consider
  [buying the creator a coffee ☕](https://www.faez.pro/support). Even a small
  one-time tip directly funds the time spent on fixes, new features, and ongoing maintenance.
- **🛠️ Contribute** — bug reports, feature ideas, and pull requests are hugely appreciated. See
  [CONTRIBUTING](./CONTRIBUTING.md) to get started; even improving docs or filing a clear issue is a
  valuable contribution.
- **📣 Spread the word** — tell other Kimai users, share it on social media, or write about it.
  Word of mouth keeps small open-source projects going.

Every star, donation, and contribution is genuinely motivating and helps the project grow. Thank
you for your support! 🙏

## Author

Built and maintained by **[faeztgh](https://www.faez.pro?utm_source=github_kimai-tracker)**. Issues and pull requests are
welcome — see [CONTRIBUTING](./CONTRIBUTING.md).

## License

Licensed under the **[PolyForm Noncommercial 1.0.0](./LICENSE)** license — © 2026 faeztgh.

You may use, modify, and share this software for **noncommercial and personal purposes**, and you
must keep the author attribution (the `Required Notice`) intact. **Commercial use is not permitted**
without a separate license from the author.
