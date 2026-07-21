# 10: Audit Fixes

Status: ✅ Complete

## Goal

`progress-tracker.md` marks specs 01-08 as complete, but a full audit found 9 critical/high-severity functional bugs that silently break advertised features, plus a few type-safety gaps and stale docs. This spec is the fix pass for everything the audit found — no new features, just correctness.

## Context

Three parallel read-only audits (one per domain cluster) checked every spec 04-08 implementation file against (a) its own spec's stated contract and (b) the real backend source (`bikelog_server/src/app/modules/*`), not just spec prose. Several bugs are the same class repeated across domains — a React-closure/state-timing bug in delete handlers, and response-envelope-shape mismatches that `tsc` can't catch because this app's `apiGet`/`apiPost`/`apiPatch`/`apiDelete` helpers are effectively untyped (`Promise<any>`).

None of these bugs were caught by `yarn lint`/`yarn build` — both are clean today despite every bug below being real. They were found by tracing actual payload/response shapes between the frontend types and the backend's real interfaces/services, not from TypeScript errors.

## Design

### Critical/high bug fixes

**1. Fuel-log delete hits the wrong row (stale-closure bug)**
`app/(main)/bikes/[bikeId]/fuel-logs/page.tsx` — `useDeleteFuelLog(bikeId, editingFuelLog?._id ?? "")` bakes the target id into a hook call sourced from component state set in the _same_ click handler (`setEditingFuelLog(fuelLog)` then immediately `await deleteFuelLog()`). State hasn't updated when `deleteFuelLog()` runs, so the first delete click always fires with an empty id (404), and every later click deletes the _previous_ row, not the clicked one.
Fix: don't route the id through state — resolve/call the delete mutation with the clicked row's id directly at click time, instead of baking it into a hook argument tied to `editingFuelLog`.

**2. Maintenance-log delete has the identical stale-closure bug**
`app/(main)/bikes/[bikeId]/maintenance-logs/page.tsx` — `useDeleteMaintenanceLog(bikeId, editingLog?._id ?? "")`, same pattern, same fix.

**3. `RemindersBanner` throws on every render once data loads**
`components/feature/maintenance-log/RemindersBanner.tsx` — reads `data?.data ?? []` then `.map()`, but the real `GET /bikes/:bikeId/reminders` response is `{ data: { reminders: [...] } }` (confirmed in `maintenanceLog.service.ts`/`.controller.ts`), not `{ data: [...] }`. `data?.data` is a truthy object, so the `?? []` fallback never triggers, and `.map` is called on a plain object → `TypeError`, crashing both consumers (`maintenance-logs/page.tsx` and the bike hub page) with no error boundary anywhere in `app/` to contain it.
Fix: `const reminders = data?.data?.reminders ?? [];` in `RemindersBanner.tsx`, and retype `useReminders` in `components/feature/maintenance-log/useMaintenanceLogs.ts` from `useFetchData<TReminder[]>` to `useFetchData<{ reminders: TReminder[] }>`.

**4. The "mileage closed" payoff toast never fires**
`components/feature/fuel-log/FuelLogFormModal.tsx` — after `createFuelLog(basePayload)`, code reads `response.mileageRecordClosed`, but `createFuelLog` (via `usePost`/`apiPost`) resolves to the _full envelope_ `{ success, message, data: { fuelLog, mileageRecordClosed } }`, not the inner `data`. `response.mileageRecordClosed` is always `undefined`, so the "Mileage: X km/l" toast described in spec 04's Design section never shows, for any create.
Fix: read `response.data.mileageRecordClosed` instead. Also wire the already-defined-but-unused `TCreateFuelLogResponse` type (`fuel-log.types.ts`) into this call site so a future envelope-shape mismatch is caught by `tsc` instead of failing silently again.

