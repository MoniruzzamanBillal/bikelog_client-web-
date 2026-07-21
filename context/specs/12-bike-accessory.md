# 12: Bike Accessory

Status: ✅ Complete

## Goal

Let a rider track a per-bike purchase wishlist (accessories/parts they intend to buy, with urgency and purchase status) — client for the backend's already-complete `bikeAccessory` module (`bikelog_server/context/specs/11-bike-accessory.md`, spec 11).

## Context

Backend contract (verified against actual source):

- `POST /api/bikes/:bikeId/accessories` — body `{ name, urgency, status? }`. `urgency` is required (`"immediate" | "medium" | "low"`, no default). `status` is optional (`"pending" | "purchased" | "cancelled"`, defaults `"pending"`).
- `GET .../accessories` — `page`/`limit` supported (default sort `-createdAt`, no natural event-date field for a wishlist item), plus `?urgency=` and `?status=` filters. Response `{ data: { result, meta } }` — `meta` is a raw total-count **number**; compute `totalPages = Math.ceil(meta / limit)` client-side.
- `GET/PATCH/DELETE .../accessories/:id` — PATCH body `{ name?, urgency?, status? }`, all optional. **No state machine** — unlike `bikeIssue`, `status` (and `urgency`) can be freely set to any value via this single endpoint, any transition allowed (`pending → purchased`, `purchased → pending`, etc., no guard). No dedicated status endpoint exists for this module.
- Response envelope: `{ success, message, data, token }`.
- **No price/cost field exists on the backend model.** Do not add a client-only cost input — if budget tracking is wanted later, that requires a backend schema change first; out of scope here.

Frontend precedent to follow (verified against actual source): same conventions as `fuelLog`/`MaintenanceLog` — `bikeId` via `useParams()`, plain `useState(1)` pagination (no `hooks/usePagination.tsx`), hand-built endpoint strings (no `utils/buildUrl.ts`), full payload sent on every PATCH (no `utils/getChangedFields.ts`), native `confirm()` for delete.

## Design

