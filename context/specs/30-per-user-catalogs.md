# 30: Per-user catalogs — cache isolation, `requiresOilType`, empty states (web)

Status: ✅ Complete (code, 2026-10-04) — every checklist item below is implemented, `yarn build` and `yarn lint` are clean. **The browser pass in §Test plan has not been run**, and cannot be until `bikelog_server` spec 46's database rollout happens: that spec's code is merged but its migrations and backfill were never applied, so the live API still returns global catalogs and no `requiresOilType`. See "Rollout order" at the end. Two wrong assumptions in §B/§D were found while implementing and are fixed per `30a-fix-controlledcheckbox-outside-rhf-and-oil-subtitle.md`.

Web half of a three-repo change. Server counterpart: `bikelog_server/context/specs/46-per-user-catalog-ownership.md` (**ships first**). App counterpart: `bikelog_app/ai context/specs/48-per-user-catalogs.md`.

**This spec is not a release blocker for the server.** The server's wire-contract change is purely additive — this client sends no owner identifier on any of the eight catalog calls, and both `type/maintenance-type.types.ts` and `type/engine-oil-type.types.ts` ignore extra response fields. What this spec fixes is a **cross-tenant cache leak** that the server change turns from harmless into real.

Per the root working model, this client follows rather than leads: it is updated here because the backend change genuinely affects it, not for parity with the app.

---

## Goal

The backend is making `MaintenanceType` and `EngineOilType` per-user (server spec 46). Three consequences land here:

1. **A real leak.** Logout clears the cookie but not the query cache, and it is a _soft_ navigation, so the React tree and the `QueryClient` survive. User A → logout → user B login renders A's catalog to B.
2. **The oil-type dropdown breaks for new users.** `MaintenanceLogFormModal.tsx:68` gates it on `selectedMt?.name === "Engine Oil"`, which only worked because the global catalog was seeded with that row. New users now start **empty**, so they can never surface the field. Replaced by the server's new `requiresOilType` flag.
3. **New users hit a dead end.** An empty catalog means the maintenance-log type select has no options and nothing explains why.

## Confirmed decisions (with the user, 2026-10-04)

| Question                        | Decision                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| New users' catalogs             | **Empty.** No seeding — server spec 42 removed the seed scripts.                                                               |
| The `"Engine Oil"` magic string | Replaced by a `requiresOilType` boolean on the maintenance type, set by its owner.                                             |
| Error status handling           | **Fix it locally** — read `error.response.status`, as `bikelog_app` already does. Not a change to the server's error envelope. |
| Scope                           | All three repos, deliberately.                                                                                                 |

---

## §A Cache isolation — the substantive change

```ts
// components/layout/AppShell.tsx:170-173
const handleLogout = () => {
  clearToken();
  router?.replace("/login");
};
```

`clearToken()` (`lib/tokenManager.ts:12`) is just `deleteCookie("accessToken")`, and `router.replace` is a **client-side** navigation — no full page reload — so the React tree and the entire query cache survive intact. `LoginForm.tsx:23-39` then only `setToken(...)` + `router.replace("/dashboard")`, never invalidating. There is no `queryClient.clear()` or `removeQueries()` anywhere in this repo.

With react-query's defaults (`staleTime: 0`, no override anywhere) the cached rows render on mount and _then_ refetch, so the previous user's catalog is visibly on screen, not merely held in memory.

Note the 401 path is already safe: `utils/axiosInstance.ts:46-51` does `clearToken()` + `window.location.href = "/login"`, a **hard** reload that drops everything. It is explicit logout that leaks.

**Changes:**

1. **`app/QueryProvider.tsx:5-14`** — stabilise the client:
   ```ts
   // before
   const queryClient = new QueryClient();
   // after
   const [queryClient] = useState(() => new QueryClient());
   ```
   Constructing it in the render body is a latent bug in both directions: a re-render of this client boundary throws the whole cache away. **This is not itself the leak fix** — under the App Router the root layout does not re-render on `router.replace`, so the same instance persists across logout→login. Do not treat the instability as accidental mitigation; it has to be fixed _before_ `clear()` can be relied on.
