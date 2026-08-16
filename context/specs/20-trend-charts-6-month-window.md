# 20: Trend Charts — 6-Month Window

Status: ⛔ Not started

## Goal

Widen the Spending and Mileage trend charts (shipped in spec 13) from a hardcoded last-3-months window to a hardcoded last-6-months window. This is a client-only change — the backend trend endpoints already accept an arbitrary `?months=N` (`bikelog_server` spec 15, re-verified for `N=6` in its own spec 22), so nothing here is blocked on backend work.

## Context

Both call sites hardcode the literal `3` in two places each — the fetch URL and the display label:

- `components/(main)/Spending/SpendingTrendChart.tsx:37` — `useFetchData<TSpendingTrend>(["spending","trend",bikeId], \`/bikes/${bikeId}/spending-summary/trend?months=3\`)`
- `components/(main)/Spending/SpendingTrendChart.tsx:54` — label text `"Spending, last 3 months"`
- `components/(main)/Mileage/MileageTrendTab.tsx:26` — `useFetchData<TMileageTrend>(["mileage","trend",bikeId], \`/bikes/${bikeId}/mileage/trend?months=3\`)`
- `components/(main)/Mileage/MileageTrendTab.tsx:38` — label text `"Distance, last 3 months"`

Per spec 13's own Design notes, the 3-month window was a deliberate fixed value with "no UI selector for this pass" — this spec doesn't add a selector, it just moves the fixed value from 3 to 6, per the same reasoning (not yet asked for, don't add speculative complexity).

`TSpendingTrend`/`TMileageTrend` (in each domain's `type/*.types.ts`) are already generic over `monthlySummary`'s array length — no type changes needed. The donut/pie chart in `SpendingTrendChart.tsx` already derives from `monthlySummary[monthlySummary.length - 1].categoryBreakdown` (the *latest* month), which is unaffected by the window widening beyond that "latest" entry now being 6 months in instead of 3.

## Design

Four literal-value edits, no structural changes:

| Path | Action | Notes |
| --- | --- | --- |
| `components/(main)/Spending/SpendingTrendChart.tsx` | Modify | `?months=3` → `?months=6` (line 37); label → `"Spending, last 6 months"` (line 54). |
| `components/(main)/Mileage/MileageTrendTab.tsx` | Modify | `?months=3` → `?months=6` (line 26); label → `"Distance, last 6 months"` (line 38). |

**Chart legibility at 6 bars**: both `BarChart`s already use Recharts' `ResponsiveContainer width="100%"` (per spec 13's mobile-first convention), so the bar width auto-scales to fit however many bars are rendered — no layout code changes needed on that basis alone. The one open risk is the X-axis month labels (`"MMM"`-formatted, e.g. `"Aug"`) potentially crowding or overlapping at narrow (~390px) viewport width with 6 labels instead of 3. Don't preemptively add tick-angling or font-size overrides — verify visually first (see Verify below) and only adjust if an actual overlap shows up.

No changes to `type/spending.types.ts`, `type/mileage.types.ts`, `Spending.tsx`, or `Mileage.tsx` — the `"trend"`/`"trends"` tab wiring from spec 13 is untouched, only the two chart components' internals change.

## Implementation

1. [ ] `SpendingTrendChart.tsx:37` — change `?months=3` to `?months=6` in the `useFetchData` URL.
2. [ ] `SpendingTrendChart.tsx:54` — change the label text to `"Spending, last 6 months"`.
3. [ ] `MileageTrendTab.tsx:26` — change `?months=3` to `?months=6` in the `useFetchData` URL.
4. [ ] `MileageTrendTab.tsx:38` — change the label text to `"Distance, last 6 months"`.
5. [ ] Run `yarn build` / `yarn lint`.
6. [ ] Manually load both the Spending "Trend" tab and Mileage "Trends" tab in a browser at a phone-width viewport (~390px, per this project's mobile-first convention) and confirm 6 bars render with readable, non-overlapping month labels. If labels crowd, prefer shrinking the axis tick font-size or rotating labels over removing bars — but only if the crowding is actually observed.
7. [ ] Add a note to `context/progress-tracker.md` recording the window change from 3 to 6 months (don't rewrite spec 13's own frozen Design text describing "fixed at 3" — that's a historical record of what spec 13 shipped; this spec's own file plus the progress tracker are the record of the change).

## Dependencies

`bikelog_server` already supports `?months=` values up to 24 (spec 15) — no backend change is a prerequisite. `bikelog_server` spec 22 (re-verifying the trend endpoints specifically at `months=6`) is a parallel, not blocking, change — this client spec can be built and tested against the already-live endpoint without waiting on it.

## Verify

- [ ] Spending "Trend" tab renders 6 bars covering the current month and the prior 5, and the header reads "Spending, last 6 months".
- [ ] Mileage "Trends" tab renders 6 bars, header reads "Distance, last 6 months".
- [ ] The category-breakdown donut still reflects only the single most recent (now 6th) month's data — unaffected by the window widening, still exactly one `useFetchData` call per chart (no second network request introduced).
- [ ] `yarn build` / `yarn lint` clean, no new warnings in either touched file.
- [ ] Visual check at ~390px width: 6 bars and their month-abbreviation labels don't overlap or get clipped.
