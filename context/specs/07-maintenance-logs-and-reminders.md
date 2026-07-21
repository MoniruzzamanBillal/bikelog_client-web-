# 07: Maintenance Logs & Reminders

Status: ✅ Complete

## Goal

Log maintenance events (starting with engine oil) per bike, list/edit/delete them, and surface due/overdue/upcoming reminders.

## Context

Backend contract:

- `POST /api/bikes/:bikeId/maintenance-logs` — body `{ maintenanceType (ObjectId), odometerReading, oilType? (ObjectId), intervalKmUsed, nextDueDate?, cost, serviceDate?, serviceCenter?, partsReplaced? (string[]), notes? }`. **Never send `nextDueOdometer`** — always server-computed as `odometerReading + intervalKmUsed`.
- `GET .../maintenance-logs` — `page`/`limit`/`sort`(default `-serviceDate`) supported; response `{ data: { result, meta } }`.
- `GET/PATCH/DELETE .../maintenance-logs/:id` — PATCH same fields, all optional.
- `GET /api/bikes/:bikeId/reminders` — no params, returns `{ reminders: [{ maintenanceType, lastServiceDate, lastOdometerReading, nextDueOdometer, nextDueDate?, status: "overdue"|"upcoming", kmRemaining, daysRemaining? }] }`. Only items that are actually due/upcoming appear — an empty array means nothing needs attention.

## Design

- `components/feature/maintenance-log/MaintenanceLogFormModal.tsx` — `ControlledSelectField` for `maintenanceType` (options from spec 06's `useMaintenanceTypes()`), conditionally show `ControlledSelectField` for `oilType` (options from `useEngineOilTypes()`) only when the selected maintenance type's name is "Engine Oil" (simple string match against the fetched list — no separate "is this an oil-type-needing category" flag exists on the backend, so this is inferred client-side by name). `ControlledInput` (number) for odometerReading/intervalKmUsed/cost, `DateSelect` (via `Controller`) for serviceDate (default today) and optionally nextDueDate, `ControlledInput` for serviceCenter, **plain `ControlledInput` (not `ControlledMultiSelectField`) for `partsReplaced`** — comma-separated text, split into a `string[]` on submit (`value.split(",").map(s => s.trim()).filter(Boolean)`). This sidesteps `ControlledMultiSelectField`'s known bug (see `../architecture.md`) and is faster to build for a field that's realistically 1-3 short items.
- `app/(main)/bikes/[bikeId]/maintenance-logs/page.tsx` — a reminders banner at the top (list of `ReminderBadge` — status-colored: overdue = destructive, upcoming = a muted warning tone), then the maintenance log list. Given likely low volume (maintenance events are infrequent compared to fuel fills), render as stacked cards like the bike list/mileage history, not `GenericTableComponent` — consistent reasoning, less table-scroll friction on mobile for a list that won't get long.
- **Reminders banner reuse**: extract the reminders-fetch-and-render into `components/feature/maintenance-log/RemindersBanner.tsx` so it can also be dropped into the bike hub page (`/bikes/[bikeId]`, stubbed in spec 03) without duplicating the fetch logic.
- `components/feature/maintenance-log/useMaintenanceLogs.ts` — `useMaintenanceLogs(bikeId, page)`, `useCreateMaintenanceLog(bikeId)`, `useUpdateMaintenanceLog(bikeId, id)`, `useDeleteMaintenanceLog(bikeId, id)`, `useReminders(bikeId)`.

## Implementation

1. `components/feature/maintenance-log/maintenance-log.types.ts`.
2. `components/feature/maintenance-log/useMaintenanceLogs.ts`.
3. `components/feature/maintenance-log/MaintenanceLogFormModal.tsx`.
4. `components/feature/maintenance-log/RemindersBanner.tsx`.
5. `components/feature/maintenance-log/MaintenanceLogCard.tsx` (list item, with edit/delete actions).
6. `app/(main)/bikes/[bikeId]/maintenance-logs/page.tsx`.
7. Go back to `app/(main)/bikes/[bikeId]/page.tsx` (spec 03) and replace its reminders-banner stub with `<RemindersBanner bikeId={bikeId} />`.

## Dependencies

Spec 01, 03, 06 (needs maintenance types / oil types to populate the form's selects).

## Verify

- [ ] Creating an Engine Oil maintenance log shows the oil-type select; creating any other type hides it.
- [ ] `partsReplaced` comma-input correctly round-trips (create with "Oil Filter, Engine Oil", edit shows it back as editable text, not `[object Object]` or similar).
- [ ] After logging a maintenance event whose `nextDueOdometer` is already behind the bike's `currentOdometer`, the reminders banner shows it as overdue on both this page and the bike hub page.
- [ ] Deleting a maintenance log removes it and (if it was the reminder source) updates the banner.
- [ ] Usable at ~390px width.