2. **`components/layout/AppShell.tsx`, `handleLogout` (L170-173)** — add `useQueryClient().clear()` before `clearToken()`.
3. **Same function** — switch `router.replace("/login")` to `window.location.href = "/login"`, matching the hard nav the 401 path already uses. `clear()` alone is sufficient for the cache; the hard nav additionally drops component state, and makes logout behave identically to the already-safe 401 path.
4. **`components/feature/auth/LoginForm.tsx:32-33`** — `clear()` before `setToken(result.token)`. **Clearing on login is the stronger invariant**: logout can be skipped (tab closed, token expiry, a crash), login cannot.

Affects every query key, not just the catalogs; the catalogs are where it becomes a correctness bug.

## §B `requiresOilType`

**`components/(main)/SettingsCatalog/type/maintenance-type.types.ts`** — add `requiresOilType: boolean`.

**`components/(main)/MaintenanceLog/MaintenanceLogFormModal.tsx:68`** — replace the name match:

```ts
// before
const isEngineOil = selectedMt?.name === "Engine Oil";
// after
const isEngineOil = !!selectedMt?.requiresOilType;
```

The select it gates (`:191-198`) is otherwise unchanged. Web spec 07 §20 already recorded the name match as a stand-in — "no separate 'is this an oil-type-needing category' flag exists on the backend, so this is inferred client-side by name". This closes that.

**`components/(main)/SettingsCatalog/MaintenanceTypeSection.tsx`** — add the checkbox to the add form (`:45-70`) and the inline-edit row (`:179-231`), included in the `POST` (`:50`) and `PATCH` (`:94`) bodies.

**Reuse `components/shared/input/ControlledCheckbox.tsx`** (wrapping `components/ui/checkbox.tsx`), already used by `FuelLogFormModal`. No new primitive. `EngineOilTypeSection.tsx` needs no equivalent — the flag lives only on maintenance types.

Note the inline-edit row is a `<tr>` sharing the table's columns; spec 43 in the app repo hit a width problem with exactly this pattern. Check the checkbox does not squeeze the name input at a phone-width viewport, and stack if needed.

## §C Empty states (forced by the empty-catalog decision)

**`MaintenanceLogFormModal.tsx`** — when `mtOptions` is empty (built at `:158-165`), show an empty state instead of an empty `ControlledSelectField`, pointing at Settings → catalog. Without it a brand-new user sees a form that looks broken.

`CatalogCard.tsx:76-95` already switches its `<tbody>` between `Skeleton` / `emptyText` / rows, so the Settings panels handle empty correctly — but review the `emptyText` values passed at the two call sites so they read sensibly for a genuinely new user rather than implying a load failure.

## §D Copy

- **`MaintenanceTypeSection.tsx:132`** — `"Shared catalog · used by maintenance logs and reminders"` → `"Your catalog · used by your maintenance logs and reminders"`.
- **`EngineOilTypeSection.tsx:109`** — the equivalent subtitle.
- **`Catalog.tsx:18`** — `"Types shared by all your bikes"` still reads correctly after the change (shared across _your_ bikes, which remains true) and needs no edit. Noted so it is not changed reflexively.

## §E Error-status drive-by (deliberate, scoped)

**`utils/axiosInstance.ts:54`:**

```ts
// before
statusCode: error?.response?.data?.statusCode || 500,
// after
statusCode: error?.response?.status ?? 500,
```

The server's `globalErrorHandler` sends `{ success, message, errorSources, stack }` — it has **never** sent `data.statusCode`. So this field is always 500 and the web client is structurally blind to every status code, as `bikelog_app/utils/axiosInstance.ts:80-82` already documents from the app side.

This is **not strictly forced** by the server change: the per-component `toast.warning(message)` on delete (`MaintenanceTypeSection.tsx:122-124`) renders the server's 409 sentence correctly regardless, and the new cross-user refusal is a 404 which also surfaces its message. It is two tokens, it un-blinds the client for everything after this, and it is recorded here explicitly so a reviewer knows it was intentional rather than scope creep.

