# 01: Project Setup

Status: ✅ Complete

## Goal

Turn the inherited shop-admin scaffold into a clean Bike Log base: dead code removed, auth wired to the real backend with a hard session gate, a minimal mobile-first app shell in place. Every other spec depends on this one.

## Context

The Next.js app at `bikelog_client(web)/` was bootstrapped by copying an unrelated project's scaffold (internally "the `table` scaffold"), specifically to reuse its `components/shared/*` library (inputs, modal, table). That scaffold also carries a lot that Bike Log doesn't need (TipTap rich text, GSAP, shop-domain demo pages) and its own broken auth piece (an axios refresh-token flow pointing at a backend endpoint that doesn't exist). See `../architecture.md`'s "Kept vs. removed" section and `../progress-tracker.md`'s "Known Gaps" for the full list this spec resolves.

The auth/token piece and the API-calling/mutation layer (`lib/tokenManager.ts`, the axios interceptors, `hooks/useApi.ts`, `utils/api.ts`) are **not** patched from the `table` scaffold at all — they're rebuilt to the shapes in `../architecture.md`'s "Auth & Access Model" and "API Calling & Mutation Pattern" sections.

This spec also establishes the **hard session gate**: v1 has exactly two publicly-reachable pages (`/login`, `/register`); everything else redirects to `/login` if there's no valid session, checked synchronously at the layout level, not left to an API call to eventually fail. And it sets up the `app/(main)/` vs. `app/(admin)/` route-group split — v1 only builds `(main)`; `(admin)` stays empty, reserved for a later admin panel (`bikelog_server`'s `userRole` field already distinguishes `user`/`admin`, but nothing enforces it yet).

## Design