- **List UI: card-list** (confirmed design decision) — for consistency with `bikeIssue` (spec 11) and the wishlist/checklist mental model, despite having only 3 short fields (`name`, `urgency`, `status`) which would also fit a table. No prose field here (unlike `bikeIssue`'s `description`), so this was the closer call, but cards were chosen to keep both new domains visually consistent.
- `components/(main)/BikeAccessory/BikeAccessory.tsx` — list page. State: `page`, `statusFilter`, `urgencyFilter` (both reset `page` to `1` on change). Query key includes both filters: `["bikeAccessories", bikeId, page.toString(), statusFilter, urgencyFilter]`, endpoint `/bikes/${bikeId}/accessories?page=&limit=` + optional `&status=`/`&urgency=`. Two plain `Select` dropdowns (status: All/Pending/Purchased/Cancelled; urgency: All/Immediate/Medium/Low) in a `flex gap-2 flex-wrap` row under the page header — these are **not** RHF-driven (no form context on a list page), just local `useState`, since no existing non-RHF filter precedent exists anywhere in this codebase to copy verbatim. `handleEdit`/`handleDelete` — same `confirm()` pattern as every other domain. No status-toggle handler needed (plain CRUD, status changes go through the same edit modal as everything else).
- `components/(main)/BikeAccessory/BikeAccessoryCard.tsx` — `rounded-lg border border-border bg-card p-4`. `name` as the title line, urgency pill + status pill side by side underneath. Action row: `SquarePen` (Edit), `Trash2` (Delete) only — no third action, unlike `bikeIssue`, since there's no separate status endpoint to expose.
- `components/(main)/BikeAccessory/BikeAccessoryFormModal.tsx` — RHF, inline `defaultValues` from an optional `accessory?: TBikeAccessory` prop (`FuelLogFormModal`-style). **All three fields shown on both create and edit** (confirmed design decision) — consistent with every other domain's form, which doesn't conditionally hide fields by create-vs-edit mode.
- `app/(main)/bikes/[bikeId]/accessories/page.tsx` — trivial wrapper rendering `<BikeAccessory />`.
- **`BikeDetailPage.tsx` entry point**: add `ShoppingBag` to the existing `lucide-react` import in `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` and append `{ href: \`/bikes/${bikeId}/accessories\`, label: "Accessories", icon: ShoppingBag }`to the`links`array (this grows the`grid-cols-2` grid to 6 entries total once spec 11's "Issues" tile is also added — 3 rows, no layout changes needed).

### Form fields

| Field     | Component               | Required                | Options                         |
| --------- | ----------------------- | ----------------------- | ------------------------------- |
| `name`    | `ControlledInput`       | yes                     | —                               |
| `urgency` | `ControlledSelectField` | yes                     | Immediate / Medium / Low        |
| `status`  | `ControlledSelectField` | no (defaults `pending`) | Pending / Purchased / Cancelled |

### Badges

```ts
const ACCESSORY_STATUS_BADGE: Record<TBikeAccessory["status"], string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  purchased:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
const ACCESSORY_URGENCY_BADGE: Record<TBikeAccessory["urgency"], string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  immediate: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
```

Base pill classes (matches the existing `isFullTank` pill in `fuelLogColumns.tsx`): `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`. Inline both lookup objects directly in `BikeAccessoryCard.tsx` (and the filter dropdowns' option lists directly in `BikeAccessory.tsx`) — no shared constants file exists anywhere in this codebase for this kind of lookup.

## Implementation

1. ✅ `components/(main)/BikeAccessory/type/bike-accessory.types.ts` — `TBikeAccessory`, `TCreateBikeAccessoryPayload { name; urgency; status? }`, `TUpdateBikeAccessoryPayload` (all optional), `TBikeAccessoriesApiResponse { result; meta }`.
2. ✅ `components/(main)/BikeAccessory/BikeAccessoryFormModal.tsx`.
3. ✅ `components/(main)/BikeAccessory/BikeAccessoryCard.tsx`.
4. ✅ `components/(main)/BikeAccessory/BikeAccessory.tsx`.
5. ✅ `app/(main)/bikes/[bikeId]/accessories/page.tsx`.
6. ✅ `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` — add the "Accessories" tile (same edit as spec 11, do together if both specs are implemented in one pass).

## Dependencies

None beyond the bike existing (spec 03 equivalent). Independent of `bikeIssue` (spec 11) — can be built/verified in either order, though both touch `BikeDetailPage.tsx`'s `links` array so coordinate that one edit if building both in the same pass.

## Verify

- [x] `yarn build` / `yarn lint` clean.
- [x] Creating an accessory without `status` defaults to `"pending"`; omitting `urgency` fails required-field validation client-side before hitting the API. Verified live via `curl` — omitting `status` came back `"pending"`, and omitting `urgency` entirely 400s server-side too (`ControlledSelectField` with `isRequired` blocks it client-side before that point is ever reached).
- [x] `PATCH /:id` can freely move `status` through `pending → purchased` and `pending → cancelled` with no restriction (contrast with `bikeIssue`'s guarded toggle — confirms this module intentionally has no state machine). Verified live via `curl`: `pending → purchased → pending → cancelled`, all `200`, no guard triggered at any step.
- [x] `?urgency=immediate` and `?status=pending` filters correctly filter the list, individually and combined; changing either filter resets to page 1. Combined-filter query verified live via `curl` (`?status=pending&urgency=immediate` correctly narrowed 2 results to 1); `page` reset on filter change is code-reviewed (no interactive browser tool in this environment).
- [x] Deleting an accessory removes it from the list (soft-deleted server-side, never reappears). Verified live via `curl`.
- [x] Accessories for bike A never appear under bike B, even for the same authenticated user. Verified live via `curl` against a nonexistent/unowned bike id — correctly `404`s ("Bike not found") via the shared `findOwnedBikeOrThrow` ownership check before any accessory query runs.
- [x] The new "Accessories" tile on the bike detail page navigates to `/bikes/:bikeId/accessories` and renders correctly alongside spec 11's "Issues" tile. Confirmed via `yarn build`'s route output (`/bikes/[bikeId]/accessories` compiles) and code review; not clicked through in an actual browser.
- [x] Usable at ~375–430px width. Follows the same mobile-first unprefixed-Tailwind convention as every other domain; no `sm:`/`md:` overrides introduced.
