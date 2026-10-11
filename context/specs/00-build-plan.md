# 00: Build Plan (Frontend)

This is an index, not a spec — it lists every spec in build order and its current status. Update the status column here whenever a spec's own status line changes (see `progress-tracker.md`'s Documentation Sync rule in `ai-workflow-rules.md`).

Specs are numbered in the order they should be built — each one after 01 depends on 01, and 07 depends on 06 existing (maintenance logs need maintenance types/oil types to pick from). Otherwise 03–08 are largely independent of each other and could be reordered if priorities change.

| # | Spec | Status | One-line summary |
|---|---|---|---|
| 01 | [project-setup.md](01-project-setup.md) | ✅ Complete | Clean up the inherited scaffold, build the token manager + auth interceptors + hard session gate, build the app shell. Prerequisite for everything below. |
| 02 | [auth.md](02-auth.md) | ✅ Complete | Register/login pages (zod-validated, inline mutation, token cookie, delayed redirect), each linking to the other. |
| 03 | [bike-management.md](03-bike-management.md) | ✅ Complete | Bike list, create/edit modal, bike hub page. |
| 04 | [fuel-logs.md](04-fuel-logs.md) | ✅ Complete | Fuel log list + create/edit modal. |
| 05 | [mileage-stats.md](05-mileage-stats.md) | ✅ Complete | Mileage history/monthly/yearly/lifetime, tab-switched. |
| 06 | [maintenance-catalog.md](06-maintenance-catalog.md) | ✅ Complete | Maintenance-type + engine-oil-type create/list. |
| 07 | [maintenance-logs-and-reminders.md](07-maintenance-logs-and-reminders.md) | ✅ Complete | Maintenance log CRUD + reminders banner. Depends on 06. |
| 08 | [spending-summary.md](08-spending-summary.md) | ✅ Complete | Spending totals + category breakdown, tab-switched. |
| 09 | [polish-and-deploy.md](09-polish-and-deploy.md) | ⛔ Not started | Mobile QA pass across every screen + Vercel deploy. Do last. |
| 10 | [audit-fixes.md](10-audit-fixes.md) | ✅ Complete | Fix pass over specs 04-08: 9 critical/high bugs found by audit (delete stale-closure bugs, reminders-banner crash, fuel-log pagination/mileage-toast/mileage-tab field-name mismatches, stale oilType, reminders cache invalidation) plus doc sync. |
| 20 | [20-trend-charts-6-month-window.md](20-trend-charts-6-month-window.md) | ✅ Complete | Widen Spending/Mileage trend charts (spec 13) from a hardcoded 3-month to a 6-month window — client for backend spec 22. |
| 21 | [21-spending-pdf-export.md](21-spending-pdf-export.md) | ✅ Complete | Client-side PDF export (jsPDF) of a period's spending total, category breakdown, and full line-item ledger — client for backend spec 23. |
| 24 | [24-full-system-test-bug-fixes.md](24-full-system-test-bug-fixes.md) | ✅ Complete | 2 small bug fixes from a full-system test: `next-themes` hydration-mismatch console error, `BikeAccessoryCard` currency format ("BDT 800" → "৳800"). Bundled into spec 25's section E. |
| 25 | [25-backend-app-parity-catchup.md](25-backend-app-parity-catchup.md) | ✅ Complete | Sections A–E built and live-verified per direct user instruction (reminders-banner bug, optional service interval, catalog inline edit, avg daily expense card, spec-24 bug fixes). Section F held pending a UX decision; G–L need no client work. See `25a-fix-interval-null-vs-undefined-guard.md` for a bug found and fixed during verification. |
| 26 | [26-admin-error-log-dashboard.md](26-admin-error-log-dashboard.md) | ✅ Complete | Admin role: `app/(admin)/` route group + role gate, Admin bottom-nav tab, `/admin` dashboard with a paginated, method-filterable error log and a detail modal. Client for backend spec 24. |
| 27 | [27-nocturne-redesign.md](27-nocturne-redesign.md) | ✅ Complete | Nocturne visual redesign from Claude Design: tokens, app shell, shared components, all screens. |
| 28 | [28-catalog-soft-delete.md](28-catalog-soft-delete.md) | ✅ Complete | Delete control on both catalog tables: `ConfirmDeleteModal` + the backend's 409 refusal shown as `toast.warning`. Client for backend spec 41. Browser-verified 30/30. |
| 29 | [29-settings-update-odometer.md](29-settings-update-odometer.md) | ✅ Complete | Odometer input on the Settings page. Client for `bikelog-server` spec 44. |
| 30 | [30-per-user-catalogs.md](30-per-user-catalogs.md) | ✅ Complete | Per-user catalogs: react-query cache cleared on logout **and** login (cross-tenant leak), `requiresOilType` replaces the `name === "Engine Oil"` gate, empty states, `axiosInstance`'s always-500 `statusCode` fixed. Client for backend spec 46. See `30a` for two wrong assumptions in its own §B/§D. (Row backfilled 2026-10-11 — this index had stopped at 29.) |
| 31 | [31-dockerize-web-client.md](31-dockerize-web-client.md) | ✅ Complete | 3-stage `node:22-alpine` standalone image + compose `local` service on `:3000`. `NEXT_PUBLIC_API_BASE_URL` is a build arg; `ENV HOSTNAME=0.0.0.0` is load-bearing. (Row backfilled 2026-10-11.) |
| 32 | [32-refresh-token-auth.md](32-refresh-token-auth.md) | ✅ Complete | Access + refresh tokens: both in persistent cookies, a single-flight `lib/refreshClient.ts`, and the request interceptor's pre-emptive **logout** on an expired token replaced by the server-driven refresh-and-retry. Client for backend spec 51. 34 browser checks at 390px against a local API. |
| 32a | [32a-network-failure-must-not-end-the-session.md](32a-network-failure-must-not-end-the-session.md) | ✅ Complete | Spec 32's V15 was unreachable as written, and behind it a real defect: a refresh call failing *on the network* after a genuine 401 logged the user out and deleted a valid 15-day credential. Now only a refusal the server actually sends ends a session. |

_Rows 11–19 are real, already-`✅ Complete` specs (bike issues, bike accessories, trend charts, AI integration, image uploads/lightbox, bike documents, decimal-field fix — see `progress-tracker.md`'s own status table, which is the authoritative one) that were never backfilled into this index — a pre-existing doc-sync gap, not introduced by spec 20/21 and out of scope to backfill here per their own limited scope._

Status values: `⛔ Not started`, `🔨 In progress`, `✅ Complete`. See `../progress-tracker.md` for the same table plus narrative detail on what's actually shipped.