---

## Implementation checklist

- [x] 1. `app/QueryProvider.tsx` — `useState(() => new QueryClient())`
- [x] 2. `AppShell.tsx` — `queryClient.clear()` + hard nav in `handleLogout`. `router` is kept for a non-browser fallback branch so the import does not become unused.
- [x] 3. `LoginForm.tsx` — `clear()` before `setToken`
- [x] 4. `type/maintenance-type.types.ts` — `requiresOilType: boolean` on the entity, optional on both payload types
- [x] 5. `MaintenanceTypeSection.tsx` — checkbox in the add form and the edit row; both payloads. **Not `ControlledCheckbox`** — it calls `useFormContext()` and this file has no react-hook-form at all, so it would throw at render. Uses the `components/ui/checkbox` primitive `ControlledCheckbox` itself wraps, driven by the same `useState` pattern as every other field here. See spec 30a §1.
- [x] 6. `MaintenanceLogFormModal.tsx` — gate on the flag; empty state replacing the whole form (not just the select) when the catalog is empty, with a link to Settings → catalog that closes the modal. Scoped to **create mode**: a user who soft-deleted every type still has existing logs and must be able to edit one's odometer/cost/notes, so swapping the form out in edit mode would remove more than the unusable type select.
- [x] 7. Copy fixes (§D) — including `EngineOilTypeSection`'s subtitle, which was **not** the "Shared catalog · …" string §D predicted but `"Suggested interval pre-fills the Engine Oil service form"` — i.e. the same magic string §B exists to delete, in prose instead of code. See spec 30a §2. Both `emptyText` values rewritten for a genuinely new user, per §C.
- [x] 8. `utils/axiosInstance.ts` — the status-code drive-by (§E)
- [x] 9. `yarn build` + `yarn lint` clean — 0 errors, 5 warnings, all pre-existing (4 React-Compiler "incompatible library" on `useReactTable`/RHF `watch()`, 1 unused `activeTab`). `grep -rn '=== "Engine Oil"'` and `grep -rn "Shared catalog"` have no live hits; the only `"Engine Oil"` occurrences left are two comments recording what was removed.
- [ ] 10. Phone-width viewport verification (§Test plan) — **not run.** Blocked on the server rollout, see below.
- [ ] 11. Mark **Complete** in `progress-tracker.md` — pending step 10.

---

## Test plan

Requires the server's spec 46 deployed (or a local server on a Neon branch with it applied), and **two** registered users. Phone-width viewport (375–430px) per this project's standing target; Playwright has been used for this in past passes.

**The leak test — the headline.** Exact click path:

1. Log in as user A. Go to `/settings/catalog`. Confirm A's maintenance types and engine oil types.
2. Open a bike → maintenance logs → the create modal. Note the type options.
3. Log out via the `AppShell` logout button.
4. Log in as user B. **Expect B's catalog only** at `/settings/catalog`, with none of A's rows, not even momentarily.
5. Open B's maintenance-log modal. Expect B's options only.

Note that step 3→4 must be exercised **without** a manual hard refresh — a manual reload would mask the bug, since it is precisely the soft nav that preserves the cache. Also confirm the already-safe path still works: force a 401 and check the hard redirect drops everything.

**`requiresOilType`:**

- New user C: both catalog cards show their empty text; the maintenance-log modal shows the §C empty state, not a blank select.
- C creates a type with the checkbox **on** → selecting it reveals the oil-type select; **off** → it stays hidden.
- Existing user A: a pre-existing type whose name was the seeded oil row comes back `requiresOilType: true` from the server backfill, so A's behaviour is unchanged. **If not**, see server spec 46 H7 — production may hold `"Engine Oil Change"`, meaning the dropdown was already dead before this change. Record what is observed.
- Inline-edit an existing type to flip the checkbox both ways; confirm the `PATCH` round-trips and that the inline-edit row still lays out correctly at 375px (§B).

