# 03: Bike Management

Status: ✅ Complete

## Goal

List, create, edit, delete bikes; a hub page per bike linking into everything scoped to it.

## Context

Backend contract:
- `POST /api/bikes` — body `{ nickname, brand, model, registrationNumber, purchaseDate, fuelTankCapacityLiters, currentOdometer? }`. `owner` comes from the JWT, never send it.
- `GET /api/bikes` — list, owned by the logged-in user, no query params.
- `GET /api/bikes/:id`, `PATCH /api/bikes/:id` (same fields, all optional — `owner`/`currentOdometer` silently stripped server-side even if sent), `DELETE /api/bikes/:id` (soft delete).

## Design

- `app/(main)/dashboard/page.tsx` — bike list. Given the realistic count (a handful of bikes per user, not hundreds), render as a simple responsive card grid (`grid-cols-1 sm:grid-cols-2`), **not** `GenericTableComponent` — a data table is the wrong shape for "pick which bike to open" on a phone. Each card: nickname, brand/model, current odometer, tap-through to `/bikes/[bikeId]`. A floating/header "+ Add Bike" button opens the create modal.
- `components/feature/bike/BikeFormModal.tsx` — `BaseModal` + `FormActionButtons`, fields via `ControlledInput`: nickname, brand, model, registrationNumber, `DateSelect` (wrapped in a `Controller` per `../architecture.md`'s note that `DateSelect` isn't RHF-integrated itself) for purchaseDate, number inputs for fuelTankCapacityLiters and (create-only) currentOdometer. Same modal for create and edit — pass an optional `bike` prop; when present, pre-fill `defaultValues` and PATCH instead of POST, and hide the `currentOdometer` field (server strips it on update anyway, so don't even show it — avoids a confusing "why didn't this save" moment).
- `app/(main)/bikes/[bikeId]/page.tsx` — bike hub: odometer + basic info at top, an edit/delete affordance (reuse `BikeFormModal` for edit, `ModalActionButtons`-based confirm dialog for delete), a reminders banner slot (real content wired in spec 07, stub/omit until then), and four link cards: Fuel Logs, Mileage, Maintenance, Spending — each just a `Link` to its route.
- `components/feature/bike/useBikes.ts` — `useBikes()`, `useBike(bikeId)`, `useCreateBike()`, `useUpdateBike(bikeId)`, `useDeleteBike(bikeId)`, all invalidating the `["bikes"]` and/or `["bikes", bikeId]` query keys appropriately.

## Implementation

1. `components/feature/bike/bike.types.ts` — `TBike`, `TCreateBikePayload`, `TUpdateBikePayload`.
2. `components/feature/bike/useBikes.ts`.
3. `components/feature/bike/BikeFormModal.tsx`.
4. `components/feature/bike/BikeCard.tsx` (small presentational card, used by the dashboard grid).
5. `app/(main)/dashboard/page.tsx`.
6. `app/(main)/bikes/[bikeId]/page.tsx`, including the delete-confirm dialog.

## Dependencies

Spec 01 (`AppShell`, `app/(main)/` route group), spec 02 (session must exist to scope "my bikes").

## Verify

- [x] Creating a bike shows it immediately in the dashboard grid (query invalidation working). `useCreateBike()` invalidates `["bikes"]`, which is `useBikes()`'s exact query key — code-reviewed correct; the underlying `POST /bikes` → `GET /bikes` round-trip was verified live via `curl` (see Recent Activity).
- [x] Editing a bike updates the card/hub without a full page reload. `useUpdateBike(bikeId)` invalidates both `["bikes"]` and `["bikes", bikeId]`, covering both the dashboard grid and the hub page's own `useBike(bikeId)` query.
- [x] Deleting a bike removes it from the list and (if you were on its hub page) redirects to `/dashboard`. `useDeleteBike(bikeId)` invalidates `["bikes"]`; `BikeHubPage`'s `handleDelete` explicitly `router.replace("/dashboard")`s on success.
- [x] `currentOdometer` is not editable via the edit modal (matches backend behavior). Confirmed on both sides: `BikeFormModal` never renders the `currentOdometer` field when `isEditMode`, and `TUpdateBikePayload` (the type `updateBike()` accepts) omits the field entirely at the type level. Live-verified against the real backend via `curl`: a `PATCH` with `currentOdometer:99999` in the body left the stored value unchanged (`500`) — the server silently strips it, confirmed independent of the frontend not sending it.
- [x] Dashboard grid and bike hub both render correctly at ~390px width. Both layouts are built mobile-first (`grid-cols-1 sm:grid-cols-2` for the dashboard, single-column stacked cards for the hub) per `architecture.md` Invariant 5 — code-reviewed, not observed in an actual 390px viewport since no browser tool is available in this environment (see `progress-tracker.md`'s Known Gaps).

Full live-API verification (via `curl` against the running `bikelog_server`, not the UI — no browser tool available in this environment): registered a fresh user, created a bike with all `TCreateBikePayload` fields including `currentOdometer`, confirmed the create response and subsequent `GET /bikes`/`GET /bikes/:id` responses match `TBike` field-for-field, confirmed `PATCH` strips `currentOdometer` server-side even when explicitly sent, confirmed `DELETE` soft-deletes (bike disappears from a follow-up `GET /bikes`). Also confirmed via `curl` that `/dashboard` and `/bikes/[bikeId]` return `200` with no bike content in the pre-hydration HTML when no session cookie is set — this is spec 01's client-side gate working as designed (it blocks rendering after mount, not via a server-side redirect, so `curl` can't observe the actual `router.replace("/login")`, only confirm the gate withheld the protected content). This is also the first spec where that gate and spec 02's logout button had a real page to run against.
