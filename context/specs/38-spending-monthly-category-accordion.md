# 38 — Spending: Month tab category accordions

**Status**: 📝 Plan only — written 2026-11-09. App-parity catch-up. Mirrors `bikelog_app` spec **62**. Server half — `bikelog_server` spec **60** (`GET /bikes/:bikeId/spending-summary/monthly-breakdown`) — is **already implemented and deployed**. Pure web-client build.

---

## Goal

On the Spending page’s **Month** tab, turn each static category row (swatch · name · amount · bar · %) into an **accordion** that expands to that category’s line-item **records** — so the rider can see *which* logs made up a category’s total (e.g. Fuel → `12 Nov · 2L @ ৳100/L · ৳200`, `18 Nov · 3L @ ৳100/L · ৳300`) without leaving the page. **Month tab only** — Year, Lifetime and Trend are untouched by this spec.

## Design

- The top **Total panel** stays exactly as `SpendingSummaryView` renders it today (including the `৳… / day · over N days this month` column), so the top of the Month tab is visually unchanged.
- Each category becomes a card: **collapsed** shows everything the old row showed (swatch · name · total · proportional bar · %) **plus a chevron**; **expanded** (click anywhere on the header) reveals the records.
- A kicker reading **`BY CATEGORY · CLICK TO EXPAND`** makes the affordance discoverable.
- No client-side grouping or summing — the server returns categories already bucketed with records nested and summed. The only derived figure is `%` (`total / totalSpending`), computed as `SpendingSummaryView` already does.
- Reuse `categoryColor`, `formatTaka` and the swatch/bar styling already exported from `SpendingSummaryView.tsx`.

### Endpoint & shape (server spec 60)

`GET /bikes/:bikeId/spending-summary/monthly-breakdown?targetMonth=YYYY-MM` →

```ts
type TSpendingRecord = {
  date: string; category: string; description: string; amount: number;
  vendor: string | null; remarks: string | null;
  source: "fuel" | "maintenance" | "accessory" | "oil";
  liters: number | null;
};
type TSpendingCategoryGroup = { category: string; total: number; records: TSpendingRecord[] };
type TMonthlyCategoryBreakdown = {
  period: "month"; targetMonth: string; totalSpending: number;
  categories: TSpendingCategoryGroup[];
};
```

## Implementation

1. **Types** — add `TSpendingRecord`, `TSpendingCategoryGroup`, `TMonthlyCategoryBreakdown` to `components/(main)/Spending/type/spending.types.ts`.
2. **`MonthlySpendingBreakdown.tsx`** (new, in `components/(main)/Spending/`):
   - Props: `{ totalSpending, categories, periodLabel, avgDailyExpense?, daysElapsed? }` (+ loading/error/retry, like `SpendingSummaryView`).
   - Renders the same **Total panel** + per-day column as `SpendingSummaryView`, then the kicker, then the category **accordions**.
   - **Open state**: `Record<categoryName, boolean>`, closed by default, **reset whenever `targetMonth` changes** (a `useEffect` on the month) so one month’s open rows never carry into another.
   - **Collapsed header**: swatch · name · total · chevron, with the thin proportional bar + `%` under it (bar width `total / max`, `%` = `total / totalSpending`). Clicking the header toggles.
   - **Expanded body**: the category’s `records`, newest-first, each row = `date` (`dd MMM`) · `description` (the server’s pre-built line) · `amount`, with an optional secondary line for `vendor ?? remarks` when present.
   - **Dates**: render record dates via the same UTC-safe path the rest of the client uses for date-only API fields — parse as a plain calendar date, not `new Date(iso)` in local time, to avoid the midnight off-by-one.
3. **`Spending.tsx` — Month branch only**:
   - When `period === "month"`, fetch `monthly-breakdown` (shape `TMonthlyCategoryBreakdown`) under a **distinct cache key** `["spending", bikeId, "month-breakdown", targetMonth]` and render `MonthlySpendingBreakdown`. Year/Lifetime keep `SpendingSummaryView`; Trend keeps `SpendingTrendChart`.
   - Feed `avgDailyExpense`/`daysElapsed` from `breakdown.totalSpending` (same `getElapsedDaysInMonth` math already in the file).
   - Empty month → keep the existing `Nothing spent in <Month>` empty state (not an empty accordion list).
   - **PDF export is unchanged** — it still calls `/spending-summary/details`.

### Hazards

- **H-A — distinct cache key.** Do **not** reuse `["spending", bikeId, "month", targetMonth]`; that key is owned elsewhere (the summary shape) and reusing it collides two differently-shaped queries. The new key stays under the `["spending", bikeId]` prefix every mutation invalidates, so the accordion still refreshes when a fuel/maintenance/oil/accessory log is written.
- **H-B — render only.** No re-grouping a flat array, no summing; `%` is the one derived figure.

## Dependencies

No new packages. Uses existing `@tanstack/react-query` (via `hooks/useApi`), `date-fns`, `lucide-react` (`ChevronDown`), and the helpers exported from `SpendingSummaryView.tsx`.

## Verify

- [ ] Month tab on a month with fuel + accessories: the Total panel is unchanged; categories render as cards with chevrons, ordered by total desc.
- [ ] Clicking a category expands it to that category’s records (date · description · amount), newest-first; clicking again collapses.
- [ ] The reported example: a Fuel category expands to `12 Nov … ৳200` / `18 Nov … ৳300` style rows.
- [ ] Maintenance shows its parts/notes line; accessory shows item names; engine oil shows the oil type.
- [ ] Stepping to another month collapses all open rows.
- [ ] An empty month shows the existing `Nothing spent in <Month>` empty state.
- [ ] Year / Lifetime / Trend tabs are visually and behaviourally unchanged by this spec.
- [ ] Adding a fuel log refreshes the accordion totals (cache-prefix invalidation).
- [ ] Against a pre-spec-60 server the Month tab shows a working error/retry state (no crash).
- [ ] `yarn build` (tsc) and `yarn lint` clean.
