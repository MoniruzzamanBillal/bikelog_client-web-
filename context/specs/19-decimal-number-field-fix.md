# 19: Decimal Number Field Fix (Odometer + Related Inputs)

Status: ✅ Complete

## Goal

Fix the reported bug: typing a decimal odometer reading (e.g. `408.8`) into the "Add Fuel Log" form blocks submission with a browser validation message demanding a whole number, even though `litersAdded`/`pricePerLiter` on the same form already accept decimals (`4.5`, `5.88`) without issue. Extend the same fix to every other numeric input on this client that has the identical latent bug, so the behavior is consistent across all forms.

## Context

**Root cause, confirmed by source read, not guesswork:** every numeric field is rendered via the shared `components/shared/input/ControlledInput.tsx`, which forwards an optional `step` prop straight to the native `<input step={step}>` (line 49). When `step` is omitted, the browser defaults a `type="number"` input's step to `1`, which makes its native HTML5 constraint-validation reject any fractional value on submit. None of the `<form>` elements in this app's modals set `noValidate`, so this native browser validation runs and blocks the submit _before_ React Hook Form's `zodResolver` ever gets a chance to run — meaning the Zod schema for the field is irrelevant to this bug even where it already permits decimals.

Grepped `step=` across every `(main)` form component. Only two call sites pass it explicitly:

- `FuelLogFormModal.tsx:119` — `litersAdded`, `step="0.01"`
- `FuelLogFormModal.tsx:127` — `pricePerLiter`, `step="0.01"`

Every other numeric `ControlledInput` — including `odometerReading`, the field the user actually hit the bug on — omits `step` and therefore silently defaults to whole-number-only, **regardless of what its Zod schema says**. Confirmed the schemas themselves impose no such restriction (none of `fuel-log.schema.ts`, `maintenance-log.schema.ts`, `bike.schema.ts` use `.int()` or any integer check — every numeric field is a `z.string().refine(...)` that only checks `!isNaN`, sign, and an upper bound), so this is purely a presentation-layer inconsistency, not a validation-intent mismatch. Backend confirmed to have no integer constraint either — see `bikelog_server/context/specs/20-decimal-number-field-audit.md`.

Confirmed the full list of affected fields (all `type="number"` `ControlledInput`s currently missing `step`):

| File                                                           | Field                    | Line    | Schema already permits decimals? |
| -------------------------------------------------------------- | ------------------------ | ------- | -------------------------------- |
| `components/(main)/fuelLog/FuelLogFormModal.tsx`               | `odometerReading`        | 108-112 | Yes                              |
| `components/(main)/MaintenanceLog/MaintenanceLogFormModal.tsx` | `odometerReading`        | 181-186 | Yes                              |
| `components/(main)/MaintenanceLog/MaintenanceLogFormModal.tsx` | `intervalKmUsed`         | 197-202 | Yes                              |
| `components/(main)/MaintenanceLog/MaintenanceLogFormModal.tsx` | `cost`                   | 204-209 | Yes                              |
| `components/(main)/Bike/BikeFormModal.tsx`                     | `fuelTankCapacityLiters` | 136-140 | Yes                              |
| `components/(main)/Bike/BikeFormModal.tsx`                     | `currentOdometer`        | 144-148 | Yes                              |

## Design

Add `step="0.01"` to each affected `ControlledInput` call, mirroring the pattern already used correctly for `litersAdded`/`pricePerLiter` in `FuelLogFormModal.tsx`. This is a presentation-only change — no schema, type, or backend change needed, since every affected field's Zod `.refine()` logic already accepts decimals; only the native HTML validation was out of sync with it.

```diff
 // FuelLogFormModal.tsx
           <ControlledInput
             name="odometerReading"
             label="Odometer Reading (km)"
             type="number"
+            step="0.01"
             isRequired
           />
```

```diff
 // MaintenanceLogFormModal.tsx
           <ControlledInput
             name="odometerReading"
             label="Odometer (km)"
             type="number"
+            step="0.01"
             isRequired
           />
           ...
           <ControlledInput
             name="intervalKmUsed"
             label="Service Interval (km)"
             type="number"
+            step="0.01"
             isRequired
           />

           <ControlledInput
             name="cost"
             label="Cost (৳)"
             type="number"
+            step="0.01"
             isRequired
           />
```

```diff
 // BikeFormModal.tsx
           <ControlledInput
             name="fuelTankCapacityLiters"
             label="Fuel Tank Capacity (L)"
             type="number"
+            step="0.01"
             isRequired
           />

           {!isEditMode && (
             <ControlledInput
               name="currentOdometer"
               label="Starting Odometer (km)"
               type="number"
+              step="0.01"
             />
           )}
```

**Judgment call worth flagging to the user before implementing:** `intervalKmUsed` (maintenance service interval) and `cost` conceptually could be argued either way on whether decimals make sense (e.g. "every 3000.5 km" is unusual but not wrong; `cost` in currency almost always wants decimals). Since neither field's Zod schema nor the backend restricts them, and the user's stated expectation is "all number fields" should accept decimals like the ones that already work, this spec applies `step="0.01"` uniformly rather than special-casing any field — consistent with backend spec 20's finding that nothing server-side distinguishes these fields either.

## Implementation

1. ✅ `components/(main)/fuelLog/FuelLogFormModal.tsx` — added `step="0.01"` to the `odometerReading` `ControlledInput`.
2. ✅ `components/(main)/MaintenanceLog/MaintenanceLogFormModal.tsx` — added `step="0.01"` to `odometerReading`, `intervalKmUsed`, and `cost`.
3. ✅ `components/(main)/Bike/BikeFormModal.tsx` — added `step="0.01"` to `fuelTankCapacityLiters` and `currentOdometer`.

No changes needed to `ControlledInput.tsx` itself (already correctly forwards `step` when provided), any `schema/*.ts` file, or any `type/*.ts` file.

## Dependencies

None. Presentation-only fix confined to three form modal files; no schema, type, hook, or backend change.

## Verify

- [x] In "Add Fuel Log," Odometer Reading now has `step="0.01"` (confirmed via `grep`), matching `litersAdded`/`pricePerLiter`'s already-working attribute — same mechanism, so `408.8` no longer trips native HTML5 constraint validation on submit. *(Code-verified only — no interactive browser tool available in this environment to literally type `408.8` and observe the submit; same standing limitation as every other spec in this project.)*
- [x] Same fix applied to "Edit Fuel Log" — it's the same `ControlledInput` instance for both create and edit, no separate code path.
- [x] "Add/Edit Maintenance Log" — Odometer and Service Interval both now carry `step="0.01"`. *(Code-verified only, same limitation as above.)*
- [x] "Add Bike" — Starting Odometer and Fuel Tank Capacity both now carry `step="0.01"`. *(Code-verified only, same limitation as above.)*
- [x] `litersAdded`/`pricePerLiter` untouched by this change (`grep` confirms their pre-existing `step="0.01"` lines are unmodified) — fix didn't regress the fields that already worked.
- [x] `yarn lint` — 0 errors, same 5 pre-existing warnings as before this change, none new. `yarn build` — succeeds, all 15 routes compile (including all 3 touched dynamic routes).
- [ ] Manual phone-width browser exercise not performed — no interactive browser tool available in this environment; pending the user's own on-device/browser confirmation.
