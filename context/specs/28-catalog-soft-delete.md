# 28: Delete maintenance types & engine oil types

Status: ⛔ Not Started — plan only, written 2026-10-01. **No code written yet.**

Web half of a three-repo feature. **Blocked on `bikelog_server/context/specs/41-catalog-soft-delete.md`** — there is no endpoint to call until it ships. App counterpart: `bikelog_app/ai context/specs/45-catalog-soft-delete.md`.

---

## Goal

Add a delete control to each row of both catalog tables in Settings. Deleting an unused entry removes it from the list; deleting one still used by a maintenance log is refused by the backend, and this client shows that refusal as a warning toast carrying the backend's own message.

---

## Design

### Why this client is in scope at all

Per the root `CLAUDE.md`, work is app-first and this client is updated only when a backend change requires it. Backend spec 41 changes two things that reach this client:

1. **`GET /maintenance-types` and `GET /engine-oil-types` start hiding soft-deleted rows.** This client needs **no change** for that — the catalog tables and the maintenance-log picker simply stop seeing deleted entries, which is the desired behaviour.
2. **Maintenance-log reads start returning `maintenanceType` / `oilType` as `{ _id, name }`** instead of a bare id string (spec 41 §B/§C). This client **already handles both shapes** and needs no change either:
   - `components/(main)/MaintenanceLog/MaintenanceLogCard.tsx:23` — `typeof log?.maintenanceType === "object"` returns `.name`.
   - `components/(main)/MaintenanceLog/MaintenanceLogFormModal.tsx:80,85` — extracts `._id` for the picker value.
   - `components/(main)/MaintenanceLog/RemindersBanner.tsx:21` — resolves via the catalog list; now receives a populated object from the reminders endpoint.

So nothing here is _broken_ by spec 41. **This spec is therefore parity work**, chosen deliberately so the two clients do not diverge — the app gets a delete button and this client should too, since both render the same catalog.

⚠️ **One thing to verify rather than assume**: `RemindersBanner.tsx:21` resolves the type name from the fetched catalog list. Once deleted types vanish from that list, a reminder whose type was deleted would fall through to its `"Maintenance"` fallback _unless_ spec 41 §C's populated `{ _id, name }` on the reminders payload is consumed. Check this file against the real response when implementing; it may need the same `typeof === "object"` branch the card already has.

### Patterns to reuse — all of it already exists

| Need               | Reuse                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DELETE` mutation  | `useDelete` — `hooks/useApi.ts:79`, same shape as `usePatch`                                                                                                                                              |
| Confirmation modal | `ConfirmDeleteModal` — `components/shared/Modal/ConfirmDeleteModal.tsx`, props `{ open, onClose, onConfirm, title, description, isLoading }`, already used by `BikeManual.tsx` and `ImageUploadThumb.tsx` |
| Toasts             | `sonner` ^2.0.7 — the sections already call `toast.success` / `toast.error`; **`toast.warning` is built in**, no config needed                                                                            |
| Delete icon        | `Trash2` from `lucide-react` (the sections already import `Check`, `Pencil`, `X`)                                                                                                                         |
| Table shell        | `CatalogCard` + `catalogInput` — `components/(main)/SettingsCatalog/CatalogCard.tsx`                                                                                                                      |

**No new packages.** This is the notable difference from the app side, where a `warning` toast variant has to be registered from scratch — sonner gives it for free here.

### One pre-existing bug to avoid

`utils/axiosInstance.ts:54` builds `statusCode: error?.response?.data?.statusCode || 500`, but `globalErrorHandler` sends `{ success, message, errorSources, stack }` with **no `statusCode`** field. So the normalised error's `statusCode` is **always 500**, whatever the real HTTP status. Do not branch on it to detect the 409.

Unlike the app, this client's axios instance does **not** auto-toast errors, so the component's own `catch` is the only toast — **no double-toast risk here**. The existing sections' pattern is already correct:

```ts
} catch (error) {
  const message = (error as { message?: string })?.message;
  toast.error(message ?? "Failed to update maintenance type");
}
```

### Visual rules

Per `context/ui-context.md` and the Nocturne tokens in `app/globals.css`:

- The delete button sits beside the existing edit button in the row's final `<td>`, inside its `flex justify-end` wrapper. Reuse the established icon-button classes, swapping the hover colour for the destructive token:
  ```
  grid size-[30px] place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-destructive
  ```
- Icon is `<Trash2 className="size-3.5" />`, matching the `Pencil` sizing.
- `title` and `aria-label` are required — the existing buttons set `aria-label={`Edit ${t?.name}`}`, so use ``aria-label={`Delete ${t?.name}`}``.
- The row is a table row, so the extra button needs no layout change — the `flex` wrapper absorbs it. (Contrast with the app, where a fixed-width action column had to be widened.)
- Deleted rows simply disappear. No "show deleted" toggle, no strikethrough, no restore UI — re-adding the same name revives it server-side, which covers realistic recovery.

---

## Implementation

Both sections get the identical treatment. `MaintenanceTypeSection.tsx` is described; `EngineOilTypeSection.tsx` mirrors it exactly with its own query key, URL and copy.

### 1. Types

`components/(main)/SettingsCatalog/type/maintenance-type.types.ts` and `engine-oil-type.types.ts` — add `isDeleted: boolean;` to `TMaintenanceType` / `TEngineOilType`.

### 2. `MaintenanceTypeSection.tsx`

**Mutation** — alongside the existing `usePost` / `usePatch`:

```ts
const { mutateAsync: deleteMutation, isPending: isDeleting } = useDelete([
  ["maintenanceTypes"],
]);
```

Use the **existing** query key `["maintenanceTypes"]` (camelCase here, unlike the app's `["maintenance-types"]`) so the list refetches on success.

**State** for the modal, following `BikeManual.tsx`'s pattern:

```ts
const [deleteTarget, setDeleteTarget] = useState<TMaintenanceType | null>(null);
```

A single target object rather than a boolean, since the modal copy names the row.

**Handler:**

```ts
const handleConfirmDelete = async () => {
  if (!deleteTarget) return;
  const target = deleteTarget;
  setDeleteTarget(null);
  try {
    await deleteMutation({ url: `/maintenance-types/${target?._id}` });
    toast.success("Maintenance type deleted");
  } catch (error) {
    const message = (error as { message?: string })?.message;
    // ! The backend's 409 sentence arrives here verbatim and is the whole point —
    // ! toast.warning, not toast.error: a refusal is not a failure.
    toast.warning(message ?? "Failed to delete maintenance type");
  }
};
```

**Button** in the read-only row's action `<td>`, after the edit button:

```tsx
<button
  type="button"
  onClick={() => setDeleteTarget(t)}
  className="grid size-[30px] place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-destructive"
  title="Delete"
  aria-label={`Delete ${t?.name}`}
