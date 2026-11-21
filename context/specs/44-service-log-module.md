# 44: Service log module — the web half (warranty + regular servicing)

Status: ✅ **Complete (code, 2026-11-19) — `yarn lint` clean (no new warnings), `yarn build` clean (TypeScript passes, `/bikes/[bikeId]/service` route generated). Browser pass owed.** All 5 open questions answered by the developer 2026-11-19 (see §Open questions, now resolved) and folded into the plan below; the parity port **is authorized**. No code written yet. Written 2026-11-19 from the root
`service-log-module-plan.md`, the backend companion `bikelog_server/context/specs/67-service-log-module.md`
(deployed + migrated 2026-11-19), the app half `bikelog_app/ai context/specs/73-service-log.md`
(built + live-API-verified 2026-11-19), and `bikelog_app/ai context/specs/73b-service-logs-migration-fix.md`.

**This is a parity port by explicit developer request — cascade step 3 _by choice_, like spec 34, not because a contract broke.** The plan file, server spec 67 §Web and app spec 73 §Web all settled that the web client does **not** log services and needs no change: the service routes are app-only and the one web-visible effect (a new Spending **"Service"** category) is additive and already renders. So building this screen on the web is a deliberate parity decision — and the developer **authorized it on 2026-11-19** (Open Question 5). This file is its build plan.

**The engine-oil web module (spec 33) is the structural template.** Everything here that says "mirror oil" means `components/(main)/EngineOilLog/` and `context/specs/33-engine-oil-log.md`: the route re-export, the status-card-over-list screen, the desktop-table / mobile-card-rows pattern (`FuelLog.tsx`), the `BaseModal + FormProvider + FormActionButtons` form, the receipt cell, the quick-fill, and the `["spending"]/["reminders"]` invalidation discipline. What is **genuinely new to the web client** and has no oil precedent is called out explicitly: the **warranty progress card** (§B), the **two row states** (scheduled vs completed), the **in-form line-item and recommendation sub-editors** (§D — the first `useFieldArray` in this repo), the **recommendation tick-to-complete** (§G), and the **schedule-the-next-service orchestration** (§F).

---

## §0 Prerequisite — already satisfied (the one thing spec 33 was blocked on, this one is not)

Spec 33 could not ship until `bikelog_server` spec 54 was deployed and its import run. **This module's backend (spec 67) is already deployed AND migrated** (verified live 2026-11-19 — the `service_logs` table exists, `/service-logs` and `/status` answer `401` anonymously and real data round-trips; see app spec 73's "Live-API verification" and 73b). So:

- **There is no 404 deploy gate.** The endpoints are live now. A web deploy can land any time.
- **The Spending "Service" category is already live** on the web Spending screen (the server sums completed-service item costs into it). The only thing missing today is the type-union entry (§E item 2) — cosmetic, nothing switches on it.
- **No deploy-order constraint in either direction** — everything is additive.

The remaining risk is not ordering but **naming**: see H-W-SVC-1 (the bottom-nav "Service" tab already points at maintenance).

---

## Implementation log (2026-11-19)

Built mirroring the engine-oil web module (spec 33). Static floor: `yarn lint` clean (only the
pre-existing `useReactTable`/`TableToolbar` warnings CLAUDE.md records), `yarn build` clean
(TypeScript passes, 18 routes incl. the new `/bikes/[bikeId]/service`).

