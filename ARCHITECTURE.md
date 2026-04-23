# Architecture

This is a map of the codebase, not a tutorial. Read [README.md](./README.md)
for what RBase is and [SECURITY.md](./SECURITY.md) for the trust model.

## Why this shape

RBase is an R IDE that runs entirely in the browser. There is no backend
server of our own: not for auth, not for storage, not for the LLM. The
whole app is a static Next.js build that talks to OpenRouter directly from
the user's browser. That choice is load-bearing: it means zero hosting
cost for us or for self-hosters, and it means we never see your data or
your key. If you're tempted to add a server, re-read
[CONTRIBUTING.md](./CONTRIBUTING.md) first.

BYOK is the tradeoff. Users paste their own OpenRouter API key, which
lives in `localStorage` and gets attached to `Authorization` headers on
requests to `openrouter.ai`. We can't rate-limit, we can't meter, and we
can't prevent someone with physical access to the browser from reading
the key; that's all in SECURITY.md. The upside is that the app works
with no account, no billing integration, and no server-side secrets.

Where to make changes:

- UI contributors stay in `frontend/components/`.
- Agent behavior (tools, system prompt, loop) lives in `frontend/lib/agent/`.
- Storage (DuckDB schema, OPFS, chat memory) lives in `frontend/lib/db/`.
- WebR / R-environment plumbing lives in `frontend/lib/r/`.
- Cross-cutting React state lives in `frontend/lib/hooks/`.

## Folder map

```
frontend/
├── app/                           Next.js App Router routes
│   ├── page.tsx                   landing page
│   ├── projects/
│   │   ├── page.tsx               project list (dashboard)
│   │   └── [id]/page.tsx          the IDE (chat + data + plots + console)
│   ├── privacy/                   privacy policy
│   ├── terms/                     terms of service
│   ├── error.tsx                  per-route error boundary
│   └── global-error.tsx           root error boundary (e.g. layout throws)
│
├── components/
│   ├── ui/                        shared chrome (used across routes)
│   │   ├── Nav.tsx                top nav bar
│   │   ├── Footer.tsx             site footer
│   │   ├── Doc.tsx                markdown wrapper for /privacy, /terms
│   │   ├── RBaseMark.tsx          logo/wordmark component
│   │   ├── SettingsMenu.tsx       dropdown menu (key, theme, forget key)
│   │   └── theme.ts               theme color tokens
│   │
│   ├── project/                   IDE workspace components
│   │   ├── ProjectToolbar.tsx     top bar of the IDE (rename, key, nav)
│   │   ├── LeftSidebar.tsx        icon-rail sidebar hosting Env / Plots
│   │   ├── EnvironmentPanel.tsx   list of R objects (data frames + scalars)
│   │   ├── PlotPanel.tsx          grid of captured plots
│   │   ├── PlotLightbox.tsx       fullscreen plot viewer with keyboard nav
│   │   ├── TabBar.tsx             tab row for open datasets + script
│   │   ├── DataPanel.tsx          container for the active data view
│   │   ├── DataTable.tsx          virtualized table over a DuckDB view
│   │   ├── ScriptEditor.tsx       CodeMirror R script pane
│   │   ├── ConsolePanel.tsx       R console host (wraps RConsole)
│   │   ├── ChatPanel.tsx          right-hand chat column (model picker + list)
│   │   ├── ChatMessages.tsx       message list (markdown, math, tool cards)
│   │   ├── ChatInput.tsx          textarea + send/stop button
│   │   └── PlanChecklist.tsx      renders the plan tool's step list
│   │
│   ├── landing/
│   │   └── IDEScreenshot.tsx      animated IDE screenshot on landing page
│   │
│   └── settings/
│       ├── ApiKeyModal.tsx        first-run modal that collects the key
│       └── KeyManager.tsx         view / replace / forget the key
│
├── lib/
│   ├── agent/                     TypeScript agent loop (BYOK → OpenRouter)
│   │   ├── agent.ts               runAgent(): the turn loop + tool dispatch
│   │   ├── llm.ts                 streamCompletion() fetch + SSE parser
│   │   ├── config.ts              system prompt, TOOLS, model, constants
│   │   └── types.ts               Message, ToolCall, AgentHandlers, etc.
│   │
│   ├── db/                        DuckDB-WASM (OPFS persistence + queries)
│   │   ├── duckdb.ts              singleton connection, schema, sanitizers
│   │   ├── chatMemory.ts          _chat_history CRUD
│   │   ├── plotStorage.ts         _plot_store CRUD
│   │   ├── preferences.ts         _user_preferences KV
│   │   └── scriptStorage.ts       _r_scripts CRUD
│   │
│   ├── hooks/                     composable React state for the IDE page
│   │   ├── useRuntime.ts          tracks WebR + DuckDB init status
│   │   ├── useProjectData.ts      loads project + dataset metadata
│   │   ├── useREnvironment.ts     keeps R ↔ registry ↔ view tables in sync
│   │   ├── useDataTable.ts        pagination + sort state for the table
│   │   ├── usePlotStore.ts        in-memory plots backed by _plot_store
│   │   ├── useScript.ts           debounced script editor persistence
│   │   ├── useAgentChat.ts        chat message list + rAF batching
│   │   ├── useAgentExecution.ts   bridges chat state to the agent loop
│   │   ├── useLeftSidebar.ts      left sidebar tab + resize state
│   │   ├── useResizablePanel.ts   generic draggable panel width hook
│   │   └── useTheme.ts            light/dark toggle persisted to localStorage
│   │
│   ├── key/
│   │   ├── keyStore.ts            get/set/remove the OpenRouter key
│   │   └── useApiKey.ts           hook exposing the key + has-key flag
│   │
│   ├── r/                         WebR (R-in-WASM) integration
│   │   ├── webr.ts                WebR singleton, evalR, listREnvironment
│   │   ├── bridge.ts              execAndSync, DuckDB ⇄ R data.frame transfer
│   │   ├── registry.ts            stableId → rName mapping + renames
│   │   ├── rCodeHistory.ts        _r_code_history CRUD (replay fallback)
│   │   ├── rdata.ts               _rdata_blobs: saveRDS / load round-trip
│   │   └── envSnapshot.ts         per-object digest + blob snapshot system
│   │
│   └── projects.ts                project CRUD (wraps _projects / _project_datasets)
```

