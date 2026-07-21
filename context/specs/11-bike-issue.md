# 11: Bike Issue

Status: ✅ Complete

## Goal

Let a rider log problems with a bike, track them through an `open`/`resolved` lifecycle, and edit/delete them — client for the backend's already-complete `bikeIssue` module (`bikelog_server/context/specs/10-bike-issue.md`, spec 10).

## Context

Backend contract (verified against actual source, not just the backend spec doc — the backend spec's original design, with a `history` array and separate reopen endpoint, was **never actually built**; the shipped API below is simpler):

- `POST /api/bikes/:bikeId/issues` — body `{ title, description?, dateReported? }`. `status` is not accepted here — always forced to `"open"` server-side on create.
- `GET .../issues` — `page`/`limit`/`sort` (default `-dateReported`) supported, plus `?status=open|resolved` filter. Response `{ data: { result, meta } }` — `meta` is a raw total-count **number**, not a rich pagination object; compute `totalPages = Math.ceil(meta / limit)` client-side.
- `GET/PATCH/DELETE .../issues/:id` — PATCH body `{ title?, description?, dateReported? }`. **Sending `status` here is silently ignored** — the service strips it before saving. Status cannot be changed through this endpoint.
- `PATCH .../issues/:id/status` — body `{ status: "open" | "resolved" }`, the **only** way to change status. Setting the same status it already has returns 400. No separate "reopen" endpoint exists.
- Response envelope: `{ success, message, data, token }` (no `statusCode` key in the body itself, only as the HTTP status).
- IDOR/soft-delete handled entirely server-side — nothing extra needed client-side beyond not manually passing `bike`/`isDeleted` as query params.

Frontend precedent to follow (verified against actual source, not assumed): every existing bike-scoped domain (`fuelLog`, `MaintenanceLog`) reads `bikeId` via `useParams()` inside the list component itself, manages pagination with plain `useState(1)` (no `hooks/usePagination.tsx`, unused elsewhere), builds endpoint strings with template literals (no `utils/buildUrl.ts`, unused elsewhere), and sends the full payload on every PATCH (no `utils/getChangedFields.ts`, dead code). Delete confirmation is a native `confirm()`, not a modal.

## Design

- **List UI: card-list**, not a table — 4 displayable fields (`title`, `description`, `dateReported`, `status`), one of which is free-form prose that doesn't fit a table cell well (same reasoning that drove `MaintenanceLog` to cards over `fuelLog`'s table).
- `components/(main)/BikeIssue/BikeIssue.tsx` — list page. State: `page`, `statusFilter` (`""` | `"open"` | `"resolved"`, resets `page` to `1` on change). `useFetchData<TBikeIssuesApiResponse>(["bikeIssues", bikeId, page.toString(), statusFilter], ...)` against `/bikes/${bikeId}/issues?page=&limit=&sort=-dateReported` + optional `&status=`. A plain `Select` filter row (All/Open/Resolved) above the list. Owns `handleEdit`, `handleDelete` (`confirm()` + `useDelete([["bikeIssues", bikeId]])`), and `handleToggleStatus` (`usePatch([["bikeIssues", bikeId]])` → `PATCH /bikes/:bikeId/issues/:id/status`). Renders the card list plus a create `BikeIssueFormModal` (always mounted) and an edit instance (conditionally mounted on the selected issue) — same dual-render pattern as `FuelLog.tsx`/`MaintenanceLog.tsx`.
- `components/(main)/BikeIssue/BikeIssueCard.tsx` — `rounded-lg border border-border bg-card p-4`. Title + status pill on one line, description below (if present), formatted `dateReported`. Action row with three icon buttons: `SquarePen` (Edit — opens the edit modal, touches only title/description/dateReported), a status-toggle button (see below), `Trash2` (Delete).
- `components/(main)/BikeIssue/BikeIssueFormModal.tsx` — RHF, inline `defaultValues` from an optional `issue?: TBikeIssue` prop (`FuelLogFormModal`-style — no `useEffect`+`reset`, no populated refs to resolve). **No status field at all** — status is fully out of scope for this modal.
- **Status toggle, separate from Edit (confirmed design decision):** since the backend enforces status changes as a distinct guarded endpoint, expose it as a distinct icon button rather than folding it into the edit form:
  - status `"open"` → `CheckCircle2` icon, `title="Mark Resolved"`, calls `handleToggleStatus(issue, "resolved")`.
  - status `"resolved"` → `RotateCcw` icon, `title="Reopen"`, calls `handleToggleStatus(issue, "open")`.
  - Because the button only ever offers the opposite of the current status, the backend's same-status 400 guard can never be triggered through this UI — a standard try/catch + `toast` is sufficient, no special-case handling needed.
  - The status pill itself stays non-interactive (pure display), matching the existing `isFullTank`-pill precedent in `fuelLogColumns.tsx`.
