// ! Resolves the backend API base URL.
// !
// ! HOW THIS VALUE TRAVELS. The sole consumer is utils/axiosInstance.ts:6, which is reached
// ! only from "use client" code — so the request is issued by the END USER'S BROWSER, never
// ! by the Next server or its container. Two consequences:
// !   1. In Docker this must be an address the browser can reach (the host-published port).
// !      A compose service name like http://local:5000 is meaningless to the browser.
// !   2. Next inlines every NEXT_PUBLIC_* read into the client bundle at BUILD time, so in
// !      Docker the value arrives as a build ARG. Changing the backend URL therefore means
// !      rebuilding the image, not restarting the container.
// !
// ! CONVENTION: the env var holds the bare ORIGIN with no /api suffix; /api is appended
// ! here. That matches bikelog_app/utils/envConfig.ts, this repo's existing .env and
// ! .env.example, and the Docker house convention — so no env file needs restructuring.
// !
// ! The fallback keeps `yarn dev` and the Vercel builds working with no variable set, and
// ! replaces the hardcoded http://localhost:5000/api that used to live in this file.
// ! NOTE for local dev: .env.local takes precedence over .env in Next, so if .env.local
// ! sets this to the deployed URL, `yarn dev` will talk to production — set it to
// ! http://localhost:5000 there when working against a local server.

const DEFAULT_API_ORIGIN = "https://bikelog-server.vercel.app";

// ! `process.env.NEXT_PUBLIC_API_BASE_URL` must stay a literal static member expression.
// ! Next's inliner is a textual substitution, so destructuring it or indexing it
// ! dynamically would NOT be replaced and would read as undefined in the browser.
// !
// ! `||` rather than `??` on purpose: a build ARG that is declared but passed empty becomes
// ! "", which `??` would accept — yielding a relative "/api" baseURL that silently sends
// ! every call to the Next server instead of the API. `||` catches "" as well as undefined.
// ! Trailing slashes are stripped so "http://localhost:5000/" cannot produce a double slash.
const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_ORIGIN
).replace(/\/+$/, "");

export const getBaseUrl = (): string => `${API_ORIGIN}/api`;
