# Security & trust model

RBase has no backend. That fact is what the rest of this document
follows from.

## What we can see

Nothing. We have no servers, no database, no logs, and no external
observability. Every network request this app makes is one of:

- Loading static assets from the site's host (e.g. Vercel, Cloudflare
  Pages, GitHub Pages).
- Calling `https://openrouter.ai/api/v1/chat/completions` with your
  OpenRouter key, from your browser.

You can verify this yourself in DevTools → Network.

## Where your OpenRouter key lives

The key you paste into the first-run modal is stored in your browser's
`localStorage` under `rbase:openrouter_key` (or `sessionStorage` if you
ticked "Session only"). It is:

- Sent in the `Authorization` header on requests to `openrouter.ai`.
- Never sent anywhere else.
- Never written to a server we run.
- Removable from the settings menu (**Forget key**).

### Threat model

- **Someone with access to your computer** can read `localStorage`. If
  you're on a shared machine, use "Session only" and log out.
- **A malicious browser extension** can read `localStorage` and steal
  your key. RBase cannot defend against this; it's a property of the
  browser's extension model.
- **An XSS bug** in RBase would let an attacker steal the key. We do
  sanitize markdown and never eval user content, but if you find an XSS
  path, please report it (see below).
- **A supply-chain attack** on a dependency (e.g. a compromised npm
  package) could exfiltrate the key. We keep dependencies lean and prefer
  vetted libraries. We welcome PRs that remove unneeded deps.

### Spending

OpenRouter bills your account for the inference calls your key makes.
RBase does not, and cannot, enforce spending limits. Set a monthly cap
on your OpenRouter account if you're worried.

## Where your data lives

Your datasets, sessions, chat history, and R environment state are stored
in your browser's [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
via DuckDB-WASM, at `opfs://RBase_local.duckdb`. Nothing is synced across
devices. Clearing browser storage wipes your sessions.

## Reporting a vulnerability

Please open a [private GitHub security advisory](https://github.com/nmaximiano/rbase/security/advisories/new)
instead of filing a public issue. Include:

- What you found
- How to reproduce it
- The potential impact

We'll acknowledge within a few days. For high-severity issues we'll patch
and disclose promptly.
