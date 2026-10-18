# 32: Refresh-token auth — web half

Status: ✅ **Complete — implemented 2026-10-11.** Each section below is ticked. Verified in headless Chromium at 390px against a real `bikelog_server` on `http://localhost:5111` with `JWT_ACCESS_EXPIRES_IN=60s` — **34 checks, all passing** (23 for the matrix below, 3 for `32a`, 1 for explicit logout, 7 for login-response handling). One defect found while verifying is fixed in its own sub-spec, **`32a-network-failure-must-not-end-the-session.md`**: V15 as written here was unreachable, and behind it was a real bug — a dropped network between the `401` and the refresh call destroyed a valid 15-day credential. V15 is corrected below. **Not deployed**, and `bikelog_server` spec 51 is implemented but also not deployed yet.

**Depends on `bikelog_server` spec 51.** Read its §0 (hazards) and §A (wire contract) first; this spec does not restate the contract. Nothing here is verifiable against production until that server change is deployed — and per its §H the server deploys **last**, once both clients are ready, so the test plan below runs against a local server.

---

## Goal

Store both tokens in cookies, refresh the access token transparently when it expires, and only send the user to `/login` when the **refresh** token is rejected. Two user-visible wins fall out of it: a session survives closing the browser (both cookies are persistent for 15 days — §C), and an expired access token no longer bounces the user to the login screen mid-task.

The exact sequence is fixed by §B.0 — read it first; it is the developer's own statement of the flow and every later section is just an implementation of it.

The current implementation is the reverse of what's wanted and is the main thing this spec rewrites: `utils/axiosInstance.ts`'s **request** interceptor treats an expired-or-missing token as a logout — it clears the cookie, hard-navigates to `/login` and rejects the request before it is ever sent. With a 15-minute access token that would eject the user every 15 minutes. The `401` **response** branch does the same thing. Both have to become "refresh, then continue".

---

## A. What exists today

| File                                              | Role                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------- |
| `lib/tokenManager.ts`                             | `setToken`/`getToken`/`clearToken` on one `accessToken` cookie (`cookies-next`, `path: "/"`, **no `maxAge`** → session cookie, dies with the browser), `isTokenExpired` (60s buffer), `getDecodedToken`                                                  |
| `utils/axiosInstance.ts`                          | Request interceptor: content-type, public-route skip (`/auth/login`, `/auth/register`), and the pre-emptive logout described above. Response interceptor: `401` → `clearToken()` + `window.location.href = "/login"`, plus spec 30 §E's `statusCode` fix |
| `app/(main)/layout.tsx`, `app/(admin)/layout.tsx` | Mount-time gate: `!token                                                                                                                                                                                                                                 |     | isTokenExpired(token)`→`router.replace("/login")` |
| `app/login/page.tsx`, `app/register/page.tsx`     | Reverse gate: `getToken()` → bounce to `/dashboard`                                                                                                                                                                                                      |
| `components/feature/auth/LoginForm.tsx`           | `result.token` → `queryClient.clear()` then `setToken` (spec 30 §A ordering — keep it)                                                                                                                                                                   |
| `components/layout/AppShell.tsx`                  | `handleLogout`: `queryClient.clear()` + `clearToken()` + nav (spec 30 §A)                                                                                                                                                                                |
| `lib/userRole.ts`                                 | `isAdminUser()` / `getUserEmail()` by decoding the access-token cookie                                                                                                                                                                                   |

No `middleware.ts`, no SSR cookie reads — every auth read is client-side. That is what makes this change containable.

---

## B. The flow, and the hazards specific to the web client

### B.0 — The flow (normative, confirmed by the developer 2026-10-11)

This is the contract for the whole client half. Everything in §C–§F is an implementation of these four steps and nothing more; where an earlier draft of this spec acted ahead of the server, it has been changed to match this.

