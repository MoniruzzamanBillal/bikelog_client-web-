# Architecture

## Stack

| Layer | Technology | Role |
|---|---|---|
| Framework | Next.js 16 (App Router), React 19 | Routing, rendering. All feature pages are client components (`"use client"`) — this is a data-heavy, auth-gated tool, not a marketing site; no meaningful SSR/SSG benefit here. |
| Styling | Tailwind v4 (`@theme` in `app/globals.css`) + shadcn/ui (`components/ui/*`, "new-york" style) | Utility classes only, no CSS modules/styled-components. |
| Server state | TanStack Query v5, via `hooks/useApi.ts` | All API data. No manual `useEffect` fetching. See "API Calling & Mutation Pattern" for the exact hook shapes. |
| Forms | react-hook-form + `FormProvider`, `components/shared/input/*` | See "Shared component contract" below. |
| Tables | TanStack Table v8, via `components/shared/table/GenericTableComponent` | See below. |
| HTTP client | axios, `utils/axiosInstance.ts` | Single instance, cookie-based auth, response envelope unwrapping. |
| Auth token storage | `cookies-next` + `lib/tokenManager.ts`, `jsonwebtoken` (client-side `jwt.decode`, no signature verification) | Not from the inherited scaffold — this project's own token-handling convention, built fresh in spec 01 (see "Auth & Access Model"). |
| Icons/toasts | lucide-react, sonner | Kept from the original scaffold, used as-is. |

## Kept vs. removed from the inherited scaffold

This app was bootstrapped from an unrelated shop/marketplace admin project (internally "the `table` scaffold") specifically to reuse its shared component library. Not everything in that scaffold is relevant, and its auth/token/API-calling layer specifically is rebuilt from scratch rather than kept — see "Auth & Access Model" and "API Calling & Mutation Pattern":

- **Kept and used:** everything under `components/shared/` (inputs, `Modal/`, `table/`), everything under `components/ui/` (shadcn primitives), `hooks/usePagination.tsx`, `hooks/useSearchDebounce.ts`, `utils/buildUrl.ts`, `lib/apiResponse.ts`, `lib/utils.ts`.
- **Deleted as dead weight:** `components/shared/input/ControlledTipTapTextEditor/*` (rich text editor, not needed anywhere in Bike Log's forms), all TipTap/`@tiptap/*` and `gsap`/`@gsap/react` dependencies, `hooks/useDebounce.tsx` (byte-identical duplicate of `useDebounce.ts`), the demo pages `app/table/`, `app/table2/`, `app/input/`, `app/multi-form/` and their backing components (`components/main/*`) and the demo `app/api/rooms/route.ts` — these exist only to showcase the inherited component library on the old project's dummy data, not part of Bike Log.
- **Replaced, not fixed:** `utils/axiosInstance.ts`'s auth logic (js-cookie + a broken hardcoded refresh-token call to an endpoint that doesn't exist), `utils/GetCookies.ts`, and `utils/constants/storageKey.ts` are all deleted wholesale rather than patched — auth token storage/attachment is rebuilt from scratch in spec 01 (see "Auth & Access Model"). The rebuilt `axiosInstance.ts` keeps its non-auth pieces (base URL, response envelope handling) from the `table` scaffold. **`hooks/useApi.ts` and `utils/api.ts` are likewise rewritten, not kept as-is** — see "API Calling & Mutation Pattern" for the new shape, which drops several hooks the `table` scaffold had (`useFetch_Legacy`, `useGet`, `useUpdateData`) that this app doesn't need.
- **Fixed, not removed:** `ControlledMultiSelectField`'s `onCreateOption` bug — irrelevant because Bike Log doesn't use creatable multi-select anywhere (see spec 07: `partsReplaced` uses a plain comma-separated text input instead, faster to build and the bug is moot). `PageHeader`'s breadcrumb link mismatch (`/dashboard` vs. `/overview`) — standardized on `/dashboard` everywhere, since that's this app's actual landing route.
- **Not touched, just be aware of:** `PrimaryButton`'s hardcoded red brand color — kept as-is (fine as a motorcycle-app accent color), not worth spending build time reskinning per the "minimal, build fast" priority.

## System Boundaries

