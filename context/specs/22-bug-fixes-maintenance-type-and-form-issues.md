# 22: Bug Fixes — Maintenance Type Display, Accessory Price Validation, Stale Form State, usePatch Config

Status: ✅ Complete

## Goal

Fix four bugs found during a source-level bug-hunt pass:

1. Maintenance log list always shows the generic label "Maintenance" instead of the real type name.
2. The Bike Accessory form's `price` field rejects submission when left blank, even though it's meant to be optional.
3. Every domain's "Add" modal (plus the Bike "Edit" modal) retains stale form values across close/reopen instead of resetting.
4. `usePatch`'s `config` parameter is silently dropped, unlike `usePost`/`usePut`.

## Context

**Bug 1.** `bikelog_server/src/app/modules/maintenanceLog/maintenanceLog.service.ts`'s `getMaintenanceLogsFromDB` (backing `GET /bikes/:bikeId/maintenance-logs`) never calls `.populate("maintenanceType")` — every log's `maintenanceType` field comes back as a bare ObjectId string, never `{_id, name}`. `components/(main)/MaintenanceLog/MaintenanceLogCard.tsx`'s `getTypeName()` checks `typeof log.maintenanceType === "object"` but has no ID-lookup fallback for the string case — it just falls through to the literal `"Maintenance"`. This is distinct from the already-tracked `RemindersBanner.tsx` bug (different endpoint/function) and is a **web-only** regression: `bikelog_app/components/main/MaintenanceLog/MaintenanceLogCard.tsx` already does the correct `maintenanceTypes.find(t => t._id === typeId)?.name` lookup, and this project's own `MaintenanceLogFormModal.tsx` already fetches the list the same way (`useFetchData<TMaintenanceType[]>(["maintenanceTypes"], "/maintenance-types")`, `mtData?.data ?? []`) — this spec just applies that identical, already-proven pattern to the card.

**Bug 2.** `components/(main)/BikeAccessory/schema/bike-accessory.schema.ts`'s `price` field is `z.string().optional().refine(...)`, but `.optional()` only widens the _type_; the chained `.refine()` callbacks still run against `undefined` (no `if (!val) return true` guard, unlike the correctly-written `currentOdometer` in `bike.schema.ts` or `nextDueDate` in `maintenance-log.schema.ts`, which both guard). `Number(undefined)` is `NaN`, so `!isNaN(NaN)` is `false` and the refine fails — blocking submission of an accessory with no price, even though `BikeAccessoryFormModal.tsx` doesn't mark the field required and its own `onSubmit` already treats it as optional (`...(data?.price ? { price: Number(data?.price) } : {})`). Backend confirms price truly is optional (`bikeAccessory.validation.ts`: `price: z.number().positive().optional()`) — this is a pure client-side regression.

**Bug 3.** Every domain's list page renders its "Add" `XFormModal` unconditionally (`<XFormModal open={isCreateModalOpen} onClose={...} bikeId={bikeId} />`, visibility toggled only via the `open` prop) rather than conditionally (`{isCreateModalOpen && <XFormModal .../>}`, the pattern each domain's own _Edit_ modal already uses correctly, e.g. `{editingFuelLog && <FuelLogFormModal open .../>}`). Because the modal's `useForm()` never unmounts, and no `onSubmit` calls `.reset()` (except one edit-only case in `MaintenanceLogFormModal.tsx`), typed-but-uncommitted values (or just-submitted values) persist into the next "Add" open. Confirmed identical unconditional-render pattern in:

- `components/(main)/fuelLog/FuelLog.tsx:87` (`FuelLogFormModal`, `isCreateModalOpen`)
- `components/(main)/BikeIssue/BikeIssue.tsx:150` (`BikeIssueFormModal`, `createOpen`)
- `components/(main)/BikeAccessory/BikeAccessory.tsx:158` (`BikeAccessoryFormModal`, `createOpen`)
- `components/(main)/BikeDocument/BikeDocument.tsx:95` (`BikeDocumentFormModal`, `createOpen`)
- `components/(main)/MaintenanceLog/MaintenanceLog.tsx:100` (`MaintenanceLogFormModal`, `createOpen`)

