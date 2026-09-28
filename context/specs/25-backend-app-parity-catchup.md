# 25: Backend + App Parity Catch-Up — Implementation Plan

Status: ✅ Complete (sections A–E) — implemented and live-verified 2026-09-21, per direct user instruction. Section F held per this file's own recommendation (needs a UX decision the user hasn't made). Sections G/H/J/L confirmed to need no client work; I/K remain deferred, out of scope.

## Implementation status

- [x] **A. Reminders banner bug fix** — see `RemindersBanner.tsx`. Live-verified against a real backend + real browser.
- [x] **B. Maintenance log: optional Service Interval (km)** — see schema/form/card changes. Live-verified.
- [x] **C. Maintenance/Engine-Oil catalog: inline edit** — see `MaintenanceTypeSection.tsx`/`EngineOilTypeSection.tsx`. Live-verified.
- [x] **D. Spending Month tab: Avg Daily Expense card** — see `Spending.tsx`/`SpendingSummaryView.tsx`. Live-verified.
- [x] **E. Spec 24's two bug fixes** (hydration warning, accessory currency format) — bundled in as planned. Live-verified. `24-full-system-test-bug-fixes.md`'s own status updated to Complete.
- [ ] **F. Status filter "All" removal** — **not built**, per this file's own recommendation to ask first (web uses dropdowns, not pills — the mobile UX rationale doesn't automatically transfer). Awaiting a decision.
- **G, H, J, L** — confirmed to need no client work, nothing to build.
- **I, K** — deferred, larger separate initiatives, not part of this pass.

A real bug was found during live verification of section B (see `25a-fix-interval-null-vs-undefined-guard.md`) — the backend returns optional interval fields as explicit `null`, not omitted, which the original `!== undefined` guards didn't account for. Fixed as its own small spec, per this project's error-handling convention.

## Goal

`bikelog_server` and `bikelog_app` have both moved ahead of `bikelog_client-web-` since this client's own specs 01–24 were written:

- `bikelog_server` is now at spec **38** (this client is caught up through backend spec **25**, i.e. specs 26–38 have no client-side counterpart here yet).
- `bikelog_app` is now at spec **35** and has explicitly reached "feature parity with the web client... for all bike-scoped screens" (per its own `progress-tracker.md`) — meaning several UI changes were made there that were deliberately **not** ported to this project, per this repo's cross-project rule (`ai-workflow-rules.md` / root `CLAUDE.md`: don't edit another project while working in one, just flag the gap).

This file is that flag, turned into a concrete plan. It surveys every backend spec (26–38) and every app spec (20–35) this client hasn't absorbed yet, decides which ones actually need client work (several are backend-only or mobile-only and need none), and writes up a Design for each real gap at the same level of detail as this project's other specs — so any one of them can be lifted into its own numbered spec file and built independently once the user picks an order.

## How this plan was built

Read directly, not inferred:
- `bikelog_server/context/progress-tracker.md` (status/Recent Activity/Known Gaps) + the full text of specs `26`, `27`, `28`, `38`.
- `bikelog_app/ai context/progress-tracker.md` (status/Recent Activity/Known Gaps) + the full text of specs `26`, `32`, `33`, `35`.
- This project's own current source for every area touched below (`components/(main)/MaintenanceLog/*`, `components/(main)/SettingsCatalog/*`, `components/(main)/Spending/*`, `components/(main)/BikeIssue/BikeIssue.tsx`, `components/(main)/BikeAccessory/BikeAccessory.tsx`) — every file path, prop name, and current-behavior claim below was confirmed against real code just now, not assumed from the spec docs alone.

## Feature summary (priority order)