1. A request goes out with whatever access token is stored. **The client does not inspect `exp` to decide whether to send it.**
2. The access token is expired → **the server answers `401`.**
3. On that `401` the client calls `POST /api/auth/refresh-token` with the refresh token.
   - **Refresh token valid** → a new access token comes back, it is stored, the original request is retried, and the user carries on. They see nothing.
   - **Refresh token invalid or expired** → the server answers `401` to the refresh call itself → **the client logs the user out: both the access token and the refresh token are removed**, and the user lands on `/login`.
4. There is exactly one exception to "react, never predict", and it is not an expiry check: when there is **no** access token at all, there is nothing to put in the `Authorization` header and so no `401`-for-an-expired-token to react to — the server would answer "Authorization header missing or malformed" instead. In that one case the client refreshes first (§E). It can only arise if the access cookie is deleted by hand, now that §C keeps it for 15 days.

Why this matters more here than on the app: the _current_ web client does the opposite of step 1 — it reads `exp` in the request interceptor and logs the user out locally, before any request is sent. That is the code this spec deletes.

### B.1 — Hazards

**H-W1 — the `(admin)` gate decodes the access token for the role check. Closed by §C, but it is why the access cookie is persistent.** `app/(admin)/layout.tsx` runs `isAdminUser()`, which reads the `accessToken` cookie. The gate is a client-side claims read, so there is no request for the server to `401` and §B.0's reactive flow cannot help it: if that cookie is **absent**, `isAdminUser()` returns `false` and an admin returning after a week is bounced to `/dashboard` with a valid refresh token in hand. An earlier draft fixed this by awaiting a refresh inside the gate; §C fixes it for free instead, by giving the access cookie the same 15-day `maxAge` as the refresh cookie. An _expired_ token still decodes — `jwt.decode` ignores `exp` — so the claim is readable and the gate needs no network call. If the access cookie is ever made session-scoped again, this hazard comes straight back.

**H-W2 — the refresh call must not go through `axiosInstance`.** It would re-enter both interceptors; a `401` from the refresh endpoint itself would then recurse. Bare `axios` only.

**H-W3 — cookies are readable by JavaScript, by design.** `httpOnly` is not available here: the API is a different site from the web client, so a server-set auth cookie would be a third-party cookie (`SameSite=None; Secure`) that Safari already blocks. Server spec 51 §F records the trade-off. What this spec _can_ do is set `secure` and `sameSite: "lax"` on both cookies so they never travel over plain HTTP in production and are not sent on cross-site POSTs.

**H-W4 — a hard navigation is load-bearing today.** The `401` branch uses `window.location.href`, a full page load, which is also what throws away the in-memory react-query cache (the web `QueryClient` lives in `QueryProvider`'s `useState`, not in an importable singleton like the app's). If any of this is changed to `router.replace`, the cross-tenant cache clear that spec 30 §A fixed has to be handled explicitly instead. Simplest: keep the hard navigation on the terminal logout path.

**H-W5 — `(main)`/`(admin)` render `null` until `authorized`.** No longer a concern for this spec: under §F the gates stay synchronous presence checks, so the blank-screen window is exactly as long as it is today. Recorded because it is the reason §F must not grow an `await` — any future refresh-in-the-gate would be visible as a longer blank screen, and the loading UI would have to come with it.

---

## ✅ C. `lib/tokenManager.ts`

```ts
const ACCESS_TOKEN_KEY = "accessToken"; // unchanged — existing sessions keep working
const REFRESH_TOKEN_KEY = "refreshToken";
const MAX_AGE = 15 * 24 * 60 * 60; // seconds, matches the server's refresh lifetime
```

