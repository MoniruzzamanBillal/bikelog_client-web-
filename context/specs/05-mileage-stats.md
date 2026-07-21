# 05: Mileage Stats

Status: ✅ Complete

## Goal

Show mileage history (exact + approximate) and monthly/yearly/lifetime totals, one page with tabs.

## Context

Backend contract (all `GET`, read-only, no write endpoints exist for `mileageRecord` at all — records are only ever produced automatically by closing a full-tank fuel log, see spec 04):

- `GET /api/bikes/:bikeId/mileage` — exact `MileageRecord` history + a live approximate rolling-average figure.
- `GET /api/bikes/:bikeId/mileage/monthly?targetMonth=YYYY-MM` — required param, one month's totals (`totalDistanceKm`, `totalLitersConsumed`, `fuelLogs`).
- `GET /api/bikes/:bikeId/mileage/yearly?targetYear=YYYY` — required param, per-month breakdown for the year.
- `GET /api/bikes/:bikeId/mileage/lifetime` — no params, all-time totals.
- **Averages are always computed client-side** — the API returns totals only (`totalDistanceKm`/`totalLitersConsumed`), never a precomputed average. Every tab below must do the division itself.

## Design

- `app/(main)/bikes/[bikeId]/mileage/page.tsx` — a simple tab switcher (plain `useState<"history"|"monthly"|"yearly"|"lifetime">`, four buttons — no need for a full shadcn `Tabs` component if a manual row of buttons is faster to wire up; use `Tabs` if it's not meaningfully slower, developer's call in the moment) rendering one of four small subcomponents. No routing per tab — keeps this to one page, one route, per `../code-standards.md`'s route table.
- **History tab**: list of `MileageRecord`s (period dates, distance, liters, km/l) as simple stacked cards (same reasoning as the bike list — this is a small, infrequent dataset, a full data table is overkill), plus the approximate rolling-average number shown at the top, visually distinguished (e.g. a muted "~approx" label) from the exact per-record figures below it.
- **Monthly tab**: a month picker (simple `<input type="month">` or reuse `DateSelect` if it supports month-only mode — otherwise plain native input is faster to build and perfectly adequate here), shows `totalDistanceKm`, `totalLitersConsumed`, and the client-computed `totalDistanceKm / totalLitersConsumed` average, defaulting to the current month.
- **Yearly tab**: a year picker (native `<input type="number">` or a simple prev/next year stepper), renders one small card per month from `monthlySummary`, each showing that month's client-computed average.
- **Lifetime tab**: single card, totals + client-computed average since bike purchase.

## Implementation

1. `components/feature/mileage/mileage.types.ts` — `TMileageRecord`, `TMonthlyMileage`, `TYearlyMileage`, `TLifetimeMileage`.
2. `components/feature/mileage/useMileage.ts` — `useMileageHistory(bikeId)`, `useMonthlyMileage(bikeId, targetMonth)`, `useYearlyMileage(bikeId, targetYear)`, `useLifetimeMileage(bikeId)`.
3. `components/feature/mileage/MileageHistoryTab.tsx`, `MonthlyMileageTab.tsx`, `YearlyMileageTab.tsx`, `LifetimeMileageTab.tsx`.
4. `app/(main)/bikes/[bikeId]/mileage/page.tsx` — tab switcher wiring the four above.

## Dependencies

Spec 01, 03. Needs some fuel log data (spec 04) to show anything meaningful, but doesn't strictly depend on spec 04 being "done" to build against — the endpoints just return empty/zero totals with no data yet.

## Verify

- [ ] All four tabs load without a full-tank fuel log ever having been created (empty states don't crash — zero division is guarded, e.g. show "—" instead of `NaN` when `totalLitersConsumed` is 0).
- [ ] Monthly/yearly pickers correctly re-fetch on change (query key includes the picked month/year).
- [ ] The approximate rolling-average figure on the History tab is visibly distinguished from exact per-record numbers.
- [ ] Usable at ~390px width, including the month/year pickers.
