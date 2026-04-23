# Contributing to RBase

Thanks for considering a contribution. RBase is an experimental research
project; small patches, bug reports, and new ideas are all welcome.

## Ground rules

- Be kind and specific. Code reviews are about the code.
- No CLA is required. By opening a PR, you agree your contribution is
  licensed under [Apache-2.0](./LICENSE) along with the rest of the repo.
- Open an issue before starting a large change so we can align on scope.
- Small, focused PRs get merged faster than large ones.

## Local setup

```bash
git clone https://github.com/nmaximiano/rbase.git
cd rbase/frontend
npm install
npm run dev
```

Open <http://localhost:3000> and paste an
[OpenRouter key](https://openrouter.ai/keys).

No backend, no env vars, nothing else to configure.

## Running checks

```bash
# in frontend/
npm run lint      # eslint
npx tsc --noEmit  # typecheck
npm run build     # full production build
```

CI runs the same commands. Green locally means green in CI most of the time.

## Conventions

- **TypeScript**, strict mode. Prefer `type` over `interface` unless you
  need declaration merging.
- **No `any`** unless the alternative is genuinely worse; justify in a
  code comment.
- **Hooks own state, components render it.** New features should feel
  like the existing code; see `app/sessions/[id]/page.tsx` for the
  composition pattern.
- **SQL safety:** all DuckDB queries must use `sanitizeIdentifier()` and
  `sanitizeValue()` from `lib/db/duckdb.ts`. Never interpolate user input.
- **No emojis in source** unless the user explicitly asks.
- **Comments only when the *why* is non-obvious.** Well-named identifiers
  handle the *what*.

## Agent changes

The agent lives in `frontend/lib/agent/`. Changes to the system prompt
(`config.ts`) are especially high-impact. Test on at least a few sample
tasks before opening a PR.

Adding a new tool:
1. Add the tool definition to `TOOLS` in `lib/agent/config.ts`.
2. Add a handler method in `AgentHandlers` (`lib/agent/types.ts`).
3. Dispatch it in the switch inside `agent.ts`.
4. Plumb the handler through `useAgentExecution.ts` and into the UI.

## What's out of scope

- Re-adding a backend server. The point of the pivot was to remove it.
- Re-adding accounts, billing, or user data storage. Everything must stay
  on-device unless a very strong case is made.
- Behavior that would require server-side secrets.

Features that add *optional* cross-device sync (client-side encrypted to a
BYO backend like Supabase) are OK as long as they're fully opt-in and the
BYOK key never leaves the browser.

## Reporting bugs / asking questions

Open a GitHub issue. Please include:

- Browser + OS
- Steps to reproduce
- What you expected vs what happened
- Any errors from the browser console / DevTools Network tab
  (**don't include your OpenRouter key**; it appears in the `Authorization`
  header of requests to openrouter.ai)

If the bug might be security-sensitive, see
[SECURITY.md](./SECURITY.md) for how to report it privately.
