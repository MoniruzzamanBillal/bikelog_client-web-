# Spec 35 — Fuel-log parity: mileage on the table, tank forecast, form seeding

**Status: Complete — 2026-11-08 (code + **browser-verified against the live production API**).**

Done by **explicit developer request**: "if there is anything missing in the web that are present in the app, then in the web add this … in app in fuel log card I show mileage, but in web in fuel log table I don't show the mileage. add this feature and other features which is present in the app and not present in the web." A deliberate cascade step 3 — **not** a contract break. Every field consumed here is already served by `bikelog_server` (spec 57's per-row `kmOnThisFill`/`costPerKm`, and the existing `GET /bikes/:id/mileage`), so there is **no server change** and nothing to deploy-order.

This closes three gaps between `bikelog_app`'s fuel screen and this client's.

## §A — Per-fill mileage on the fuel-log list (the named ask)

The app's `FuelLogCard` shows an accent **km/l** pill for a full-tank fill that closed a mileage period, plus a muted **`km on this tank · ৳/km`** line (its spec 60). The web list showed neither.

- **`type/fuel-log.types.ts`** — `TFuelLog` gained `kmOnThisFill?: number | null` and `costPerKm?: number | null`, mirroring the app's type. These are server-computed per LIST row (spec 57); explicit `null` on the newest fill-up (period still open) and on `GET /:id`.
- **`fuelLogColumns.tsx`** — new **Mileage** column (right-aligned) between Tank and Station. Renders the accent `42.5 km/l` pill when the row closed a period, and the muted `206 km · ৳0.79/km` line when the server sent the pair; `—` when neither. Takes a new `getMileage` accessor param alongside `getLockNote`.
- **`FuelLog.tsx`** — `getMileage(log)` matches the closed-period km/l off `historyData.exactRecords` by `endOdometer === odometerReading` (exactly as the app's `findMileageForLog` does — **not** derived client-side; only full-tank fills have one). Mobile card rows gained the km/l pill in the meta row, the per-fill line under the odometer, and the **notes** line (the app card shows notes; the web card didn't).

The km/l figure is the closed full-tank period's exact mileage; `kmOnThisFill`/`costPerKm` are a separate per-fill distance/cost and are NOT mileage.

## §B — Tank forecast card

The app shows a *"Half tank ~ 12 Nov · ~154 km to go"* forecast at the top of the fuel screen (`useTankForecast`, app spec 55). Ported verbatim:

- **`useFuelLogSeed.ts`** (new) — mirrors the app hook: fetches `["bikes", id]` and a `["fuelLogs", id, "latest"]` window (`limit=12&sort=-date`). The `limit=12` (not 1) is load-bearing — the forecast sums every fill-up back to the last full tank, and the paginated list query is unusable for it. Same cache key, so the seed still reads `result[0]`.
- **`useTankForecast.ts`** (new) — a verbatim port of the app's `deriveForecast` + `computeKmPerDay`. **This mirrors `bikelog_server` spec 52 §B by hand and must be kept mirroring it** — the server is deliberately not asked for the km/day figure (same decision as the app). All hazard guards carried over: top-ups after the anchor added back (H-B), day-granular tie-break on odometer (H-C), window-reaches-anchor degrade (H-E), floor on the optimistic distance (H-F), clamp-to-tank (H-K).
- **`TankForecastCard.tsx`** (new, `"use client"`) — same copy and all three states (range-only / past-half / live) as the app, styled with the web's `panel` + tokens. Returns `null` on `unavailable`, so a bike with no usable km/l shows no card. Rendered after `PageHeader`, before the error/table block, so it appears on all viewports.

## §C — Add-fill-up form seeding + hints

The app pre-fills a new fill-up (odometer from `currentOdometer`, price/station/full-tank from the last log) with "carried over — check before saving" hints that disappear once edited (app spec 52). The web modal started blank.

- **`FuelLogFormModal.tsx`** — new `seedFromLastLog?` / `seedOdometer?` props, **read only when `!isEditMode`**. `defaultValues` seed from them; a `useFormState` effect re-seeds when the queries resolve after mount, but only while the form is pristine (`!isDirty`), so typing is never clobbered. A seed-hint block lists the odometer note and the carried-over fields; each line disappears once its field is dirty (`dirtyFields`).
- **`FuelLog.tsx`** — calls `useFuelLogSeed(bikeId)` and passes `seed` / `odometerSeed` to the create modal only. The edit modal is never seeded.

## What is NOT in scope

- The web table omits notes by table convention (notes show on the mobile card only).
- No server or `bikelog_app` change — this is web display + forecast/seed logic over already-served data.

## Verification

`yarn lint` (0 errors; the 5 pre-existing warnings in `GenericTableComponent`/`TableToolbar` only), `tsc --noEmit` exit 0, and `yarn build` clean at 18 routes.

**Browser-verified 2026-11-08** — headless Chromium at 1440px against the live production API, logged in as a real account (the "Hornet" bike, 13 fill-ups). Confirmed:
- §A — the table shows the **Mileage** column with the km/l pill (`153.8 km/l`, `100.0 km/l`, `26.3 km/l`, …) over the per-fill `km · ৳/km` line; the newest row (3,800 km) shows the pill but no per-fill line (open period, no newer neighbour — correct), and the two fills sharing odometer 3,500 km show the pill but no `৳/km` (zero-distance pairing → `costPerKm` null, the spec 57 guard).
- §B — the **Tank forecast** card renders the live state: *"Half tank ~ 22 Nov · in 14 days · ~923 km to go"*, with `0 km since 4 Nov full tank` and `~923 km on half a tank · 153.8 km/L (exact)` plus the *Half the fuel, not the gauge.* footnote.
- §C — the Add Fuel Log modal opens pre-seeded (odometer 3,800 from `currentOdometer`, price 165 and Full Tank carried from the last log, liters blank, date today) with both hint lines showing.
- Zero console errors through the whole flow.