- ✅ **1. `type/service-log.types.ts`** — §C shapes + an `itemsTotal` guard helper.
- ✅ **2. `schema/service-log.schema.ts`** — zod with a `superRefine` for the cross-field rules (at least one date; completed ⇒ serviceDate + odometer; warranty # 1–5; item/recommendation bounds).
- ✅ **3. `ServiceStatusCard.tsx`** — warranty card, all 5 states (H-W-SVC-8), date-only formatting, no client arithmetic on the figures (H-W-SVC-2).
- ✅ **4. `ServiceReceiptCell.tsx`** — port of `EngineOilReceiptCell`, URL swapped (D7).
- ✅ **5. `ServiceRowActions.tsx`** — inline icons (matching oil): Details (eye, completed) / Mark-completed (check, upcoming) / Edit / Delete.
- ✅ **6. `serviceLogColumns.tsx`** — Date / Kind / Centre / Status / Cost / Receipt / actions; upcoming vs completed row shapes.
- ✅ **7. `ServiceDetailModal.tsx`** — items + subtotal + notes + the §G recommendation checklist (tick-to-complete, full-array PATCH, ids preserved, reads the live row by `_id`).
- ✅ **8. `ServiceLogFormModal.tsx`** — RHF + zod, the two `useFieldArray` sub-editors (first in the repo — D5), the completed-switch gating, the warranty-# advanced disclosure, and the §F schedule-next orchestration.
- ✅ **9. `ServiceLog.tsx`** + `app/(main)/bikes/[bikeId]/service/page.tsx` — the screen (status card + desktop table + mobile cards + pager + quick-fill) and its route shim.
- ✅ **10. §E edits** — hub tile `ShieldCheck` (`BikeDetailPage.tsx`), `TSpendingRecordSource += "service"`, and the AppShell nav **option (a)**: Maintenance tab renamed `short: "Maint."`, new `service` tab added, `mobileBikeTabKeys` swapped `maintenance` → `service` (four primary mobile tabs kept; Maintenance → More overflow, still in the desktop sidebar).

No errors or blockers hit during the build (the backend was already live + migrated from spec 73/73b, so no 404 gate and no migration to run).

---

## §0 Hazards — read before writing code

**H-W-SVC-1 — "Service" is already a bottom-nav label, pointing at the MAINTENANCE route. Resolved: option (a) — the Maintenance tab is renamed, and the new module takes the "Service" tab.**
`components/layout/AppShell.tsx:70-72` defines the in-bike bottom tab `{ segment: "maintenance-logs", short: "Service", … }` — the tab a rider taps as "Service" today opens Maintenance. The developer chose **option (a)** (2026-11-19): rename that tab's `short` from `"Service"` to **`"Maint."`** (keep its `segment: "maintenance-logs"`) and add a **new** bottom tab `{ segment: "service", short: "Service", … }` pointing at the new module, so "Service" now means the service screen and Maintenance is unambiguously its own tab. Do both edits together — renaming the label without adding the route, or vice-versa, leaves one tab misnamed. Check the in-bike tab count still fits the mobile bar at 390px (it currently shows Overview/Fuel/Service/Spend/More — adding one may push an item into `More`; verify and, if so, demote the least-used, see §E item 3).

**H-W-SVC-2 — Do not compute warranty progress or the next-due date in the browser. `/status` computes all of it.**
Spec 33 H-W3 / app spec 73 H-B: two sources of truth for one figure disagree on the same screen and the user is the one who finds out. `GET /service-logs/status` returns `warrantyCompleted`, `warrantyLogged`, `warrantyVoidRisk`, `nextWarranty` and `nextService` ready to render. Render them. Do **not** re-derive "3 of 5" by counting the paginated list (it is paged — H-W-SVC-5) and **never** trust a client count of `warrantyNumber`, which is **server-assigned**.

**H-W-SVC-3 — `status` is server-derived from `serviceDate` presence. Never send `status`; decide "completed" from whether a `serviceDate` exists.**
Server §67 derives it: a row with a `serviceDate` is `completed`, one with only a `dueDate` is `upcoming`. The web client reads "is this done?" purely from `serviceDate != null` (row rendering) and writes it purely by sending/omitting `serviceDate` (the complete flow). `status` and the auto-assigned `warrantyNumber` go in H-W-SVC-9's never-send list.

**H-W-SVC-4 — Toggling one recommendation re-submits the WHOLE `recommendations` array, every existing `id` preserved.**
There is no per-recommendation endpoint. Ticking one (§G) is a `PATCH /:id` sending the entire array back with that entry's `done` flipped. Drop the other entries → they are deleted; drop an entry's `id` → the server mints a new one (§67: "IDs via `generateObjectId()`, incl. each sub-entry missing one"), which **changes the reminder `_id`** and churns identity. Read → map (flip the one `done`, keep every `id`) → send the full array. Same discipline for line items when editing. (This was live-verified on the app half 2026-11-19: id preservation confirmed over HTTP.)

**H-W-SVC-5 — Read warranty status from `/status`, never from the paginated list.**
The list keys on `page`; `result[0]` on page 2 is a months-old visit. `/status` is a separate endpoint and a separate query key. Spec 33 H-W5, same trap.

**H-W-SVC-6 — Both service dates are date-only. Strip the time before formatting, or they shift a day in Dhaka.**
`dueDate` and `serviceDate` are `DateTime?` columns the rider picked as calendar days; they serialize as UTC-midnight ISO instants. `new Date(s)` + `format()` reads **local** time and shifts back a day between 00:00–06:00 Dhaka. Mirror whatever the fuel-log/maintenance web screens already do for date-only fields (parse `s.split("T")[0]` as a local calendar date, like the app's `formatApiDate`). The `/status` `nextWarranty.dueDate` / `nextService.dueDate` are the same stored date-only values — format them the same way. Note the contrast with spec 33's oil `projectedDueDate`, which was a true instant; here there is no computed instant.

**H-W-SVC-7 — Line-item and recommendation costs are plain JSON numbers, not `Decimal`. Guard and round in the browser.**
`items[].cost` and `recommendations[].targetOdometer` live in the row JSON. Bound them in the zod schema (`step="0.01"`, non-negative, sane max) and `Number()`-guard every cost on read before summing or printing — the server rounds to 2dp, but a stray `null`/string would render `৳NaN`. `step="0.01"` on every numeric input or the browser blocks submit before zod runs (spec 33 H-W1).

**H-W-SVC-8 — The warranty card has FIVE states (one more than oil's four). None may render `NaN`, `Invalid Date` or an empty panel.**
(1) no services at all → **no card** (`StateCard` in the list carries the add button); (2) warranty in progress, none overdue → "X of 5 · next ~ 20 Dec"; (3) an upcoming warranty service past its `dueDate` → **void-risk** (`warrantyVoidRisk: true`, destructive tone); (4) all 5 warranty services done → a resting "Warranty complete" state, next **regular** service shown if any; (5) warranty untouched but regular services logged → regular-only resting state from `nextService`. The server **omits** fields it cannot compute (never null) — declare them optional and guard `!= null` regardless. §B fixes the copy for all five; it is a direct port of the app's `ServiceStatusCard.tsx`, which is already built and live-verified.

**H-W-SVC-9 — Server-derived fields never go in a mutation payload.**
`architecture.md` Invariant 3. `status`, the auto-assigned `warrantyNumber`, and each sub-entry's server-minted `id` on a _new_ entry are read-only outputs. The form submits exactly: `serviceKind`, `warrantyNumber?` (only if the rider overrode it — D6), `dueDate?`, `serviceDate?`, `odometerReading?`, `serviceCenter?`, `centerType?`, `items`, `recommendations`, `notes`. At least one of `dueDate`/`serviceDate` is required (server validation) — enforce it in the schema so the two refuse the same thing.

**H-W-SVC-10 — A service is created `upcoming` OR `completed`, and the form must make that one choice unambiguous.**
A `serviceDate` present ⇒ completed ⇒ its `items` sum into Spending and fire the expense push; an upcoming service with only a `dueDate` contributes nothing. The "Mark as completed" checkbox is what reveals the `serviceDate` + odometer + items fields; left unchecked, the service is a scheduled placeholder (H-W-SVC-3).

**H-W-SVC-11 — `bumpOdometerIfHigher` runs server-side on a completed service with an odometer, so invalidate `["bikes", bikeId]`.**
Completing a service whose reading exceeds `currentOdometer` raises the bike's odometer (server §67). The hub odometer and every km-derived figure lag until `["bikes", bikeId]` is invalidated. It is in §C's invalidation set for the same reason oil's was.

**H-W-SVC-12 — Do not render `RemindersBanner` on the Service screen.**
Server §67 emits the warranty-service and recommendation reminders in the existing reminder shape; they already render on the hub (`BikeDetailPage`) and Maintenance. The warranty status card is this screen's alert surface. Putting the banner here too shows the same overdue warranty service twice. Spec 33 H-W (D6), same rule.

---

## §A Decisions

- **D1 — Route `/bikes/[bikeId]/service`, components in `components/(main)/ServiceLog/`.** Two-line `page.tsx` re-export (`engine-oil/page.tsx` is the template). Folder matches the server module (`serviceLog`), segment matches the server path (`/service-logs`) and the app route.
- **D2 — Warranty status card on top, service list below, one screen.** Mirrors the oil screen (D2 there): the card is the reason to open this screen, the list is the evidence.
- **D3 — Desktop table + mobile card rows, `FuelLog.tsx`/`EngineOilLog.tsx` pattern.** Same `GenericTableComponent`, `TableActionMenu`, 10-per-page pagination, `ImageUploadThumb` receipt cell. The table carries **both** row states (a `Status` column distinguishes scheduled from completed).
- **D4 — One form modal for create, edit and complete**, on `EngineOilLogFormModal`'s skeleton: `BaseModal` + `FormProvider` + `FormActionButtons`, `zod` + `zodResolver`, `toast` off `result.success` / `error.message`. The two sub-editors (§D) live inside it.
- **D5 — Line items and recommendations are `useFieldArray` sub-editors inside the modal. Confirmed (Open Question 4, 2026-11-19).** **This is the first `useFieldArray` in the repo** (grep confirms none today); the developer approved adopting it. It is the idiomatic RHF way to do a dynamic add/remove row list and keeps everything under one `FormProvider` and one submit. Each row's `id` from the loaded log is carried as a hidden field-array field so it survives the round-trip (H-W-SVC-4) — `useFieldArray`'s own synthetic `id` is NOT the server id; keep the server `id` as a real field on the row object.
- **D6 — Warranty number: auto by default, override behind a disclosure.** Server auto-assigns `count(warranty rows)+1` when `serviceKind === "warranty"` and `warrantyNumber` is omitted. The form omits it by default; an optional "Warranty # (1–5)" input appears only when the rider expands an "Advanced" row — for a warranty service logged out of order. Sent only if set (H-W-SVC-9).
- **D7 — The receipt is uploaded from the row, not the form** — a `ServiceReceiptCell` that is `EngineOilReceiptCell.tsx` with the URL changed to `/bikes/:id/service-logs/:logId/image` (`usePut`/`useDelete`). Keeps create a single request. Rendered only on a **completed** row (an upcoming service has no receipt yet).
- **D8 — Spending and reminders are NOT touched, beyond one type.** The "Service" category flows through the existing breakdown/chart/PDF automatically (already live); only `TSpendingRecordSource` gains `"service"` (§E). `RemindersBanner` renders the warranty/recommendation reminders with no change.
- **D9 — A hub tile, after Maintenance.** `{ href: "service", label: "Service", icon: ShieldCheck }` (`ShieldCheck` from `lucide-react`, the warranty framing). Placed after `maintenance-logs` in `BikeDetailPage.tsx`'s `tiles`.
- **D10 — No hub stat strip addition.** Oil's "On this oil" is a continuous number; warranty progress is discrete ("3 of 5") and changes a few times a year. It lives on the reminder banner and the tile, not the stat strip. (App spec 73 D14, same call.)
- **D11 — Items/recommendations detail: a dedicated `ServiceDetailModal` (Open Question 2, 2026-11-19 — "a detailed modal").** A flat table cell cannot hold a line-item list and a recommendation checklist, and the developer chose a **detail modal** over a react-table expandable sub-row (the repo has no row-expansion mechanism, so the modal is also the lower-risk path). A completed row opens `ServiceDetailModal.tsx` — by clicking the row **and** via a `Details` entry in the `TableActionMenu` (⋮). The modal shows the odometer, the line items with their costs and subtotal, the **recommendation checklist with tick-to-complete (§G)**, and the notes. **One modal, both breakpoints** — desktop table rows and mobile cards both open it, so the §G toggle has a single implementation (this differs from the app, which renders the block inline on the card — see §B mobile note). An upcoming row has no detail to show, so it does not open the modal; its only action is Mark completed.
- **D12 — §F (schedule-next) and §H (quick-fill) ship with this spec. Confirmed "same as app" (Open Question 3, 2026-11-19).** The app built both; the web port builds both too. Each is self-contained, so either could still be pulled if a problem surfaces mid-build, but the default is to ship them.

---

## §B The screen

**New files in `components/(main)/ServiceLog/`:** `ServiceLog.tsx` (screen), `ServiceStatusCard.tsx` (warranty card), `serviceLogColumns.tsx` (table), `ServiceLogFormModal.tsx` (create/edit/complete + sub-editors + §F), `ServiceDetailModal.tsx` (items/recommendations/§G toggle — D11/OQ2), `ServiceReceiptCell.tsx` (D7), `schema/service-log.schema.ts` (zod), `type/service-log.types.ts`. Plus the route re-export `app/(main)/bikes/[bikeId]/service/page.tsx` and the §E edits. (Eight module files — one more than oil's seven, for the detail modal.)

```
Service                         [ Same as last ] [ + Add service ]
Dashboard / Hornet / Service · 4 services

┌──────────────────────────────────────────────────────────────┐
│  Warranty service                              [ 2 of 5 ]     │
│  Next service #3 ~ 20 Dec · in 31 days · official centre      │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░                                         │
│  3 services left to keep the warranty                        │
└──────────────────────────────────────────────────────────────┘

  Date / Status        Kind          Centre          Status      Cost    Receipt
  Scheduled ~ 20 Dec   Warranty #3   Honda official  [Upcoming]  —       —        ⋮
  05 Nov 26            Regular       City Bike Care   [Done]      ৳150    [img]    ⋮
  15 Oct 26            Warranty #2   Honda official   [Done]      ৳550    [img]    ⋮   ← click row → detail modal
  12 Aug 26            Warranty #1   Honda official   [Done]      Free    [ + ]    ⋮

   clicking a completed row (or ⋮ → Details) opens ServiceDetailModal:
   ┌─────────────────────────────────────────┐
   │  Warranty #2 · 15 Oct 26 · official      │
   │  Odometer 2,500 km                       │
   │  Line items                     ৳550     │
   │    • Carbon cleaner             ৳300     │
   │    • Engine oil top-up          ৳250     │
   │  Recommendations                         │
   │    ☐ Change air filter next ~ 20 Dec     │
   │    ☐ Check chain tension                 │
   │  Notes: —                                │
   └─────────────────────────────────────────┘
```

### The warranty status card — `ServiceStatusCard.tsx` (new; port the app's, already live-verified)

A card carrying a `StatusTag` (`success` for in-progress, `destructive` for void-risk, default for the resting states). Fed only by `useFetchData<TServiceStatus>(["serviceStatus", bikeId], …)` (H-W-SVC-5). Five states (H-W-SVC-8) — identical copy to the app's `ServiceStatusCard.tsx`:

| State                                                                          | Card                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| no services (`warrantyLogged === 0`, `nextWarranty`/`nextService` both absent) | **no card** — the list's `StateCard` carries it                                                                                                                                                                       |
| warranty in progress, none overdue                                             | tag `{warrantyCompleted} of 5`; headline `Next service #{nextWarranty.number} ~ {date}`; sub `in {n} days`; progress bar `warrantyCompleted / 5`; footer `{5 - warrantyCompleted} services left to keep the warranty` |
| **void risk** (`warrantyVoidRisk === true`)                                    | tag `Overdue` destructive; headline `Warranty service #{n} is overdue`; sub `{abs(daysPast)} days past the due date`; footer (destructive) `Book it now — missing a service voids the warranty`                       |
| all 5 warranty done                                                            | tag `Warranty complete`; `nextService` → `Next service ~ {date}`, no X-of-5 pressure/bar/footer; else resting line `All 5 warranty services done`                                                                     |
| warranty untouched, regular only                                               | regular-only resting state: headline from `nextService`, no warranty framing                                                                                                                                          |

Copy rules carried from the app/oil: the `~` before a projected date is **load-bearing** (the due date is the centre's estimate, not a promise); **never a named weekday** (Dhaka weekend is Fri–Sat). Progress bar: two nested divs / a Tailwind track, clamped, not a library component. No client arithmetic on the counts or dates (H-W-SVC-2) — the only browser-side work is date formatting (H-W-SVC-6), a date-only day count for the "in N days" line, and the `5 - warrantyCompleted` display subtraction.

### The list — `serviceLogColumns.tsx` + `ServiceLog.tsx`

Desktop table columns: **Date**, **Kind** (`Warranty #n` / `Regular` via `StatusTag`), **Centre** (+ `official`/`local` tag), **Status** (`[Upcoming]`/`[Overdue]`/`[Done]`), **Cost** (`formatTaka(itemsTotal)`, or `Free` when completed with no items, or `—` when upcoming), **Receipt** (`ServiceReceiptCell`, completed rows only), **⋮** (`TableActionMenu`: **Details** (completed rows only — opens `ServiceDetailModal`), Edit, Delete, and **Mark completed** on an upcoming row).

- **Upcoming row** (`serviceDate == null`): Date column shows `Scheduled ~ {dueDate}`, a `[Upcoming]` / `[Overdue]` status tag (derive overdue from `dueDate` vs today — a date-only diff, allowed; contrast H-W-SVC-2 which is about warranty figures), no cost/receipt, and a **Mark completed** action opening the form modal in complete-mode. An upcoming row is not clickable-to-detail (nothing to show).
- **Completed row** (`serviceDate` set): clicking the row (or ⋮ → Details) opens **`ServiceDetailModal`** (D11) with the odometer, the item list + subtotal, the recommendation checklist (§G) and the notes. The receipt stays its own table cell (D7).

Mobile (≤ lg): card rows from `FuelLog.tsx`'s pattern — the completed card shows date + kind tag, cost, odometer + centre and a **tap-to-open** affordance (opens the same `ServiceDetailModal`, which is where the items + recommendation checklist live on every breakpoint — D11, one toggle implementation); the upcoming card shows the scheduled date, kind, centre, a status line and a Mark-completed button. Checked at 390px, no horizontal scroll.

---

## §C Data layer

`components/(main)/ServiceLog/type/service-log.types.ts` — mirror the server's `toApiShape`:

```ts
export interface TServiceItem {
  id?: string;
  name: string;
  cost?: number | null;
}
export interface TServiceRecommendation {
  id?: string;
  text: string;
  targetDate?: string | null;
  targetOdometer?: number | null;
  done: boolean;
}
export interface TServiceLog {
  _id: string;
  bike: string;
  serviceKind: "warranty" | "regular";
  warrantyNumber?: number | null;
  status: "upcoming" | "completed"; // READ-ONLY, server-derived (H-W-SVC-3)
  dueDate?: string | null;
  serviceDate?: string | null; // date-only (H-W-SVC-6)
  odometerReading?: number | null;
  serviceCenter?: string | null;
  centerType?: "official" | "local" | null;
  items?: TServiceItem[] | null;
  recommendations?: TServiceRecommendation[] | null;
  notes?: string | null;
  serviceImage?: TCloudinaryImage; // receipt { url, publicId }
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface TServiceStatus {
  warrantyTotal: 5;
  warrantyCompleted: number;
  warrantyLogged: number;
  warrantyVoidRisk: boolean;
  // omitted (never null) when absent — guard `!= null`
  nextWarranty?: {
    number: number | null;
    dueDate: string;
    status: "upcoming" | "overdue";
  } | null;
  nextService?: { dueDate: string; status: "upcoming" | "overdue" } | null;
}
```

| Query               | Key                                 | URL                                                                                          |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| list                | `["serviceLogs", bikeId, page]`     | `/bikes/:id/service-logs?page=&limit=10&sort=-serviceDate`                                   |
| status              | `["serviceStatus", bikeId]`         | `/bikes/:id/service-logs/status`                                                             |
| latest (quick-fill) | `["serviceLogs", bikeId, "latest"]` | `/bikes/:id/service-logs?limit=1&sort=-serviceDate` — §H; separate from the list (H-W-SVC-5) |

`["serviceLogs", bikeId]` is a prefix of both, so one invalidation refreshes both. Invalidation set for every create / edit / complete / delete / image / recommendation-toggle mutation:

```ts
[
  ["serviceLogs", bikeId],
  ["serviceStatus", bikeId],
  ["bikes", bikeId], // odometer bump (H-W-SVC-11)
  ["spending", bikeId],
  ["reminders", bikeId],
]; // §67 sources both from the new table
```

> **NB — `sort=-serviceDate` puts upcoming rows first** (Postgres `NULLS FIRST` on `DESC`), confirmed against the live API. That is acceptable UX (the next action on top) but note it when reading the table order; do not "fix" it to hide scheduled rows.

---

## §D The form modal — `ServiceLogFormModal.tsx`

`EngineOilLogFormModal`'s skeleton + `MaintenanceLogFormModal`'s catalog handling. Fields, in order:

| Field               | Control                                                   | Notes                                                                                         |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Service kind        | `ControlledSelectField`                                   | `regular` / `warranty`, default `regular`                                                     |
| Warranty # (1–5)    | `ControlledInput` number, behind an "Advanced" disclosure | only when kind = warranty; optional override (D6)                                             |
| Due date            | `ControlledDateSelect`                                    | the centre's estimate; **no** future-date rejection here (a due date is in the future)        |
| Mark as completed   | `ControlledCheckbox`                                      | the pivot (H-W-SVC-10) — reveals the service-date group when on                               |
| Service date        | `ControlledDateSelect`                                    | only when completed; actual visit, future dates rejected                                      |
| Odometer (km)       | `ControlledInput` number `step="0.01"`                    | only when completed                                                                           |
| Service centre      | `ControlledInput`                                         | optional, max 100                                                                             |
| Centre type         | `ControlledSelectField`                                   | `official` / `local`, optional                                                                |
| **Line items**      | `useFieldArray` sub-editor                                | only when completed; add/remove `{ name, cost }` rows + a running subtotal                    |
| **Recommendations** | `useFieldArray` sub-editor                                | add/remove `{ text, targetDate? }` rows; `done` is NOT edited here (toggled from the row, §G) |
| Notes               | `ControlledTextArea`                                      | optional, max 500, 3 rows                                                                     |
| Next service due    | `ControlledDateSelect`, complete-mode only                | §F — scheduling the next visit while closing this one                                         |

`schema/service-log.schema.ts` follows `engine-oil-log.schema.ts`: every numeric field is a `z.string()` with `.refine()` bounds (inputs hand back strings; the payload does `Number()` at submit). A schema-level `.refine` enforces **at least one of `dueDate`/`serviceDate`** (H-W-SVC-9) and **a service date + odometer when completed**. Bounds mirror the server: warranty # 1–5; item cost ≥ 0 and ≤ 1,000,000; odometer ≤ 999,999; name required per item; text required per recommendation.

Submit builds the payload (H-W-SVC-9): `serviceKind` always; `warrantyNumber` only if kind = warranty and the rider typed one; `dueDate` when set; `serviceDate`/`odometerReading` only when completed; `items` filtered to rows with a name, **with `id` on edit**; `recommendations` the **full array always with `id`** (H-W-SVC-4); strings `|| undefined`. Nothing from the never-send list.

---

## §E The small edits elsewhere

1. **`BikeDetailPage.tsx` `tiles`** — one entry `{ href: "service", label: "Service", icon: ShieldCheck }` after `maintenance-logs` (D9). The grid reflows.
2. **`Spending/type/spending.types.ts:38`** — `TSpendingRecordSource` gains `"service"` (D8). Type hygiene; nothing switches on it. (The server already emits `source: "service"` records — verified live 2026-11-19.)
3. **`components/layout/AppShell.tsx` bottom nav — option (a), H-W-SVC-1.** Two edits together: (i) rename the existing `{ segment: "maintenance-logs", short: "Service" }` tab's `short` to **`"Maint."`** (segment unchanged); (ii) add a new in-bike tab `{ segment: "service", short: "Service", label: "Service", icon: ShieldCheck }` so the "Service" tab opens the new module. The in-bike bar shows Overview/Fuel/**Maint.**/**Service**/Spend/More after this — confirm it still fits at 390px; if the row is too tight, demote the least-used primary tab (likely Spend or Maint.) into the `More` overflow rather than dropping Service, which is the point of this spec. Also matches the desktop sidebar bike sub-nav if it enumerates the same segments.

`RemindersBanner.tsx` and all of `Spending/*` stay **untouched** — the Service category and its records already arrive from the server and render through the existing breakdown.

---

## §F Schedule the next service on completion (D12 — droppable)

Port of app spec 73 §F. In complete-mode, an optional "Next service due" date at the bottom. On a successful complete-save, if set, fire a **second** `usePost` creating an `upcoming` row: `{ dueDate, serviceKind: (savedWarrantyNo != null && savedWarrantyNo < 5 ? "warranty" : "regular"), serviceCenter, centerType }` — carry the centre, never items/recommendations. Infer the kind from the **saved** row's `warrantyNumber` (the create response returns it — confirmed live). Non-fatal: a failure of the second write leaves the completion saved and toasts "Service saved, but couldn't schedule the next one"; never roll back.

---

## §G Recommendation tick-to-complete (D11 / H-W-SVC-4)

Inside **`ServiceDetailModal`** (the detail modal a completed service opens — D11), each recommendation is a checkbox + its text (+ ` ~ {targetDate}` when set, struck through when `done`). Tapping it: read the row's `recommendations`, map it flipping the one entry's `done` (preserve every other entry and every `id`), `PATCH /:id` with `{ recommendations: <full mapped array> }` and nothing else, then invalidate the §C set — `["reminders", bikeId]` matters, because a pending recommendation with a `targetDate` is a live reminder and ticking it must drop the banner line. Disable the checkbox while its mutation is in flight so a double-tap can't send two conflicting arrays. The open modal must reflect the toggle without closing: have it read the recommendations from the **live list row looked up by `_id`** (not a snapshot captured on open), so the §C invalidation of `["serviceLogs", bikeId]` re-renders the checklist in place. (The app half verified id-preservation over HTTP 2026-11-19.)

---

## §H "Same as last" quick-fill (D12 — droppable)

A secondary button beside **Add service**, opening the same modal with the repeatable fields filled: **copied** = service centre, centre type, service kind; **never copied** = odometer, either date, the previous visit's items/recommendations. Source: the dedicated `["serviceLogs", bikeId, "latest"]` query, not the paginated list (H-W-SVC-5). Hidden when there is no previous service. Lower value than oil's (most services differ) — the first to drop on review.

---

## Open questions — resolved by the developer 2026-11-19

1. **The "Service" bottom-nav collision (H-W-SVC-1).** → **Option (a).** Rename the Maintenance tab's `short` to `"Maint."` and give the new module the "Service" tab. Folded into H-W-SVC-1, D9 and §E item 3.
2. **How to show line items + recommendations (D11).** → **A detail modal** (`ServiceDetailModal`), not a react-table expandable sub-row. A completed row opens it (row click or ⋮ → Details); it is the single home of the §G recommendation checklist on both breakpoints. Folded into D11, §B (New files), §G.
3. **Build §F (schedule-next) and §H (quick-fill)?** → **Same as app — build both.** Folded into D12, §F, §H.
4. **Adopt `useFieldArray` (D5)?** → **Yes.** First use in the repo; the sub-editors are its natural use. Folded into D5, §D.
5. **Is this parity port authorized?** → **Yes, authorized.** Status moved from ⬜ proposal to 🟢 approved-ready-to-build. The port is a deliberate, approved cascade-step-3-by-choice.

Nothing is now blocking the build. One check to make **during** implementation, not a blocker: whether the 390px bottom bar fits six primary tabs after §E item 3 (demote into `More` if not).

---

## Test plan (when authorized + built)

Against the **live** API (already deployed + migrated). `yarn lint` clean, `yarn build` clean, 390px pass.

| #   | Check                                                                 | Expect                                                                                                                                      |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Open `/bikes/:id/service`                                             | existing services listed newest-first; scheduled and completed rows render distinctly                                                       |
| V2  | Warranty card vs the list by hand                                     | `X of 5` matches completed warranty rows; `next #N ~ date` matches the earliest upcoming warranty row — no client re-derivation (H-W-SVC-2) |
| V3  | Add a scheduled service (kind warranty, due date, Mark-completed off) | an upcoming row, no cost, excluded from Spending; the card's "next #N" updates                                                              |
| V4  | Mark it completed (service date ≠ due date, odometer, one item ৳300)  | row flips to completed; Spending gains ৳300 "Service"; warranty count +1; odometer bumped if higher (H-W-SVC-11)                            |
| V5  | Create an already-completed service in one shot                       | one request, completed row, item sum in Spending, expense push once                                                                         |
| V6  | Warranty auto-numbering + override                                    | second warranty with no number → server assigns the next; Advanced override 1–5 honoured                                                    |
| V7  | Void risk (let an upcoming warranty due date pass)                    | destructive tag + "voids the warranty" footer, driven by `warrantyVoidRisk` not a client compare                                            |
| V8  | All 5 warranty done                                                   | "warranty complete" resting state, no X-of-5 pressure; `nextService` shown if present                                                       |
| V9  | Line-item sub-editor                                                  | add three, remove the middle, subtotal updates; save; reopen → all return **with ids**; edit one, the others unchanged (H-W-SVC-4)          |
| V10 | Recommendation sub-editor + detail-modal toggle                       | add one with a date (form modal); open the completed row's **detail modal**, tick it → strikes through in place without closing, the hub reminder drops, reopening shows `done: true`; others untouched (§G/D11)      |
| V11 | Free service                                                          | complete with zero items → `Free`, Spending unchanged, no push                                                                              |
| V12 | Dates differ (due 15 Feb, went 17 Feb)                                | both render on their correct day, no tz slip (H-W-SVC-6)                                                                                    |
| V13 | Receipt upload/delete on a completed row                              | thumb appears/clears, list refetches; absent on an upcoming row                                                                             |
| V14 | Delete a completed service                                            | Spending drops by its item sum, warranty count + reminder recalc, odometer unchanged                                                        |
| V15 | Ownership                                                             | another user's `bikeId` → 404, surfaced cleanly                                                                                             |
| V16 | Pager                                                                 | the warranty card does not move (H-W-SVC-5)                                                                                                 |
| V17 | Validation parity                                                     | neither date → blocked; warranty # 6 → blocked; blank item name → blocked; `408.855` cost → blocked                                         |
| V18 | 390px                                                                 | card rows (tap-to-open), the **detail modal**, the form modal with both sub-editors, two date pickers — no horizontal scroll; the six-tab bottom bar fits or demotes cleanly to `More` (§E item 3)                          |
| V19 | Session gate                                                          | clear `accessToken`, go straight to `/bikes/:id/service` → `/login`                                                                         |
| V20 | Bottom nav after OQ1                                                  | the "Service" collision is resolved as decided; both Maintenance and Service are reachable and labelled unambiguously                       |
