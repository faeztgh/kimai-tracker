# Contributing to Kimai Tracker

Thanks for your interest in improving Kimai Tracker! This is a desktop time-tracking client for
self-hosted [Kimai](https://www.kimai.org), built with Electron + React + TypeScript.

## Getting started

Requires Node ≥ 20.19 (Node 22/24 work) and [pnpm](https://pnpm.io) 10+. This repo uses **pnpm** —
please don't introduce npm or yarn lockfiles.

```bash
pnpm install
pnpm dev          # Electron + Vite with HMR
```

Before opening a PR:

```bash
pnpm typecheck    # tsc for main/preload + renderer — must pass
pnpm build        # must pass
```

## Commit messages

Releases are fully automated from [Conventional Commits](https://www.conventionalcommits.org/), so
your commit prefixes drive the next version:

- `fix:` → patch release
- `feat:` → minor release
- `feat!:` or a `BREAKING CHANGE:` footer → major release
- `chore:`, `docs:`, `refactor:`, `ci:` → no release on their own

## Project conventions

- All Kimai HTTP calls go out from the **main process**, never the renderer. The API token lives
  only in main (`safeStorage`) and must never reach the renderer, `localStorage`, or any plaintext
  file. PRs that weaken this will be asked to change.
- Keep the renderer's `window.api` surface minimal and typed (`electron/preload` ↔ `src/global.d.ts`
  must stay in sync).
- Match the surrounding code style; keep comments terse and only where they add real "why".
- For UI changes, check both light and dark themes and a couple of accent colors.

## Reporting bugs / requesting features

Use the issue templates. Never paste your API token or server URL into an issue. For security
issues, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## License of contributions

By contributing, you agree that your contributions are licensed under the project's
[PolyForm Noncommercial 1.0.0](./LICENSE) license, and that the author attribution
(`Required Notice`) is preserved.