| # | Feature | Source spec(s) | Client work needed? | Priority |
|---|---|---|---|---|
| A | Reminders banner bug: blank maintenance-type name + will break on interval-less reminders | Pre-existing bug, surfaced in both `bikelog_server` and `bikelog_app` Known Gaps | Yes | **High — live bug** |
| B | Maintenance log: optional Service Interval (km) | Backend spec 28, App spec 33 | Yes | High |
| C | Maintenance/Engine-Oil catalog: inline edit | Backend spec 38, App spec 35 | Yes | Medium |
| D | Spending Month tab: Avg Daily Expense card | App spec 26 (web-only precedent, no backend spec) | Yes | Medium |
| E | This project's own already-written, not-yet-built spec 24 (hydration warning + accessory currency format bugs) | Web spec 24 (already exists) | Yes | Medium — quick, already fully designed |
| F | Issues/Accessories status filter: drop "All", default to a real status | App spec 32 | Optional — judgment call, see below | Low |
| G | Fuel log date-before-purchase validation | Backend spec 27 | No required work — informational only | — |
| H | Fuel-log period-closure backdated-date bug | Backend spec 26 | No client work — pure backend fix | — |
| I | Weekly push notification | Backend spec 21, App spec 24 | Not directly portable — needs a scoping decision | Deferred, ask user |
| J | Postgres/Prisma migration (backend specs 31–37) | — | **Zero** — server-only per root `CLAUDE.md` | — |
| K | Error-log admin system | Backend spec 24 | Out of scope — no admin UI exists on any client yet | Deferred |
| L | Sync spend logs to expense tracker | Backend spec 30 | **Zero** — backend-to-backend only | — |

---

## A. Reminders banner bug (blank type name + will break on optional intervals) — High priority

### Goal

Fix a real, already-flagged bug in `components/(main)/MaintenanceLog/RemindersBanner.tsx` before it gets worse. Two separate issues in the same file:

1. **Blank maintenance-type name (pre-existing, already flagged in both other projects' Known Gaps).** `GET /bikes/:bikeId/reminders` (`maintenanceLog.service.ts`'s `getRemindersFromDB`) has never populated `maintenanceType` — it returns a bare id string, not `{ _id, name }`. `RemindersBanner.tsx:36` reads `r.maintenanceType.name` unconditionally, so every reminder's headline is blank. `MaintenanceLogCard.tsx` already guards this correctly elsewhere in this same project (`typeof log.maintenanceType === "object"`) — `RemindersBanner.tsx` never got the same treatment.
2. **New, more urgent since backend spec 28 shipped:** `RemindersBanner.tsx:39-40` reads `r.kmRemaining` unconditionally (`Math.abs(r.kmRemaining)` / `r.kmRemaining.toLocaleString()`). Backend spec 28 (already ✅ Complete on `bikelog_server`) made `intervalKmUsed`/`nextDueOdometer` optional on maintenance logs — a log with no interval produces a **date-only reminder** with `kmRemaining: undefined`. The moment any user creates an interval-less maintenance log against the live (migrated) backend, this line throws `Cannot read properties of undefined` or renders `"Due in undefined km"` client-side. This is not hypothetical future work — the backend half is already live.

### Context

- Confirmed via direct read of `components/(main)/MaintenanceLog/RemindersBanner.tsx` (see file, lines 23/36/39-40 as of this writing).
- `TReminder` (`components/(main)/MaintenanceLog/type/maintenance-log.types.ts`) currently types `maintenanceType` as `{ _id: string; name: string }` and `kmRemaining` as required `number` — both wrong against the real (and, for `kmRemaining`, the *now-optional*) response shape.
- `bikelog_app`'s own spec 33 already worked out the exact fallback-chain logic needed for the `kmRemaining`/`daysRemaining`/bare-status cases (see its Design section) — this is the same shape, ported to React/Tailwind instead of React Native/StyleSheet.
- The blank-name bug has two possible fixes: populate `maintenanceType` server-side (touches `bikelog_server`, out of scope per the cross-project rule — flag it there if the user wants it fixed at the source) or resolve the id client-side against an already-fetched `/maintenance-types` list (same pattern `MaintenanceLogFormModal.tsx` and `MaintenanceLog.tsx` already use per this project's own spec-22 fix for `MaintenanceLogCard.tsx`'s identical problem). This plan recommends the client-side fix, matching the precedent already set in this exact codebase for the exact same bug in a sibling component.

### Design