- **`app/`** — routes only. Each `page.tsx` is a thin shell: fetch via a hook, render a feature component. Route structure mirrors the backend's nesting (`/bikes/[bikeId]/fuel-logs` etc.) — see `code-standards.md` for the full route table.
- **`app/(main)/`** — route group for the v1 (regular-`user`-role) app, sharing the `AppShell` layout, hard-gated behind a valid session (see "Auth & Access Model"). Everything in `project-overview.md`'s Core User Flows lives here.
- **`app/(admin)/`** — **reserved, not implemented in v1.** No files exist here yet; it's documented now so the eventual admin panel (backend already has a `userRole: "admin"` value, unused today) has an obvious place to go without restructuring `app/(main)/`. Don't create files under this path until an actual admin spec exists.
- **`app/login/`, `app/register/`** — outside both route groups, the only pages reachable without a session.
- **`components/feature/<domain>/`** — new folder, one per backend module (`bike`, `fuel-log`, `mileage`, `maintenance-type`, `engine-oil-type`, `maintenance-log`, `spending`). Each feature's list view, create/edit modal, and any bike-specific pieces live here. This is new — the inherited scaffold only had `components/main/` (shop-domain, deleted) and `components/shared/` (generic, kept).
- **`components/shared/`** — the reusable input/modal/table library described above. Feature code composes these, never duplicates them.
- **`components/layout/`** — new folder: the app shell (mobile bottom nav or top bar) and the session-gate logic. Doesn't exist in the inherited scaffold; built in spec 01.
- **`hooks/`**, **`utils/`**, **`lib/`** — cross-cutting, as inherited (minus the dead files noted above).

## Storage Model

- **Auth token**: a `cookies-next` cookie named `accessToken`, read/written/cleared exclusively through `lib/tokenManager.ts` — never call `cookies-next` directly from a component. Set client-side immediately after a successful `/auth/login` response — **not** an httpOnly cookie set by the server, since `bikelog_server` returns the JWT in the JSON body (`{ token: "..." }`), it never sets cookies itself. This is a deliberate, documented tradeoff for build speed (see `ai-workflow-rules.md`'s protected-files note on why this isn't "fixed" to httpOnly).
- **Server state**: TanStack Query cache only — no data is duplicated into component state beyond what a form needs mid-edit.
- **Client UI state**: local `useState`/`useSearchParams` only. No global client-state library (no Redux/Zustand) — matches the "React Query + axios only" convention the original product plan (`bike-log-plan.md` §7.3) already called for.
- **"Current bike" context**: not a global store — it's just the `:bikeId` URL segment. Every nested feature route reads `useParams().bikeId` directly. This is simpler and avoids a stale-selection bug class entirely.

## Auth & Access Model

`bikelog_server` issues a single long-lived JWT with **no refresh token and no refresh endpoint** (`/auth/register`, `/auth/login`, `/auth/me` only — see `bikelog_server/src/app/modules/user/user.route.ts`), so the client side never attempts a token refresh — expired means log in again.

- **`lib/tokenManager.ts`** (new): wraps `cookies-next`, exports:
  - `setToken(token)` / `getToken()` / `clearToken()` — the `accessToken` cookie.
  - `isTokenExpired(token)` — decodes via `jsonwebtoken`'s `jwt.decode` (no signature verification needed client-side, it's just reading the `exp` claim) with a 60s buffer.
  - `getDecodedToken<T>()` — decodes and returns the current token's payload (`{ userId, userEmail, userRole }`, matching the backend's `TJwtPayload`), or `null` if absent/undecodable. Not used by any v1 screen logic, but exposed now because the eventual `app/(admin)/` gate (v2) will need `userRole` from exactly this, and reading it from the already-present JWT avoids a `GET /auth/me` round-trip later too.
