import { hardLogout, refreshAccessToken } from "@/lib/refreshClient";
import { getToken, hasUsableRefreshToken } from "@/lib/tokenManager";
import axios from "axios";
import { getBaseUrl } from "./config/envConfig";

const instance = axios.create({
  baseURL: getBaseUrl(),
});

instance.defaults.timeout = 60000;

// ! `/auth/refresh-token` is listed for completeness — lib/refreshClient.ts uses bare axios
// ! and never reaches these interceptors (spec 32 H-W2). It is here so that if anyone ever
// ! routes it through this instance, it is at least excluded from the auth handling rather
// ! than recursing.
const isPublicAuthRoute = (url?: string) =>
  !!url &&
  (url?.includes("/auth/login") ||
    url?.includes("/auth/register") ||
    url?.includes("/auth/refresh-token"));

instance?.interceptors?.request?.use(
  async function (config) {
    if (!(config?.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    } else {
      config.headers["Content-Type"] = "multipart/form-data";
    }

    if (!isPublicAuthRoute(config?.url)) {
      let token = getToken();

      // ! Spec 32 §B.0 step 1: an EXPIRED access token is attached and sent exactly like a
      // ! valid one. This interceptor used to decode it and log the user out locally before
      // ! the request was ever sent — with the 15-minute access token of server spec 51 that
      // ! would eject the user every 15 minutes. Deleting that check is the main point of
      // ! this spec: the server decides what is expired, and the response interceptor below
      // ! recovers from the 401 it sends. No `exp` read here means no clock-skew failure
      // ! mode and no path that logs a user out without the server having said so.
      // !
      // ! The one pre-emptive refresh in this client, and it is NOT an expiry check (§B.0
      // ! step 4): with no access token there is nothing to put in the header, so the server
      // ! would answer "Authorization header missing or malformed" — a different condition
      // ! from the expired-token 401 this flow reacts to. Only reachable if the access
      // ! cookie was deleted by hand, since §C now keeps it for 15 days.
      if (!token && hasUsableRefreshToken()) {
        const outcome = await refreshAccessToken();

        if (outcome.status === "refreshed") {
          token = outcome.accessToken;
        } else if (outcome.status === "unreachable") {
          // ! Spec 32a: the API is unreachable, which says nothing about the session. Fail
          // ! this one request and leave the cookies alone — the screen shows its own error
          // ! state and the next attempt, once the network is back, refreshes normally.
          return Promise.reject(new Error("Could not reach the server"));
        }
      }

      if (!token) {
        // ! Only reachable with no access token and either no usable refresh token or a
        // ! REFUSED refresh — i.e. the server said no. That is a real logout.
        hardLogout();
        return Promise.reject(new Error("No valid session"));
      }

      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  function (error) {
    return Promise.reject(error);
  },
);

instance?.interceptors?.response?.use(
  function (response) {
    return response;
  },
  async function (error) {
    const status = error?.response?.status;
    const config = error?.config;

    // ! Spec 32 §B.0 steps 2-3 — a 401 is recoverable now, not terminal.
    // ! `/auth/*` is excluded: a wrong password must keep surfacing inline in the login form
    // ! rather than refreshing or logging anyone out.
    if (status === 401 && !isPublicAuthRoute(config?.url)) {
      // ! `__isRetry` is what stops a loop when the freshly-refreshed token is ALSO rejected
      // ! — a bug, or a server-side secret rotation mid-session. That second 401 falls
      // ! through to the hardLogout below instead of refreshing again.
      if (!config?.__isRetry && hasUsableRefreshToken()) {
        const outcome = await refreshAccessToken();

        if (outcome.status === "refreshed") {
          config.__isRetry = true;
          // ! Re-issued through the instance so the request interceptor re-reads the cookie,
          // ! rather than hand-patching the header here. Returning this response means the
          // ! caller never sees the 401 at all: no toast, no redirect, no logout.
          return instance.request(config);
        }

        // ! Spec 32a — the defect this closes. The refresh request itself failed to reach
        // ! the server (the network dropped in the window between the 401 and this call,
        // ! which is the most likely moment for it: an expiry fires a burst of requests on
        // ! an already-flaky connection). Logging out here would delete a perfectly valid
        // ! 15-day credential over a blip, with no way to get it back. Keep the session and
        // ! let this request fail like any other.
        if (outcome.status === "unreachable") {
          return Promise.reject({
            statusCode: error?.response?.status ?? 500,
            message:
              error?.response?.data?.message || "Something went wrong",
            errors: error?.response?.data?.errors,
          });
        }
      }

      // ! Reached when the refresh was REFUSED by the server (§B.0 step 3b), when there was
      // ! no usable refresh token, or when this request had already been retried once. All
      // ! three end the session: both cookies removed, hard navigation to /login.
      hardLogout();
    }

    const errorObj = {
      // ! Spec 30 §E: read the HTTP status off the RESPONSE, not off the body. The server's
      // ! globalErrorHandler sends `{ success, message, errorSources, stack }` and has never
      // ! sent `data.statusCode`, so this field was unconditionally 500 and this client was
      // ! structurally blind to every status code. `bikelog_app`'s axiosInstance already
      // ! documents the same finding from the app side.
      statusCode: error?.response?.status ?? 500,
      message: error?.response?.data?.message || "Something went wrong",
      errors: error?.response?.data?.errors,
    };

    return Promise.reject(errorObj);
  },
);

export { instance as axiosInstance };
