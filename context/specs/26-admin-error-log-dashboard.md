# 26: Admin Role + Error Log Dashboard

Status: ✅ Complete — implemented 2026-09-27 per direct user instruction.

## Goal

Give `admin`-role users an admin area in the web client. An admin is also a regular rider: every `app/(main)/` screen keeps working for them unchanged. On top of that, admins get an **Admin** tab in the bottom nav, which opens an admin dashboard at `/admin` showing the backend's error log. This is the web client for backend spec 24 (`bikelog_server/context/specs/24-error-log-system.md`), whose endpoints went live Postgres-side in backend spec 36.

## Backend contract (verified against `bikelog_server` source on `dev/monir`, which contains `origin/master`)

- `GET /admin/error-logs?page&limit&sort&<field>=<value>` uses `authCheck` + `adminCheck` and returns `data: { result: TErrorLog[], meta: number }`. `meta` is a raw count, the same shape as the other paginated lists. Any extra query param becomes an equality filter through `buildPrismaListQuery`.
- `GET /admin/error-logs/:id` is also admin-only. The client doesn't need it, because list rows already carry every field, including `stack`.
- A non-admin gets a `403 "Admin access required"`.
- Row fields: `_id` (plus `id`), `status`, `message`, `errorName?`, `errorSources?` (`{path, message}[]`), `stack?`, `method`, `path`, `userId?`, `userEmail?`, `createdAt`. There's no `updatedAt`.
- There's a 30-day retention window. A daily cron deletes older rows (`daily-error-log-cleanup.yml`).
- The JWT payload already carries `userRole` (`{ userId, userEmail, userRole }`). No `/auth/me` call is needed.
- `userRole` can't be set via `/auth/register` (it isn't in the zod schema). The only way to promote someone to admin is directly in the DB. That user then has to log in again so their JWT carries the new role.

## Design

- **Role helper**: `lib/userRole.ts` exports `isAdminUser()`, which calls `getDecodedToken()?.userRole === "admin"`. `tokenManager.ts` itself stays untouched.
- **Route group `app/(admin)/`**: this is the reserved group from `architecture.md`, now populated.
  - `app/(admin)/layout.tsx` repeats `app/(main)/layout.tsx`'s synchronous, mount-only session check and adds `isAdminUser()`. With no session the user goes to `/login`, a non-admin goes to `/dashboard`, and an admin renders the same `AppShell`. The backend's `adminCheck` is the real authorization. This gate only keeps non-admins from seeing an empty page.
  - `app/(admin)/admin/page.tsx` is a thin wrapper around `<AdminDashboard />`.
- **Components** live in `components/(admin)/`:
  - `AdminDashboard/AdminDashboard.tsx` contains the page heading, a summary card ("Errors logged, last 30 days" = `meta`) and the error log list.
  - `ErrorLog/ErrorLogList.tsx` is a paginated card list (limit 20, `sort=-createdAt`) with an HTTP-method filter (`Select`: All/GET/POST/PUT/PATCH/DELETE → `&method=`). It uses the same `TablePagination` pattern as `MaintenanceLog.tsx`.
  - `ErrorLog/ErrorLogCard.tsx` shows a status badge (5xx red, 4xx amber), the method, the path, the message, the user email and the timestamp. Clicking a card opens the detail modal.
  - `ErrorLog/ErrorLogDetailModal.tsx` is a `BaseModal` with every field, the error sources list and the stack trace in a scrollable `<pre>`.
  - `ErrorLog/type/error-log.types.ts` mirrors the backend fields.
- **AppShell**: an **Admin** (`ShieldCheck`) bottom-nav tab is appended only when `isAdminUser()` is true. It's read once per mount through a `useState` initializer. `AppShell` only renders after the layout's post-mount auth check, so a cookie read can't cause a hydration mismatch.

## Out of scope

- **Filter by status code.** `buildPrismaListQuery` passes query values through as strings, so `?status=500` against the `Int` column would make Prisma throw a validation error (a 500). This needs a backend fix first; it's logged in Known Gaps.
- User management (listing, promoting or banning users). No backend endpoints exist for it.
- Deleting error logs from the UI. The only delete path is the cron-secret endpoint.
- `bikelog_app` (mobile). It's a separate project; flagged to the user.

## Verify

- [x] `yarn build` + `yarn lint` clean (6 warnings, all pre-existing, none in new files).
- [x] Non-admin JWT: bottom nav shows only Dashboard, and `/admin` redirects to `/dashboard`. Checked with Playwright at 390px.
- [x] No session: `/admin` redirects to `/login`.
- [x] Admin JWT with a mocked `/admin/error-logs` response: the Admin tab shows, the list renders, the detail modal shows sources and stack, the method filter sends `&method=POST` and resets to page 1, there's no horizontal overflow at 390px, and there are no console errors. The JWTs were forged locally, which works because the client only decodes the token and never verifies it.
- [ ] Admin against the **real** API. Not done yet, because no admin account exists and none was created in the shared Neon DB without the user's go-ahead. To run it, set `userRole = 'admin'` on your user row, log in again and open `/admin`.
