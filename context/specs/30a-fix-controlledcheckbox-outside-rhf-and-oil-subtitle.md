# 30a: Two wrong assumptions in spec 30 §B/§D, found during implementation

Status: ✅ Complete — fixed as part of spec 30's implementation (2026-10-04).

A follow-up to `30-per-user-catalogs.md`, not a new feature. Spec 30 is otherwise accurate; these are the only two places where following it literally would not have worked. Recorded as its own file per this project's convention of fixing a discovered problem against a written plan rather than silently improvising.

---

## Problem 1 — `ControlledCheckbox` cannot be used in `MaintenanceTypeSection`

### What spec 30 says

§B:

> **Reuse `components/shared/input/ControlledCheckbox.tsx`** (wrapping `components/ui/checkbox.tsx`), already used by `FuelLogFormModal`. No new primitive.

### Why it does not work

`ControlledCheckbox.tsx:4,21` calls `useFormContext()` and renders a react-hook-form `<Controller>`:

```ts
const { control } = useFormContext();
```

That is fine in `FuelLogFormModal`, which is a react-hook-form form inside a `<FormProvider>`. **`MaintenanceTypeSection.tsx` is not.** Both of its forms — the add form (`:145-170`) and the inline-edit `<tr>` (`:179-231`) — are plain uncontrolled `<input>` elements driven by seven `useState` values (`name`, `defaultIntervalKm`, `defaultIntervalDays`, `editName`, `editIntervalKm`, `editIntervalDays`, `editingId`). There is no RHF anywhere in the file, no `FormProvider` above it in the tree (`Catalog.tsx` → `MaintenanceTypeSection` directly), and `useFormContext()` outside a provider returns `null`, so destructuring `control` off it throws at render.

`EngineOilTypeSection.tsx` has the same plain-state shape, for whatever it is worth.

So §B's "no new primitive" instruction is right, but the primitive it names is the wrong one.

### The fix

Use the shadcn primitive `ControlledCheckbox` itself wraps — `Checkbox` from `components/ui/checkbox.tsx` — driven by the same `useState` pattern as every other field in the file:

```tsx
<Checkbox
  id="requiresOilType"
  checked={requiresOilType}
  onCheckedChange={(v) => setRequiresOilType(v === true)}
/>
```

Three things make this the right call rather than a shortcut:

- **It is still "no new primitive."** `Checkbox` is the exact component `ControlledCheckbox` renders; the only thing being skipped is the RHF `Controller` wrapper, which is precisely the part that cannot work here.
- **The file already has this exact precedent.** `MaintenanceTypeSection.tsx:4` imports `Button` from `@/components/ui/button` directly, as does `CatalogCard.tsx:3`. The repo's "compose `components/ui/*` via `components/shared/*`" convention (this project's `CLAUDE.md`) is about feature code not reaching past the shared library for *styling*; the catalog sections predate and already sit outside that rule.
- **`onCheckedChange` is typed `(checked: boolean | "indeterminate") => void`** by Radix, so the `v === true` narrowing is required, not defensive noise. Writing `setRequiresOilType(v)` would not typecheck and `yarn build` would fail.

Converting `MaintenanceTypeSection` to react-hook-form so that `ControlledCheckbox` *could* be used was considered and rejected: it would rewrite both forms and all seven state hooks to satisfy a doc sentence, well outside spec 30's scope, and spec 30's own "Explicitly NOT changing" list is pointedly conservative about this file.

---

## Problem 2 — §D misidentifies `EngineOilTypeSection`'s subtitle

### What spec 30 says

§D:

> - **`MaintenanceTypeSection.tsx:132`** — `"Shared catalog · used by maintenance logs and reminders"` → `"Your catalog · used by your maintenance logs and reminders"`.
> - **`EngineOilTypeSection.tsx:109`** — the equivalent subtitle.

"The equivalent subtitle" implies a parallel `"Shared catalog · …"` string needing the same `Shared` → `Your` swap. It is not one. The actual string at that line is:

```
"Suggested interval pre-fills the Engine Oil service form"
```

### Why it matters rather than being a nitpick

That string hardcodes **`"Engine Oil"` as a proper noun** — the very magic string §B exists to delete. `grep -rn '=== "Engine Oil"'` finds the code gate but not this, because here the name is prose rather than a comparison. Left alone it would tell a brand-new user, whose catalog is empty and who has never seen a type called "Engine Oil", to go look for a form that does not exist. A `Shared` → `Your` swap would not have touched it, so following §D literally would have left the user-visible half of the magic-string problem in place while the code half was fixed.

### The fix

```
"Suggested interval pre-fills an oil-change service form"  →  then + " · your catalog"
```

Final: `"Your catalog · suggested interval pre-fills a maintenance log that needs an oil type"`.

This drops the proper noun, describes the mechanism in terms of the new `requiresOilType` flag rather than a specific type name, and still carries §D's per-user point. `Catalog.tsx:18`'s `"Types shared by all your bikes"` remains correct and is left alone, exactly as §D instructs.

---

## Verification

Both fixes are covered by spec 30's own test plan with no additions needed:

- Problem 1 is a render-time throw, so it is caught by simply opening `/settings/catalog` — and by `yarn build`, since the `onCheckedChange` narrowing is a type error if written the obvious wrong way.
- Problem 2 is covered by §Test plan's `grep -rn '=== "Engine Oil"'` check, extended here to a plain `grep -rn '"Engine Oil"'` across `components/` so a prose occurrence cannot hide from it again.
