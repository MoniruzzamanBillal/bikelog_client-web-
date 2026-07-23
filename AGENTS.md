# AGENTS.md

This is a compact supplement to `CLAUDE.md` — read that first for full architecture and conventions. This file covers only what an agent is likely to miss or get wrong.

## Pre-commit checks
- `yarn lint` must exit 0 (fix, never disable). Pre-existing React Compiler warnings on `useReactTable()` and RHF `watch()` call sites are known.
- `yarn build` must succeed.
- CI (`.github/workflows/webpack.yaml`) runs `yarn build` only — no deploy step, build-only.

## envConfig.ts ignores the env var
`utils/config/envConfig.ts` hardcodes `https://bikelog-server.vercel.app/api`. The `NEXT_PUBLIC_API_BASE_URL` env var fallback is **commented out**. To target localhost during development, uncomment that line or change the hardcoded URL.

## Stale context docs
`context/architecture.md` and `context/code-standards.md` describe an outdated folder layout (`components/feature/<domain>/` + domain-hook layer). The real code uses `components/(main)/<Domain>/` with no domain hooks — API calls (`useFetchData`/`usePost`/etc.) are inlined in components. Trust `CLAUDE.md` and the on-disk code over those two files.

## Navigation: `redirect()` is server-only
`redirect()` from `next/navigation` only works in Server Components during render. Never use it in event handlers, `useEffect`, or `setTimeout` — use `router.replace()` instead. `app/page.tsx` is the one exception (server-side render-time redirect).

## Known display bug: blank maintenance type names
`RemindersBanner.tsx` renders blank names because the backend's `getRemindersFromDB` doesn't `.populate("maintenanceType")`. Workaround: resolve the ObjectId client-side against the maintenance-types list, or add a `typeof === "object"` guard before reading `.name` (as `MaintenanceLogCard.tsx` does).

## VSCode auto-format on save
`.vscode/settings.json` runs eslint fix + organize imports on save. Import lines will be automatically rearranged.