## Data flow: a chat turn

What happens when the user types into the chat input:

1. `ChatInput.onSend(text)` calls `useAgentExecution.handleSendMessage(text)`.
2. `gatherDatasetContext()` walks the registry and asks the R runtime for
   each frame's columns via `listREnvironment()` and
   `cat(paste(colnames(df), collapse="\t"))`. The active frame plus the
   others go into the LLM's context.
3. `chatMemory.getHistory(projectId)` pulls recent turns from the
   `_chat_history` DuckDB table.
4. `runAgent({ apiKey, model, message, history, datasetContext, handlers, signal })`
   is called (`lib/agent/agent.ts`).
5. The agent builds a JSON system message (role, instructions,
   `active_dataset`, `other_datasets`, `conversation_history`, current
   plan) and calls `streamCompletion()` from `lib/agent/llm.ts`, which
   POSTs to `https://openrouter.ai/api/v1/chat/completions` with
   `Authorization: Bearer <user's key>` and `stream: true`.
6. Stream chunks flow back. `delta.content` is forwarded to
   `handlers.onMessageDelta`, which appends to the streaming assistant
   bubble. `delta.tool_calls` is accumulated by index into a buffer map
   until the turn finishes.
7. If `finish_reason === "tool_calls"`, the agent dispatches each call:
   - `execute_r` → awaits `handlers.onExecuteR({code, description})`.
     That handler runs the code via `execAndSync` (or `evalR`) through
     WebR, captures plot bitmaps, reconciles the registry via
     `useREnvironment` (build new registry, sync view tables, persist
     renames, drop stale tables), and returns `{success, stdout, stderr,
     error, updatedActiveDataset, updatedOtherDatasets}`.
   - `plan` → pushes steps to the chat as a checklist card.
   - `ask_user` → returns a Promise that resolves when the user submits
     an answer through the chat input; the loop pauses in the meantime.
