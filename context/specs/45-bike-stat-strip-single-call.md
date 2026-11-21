# 45 — Bike hub stat strip: consume the aggregated `/stat-strip` endpoint

**Status**: 📝 Planned (web code not written). Web half of the stat-strip consolidation. Mirrors app spec **74** and consumes `bikelog_server` spec **68** (`GET /bikes/:bikeId/stat-strip`), which is additive and must be deployed (or reachable via `NEXT_PUBLIC_API_BASE_URL`) before the strip shows values. Pure web-client render/data-source change — nothing flows back to the server or app.

---

## Goal

The bike-detail hub (`components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx`) renders a per-bike summary stat strip (desktop `HubStat` tiles + mobile odometer-card grid). Four of its on-mount GETs exist only to compute strip scalars, and the component reproduces the same client-side math the app has:

- `GET /bikes/:bikeId/mileage` → `getAvgMileage(history)` (avg of ≤5 recent full-tank periods, else `approximate`)
- `GET /bikes/:bikeId/spending-summary?period=month&targetMonth=…` → "Spent in <month>"
- `GET /bikes/:bikeId/spending-summary?period=lifetime` → lifetime spend
- `GET /bikes/:bikeId/engine-oil-logs/status` → on-this-oil km, oil life %
- `costPerKm = lifetimeSpend / (currentOdometer − initialOdometer)` (derived in-component)

Replace those **four fetches and the two client-side computations** with a **single** call to the new aggregated endpoint, which returns the finished scalars. One component → one call for its stat scalars, same tiles, same numbers.

## Design

Single file: `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx`.

### Endpoint & shape (server spec 68)

`GET /bikes/:bikeId/stat-strip?targetMonth=YYYY-MM` →

```ts
// components/(main)/Bike/type/bike.types.ts  (new)
export type TBikeStatStrip = {
  avgMileageKmPerLiter: number | null;
  monthSpending: number;
  lifetimeSpending: number;
  costPerKm: number | null;    // null when odometer delta <= 0
  oil: {
    kmSinceChange: number | null; // null ⇔ no oil change on record
    percentUsed: number | null;
  };
};
```

### Fetch (`BikeDetailPage.tsx`)

- **Add** one `useFetchData<TBikeStatStrip>(["bike-stats", bikeId], \`/bikes/${bikeId}/stat-strip?targetMonth=${targetMonth}\`, { enabled: !!bikeId })` — keep the existing `targetMonth = format(now, "yyyy-MM")` the month tile already computes, so label and value stay aligned.
- **Remove** these four `useFetchData` calls (lines ~137–170) and their now-unused imports/types (`TMileageHistoryResponse`, `TSpendingSummary`, `TEngineOilStatus` where only the strip used them):
  - `["mileage","history",bikeId]` → `/mileage`
  - `["spending",bikeId,"month",targetMonth,""]`
  - `["spending",bikeId,"lifetime","",""]`
  - `["engineOilStatus",bikeId]`
- **Delete** the in-component computations: `getAvgMileage(history)` (lines ~64–89) and the `costPerKm` block (lines ~279–287).
- **Render** tiles straight off the scalar object:
  - Avg mileage ← `avgMileageKmPerLiter` (`—` when null).
  - "Spent in <month>" ← `monthSpending`.
  - Cost/km ← `costPerKm` (`—` when null).
  - On-this-oil km ← `oil.kmSinceChange`; oil life % ← `oil.percentUsed` — **render each only when `!= null`** (a `0` is a real value and must show; it means a fresh change, not "no record").

### Why these three calls are untouched

Keep as-is — they feed other parts of the hub, not the scalar strip:
- `["bikes", bikeId]` → `/bikes/:bikeId` — the bike itself (header/facts, odometer display, and `initialOdometer`/`currentOdometer` the hub shows elsewhere).
- `["mileage","lifetime",bikeId]` → `/mileage/lifetime` — the **"Lifetime distance"** tile (a distinct figure from the odometer-delta `costPerKm` denominator; not part of spec 68's scalars).
- `["fuelLogs",bikeId,"recent"]` → `/fuel-logs?page=1&limit=5&sort=-date` — the "Recent fill-ups" table, not a scalar.

### Freshness / invalidation

The removed keys were kept fresh by `staleTime: 0` refetch-on-mount plus the drill-down screens' own invalidations. The new `["bike-stats", bikeId]` key shares no prefix with existing mutation invalidations. On the web the hub is its own route (navigating in remounts and refetches), so the staleness window is smaller than the app's — but to keep in-page actions fresh, add `["bike-stats"]` to the `invalidateQueriesKeys` of any hub-level mutation that changes a strip input (fuel/oil/service/maintenance/accessory-purchase/odometer forms) **if** such a mutation exists on this page. If the hub has no in-page log-create mutations (logs are created on the drill-down routes), refetch-on-mount covers it and no invalidation edit is needed — confirm during the browser pass.

## Scope

- `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` — swap four fetches + two computations for one fetch; render scalars.
- `components/(main)/Bike/type/bike.types.ts` — add `TBikeStatStrip`.
- No new dependency. No server change (consumes spec 68). No app change (app spec 74 is its own repo). Possibly one invalidation-array edit if a hub-level log mutation exists (see Freshness).

## Cascade

Web-only, data-source + render change. Nothing flows back to `bikelog_server` or `bikelog_app`. The server endpoint (spec 68) and app consumer (spec 74) are tracked in their own repos.

## Verify

- `npx tsc --noEmit` clean.
- `eslint` on the touched files clean.
- Contract check: `TBikeStatStrip` matches server spec 68's response `data` shape field-for-field.
- **Browser pass owed** (phone-width + desktop viewport):
  - Open a bike hub; Network shows **one** `/stat-strip` request in place of the four removed ones; the untouched three (`/bikes/:id`, `/mileage/lifetime`, recent `/fuel-logs`) still fire.
  - Every strip tile matches the pre-change values for the same bike.
  - A bike with no oil change hides the two oil tiles; a bike with a fresh change at current odometer shows `0 km` / `0% used`.
  - A bike with `currentOdometer == initialOdometer` shows `—` for cost/km.
  - "Lifetime distance" and "Recent fill-ups" still render (proving the kept calls weren't removed).