**Regression, existing user A:** both catalog cards render; inline rename round-trips (`PATCH` → refetch → new name visible); delete a type a live log uses → `toast.warning` with the server's sentence verbatim; delete an unused type → succeeds via `ConfirmDeleteModal`; re-add a just-deleted name → revives with the same `_id`. A cross-user id now returns 404 and surfaces its message through the existing per-component handling.

Maintenance-log cards and `RemindersBanner` must show real type names, never a fallback. Zero browser console errors on every page visited, including no hydration mismatch — same bar as spec 25's verification.

**Static:** `yarn build` + `yarn lint` clean (6 pre-existing warnings, 0 errors, none new). `grep -rn '=== "Engine Oil"'` and `grep -rn "Shared catalog"` → no hits.

---

## Explicitly NOT changing

- **All eight endpoint URLs** — the server keeps both catalogs top-level (server spec 46 §F).
- **Query keys** `["maintenanceTypes"]` / `["engineOilTypes"]` — clearing on logout and login is the isolation mechanism; keying by user id is a larger change for the same guarantee.
- **`hooks/useApi.ts`** and the react-query defaults.
- **`CatalogCard.tsx`** — only the values of its `subtitle` / `emptyText` props change, at the call sites.
- **`type/engine-oil-type.types.ts`** — the flag lives only on maintenance types.
- **`ConfirmDeleteModal`** and its copy, including its deliberate placement outside `CatalogCard` (`:268` explains why: a modal inside a `<tr>` is invalid DOM nesting).
- **`MaintenanceLogCard` / `RemindersBanner`** name resolution.
- **`app/(main)/layout.tsx`'s session gate** — stays a synchronous cookie check per this project's protected-files rule; the cache fix does not touch it.
- **`lib/tokenManager.ts`** — no change to the cookie mechanism.

## Open items

- Keying caches by user id would make isolation structural rather than dependent on remembering to `clear()`. Deliberately deferred — `clear()` on logout and login covers the realistic paths.
- This client still cannot distinguish error _classes_ beyond what §E unlocks, because `globalErrorHandler` sends no machine-readable code. Centralising Prisma/HTTP error mapping is a backend decision, tracked in server spec 46's Open items.

---

## Rollout order — read before deploying this (added 2026-10-04)

This spec's own opening says it "is not a release blocker for the server" and that the clients "can ship in either order". **That is true of the wire contract but not of the user-visible behaviour, and the distinction matters here.** The dependency runs the other way for one feature:

`requiresOilType` is `@default(false)` on the server. Applying server migration A gives every existing catalog row `false`; it is the server's **backfill** (`--apply`, seeding the flag from the real oil-change row name) that sets it `true`. So between deploying this client and completing that backfill, `isEngineOil` is permanently false and **the engine-oil dropdown is unreachable for everyone**, including existing users who have it today via the name match.

Nothing is lost — a maintenance log's `oilType` is optional and existing logs keep theirs — but it is a visible regression in that window.

**So: complete `bikelog_server` spec 46's rollout first** (its "Operator runbook" section, through migration C), then deploy this. In that order every item in §Test plan is meaningful. In the other order the headline leak test would pass for the wrong reason — the server is still serving one global catalog, so both users legitimately see the same rows and a leak cannot be distinguished from correct behaviour.

The §A cache-isolation work is the one part that is genuinely order-independent and correct to ship now: it fixes a real leak of *any* cached data between users in the same tab, catalogs or not.

### What was verified, and what was not

- **Verified:** `yarn build` (all 17 routes compile), `yarn lint` (0 errors, no new warnings), the two grep checks, and a local `next dev` smoke run in which `/login` and `/settings/catalog` both compile and serve 200 with no compile errors.
- **Not verified:** anything requiring a live API. No login, no two-user leak test, no `requiresOilType` round-trip, no 375px layout check of the inline-edit row's new checkbox, no console-error sweep. Every behavioural claim above is derived from the code.
