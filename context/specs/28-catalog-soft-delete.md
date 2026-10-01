# 28: Delete maintenance types & engine oil types

Status: ✅ Complete — implemented and browser-verified 2026-10-01 against a local `bikelog_server` running spec 41.

Web half of a three-repo feature. Backend half (`bikelog_server/context/specs/41-catalog-soft-delete.md`) and app half (`bikelog_app/ai context/specs/45-catalog-soft-delete.md`, plus its `45a` fix) both shipped first; this unblocked on spec 41 landing.

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

✅ **Verified, not assumed** (this was the spec's one open risk): `RemindersBanner.tsx` is **already safe and needed no change**. Its `getTypeName` (line 17) checks `typeof maintenanceType === "object"` and returns `.name` before ever falling back to the catalog lookup, its React `key` derives `typeKey` from either shape (line 107), and `TReminder.maintenanceType` is already declared as the `{ _id, name } | string` union. That guard was added by spec 25's reminders-banner fix.

This is the one place the two clients genuinely diverged: the **app's** copy of this file had no such guard, so backend spec 41 §C broke it and it needed `bikelog_app`'s spec `45a` as a live fix. This client was already correct. The lesson from `45a` — _verify the shape per endpoint, never generalise_ — is exactly why this was checked rather than trusted.

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

### 4. Verify `RemindersBanner.tsx` — ✅ no change required

Checked against the real response: it already reads the populated object form (see Design). **No edit was made to this file.**

### Files touched

`components/(main)/SettingsCatalog/MaintenanceTypeSection.tsx` · `EngineOilTypeSection.tsx` · `type/maintenance-type.types.ts` · `type/engine-oil-type.types.ts`

`RemindersBanner.tsx` was **not** touched — see step 4.

One deviation from the plan as written: the read-only row's action `<td>` wrapper was `flex justify-end`; it became `flex justify-end gap-0.5` so the pencil and trash do not sit flush against each other, matching the gap the inline-edit row's Check/X pair already used. The plan said "the `flex` wrapper absorbs it" with no layout change — true for fitting, but the pair reads better with the same spacing as the edit row.

---

## Dependencies

**None to install.** `useDelete`, `ConfirmDeleteModal`, `sonner`'s `toast.warning` and `lucide-react`'s `Trash2` are all already present. No new component needs creating.

---

## Verify

`yarn build` ✅ · `yarn lint` ✅ (0 errors; the same 5 pre-existing warnings as before — `useReactTable` ×2, unused `activeTab`) · `npx tsc --noEmit` ✅.

Then exercised for real in Chromium (Playwright) at **390×844** and **1440×900**, against a local `bikelog_server` on `:5000` running spec 41, with `utils/config/envConfig.ts` temporarily pointed at `localhost` and restored afterwards. Fixtures (a throwaway user, bike, 4 catalog rows and 1 maintenance log) were created for the run and **hard-deleted afterwards**; the maintenance log was inserted directly via Prisma so it could not bump a real odometer or fire the expenseTracker2 sync. **30/30 checks passed.**

**The blocked-delete path — the point of the feature**

- [x] Create an engine oil type in Settings.
- [x] On a bike's maintenance page, add a maintenance log that selects it.
- [x] Back in Settings, click delete on that oil type → `ConfirmDeleteModal` opens naming it.
- [x] Confirm → **one amber warning toast** carrying the backend's sentence, verbatim: `"ZZ Spec28 Oil InUse" is used by 1 maintenance log and can't be deleted. Remove or re-assign it first.` Asserted `data-type="warning"` (not `error`) and `count === 1` — no double-toast. The row stays in the table.
- [x] Repeat for a maintenance type — same sentence, same amber type, row stays.
- [x] Delete the blocking maintenance log, retry → succeeds, success toast, row disappears.

**The happy path**

- [x] Delete an unused type → confirm modal → success toast (`data-type="success"`) → row disappears with no reload (query invalidation).
- [x] Cancelling the modal (Esc) deletes nothing and shows no toast.
- [ ] ~~`isLoading` disables the modal's confirm button while in flight.~~ **Not achievable, and not a defect in this spec** — see the note below.

**History must survive**

- [x] After deleting a type, a maintenance log that used it still renders its real type name, **not** the word "Maintenance" (asserted against a soft-deleted catalog row).
- [x] The reminders banner still names that type correctly — `RemindersBanner.tsx` already handled the populated shape (Implementation step 4).
- [x] The maintenance-log form's picker no longer offers the deleted type, while still offering the live one (asserted on the real option list).
- [x] Re-add a type with the deleted name → succeeds with a success toast (not a 409), the row reappears, and it is the **same database row revived** (id identical to the original, exactly one row with that name — confirmed via Prisma, not just the UI).

**Layout & a11y**

- [x] Edit + delete both fit the action column at 390px — no page overflow and no table overflow inside its container. Confirmed by screenshot as well as by measurement.
- [x] No horizontal overflow at 1440px either.
- [x] Both buttons have `title` and a row-specific `aria-label`; the delete button is keyboard-focusable.
- [x] Inline edit mode still works — its Check/X buttons are unaffected, and cancelling returns to the read-only row with its delete button intact.
- [x] No React DOM-nesting warning in the console from the modal's placement (it renders as a sibling of `CatalogCard`, outside the `<table>`), and no hydration errors.

---

### Finding: the `isLoading` prop is dead here — and at every other call site

`ConfirmDeleteModal`'s `isLoading` feeds `ModalActionButtons`' `disabled`, but this spec's handler (as the plan prescribed) calls `setDeleteTarget(null)` **before** awaiting the mutation, so the modal is already unmounted by the time `isDeleting` turns true. Measured, not assumed: with the `DELETE` artificially delayed by 2.5s, **zero** dialogs were open mid-flight.

This is **not specific to this spec**. It is the established pattern in every existing delete flow in this codebase — `BikeManual.tsx:68`, `MaintenanceLog.tsx`, `FuelLog.tsx` all close the modal first and then pass `isLoading={isDeleting}` to a modal that can no longer be on screen. The prop has been inert at all of them since it was introduced.

Deliberately **not** changed here, for three reasons: it is a shared-component-level concern (`ai-workflow-rules.md` requires a `components/shared/*` fix to be generically correct, not special-cased for one feature); diverging in just these two sections would make them inconsistent with the other six call sites; and it is out of this spec's stated scope. Recorded in `progress-tracker.md`'s Known Gaps for a future pass that can fix all eight call sites together.

The user-visible impact is small — the delete is optimistic, the list refetches on success, and a failure surfaces as the warning toast — but double-clicking a delete can fire two requests, which is the real reason it is worth fixing eventually.