`components/(main)/MaintenanceLog/RemindersBanner.tsx`:
- Accept an optional `maintenanceTypes: TMaintenanceType[]` prop (or fetch `/maintenance-types` internally via `useFetchData`, mirroring `MaintenanceLog.tsx`'s existing fetch-and-pass-down pattern from spec 22 — prefer reusing the parent's already-fetched list if `MaintenanceLog.tsx` already has one in scope, to avoid a duplicate request).
- Add a `getTypeName(maintenanceType: TReminder["maintenanceType"])` helper (same shape as `MaintenanceLogCard.tsx`'s existing one): if it's a string, resolve against the list; if it's already an object, use `.name`; fallback to `"Maintenance"`.
- Replace the headline logic with the same three-way fallback chain as `bikelog_app` spec 33's Design section: `kmRemaining !== undefined` → km message; else `daysRemaining !== undefined` → days message; else a bare `"Overdue"`/`"Upcoming"` string.
- Guard the secondary days line so it doesn't double-print when the headline already used `daysRemaining` (same `kmRemaining !== undefined && daysRemaining !== undefined` condition as the app's version).
- `key={`${typeof r.maintenanceType === "string" ? r.maintenanceType : r.maintenanceType._id}-${i}`}` instead of the current `r.maintenanceType._id` (which will throw right now if the value is ever a bare string, which — per the bug above — it already always is).