- `setTokens({ accessToken, refreshToken })` — **both** cookies get `maxAge: MAX_AGE`, `path: "/"`, `sameSite: "lax"` and `secure: window.location.protocol === "https:"` (hardcoding `secure: true` would break `http://localhost:3000`, which is how this client is developed and how the Docker compose service is reached).
- **Why the access cookie is now persistent rather than a session cookie** (it is a session cookie today, and an earlier draft of this spec kept it that way): under the reactive flow in §B.0 an _expired_ access token still has a job to do. It is the only thing the route gates and `lib/userRole.ts` can read claims from without a network call, and `jwt.decode` ignores `exp`, so a stale token is a perfectly good claims carrier. Dropping it on browser close would leave a refresh cookie with no readable claims beside it, which is precisely what H-W1 was about. An expired access token sitting in a cookie is worth nothing to anyone — the server rejects it on `exp` — so there is no cost to keeping it, and "remember me for 15 days" now comes from both cookies rather than from the refresh cookie alone.
- Keep `setToken` as a one-token wrapper if that keeps the diff small, but every new call site should use `setTokens`.
- `getRefreshToken()`, and `clearTokens()` deleting **both** (with the same `path: "/"` the setter used, or the delete silently misses).
- `isTokenExpired` stays exactly as it is, 60s buffer included — but note its only remaining caller is the refresh-token check below. Nothing decides whether to _send_ a request by looking at the access token's `exp` any more; that is the server's job (§B.0).
- New `hasUsableRefreshToken()` → refresh cookie present **and** not expired by its own `exp` claim. This is the refresh-vs-logout decision, and it saves one round trip that is certain to come back `401`.

## ✅ D. `lib/refreshClient.ts` (new)

Single-flight refresh plus the one terminal logout path. Module scope, no React:

```ts
let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight; // concurrent 401s share one call
  refreshInFlight = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;
      // ! bare axios — H-W2
      const res = await axios.post(`${getBaseUrl()}/auth/refresh-token`, {
        refreshToken,
      });
      const next = res?.data?.token;
      if (!next) return null;
      setTokens({ accessToken: next }); // refresh token unchanged (server §A)
      return next;
    } catch {
      return null;
    } finally {
      // includes the 401 that means "refresh token dead"
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export function hardLogout(): void {
  clearTokens(); // BOTH cookies — §B.0 step 4
  if (typeof window !== "undefined") window.location.href = "/login";
}
```

`finally` must clear the latch on success too, or only one refresh ever happens per page load. `refreshAccessToken()` returning `null` is the single signal for "the session is over" — every caller answers it with `hardLogout()` and nothing else.

Note there is **no** `ensureAccessToken()` helper. An earlier draft had one that checked `exp` locally and refreshed ahead of time; §B.0 replaced it — the server decides when a token is expired.

## ✅ E. `utils/axiosInstance.ts`

**Request interceptor** — delete the pre-emptive expiry check entirely and just send the token:

```ts
if (!isPublicAuthRoute(config?.url)) {
  let token = getToken();

  // ! The ONLY pre-emptive refresh in this client, and it is not an expiry check: with no
  // ! access token there is nothing to put in the header, so the server would answer
  // ! "Authorization header missing or malformed" — a different condition from an expired
  // ! token, and not the 401 the flow in §B.0 is built to react to. Refresh first instead.
  if (!token && hasUsableRefreshToken()) token = await refreshAccessToken();

  if (!token) {
    hardLogout();
    return Promise.reject(new Error("No valid session"));
  }
  config.headers.Authorization = `Bearer ${token}`;
}
```

An **expired** token is attached and sent exactly like a valid one. That is the point of §B.0: the server answers `401`, and the response interceptor below does the recovery. Nothing in this client second-guesses `exp` any more, so there is no clock-skew failure mode and no code path that logs a user out without the server having said so.

The interceptor becomes `async`; axios supports that. Add `/auth/refresh-token` to `isPublicAuthRoute` as a belt-and-braces guard even though §D never routes through this instance.

**Response interceptor** — this is where §B.0 lives:

- `401`, not an `/auth/*` URL, `config.__isRetry` not set, and `hasUsableRefreshToken()` → `await refreshAccessToken()`.
  - **Got a new token** → set `config.__isRetry = true` and re-issue via `axiosInstance.request(config)`, **returning that response**. The caller never sees the `401`; no toast, no redirect, no logout. The re-issue goes back through the request interceptor so it picks up the new cookie rather than a hand-patched header.
  - **Got `null`** (the refresh endpoint answered `401`, or the network failed) → `hardLogout()`: both cookies removed, hard navigation to `/login`.
