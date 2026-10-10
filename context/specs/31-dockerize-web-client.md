# Spec 31 — Dockerize the web client

**Status:** Complete (2026-10-08)
**Scope:** tooling, plus two small source changes that Docker requires.

## Why

The client only ever ran as `yarn dev` or as a Vercel deploy. The developer had already
dockerized a frontend in another project (`Raw-Materials-local`) and wanted the same
3-stage standalone pattern here. The server half is `bikelog_server` spec 47; the two were
built together but commit separately, per the per-repo rule.

Two things made this more than a copy of the reference Dockerfile:

1. **This app read no environment variable at all.** `utils/config/envConfig.ts` hardcoded
   `http://localhost:5000/api`, and `process.env` appeared **zero** times anywhere in the
   source. A `NEXT_PUBLIC_API_BASE_URL` build arg would have been a silent no-op.
2. `next.config.ts` did not set `output: "standalone"`, which the runner stage depends on.

## What shipped

| File | Change |
| --- | --- |
| `Dockerfile` | new — 3-stage `deps` → `builder` → `runner`, non-root, `node:22-alpine` |
| `.dockerignore` | new |
| `docker-compose.yml` | new — one `local` service, `3000:3000` |
| `utils/config/envConfig.ts` | rewritten to read `NEXT_PUBLIC_API_BASE_URL` |
| `next.config.ts` | `output: "standalone"` added |
| `.env`, `.env.example` | normalised to `KEY=value`, bare origin, no quotes |

```bash
docker compose up local -d --build
```

## Decisions, and the evidence behind them

### The env var holds a bare ORIGIN; `/api` is appended in code

Chosen over putting `/api` in the variable because it matches
`bikelog_app/utils/envConfig.ts` (`baseURL` + `/api`), this repo's pre-existing `.env` and
`.env.example` (both origin-only), and the reference project's convention — so no env file
needed restructuring and the Vercel project variable, if set, keeps working. It also leaves
room for non-`/api` paths on the same server (`GET /` is the liveness route).

Two defensive details in the rewrite:

- **`||`, not `??`.** A build ARG that is declared but passed empty becomes `""`, which
  `??` would accept — producing a relative `/api` baseURL that silently sends every call to
  the Next server and 404s. `||` traps `""` as well as `undefined`.
- `process.env.NEXT_PUBLIC_API_BASE_URL` is kept as a literal static member expression.
  Next's inliner is a textual substitution, so destructuring or dynamic indexing would not
  be replaced and would read `undefined` in the browser.

The fallback is the deployed Vercel origin, so `yarn dev` and Vercel builds keep working
with no variable set. This also retires the hardcoded `http://localhost:5000/api` that
commit `c95ddab` had committed — which would otherwise have shipped a Vercel build pointing
at localhost.

**Local-dev note:** `.env.local` takes precedence over `.env` in Next and currently points
at the deployed backend, so a plain `yarn dev` now talks to production. Set `.env.local` to
`http://localhost:5000` when working against a local server.

### `ENV HOSTNAME=0.0.0.0` is required, and the reference project is broken without it

Next's generated standalone server does `const hostname = process.env.HOSTNAME || '0.0.0.0'`,
and **Docker injects `HOSTNAME` = the container ID** into the process env. Without the
override, Next binds only the container's bridge IP.

This was verified against the developer's live reference container, which lacks the line:

```
raw-materials-frontend-local   raw-materials-local:v1.0.0   Up About an hour (unhealthy)
FailingStreak=147   "wget: can't connect to remote host: Connection refused"
HOSTNAME=ccb0941a1b19
/proc/net/tcp -> 020013AC:0BB8   (= 172.19.0.2:3000)
```

One listener, on the bridge IP. Nothing on `0.0.0.0`, nothing on `127.0.0.1`. The published
port still works because docker-proxy targets the container IP, so the app *looks* fine
while every in-container probe is refused — which is why that container has been quietly
unhealthy for 147 consecutive checks. **The same one-line fix is worth applying to
`Raw-Materials-local/Dockerfile`.**

After adding it here, this image reports `HOSTNAME=0.0.0.0` and a single listener on
`00000000:0BB8`.

### The healthcheck probes `/login`, not `/`

`app/page.tsx` is a server component that calls `redirect("/login")`, so `GET /` answers
**307** — confirmed. `/login` answers a flat 200 and makes no API call, so the probe tests
this container only and won't go red because the API is down.

### No shared Docker network with the server

Every consumer of `envConfig.ts` is reached from `"use client"` code (sole consumer:
`utils/axiosInstance.ts:6`), so the request is issued by the **end user's browser**, not by
this container. A compose service name like `http://local:5000` is meaningless to the
browser. The server is reached over the host's published port instead, which is also why
the two projects keep independent bridge networks.

CORS needed no change: `bikelog_server/src/app.ts` already allowlists `http://localhost:3000`.

### `.dockerignore` excluding `.env*` is a security requirement

`.env.local` on disk contains a **live `VERCEL_OIDC_TOKEN`**, and anything in the build
context can be baked into a layer. Excluding every `.env*` also has a deliberate side
effect: Next reads `.env`/`.env.production` from the context via `@next/env`, so the
Dockerfile ARG becomes the *sole* source of the URL — a build can never silently pick up
the on-disk value and pass it off as intentional.

The trade-off is that forgetting the ARG fails *silently* (Next bakes in the fallback), so
there are three layers of defence: compose's `${VAR:?...}` guard, the `||` in `envConfig.ts`,
and the bundle grep in the verification below.

### `alpine` is fine here

No native dependencies of our own. `sharp` arrives transitively via `next@16.1.5` for
`next/image` optimization (and `next.config.ts` configures `res.cloudinary.com`
remotePatterns, so the optimizer really runs) — `@img/sharp-linuxmusl-x64` and
`@img/sharp-libvips-linuxmusl-x64` are both in the dependency tree, and `detect-libc` picks
the musl build at runtime.

## Verification performed

| Check | Result |
| --- | --- |
| `docker compose config` | ARG interpolates to `http://localhost:5000` (spaces/quotes handled) |
| `docker compose build` | clean; standalone output produced |
| **URL baked into the bundle** | `grep -rl "http://localhost:5000" .next/static/chunks/` → **1 file** |
| **negative control** | `grep -rl "bikelog-server.vercel.app" .next/static/chunks/` → **0 files**, so the ARG won, not the fallback |
| image layout | `node_modules`, `package.json`, `public`, `server.js` — Next's trimmed standalone tree, not the full one |
| non-root | `uid=100(nextjs) gid=101(nodejs)` |
| no secrets | zero `.env*` files in the image; no `VERCEL_OIDC_TOKEN` anywhere |
| `HOSTNAME` bind | `HOSTNAME=0.0.0.0`, listener `00000000:0BB8` |
| in-container localhost probe | `wget http://127.0.0.1:3000/login` succeeds |
| from host | `/login` → **200**, `/` → **307** (as predicted) |
| CORS to the API container | preflight `204` with `Access-Control-Allow-Origin` for both `:3000` and `:3001` |
| non-Docker regression | `tsc --noEmit` clean, `yarn lint` 0 errors / 5 pre-existing warnings — unchanged |

**Not verified:** a real browser login session. Port 3000 was occupied by the developer's
`raw-materials-frontend-local` container during this pass, so the image was exercised on
host port 3001 instead (also in the server's CORS allowlist). The compose file still
publishes 3000 — stop the other container first, or the `up` fails with
`Bind for 0.0.0.0:3000 failed: port is already allocated`.
