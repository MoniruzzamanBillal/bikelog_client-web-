# 41 — Mileage: price/L everywhere, monthly fill-up records, lifetime per-year

**Status**: 📝 Plan only — written 2026-11-09. App-parity catch-up. Mirrors `bikelog_app` spec **66**. Server half — `bikelog_server` spec **62** (`totalFuelCost` on every mileage summary + a `yearlySummary` per-year breakdown on the Lifetime response) — is **already implemented and deployed**. Pure web-client build.

---

## Goal

Four changes across the Mileage tabs:

- **History** — each exact-mileage record card gains its fuel cost figures: **full fuel cost**, **cost/km**, and **price/L** (smaller, slightly brighter text).
- **Monthly** — below the existing four stat tiles, add a **FILL-UP RECORDS** section showing the exact-mileage record cards whose period **closed in the selected month** (same cards as History).
- **Yearly** — the per-month table/list gains a **Price / L** figure.
- **Lifetime** — below the four total tiles, add a **BY YEAR** breakdown (a row per year, newest-first, same figures as a Yearly month row).

All money figures are derived: **price/L = fuelCost ÷ litres**, **cost/km = fuelCost ÷ distance**, each guarded so a missing field reads `—`, never `৳undefined`/`৳NaN`.

## Design

- Fits the existing Mileage Nocturne look (`panel`, `StatTile`, the History record card, the muted uppercase section kickers).
- The History card’s cost line carries **three** money figures (`Fuel cost ৳X · ৳Y/km · ৳Z/L`) → render it small (~11.5px) and in the brighter foreground colour (not the greyed detail colour) — the “a bit small, a bit white” the developer asked for.
- The Monthly fill-up cards are the **History cards reused**, filtered to the stepped month. A month with fuel logs but no closed period shows a one-line “No exact record closed this month” note.

### Server fields now present (server spec 62 — add to `type/mileage.types.ts`)

- `totalFuelCost: number` on `TMileageRecord` (per exact record), `TMonthlyMileage`, `TMonthlySummary`, and `TLifetimeMileage`.
- `yearlySummary?: { targetYear: string; totalDistanceKm: number; totalLitersConsumed: number; totalFuelCost: number; fuelLogCount: number }[]` on `TLifetimeMileage` (newest-first). Read with `?? []` so an older server simply omits the BY YEAR list.

## Implementation

1. **Types** — add `totalFuelCost` to `TMileageRecord`, `TMonthlyMileage`, `TMonthlySummary`, `TLifetimeMileage`; add the optional `yearlySummary` to `TLifetimeMileage`.
2. **`MileageRecordCard.tsx`** (new shared component, under `components/(main)/Mileage/`) — extract the single exact-record card currently inlined in `MileageHistoryTab.tsx`: period range · `distanceKm km · litersConsumed L · odometer` · the km/l figure · the proportional bar. **Add** a cost line: `Fuel cost ৳{totalFuelCost} · ৳{cost/km}/km · ৳{price/L}/L`, each figure guarded (`—` when the source is missing or zero). Props: `{ record, maxKmpl }` (bar scales to the caller’s max).
3. **`MileageBreakdownList.tsx`** (new shared component) — a per-period metric list: a headline label (month name / year) + an average-mileage figure over a small metric grid of **Distance · Fuel used · Fuel cost · Price/L · Cost/km · Fill-ups**. Used by the Yearly tab (a row per month) and the Lifetime tab (a row per year). (If keeping the Yearly tab’s existing `<table>` is simpler, instead just **add a `Price / L` column** to that table — either is acceptable; the requirement is that Yearly shows price/L.)
4. **History tab** (`MileageHistoryTab.tsx`) — replace the inline card markup with `MileageRecordCard` (pass `maxKmpl`). Rolling-average panel unchanged.
5. **Monthly tab** (`MonthlyMileageTab.tsx`) — keep the four stat tiles, then add a **FILL-UP RECORDS** kicker + list: reuse the History query (`useFetchData(["mileage","history",bikeId], "/bikes/:id/mileage")` — react-query dedupes, no new endpoint) and filter `exactRecords` to those whose `periodEndDate` falls in `targetMonth` (compare `YYYY-MM`, using the same UTC-safe date handling the rest of the client uses). Render each with `MileageRecordCard`, bars scaled to the month’s own best km/l. Empty (logs but no closed period) → the one-line note.
6. **Yearly tab** (`YearlyMileageTab.tsx`) — add **Price / L** to the per-month rows (`totalFuelCost / totalLitersConsumed`), guarded. Chart unchanged.
7. **Lifetime tab** (`LifetimeMileageTab.tsx`) — keep the four total tiles, then a **BY YEAR** kicker + a `MileageBreakdownList` (or table) from `lifetime.yearlySummary ?? []`, newest-first. The desktop `LifetimeRail` is unchanged.

### Hazards / decisions

- **D1 — Monthly “fill-up” = History record cards filtered to the month.** A record is a full-tank→full-tank *period*; it belongs to the month its period **closed** in (`periodEndDate`).
- **D2 — Monthly records filtered client-side**, not via a new endpoint — the history query is already cached.
- **H1 — older server with no `yearlySummary`/`totalFuelCost`** → `?? []` omits the BY YEAR list; each money figure is independently guarded so a half-populated row never prints `NaN`/`৳undefined`.
- **H2 — month bar scale is local** (the month’s best km/l), matching the History tab’s per-set bars.

## Dependencies

No new packages. Uses existing `date-fns`, `StatTile`, `recharts` (Yearly chart), and the panel styles.

## Verify

- [ ] History card shows `Fuel cost ৳… · ৳…/km · ৳…/L`, smaller and brighter than the detail line; a record with no cost shows `—` for all three.
- [ ] Monthly: the four tiles plus a card per fill-up closed in the stepped month; stepping the month follows; a month with logs but no closed period shows the note.
- [ ] Yearly: each month row now shows a Price / L figure; totals unchanged.
- [ ] Lifetime: the four total tiles, then a row per year newest-first with the same figures as a Yearly month row.
- [ ] Against a pre-spec-62 server, Lifetime shows the totals with no BY YEAR list and no `NaN`.
- [ ] 320–360px: the History cost line and the metric grid don’t overflow or clip.
- [ ] `yarn build` (tsc) and `yarn lint` clean.