- `401` with no usable refresh token, or on an already-retried request → `hardLogout()`. Same destination, one step shorter.
- `401` on `/auth/*` → untouched. A wrong password must keep surfacing inline in the login form, and the refresh endpoint's own `401` is already handled by the `catch` in §D.
- Everything else, including spec 30 §E's `statusCode: error?.response?.status ?? 500`, unchanged.

`__isRetry` is what stops a loop when the freshly-refreshed token is _also_ rejected (a bug, or a secret rotation mid-session): the retry's `401` falls into the second bullet and ends in a clean logout rather than a refresh storm. Keep the spec 30 §E comment block; it is still correct.

Unlike `bikelog_app` there is no "stale 401" rule to preserve here (web spec 30 never needed one — the hard navigation unmounts everything), so the web decision list is the shorter of the two.

## ✅ F. Route gates

All three gates become **presence checks with no network call**. Under §B.0 an expired access token is not a reason to redirect — the page should mount, let its queries fire, and let the interceptor recover. Redirecting on `exp` is the current behaviour and it is exactly what this spec is removing.

- **`app/(main)/layout.tsx`** — `if (!getToken() && !hasUsableRefreshToken()) { router.replace("/login"); return; }` then `setAuthorized(true)`. Keep the `set-state-in-effect` eslint-disable comment and its reasoning. No `await`, so the blank-screen window is unchanged (H-W5).
- **`app/(admin)/layout.tsx`** — the same presence check, then `isAdminUser()` as today. This now works without a refresh because the access cookie is persistent (§C) and `jwt.decode` ignores `exp`, so the `userRole` claim is readable even when the token is stale — see H-W1.
- **`app/login/page.tsx` / `app/register/page.tsx`** — the reverse gate currently fires on `getToken()` alone. Make it `getToken() || hasUsableRefreshToken()`, so someone returning after a week is sent to the dashboard rather than shown a login form their session doesn't need. Still no network call: these pages must not fire a request before the user has done anything.

## ✅ G. Login and logout

- **`LoginForm.tsx`** — `setTokens({ accessToken: result.token, refreshToken: result.refreshToken })`, keeping `queryClient.clear()` **before** it (spec 30 §A: clearing on login is the stronger invariant). A **missing** `refreshToken` must not block login — the server deploys after this client (server §H), so every login during development answers without one, and a session with no refresh token has to behave exactly as it does today.
- **`AppShell.tsx` `handleLogout`** — `clearTokens()` instead of `clearToken()`; the `queryClient.clear()` and the navigation stay exactly as spec 30 left them. No server call: there is no logout endpoint (server spec 51 §A).
- **`lib/userRole.ts`** — unchanged; it decodes whatever access token is current, and the claims are unchanged.

---

## Test plan

