import { getBaseUrl } from "@/utils/config/envConfig";
import axios from "axios";
import { clearTokens, getRefreshToken, setTokens } from "./tokenManager";

// ! Spec 32 §D — the access-token refresh, as a module-level singleton.
// !
// ! Deliberately NOT a hook and NOT inside React: the caller is `utils/axiosInstance.ts`'s
// ! interceptors, which run at module scope and cannot use hooks. Everything here is plain
// ! functions over cookies, same as `lib/tokenManager.ts`.

// ! Spec 32a — three outcomes, not two. Telling "the server refused" apart from "we never
// ! reached the server" is the whole point: only the first means the session is over.
// ! Collapsing them (spec 32 §D's original `string | null`) destroyed a valid 15-day
// ! credential whenever the network blipped between the 401 and the refresh call.
export type TRefreshOutcome =
  | { status: "refreshed"; accessToken: string }
  | { status: "refused" }
  | { status: "unreachable" };

// ! Single-flight latch. A page typically has several queries in flight, so one expiry
// ! produces a BURST of 401s — without this, each would fire its own refresh call and the
// ! last one to land would win. They all await the same promise instead, and so all learn
// ! the same outcome.
let refreshInFlight: Promise<TRefreshOutcome> | null = null;

export const refreshAccessToken = async (): Promise<TRefreshOutcome> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async (): Promise<TRefreshOutcome> => {
    try {
      const refreshToken = getRefreshToken();
      // ! Nothing to send. Not "unreachable" — there is no session to preserve.
      if (!refreshToken) return { status: "refused" };

      // ! Bare `axios`, never `axiosInstance` (H-W2). Going through the instance would
      // ! re-enter both interceptors, and a 401 from the refresh endpoint itself would then
      // ! trigger another refresh attempt — recursion, not a retry.
      const res = await axios.post(`${getBaseUrl()}/auth/refresh-token`, {
        refreshToken,
      });

      const nextAccessToken = res?.data?.token;
      // ! A 2xx with no token means the server's contract is broken; we cannot proceed, and
      // ! the server did answer, so this is a refusal rather than a transport problem.
      if (!nextAccessToken) return { status: "refused" };

      // ! Access token only: the server neither rotates nor echoes back the refresh token
      // ! (server spec 51 §A), so there is nothing to re-store and `setTokens` must not
      // ! clear the existing one.
      setTokens({ accessToken: nextAccessToken });
      return { status: "refreshed", accessToken: nextAccessToken };
    } catch (error) {
      // ! Spec 32a §3 — the classification, and it is exactly whether a response exists.
      // ! A response (401, any other 4xx/5xx) means the server spoke and the session is
      // ! over. No response at all (offline, DNS, connection refused, timeout, CORS) says
      // ! NOTHING about the session, so the cookies must survive it: §B.0 step 3 logs the
      // ! user out when the server *answers* 401, not when we fail to ask.
      const serverAnswered = !!(error as { response?: unknown })?.response;
      return { status: serverAnswered ? "refused" : "unreachable" };
    } finally {
      // ! Must clear on SUCCESS as well, or only one refresh would ever happen per page load
      // ! and the next expiry would reuse this resolved promise's stale outcome forever.
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

// ! The single terminal path. Every caller answers a `null` from `refreshAccessToken()` with
// ! this and nothing else, so "the session is over" is expressed in exactly one place.
// !
// ! The hard navigation is load-bearing, not laziness (H-W4): this app's `QueryClient` lives
// ! in `QueryProvider`'s `useState`, not in an importable singleton, so module-scope code
// ! cannot call `queryClient.clear()`. A full page load is what drops the cache instead,
// ! which is what keeps spec 30 §A's cross-tenant isolation intact on this path.
export const hardLogout = (): void => {
  clearTokens();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};
