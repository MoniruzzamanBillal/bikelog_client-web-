# 29: Update odometer from Settings (web side)

Status: ✅ Complete — implemented and browser-verified 2026-10-03.

Web half of a three-repo feature. Depends on `bikelog-server/context/specs/44-manual-odometer-update.md` (✅ implemented 2026-10-03, server commit `9fb3627`; deploy it before shipping this client). App counterpart: `bikelog_client(app)/ai context/specs/47-settings-update-odometer.md` (parity feature — keep behaviour and wording identical).

---

## Goal

Add an **Odometer** section to the Settings page where the rider enters their latest odometer reading for a bike, without logging a fuel fill-up or a maintenance entry.

Today the web client only sends an odometer when creating a bike (`components/(main)/Bike/schema/bike.schema.ts` has the `currentOdometer` rule); `TUpdateBikePayload` omits it, and the server's `PATCH /bikes/:id` ignores it.

## Design

Settings lives at `app/(main)/settings/catalog/page.tsx` → `components/(main)/SettingsCatalog/Catalog.tsx`, which composes `MaintenanceTypeSection` and `EngineOilTypeSection`. The new `OdometerSection` is added **above** those two.

### UX

- Card titled **"Odometer"**, subtitle "Set your bike's latest reading".
- More than one bike → a bike `Select` (default: first bike, or the bike the user last viewed if the app already tracks one). One bike → show its nickname only.
- Helper text **"Current: 12,345 km"** from the bikes query.
- Number input "New odometer reading (km)" and a primary "Update odometer" button (disabled while pending).
- No bikes → "Add a bike first" message.

### Behaviour

- Form: ~~react-hook-form + zod~~ → **implemented with plain `useState` + manual checks** (see Deviations); originally planned to follow `components/(main)/Bike/schema/bike.schema.ts`. Schema: `currentOdometer` is a required number, `>= 0`; plus a refine `>= current` using the selected bike's current reading.
- Mutation: `usePatch` (`hooks/useApi.ts`) → `PATCH /bikes/:id/odometer`. Invalidate the bikes list, the single-bike query and the reminders query. **Copy the exact query keys** from `components/(main)/MaintenanceLog/RemindersBanner.tsx` and the Bike components rather than guessing.
- Success: `sonner` toast "Odometer updated"; reset the form.
- Error: check whether `utils/axiosInstance.ts` already toasts API errors before adding a toast in the `catch`, so a failure shows **one** message (the app client had a double-toast bug here — see app spec 45).

### Why this is safe for existing pages

`currentOdometer` is only read for display and "overdue by" math (`BikeCard`, `RemindersBanner`). Mileage and spending use fuel-log readings. Details in server spec 44.

---

## Implementation

### Progress checklist

- [x] 1. Types (`TUpdateOdometerPayload`)
- [x] 2. `OdometerSection.tsx`
- [x] 3. Wire into `Catalog.tsx`
- [x] 4. Verification (`tsc`, `yarn lint`, `yarn build`, behaviour checked)
- [x] 5. Docs (tracker, build plan, spec status)

1. `components/(main)/Bike/type/bike.types.ts` — add `export type TUpdateOdometerPayload = { currentOdometer: number };`.
2. New `components/(main)/SettingsCatalog/OdometerSection.tsx`, modelled on the sibling `MaintenanceTypeSection.tsx` / `EngineOilTypeSection.tsx` (same card, input, button and table-free layout; reuse the existing `components/shared/input` controlled inputs and `components/shared/PrimaryButton`).
3. `components/(main)/SettingsCatalog/Catalog.tsx` — render `<OdometerSection />` first.
4. No route, layout or navigation changes.

## Not changing

- Bike create/edit modal and its schema.
- Fuel-log and maintenance-log pages.

---

## Test plan

Static: `tsc`, `yarn lint`, `yarn build` (Next 16) clean.

Manual (server spec 44 deployed):

1. One bike vs. several bikes — selector behaviour.
2. Higher value → toast; dashboard bike card and reminders banner reflect it after invalidation.
3. Lower value → blocked by form validation; server 400 path shows a single toast.
4. Empty / non-numeric / negative → validation messages.
5. Fuel log afterwards → mileage pages unchanged.
6. Phone-width layout (~375px): no horizontal scroll, since this app is phone-first.

---

## Deviations (as built)

1. **Plain `useState`, not react-hook-form + zod.** Every sibling Settings section (`MaintenanceTypeSection`, `EngineOilTypeSection`) uses plain state, and `CLAUDE.md` reserves zod for login/register only. The rules the spec lists (required, `>= 0`, `>= current`) are all checked in `handleSubmit`.
2. **Native `<select>`** styled with `catalogInput` for the bike picker — `ControlledSelectField` needs an RHF form.
3. **Cache keys are prefixes**: `usePatch([["bikes"], ["reminders"]])` covers `["bikes", bikeId]` and `["reminders", bikeId]` without needing the id at hook-creation time.

## Verification results

`tsc --noEmit` clean · `yarn lint` 0 errors (5 known warnings) · `yarn build` clean · headless Chrome 13/13 at 390×844 against a throwaway local server (details in `progress-tracker.md`).
