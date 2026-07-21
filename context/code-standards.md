# Code Standards

## TypeScript & Next.js Patterns

- Every feature page is a client component (`"use client"` at the top of `page.tsx`). No server components for data-fetching pages — everything goes through TanStack Query.
- Type every API payload/response explicitly in `components/feature/<domain>/<domain>.types.ts` (e.g. `TBike`, `TCreateBikePayload`). Mirror the backend's `.interface.ts` field names/casing exactly — don't invent different names client-side.
- No TS `enum` — use `as const` objects + derived types, matching the backend's own convention (`bikelog_server/context/code-standards.md`, if present, or `user.interface.ts`'s `UserRole` pattern).
- Route params: type `useParams<{ bikeId: string }>()` explicitly per page, don't leave it as `string | string[]`.

## File Organization & Naming

- Routes: every v1 (regular-user) route lives under `app/(main)/<route>/page.tsx` (route group, shares `AppShell`, hard-gated behind a session — see `architecture.md`'s Auth & Access Model), kept as thin as possible (see route table below). `/login`, `/register` live at `app/login/`, `app/register/`, outside the group — the only pages reachable without a session. `app/(admin)/` exists as a reserved route group name for a future admin panel — no files under it in v1.
- Feature code: `components/feature/<domain>/` — one folder per backend module. Inside: `<Domain>List.tsx`, `<Domain>FormModal.tsx` (create+edit share one modal, keyed by whether an entity is passed in), `<domain>.types.ts`, and a `use<Domain>.ts` hook file wrapping `useApi.ts` calls for that domain (e.g. `useBikes.ts` exporting `useBikes()`, `useCreateBike()`, `useUpdateBike()`, `useDeleteBike()`). The `auth` domain is the one exception — see its own spec (`02-auth.md`) for why it skips the `use<Domain>.ts` wrapper.
- Shared/reusable UI: `components/shared/*` (inherited) — extend in place, don't fork.
- Layout/shell: `components/layout/` (`AppShell.tsx`, `BottomNav.tsx` or `TopNav.tsx`) — the session gate itself lives in `app/(main)/layout.tsx`, not a separate component, see `architecture.md`.
- Auth/token: `lib/tokenManager.ts` (new, `cookies-next`-based — see `architecture.md`) is the only place that touches the auth cookie directly.
- One component per file. `PascalCase.tsx` for components, `camelCase.ts` for hooks/utils.

## Route Table

| Path | Purpose |
|---|---|
| `/` | No page content — unconditionally redirects to `/login`. |
| `/login`, `/register` | The only routes reachable without a session. Each links to the other. Redirect to `/dashboard` if already authed. |
| `/dashboard` (`app/(main)/dashboard`) | Bike list + create-bike modal |
| `/bikes/[bikeId]` | Bike hub: odometer, reminders banner, links to sub-features, edit/delete bike |
| `/bikes/[bikeId]/fuel-logs` | Fuel log list + create/edit modal |
| `/bikes/[bikeId]/mileage` | Mileage stats, tab-switched: History / Monthly / Yearly / Lifetime (one page, one component per tab — not four routes) |
| `/bikes/[bikeId]/maintenance-logs` | Maintenance log list + create/edit modal; reminders list also shown here (not a separate route) |
| `/bikes/[bikeId]/spending` | Spending summary, tab-switched: Month / Year / Lifetime |
| `/settings/catalog` | Maintenance-type + engine-oil-type create/list (both catalogs, one page — neither has an update/delete API, so this is create+list only) |

All rows below `/login`/`/register` live under `app/(main)/` and are unreachable without a valid session (see `architecture.md`'s Auth & Access Model) — that's true of every route in this table, not called out per-row.

No `/bikes/new` or `/fuel-logs/new` routes — creation is always a modal on the relevant list page (`BaseModal` + `FormActionButtons`), never a separate page. Faster to build, and the reusable modal already does the job.

`app/(admin)/` is a reserved route group, not in this table — no admin routes exist in v1 (see `project-overview.md`'s "Roles" section).

## Data Fetching & Mutations

- `hooks/useApi.ts` and `utils/api.ts` are rewritten from the `table` scaffold's versions of the same files — see `architecture.md`'s "API Calling & Mutation Pattern" for the exact signatures. The rest of this section describes how to use them.
- Reads: `useFetchData<TResponse>([domain, ...keyParts], endpoint)` from `hooks/useApi.ts`. Query key always starts with the domain string (`"bikes"`, `"fuel-logs"`), followed by whatever scopes it (`bikeId`, `page`, `filters`) — this is what makes invalidation targeted.
- Writes: `usePost`/`usePatch`/`useDelete(invalidateQueriesKeys)` — the mutation's `url` is passed at the call site inside `mutateAsync({ url, payload })` (`{ url }` only for `useDelete`, no payload), **not** baked into the hook call itself — one generic mutation hook per HTTP verb, reused across every domain. Always pass the exact list query key(s) to invalidate (e.g. `[["fuel-logs", bikeId]]`), never a blanket invalidate-everything.
- Query params (pagination, filters, targetMonth/targetYear, period): build the endpoint string with `utils/buildUrl.ts` before passing to `useFetchData`/`mutateAsync({url})` — `useApi.ts`'s functions don't take a separate params object, the endpoint string must already be complete.
- Every domain's hook file (`useBikes.ts` etc.) is the *only* place that calls `useFetchData`/`usePost`/`usePatch`/`useDelete` for that domain, and is what bakes the fixed endpoint into a convenience function (e.g. `useCreateBike()` returns a `createBike(payload)` that internally calls `mutateAsync({ url: "/bikes", payload })`). Components call the domain hook, never `useApi.ts` directly — see `architecture.md`'s example.

## Styling Rules

- Tailwind utility classes only. No inline `style={}` except for genuinely dynamic values (e.g. a computed progress-bar width).
- Mobile-first: write the unprefixed (base) classes for the ~375–430px layout, add `sm:`/`md:` only where desktop should differ. Never the reverse.
- Reuse existing `globals.css` tokens (`bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-muted-foreground`, `bg-surface-*`, etc.) — don't hardcode hex/oklch colors in a component.
- Two tokens some inherited shared components reference (`table-border`, `primary-500`/`primary-600`) don't exist in `globals.css` yet — add them to the `@theme` block in spec 01 rather than patching each component individually.
- `cn()` from `lib/utils.ts` for any conditional className merging — never string-concatenate classes.

## Error Handling

- Mutations: on error, show a `sonner` toast with the backend's `message` field (already a clean string from `AppError`/`globalErrorHandler` — don't rewrap it). On success, toast + close the modal + let query invalidation refresh the list.
- 401s are handled globally by the axios interceptor (redirect to `/login`) — don't add per-component 401 handling.
- Form validation: rely on the backend's Zod errors surfaced via the toast for now — client-side validation is opportunistic (e.g. `isRequired` on obviously-required fields via the existing `Controlled*` components), not a full mirrored Zod schema per form. Faster to build; the backend is the source of truth for validity either way. **Exception: the login/register forms** use a real `zod` schema + `zodResolver` — auth is the one place worth the extra setup, since a bad login attempt is the first thing a user hits and immediate inline feedback matters more there than on, say, a fuel-log form.

## Linting

- `yarn lint` (ESLint, Next.js config) must be clean before considering a spec done. Fix, don't disable — but see `ai-workflow-rules.md` for the one exception class (inherited-file lint noise, same policy as the backend).

## Testing

- No automated test suite for this app, same as the backend (`bikelog_server`'s `yarn test` is also a stub). Manual verification: run `yarn dev`, exercise the flow on an actual phone-width browser viewport (DevTools device toolbar, ~390px), confirm against the Postman collection's dummy data (`bikelog_server/postman/`) for expected values.
