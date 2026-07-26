# 13: Spending & Mileage Trend Charts

Status: ✅ Complete

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

`MileageTrendTab.tsx` (new, in `components/(main)/Mileage/`, following the existing tab-component convention of `MonthlyMileageTab.tsx` etc. — same prop shape `{ bikeId: string }`): `useFetchData<TMileageTrend>(["mileage", "trend", bikeId], \`/bikes/${bikeId}/mileage/trend?months=3\`)`. Renders a Recharts `LineChart`/`BarChart`of`totalDistanceKm`per`targetMonth`.

**No new route** — both features fold into the existing `app/(main)/bikes/[bikeId]/spending/page.tsx` and `.../mileage/page.tsx` pages as a new tab/period value; neither page file needs to change (they already just render `<Spending />`/`<Mileage />` with no props).

**Months window is fixed at 3, no UI selector** for this pass — matches the confirmed default and avoids adding a control that isn't yet asked for; the backend already accepts an arbitrary `?months=` value if a selector is wanted later.

## Implementation

1. ✅ Added `recharts` (v3.10.1) to `package.json` via `yarn add recharts`.
2. ✅ `components/(main)/Spending/type/spending.types.ts` — added `TMonthlySpending` and `TSpendingTrend`.
3. ✅ `components/(main)/Spending/SpendingTrendChart.tsx` — new component: a Recharts `BarChart` of `totalSpending` per `targetMonth`, plus a `PieChart` donut of the most recent month's `categoryBreakdown`, both using the app's existing `--color-chart-1`..`5` CSS tokens from `globals.css` rather than inventing new colors. X-axis ticks and tooltip labels are formatted from the raw `"YYYY-MM"` value to `"MMM"`/`"MMM yyyy"` (e.g. `"May"` / `"May 2026"`) via `date-fns`, per direct user feedback after first seeing the raw `"2026-05"` value on the axis — same formatting applied to `MileageTrendTab.tsx`'s chart for consistency.
4. ✅ `components/(main)/Spending/Spending.tsx` — added `"trend"` to `TPeriod`, added the fourth pill button, branched rendering to `SpendingTrendChart` when active (month/year picker controls and the single-period `useFetchData` call already naturally excluded `"trend"` — it matched none of their existing conditions, no extra logic needed).
5. ✅ `components/(main)/Mileage/type/mileage.types.ts` — added `TMileageTrend`, reusing the existing `TMonthlySummary` type for its array entries.
6. ✅ `components/(main)/Mileage/MileageTrendTab.tsx` — new component per Design above: a Recharts `BarChart` of `totalDistanceKm` per `targetMonth`.
7. ✅ `components/(main)/Mileage/Mileage.tsx` — added the `"trends"` tab entry and render branch.

## Dependencies

`bikelog_server` spec 15 (the two new trend endpoints) must be deployed/available before this can be exercised against real data — can be built against a local `bikelog_server` in the meantime. (Spec 15 is already implemented and was live on the local dev server used for verification below.)

## Verify

- [x] `yarn build` / `yarn lint` clean. `yarn build` succeeds (production build, full type-check, all 8 routes including `/bikes/[bikeId]/spending` and `/bikes/[bikeId]/mileage` compile); `yarn lint` exits 0 with only the same 5 pre-existing warnings (none new, none in the touched files).
- [x] Spending page: Trend tab loads, bar chart renders 3 months, donut reflects the most recent month's category breakdown, no second network request beyond the one trend fetch. Verified the real backend response directly (`curl .../spending-summary/trend?months=3` against a running `bikelog_server`) matches `TSpendingTrend` field-for-field; `SpendingTrendChart` makes exactly one `useFetchData` call and derives the donut's data from `monthlySummary[monthlySummary.length - 1].categoryBreakdown` already present in that same response — no second fetch by construction (code-reviewed, not click-tested — no interactive browser tool in this environment, same standing limitation as every prior spec in this project).
- [x] Mileage page: Trends tab loads, chart renders 3 months of distance data. Same live-data confirmation via `curl .../mileage/trend?months=3`, matching `TMileageTrend` exactly.
- [x] Both charts handle the empty-data case (a bike with no logs in the window) without crashing — zero-valued bars/points, not a blank error state. Confirmed directly against real data: the test bike's May/June 2026 trend entries came back as `{totalSpending: 0, categoryBreakdown: [{category: "Fuel", total: 0}]}` / `{totalDistanceKm: 0, ...}` (backend spec 15 always returns exactly `months` entries, never omits a zero-activity month), so `BarChart` renders a zero-height bar for those months and the pie's single `{category: "Fuel", total: 0}` entry renders an empty ring rather than an empty/error state — no `monthlySummary.length === 0` case exists per the backend's own contract, so no additional guard was needed beyond the `?? []` defaults already in place for the loading/undefined-data window.
- [x] Switching between period/tab values re-fetches correctly and doesn't leave a stale chart from a previously selected bike when navigating between bikes. Both new components include `bikeId` in their `useFetchData` query key (`["spending", "trend", bikeId]` / `["mileage", "trend", bikeId]`), matching every other query key in both files — TanStack Query's key-based caching means a `bikeId` change is a different cache entry, not stale data carried over; this is the same mechanism already relied on and verified by every prior spec's own bike-scoped queries in this codebase, not new behavior introduced here.
- [x] Usable at ~390px width (charts don't overflow or get clipped on a phone-width viewport). Both chart containers use `w-full` + Recharts' `ResponsiveContainer width="100%"`, matching this app's mobile-first convention everywhere else (`CLAUDE.md`'s "Mobile-first Tailwind" note) — code-reviewed against that established pattern, not visually confirmed in a real narrow viewport (no interactive browser tool available, same standing limitation noted throughout this project's progress tracker).

Also confirmed live against the running dev server (`localhost:5173`, the project's own already-running instance — a different, unrelated Next.js app was found squatting on the default port 3000 during verification and was left untouched): `GET /bikes/:bikeId/spending` and `GET /bikes/:bikeId/mileage` both return `200` with no server error and behave identically (empty pre-hydration shell, gated client-side) to the already-verified `/dashboard` route, for both an unauthenticated request and one with a valid minted session cookie — confirming the two touched pages register and serve without a build/runtime crash. The dev server's own error log showed only a generic Next.js-internal hydration warning tied to its `RedirectErrorBoundary`/dev-overlay machinery (present for `/login` and a `/bikes/...` navigation alike), unrelated to `recharts` or any file this spec touched.
