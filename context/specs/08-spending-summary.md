# 08: Spending Summary

Status: ✅ Complete

## Goal

Show total spending + category breakdown for a bike, switchable by period.

## Context

Backend contract: `GET /api/bikes/:bikeId/spending-summary` — query params only, no body. `period` is **required**, exactly one of `month`/`year`/`lifetime` (anything else 400s). `targetMonth` (format `YYYY-MM`) required when `period=month`; `targetYear` (format `YYYY`) required when `period=year`. Response: `{ period, targetMonth?, targetYear?, totalSpending, categoryBreakdown: [{ category, total }] }` — `categoryBreakdown` includes a `"Fuel"` entry plus one entry per maintenance-type category that has any logged cost, sorted descending by total.

## Design

- `app/(main)/bikes/[bikeId]/spending/page.tsx` — same tab-switcher pattern as spec 05's mileage page (Month / Year / Lifetime), reusing a month/year picker matching whatever spec 05 built (don't reinvent a second picker component).
- Render: `totalSpending` as a large number at the top, `categoryBreakdown` as a plain list below (category name + amount, already sorted by the API) — no chart, no progress bars, just the list. Matches the "no charts" scope decision in `../project-overview.md`.
- One shared component, `components/feature/spending/SpendingSummaryView.tsx`, taking `{ totalSpending, categoryBreakdown }` as props — reused across all three tabs since the shape is identical regardless of period.

## Implementation

1. `components/feature/spending/spending.types.ts` — `TSpendingSummary`.
2. `components/feature/spending/useSpendingSummary.ts` — `useSpendingSummary(bikeId, period, targetMonth?, targetYear?)`, building the query string via `buildUrl.ts`.
3. `components/feature/spending/SpendingSummaryView.tsx`.
4. `app/(main)/bikes/[bikeId]/spending/page.tsx` — tab switcher, reusing the month/year picker pattern from spec 05.

## Dependencies

Spec 01, 03. Reuses the picker UI pattern from spec 05 (build 05 first, or at least decide its picker component, to avoid duplicating it here).

## Verify

- [ ] All three periods load and show correct totals against known Postman-collection dummy data.
- [ ] Switching period/month/year re-fetches correctly (query key includes all three).
- [ ] Category list is empty-safe (bike with zero logs shows `totalSpending: 0` and an empty/placeholder list, not a crash).
- [ ] Usable at ~390px width.
