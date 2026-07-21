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

Status values: `⛔ Not started`, `🔨 In progress`, `✅ Complete`. See `../progress-tracker.md` for the same table plus narrative detail on what's actually shipped.