**5. Fuel-log pagination is completely inert**
`components/feature/fuel-log/fuel-log.types.ts` + `app/(main)/bikes/[bikeId]/fuel-logs/page.tsx` — the real backend `meta` (`fuelLog.service.ts` → `Queryuilder.countTotal()`) is a **raw number** (total document count), not the `{ page, limit, total, totalPages }` object `TFuelLogsApiResponse` declares. `page.tsx`'s `meta.total`/`meta.totalPages` reads are therefore always `undefined`, which (via `GenericTableComponent`/`TableContent.tsx`'s `totalItems > 10` gate) means **the pagination control never renders**, regardless of row count.
Separately, even once that's fixed, there's a **0-based/1-based index mismatch**: `page.tsx` keeps `page` 1-based (correct for the API's `page` query param) but passes it straight through as `currentPage` to `GenericTableComponent`, which treats `currentPage`/`onPageChange` as 0-based internally — this would misalign the highlighted page, off-by-one the actual API page requested on click, and offset row serial numbers.
Fix: retype `meta` as `number`, compute `totalItems = meta` and `totalPages = Math.ceil(meta / limit)` client-side (backend never returns `totalPages`); and reconcile the index base — either adopt the existing `hooks/usePagination.tsx` (already 0-based, matches `GenericTableComponent`'s contract, and is literally what spec 04's Design section says to use but the current code doesn't) or explicitly convert (`currentPage={page - 1}`, `onPageChange={(p) => setPage(p + 1)}`, pass `itemsPerPage` explicitly).

**6. Mileage Monthly tab always shows "no data," even when real totals exist**
`components/feature/mileage/mileage.types.ts` + `MonthlyMileageTab.tsx` — the type declares `fuelLogs: number`, but the real backend field (`mileageRecord.service.ts`) is `fuelLogCount`. The tab gates its entire data branch on `monthly?.fuelLogs`, which is always `undefined` → always falsy → always renders "No fuel logs for this month," hiding real `totalDistanceKm`/`totalLitersConsumed` whenever they exist.
Fix: rename the type field to `fuelLogCount` and update the tab's condition — mirrors what `YearlyMileageTab.tsx` already does correctly for the same backend field.

**7. Mileage Yearly tab shows "Invalid Date" for all 12 months and has broken React keys**
`components/feature/mileage/mileage.types.ts` + `YearlyMileageTab.tsx` — `TMonthlySummary` invents a `month: number` field that doesn't exist on the backend's `MonthlyMileageResult` (which only has `targetMonth: "YYYY-MM"`). The component uses `m.month` both as the React `key` (always `undefined` → 12 duplicate keys) and in `new Date(year, m.month - 1)` for the label (`NaN` month index → renders the literal string "Invalid Date" for every card).
Fix: derive the month label and the `key` from `targetMonth` (parse the `"YYYY-MM"` string) instead of the nonexistent `month` field.

**8. Stale `oilType` silently attaches to non-oil maintenance logs**
`components/feature/maintenance-log/MaintenanceLogFormModal.tsx` — when the selected `maintenanceType` changes away from "Engine Oil," the `oilType` select unmounts but its RHF field value is never cleared. If a user picks Engine Oil, sets an oil type, then switches to e.g. Chain Lube before submitting, the stale oilType ObjectId is still submitted and persists attached to an unrelated log (the backend only checks the oilType id exists, not that it's relevant to the chosen type).
Fix: add an effect that calls `methods.setValue("oilType", "")` whenever the selected type is not "Engine Oil".

**9. Reminders banner goes stale after any maintenance-log mutation**
`components/feature/maintenance-log/useMaintenanceLogs.ts` — `useCreateMaintenanceLog`/`useUpdateMaintenanceLog`/`useDeleteMaintenanceLog` all invalidate `["maintenanceLogs", bikeId]` but never `["reminders", bikeId]`, even though logging/editing/deleting a maintenance event can change what's due. The `RemindersBanner` stays mounted through these mutations on the maintenance-logs page, so it shows stale due/overdue status until an unrelated remount.
Fix: add `["reminders", bikeId]` to all three hooks' `invalidateQueriesKeys` arrays.

### Related type-safety cleanup (same files as the fixes above)

**10.** `useMaintenanceLogs` (the list hook) is typed `useFetchData<TMaintenanceLog[]>` but the real response is `{ result, meta }`; the consuming page currently forces this with an `as unknown as {...}` cast. Retype the hook correctly and drop the cast.

**11.** Remove the no-op invalidation key in `useUpdateFuelLog` (`["fuelLogs", bikeId, fuelLogId]`) — nothing is ever queried with that key shape (`useFuelLogs` only uses `["fuelLogs", bikeId, page]`); harmless but pure noise, clean up while touching this file for fix #5.

### Documentation sync (required by `../ai-workflow-rules.md`'s own Documentation Sync rule)

**12.** Each of `04-fuel-logs.md` through `08-spending-summary.md` still has its own `Status: ⛔ Not started` line, contradicting `progress-tracker.md` (which says all are Complete) — update all 5 to `✅ Complete`.

**13.** `00-build-plan.md`'s status table still shows 04-08 as "Not started" — sync to Complete, and add this spec's own row.

**14.** `progress-tracker.md`'s Known Gaps section undercounts current lint warnings — it says "3 pre-existing warnings," but a 4th warning (`MaintenanceLogFormModal.tsx`'s `methods.watch()` react-hooks/incompatible-library warning) was introduced by spec 07 and never individually documented; spec 08's Recent Activity entry silently absorbed it into "4 pre-existing, unchanged" without flagging it as new. Add it to Known Gaps explicitly and correct the phrasing.

**15.** Add a new Recent Activity entry documenting this whole audit-and-fix pass: what was audited, every bug found, and how each was fixed.

### Explicitly not changing (judgment calls, not bugs)

- **Maintenance-catalog forms bypass `ControlledInput`/RHF** (`MaintenanceTypeSection.tsx`/`EngineOilTypeSection.tsx` hand-roll raw inputs) — functionally correct, and spec 06 itself calls for "deliberately simple." Leaving as-is rather than a speculative refactor of working code.
- **Month/year picker duplicated 3x** (mileage monthly/yearly, spending) instead of a shared component — not broken, both specs anticipated reuse but neither built it. A refactor, not a bug fix; out of scope here.
- **No `isError` handling anywhere in the app** (every GET hook consumer only reads `{data, isLoading}`) — a real, consistent gap, but it's a new cross-cutting feature addition (touches every list/summary page), not a fix to something spec'd-and-broken. Flagging in Known Gaps rather than building an app-wide error-state pattern speculatively.
- **Native `confirm()` for delete confirmation** on fuel-log/maintenance-log rows, vs. the `BaseModal`/`ModalActionButtons` pattern used for bike delete — inconsistent but functional; the actual bug (stale-closure delete target) is fixed above independent of which confirmation UI is used.

## Implementation

1. `app/(main)/bikes/[bikeId]/fuel-logs/page.tsx` — fix delete stale-closure (#1), fix pagination meta/index handling (#5).
2. `components/feature/fuel-log/fuel-log.types.ts` — retype `meta` as `number` (#5), ensure `TCreateFuelLogResponse` is the actual return type used at the create call site (#4).
3. `components/feature/fuel-log/FuelLogFormModal.tsx` — unwrap `response.data.mileageRecordClosed` (#4).
4. `components/feature/fuel-log/useFuelLogs.ts` — drop the no-op invalidation key (#11).
5. `app/(main)/bikes/[bikeId]/maintenance-logs/page.tsx` — fix delete stale-closure (#2), drop the `as unknown as` cast once the hook is retyped (#10).
6. `components/feature/maintenance-log/RemindersBanner.tsx` — unwrap `data?.data?.reminders` (#3).
7. `components/feature/maintenance-log/useMaintenanceLogs.ts` — retype `useReminders` (#3), add `["reminders", bikeId]` to all three mutation hooks' invalidation (#9), retype the list hook to `{result, meta}` (#10).
8. `components/feature/maintenance-log/MaintenanceLogFormModal.tsx` — clear `oilType` when type isn't Engine Oil (#8).
9. `components/feature/mileage/mileage.types.ts` — rename `fuelLogs` → `fuelLogCount` (#6), remove the nonexistent `month` field from `TMonthlySummary` (#7).
10. `components/feature/mileage/MonthlyMileageTab.tsx` — use `fuelLogCount` (#6).
11. `components/feature/mileage/YearlyMileageTab.tsx` — derive label/key from `targetMonth` (#7).
12. `04-fuel-logs.md` … `08-spending-summary.md` — status lines (#12).
13. `00-build-plan.md` — sync statuses + new row for this spec (#13).
14. `../progress-tracker.md` — Known Gaps correction (#14) + Recent Activity entry (#15).

## Dependencies

Specs 04-08 (this is a fix pass over their output, not new functionality). No new external dependency.

## Verify

- [ ] `yarn lint` and `yarn build` stay at 0 errors after every fix.
- [ ] Fuel-log delete removes the row actually clicked, confirmed by tracing the id used in the DELETE call, not just that _a_ row disappears.
- [ ] Maintenance-log delete: same check.
- [ ] Reminders banner renders without throwing on both the maintenance-logs page and the bike hub page, including the empty-array case (no reminders due).
- [ ] Creating a full-tank fuel log that closes a mileage record shows the "Mileage: X km/l" toast.
- [ ] Fuel-log list: with more than one page of data, the pagination control renders and clicking to page 2 requests `page=2` from the API (not `page=1` or `page=3`).
- [ ] Mileage Monthly tab shows real totals for a month with fuel logs, not "No fuel logs for this month."
- [ ] Mileage Yearly tab shows real month names ("January", "February", ...), not "Invalid Date", with no duplicate-key console warning.
- [ ] Switching a maintenance log's type away from "Engine Oil" before submit does not send a stale `oilType` in the payload.
- [ ] Creating/editing/deleting a maintenance log updates the reminders banner without a page reload.
- [ ] Live-verified against the running `bikelog_server` via `curl` where practical, consistent with how specs 01-03 were verified in this environment (no interactive browser tool available).
