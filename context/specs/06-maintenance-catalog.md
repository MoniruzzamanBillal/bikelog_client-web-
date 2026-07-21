# 06: Maintenance Catalog

Status: ✅ Complete

## Goal

Let the user see and add maintenance types and engine oil types — the small reference catalogs that maintenance-log entries (spec 07) pick from.

## Context

Backend contract — both are global catalogs (not scoped to a bike), and **the API only exposes create + list, no update/delete for either**:
- `POST /api/maintenance-types` — body `{ name, defaultIntervalKm?, defaultIntervalDays? }`.
- `GET /api/maintenance-types` — list. Already seeded (via `yarn seed:maintenance-types` on the backend): Engine Oil, Chain Lube, Tire Change, Brake Pads, General Service, Insurance, Registration/Tax, Other.
- `POST /api/engine-oil-types` — body `{ name, suggestedIntervalKm }`.
- `GET /api/engine-oil-types` — list. Already seeded: Mineral (800km), Semi-Synthetic (1000km), Synthetic (1250km).

Since there's no update/delete, this page is deliberately simple — a create form and a read-only list, nothing else.

## Design

- `app/(main)/settings/catalog/page.tsx` — one page, two sections stacked vertically (Maintenance Types, Engine Oil Types), each: a small inline create form (not a modal — these are simple enough and low-frequency enough that a modal is unnecessary ceremony) above a plain list.
- Each list item: name + interval info (km and/or days for maintenance types, km for oil types), no action buttons (nothing to edit/delete).
- This page is reachable from `AppShell`'s nav as a low-priority item (e.g. a settings icon), not part of the primary bottom-tab nav — it's used rarely, only when the seeded catalog doesn't cover something.

## Implementation

1. `components/feature/maintenance-type/maintenance-type.types.ts`, `useMaintenanceTypes.ts` (`useMaintenanceTypes()`, `useCreateMaintenanceType()`).
2. `components/feature/engine-oil-type/engine-oil-type.types.ts`, `useEngineOilTypes.ts` (same shape).
3. `components/feature/maintenance-type/MaintenanceTypeSection.tsx`, `components/feature/engine-oil-type/EngineOilTypeSection.tsx` — each: inline form + list.
4. `app/(main)/settings/catalog/page.tsx` — renders both sections.

## Dependencies

Spec 01. Independent of 03/04/05 — only needs auth.

## Verify

- [ ] Creating a maintenance type or engine oil type shows it in the list immediately.
- [ ] `defaultIntervalKm`/`defaultIntervalDays` are both optional and the form doesn't force filling either.
- [ ] Seeded catalog data (if `yarn seed:*` has been run on the backend) shows up correctly on load.
- [ ] Usable at ~390px width.
