# 39 — Spending: Year & Lifetime accordions + per-day

**Status**: ✅ Complete — 2026-11-09 (code; browser pass owed). App-parity catch-up. Mirrors `bikelog_app` specs **65** (Year/Lifetime accordions) and **63** (per-day on Year & Lifetime). Server half — `bikelog_server` spec **61** (`GET /bikes/:bikeId/spending-summary/period-breakdown`) — is **already implemented and deployed**. Pure web-client build. Builds on web spec 38’s pattern.

---

## Goal

Bring the Spending page’s **Year** and **Lifetime** tabs up to the Month tab’s standard:

1. **Accordions** — each category expands to **time buckets** instead of individual records: the Year tab expands to **per-month** rows (`Jan 3.3L ৳650`, chronological Jan→Dec), the Lifetime tab to **per-year** rows (`2026 225L ৳5678`, newest-first). Litres show on the **Fuel** category only.
2. **Per-day figure** — the Total panel on both tabs gains the `৳… / day` figure the Month tab already has (`this year` / `of ownership` scope label), which the Year/Lifetime tabs don’t show today.

## Design

- Reuse the Month tab’s accordion look from web spec 38 (`MonthlySpendingBreakdown`): same Total panel, kicker, swatch, proportional bar and chevron. The **only** difference is what a category expands to — pre-formatted time buckets, not line-item records.
- Litres column renders only when the bucket carries `liters` (Fuel); other categories show an empty litres slot.
- Per-day scope label reads correctly per tab: **“this year”** (Year) / **“of ownership”** (Lifetime).

### Endpoint & shape (server spec 61)

`GET /bikes/:bikeId/spending-summary/period-breakdown?period=year&targetYear=YYYY` (Year) or `?period=lifetime` (Lifetime) →

```ts
type TSpendingPeriodBucket = {
  key: string;          // "2026-01" (month) | "2026" (year)
  label: string;        // "Jan" | "2026" — pre-formatted server-side, render raw
  total: number;
  liters: number | null;
};
type TSpendingPeriodGroup = {
  category: string; total: number; totalLiters: number | null; buckets: TSpendingPeriodBucket[];
};
type TPeriodCategoryBreakdown = {
  period: "year" | "lifetime"; targetYear?: string;
  totalSpending: number; categories: TSpendingPeriodGroup[];
};
```

## Implementation

1. **Types** — add `TSpendingPeriodBucket`, `TSpendingPeriodGroup`, `TPeriodCategoryBreakdown` to `spending.types.ts`.
2. **`PeriodSpendingBreakdown.tsx`** (new) — a near-clone of `MonthlySpendingBreakdown.tsx`:
   - Props: `{ totalSpending, categories, periodLabel, avgDailyExpense?, daysElapsed?, avgDailyScopeLabel }` (+ loading/error/retry).
   - Same Total panel + per-day column + kicker + category accordions as spec 38.
   - **Accordion body** maps `category.buckets` → row = `label` · litres (via a small `formatLiters` that trims trailing zeros, e.g. `3.3L`, `225L`; empty when `liters == null`) · `total` (`formatTaka`). Bucket labels are pre-formatted server-side → render raw (no `date-fns` parsing).
   - Open state resets whenever the `period`/`targetYear` changes.
3. **`Spending.tsx` — Year & Lifetime branches**:
   - `period === "year"` → fetch `period-breakdown?period=year&targetYear=${targetYear}`, cache key `["spending", bikeId, "year-breakdown", targetYear]`.
   - `period === "lifetime"` → fetch `period-breakdown?period=lifetime`, cache key `["spending", bikeId, "lifetime-breakdown"]`.
   - Both keys stay under the `["spending", bikeId]` prefix every mutation invalidates.
   - Render `PeriodSpendingBreakdown` with `avgDailyScopeLabel="this year"` / `"of ownership"`.
   - **Per-day math**:
     - Year → `totalSpending / elapsedDaysInYear`, where `elapsedDaysInYear` mirrors the existing `getElapsedDaysInMonth`: full days for a past year, day-of-year for the current year, `0` for a future year.
     - Lifetime → `totalSpending / daysSinceOwnership`, using the bike’s purchase/ownership start date if the bike object exposes one (`bikeData?.data`). If no such date is available, **omit the per-day line** on Lifetime (guarded, never `৳NaN`).
   - Empty period → the existing `Nothing spent in <period>` empty state, no accordion.
4. `SpendingSummaryView.tsx` is now unused by the Year/Lifetime tabs (Month uses spec 38’s component, Trend is its own chart). Leave it in place — out of scope to delete; a later cleanup spec can remove it.

### Hazards

- **H-A — litres only on Fuel.** The server sends `liters: null` for every non-fuel bucket; render an empty litres slot for those, never `0L`/`undefined`.
- **H-B — guard the lifetime per-day.** Only show it when an ownership start date exists; otherwise the Lifetime Total panel shows the total alone (matching the app’s defensive `&&`).
- **H-C — distinct cache keys** (as in spec 38) to avoid colliding with the `BikeStatStrip` summary queries.

## Dependencies

No new packages. Same stack as spec 38.

## Verify

- [ ] Year tab: each category expands to its months (chronological); Fuel rows show litres, others don’t; totals match the summary for that year.
- [ ] Lifetime tab: each category expands to years, newest-first, litres on Fuel only.
- [ ] Category totals and the top-panel total match the Month tab / summary for the same period.
- [ ] Year Total panel shows `৳… / day · … this year`; Lifetime shows `… of ownership` (or no per-day line when ownership start is unknown).
- [ ] Stepping the year or switching tab collapses open accordions.
- [ ] Empty period → empty state, no accordion.
- [ ] Against a pre-spec-61 server the Year/Lifetime tabs show a working error/retry state.
- [ ] `yarn build` (tsc) and `yarn lint` clean.