`components/(main)/MaintenanceLog/type/maintenance-log.types.ts`:
- `TReminder.maintenanceType`: `{ _id: string; name: string } | string` (reflects reality — it's always a string today, but typing it as a union rather than flipping it outright protects against a future server-side populate fix silently changing the shape without a client crash).
- `TReminder.nextDueOdometer?: number`, `TReminder.kmRemaining?: number` (both currently required `number` — must become optional to match backend spec 28's real response shape and to type-check the new guard logic).

### Files to touch

| Path | Change |
|---|---|
| `components/(main)/MaintenanceLog/type/maintenance-log.types.ts` | `TReminder.maintenanceType` → union type; `nextDueOdometer`/`kmRemaining` → optional |
| `components/(main)/MaintenanceLog/RemindersBanner.tsx` | type-name resolution, km/date/bare fallback chain, safe `key` |
| `components/(main)/MaintenanceLog/MaintenanceLog.tsx` | pass its already-fetched maintenance-types list down to `RemindersBanner`, if it fetches one for the form already — check before adding a second fetch |

### Dependencies

None new. Independent of B/C below, but touches the same folder — natural to bundle with B if both are picked up in one pass.

---

## B. Maintenance log: optional Service Interval (km)

### Goal

Backend spec 28 (✅ Complete, live) made `intervalKmUsed` optional on `POST/PATCH .../maintenance-logs` — a one-off repair or a maintenance type with no recurring interval shouldn't force a number that doesn't apply. This client still hard-requires it. Port the change, mirroring `bikelog_app` spec 33's already-built client-side logic (React Native → React/Tailwind).

### Context

- `components/(main)/MaintenanceLog/schema/maintenance-log.schema.ts:20` — `intervalKmUsed` is currently a required `z` field (confirmed via grep; exact validator not yet re-read in full, but the create form blocks submit today per `MaintenanceLogFormModal.tsx`'s current behavior).
- `MaintenanceLogFormModal.tsx:56` seeds `intervalKmUsed: ""` in defaults, `:88` does `log.intervalKmUsed.toString()` on edit-prefill (will throw once a real interval-less log exists), `:122` sends `Number(data.intervalKmUsed)` unconditionally (sends `NaN` if blank — the current hard-required validation is the only thing preventing that today).
- `MaintenanceLogCard.tsx:114-115` renders `log.intervalKmUsed.toLocaleString()` / `log.nextDueOdometer.toLocaleString()` unconditionally — will throw on a real interval-less log once this ships end-to-end.
- `components/(main)/MaintenanceLog/type/maintenance-log.types.ts:9-10,27,53` — `intervalKmUsed`/`nextDueOdometer` typed as required `number` in `TMaintenanceLog`/the create-payload type/`TReminder` (the last one already covered by section A above — don't duplicate that edit if both sections are done together).

### Design

Mirror `bikelog_app` spec 33's Design section exactly, translated to this stack:

**`components/(main)/MaintenanceLog/type/maintenance-log.types.ts`**
- `TMaintenanceLog.intervalKmUsed?: number`, `.nextDueOdometer?: number` (both were required).
- Create-payload type's `intervalKmUsed?: number` (was required).

**`components/(main)/MaintenanceLog/schema/maintenance-log.schema.ts`**
- Drop the required-error / `.min()` constraint on `intervalKmUsed`, make it `z.string().optional()` (or whatever the sibling optional fields like `serviceCenter` already use as their pattern — match that exactly) with format validation only applied when non-empty (`.refine` guarding on a truthy trimmed value, same shape the schema likely already uses for other optional numeric-as-string fields).

**`components/(main)/MaintenanceLog/MaintenanceLogFormModal.tsx`**
- Edit-prefill: `log.intervalKmUsed?.toString() ?? ""`.
- Submit payload: `intervalKmUsed: data.intervalKmUsed?.trim() ? Number(data.intervalKmUsed) : undefined` instead of the current unconditional `Number(data.intervalKmUsed)`.
- Field label: append `" (optional)"`, matching this form's existing convention for other optional fields.

**`components/(main)/MaintenanceLog/MaintenanceLogCard.tsx`**
- Wrap the `Interval`/`Next due` lines (currently lines 114-115, inside the same `grid grid-cols-2` block as `Cost`) in a guard on `log.intervalKmUsed !== undefined`, keeping `Cost` (and `serviceCenter`, if present) rendering unconditionally either way — same reasoning as the app version: these two lines are always both-present or both-absent per backend spec 28's design, so one guard covers both.

### Dependencies

None new. Depends on backend spec 28 already being live on whatever branch/deployment this client talks to (it is, on `postgressMigrate` — confirm the client's `NEXT_PUBLIC_API_BASE_URL` actually points at a backend that has spec 28, not a stale pre-migration deployment, before testing this live).

---

## C. Maintenance Type / Engine Oil Type: inline edit

### Goal

Backend spec 38 (✅ Complete, live) added `PATCH /maintenance-types/:id` and `PATCH /engine-oil-types/:id` — previously create/list only, no way to fix a typo or adjust an interval without orphaning `maintenanceLog` FK references via delete-and-recreate. This client's `components/(main)/SettingsCatalog/MaintenanceTypeSection.tsx` / `EngineOilTypeSection.tsx` currently only build the create form + static list (confirmed by direct read of `MaintenanceTypeSection.tsx` — `useFetchData` + `usePost` only, plain `<ul>` of static rows, no edit affordance anywhere). Add inline edit, mirroring `bikelog_app` spec 35's already-built pattern.

### Context

- `hooks/useApi.ts` already has `usePatch` (confirmed used elsewhere in this project, e.g. spec 22's `apiPatch`/`usePatch` config-forwarding fix) — no new hook needed.
- Both catalogs are global (no per-user ownership) — any logged-in user can already create an entry; the edit affordance needs no ownership gating either, same as create today.
- `defaultIntervalKm`/`defaultIntervalDays` on `MaintenanceType` are nullable server-side — an edit form should be able to explicitly clear one back to blank/`null`, not just overwrite with a new value (matches backend spec 38's own nullable-clear support, and `bikelog_app` spec 35's `handleSaveMaintEdit` sends explicit `null` for a blank field rather than omitting it).
- `suggestedIntervalKm` on `EngineOilType` is **not** nullable server-side — its edit form should keep it required-if-submitted, no null-clear option (matches backend spec 38's schema exactly).
- No delete UI — backend spec 38 deliberately didn't add a `DELETE` endpoint either (deleting a catalog row referenced by existing `maintenanceLog` FKs is a separate, unasked-for design question). Out of scope here too.

### Design

Mirror `bikelog_app` spec 35's shape (inline-expand edit per row, not a modal — matches this project's own existing "expand to add" idiom in `MaintenanceTypeSection.tsx`/`EngineOilTypeSection.tsx` rather than introducing `BaseModal` for this):

**`components/(main)/SettingsCatalog/type/maintenance-type.types.ts`** (and the oil-type sibling type file)
- Add `TUpdateMaintenanceTypePayload`/`TUpdateEngineOilTypePayload` (all fields optional, matching the create-payload types' naming convention already in this folder).

**`MaintenanceTypeSection.tsx`** (and `EngineOilTypeSection.tsx`, same shape)
- New state: `editingId: string | null`, `editName`, `editIntervalKm`, `editIntervalDays` (mirrors the existing create-form state naming).
- `updateMutation = usePatch([["maintenanceTypes"]])` (same invalidation key as the existing `createMutation`, so the list refetches automatically on success — `usePatch`'s existing `onSuccess` behavior, already proven elsewhere in this project).
- Each `<li>` row gains an edit icon/button; clicking it populates the edit state and swaps that row's static text for an inline form (name input + two interval inputs + Save/Cancel), reusing this file's existing input/button Tailwind classes rather than inventing new ones.
- Save handler: validates `editName` non-empty (same pattern as the existing `handleSubmit`), sends `defaultIntervalKm`/`defaultIntervalDays` as explicit `null` when the field was cleared (not omitted) so a previously-set interval can actually be unset — `Number(x) || null` won't do (that would also null out `0`, which isn't a realistic interval value here so acceptable, but prefer the cleaner `x.trim() ? Number(x) : null`, matching `bikelog_app` spec 35's exact payload-building logic).
- Cancel handler: resets local edit state only, no network call — same as the app version.
- Errors surface via the existing `toast.error(message ?? "Failed to update ...")` pattern already used by `handleSubmit`.

### Files to touch

| Path | Change |
|---|---|
| `components/(main)/SettingsCatalog/type/maintenance-type.types.ts` | add `TUpdateMaintenanceTypePayload` |
| `components/(main)/SettingsCatalog/type/engine-oil-type.types.ts` (confirm exact filename) | add `TUpdateEngineOilTypePayload` |
| `components/(main)/SettingsCatalog/MaintenanceTypeSection.tsx` | edit state, `usePatch` mutation, inline edit row UI |
| `components/(main)/SettingsCatalog/EngineOilTypeSection.tsx` | same, mirrored |

### Dependencies

None new. Depends on backend spec 38 (already live).

---

## D. Spending Month tab: Avg Daily Expense card

### Goal

`bikelog_app` spec 26 added an "Avg Daily Expense" card to the Spending screen's Month tab (`totalSpending / elapsed-days-in-month`), a pure client-derived stat with no backend involvement. Port it here for parity — this is a UI-only feature with no source-of-truth spec on the backend side, purely a client convenience.

### Context

- Confirmed via direct read of `components/(main)/Spending/Spending.tsx` (lines 37-175 as of this writing) and `SpendingSummaryView.tsx` (full file, 51 lines) — `SpendingSummaryView` currently takes exactly `{ totalSpending, categoryBreakdown, isLoading }` and is called identically from all three of Month/Year/Lifetime (`Spending.tsx:167-171`, one shared call site for all three periods — unlike the app's version, which has separate `MonthTab`/`YearTab`/`LifetimeTab` components). This means the new props must be **optional** and only passed when `period === "month"`, so Year/Lifetime call sites (which share the exact same JSX block here) stay unaffected without needing to be split into separate components.
- `date-fns` is already a dependency of this project (`Spending.tsx:6` already imports `format, parse` from it) — no new package needed, same as the app version.

### Design

Mirror `bikelog_app` spec 26's formula exactly:

```ts
function getElapsedDaysInMonth(targetMonth: string): number {
  const monthDate = parse(targetMonth, "yyyy-MM", new Date());
  const now = new Date();
  if (isSameMonth(monthDate, now)) return getDate(now);
  if (monthDate > now) return 0;
  return getDaysInMonth(monthDate);
}
```
(add `getDate, getDaysInMonth, isSameMonth` to the existing `date-fns` import in `Spending.tsx`.)

**`components/(main)/Spending/Spending.tsx`**
- Add the helper above, colocated near `formatMonth`/`getPeriodLabel` (matching this file's existing pattern of small inline date helpers, not a new `utils/date.ts`).
- Where `SpendingSummaryView` is called (currently one shared call site for month/year/lifetime, line 167), compute `daysElapsed`/`avgDailyExpense` only for `period === "month"` and conditionally spread them in:
  ```tsx
  <SpendingSummaryView
    totalSpending={spending?.totalSpending ?? 0}
    categoryBreakdown={spending?.categoryBreakdown ?? []}
    isLoading={isLoading}
    {...(period === "month" && daysElapsed > 0 ? { avgDailyExpense, daysElapsed } : {})}
  />
  ```

**`components/(main)/Spending/SpendingSummaryView.tsx`**
- Add two new optional props to `TProps`: `avgDailyExpense?: number`, `daysElapsed?: number`.
- Render a second card directly below the existing `totalCard`-equivalent block (lines 22-27), above `By Category`, guarded on both props being defined and `daysElapsed > 0` — same Tailwind card styling already used for the total-spending block (`rounded-lg border border-border bg-card p-4`), just a smaller value text size so it doesn't compete visually:
  ```tsx
  {avgDailyExpense !== undefined && daysElapsed !== undefined && daysElapsed > 0 && (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">Avg Daily Expense</p>
      <p className="text-lg font-semibold">৳{avgDailyExpense.toFixed(2)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        over {daysElapsed} day{daysElapsed === 1 ? "" : "s"} this month
      </p>
    </div>
  )}
  ```

### Dependencies

None new. No backend involvement at all — purely additive, optional props keep Year/Lifetime tabs byte-identical to today.

---

## E. This project's own already-written spec 24 (quick wins)

`context/specs/24-full-system-test-bug-fixes.md` already exists, fully designed, status "📋 Proposed — not started" — it was written during a full-system test pass and never picked up. Both fixes are one-line-ish:

1. `app/layout.tsx` — add `suppressHydrationWarning` to `<html>` (fixes a `next-themes`-related console error firing on every page load).
2. `components/(main)/BikeAccessory/BikeAccessoryCard.tsx` — `formatPrice` currently renders `"BDT 800"` via `Intl.NumberFormat`; replace with the `` `৳${price.toLocaleString()}` `` convention every other price display in this codebase already uses.

Not re-detailed here — see that file directly for the exact diffs. Flagging it in this plan because it's the cheapest item on this whole list and sitting unbuilt; worth bundling into whichever pass picks up items A–D, since it touches none of the same files.

---

## F. Issues/Accessories status filter: drop "All", default to a real status — optional, needs a decision

### Goal (as built on `bikelog_app`)

`bikelog_app` spec 32 removed the "All" pill from both the Bike Issues status filter (3 pills → 2, default "Open") and the Bike Accessories **status** filter (4 pills → 3, default "Pending"; the separate Urgency filter was explicitly left untouched, still has its own "All").

### Why this one is flagged differently from A–D

This app's filters are `<Select>` dropdowns (`components/(main)/BikeIssue/BikeIssue.tsx:106-115`, `components/(main)/BikeAccessory/BikeAccessory.tsx:96-113` — confirmed via direct read), not tap-pills like the mobile app. Removing "All" from a pill row (mobile) and removing "All" from a dropdown (web) are not equivalent UX decisions — a pill row visually implies "pick one of these few," where dropdowns commonly default to "show everything" as the natural first state. The app's change was driven by that app's own pill-based layout; it isn't automatically the right call here just because it shipped there.

**Recommendation: ask the user before building this one.** If they want it, the change itself is small:
- `components/(main)/BikeIssue/BikeIssue.tsx`: `TStatusFilter` state defaults to `"open"` instead of `"all"`; drop the `<SelectItem value="all">All</SelectItem>` entry (line 115); `filterParam`'s `statusFilter !== "all"` conditional becomes unconditional (status is now always real).
- `components/(main)/BikeAccessory/BikeAccessory.tsx`: same shape for the **status** filter only (default `"pending"`); the urgency filter (`urgencyFilter`, its own separate `<Select>`) stays completely untouched, still defaulting to/offering "All" — matching the app's own explicit scope boundary.

### Dependencies

None — no backend change (both endpoints already support `?status=<value>` as a plain filter, confirmed by both spec 32's own Context section and this project's existing `filterParam` logic already exercising it for every non-"all" value).

---

## G. Fuel log date-before-purchase validation — informational only, no work needed

Backend spec 27 (✅ Complete, live) rejects a fuel log dated before the bike's `purchaseDate` with a `400` and a clear message. Per that spec's own Context section, it explicitly confirmed **both** frontends already forward the backend's error message verbatim via their existing toast/error-interceptor plumbing — `bikelog_client-web-/utils/axiosInstance.ts`'s `error?.response?.data?.message || "Something went wrong"` → `FuelLogFormModal.tsx`'s `toast.error(message ?? "Something went wrong!!", ...)` already handles this with zero code changes. Nothing to build. Noted here only so it isn't mistaken for an open gap when read against the backend's spec list.

## H. Fuel-log period-closure backdated-date bug — no client work

Backend spec 26 (✅ Complete, live) fixed a server-side bug where backdated fuel-log history produced a corrupted `MileageRecord` on period closure. Pure backend logic fix (query date-anchor math) — no client-visible contract change, no request/response shape change, nothing for this project to do.

## I. Weekly push notification — deferred, needs a scoping decision

`bikelog_server` spec 21 + `bikelog_app` spec 24 built a mobile push-notification pipeline (Expo push tokens, a weekly cron, deep-linking into the app) for weekly per-bike fuel-log summaries. This is not directly portable to a web client — there is no Expo push token on the web; the equivalent would be the **Web Push API** (browser-native push, requiring a service worker, VAPID keys, and a completely separate registration/subscription flow on both this client and `bikelog_server`, which currently only knows how to send to Expo's push service). This is materially more work than porting a UI screen and touches `bikelog_server` (a new notification channel, not just a new client consumer of an existing endpoint) — **not a good fit for this catch-up plan's scope**. Flagging as a distinct, larger future initiative if the user wants web push at all; not estimated further here.

## J. Postgres/Prisma migration — zero client work

Per root `CLAUDE.md`'s own explicit note: "`bikelog_client-web-` and `bikelog_app` need **zero changes** per the plan's analysis — this migration is server-only." Confirmed still true — none of specs 31–37 touch any response shape or endpoint contract this client depends on (the `_id` remap convention specifically exists to keep both clients unaware the migration ever happened). The only actionable item for this client is operational, not code: confirm `NEXT_PUBLIC_API_BASE_URL` actually points at a backend build that includes specs 26–38 (i.e., `postgressMigrate` or whatever it merges to) before testing any of sections A–D above, or they'll appear to not work against a stale pre-migration deployment.

## K. Error-log admin system — deferred, out of scope

Backend spec 24 added an admin-only `errorLog` module (`GET /api/admin/error-logs`, promotion to `admin` role is a direct-DB-write-only flow today, no endpoint). This project's `app/(admin)/` directory is reserved but empty — no admin spec exists yet on any client (confirmed via this project's own `progress-tracker.md` Current Phase section). Building an admin UI is a new, standalone initiative, not a "catch up with what the app already has" item (the app doesn't have an admin UI either). Not part of this plan; raise separately if wanted.

## L. Sync spend logs to expense tracker — zero client work

Backend spec 30 syncs spend logs to a separate `expenseTracker2` project, entirely server-to-server. No client-visible endpoint, no client work.

---

## Suggested order, if picked up together

1. **A** (bug fix, and unblocks safely testing **B** without a live crash risk)
2. **B** (small, mirrors an already-built and already-verified app change)
3. **E** (near-zero cost, unrelated files, easy to slot in anywhere)
4. **C** (slightly larger, self-contained)
5. **D** (self-contained, purely additive)
6. **F** — only after the user confirms they actually want the dropdown-default UX change

This is a plan, not a build order commitment — the user may pick any subset in any order.
