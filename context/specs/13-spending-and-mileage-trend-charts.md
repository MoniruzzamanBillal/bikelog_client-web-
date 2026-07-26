# 13: Spending & Mileage Trend Charts

Status: 🔲 Proposed (not started)

## Goal

Add a "Trend" view to both the Spending and Mileage pages showing the last few months of data as a chart, instead of only single-period totals/cards. This is v2 scope (`../../../v2-proposed-features/01-charts-trends.md`) — v1 deliberately had no charting anywhere ("no charting library chosen" was an explicit v1 scope decision, not an oversight).

## Context

Backend contract (implemented in `bikelog_server`'s spec 15, `context/specs/15-spending-and-mileage-trend-endpoints.md`):

- `GET /bikes/:bikeId/spending-summary/trend?months=3` → `{ months, monthlySummary: [{ targetMonth, totalSpending, categoryBreakdown: [{category, total}] }] }`
- `GET /bikes/:bikeId/mileage/trend?months=3` → `{ months, monthlySummary: [{ targetMonth, totalDistanceKm, totalLitersConsumed, fuelLogCount }] }`

Both are rolling N-month windows ending at the current month (not calendar-year-bound), default `months=3`.

**Note on this codebase's actual current structure** (confirmed directly against the code, not assumed from older specs in this folder): there is **no `components/feature/<domain>/` + `use<Domain>.ts` hook-wrapper layer** — that pattern from specs 01–08 was superseded. The real, current structure is `components/(main)/<Domain>/` with components calling `useFetchData`/`usePost`/etc. from `hooks/useApi.ts` **directly**, no domain-specific hook wrapper. This spec follows the current structure, not the older `components/feature/spending/useSpendingSummary.ts` pattern spec 08 describes.

No charting library is installed (`package.json` confirmed clean of recharts/chart.js/visx/nivo). This spec adds **Recharts** (confirmed React 19 / Next.js 16 compatible; composable `BarChart`/`LineChart`/`PieChart` components fit the three chart shapes needed here without a config-object API).

## Design

**Spending** (`components/(main)/Spending/Spending.tsx`): this file currently holds `TPeriod = "month" | "year" | "lifetime"` as local state, a pill-button row to switch it, and one `useFetchData` call shaped for a single period's response. Add `"trend"` as a fourth `TPeriod` value and a fourth pill button (same inline button styling already used for the other three, don't extract a shared component for this alone). When `period === "trend"`:
- Exclude it from the existing `useFetchData`'s `enabled` condition (that hook/response shape is for one period, not an array) and from the month/year picker controls (neither applies).
- Render a new `SpendingTrendChart.tsx` component instead of `SpendingSummaryView`.

`SpendingTrendChart.tsx` (new, in `components/(main)/Spending/`): takes `bikeId` as a prop, does its own `useFetchData<TSpendingTrend>(["spending", "trend", bikeId], \`/bikes/${bikeId}/spending-summary/trend?months=3\`)`. Renders:
- A Recharts `BarChart` — X axis `targetMonth`, bar height `totalSpending`, one bar per month.
- A Recharts `PieChart` donut of the **most recent month's** `categoryBreakdown` (`monthlySummary[monthlySummary.length - 1].categoryBreakdown`) — this is already present in the trend response, no second network call needed to show "this month's" category split alongside the trend.

**Mileage** (`components/(main)/Mileage/Mileage.tsx`): this file already uses a cleaner, data-driven `tabs: {key, label}[]` array + one component per tab (`MileageHistoryTab`, `MonthlyMileageTab`, `YearlyMileageTab`, `LifetimeMileageTab`) — a pure addition here, no restructuring. Add `{ key: "trends", label: "Trends" }` to the `tabs` array and `"trends"` to the `TTab` union, plus a render branch `{activeTab === "trends" && <MileageTrendTab bikeId={bikeId} />}`.

`MileageTrendTab.tsx` (new, in `components/(main)/Mileage/`, following the existing tab-component convention of `MonthlyMileageTab.tsx` etc. — same prop shape `{ bikeId: string }`): `useFetchData<TMileageTrend>(["mileage", "trend", bikeId], \`/bikes/${bikeId}/mileage/trend?months=3\`)`. Renders a Recharts `LineChart`/`BarChart` of `totalDistanceKm` per `targetMonth`.

**No new route** — both features fold into the existing `app/(main)/bikes/[bikeId]/spending/page.tsx` and `.../mileage/page.tsx` pages as a new tab/period value; neither page file needs to change (they already just render `<Spending />`/`<Mileage />` with no props).

**Months window is fixed at 3, no UI selector** for this pass — matches the confirmed default and avoids adding a control that isn't yet asked for; the backend already accepts an arbitrary `?months=` value if a selector is wanted later.

## Implementation

1. Add `recharts` to `package.json`.
2. `components/(main)/Spending/type/spending.types.ts` — add `TMonthlySpending` and `TSpendingTrend` (see Context section for shape).
3. `components/(main)/Spending/SpendingTrendChart.tsx` — new component per Design above.
4. `components/(main)/Spending/Spending.tsx` — add `"trend"` to `TPeriod`, add the fourth pill button, branch rendering to `SpendingTrendChart` when active.
5. `components/(main)/Mileage/type/mileage.types.ts` — add `TMileageTrend` (reusing the existing `TMonthlySummary` type for its array entries).
6. `components/(main)/Mileage/MileageTrendTab.tsx` — new component per Design above.
7. `components/(main)/Mileage/Mileage.tsx` — add the `"trends"` tab entry and render branch.

## Dependencies

`bikelog_server` spec 15 (the two new trend endpoints) must be deployed/available before this can be exercised against real data — can be built against a local `bikelog_server` in the meantime.

## Verify

- [ ] `yarn build` / `yarn lint` clean.
- [ ] Spending page: Trend tab loads, bar chart renders 3 months, donut reflects the most recent month's category breakdown, no second network request beyond the one trend fetch.
- [ ] Mileage page: Trends tab loads, chart renders 3 months of distance data.
- [ ] Both charts handle the empty-data case (a bike with no logs in the window) without crashing — zero-valued bars/points, not a blank error state.
- [ ] Switching between period/tab values re-fetches correctly and doesn't leave a stale chart from a previously selected bike when navigating between bikes.
- [ ] Usable at ~390px width (charts don't overflow or get clipped on a phone-width viewport).
