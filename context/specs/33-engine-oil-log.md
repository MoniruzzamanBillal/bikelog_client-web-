# 33: Engine oil log — its own screen, with the next-change date on it

Status: ✅ **Implemented 2026-10-18.** `yarn lint` clean (0 errors), `yarn build` clean (18 routes). Verified in a real browser at 390px and 1440px against **stubbed** responses shaped exactly like the server module — 71 assertions, 0 failures: all four card states, the ৳/km column including the newest row's `—`, the three interval-seeding rules, the quick-fill's copied/not-copied fields, §F's three removals, and the session gate. **The real-API pass has since been run** (2026-10-18, after `bikelog_server` spec 54's import moved 8 oil changes out of `maintenance_logs`): logged in as a real account, 20 assertions at 1440px and 390px, 0 failures — the list, the imported rows' ৳/km and receipt photo, the no-rate status card, and maintenance no longer listing any oil log. Not covered by it: V3, V9, V10, V11 and V15 (that account has one page of changes and its oil is not near due). **The deploy gate still stands.** Historically this read: blocked by this spec's own prerequisite: `bikelog_server` spec 54 is implemented and committed but its migration is not applied, it is not deployed, and the import has not run. V1–V3, V10–V11, V14–V15 and V18's refresh half need that first. Written 2026-10-18, revised the same day after the developer answered its three open questions.

Their answers, folded in below and recorded in full at the end of this file: **(1) no — remove engine oil from the maintenance screen entirely**, **(2) yes — put “km on this oil” in the bike hub's stat strip**, **(3) yes — build both oil-only extras**, the per-change cost-per-km and the “same as last change” quick-fill. D8–D10 and §F are new because of them.

Client half of `bikelog_server` spec 54. Requested by the developer (2026-10-18) together with the server half: engine oil moves out of maintenance into a module of its own, the old entries are carried across, and the screen answers the question the trip-B meter answers today — _how far have I run on this oil, and when is the next change due._

**Hard prerequisite: `bikelog_server` spec 54 must be deployed *and* its import run (`--apply` + `--finalize`) before this ships.** Every endpoint below is new, so a web deploy that lands first gives a page of 404s; and shipping between the import's two steps shows every historical oil change twice in Spending (server spec 54 H3). This is the reverse of spec 32's ordering, and for the opposite reason — there is no old client behaviour to protect here, only new endpoints that must exist.