- `app/(main)/bikes/[bikeId]/issues/page.tsx` — trivial wrapper rendering `<BikeIssue />`.
- **`BikeDetailPage.tsx` entry point**: `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` has a static `links` array (`grid-cols-2` grid of `Link` cards — fuel logs, mileage, maintenance, spending). Add `AlertTriangle` to the existing `lucide-react` import and append `{ href: \`/bikes/${bikeId}/issues\`, label: "Issues", icon: AlertTriangle }`.

### Form fields

| Field | Component | Required | Notes |
|---|---|---|---|
| `title` | `ControlledInput` | yes | `isRequired` |
| `description` | `ControlledTextArea` | no | `rows={3}` |
| `dateReported` | `Controller` + `DateSelect` (`mode="single"`) | no | Pre-fill `new Date()` on create for UX parity with `fuelLog`'s `date`/`MaintenanceLog`'s `serviceDate`; backend accepts omission and defaults server-side |

### Badge

```ts
const ISSUE_STATUS_BADGE: Record<TBikeIssue["status"], string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};
```
Base pill classes (matches the existing `isFullTank` pill in `fuelLogColumns.tsx`): `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`. Inline the lookup object directly in `BikeIssueCard.tsx` — no shared constants file exists anywhere in this codebase for this kind of lookup.

## Implementation

1. ✅ `components/(main)/BikeIssue/type/bike-issue.types.ts` — `TBikeIssue`, `TCreateBikeIssuePayload`, `TUpdateBikeIssuePayload` (no `status` field), `TUpdateBikeIssueStatusPayload { status }`, `TBikeIssuesApiResponse { result; meta }`.
2. ✅ `components/(main)/BikeIssue/BikeIssueFormModal.tsx`.
3. ✅ `components/(main)/BikeIssue/BikeIssueCard.tsx`.
4. ✅ `components/(main)/BikeIssue/BikeIssue.tsx`.
5. ✅ `app/(main)/bikes/[bikeId]/issues/page.tsx`.
6. ✅ `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` — add the "Issues" tile.

## Dependencies

None beyond the bike existing (spec 03 equivalent). Independent of `bikeAccessory` (spec 12) — can be built/verified in either order.

## Verify

- [x] `yarn build` / `yarn lint` clean.
- [x] Creating an issue without `description`/`dateReported` succeeds; `status` defaults to `"open"` regardless of anything sent in the create payload. Verified live via `curl` — sending `status: "resolved"` on create still came back `"open"`.
- [x] Edit modal never displays or affects `status` — confirmed by editing title/description and checking status is unchanged (verified live via `curl` PATCH `/:id`, status stayed `"open"`).
- [x] Status toggle button flips `open → resolved → open` correctly and updates the pill without a page reload. Endpoint logic verified live via `curl` PATCH `/:id/status` (open→resolved→open); the button/pill wiring is code-reviewed against this confirmed contract (no interactive browser tool in this environment — see `progress-tracker.md`'s Known Gaps for why).
- [x] `?status=open` / `?status=resolved` filter correctly filters the list; changing the filter resets to page 1. Endpoint filter verified live via `curl`; `page` reset on filter change is code-reviewed.
- [x] Deleting an issue removes it from the list (soft-deleted server-side, never reappears). Verified live via `curl` — deleted issue no longer appears in the subsequent list call.
- [x] The new "Issues" tile on the bike detail page navigates to `/bikes/:bikeId/issues` and renders correctly in the now-6-entry `grid-cols-2` grid. Confirmed via `yarn build`'s route output (`/bikes/[bikeId]/issues` compiles) and code review; not clicked through in an actual browser.
- [x] Usable at ~375–430px width. Follows the same mobile-first unprefixed-Tailwind convention as every other domain; no `sm:`/`md:` overrides introduced.

Also live-verified beyond the checklist: the same-status 400 guard (`PATCH /:id/status` with the status it already has → `400 "Issue is already resolved"`), confirming the frontend's assumption that this guard can never be hit through the UI (the toggle button only ever offers the opposite status) is correct.
