# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately via GitHub Security Advisories:
<https://github.com/faeztgh/kimai-tracker/security/advisories/new>

Include steps to reproduce and the impact. You can expect an initial response within a few days.
Please give a reasonable window to release a fix before any public disclosure.

## Supported versions

Only the latest released version receives security fixes.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## How Kimai Tracker handles your data

- Your Kimai **API token is encrypted at rest** with the OS keychain (DPAPI / Keychain / libsecret)
  via Electron's `safeStorage`, and the ciphertext is stored under the app's `userData` directory.
- The token lives **only in the main process**. All Kimai requests are made from main; the renderer
  never receives the token and outbound requests are restricted to your configured server.
- On Linux with no keyring available, `safeStorage` falls back to weak encryption — the app warns
  you in Settings when that happens.
- Renderer windows run with `contextIsolation: true`, `nodeIntegration: false`, a minimal typed
  `window.api` bridge, and a strict Content-Security-Policy.

When reporting an issue, never include your real API token or server URL.
