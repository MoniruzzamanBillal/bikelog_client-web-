# 32a: V15 is unreachable as written, and the real bug behind it — a dropped network must not log the user out

Status: ✅ Complete — found and fixed 2026-10-11 while implementing spec 32, by running its own V15.

Sub-spec of `32-refresh-token-auth.md`. Two findings: one wrong expectation in that spec's test plan, and one genuine defect in its §D/§E that the wrong expectation was hiding.

---

## 1. The test-plan error

Spec 32 §Test plan, V15:

> | V15 | Stop the API mid-session, then let the access token expire | refresh fails → `/login`; no infinite loop, no console error storm |

Run against the implementation, the observed result was: **stays on `/dashboard`, cookies intact, zero refresh attempts.** The dashboard shows its own "Couldn't load your bikes / Try again" error state.

That is not a failure of the code. The expectation is **internally inconsistent with §B.0**: with the API stopped, the original request fails at the network level, so `error.response` is `undefined` and the status is not `401`. §B.0's flow is triggered *by a 401*. No server → no 401 → no refresh → no logout. The scenario as described cannot reach the refresh at all.

And the behaviour it actually produces is the one we want. **Logging a user out because their wifi dropped would be a bug**, not a feature: nothing about a network failure says the session is invalid, and the 15-day refresh token in their cookie jar is still perfectly good.

So V15 is replaced (§4 below) rather than "fixed" in the code.

## 2. The real defect it was hiding

Chasing the above exposed a path where the code *does* log the user out on a network failure. Spec 32 §D specified it explicitly, so this is a spec decision being reversed, not an implementation slip:

> `catch { return null; }` — includes the 401 that means "refresh token dead" … A network failure lands here too and is treated the same way

and §E answers `null` with `hardLogout()`. Together:

1. The access token expires. A request goes out and the server answers `401`. (The server is up.)
2. The client calls `POST /auth/refresh-token` — and *that* request fails on the network: the connection drops in that instant, a captive portal intercepts it, the API restarts between the two calls, a proxy times out.
3. `refreshAccessToken()` returns `null`, indistinguishably from a refused refresh, so `hardLogout()` fires: **both cookies are deleted** and the user is dumped on `/login`.

A valid 15-day credential is destroyed by a transient blip, and because `hardLogout()` clears the cookies there is no recovering it — the user must type their password again. This is a narrow window, but it is the single most likely moment for it to happen: an expiry burst fires several requests at once on a connection that is already flaky.

**§B.0 step 3 is the authority here, and it is narrower than §D's prose:** "Refresh token invalid or expired → **the server answers `401`** to the refresh call itself → the client logs the user out." Logging out is what we do when the server *refuses*, not when we fail to ask. §D's "treated the same way" was the drafting error.

## 3. Design

`refreshAccessToken()` stops returning `string | null` and returns a discriminated outcome:

```ts
export type TRefreshOutcome =
  | { status: "refreshed"; accessToken: string }
  | { status: "refused" }       // the server answered — the session really is over
  | { status: "unreachable" };  // no answer at all — says nothing about the session
```

- **`refused`** — any HTTP response from the refresh endpoint that doesn't yield a token (`401`, any other 4xx/5xx, or a `200` whose body has no `token`, which means the contract is broken and we cannot proceed anyway). The server has spoken: `hardLogout()`.
- **`unreachable`** — the request produced no response at all (`error.response` is `undefined`: DNS, connection refused, timeout, CORS, offline). **Do not touch the cookies, do not navigate.** Reject the original request so the caller's normal error handling runs and the screen shows its own retry affordance. The next attempt, once the network is back, refreshes and succeeds.

The distinction is exactly `error.response` being present, which is also how `utils/axiosInstance.ts` already distinguishes a server answer from a transport failure for its `statusCode` fallback (spec 30 §E).

Both call sites in `utils/axiosInstance.ts` switch on the outcome. The single-flight latch now caches the outcome object rather than a token, so a burst still shares one call and every member of the burst learns the same thing.

**What does not change:** a refresh the server *refuses* still logs the user out and clears both cookies (spec 32 V7 is the regression test for that, and it still passes). `__isRetry` still bounds the retry at one. The latch still clears in `finally`.

## 4. V15 replaced

| #    | Scenario                                                                                     | Expected                                                                              |
| ---- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| V15a | API unreachable while the access token is still **valid**                                    | stays logged in, both cookies intact, the screen shows its own error state. No refresh attempt, no navigation |
| V15b | API answers `401`, then the **refresh call** is unreachable (the dropped-network window, §2)  | **stays logged in, both cookies intact** — this is the regression test for this spec   |
| V15c | API answers `401`, and the refresh call is **refused** with a `401`                          | logged out, both cookies cleared, `/login` — unchanged from spec 32 V7                |

## Out of scope

- No retry/backoff on an unreachable refresh. The next request the user triggers will try again; a background retry loop is a bigger change and this app has no offline story to hang it on.
- No offline banner or network-status UI. Each screen already has its own error state.
- No change to `hardLogout()` itself, or to the hard-navigation decision behind it (spec 32 H-W4).

## Implementation

- [x] 1. `lib/refreshClient.ts` — `TRefreshOutcome`, and classify by whether `error.response` exists.
- [x] 2. `utils/axiosInstance.ts` — both call sites switch on the outcome; only `refused` logs out.
- [x] 3. Re-run spec 32's matrix plus the three rows above.
- [x] 4. Correct V15 in spec 32's test plan and point it here.

## Verification (2026-10-11)

All against the real API on `http://localhost:5111` with `JWT_ACCESS_EXPIRES_IN=60s`, driven in headless Chromium at 390px, with cookies minted exactly as `setTokens()` writes them.

| #    | Result                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| V15a | PASS — stays on `/dashboard`, both cookies intact, 0 refresh attempts                                            |
| V15b | PASS — the 401 arrives, the refresh call is aborted at the transport layer, and the session survives: both cookies intact, still on `/dashboard`. **Fails on the pre-fix build** (logged out, cookies cleared), so it bites |
| V15c | PASS — refresh refused with a 401 → `/login`, both cookies cleared (same as V7)                                  |

Spec 32's own 23 checks were re-run after the change and all still pass.
