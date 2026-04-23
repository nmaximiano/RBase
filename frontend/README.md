# RBase frontend

The only package in this repo. A Next.js 16 app that runs entirely in the
browser: WebR for R, DuckDB-WASM for storage, a TypeScript agent loop that
calls OpenRouter directly with the user's BYOK API key.

For the project overview, architecture, and contribution guide, see the
repo root: [README.md](../README.md), [CONTRIBUTING.md](../CONTRIBUTING.md),
[SECURITY.md](../SECURITY.md).

## Development

```bash
npm install
npm run dev   # http://localhost:3000
```

Dev and build scripts use `--webpack` because Next.js 16's default
(Turbopack) doesn't yet play nicely with the WebR / DuckDB-WASM config.

## Environment variables

None required. RBase runs entirely in the browser with a user-supplied
OpenRouter key; there is nothing to configure server-side.

## Layout

| Path                  | What it does                                             |
|-----------------------|----------------------------------------------------------|
| `app/`                | Next.js routes (landing, projects, project view, legal)  |
| `lib/agent/`          | TypeScript agent loop (system prompt, LLM, main loop)    |
| `lib/key/`            | OpenRouter key storage (localStorage / sessionStorage)   |
| `lib/r/`              | WebR integration, registry, DuckDB bridge                |
| `lib/db/`             | DuckDB-WASM singleton, chat memory, plot storage         |
| `lib/hooks/`          | React hooks for runtime, projects, agent execution, etc. |
| `components/project/` | IDE UI: chat panel, data table, R console, plots         |
| `components/settings/`| API key modal + manager                                  |