- **Env config**: `.env.local` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api` (matches `bikelog_server`'s default port, confirmed in `bikelog_server/postman/dummy-data.md`). `utils/config/envConfig.ts` already reads this — no change needed there, just add the file (gitignored).
- **New dependencies**: `cookies-next`, `jsonwebtoken` (+ `@types/jsonwebtoken` dev dep).
- **`lib/tokenManager.ts`** (new), trimmed to a single token (no refresh token — `bikelog_server` doesn't issue one), plus a decode helper for future role-based gating:

  ```ts
  import { deleteCookie, getCookie, setCookie } from "cookies-next";
  import jwt, { JwtPayload } from "jsonwebtoken";

  const ACCESS_TOKEN_KEY = "accessToken";

  export const setToken = (token: string) =>
    setCookie(ACCESS_TOKEN_KEY, token, { path: "/" });
  export const getToken = (): string | undefined =>
    getCookie(ACCESS_TOKEN_KEY) as string | undefined;
  export const clearToken = () => deleteCookie(ACCESS_TOKEN_KEY, { path: "/" });
  export const isTokenExpired = (token: string): boolean => {
    const decoded = jwt.decode(token) as JwtPayload;
    if (!decoded?.exp) return true;
    return decoded.exp < Math.floor(Date.now() / 1000) + 60; // 60s buffer
  };
  export const getDecodedToken = <
    T extends JwtPayload = JwtPayload,
  >(): T | null => {
    const token = getToken();
    if (!token) return null;
    try {
      const decoded = jwt.decode(token);
      return decoded && typeof decoded !== "string" ? (decoded as T) : null;
    } catch {
      return null;
    }
  };
  ```

- **Auth interceptors**: rewrite `utils/axiosInstance.ts` from scratch (don't patch the `table` scaffold's version — delete its cookie/refresh logic entirely). Request interceptor: skip `/auth/login`/`/auth/register`; otherwise call `getToken()` — if missing or `isTokenExpired(token)`, `clearToken()` + `window.location.href = "/login"` (no refresh attempt, there's nothing to refresh); else attach `Authorization: Bearer <token>`. Response interceptor: on `401`, `clearToken()` + redirect to `/login`.
- **Delete, don't keep**: `utils/GetCookies.ts`, `utils/constants/storageKey.ts` — superseded by `lib/tokenManager.ts`.
- **API calling layer**: rewrite `utils/api.ts` and `hooks/useApi.ts` to the signatures below, replacing the `table` scaffold's versions rather than patching them:

  ```ts
  // utils/api.ts
  export const apiGet = async (endpoint: string) =>
    (await axiosInstance.get(endpoint)).data;
  export const apiPost = async (
    endpoint: string,
    payload: object,
    config?: AxiosRequestConfig,
  ) => (await axiosInstance.post(endpoint, payload, config)).data;
  export const apiPatch = async (endpoint: string, payload: object) =>
    (await axiosInstance.patch(endpoint, payload)).data;
  export const apiDelete = async (endpoint: string) =>
    (await axiosInstance.delete(endpoint)).data;
  ```

  ```ts
  // hooks/useApi.ts
  export const useFetchData = <TData>(
    key: string[],
    endpoint: string,
    options?: TFetchOptions<TData>,
  ) => useQuery({ queryKey: key, queryFn: () => apiGet(endpoint), ...options });

  export const usePost = (invalidateQueriesKeys?: Array<string[]>) => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (params: {
        url: string;
        payload: Record<string, unknown> | FormData;
        config?: AxiosRequestConfig;
      }) => apiPost(params.url, params.payload, params.config),
      onSuccess: () =>
        invalidateQueriesKeys?.forEach((key) =>
          queryClient.invalidateQueries({ queryKey: key }),
        ),
    });
  };
  // usePatch: identical to usePost, calls apiPatch.
  // useDelete: same shape, mutationFn takes only { url: string }, calls apiDelete.
  ```

  Drop `useFetch_Legacy`, `useGet`, `useUpdateData` — `table`-scaffold-only, unneeded here.

- **App shell**: `components/layout/AppShell.tsx` — a simple wrapper: top bar (bike name / back button, minimal) + bottom tab bar for primary nav (Dashboard, current bike's Fuel/Mileage/Maintenance/Spending once inside a bike context). Keep it to plain flex/grid Tailwind, no animation.
- **Hard session gate — `app/(main)/layout.tsx`**: a client component. On mount, synchronously check `getToken()`. If absent, `router.replace("/login")` and render nothing (or a blank frame) instead of `children`/`AppShell` — don't render the page's content even briefly. If present, render `AppShell` wrapping `children` normally. This is a plain cookie-presence check, not a `GET /auth/me` call — no network round-trip, so it doesn't slow anything down.
- **Root redirect — `app/page.tsx`**: unconditionally redirects to `/login`. It is never a bike list or landing page.
- **`(admin)` route group**: do **not** create `app/(admin)/` or any files under it in this spec — it's reserved for a later admin-panel spec that doesn't exist yet. Nothing to build here now; this note exists so it isn't accidentally scaffolded speculatively.
- **CSS tokens**: add to `app/globals.css`'s `@theme inline` block: `--color-table-border: var(--table-border)` mapped to `--table-border: var(--surface-border)` in `:root`/`.dark`; `--color-primary-500`/`--color-primary-600` mapped to `var(--primary)` and a slightly darker computed shade respectively (simplest: reuse `--primary`/`--foreground` rather than inventing a new hue, per `../ui-context.md`'s "no custom brand palette" stance).

## Implementation

1. Delete: `components/shared/input/ControlledTipTapTextEditor/`, `components/main/` (all of it — `ControlledInputImplement`, `HomePage`, `MultiForm`, `tablePage`, `tableSelect`), `app/table/`, `app/table2/`, `app/input/`, `app/multi-form/`, `app/api/rooms/`, `hooks/useDebounce.tsx` (keep `.ts`), `utils/GetCookies.ts`, `utils/constants/storageKey.ts`.
2. Remove now-unused dependencies from `package.json`: `@tiptap/*`, `gsap`, `@gsap/react`, `js-cookie`, `@types/js-cookie`. Add `cookies-next`, `jsonwebtoken`, `@types/jsonwebtoken`. Run `yarn install` after.
3. Remove the three debug CSS classes (`.bgr`, `.bge`, `.bgo`) from `globals.css`; add the two missing token mappings above.
4. Create `lib/tokenManager.ts` per the Design section.
5. Rewrite `utils/axiosInstance.ts`'s auth handling per the Design section (keep whatever non-auth pieces — base URL, response envelope — are still correct from the `table` scaffold's version).
6. Rewrite `utils/api.ts` and `hooks/useApi.ts` per the "API calling layer" Design section above.
7. Build `components/layout/AppShell.tsx` and `app/(main)/layout.tsx` with the hard session-gate logic described above.
8. Create `app/page.tsx` that unconditionally redirects to `/login`.
9. Update `app/layout.tsx`: keep `QueryProvider`/`ThemeProvider`/`Toaster` as-is, just confirm they still wrap everything correctly after the route-group change.

## Dependencies

None — this is the first spec.

## Verify

- [x] `yarn dev` runs with no console errors on a fresh load.
- [x] Visiting `/` with no session redirects straight to `/login` — no flash of any other content. (Verified via `curl`: `GET /` → `307` to `/login`.)
- [ ] Directly navigating to any `app/(main)/...` URL with no session (cookie cleared) redirects to `/login` immediately, before that page's own content or any of its API calls fire. **Not testable yet** — `app/(main)/` has only `layout.tsx` in this spec, no `page.tsx` exists under it until spec 03, so there's no real route to navigate to. The gate logic itself (`getToken()`/`isTokenExpired()` check + `router.replace`) is in place and code-reviewed; re-verify live once spec 03 adds the first protected page.
- [ ] A manually-set expired/garbage JWT in the `accessToken` cookie also redirects to `/login` (proactive expiry check working, not just the reactive 401 path). Same blocker as above — no protected page to navigate to yet; the `isTokenExpired` check is wired into the gate and will be exercised live starting with spec 03.
- [x] `yarn lint` clean. (Exit code 0; 3 pre-existing warnings remain in untouched `components/common/GenericTable.tsx` / `components/shared/table/GenericTableComponent.tsx` / `TableToolbar.tsx` — TanStack Table memoization notices + one unused `activeTab` var, none in files this spec touched. Not in the original Known Gaps list; noted in `progress-tracker.md` for whichever future spec first touches those files.)
- [x] `yarn build` succeeds (catches the dependency removals not breaking anything).
- [x] No references to deleted files/components remain (`grep -r` for `ControlledTipTapTextEditor`, `gsap`, `MultiForm`, `TablePage`, `js-cookie`, `GetCookies`, `storageKey`, `useFetch_Legacy`, `useGet`, `useUpdateData`, `useDeleteData` under `app/`/`components/`/`utils/`/`hooks/` returns nothing outside intentionally-kept shared code).
- [x] `hooks/useApi.ts` exports exactly `useFetchData`/`usePost`/`usePatch`/`useDelete`, matching the call signatures in the Design section (`{url, payload, config?}` for post/patch, `{url}` for delete).
- [x] No files exist under `app/(admin)/`.
