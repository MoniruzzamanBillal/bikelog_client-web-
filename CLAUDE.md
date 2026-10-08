# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The frontend for "Bike Log" — a Next.js 16 (App Router) + React 19 web app, client for the separately-tracked `bikelog_server` REST API (Express + Prisma 7 + PostgreSQL/Neon, a sibling directory — not one level up). It lets a rider log fuel fill-ups and maintenance events per motorcycle and view derived mileage, maintenance reminders, and spending. Built mobile-first (~375–430px is the actual design target, not a breakpoint to "also support").

This web app is a deliberate first prototype, not the end goal — the developer's real target is a React Native app later. Keep screens and folder structure simple enough that lessons (not necessarily code) carry over, per `context/project-overview.md`.

`context/` has more detail (goals, user flows, per-spec history) — `context/progress-tracker.md` is the most useful one to skim for *why* something is built the way it is. **Treat `context/architecture.md` and `context/code-standards.md` with caution**: they describe a `components/feature/<domain>/` + `use<Domain>.ts` hook-wrapper pattern that was the intended design during specs 03–08, but the code was since restructured to `components/(main)/<Domain>/` with no domain-hook layer (see "Architecture at a glance" below for what's actually there) and those two docs were never updated to match. Trust the code and this file over those two on anything to do with folder layout or the API-calling pattern; the rest of `context/` (auth model, response envelope, styling rules, route table) still checks out against the real code.

**Spec 30 (per-user catalogs) is implemented but NOT yet deployable** — `context/specs/30-per-user-catalogs.md`, plus `30a` for two wrong assumptions in its own §B/§D. It closed a cross-tenant react-query cache leak (logout cleared the cookie but not the cache, and it is a *soft* nav, so the tree and cache survived — now `queryClient.clear()` on both logout and login, plus a hard nav matching the 401 path), swapped the `name === "Engine Oil"` dropdown gate for the backend's `requiresOilType` flag, added empty states for a genuinely empty catalog, and fixed `utils/axiosInstance.ts`'s `statusCode`, which had always been 500 because the server never sends `data.statusCode`.

**Do not deploy it before `bikelog_server` spec 46's database rollout.** That spec's code is merged but its migrations and backfill were never applied. `requiresOilType` is `@default(false)` server-side and only becomes `true` on existing rows when the backfill runs — so shipping this client first makes the engine-oil dropdown unreachable for everyone, including users who have it today via the old name match. The wire change really is additive, as spec 30 says; the *behaviour* is not order-independent. The cache-isolation half is, and is correct to ship whenever.

Two things worth carrying forward from implementing it: `ControlledCheckbox` and `ControlledSelectField` both call `useFormContext()`, so **neither works in the `SettingsCatalog` sections**, which are plain `useState` with no react-hook-form — reach for the `components/ui/*` primitive they wrap instead (spec 29 hit the same wall with the select). And a fifth column in the catalog tables' inline-edit `<tr>` squeezes the name input past usability at 375px; stack under the Name cell instead.

## Commands

```bash
yarn dev      # next dev — starts on :3000
yarn build    # next build
yarn start    # next start (after build)
yarn lint     # eslint (Next.js core-web-vitals + typescript config)
```

No automated test suite (`yarn test` doesn't exist here, matching the backend's stub). Manual verification is the norm: run `yarn dev`, exercise the flow at a phone-width viewport, cross-check payloads against `bikelog_server/postman/dummy-data.md`.

Requires `.env`/`.env.local` with `NEXT_PUBLIC_API_BASE_URL` — a **bare origin with no `/api` suffix** (e.g. `http://localhost:5000`); `utils/config/envConfig.ts` appends `/api` and falls back to `https://bikelog-server.vercel.app` if unset. The backend must be running separately (`bikelog_server`, default port 5000) for any real data flow to work. Note `.env.local` takes precedence over `.env` in Next, and the one on disk points at the deployed backend — set it to `http://localhost:5000` when working against a local server.

### Docker (spec 31)

```bash
docker compose up local -d --build    # builds and serves on :3000
```

Three things to know:

- **`NEXT_PUBLIC_API_BASE_URL` is baked in at BUILD time.** Next inlines every `NEXT_PUBLIC_*` read into the client bundle, so compose passes it via `build.args`, not `environment`. **Changing the backend URL means rebuilding the image, not restarting the container.**
- **The URL must be reachable from the end user's browser**, not from inside the Docker network — every API call originates in `"use client"` code, so a compose service name would not resolve. That is also why there is no shared network with `bikelog_server`: the server is reached over the host's published port.
- **`ENV HOSTNAME=0.0.0.0` in the Dockerfile is load-bearing**, not boilerplate. Next's standalone server does `process.env.HOSTNAME || '0.0.0.0'` and Docker injects the container ID into `HOSTNAME`, so without the override Next binds only the container's bridge IP. The published port still works via docker-proxy, so the app looks fine while every in-container healthcheck is refused.

The image is a 3-stage `node:22-alpine` standalone build. Every `.env*` is dockerignored (`.env.local` holds a live `VERCEL_OIDC_TOKEN`), which means the build arg is the *only* source of the URL — so forgetting it silently bakes in the Vercel fallback instead of failing. To check which URL actually shipped:

```bash
docker run --rm --entrypoint sh bikelog-web-local:latest \
  -c 'grep -rho "http://localhost:5000" .next/static | head -1'
```

## Architecture at a glance

- **Everything is a client component.** Every feature `page.tsx` starts `"use client"` — this is a data-heavy, auth-gated tool with no SSR/SSG benefit, not a marketing site. All server state goes through TanStack Query; never call `axios`/`fetch` directly from a component.
- **`app/(main)/`** is a route group sharing the `AppShell` layout, hard-gated behind a session check in `app/(main)/layout.tsx` (synchronous `getToken()` + `isTokenExpired()` read inside a mount-only `useEffect`, `router.replace("/login")` if invalid, renders `null` until authorized — no `GET /auth/me` round-trip). This is intentionally minimal; don't "upgrade" it to a heavier guard.
- **`app/login/`, `app/register/`** sit outside `(main)`, the only routes reachable without a session. `app/page.tsx` unconditionally redirects to `/login`.
- **`app/(admin)/`** holds admin-only routes (spec 26). Its `layout.tsx` repeats the `(main)` session check plus `isAdminUser()` from `lib/userRole.ts` (the JWT's `userRole`), sends non-admins to `/dashboard`, and renders the same `AppShell`. Right now it only has `/admin` (the error log dashboard → `components/(admin)/`). `AppShell` shows an Admin bottom-nav tab to admins only. Admins are regular riders too, so all `(main)` routes work for them. The backend's `adminCheck` is the real authorization.
- **Route → component mapping**: every `page.tsx` under `app/(main)/` is a thin wrapper rendering exactly one top-level component from `components/(main)/`, e.g. `app/(main)/dashboard/page.tsx` renders `<Dashboard />` from `components/(main)/Dashboard/Dashboard.tsx`; `app/(main)/bikes/[bikeId]/page.tsx` renders `<BikeDetailPage />` from `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx`. All data fetching, mutations, and layout for a route live in that one component (plus whatever it imports from its own domain folder), not in `page.tsx`.
- **`components/(main)/<Domain>/`** — one PascalCase folder per backend module: `Bike/`, `fuelLog/`, `Mileage/`, `MaintenanceLog/`, `Spending/`, `SettingsCatalog/`, `Dashboard/` (casing is inconsistent across folders — match whatever the existing domain folder already uses, don't "fix" it while doing unrelated work). Each domain folder has a `type/<domain>.types.ts` for its API payload/response types, plus its list/tab/form components. **There is no domain-hook layer** — components call `useFetchData`/`usePost`/`usePatch`/`useDelete` from `hooks/useApi.ts` directly (e.g. `BikeFormModal.tsx` calls `usePost([["bikes"]])` inline). `components/feature/auth/` is the one folder that still uses the older `components/feature/<domain>/` naming, and is also the one domain with no CRUD hooks at all (auth mutations are one-off `usePost` calls in `LoginForm.tsx`/`RegisterForm.tsx`).
- **`components/shared/*`** — the reusable input/modal/table library (inherited from an unrelated scaffold, kept because it's usable as-is). Extend in place; never fork a one-off local copy. `components/ui/*` are shadcn primitives (`"new-york"` style, see `components.json`) — feature code composes them via `components/shared/*`, doesn't import `components/ui/*` directly except from inside a shared component.
- **`components/layout/AppShell.tsx`** is the responsive shell (Nocturne redesign, spec 27). The session-gate logic itself lives in `app/(main)/layout.tsx`, not here.
  - Desktop (`lg+`): a 232px sidebar with a bike sub-nav whenever the route is under `/bikes/[bikeId]`, catalog/admin links, and a theme toggle + logout.
  - Mobile: a sticky header (route-derived title, subtitle and back link, theme toggle, account menu) and a fixed bottom tab bar (Bikes/Catalog/Admin, or Overview/Fuel/Service/Spend/More inside a bike).
  - The shell owns the page padding, so feature roots don't add `p-4`. The design tokens and shared UI pieces are documented in `context/ui-context.md`.
- **API calling pattern** (`hooks/useApi.ts` + `utils/api.ts`): `useFetchData<T>(key: string[], endpoint)`, and `usePost`/`usePatch`/`useDelete(invalidateQueriesKeys?: string[][])` where the mutation's `{ url, payload }` (or just `{ url }` for delete) is supplied at the `mutateAsync()` call site, not baked into the hook — one generic mutation hook per HTTP verb, called directly from whichever component needs it:
  ```ts
  // components/(main)/Bike/BikeFormModal.tsx
  const { mutateAsync, isPending } = usePost([["bikes"]]);
  await mutateAsync({ url: "/bikes", payload });
  ```
  Query params (pagination, `targetMonth`/`targetYear`, `period`) are assembled into the endpoint string via `utils/buildUrl.ts` before being passed in — `useApi.ts` takes no separate params object.
- **Auth**: `lib/tokenManager.ts` is the only place that touches the `accessToken` cookie (via `cookies-next`) — `setToken`/`getToken`/`clearToken`/`isTokenExpired`/`getDecodedToken`. The backend returns `{ token }` as a top-level field on login (not nested under `data`), issues one long-lived JWT with no refresh endpoint — expired means log in again, there's no refresh flow to build. `utils/axiosInstance.ts`'s interceptors attach the bearer token, proactively redirect to `/login` on missing/expired token (clearing the cookie first), and reactively redirect on any `401`; every rejected error is normalized to a flat `{ statusCode, message, errors }` object before it reaches a mutation's `catch` — read `error.message`, never `error.response.data.message`.
- **Response envelope**: backend responses are `{ success, message, data, statusCode }` (`+ token` on login). `lib/apiResponse.ts`'s `TgenericResponse<TData>` declares a top-level `meta: TmetaResponse` object, but that doesn't match what list endpoints actually return — in practice paginated endpoints (fuel logs, maintenance logs) return `data: { result, meta }` where `meta` is a **raw document count** (a `number`, not an object), and callers compute `totalPages = Math.ceil(meta / limit)` client-side. Domain `.types.ts` files declare their own local response shape for this rather than relying on `TgenericResponse`'s `meta` field — follow that pattern for any new paginated list rather than trusting `lib/apiResponse.ts`'s declared shape.
- **"Current bike" is just `useParams<{ bikeId: string }>().bikeId`** — no global bike-selection store. Every bike-scoped screen reads it directly from the URL, never from component state.
- **No global client state library, charting library, or animation library** — if a feature seems to need one, simplify the feature instead.

## Conventions worth knowing before editing

- Mirror backend field names/casing exactly in `type/<domain>.types.ts` — don't invent client-side names.
- Never send server-derived fields in a mutation payload: `totalCost` (fuel logs), `nextDueOdometer` (maintenance logs), `owner`/`currentOdometer` on edit (bikes). The backend strips/recomputes these anyway, but sending them is confusing. `BikeFormModal.tsx` is the reference for this — `currentOdometer` is only rendered in create mode and typed out of the update payload entirely. The one way to change a bike's odometer after creation is the Settings page's `OdometerSection` (spec 29) → `PATCH /bikes/:id/odometer`, never the generic bike edit.
- Form validation is opportunistic (`isRequired` via `Controlled*` components from `components/shared/input/`) everywhere except **login/register**, which use real `zod` + `zodResolver` — that's a deliberate exception, not the pattern to copy elsewhere.
- Creation is always a modal on the relevant list page (`BaseModal` + `FormActionButtons` from `components/shared/Modal/`) — there are no `/x/new` routes. Create and edit share one `<Domain>FormModal.tsx`, keyed by whether an entity prop is passed in. Use RHF's `defaultValues` (not `values`) for these — Radix `Dialog.Content` unmounts on close (no `forceMount`), so the form remounts fresh each time the modal opens, which is exactly when `defaultValues` is meant to be read; `values` would instead reset the form on every keystroke since a fresh object literal is passed each render.
- Mobile-first Tailwind: write unprefixed classes for ~375–430px, add `sm:`/`md:` only where desktop should differ, never the reverse. Use `cn()` from `lib/utils.ts` for conditional classes, never string concatenation.
- `yarn lint` must be clean before committing — fix, don't disable. A handful of pre-existing warnings (React Compiler "incompatible library" memoization warnings on `useReactTable()`/RHF's `watch()` call sites, one unused `activeTab` prop in `TableToolbar.tsx`) are known and don't need fixing incidentally.

## Relationship to `bikelog_server`

Read-only from this app's perspective — don't edit `bikelog_server/` while working here. The backend's own `CLAUDE.md`/`AGENTS.md`/`context/*.md` are the source of truth for its own conventions if you need to cross-reference the API contract; `bikelog_server/postman/` has a verified route/schema reference.
