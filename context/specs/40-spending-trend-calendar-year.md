# 40 — Spending Trend: a full calendar year (Jan→Dec)

**Status**: 📝 Plan only — written 2026-11-09. App-parity catch-up. Mirrors `bikelog_app` spec **67**. Server half — `bikelog_server` spec **63** (the trend endpoint accepts `targetYear`) — is **already implemented and deployed**. Pure web-client build.

---

## Goal

Re-scope the Spending **Trend** tab from a rolling **6-month** window to a fixed **calendar year (Jan→Dec, 12 bars)**, with a **year stepper** so the rider can browse past years. “Dec → Nov” at mid-year was never “January to December”; a calendar year makes the month labels literal.

## Design

- The full Trend view (`SpendingTrendChart` `variant="full"`) shows **12 bars Jan→Dec** for a selected year, titled **“Spending in {year}”**, with a year stepper above it (consistent with the Year tab’s stepper).
- The donut’s “By category” month = the **latest month in the year that has spending**, not literally December (otherwise the current year’s donut stays empty until December). The highlighted (bright) bar follows that same month.
- A year with **no spending in any month** shows a single **“Nothing spent in {year}”** empty state instead of a flat all-zero chart.
- The compact **sidebar rail** (`variant="rail"`, “Last 6 months”) on the Month/Year/Lifetime periods is **left as a rolling 6-month sparkline** — it’s a glance widget, not the Trend view. Only the full Trend tab becomes calendar-year.

### Endpoint (server spec 63)

`GET /bikes/:bikeId/spending-summary/trend?targetYear=YYYY` → `{ targetYear, months: 12, monthlySummary: [{ targetMonth: "YYYY-MM", totalSpending, categoryBreakdown }] }` (12 entries, Jan→Dec). The existing `?months=N` path is unchanged and still powers the rail.

## Implementation

1. **`Spending.tsx`** — add `targetYear` state for the Trend tab (default current year). When `period === "trend"`, show a year stepper (reuse `PeriodStepper`, same control the Year tab uses) in the period-controls row, and pass `targetYear` + `onPrev/onNext` down to `SpendingTrendChart`. (The existing year stepper for `period === "year"` stays; Trend gets its own.)
2. **`SpendingTrendChart.tsx`**:
   - Accept a `targetYear` prop on the `full` variant. Fetch `/spending-summary/trend?targetYear=${targetYear}` under cache key `["spending", "trend", bikeId, targetYear]` (still under the `["spending", bikeId]`… actually under `["spending","trend",bikeId]` prefix the trend already uses — keep it invalidation-compatible). The **rail** variant keeps calling `?months=6` under its own distinct key (e.g. `["spending", "trend", bikeId, "rail6"]`) so the two don’t collide.
   - Chart: render all 12 `monthlySummary` entries Jan→Dec. Labels already come from `format(parse(targetMonth,"yyyy-MM"), "MMM")`. recharts `ResponsiveContainer` already stretches bars to full width (no RN gutter problem), so no width hack is needed — but confirm the 12 ticks all render (set `interval={0}` on the `XAxis` if any are dropped).
   - **Donut month** = the latest month with `totalSpending > 0` (`monthsWithSpending[last]`), not `monthlySummary[last]`. The bright/highlighted bar uses that same index (`fillOpacity` 1 for it, `0.55` for the rest).
   - **Title**: “Spending in {year}”.
   - **Empty year**: if no month has spending, render a single “Nothing spent in {year}” empty state (`StateCard`) instead of the chart + donut.
3. Keep the tooltip (`৳… · Spent`) and the category pie/legend behaviour otherwise unchanged.

### Hazards

- **D1 — fixed calendar year, not rolling 12.** The literal Jan→Dec labels only hold for a calendar year; `targetYear` exists for exactly this.
- **D2 — donut month = latest *with data*.** Picking December would leave the current year’s donut empty until year-end.
- **H1 — older server.** `?targetYear=` on a pre-spec-63 server falls through to the rolling default (a short window); the tab still renders, just not Jan→Dec. Needs spec 63 deployed to be correct (it is).
- **Rail untouched.** Don’t let the rail’s 6-month query and the full tab’s year query share a cache key.

## Dependencies

No new packages. Uses existing `recharts`, `date-fns`, `PeriodStepper`, `StateCard`.

## Verify

- [ ] Trend shows **12 bars Jan→Dec** for the current year; the stepper moves between years and disables “next” past the current year.
- [ ] The donut reflects the **latest month with spending**; that month’s bar is the bright one.
- [ ] A year with no spend shows the empty state, not an all-zero chart.
- [ ] The sidebar rail still shows the rolling “Last 6 months” sparkline and opens the Trend tab.
- [ ] Switching years refetches; adding a log refreshes the trend (prefix invalidation).
- [ ] 320–360px width: 12 bars fit with no horizontal scroll; `MMM` ticks all show.
- [ ] `yarn build` (tsc) and `yarn lint` clean.
