import { deleteCookie, getCookie, setCookie } from "cookies-next";
import jwt, { JwtPayload } from "jsonwebtoken";

const ACCESS_TOKEN_KEY = "accessToken";
// ! Spec 32 — the refresh token (server spec 51). 15 days, exchanged for a new access token
// ! by lib/refreshClient.ts. This is now the thing that actually decides how long a session
// ! lasts; the access token is a 15-minute credential on top of it.
const REFRESH_TOKEN_KEY = "refreshToken";

// ! Matches the server's refresh-token lifetime (JWT_REFRESH_EXPIRES_IN, default 15d). A
// ! cookie outliving its token is harmless — the server rejects it on `exp` and the client
// ! checks the same claim before bothering to call the refresh endpoint.
const MAX_AGE = 15 * 24 * 60 * 60;

// ! `secure` is conditional, not hardcoded: this app is developed on http://localhost:3000
// ! and its Docker compose service is reached the same way, where a `secure` cookie would be
// ! silently dropped and every session would break. `sameSite: "lax"` keeps the cookies off
// ! cross-site POSTs. They cannot be httpOnly — the API is a different site, so a server-set
// ! cookie would be a third-party cookie that Safari already blocks (spec 32 H-W3).
const cookieOptions = () => ({
  path: "/",
  maxAge: MAX_AGE,
  sameSite: "lax" as const,
  secure:
    typeof window !== "undefined" && window.location.protocol === "https:",
});

export const setTokens = ({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken?: string;
}) => {
  setCookie(ACCESS_TOKEN_KEY, accessToken, cookieOptions());

  // ! Optional on purpose. A refresh keeps the same refresh token (the server does not rotate
  // ! or echo it back), so that call passes the access token alone and must not clobber it.
  // ! A login with no `refreshToken` in the response — a server that predates spec 51 — has
  // ! to keep working too, and leaves the user with today's no-refresh behaviour.
  if (refreshToken) {
    setCookie(REFRESH_TOKEN_KEY, refreshToken, cookieOptions());
  }
};

export const getToken = (): string | undefined =>
  getCookie(ACCESS_TOKEN_KEY) as string | undefined;

export const getRefreshToken = (): string | undefined =>
  getCookie(REFRESH_TOKEN_KEY) as string | undefined;

// ! Deletes BOTH, and with the same `path` the setter used — a delete with a mismatched path
// ! silently misses and would leave a live 15-day credential behind on logout.
export const clearTokens = () => {
  deleteCookie(ACCESS_TOKEN_KEY, { path: "/" });
  deleteCookie(REFRESH_TOKEN_KEY, { path: "/" });
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = jwt.decode(token) as JwtPayload;
  if (!decoded?.exp) return true;
  return decoded?.exp < Math.floor(Date.now() / 1000) + 60; // 60s buffer
};

// ! Spec 32 §C: the refresh-vs-logout decision, and the ONLY surviving caller of
// ! `isTokenExpired`. Nothing decides whether to *send* a request by looking at the access
// ! token's `exp` any more — that is the server's job (§B.0 step 1). This check only avoids a
// ! round trip that is certain to come back 401.
export const hasUsableRefreshToken = (): boolean => {
  const refreshToken = getRefreshToken();
  return !!refreshToken && !isTokenExpired(refreshToken);
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
