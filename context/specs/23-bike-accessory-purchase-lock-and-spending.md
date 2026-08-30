# 23: Bike Accessory Purchase Lock + Price-Required Validation (client for backend spec 25)

Status: ✅ Complete

## Goal

Client-side counterpart to `bikelog_server`'s spec 25. The backend added two new business rules to `bikeAccessory`:

1. Once an accessory's `status` becomes `"purchased"`, it's a **permanent, one-way lock** — the API rejects any further status change with `400`.
2. `price` is **required** the instant `status` becomes `"purchased"` — the API rejects the write with `400` otherwise.
3. `purchaseDate` is a new, fully server-computed field (stamped automatically, never client-sent) — no new form field needed on this client.

This client already has a complete, working `BikeAccessory` feature (spec 12) — this is a small, additive update to it: mirror both new rules in the UI so the user gets a clear, fast, client-side error instead of a round-tripped `400`, and disable the status field once it's locked so there's no confusing "why didn't my change save" moment.

## Context

- `components/(main)/BikeAccessory/schema/bike-accessory.schema.ts`'s `price` field was already optional with no cross-field "required if purchased" rule.
- `components/(main)/BikeAccessory/BikeAccessoryFormModal.tsx`'s status `ControlledSelectField` had no way to be disabled — `disabled` didn't exist as a prop on that shared component at all.
- `components/(main)/BikeAccessory/type/bike-accessory.types.ts`'s `TUpdateBikeAccessoryPayload` was missing `price` even though the backend already accepted it on update — a small pre-existing gap, fixed in passing while touching this file.

## Design

**`bike-accessory.schema.ts`** — added a `.superRefine` (first use of this Zod API in this codebase) requiring `price` whenever `status === "purchased"`, mirroring the backend's own rule exactly:
```ts
.superRefine((data, ctx) => {
  if (data.status === "purchased" && !data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["price"],
      message: "Price is required when marking an accessory as purchased",
    });
  }
});
```

**`components/shared/input/ControlledSelectField.tsx`** — added a `disabled?: boolean` prop (mirroring `ControlledCheckbox.tsx`'s existing precedent), wired straight to Radix's `<Select disabled={disabled}>` root — Radix propagates the disabled state to `SelectTrigger` automatically, and the trigger's existing Tailwind classes already had `disabled:cursor-not-allowed disabled:opacity-50` variants ready and unused until now.

**`BikeAccessoryFormModal.tsx`**:
- `isStatusLocked = isEditMode && accessory?.status === "purchased"` → passed to the status `ControlledSelectField`'s new `disabled` prop, plus a small "Status is locked once purchased." helper line rendered underneath when locked.
- `watchedStatus = methods.watch("status")` → the Price field's `isRequired` prop is now `watchedStatus === "purchased"` (shows the red asterisk conditionally, matching the schema rule).

**`BikeAccessoryCard.tsx`** — added an optional purchase-date line (`accessory.status === "purchased" && accessory.purchaseDate`), formatted via `toLocaleDateString()`, shown under the badge row.

**`bike-accessory.types.ts`** — added `purchaseDate?: string` (output-only) to `TBikeAccessory`, and `price?: number` to `TUpdateBikeAccessoryPayload` (closing the small pre-existing gap noted in Context).

No changes needed to `onSubmit`'s payload-building logic — `purchaseDate` is never sent, and `price`/`status` were already included in the existing `basePayload`.

## Implementation

1. ✅ `type/bike-accessory.types.ts` — `purchaseDate?: string` on `TBikeAccessory`; `price?: number` added to `TUpdateBikeAccessoryPayload`.
2. ✅ `schema/bike-accessory.schema.ts` — `.superRefine` enforcing price-required-when-purchased.
3. ✅ `components/shared/input/ControlledSelectField.tsx` — new `disabled?: boolean` prop.
4. ✅ `BikeAccessoryFormModal.tsx` — `isStatusLocked` computed + wired to the status field + helper text; `watchedStatus` computed + wired to the price field's `isRequired`.
5. ✅ `BikeAccessoryCard.tsx` — optional purchase-date display line.

## Dependencies

None new — `.superRefine` is a standard Zod API already available via the existing `zod` dependency; no new npm package.

## Verify

- [x] `yarn build` clean (Next.js production build, all routes compiled including `/bikes/[bikeId]/accessories`).
- [x] `yarn lint` — 0 errors. One new warning (`react-hooks/incompatible-library` on the new `methods.watch("status")` call in `BikeAccessoryFormModal.tsx`) — same exact warning class already tolerated at `MaintenanceLogFormModal.tsx:66` for an identical `watch()` call, not a new category of issue.
- [x] **Live-verified in an actual headless browser** (Playwright, via the `webapp-testing` skill — the first time this project's own progress tracker's standing "no interactive browser tool available" limitation was actually lifted for a real check) against this project's own already-running `next dev` server (port 5173) and `bikelog_server`'s own already-running `yarn dev` server (port 5000, real dev DB), using a throwaway user/bike created via direct API calls and a cookie-injected session (matching this app's real `accessToken` cookie auth via `cookies-next`):
  - Opening "Add Accessory", filling name/urgency, selecting `status: purchased`, and submitting **without** a price correctly kept the modal open and displayed "Price is required when marking an accessory as purchased" in red under the Price field — confirmed via screenshot and DOM text assertion, no API call was made (client-side block).
  - Filling in a price (`1290`) and resubmitting succeeded — a real accessory ("Crash Guard (Bumper)") appeared in the list with a green "Purchased" badge, a "BDT 1,290" price badge, and a "Purchased 8/29/2026" line (the new server-stamped `purchaseDate`, confirmed rendering correctly) — screenshot confirmed.
  - Reopening that same accessory for editing showed the Status field visually disabled (greyed out, showing "Purchased") with "Status is locked once purchased." displayed underneath — confirmed via screenshot and the trigger's `data-disabled` DOM attribute being present.
  - Navigating to that bike's Spending page (`/bikes/:bikeId/spending`, period=Month, August 2026) showed **Total Spending ৳1,290** with an **Accessories ৳1,290** row under "By Category" (alongside "Fuel ৳0") — confirmed via screenshot, closing the loop on the actual user complaint this whole spec chain (`bikelog_server` spec 25 + this spec) was built to fix.
  - One pre-existing, unrelated console warning was observed during this pass (a dark-mode `className="dark"`/`style={{color-scheme:"dark"}}` SSR/CSR hydration mismatch on `<html>`) — present on every page load in this app, not caused by or related to any file this spec touched.
  - All test fixtures (1 throwaway user, 1 bike — soft-deleted via the app's own `DELETE /bikes/:id` first, then the user hard-deleted via a temporary `bikelog_server`-side script reusing its own `config`/`mongoose.connect`, matching that project's established cleanup pattern) were removed afterward.
