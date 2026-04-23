# RBase

An in-browser R IDE with an integrated AI agent. Upload a dataset, ask a
question, and the agent writes and runs R code for you. No server, no
sign-up, no tracking. Your data and your OpenRouter key never leave your
browser.

**Live:** [tryrbase.com](https://tryrbase.com)

## Why

RBase is a research-flavored project: a data-science IDE that's fully
open source, has no backend, and costs zero to self-host. The only piece
that isn't local is the LLM, which you call directly from your browser
using your own OpenRouter key.

- **No account, no sign-up.** Open the app, paste an OpenRouter key, go.
- **No server.** Everything runs in your browser. Projects and datasets
  live in [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).
- **Your key stays in your browser.** The agent calls OpenRouter directly.
  We have no way to see or store it.
- **R runs locally too.** [WebR](https://docs.r-wasm.org/webr/) + base R,
  dplyr, tidyr, stringr, lubridate, ggplot2 all compiled to WebAssembly.
- **Fully open source.** Apache-2.0. Fork it, run it, improve it.

## Quick start (local development)

```bash
git clone https://github.com/nmaximiano/rbase.git
cd rbase/frontend
npm install
npm run dev
```

Open <http://localhost:3000>, click **Try it — no login**, paste an
[OpenRouter key](https://openrouter.ai/keys), and you're in.

No env vars are required.

## Self-host

RBase is a Next.js app that needs a small Node runtime (or a host that
speaks Next natively: Vercel, Cloudflare Pages, Netlify, Render, Fly,
any Node host).

```bash
cd frontend
npm run build
npm start   # serves the production build on :3000
```

Your users still bring their own OpenRouter keys. There is nothing to
configure server-side because there is no backend of our own. The Node
process only serves the static UI. All work (R, DuckDB, agent loop)
happens in the browser.

Two COOP/COEP headers are required for WebR to work (see
`next.config.ts`); most Next-aware hosts honor them automatically.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Browser                                    │
│  ┌──────────────────────────────────────┐   │
│  │ Next.js app                          │   │
│  │  ├── React UI + CodeMirror           │   │
│  │  ├── TypeScript agent loop (lib/agent)   │
│  │  ├── WebR (R in WebAssembly)         │   │
│  │  └── DuckDB-WASM (projects/datasets) │   │
│  └──────────────────────────────────────┘   │
│           │                                 │
│           │ HTTPS, user's BYOK key          │
│           ▼                                 │
└─────────────────────────────────────────────┘
            │
            ▼
        OpenRouter
```

That's it. No backend of our own, no database, no auth server.

### Key modules

| Path                           | What it does                                                |
|--------------------------------|-------------------------------------------------------------|
| `frontend/app/`                | Next.js routes (landing, projects list, project view)       |
| `frontend/lib/agent/`          | TypeScript agent loop: LLM calls + tool handlers            |
| `frontend/lib/key/`            | localStorage-based OpenRouter key storage                   |
| `frontend/lib/r/`              | WebR integration (evalR, bridge to DuckDB, registry)        |
| `frontend/lib/db/`             | DuckDB-WASM singleton, OPFS persistence, chat memory        |
| `frontend/lib/projects.ts`     | Project CRUD (backed by DuckDB)                             |
| `frontend/components/project/` | IDE components: chat, data table, R console, plots          |
| `frontend/components/settings/`| OpenRouter key modal and key manager                        |

The agent (`lib/agent/agent.ts`) is a single loop that calls OpenRouter with
streaming, runs tool calls (R code, plan, ask-user), and yields events
to the UI via handler callbacks. No SSE, no HTTP round-trip, no queues.

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup
tips and conventions. No CLA required.

## Trust model

Read [SECURITY.md](./SECURITY.md) for the full picture. Short version: your
OpenRouter key lives in `localStorage` in this browser only, and every
network call this app makes is visible in your DevTools Network tab.

## License

[Apache-2.0](./LICENSE).
