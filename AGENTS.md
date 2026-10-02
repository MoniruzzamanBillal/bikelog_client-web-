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

## Reference fields can arrive populated OR as a bare id — always guard
`maintenanceType`/`oilType` may be either `{ _id, name }` or a bare id string, so read them through a `typeof x === "object"` guard before touching `.name` (and derive React keys from `._id`, never from the object itself). `RemindersBanner.tsx`, `MaintenanceLogCard.tsx` and `MaintenanceLogFormModal.tsx` all do this correctly today.

This file previously documented a "blank maintenance type names" bug in `RemindersBanner.tsx`. **That bug is fixed** — spec 25 added the guard, and `bikelog_server` spec 41 §C now populates `{ _id, name }` on the reminders payload server-side, which is also what lets a *soft-deleted* type still resolve its name. Re-verified in a browser during spec 28. Keep the guards: they are the live path now, not legacy — do not "tidy" them away.

## VSCode auto-format on save
`.vscode/settings.json` runs eslint fix + organize imports on save. Import lines will be automatically rearranged.