>
  <Trash2 className="size-3.5" />
</button>
```

**Modal**, rendered once outside the row map — note `CatalogCard` renders a `<table>`, so this must sit **outside** it, not inside a `<tr>`, or React will complain about invalid DOM nesting:

```tsx
<ConfirmDeleteModal
  open={!!deleteTarget}
  onClose={() => setDeleteTarget(null)}
  onConfirm={handleConfirmDelete}
  title="Delete maintenance type?"
  description={`"${deleteTarget?.name}" will be removed from the catalog. Maintenance logs that already used it keep their history.`}
  isLoading={isDeleting}
/>
```

The description must say history survives — that is what soft delete buys and it is the user's likely worry when clicking delete.

Check how `CatalogCard` composes its children to find the right place for the modal; it may need to be a sibling of `<CatalogCard>` in a fragment.

### 3. `EngineOilTypeSection.tsx`

Identical, with: key `["engineOilTypes"]`, URL `/engine-oil-types/${id}`, copy "Engine oil type deleted" / "Delete engine oil type?" / "Failed to delete engine oil type".

### 4. Verify `RemindersBanner.tsx`

Per the warning in Design, confirm it still names a deleted type correctly once spec 41 §C populates the reminders payload. Add the `typeof === "object"` branch if it does not already read the object form.

### Files touched

`components/(main)/SettingsCatalog/MaintenanceTypeSection.tsx` · `EngineOilTypeSection.tsx` · `type/maintenance-type.types.ts` · `type/engine-oil-type.types.ts` · possibly `components/(main)/MaintenanceLog/RemindersBanner.tsx`

---

## Dependencies

**None to install.** `useDelete`, `ConfirmDeleteModal`, `sonner`'s `toast.warning` and `lucide-react`'s `Trash2` are all already present. No new component needs creating.

---

## Verify

`yarn build` and `yarn lint` clean, then exercise in a phone-width viewport **and** desktop, with `bikelog_server` running spec 41.

**The blocked-delete path — the point of the feature**

- [ ] Create an engine oil type in Settings.
- [ ] On a bike's maintenance page, add a maintenance log that selects it.
- [ ] Back in Settings, click delete on that oil type → `ConfirmDeleteModal` opens naming it.
- [ ] Confirm → **one amber warning toast** carrying the backend's sentence (names the oil type and the log count); the row stays in the table.
- [ ] Repeat for a maintenance type. Note every log pins its maintenance type (the FK is required), so any log at all blocks it.
- [ ] Delete the blocking maintenance log, retry → succeeds, success toast, row disappears.

**The happy path**

- [ ] Delete an unused type → confirm modal → success toast → row disappears, no page reload needed (query invalidation).
- [ ] `isLoading` disables the modal's confirm button while in flight.
- [ ] Cancelling the modal deletes nothing.

**History must survive**

- [ ] After deleting a type, open a maintenance log that used it → its type name still renders, **not** the word "Maintenance".
- [ ] The reminders banner still names that type correctly (see Implementation step 4).
- [ ] The maintenance-log form's picker no longer offers the deleted type.
- [ ] Re-add a type with the deleted name → succeeds, historical logs still read correctly.

**Layout & a11y**

- [ ] Edit + delete buttons both fit the action column at phone width without wrapping or overflowing the table.
- [ ] Both have `title` and a row-specific `aria-label`; delete is reachable and operable by keyboard.
- [ ] Inline edit mode still works — its Check/X buttons are unaffected.
- [ ] No React DOM-nesting warning in the console from the modal's placement.
