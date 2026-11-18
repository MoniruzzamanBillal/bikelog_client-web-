# 43 — Spending Lifetime tab: drill a year into its months

**Status**: ✅ Complete — 2026-11-18 (code; browser pass owed). App-parity catch-up. Mirrors `bikelog_app` spec **72**. Server half — `bikelog_server` spec **64** (`GET /bikes/:bikeId/spending-summary/period-breakdown?period=lifetime`) — is **already implemented and deployed**; it nests each lifetime year bucket's per-month breakdown in a `children` array. Pure web-client render change. Builds directly on web spec 39's `PeriodSpendingBreakdown`.

---

## Goal

The Lifetime tab already renders **category → per-year** rows (web spec 39). This adds the **second** level: **year → per-month**, with the per-year view kept exactly as it is.

- On the **Lifetime** tab, a category expands to its years (unchanged), and each year row — which now carries month `children` from the server — becomes tappable and drills down to `Jan 3.3L ৳650`-style month rows.
- On the **Year** tab, nothing changes: its buckets are already months and the server sends `children: null`, so every bucket stays a plain, non-tappable leaf.

## Design

`PeriodSpendingBreakdown.tsx` is shared by the Year and Lifetime tabs, so the whole change lives there plus one type field.

### Endpoint & shape (server spec 64)

Same endpoint as web spec 39; the lifetime response now nests months:

```ts
type TSpendingPeriodBucket = {
  key: string; // "2026" (year) | "2026-01" (month)
  label: string; // "2026" | "Jan" — pre-formatted server-side, render raw
  total: number;
  liters: number | null;
  children?: TSpendingPeriodBucket[] | null; // spec 64: a lifetime year's months (Jan→Dec)
};
```

### Render (`PeriodSpendingBreakdown.tsx`)

- Add a second expansion state, `expandedBuckets`, keyed `"category:bucketKey"` (unique across categories).
- **No reset effect.** The caller (`Spending.tsx`) already passes a `key` that remounts the component on a period change, which collapses both the category-level `open` state and `expandedBuckets` together — the same mechanism the existing `open` state relies on (the Year tab uses `key={`year-${targetYear}`}`, Lifetime uses a stable `key="lifetime"`).
- A bucket row is **drill-capable iff** `children` is a non-empty array. When it is, the row becomes a `<button>` with a trailing chevron and, when open, renders its months indented beneath it (a hairline `border-l` rail; each month row is `label · litres(fuel only) · ৳amount`).
- A bucket **without** `children` renders exactly as before — a plain, non-tappable row. The grid gained a trailing 14px chevron slot so a leaf row and a drill row keep the same amount-column alignment.

### Why the Year tab is untouched

`PeriodSpendingBreakdown` is also the Year tab's view, where buckets are already months and the server sends `children: null`. The entire second level is gated on `children` being a non-empty array, so on the Year tab every bucket stays a plain leaf row — no behaviour change there, by construction.

## Scope

- `components/(main)/Spending/type/spending.types.ts` — add `children?: TSpendingPeriodBucket[] | null` to `TSpendingPeriodBucket`.
- `components/(main)/Spending/PeriodSpendingBreakdown.tsx` — the `expandedBuckets` state and the drill-capable bucket render.

No new query (same endpoint), no new dependency, no server or app change.

## Cascade

Web-only, render-only. The server already sends the field; the app already ships the feature (spec 72). Nothing flows back to either.

## Verify

- `npx tsc --noEmit` — clean.
- `eslint` on both touched files — clean.
- Contract: web's lifetime query hits `period-breakdown?period=lifetime`, the exact endpoint server spec 64 fills with nested `children`.
- **Browser pass owed** (not yet run): on the Lifetime tab, expand a category → the year rows show a chevron and drill into month rows; on the Year tab, buckets remain plain leaves with no chevron.
