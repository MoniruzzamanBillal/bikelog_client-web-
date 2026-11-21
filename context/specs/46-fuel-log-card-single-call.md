# 46 — Fuel-log rows carry mileage + lock: drop the client-side merge

**Status**: 📝 Planned (web code not written). Web twin of app spec **75**, consumes `bikelog_server` spec **69** (adds `mileageKmPerLiter` + `lockedPeriod` to each `/fuel-logs` row). Additive server fields — **non-breaking**; the web keeps working unchanged until it opts in. Pure web data-source change: drop the second `/mileage` fetch and the two merge helpers, read the facts off the row. Nothing flows back.

---

## Goal

`components/(main)/fuelLog/FuelLog.tsx` renders the fuel-log table + mobile cards from **two** fetches and merges per-fill facts onto each row client-side:

- `getMileage` (`FuelLog.tsx:96-101`) — full-tank rows only, matches `record.endOdometer === fuelLog.odometerReading`, returns `record.mileageKmPerLiter` → the `{x} km/l` pill (`fuelLogColumns.tsx:96-98`, `FuelLog.tsx:224-228`).
- `lockNotes` (`FuelLog.tsx:77-91`) — `record.fuelLogIds` membership → `"Locked — this fill is part of a closed mileage period (…)."` used as the row footnote / action-menu disable (`fuelLogColumns.tsx:127-135`, `FuelLog.tsx:258-264`).

Both now arrive on the row from server spec 69. Replace the merge: drop the `["mileage","history",bikeId]` fetch and the two helpers; read `row.mileageKmPerLiter` and `row.lockedPeriod`. **Same table, same pills, same lock behavior, same values** (server mirrors the exact `endOdometer` / `fuelLogIds` rules the web uses now).

## Design

Single file does the data work: `components/(main)/fuelLog/FuelLog.tsx` (plus the column/card renderers it feeds).

### Endpoint & shape (server spec 69)

Each `/bikes/:bikeId/fuel-logs` row gains (additive):

```ts
// components/(main)/fuelLog/type/fuel-log.types.ts — on TFuelLog
mileageKmPerLiter?: number | null;                       // closing full-tank row; else null
lockedPeriod?: { startDate: string; endDate: string } | null; // null ⇔ not locked
```

(`kmOnThisFill`/`costPerKm` already live on the row — unchanged.)

### Render (`FuelLog.tsx` + `fuelLogColumns.tsx`)

- **Remove** the mileage fetch (`FuelLog.tsx:59-62`, key `["mileage","history",bikeId]`) and the two helpers `lockNotes` (77-91) and `getMileage` (96-101); drop the now-unused `TMileageHistoryResponse` import.
- **km/l pill**: feed from `row.mileageKmPerLiter` (`!= null` guard — identical gate to today).
- **Lock note**: compose from `row.lockedPeriod` with the web's **existing** wording and date format (`"Locked — this fill is part of a closed mileage period (<start> → <end>)."`), non-null ⇔ locked. Keep it feeding the same footnote + action-menu `disabled`.
- The `GenericTableComponent` columns and mobile-card JSX stay structurally the same; only their data source (prop/row field) changes.

### Why `/bikes/:bikeId` and `useFuelLogSeed` are untouched

They serve the header/facts and the add-form seed (`FuelLog.tsx:55-58, 67`), not the per-row merge. Only the `/mileage` fetch and its two derived maps go.

### Invalidation

After a fuel-log create/edit/delete the list must refetch so the new row-level mileage/lock are right. Confirm the fuel-log mutations invalidate `["fuelLogs"]`; keep any `["mileage"]` invalidation (other screens read it). A mid-period delete changes sibling rows, so the page refetches, not a single-row drop.

## Scope

- `components/(main)/fuelLog/FuelLog.tsx` — drop the mileage fetch + `lockNotes` + `getMileage`; source pills/notes from row fields.
- `components/(main)/fuelLog/fuelLogColumns.tsx` and the mobile-card block — read km/l + lock from the row.
- `components/(main)/fuelLog/type/fuel-log.types.ts` — add `mileageKmPerLiter?` + `lockedPeriod?` to `TFuelLog`.
- No new dependency. No server change (consumes spec 69). No app change (app spec 75, own repo).

## Cascade

Web-only data-source + render change. Nothing flows back. Server endpoint (spec 69) and app consumer (spec 75) are tracked in their own repos. Deploy spec 69 before this web build ships (else the row fields are absent and the pills/lock notes vanish — a regression); the old `/mileage` endpoint stays live, so there's no other ordering constraint.

## Verify

- `npx tsc --noEmit` clean; `eslint` on touched files clean.
- Contract check: `TFuelLog`'s new fields match server spec 69's row shape.
- **Browser pass owed** (desktop table + phone-width cards):
  - One bike's fuel-log list: every `km/l` pill and lock note identical to the pre-change build; Network shows the list no longer fetches `/mileage` (the merge is gone).
  - Full-tank closing row shows km/l; partial / newest-open row does not.
  - A row inside a closed period shows the lock note + disabled edit/delete; a free row does not.
  - Delete a mid-period fill → list refetches, affected rows' km/l + lock update.
  - Pager range + counts unchanged.
