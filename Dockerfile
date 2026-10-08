# ---- Stage 1: deps ----
# Installs dependencies only. Cached independently of source code changes —
# this layer only re-runs when package.json or yarn.lock actually change.
FROM node:22-alpine AS deps
WORKDIR /app

# libc6-compat is the standard Node-on-Alpine (musl) shim. This project pulls in `sharp`
# transitively via next@16.1.5 for next/image optimization, and next.config.ts configures
# remotePatterns for res.cloudinary.com, so the optimizer really does run.
# Yarn installs both @img/sharp-linux-x64 and @img/sharp-linuxmusl-x64; sharp's
# detect-libc picks the musl one at runtime.
RUN apk add --no-cache libc6-compat

# Yarn Classic, not npm — there is no package-lock.json.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000


# ---- Stage 2: builder ----
# Builds the production Next.js standalone output.
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ! THIS IS A BUILD-TIME VALUE, NOT A RUNTIME ONE.
# ! Next inlines NEXT_PUBLIC_* into the client JS bundle during `next build`. Supplying it
# ! through compose's `environment:` instead would do nothing — by then the bundle is
# ! already frozen. Changing the backend URL is a rebuild, not a restart.
# !
# ! It must also be an address the END USER'S BROWSER can reach. Every consumer of
# ! utils/config/envConfig.ts is reached from "use client" code, so the request comes from
# ! the browser, not from this container — which is why a compose service name would fail,
# ! and why the two projects need no shared Docker network.
# !
# ! All .env* files are excluded by .dockerignore, so this ARG is the ONLY source of the
# ! value during the build. Next cannot silently fall back to the on-disk .env.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

ENV NEXT_TELEMETRY_DISABLED=1

# ! This stage needs OUTBOUND NETWORK ACCESS: app/layout.tsx imports Inter from
# ! next/font/google, which downloads and self-hosts the font files at build time.
# ! A build with blocked egress fails here, not at runtime.
RUN yarn build


# ---- Stage 3: runner (final, minimal image) ----
# Only the compiled standalone output + static assets ship here — no TypeScript, no
# devDependencies, no source code beyond what's needed to run.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user — the container should never run as root.
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# ! .next/standalone ALREADY CONTAINS its own file-traced minimal node_modules, its own
# ! trimmed package.json and server.js, so this single COPY lands all three at /app.
# ! Do NOT also copy /app/node_modules or /app/package.json from the builder — that would
# ! replace Next's ~200MB traced tree with the full one and overwrite the trimmed manifest.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Standalone mode does not include static assets or public/ — copy them explicitly.
# This is the standard required Next.js standalone pattern, not specific to this repo.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

ENV PORT=3000

# ! THIS LINE IS REQUIRED, NOT BOILERPLATE. Next's generated standalone server does
# !     const hostname = process.env.HOSTNAME || '0.0.0.0'
# ! and Docker injects HOSTNAME = the container ID into the process env. Without this
# ! override Next binds ONLY the container's bridge IP.
# ! Verified live against the reference raw-materials container, which lacks this line:
# ! HOSTNAME was "ccb0941a1b19" and /proc/net/tcp showed a single listener on
# ! 020013AC:0BB8 = 172.19.0.2:3000 — nothing on 0.0.0.0, nothing on 127.0.0.1.
# ! The published port still works (docker-proxy targets the container IP), so the app
# ! LOOKS fine while every in-container localhost probe is refused — that container has
# ! been reporting "unhealthy" with a failing streak of 147.
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