8. Each tool result is appended as a `role: "tool"` message and the
   agent calls the LLM again.
9. The loop ends when `finish_reason !== "tool_calls"` or when
   `MAX_ROUNDS` (25) is reached. On completion, `chatMemory.appendTurn()`
   persists the round (user text, joined assistant text, R code, plot
   data URLs) to `_chat_history`.

Cancellation: the whole turn is wrapped in an `AbortController`.
`handleStopChat()` aborts the fetch and resolves any pending `ask_user`
Promise with an empty string so the loop unblocks.

## Storage

Mirrors what SECURITY.md says: nothing leaves the browser.

- **OPFS** (`opfs://RBase_<userId>_v2.duckdb`) holds the DuckDB-WASM
  database file. Namespaced by user id so multiple users on the same
  browser don't collide. The `_v2` suffix is a schema version; bump it
  and change the path when the schema breaks backward compatibility.
- **localStorage** holds the OpenRouter key (`rbase:openrouter_key`),
  the theme choice, and the R console transcript per project.
- **sessionStorage** holds the OpenRouter key if the user ticked
  "Session only" in the first-run modal.

Tables in the DuckDB file (see `lib/db/duckdb.ts`):

| Table                  | What it holds                                              |
|------------------------|------------------------------------------------------------|
| `_projects`            | project id, name, timestamps                               |
| `_project_datasets`    | which datasets are attached to which project + r_name      |
| `_datasets`            | dataset metadata (table_name, columns, row_count, size)    |
| `_chat_history`        | user ↔ assistant turns, r_code, plot data URLs             |
| `_r_code_history`      | every R command run (legacy replay fallback)               |
| `_rdata_blobs`         | saveRDS/save() BLOBs: user uploads + env snapshots         |
| `_plot_store`          | captured plots as PNG data URLs                            |
| `_r_scripts`           | the script editor's content, per project                   |
| `_user_preferences`    | simple KV (selected model, etc.)                           |
| `_rview_<stableId>`    | transient DuckDB views that mirror R data frames for the table panel |

All SQL goes through `sanitizeIdentifier()` and `sanitizeValue()` from
`lib/db/duckdb.ts`. Never interpolate user input directly; see
CONTRIBUTING.md.

## Where to put new features

- New route → `app/<route>/page.tsx`. Use `components/ui/Nav` and
  `Footer` for chrome.
- New shared primitive (button, modal, etc.) → `components/ui/`.
- New IDE panel (something that lives inside a project) →
  `components/project/`. Compose it into `app/projects/[id]/page.tsx`.
- New React hook → `lib/hooks/use<Name>.ts`. Hooks own state; components
  render it. Anything app-wide (typing indicator, error banners) should
  go through `useAgentExecution`.
- New DuckDB table → add it to `createTables()` in `lib/db/duckdb.ts`,
  write a small module under `lib/db/` that wraps its CRUD, and add a
  migration in `runMigrations()` if existing users need it.
- New agent tool:
  1. Add the definition to `TOOLS` in `lib/agent/config.ts`.
  2. Extend `AgentHandlers` in `lib/agent/types.ts`.
  3. Dispatch the new `name` in the switch inside `lib/agent/agent.ts`.
  4. Plumb the handler through `useAgentExecution.ts` and wire its UI
     callbacks in `app/projects/[id]/page.tsx`.

## Running locally

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>, create a project, paste an
[OpenRouter key](https://openrouter.ai/keys). No env vars required
(`.env.local` is only used for optional Sentry).

Before opening a PR:

```bash
# in frontend/
npm run lint
npx tsc --noEmit
npm run build
```
