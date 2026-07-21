# 04: Fuel Logs

Status: ✅ Complete

## Goal

Log fuel fill-ups per bike, list/edit/delete them.

## Context

Backend contract:

- `POST /api/bikes/:bikeId/fuel-logs` — body `{ odometerReading, litersAdded, isFullTank, pricePerLiter, fuelStation?, date?, notes? }`. **Never send `totalCost`** — always server-recomputed as `litersAdded * pricePerLiter`. Response is `{ data: { fuelLog, mileageRecordClosed } }` — note the extra `fuelLog` nesting, unique to this endpoint.
- `GET /api/bikes/:bikeId/fuel-logs` — supports `page`/`limit`/`sort`(default `-date`) via `QueryBuilder`; response `{ data: { result, meta } }`.
- `GET/PATCH/DELETE .../fuel-logs/:id` — PATCH same fields as create, `totalCost` still ignored. Both PATCH and DELETE 409 if the log is already part of a closed mileage record — surface that message via toast, don't let the user retry blindly.

## Design

- `app/(main)/bikes/[bikeId]/fuel-logs/page.tsx` — this is a genuinely growing list over time (unlike bikes), so this is the first real use of `GenericTableComponent`. Keep columns minimal (date, odometer, liters, cost, full-tank badge, actions) — deliberately omit `fuelStation`/`notes` as columns (shown only inside the edit modal) so the table stays narrow enough to be usable in `GenericTableComponent`'s default `overflow` handling on a ~390px screen without needing per-breakpoint column hiding logic.
- `components/feature/fuel-log/FuelLogFormModal.tsx` — `ControlledInput` (number) for odometerReading/litersAdded/pricePerLiter, `ControlledCheckbox` for isFullTank, `ControlledInput` for fuelStation, `DateSelect` (wrapped in `Controller`) for date defaulting to today, `ControlledTextArea` for notes. Same create/edit pattern as `BikeFormModal` (spec 03).
- On create success: if `mileageRecordClosed` is non-null in the response, show a distinct toast (e.g. "Mileage: {mileageKmPerLiter} km/l for this tank") in addition to the normal success toast — this is the payoff moment for the whole app, worth surfacing immediately rather than making the user go check the mileage page.
- `components/feature/fuel-log/useFuelLogs.ts` — `useFuelLogs(bikeId, page)`, `useCreateFuelLog(bikeId)`, `useUpdateFuelLog(bikeId, id)`, `useDeleteFuelLog(bikeId, id)`.

## Implementation

1. `components/feature/fuel-log/fuel-log.types.ts` — `TFuelLog`, `TCreateFuelLogPayload`, `TUpdateFuelLogPayload`. Remember `TFuelLog` includes `totalCost` in the _response_ even though it's never in a request payload.
2. `components/feature/fuel-log/useFuelLogs.ts`.
3. `components/feature/fuel-log/FuelLogFormModal.tsx`.
4. `components/feature/fuel-log/fuelLogColumns.tsx` — the `ColumnDef<TFuelLog>[]` for `GenericTableComponent`, including a `TableActionMenu` cell for edit/delete.
5. `app/(main)/bikes/[bikeId]/fuel-logs/page.tsx` — wires `usePagination()` + the table + the create modal trigger.

## Dependencies

Spec 01, 03 (needs a bike to scope to).

## Verify

- [ ] Creating a full-tank fuel log after a prior full-tank log shows the mileage-closed toast with a sane km/l number.
- [ ] Creating a partial fill does not show a mileage toast (no record closed).
- [ ] Editing a fuel log that's already part of a closed mileage record shows the backend's 409 message, doesn't silently fail.
- [ ] Pagination works past the first page (`usePagination` + `GenericTableComponent`'s `onPageChange`/`totalPages` wired to the API's `meta`).
- [ ] Table is usable (no broken layout) at ~390px width.