`components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx:139` has the same issue on its **Edit** modal specifically (`<BikeFormModal open={editOpen} onClose={...} bike={bike} />`) — unlike every other domain, this is the sole edit modal not wrapped in a conditional, so a cancelled in-progress edit's dirty values can resurface the next time Edit is opened on the same bike.

**Bug 4.** `hooks/useApi.ts`'s `usePatch` declares `config?: AxiosRequestConfig` in its mutation params type but its `mutationFn` calls `apiPatch(params.url, params.payload)` — dropping `config` — and `utils/api.ts`'s `apiPatch(endpoint, payload)` doesn't even accept a third parameter, unlike `apiPost`/`apiPut` which both do. Not triggered today (no current `usePatch(...)` call site passes `config`), but it's a real inconsistency versus `usePost`/`usePut`'s identical-looking signatures, and would silently swallow custom Axios config (headers, `onUploadProgress`, etc.) the moment a future PATCH-based need arises, with no compiler error to catch it.

## Design

**Bug 1 fix** — mirror `MaintenanceLogFormModal.tsx`'s already-correct pattern: fetch the maintenance-types list in the list page and resolve the name by ID in the card.

```diff
 // MaintenanceLog.tsx
+import { TMaintenanceType } from "../SettingsCatalog/type/maintenance-type.types";
 ...
+  const { data: mtData } = useFetchData<TMaintenanceType[]>(
+    ["maintenanceTypes"],
+    "/maintenance-types",
+  );
+  const maintenanceTypes = mtData?.data ?? [];
 ...
             <MaintenanceLogCard
               key={log._id}
               log={log}
+              maintenanceTypes={maintenanceTypes}
               onEdit={handleEdit}
               onDelete={handleDelete}
             />
```

```diff
 // MaintenanceLogCard.tsx
+import { TMaintenanceType } from "../SettingsCatalog/type/maintenance-type.types";
 type TProps = {
   log: TMaintenanceLog;
+  maintenanceTypes: TMaintenanceType[];
   onEdit: (log: TMaintenanceLog) => void;
   onDelete: (log: TMaintenanceLog) => void;
 };

-function getTypeName(log: TMaintenanceLog): string {
+function getTypeName(log: TMaintenanceLog, maintenanceTypes: TMaintenanceType[]): string {
   if (typeof log.maintenanceType === "object" && log.maintenanceType?.name) {
     return log.maintenanceType.name;
   }
+  if (typeof log.maintenanceType === "string") {
+    const match = maintenanceTypes.find((mt) => mt._id === log.maintenanceType);
+    if (match) return match.name;
+  }
   return "Maintenance";
 }

-export default function MaintenanceLogCard({ log, onEdit, onDelete }: TProps) {
+export default function MaintenanceLogCard({ log, maintenanceTypes, onEdit, onDelete }: TProps) {
 ...
-            <p className="text-sm font-medium">{getTypeName(log)}</p>
+            <p className="text-sm font-medium">{getTypeName(log, maintenanceTypes)}</p>
```

**Bug 2 fix** — guard both refines against `undefined`/empty, matching `bike.schema.ts`'s `currentOdometer` pattern:

```diff
 // bike-accessory.schema.ts
   price: z
     .string()
     .optional()
-    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
+    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
       message: "Cost must be a valid number",
     })
-    .refine((val) => Number(val) <= 999999, {
+    .refine((val) => !val || Number(val) <= 999999, {
       message: "Cost cannot exceed 999,999",
     }),
```