- `POST /auth/login` returns `{ token }` (not `{ data: { token } }` — see the backend's `sendResponse.ts`, this is genuinely a top-level field). The login form's mutation `onSuccess` calls `setToken(result.token)`, toasts success, then `redirect("/dashboard")` from `next/navigation` after a short `setTimeout`.
- **`utils/axiosInstance.ts`'s request interceptor** (rewritten, not from the `table` scaffold): checks `getToken()`; if present and not expired, attaches `Authorization: Bearer <token>`; if present but expired, calls `clearToken()` and hard-redirects to `/login` (`window.location.href`, no refresh attempt possible); if absent entirely, same redirect. `/auth/login` and `/auth/register` are excluded from this check (a public-URL allowlist).
- **Response interceptor**: on any `401`, `clearToken()` + redirect to `/login` — the reactive backup to the proactive expiry check above.
- **Hard navigation gate — `app/(main)/layout.tsx`.** Unlike a purely reactive "redirect once an API call 401s" approach, this app enforces the session check at the layout level itself: on mount, synchronously call `getToken()`; if missing, `router.replace("/login")` immediately, before rendering `children`/`AppShell` at all (render a blank/loading frame in the meantime, not the page). This is what makes "no route other than `/login`/`/register` is reachable without a session" actually true, not just eventually-true-after-a-failed-fetch. It's still cheap — one synchronous cookie read, no network round-trip, no `GET /auth/me` call — so it doesn't conflict with the "build fast" priority, it's just a few lines in one shared layout file rather than a full guard-component abstraction.
- **`app/page.tsx`** (the site root) unconditionally redirects to `/login` — it is not a bike list, marketing page, or anything else. The login page is genuinely the first thing anyone sees.
- **`/login`/`/register`**: the inverse check — a synchronous `useEffect(() => { if (getToken()) redirect("/dashboard"); }, [])` so an already-authenticated visitor doesn't see the login form again. A visible link on each page goes to the other (`/login` → "Don't have an account? Register", `/register` → "Already have an account? Log in").
- **Response envelope**: every backend response is `{ success, message, data, token? }` (`sendResponse.ts`). The `table` scaffold's inherited interceptor unwraps to `{data, meta}` — `meta` doesn't exist on `bikelog_server` responses (no pagination metadata beyond what `QueryBuilder.countTotal()` returns inline in `data.meta` for list endpoints — see `code-standards.md`), so callers read `data.meta` explicitly on list endpoints rather than relying on a top-level envelope meta.
- **`app/(admin)/` in v2**: will get its own layout doing the same `getToken()`-presence check *plus* `getDecodedToken()?.userRole === "admin"`, redirecting non-admins to `/dashboard`. Not built now — noted here only so the v1 gate's shape (layout-level, synchronous, no network call) is the deliberate pattern to repeat, not a one-off.

## API Calling & Mutation Pattern

`hooks/useApi.ts` and `utils/api.ts` are rewritten in spec 01, not kept from the `table` scaffold's version — the scaffold's versions carry extra hooks this app doesn't use and a shape that doesn't fit this app's call sites as cleanly.

- **`utils/api.ts`**: `apiGet(endpoint)`, `apiPost(endpoint, payload, config?)`, `apiPatch(endpoint, payload)`, `apiDelete(endpoint)` — thin wrappers around `axiosInstance`, each returning `response.data` directly. No `apiPut` (nothing in `bikelog_server` uses `PUT`) and no id-in-URL/FormData-aware variant — not needed.
- **`hooks/useApi.ts`**, four hooks:
  - `useFetchData<TData>(key: string[], endpoint: string, options?)` — `useQuery` wrapper.
  - `usePost(invalidateQueriesKeys?: Array<string[]>)` — `useMutation` whose `mutationFn` takes `{ url: string; payload: Record<string, unknown> | FormData; config?: AxiosRequestConfig }` **at the call site** — the URL is a call-site argument on `mutateAsync()`, not baked into the hook itself. This keeps one generic mutation hook usable for every endpoint instead of a hook-per-endpoint.
  - `usePatch(invalidateQueriesKeys?)` — identical shape to `usePost`.
  - `useDelete(invalidateQueriesKeys?)` — same, but `mutationFn` takes just `{ url: string }` (no payload).
- **Domain hook files remain the only call site for `useApi.ts`** (Invariant 1 below) — they wrap the generic `{url, payload}` shape into a fixed-endpoint convenience function, so every other spec's planned hook names (`useCreateBike()`, `useDeleteFuelLog()`, etc.) read like normal per-endpoint hooks even though `useApi.ts` itself is generic:
  ```ts
  // components/feature/bike/useBikes.ts
  export const useBikes = () => useFetchData<TBike[]>(["bikes"], "/bikes");

  export const useCreateBike = () => {
    const { mutateAsync, isPending } = usePost([["bikes"]]);
    return { createBike: (payload: TCreateBikePayload) => mutateAsync({ url: "/bikes", payload }), isPending };
  };
  ```

## Invariants

1. **Never call `axios`/`fetch` directly from a component or page.** Always go through `hooks/useApi.ts`'s `useFetchData`/`usePost`/`usePatch`/`useDelete`. This is what makes cache invalidation and the auth header attach consistently.
2. **Every list screen scoped to a bike takes `bikeId` from `useParams()`, never from component state.** Prevents a whole class of "stale bike" bugs for free.
3. **Never send server-derived fields in a mutation payload** — `totalCost` (fuel logs), `nextDueOdometer` (maintenance logs), `owner`/`currentOdometer` (bikes). These are stripped/recomputed server-side regardless, but sending them anyway is confusing and wastes a field in the form for nothing (see `bikelog_server/context/postman/dummy-data.md` for the authoritative list).
4. **Reuse `components/shared/*` before writing anything new.** If a screen needs an input/modal/table shape that doesn't fit the existing components, extend the shared component, don't fork a one-off local copy — see `code-standards.md`.
5. **Mobile viewport (~375–430px) is the design target, not a breakpoint to "also support."** Build the single-column mobile layout first; anything wider is `sm:`/`md:` progressive enhancement, not the base case.
6. **No new client-side global state library, no charting library, no animation library.** If a feature seems to need one, that's a signal to simplify the feature, not add a dependency — this app is intentionally small in scope.
7. **No route outside `/login`/`/register` renders without a valid session.** Enforced at `app/(main)/layout.tsx`, not left to an API call to eventually fail — see "Auth & Access Model".
8. **Nothing under `app/(admin)/` until an admin spec actually exists.** The route group is reserved, not started — don't scaffold speculative admin pages/components ahead of a real spec.