Local `yarn dev` against a local server with `JWT_ACCESS_EXPIRES_IN=60s` (set `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000` in `.env.local`; note `utils/config/envConfig.ts`'s own warning that `.env.local` wins). Two throwaway accounts, A with data and B empty. Phone-width viewport (390px) per the house convention, plus one desktop pass. Playwright has been used for this before.

| #   | Scenario                                                                                        | Expected                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Log in                                                                                          | both cookies set, **both** with a ~15d expiry in devtools (neither says "Session" — §C); `secure` unset on localhost                                                                                        |
| V2  | **The flow itself (§B.0), watched in the network tab:** sit on a fetching page across an expiry | the original request goes out and comes back `401`, _then_ one `POST /auth/refresh-token` → `200`, _then_ the same request again → `200`. In that order. No navigation, no toast, nothing visible in the UI |
| V3  | A page with 3+ concurrent queries loading across an expiry                                      | exactly **one** refresh call for the whole burst (the single-flight latch); every query succeeds after it                                                                                                   |
| V4  | Use the app across several pages for 3 minutes                                                  | never bounced to `/login`; one refresh per expiry window, not one per request                                                                                                                               |
| V5  | Wait past expiry, then reload                                                                   | dashboard renders — the gate lets the page mount on an expired token (§F) and recovery happens in the interceptor                                                                                           |
| V6  | Close the browser entirely, reopen, go to `/dashboard`                                          | logged in — persistent cookies plus one refresh                                                                                                                                                             |
| V7  | Corrupt the **refresh** cookie, let the access token expire                                     | request `401` → refresh `401` → logged out: `/login`, **both** cookies gone (§B.0 step 3b)                                                                                                                  |
| V8  | Delete the **access** cookie by hand, navigate                                                  | one refresh, page loads — §B.0 step 4, the single pre-emptive case. Today this bounces to `/login`                                                                                                          |
| V9  | Delete **both** cookies, navigate to `/dashboard`                                               | straight to `/login`, and **no** refresh attempt (`hasUsableRefreshToken()` short-circuit)                                                                                                                  |
| V10 | Point the client at a server whose `JWT_ACCESS_SECRET` was rotated mid-session                  | the refreshed token is also rejected → one retry, then logout. **No loop** — this is the `__isRetry` test                                                                                                   |
| V11 | Admin account: let the access token expire, then open `/admin`                                  | admin dashboard renders, **not** `/dashboard` — H-W1 (the gate reads the stale token's claim)                                                                                                               |
| V12 | Non-admin opens `/admin`                                                                        | still bounced to `/dashboard`                                                                                                                                                                               |
| V13 | A logs out → B logs in, same tab                                                                | no trace of A's data (spec 30 §A still holds)                                                                                                                                                               |
| V14 | Wrong password                                                                                  | inline error banner, no logout, no refresh attempt (`/auth/*` exclusion)                                                                                                                                    |
| V15 | ~~Stop the API mid-session, then let the access token expire~~ | **Wrong as written — replaced by `32a` §4.** With the API stopped there is no `401`, so the flow is never triggered and nothing can log the user out; the observed (and correct) behaviour is that the session is kept and the screen shows its own error state. Chasing this found a real defect: a refresh call that fails *on the network* after a genuine `401` used to log the user out and delete a valid 15-day credential. `32a` §4 has the three rows that replace this one, all verified. |
| V16 | `yarn build` + `yarn lint`                                                                      | clean                                                                                                                                                                                                       |

V2 is the spec's acceptance test — it is §B.0 read off the network tab. V3 and V10 are the ones that catch a mis-wired single-flight latch or a missing `__isRetry` guard.

## Out of scope

- `middleware.ts` / SSR session checks — this client has none and this spec does not add one.
- Any change to the react-query cache-isolation work from spec 30 beyond swapping `clearToken` for `clearTokens`.
- `httpOnly` cookies (H-W3), token rotation, a logout endpoint — all server spec 51 §F.
- The Docker image: `NEXT_PUBLIC_API_BASE_URL` is unchanged, so no rebuild semantics change (spec 31).

## Decisions

1. **The flow is §B.0**, as stated by the developer on 2026-10-11: send the token, let the server `401`, refresh, retry; on a refresh `401` log out and remove both tokens. The earlier draft's pre-emptive expiry check in the request interceptor is **deleted**, not kept as an optimisation — §E.
2. **Both cookies are persistent (15 days)**, which an earlier draft had as an open question between a session cookie and `maxAge: 15m`. §B.0 settles it: the gates and the admin role check read claims off the access token locally, so it has to still be _there_ after a browser restart even once it is useless for authenticating. §C has the reasoning, H-W1 has the consequence.
3. **No `await` in the route gates**, so H-W5 is moot and the blank-screen window is unchanged.

Nothing is open on the web side, and nothing is open on the server side either as of 2026-10-11 — server spec 51's §E was settled the same day (a refused refresh is never logged; access-token `401`s are, without token material). The only knock-on that could ever reach this client is a possible status filter on the admin error-log list once a day of real `401` volume has been seen; that would be its own small spec, not part of this one.