**Bug 3 fix** — wrap each unconditionally-rendered Create modal (and `BikeDetailPage.tsx`'s Edit modal) in a conditional, matching the already-correct Edit-modal pattern used everywhere else:

```diff
 // FuelLog.tsx (same one-line-wrapper change in BikeIssue.tsx, BikeAccessory.tsx, BikeDocument.tsx, MaintenanceLog.tsx)
-      <FuelLogFormModal
-        open={isCreateModalOpen}
-        onClose={() => setIsCreateModalOpen(false)}
-        bikeId={bikeId}
-      />
+      {isCreateModalOpen && (
+        <FuelLogFormModal
+          open
+          onClose={() => setIsCreateModalOpen(false)}
+          bikeId={bikeId}
+        />
+      )}
```

```diff
 // BikeDetailPage.tsx
-      <BikeFormModal
-        open={editOpen}
-        onClose={() => setEditOpen(false)}
-        bike={bike}
-      />
+      {editOpen && (
+        <BikeFormModal
+          open
+          onClose={() => setEditOpen(false)}
+          bike={bike}
+        />
+      )}
```

**Bug 4 fix** — forward `config` through `usePatch`/`apiPatch`, matching `usePost`/`apiPost`'s existing shape exactly:

```diff
 // utils/api.ts
-export const apiPatch = async (endpoint: string, payload: object) =>
-  (await axiosInstance.patch(endpoint, payload)).data;
+export const apiPatch = async (
+  endpoint: string,
+  payload: object,
+  config?: AxiosRequestConfig,
+) => (await axiosInstance.patch(endpoint, payload, config)).data;
```

```diff
 // hooks/useApi.ts
   return useMutation({
     mutationFn: (params: {
       url: string;
       payload: Record<string, unknown> | FormData;
       config?: AxiosRequestConfig;
-    }) => apiPatch(params.url, params.payload),
+    }) => apiPatch(params.url, params.payload, params.config),
```

## Implementation

- [x] `components/(main)/MaintenanceLog/MaintenanceLog.tsx` — fetch `/maintenance-types`, pass `maintenanceTypes` to `MaintenanceLogCard`.
- [x] `components/(main)/MaintenanceLog/MaintenanceLogCard.tsx` — `getTypeName` resolves a string `maintenanceType` against the passed-in list.
- [x] `components/(main)/BikeAccessory/schema/bike-accessory.schema.ts` — guard both `price` refines against empty/`undefined`.
- [x] `components/(main)/fuelLog/FuelLog.tsx`, `BikeIssue/BikeIssue.tsx`, `BikeAccessory/BikeAccessory.tsx`, `BikeDocument/BikeDocument.tsx`, `MaintenanceLog/MaintenanceLog.tsx` — wrap each Create-modal render in `{isCreateOpenState && <XFormModal open .../>}`.
- [x] `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` — wrap the Edit `BikeFormModal` render in `{editOpen && <BikeFormModal open .../>}`.
- [x] `utils/api.ts` — `apiPatch` accepts and forwards `config`.
- [x] `hooks/useApi.ts` — `usePatch`'s `mutationFn` forwards `params.config` to `apiPatch`.

## Dependencies

None. No backend change, no new package. Bug 1 relies only on the already-existing `/maintenance-types` endpoint and `TMaintenanceType` type, both already used elsewhere in this same domain.

## Verify

- [x] `yarn lint` / `yarn build` clean, no new warnings. (`yarn lint`: 0 errors, same 5 pre-existing warnings as baseline, none new. `yarn build`: succeeds, all 15 routes compile including full `tsc` type-check.)
- [x] Code-review confirms: maintenance log cards resolve real type names from a string `maintenanceType`; accessory form submits successfully with `price` left blank; every Create modal (and the Bike Edit modal) is now conditionally rendered; `apiPatch`/`usePatch` signatures match `apiPost`/`usePost`'s shape.
- [ ] **Manual browser confirmation pending** (standing limitation of this project — no interactive browser tool available in this session): open "Add Fuel Log" (or any domain), type values, cancel, reopen — form is blank; submit an accessory with no price — succeeds; maintenance log list shows real type names instead of "Maintenance".