Scope: one new route group, one new component folder, one new type file, three small edits to existing files (hub tiles, the Settings odometer card's invalidation keys, the spending source union). No new dependency — `date-fns`, `sonner`, react-query, RHF + zod and the whole `components/shared/*` library already cover it.

---

## §0 Hazards — read before writing code

**H-W1 — `step="0.01"` on every numeric input, or the browser blocks the submit before zod ever runs.**
Spec 19: `ControlledInput` forwards `step` to the native `<input>`, and `type="number"` with no `step` defaults to whole numbers only. None of this app's modal `<form>`s set `noValidate`, so native validation rejects `408.8` with a browser tooltip and the zod schema never sees it. Four fields here are decimal in practice — odometer, interval, quantity, cost. All four need `step="0.01"`.

**H-W2 — `ControlledCheckbox` only works inside a `<FormProvider>`.**
Spec 30a: it calls `useFormContext()`, which returns `null` outside a provider and throws on destructuring. Fine in the oil-log modal (an RHF form). **Not** fine anywhere on the status card or in a plain-`useState` panel — if a checkbox is ever wanted there, use `components/ui/checkbox.tsx` directly, exactly as 30a resolved it for `MaintenanceTypeSection`.

**H-W3 — Do not compute the projected date in the browser. The server already computes it.**
`bikelog_app` spec 53 H-E bans a client from deriving a number the server also derives: two sources of truth for one figure disagree on the same screen, and the disagreement is invisible until a user reports it. Note the contrast with `bikelog_app` spec 55's tank forecast, where client-side arithmetic *is* allowed — there the server computes no forecast at all. Here `GET /engine-oil-logs/status` returns `projectedDueDate`, `projectedDaysRemaining` and `kmPerDay` ready to render. Render them. No `date-fns` arithmetic, no km/day of our own.

**H-W4 — The Settings odometer card must invalidate the oil status, or the developer's main request looks broken.**
`OdometerSection.tsx:19-22` invalidates `["bikes"]` and `["reminders"]` only. Update the odometer and the oil card would keep showing yesterday's "km on this oil" until a hard refresh — which is precisely the behaviour this feature was asked for. Add `["engineOilStatus"]` there (prefix key, no `bikeId` — matching the two keys already in that list).

**H-W5 — Read the status from its own query, never from the paginated list.**
The list query keys on `page`, so on page 2 `data.result` is months-old logs; deriving "your last change" from it makes the card change as the rider pages through history (`bikelog_app` spec 55 H-D, one screen over). `GET /status` is a separate endpoint and a separate query key for exactly this reason.

**H-W6 — The interval field is seeded from the catalog and then belongs to the rider. Re-seed on a type change, never over a typed value, and never from the catalog in edit mode.**
Confirmed by the developer 2026-10-18: the interval they set on the oil type in Settings is what should appear in this input, already filled in, and editable from there. Three distinct rules come out of that, and the second and third are the ones that get missed:

1. **Create, type picked or changed** → set `intervalKmUsed` to that type's `suggestedIntervalKm`. There is always one: the catalog makes it required and positive (`engineOilType.validation.ts`), so this field is never left empty by the seed.
2. **The rider typed something** → never overwrite it on a later re-render. Track whether the current value is still a seed (not hand-edited); `bikelog_app` spec 54a is a defect report about the mirror-image failure — a seed left standing after the suggestion that produced it went away, silently writing the wrong interval.
3. **Edit mode → seed from the log's own stored `intervalKmUsed`, never from the catalog.** The stored value is what the log's due point was computed from (server spec 54 H6). Re-seeding an old log from today's catalog would silently move its due point on save — and the rider opened the modal to fix a typo in the cost. If they *do* change the oil type while editing, rule 1 applies and the new suggestion is offered, visibly, in the box.

**H-W7 — `kmRemaining` from `/status` is signed. Do not reconstruct the overshoot.**
`RemindersBanner.tsx:33-38` recomputes "km past due" from `currentOdometer` because the reminders endpoint clamps `kmRemaining` to `0`. The status endpoint does not clamp (server spec 54 §D). Copying that banner's logic here would double-count the overshoot. `kmRemaining < 0` → `${Math.abs(kmRemaining)} km past due`, and nothing more.

**H-W8 — Four response states, not one. Three of them have no date.**
`status: "unknown"` with `lastChange: null` (no oil log yet), `lastChange` present but no interval (an imported row), and a present log with no usable riding rate (projection fields simply absent) are all normal. Every one must render a defined card, never `NaN km`, `Invalid Date` or a blank panel. `StateCard` covers the empty case; the other two are the same card with lines omitted.

**H-W9 — Server-derived fields never go in a mutation payload.**
`architecture.md` Invariant 3. `nextDueOdometer`, `kmSinceChange`, `percentUsed`, `totalCost`-style derivations: read-only, all of them. The form submits `oilType`, `odometerReading`, `intervalKmUsed`, `quantityLiters`, `oilFilterChanged`, `cost`, `changeDate`, `serviceCenter`, `notes` and nothing else.

**H-W10 — The oil-type dropdown can legitimately be empty.**
Catalogs are per-user and nothing is seeded (server specs 42/46, web spec 30). A new user's oil-type list is empty, and the create form is then unusable. Same answer spec 30 reached for maintenance: an empty-state line in the modal linking to `/settings/catalog`, not a disabled select with no explanation.

**H-W11 — The quick-fill copies what repeats, never what changed.**
`bikelog_app` spec 52's rule, and the one thing that makes a prefill safe: carry the oil type, interval, quantity, filter flag, service centre and cost; **never** the odometer reading and never the date. Those two are the whole reason the rider opened the form, and a prefilled odometer is a wrong odometer that looks right — it would also sail through the server's sequence check as a same-reading duplicate.

**H-W12 — Cost per km needs the *next* change to close the period, and the newest row has none.**
"km run on this oil" for a change is the **following** change's odometer minus its own — so the newest row's period is still open and has no figure. Do not fill the gap with `currentOdometer`: that quietly mixes a settled number and a moving one in the same column. The newest row shows `—`, and the status card above already says how far the current oil has run. The server returns the figure per row (server spec 54 §C) precisely so this does not have to be derived across a page boundary, where the neighbouring change can sit on the previous page.

**H-W13 — Do not remove the oil field from the maintenance form before the import has finalised.**
D8's removals are safe only once no live maintenance log carries an oil type. Ship them in this spec, which already must not deploy before the server's `--finalize` (see the prerequisite at the top) — but if that ordering ever slips, the removals are the part to hold back: a log created in the gap would keep an `oilTypeId` that nothing in the UI can show or clear.

---

## §A Decisions

- **D1 — Route `/bikes/[bikeId]/engine-oil`, components in `components/(main)/EngineOilLog/`.** The page file is a two-line re-export, matching every other screen in this app (`fuel-logs/page.tsx` is the template). Folder name matches the server module, not the URL.
- **D2 — Status card on top, log list below, on one screen.** Not a separate "forecast" page: the forecast is the reason to open this screen, and the list is the evidence behind it. Mirrors the fuel-log screen's shape with the card the app's spec 55 added.
- **D3 — Desktop table + mobile card rows, both from `FuelLog.tsx`'s pattern.** Same `GenericTableComponent`, same `TableActionMenu`, same 10-per-page pagination, same `ImageUploadThumb` receipt cell. Nothing new is designed here; this is a parity screen.
- **D4 — One form modal for create and edit**, `FuelLogFormModal`'s structure with `MaintenanceLogFormModal`'s catalog-select handling (it already does the oil-type dropdown, gated on `requiresOilType`).
- **D5 — A hub tile, `Droplet` icon, placed directly after `Fuel logs`.** It belongs next to fuel, not buried after Documents — those two are what the rider opens weekly.
- **D6 — The reminders banner is not touched.** Server spec 54 §E keeps emitting the engine-oil reminder in the existing shape, so `RemindersBanner.tsx` renders it with no change. Resist "improving" it here.
- **D7 — Spending is not touched either, beyond one type.** The `Engine Oil` category flows through the existing breakdown, chart and PDF automatically; only `TSpendingRecordSource` needs `"oil"` added (server spec 54 H11 — the web copy is also still missing `"accessory"`, fix both in the same line).
- **D8 — Engine oil leaves the maintenance screen completely (answer 1).** After the server's import there are no live oil maintenance logs left, so the oil affordances there are dead weight that would let the rider re-create the mess this feature exists to clean up. Three removals, §F: the **Engine oil type** select in `MaintenanceLogFormModal`, the oil line in `MaintenanceLogCard` / the maintenance columns, and the now-inert **"requires oil type"** checkbox in `MaintenanceTypeSection`. The `requiresOilType` column stays in the database — server spec 54 §H's import selector reads it — and the maintenance API keeps accepting `oilType` for history's sake. This is a UI removal, not a contract change.
- **D9 — The bike hub's stat strip gains "km on this oil" (answer 2).** It reads `["engineOilStatus", bikeId]`, the same key the oil screen uses, so react-query serves it from cache and the hub makes no extra request once either screen has loaded.
- **D10 — Two oil-only extras (answer 3).** A **cost per km** on each closed change (what the last oil actually cost to run, §G) and a **"Same as last change"** quick-fill on the add button (the shape `bikelog_app` spec 52 gave fill-ups, §H). Both were offered together and accepted together; either can be dropped on review without touching the rest.

---

## §B The screen

```
Engine oil                 [ Same as last change ] [ + Log oil change ]
Dashboard / Hornet 2.0 / Engine oil · 7 changes

┌──────────────────────────────────────────────────────────────┐
│  Next change around  6 Nov            [ On track ]           │
│  ~850 km to go                                               │
│                                                              │
│  1,550 km on this oil since 12 Aug · Motul 7100 10W-40       │
│  Interval 2,400 km · 65% used · at 43.2 km/day               │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░                          │
└──────────────────────────────────────────────────────────────┘

  Date        Odometer    Oil            Interval   Filter   Cost     ৳/km    Receipt
  12 Aug 26   18,400 km   Motul 7100     2,400 km   Yes      ৳1,250   —       [img]  ⋮
  04 Jun 26   16,050 km   Motul 7100     2,400 km   No       ৳1,180   ৳0.50   [ + ]  ⋮
```

The third and fourth lines are what make the first two auditable — if the date looks wrong, that is where the rider sees why (the same reasoning as `bikelog_app` spec 55 §E's audit lines). The status tag uses `StatusTag`: `success` for `ok`, default for `upcoming`, `destructive` for `overdue`.

Four card states (H-W8):

| State | Card shows |
| --- | --- |
| `status: "unknown"`, `lastChange: null` | `StateCard` with a `Droplet` icon: "No oil change logged yet · Log your last change and Bike Log works out when the next one is due" + the add button |
| `lastChange` present, no `intervalKm` | "1,550 km on this oil since 12 Aug" + a muted line: "Set an interval on this change to get a due date" |
| Projection fields absent (no riding rate) | "~850 km to go" and the audit lines, **no date, no km/day** — nothing invented |
| Overdue | "Due 420 km ago" in destructive tone, no projected date (the server omits it for overdue — spec 54 D4's rule, inherited from spec 52) |

Mobile (≤ lg): the card stacks to date-line / big km-to-go / two audit lines, and the table becomes the card rows from `FuelLog.tsx:170-225` — date + filter tag, cost + quantity, odometer + service centre, action menu + receipt thumb. Checked at 390px; no horizontal scroll.

---

## §C Data layer

`components/(main)/EngineOilLog/type/engine-oil-log.types.ts`:

```ts
export interface TEngineOilLog {
  _id: string; bike: string;
  oilType: { _id: string; name: string } | string | null;   // populated object, or a bare id — both forms occur (spec 41)
  odometerReading: number; intervalKmUsed?: number | null; nextDueOdometer?: number | null;
  quantityLiters?: number | null; oilFilterChanged: boolean;
  cost: number; changeDate: string;
  kmOnThisOil?: number | null; costPerKm?: number | null;   // server-computed per row, null on the newest — §G
  serviceCenter?: string; notes?: string;
  receiptImage?: TCloudinaryImage;
  isDeleted: boolean; createdAt: string; updatedAt: string;
}

export interface TEngineOilStatus {
  status: "ok" | "upcoming" | "overdue" | "unknown";
  currentOdometer: number;
  lastChange: { _id: string; changeDate: string; odometerReading: number;
                oilType: { _id: string; name: string } | null;
                intervalKm?: number; nextDueOdometer?: number; oilFilterChanged: boolean } | null;
  kmSinceChange?: number; kmRemaining?: number; percentUsed?: number;   // kmRemaining is SIGNED — H-W7
  projectedDaysRemaining?: number; projectedDueDate?: string; kmPerDay?: number;
  rateBasis?: { spanDays: number; distanceKm: number };
}
```

`oilType` keeps the three-way union for the same reason `TMaintenanceLog` does — read it through a small `getOilName()` helper rather than `log.oilType.name`, which crashes on the bare-id form.

| Query | Key | URL |
| --- | --- | --- |
| list | `["engineOilLogs", bikeId, page]` | `/bikes/:id/engine-oil-logs?page=&limit=10&sort=-changeDate` |
| status | `["engineOilStatus", bikeId]` | `/bikes/:id/engine-oil-logs/status` |
| latest (quick-fill) | `["engineOilLogs", bikeId, "latest"]` | `/bikes/:id/engine-oil-logs?limit=1&sort=-changeDate` — §H; separate from the paginated list on purpose (H-W5) |
| oil types | `["engineOilTypes"]` | `/engine-oil-types` — **same key as the catalog page, so it is served from cache** |

Invalidation set for every create / edit / delete / image mutation (H-W4 is the same list, from the other direction):

```ts
[["engineOilLogs", bikeId], ["engineOilStatus", bikeId], ["bikes", bikeId],
 ["spending", bikeId], ["reminders", bikeId]]
```

`["engineOilLogs", bikeId]` is a prefix of `["engineOilLogs", bikeId, "latest"]`, so the quick-fill's source refreshes with the list and never offers the change before last.

`["bikes", bikeId]` is in there because an oil log bumps `currentOdometer` server-side; `["reminders", bikeId]` because server spec 54 §E now sources the engine-oil reminder from this table.

---

## §D The form modal

`EngineOilLogFormModal.tsx` — `BaseModal` + `FormProvider` + `FormActionButtons`, one `onSubmit` branching on edit mode, `toast.success` / `toast.error` off `result.success` and `error.message`. Field list, in order:

| Field | Control | Notes |
| --- | --- | --- |
| Engine oil | `ControlledSelectField` | options from `["engineOilTypes"]` (after §F this screen and the catalog page are its only consumers), `{ label: name, value: _id }`; empty-state line → `/settings/catalog` (H-W10) |
| Odometer reading (km) | `ControlledInput` number | `step="0.01"`, required |
| Interval (km) | `ControlledInput` number | `step="0.01"`, **required** — pre-filled from the selected type's `suggestedIntervalKm` and editable from there (H-W6). Helper text names the source and shows when the rider has diverged: _"Suggested for Motul 7100: 2,400 km"_. Blanking it blocks submit with "Interval is required" rather than silently falling back to the catalog — the rider can always see the number that will be stored |
| Oil quantity (L) | `ControlledInput` number | `step="0.01"`, optional |
| Oil filter changed | `ControlledCheckbox` | inside the provider — H-W2 |
| Cost | `ControlledInput` number | `step="0.01"`, required |
| Date | `ControlledDateSelect` | defaults today, future dates rejected by the schema (the fuel-log rule) |
| Service centre | `ControlledInput` | optional, max 100 |
| Notes | `ControlledTextArea` | optional, max 500, 3 rows |

`schema/engine-oil-log.schema.ts` follows `fuel-log.schema.ts` exactly — every numeric field is a `z.string()` with `.refine()` bounds (not `z.number()`), because the inputs hand back strings and the payload does the `Number()` conversion at submit. Bounds mirror the server's so the two refuse the same things: odometer ≤ 999,999; interval > 0 and ≤ 100,000; quantity > 0 and ≤ 20; cost ≥ 0.

The receipt image is **not** part of the form — it is uploaded from the row, through an `EngineOilReceiptCell` that is `FuelLogReceiptCell.tsx` with three strings changed (`usePut`/`useDelete` → `/bikes/:id/engine-oil-logs/:logId/image`, `ImageUploadThumb label="Receipt"`). That keeps create a single request, as it is for fuel.

---

## §E The small edits elsewhere

1. **`BikeDetailPage.tsx:256-265`** — one more tile: `{ href: "engine-oil", label: "Engine oil", icon: Droplet }`, straight after `fuel-logs` (D5). `Droplet` from `lucide-react`, already a dependency.
2. **`BikeDetailPage.tsx:234` stat strip** — one more stat beside `Avg mileage`: **"On this oil"**, `kmSinceChange` formatted as `1,550 km`, with the oil's name as its sub-label (D9). Source: `useFetchData<TEngineOilStatus>(["engineOilStatus", bikeId], ...)` — the **same key** the oil screen uses, so react-query dedupes it. Hidden entirely when `status === "unknown"` and `lastChange` is `null`; a bike with no oil log shows the strip exactly as it looks today rather than a tile reading `0 km`.
3. **`OdometerSection.tsx:19-22`** — add `["engineOilStatus"]` to the invalidation list (H-W4). One line, and the single most important line in this spec for the feature the developer asked for.
4. **`Spending/type/spending.types.ts:31`** — `TSpendingRecordSource` becomes `"fuel" | "maintenance" | "accessory" | "oil"` (D7). Nothing switches on it, so this is type hygiene, not behaviour.

`RemindersBanner.tsx` stays **untouched**: server spec 54 §E keeps emitting the engine-oil reminder in the existing shape, so it renders with no change here.

---

## §F Engine oil leaves the maintenance screen (D8)

Settled by the developer on 2026-10-18 — _"no, remove it"_. After the import there is no live maintenance log carrying an oil type, so every oil affordance on that screen is dead weight, and leaving it would let the rider re-create exactly the split this feature removes. Three deletions, all UI-only (H-W13 on the ordering):

| File | Remove |
| --- | --- |
| `MaintenanceLogFormModal.tsx` (the `["engineOilTypes"]` query at :42-48, the `isEngineOil` gate at :69-78, the oil select, the payload field at :128) | the query, the `requiresOilType` gate, the `useEffect` that clears `oilType`, the oil `ControlledSelectField`, the `oilType` payload field, and `oilType` from the form schema + form type |
| `MaintenanceLogCard.tsx:76-79` | the `oilName` derivation and the line that renders it. The maintenance screen is cards only — `MaintenanceLog.tsx` has no table and no column file, so this is the single display site |
| `MaintenanceTypeSection.tsx` | the **"requires oil type"** checkbox and its create/edit state — it now gates nothing on this client |

**What deliberately stays.** `requiresOilType` and `oilTypeId` stay in the database and in the API: server spec 54 §H's import selector reads the flag, and the soft-deleted source logs keep their oil type so the import stays reversible. `TMaintenanceLog.oilType` stays in the type file, marked as history-only — deleting it would make the soft-deleted rows unreadable if anyone ever un-deletes them. Nothing about the maintenance **contract** changes; this is three UI deletions and a smaller form.

---

## §G Cost per km on a closed change (D10)

What the last oil actually cost to run — the number that tells the rider whether the expensive synthetic was worth it:

```
km on that oil = the NEXT change's odometer − this change's odometer
cost per km    = this change's cost ÷ km on that oil
```

Both come **from the server**, per row, as `kmOnThisOil` and `costPerKm` (server spec 54 §C) — not derived here. H-W12 is why: the neighbouring change can sit on the previous page, and a figure that appears or vanishes with pagination reads as a bug. The newest change has no following change, so both fields are `null` and the column shows `—`; the status card above is already saying how far the current oil has run. Render as `৳0.50/km` to two decimals, right-aligned, `tabular-nums` like every other number on this screen. On mobile it joins the third line of the card row, after the odometer.

---

## §H "Same as last change" quick-fill (D10)

A secondary button beside **Log oil change**, opening the same modal with everything repeatable already filled in:

- **Copied:** oil type, interval, quantity, oil-filter flag, service centre, cost.
- **Never copied:** odometer reading and date — H-W11. Odometer stays empty and focused; the date defaults to today as it always does.
- **Source:** a dedicated `["engineOilLogs", bikeId, "latest"]` query (`?limit=1&sort=-changeDate`), not the paginated list — the same separation `bikelog_app`'s `useFuelLogSeed` uses, and the reason the button behaves identically on page 1 and page 7 (H-W5).
- **Hidden** when there is no previous change. There is nothing to copy, and a button that opens an empty form under that label is worse than no button.

The modal is unchanged otherwise — same component, same schema, same submit path, just different `defaultValues`. On mobile the two buttons collapse to `[ Same as last ]` + `[ Add ]`, following the existing `lg:hidden` / `hidden lg:inline-flex` pattern in `FuelLog.tsx:110-118`.

---

## Test plan

Against the real API with the server half deployed and imported. `yarn lint` clean, `yarn build` clean, 390px viewport pass.

| # | Check | Expect |
| --- | --- | --- |
| V1 | Open `/bikes/:id/engine-oil` after the import | the historical changes are listed, newest first, with their oil type names |
| V2 | Status card against the numbers in the list | "km on this oil" = current odometer − newest change's odometer, by hand |
| V3 | **Settings → update the odometer +300 km → return to the oil screen** | card updated with no hard refresh: km on this oil +300, km to go −300, date earlier (H-W4) |
| V4 | Add an oil change, picking an oil type | interval pre-fills from the catalog; submit writes it |
| V5 | Switch the oil type mid-form to one with a different suggestion | the interval re-seeds (H-W6 rule 1); hand-type a value, re-render → **the typed value survives** (rule 2) |
| V5b | Type an interval different from the suggestion and save, then reopen the log for editing | the box shows **the saved value, not the catalog's** (H-W6 rule 3) |
| V5c | Change an oil type's interval in Settings, then reopen an old oil log and save it unchanged | its due point does not move |
| V5d | Clear the interval field and submit | blocked inline with "Interval is required" — no silent fallback |
| V6 | Type `408.8` into odometer, interval, quantity and cost | all four accept it, no browser tooltip (H-W1) |
| V7 | A bike with no oil log | empty `StateCard` + working add button, no `NaN`, no blank panel |
| V8 | A bike with too little fuel history | km-to-go shown, **no date and no km/day**, nothing invented (H-W8) |
| V9 | An overdue oil | "X km past due" in destructive tone, and X matches `currentOdometer − nextDueOdometer` by hand (H-W7) |
| V10 | Upload then delete a receipt on a row | thumb appears / clears, list refetches |
| V11 | Delete an oil log → check Spending and the hub | totals drop by that cost, reminder recalculated, `currentOdometer` unchanged (nothing rolls it back — expected) |
| V12 | Clear the `accessToken` cookie, navigate straight to `/bikes/:id/engine-oil` | lands on `/login` (every `(main)` route, Invariant 7) |
| V13 | 390px: card, table-as-cards, modal, date picker | no horizontal scroll, every tap target reachable |
| V14 | The ৳/km column against two consecutive changes | equals cost ÷ (next odometer − this odometer), by hand; the **newest row shows `—`** (H-W12) |
| V15 | ৳/km on the first row of page 2 | a real figure, not `—` — the page boundary is invisible (§G) |
| V16 | "Same as last change" → the modal | oil type, interval, quantity, filter, service centre, cost prefilled; **odometer empty, date today** (H-W11) |
| V17 | "Same as last change" on a bike with no oil log | the button is not rendered |
| V18 | Bike hub | the stat strip shows "On this oil"; it disappears on a bike with no oil log, and moves after a Settings odometer update (D9 + H-W4) |
| V19 | Maintenance log form after §F | no engine-oil select; Settings → Catalog has no "requires oil type" checkbox; an existing maintenance log still opens and saves cleanly |

---

## Settled questions (developer, 2026-10-18)

1. **Does the maintenance screen keep an "Engine oil" entry at all?** — **"No, remove it."** §F removes the oil select from the maintenance form, the oil line from its card/table, and the now-inert "requires oil type" checkbox from the catalog. The database column and the API field stay (the import reads one, reversibility needs the other). D8, and H-W13 on when it is safe to do.
2. **Should the hub's stat strip show "km on this oil" next to Avg mileage?** — **Yes.** D9, §E item 2. Shares the oil screen's query key, so it costs no extra request; hidden on a bike with no oil log.
3. **Per-change cost-per-km, and a "same as last time" quick-add?** — **Yes, both.** §G and §H. They were offered as a pair and taken as a pair; each is self-contained, so either can still be dropped at implementation time without disturbing the rest of the screen.

**Still open — on the server half, not this one:** whether an oil change should also fall due on *time* as well as distance (`bikelog_server` spec 54, open question 2). That one is far cheaper to decide before its migration runs than after.
