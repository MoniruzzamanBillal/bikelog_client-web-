# 25a: Fix — Optional Interval Fields Are `null`, Not Omitted, Breaking `!== undefined` Guards

Status: ✅ Complete

## Goal

Found live during spec 25's own verification pass (real backend, real Postgres, throwaway fixtures). Section B of `25-backend-app-parity-catchup.md` guarded `log.intervalKmUsed`/`log.nextDueOdometer` display with `!== undefined` checks, based on the assumption (carried over from `bikelog_app` spec 33's own Design section, written against the same backend spec 28) that Prisma/Mongoose omits an unset field entirely. Live-tested against the real running `bikelog_server` (branch `dev/monir`, already merged with `postgressMigrate`), creating a maintenance log with no `intervalKmUsed` actually returns:

```json
{ "intervalKmUsed": null, "nextDueOdometer": null, ... }
```

— an explicit JSON `null`, not an omitted key. `log.intervalKmUsed !== undefined` is `true` for `null` (`null !== undefined`), so `MaintenanceLogCard.tsx`'s guard would have let `log.intervalKmUsed.toLocaleString()` run against `null` and crash with `Cannot read properties of null`.

## Context

- Confirmed via a direct `curl POST /bikes/:bikeId/maintenance-logs` with no `intervalKmUsed` in the body, against a real local `bikelog_server` instance (port 5000) backed by the real Neon Postgres — this is Prisma's `update`/`create` behavior for a field with no payload value and no DB default (`intervalKmUsed`/`nextDueOdometer` are nullable `Int?`/`Float?` in the Prisma schema per backend spec 28's Design section), which returns the column's actual stored value (`NULL`) rather than omitting the key from the JSON response — different from the Mongoose-era omission behavior the original spec's assumption was based on.
- By contrast, `GET .../reminders`' reminder objects genuinely **omit** `nextDueOdometer`/`kmRemaining` entirely when absent (confirmed in the same live test — the reminder for the interval-less log above has no `nextDueOdometer`/`kmRemaining` key at all) — that endpoint's own hand-built response object (`maintenanceLog.service.ts`'s `getRemindersFromDB`, per backend spec 28's Design section) only assigns those keys when present, unlike the Prisma model's create/update response which serializes every column. So `RemindersBanner.tsx`'s `!== undefined` guards (Section A) are correct as written — this fix is scoped to `MaintenanceLog`-record fields only, not `TReminder` fields.
- Affected: `MaintenanceLogCard.tsx`'s two `!== undefined` guards (added by section B). `MaintenanceLogFormModal.tsx`'s edit-prefill (`log.intervalKmUsed?.toString() ?? ""`) is unaffected — optional chaining + nullish coalescing already handles `null` and `undefined` identically, no fix needed there.

## Design

`components/(main)/MaintenanceLog/type/maintenance-log.types.ts`: widen `TMaintenanceLog.intervalKmUsed`/`.nextDueOdometer` to `number | null` (not just optional `number`), reflecting the real response shape.

`components/(main)/MaintenanceLog/MaintenanceLogCard.tsx`: change both guards from `!== undefined` to `!= null` (loose inequality — deliberately catches both `null` and `undefined` in one check, standard idiom for exactly this case, not a typo for `!==`).

## Implementation

1. ✅ `components/(main)/MaintenanceLog/type/maintenance-log.types.ts` — `TMaintenanceLog.intervalKmUsed?: number | null`, `.nextDueOdometer?: number | null`.
2. ✅ `components/(main)/MaintenanceLog/MaintenanceLogCard.tsx` — both guards changed to `!= null`.

## Verify

- [x] Re-ran the exact live repro (interval-less maintenance log against real Postgres) — with the fix, `log.intervalKmUsed != null` correctly evaluates `false` for the real `null` response, so the Interval/Next due lines are skipped instead of crashing.
- [x] `yarn build` clean (all routes compile, full `tsc` pass); `yarn lint` clean, same 6 pre-existing warnings, 0 errors, none new.
