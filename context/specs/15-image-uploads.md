# 15: Image Uploads (Receipt / Service / Product / Issue Evidence Photos)

Status: ✅ Complete

## Goal

Client for the backend's already-complete Cloudinary image-upload feature (`bikelog_server/context/specs/17-image-file-upload.md`, spec 17, Status: Complete). Let a rider attach/replace/remove a receipt photo on a fuel log, a service/invoice photo on a maintenance log, a product photo on a bike accessory, and up to 5 evidence photos on a bike issue — directly from the existing list/table UI, with no new pages or routes.

Note: an older planning doc, `v2-proposed-features/03-photo-receipt-attachments.md`, describes a different design (single photo folded into create/update, `receiptPhotoUrl: string`). **That proposal is superseded** — it is not what the backend actually built. This spec is written against the real, shipped backend contract below.

## Context

Backend contract (verified against actual source, spec 17):

| Module         | Field                             | Routes (mounted under `/api/bikes/:bikeId/...`)                                                 | Form field                          | Cardinality |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- | ----------- |
| fuelLog        | `receiptImage?: {url, publicId}`  | `PUT/DELETE fuel-logs/:id/image`                                                                | `image`                             | 1           |
| maintenanceLog | `serviceImage?: {url, publicId}`  | `PUT/DELETE maintenance-logs/:id/image`                                                         | `image`                             | 1           |
| bikeAccessory  | `productImage?: {url, publicId}`  | `PUT/DELETE accessories/:id/image`                                                              | `image`                             | 1           |
| bikeIssue      | `images?: {url, publicId, _id}[]` | `POST issues/:id/images` (max 5/request, additive `$push`), `DELETE issues/:id/images/:imageId` | `images` (repeat form key per file) | many        |

- Every route: `authCheck`, image-only `fileFilter` (any non-`image/*` mimetype 400s cleanly before reaching Cloudinary), 5MB max file size.
- Response envelope on all 7 endpoints: `{ success, message, data, token }` where `data` is the **full updated parent document** (e.g. the whole `fuelLog`, not a bare `{url, publicId}`), status `200` (not `201` — these mutate existing records).
- `PUT .../image` **replaces**: server deletes the old Cloudinary asset first, then stores the new one. `DELETE .../image` unsets the field and deletes the Cloudinary asset.
- bikeIssue's `POST .../images` is additive only (never replaces the array); `DELETE .../images/:imageId` removes exactly one subdocument by its own auto-generated `_id`.
- No image field exists on `bike` itself — explicitly out of scope, matches spec 17.
- API base is `/api` (no version segment) — matches this client's existing `axiosInstance` baseURL, no change needed there.

Frontend precedent already in place (verified against actual source):

- `utils/axiosInstance.ts` — request interceptor already branches on `config.data instanceof FormData`, setting `multipart/form-data` automatically (otherwise `application/json`). **No interceptor change needed.**
- `hooks/useApi.ts` — `usePost`/`usePatch`'s `payload` type is already `Record<string, unknown> | FormData`. **However, neither `utils/api.ts` nor `hooks/useApi.ts` has any `PUT` support today** — only `apiGet/apiPost/apiPatch/apiDelete` and `useFetchData/usePost/usePatch/useDelete` exist. Since 3 of the 4 modules' image routes are `PUT`, this is a real gap this spec must close (see Design).
- `components/shared/input/FileUploadController.tsx` exists but is RHF-`Controller`-bound and unused by any live feature — not reused here, since image upload is a standalone action outside the create/edit form (mirrors the backend's own deliberate choice not to fold this into the JSON CRUD routes).
- `next.config.ts`'s `images.remotePatterns` currently only whitelists `i.postimg.cc` and `i.pravatar.cc`. Cloudinary-hosted URLs (`res.cloudinary.com`) are a new host this app has never served images from — `next/image` throws at runtime for any un-whitelisted host, so this must be added.

## Design

### New shared plumbing

- `utils/api.ts` — add `apiPut(endpoint: string, payload: object, config?: AxiosRequestConfig)`, mirroring `apiPost`'s exact signature, calling `axiosInstance.put(endpoint, payload, config)`.
- `hooks/useApi.ts` — add `usePut(invalidateQueriesKeys?: Array<string[]>)`, identical shape to `usePatch`, `payload: FormData` (single-image PUT routes only ever send `FormData`, never plain JSON).
- `next.config.ts` — add `{ protocol: "https", hostname: "res.cloudinary.com" }` to `images.remotePatterns`.
- New shared type `components/shared/type/image.types.ts` — `export type TCloudinaryImage = { url: string; publicId: string };` (first genuinely cross-domain type in this codebase; no existing shared-types precedent to follow, so this is a new, minimal file rather than an addition to an existing one).

### New shared components

- **`components/shared/input/ImageUploadThumb.tsx`** — single-image variant, reused by fuelLog/maintenanceLog/bikeAccessory. Not RHF-bound (standalone action, not a form field). Props:
  ```ts
  type TImageUploadThumbProps = {
    imageUrl?: string;
    onUpload: (file: File) => void;
    onDelete: () => void;
    uploading: boolean;
    label?: string; // e.g. "Receipt", "Service Photo", "Product Photo"
  };
  ```
  Renders a small bordered square (`next/image` if `imageUrl` is set, otherwise a placeholder icon + `label`). Clicking it opens a hidden `<input type="file" accept="image/*" className="hidden" />`; selecting a file calls `onUpload(file)` immediately (no separate "confirm" step — matches the "inline click-to-upload" UX decision). When `imageUrl` is set, a small `X` overlay button (top-right, same visual treatment as `FileUploadController.tsx`'s existing delete button) calls `onDelete` after a native `confirm()` (matching every other delete action in this app). A spinner overlay covers the thumbnail while `uploading` is true, with the file input disabled.
- **`components/shared/input/ImageGalleryField.tsx`** — bikeIssue's multi-image variant. Props:
  ```ts
  type TImageGalleryFieldProps = {
    images: { _id: string; url: string; publicId: string }[];
    onAdd: (files: File[]) => void;
    onRemove: (imageId: string) => void;
    uploading: boolean;
  };
  ```
  A `flex flex-wrap gap-2` row of existing thumbnails (each its own bordered square with an `X` overlay calling `onRemove(image._id)`, confirm dialog first), plus a trailing dashed "+" add tile that opens a `<input type="file" accept="image/*" multiple />`. The file input's `onChange` slices the selected `FileList` to at most `5 - images.length` files (server's own per-request cap of 5, not a stricter client invention) before calling `onAdd`; if the user picks more than that, show a toast noting only the first N were queued.

### Per-domain integration

Each domain wires the new hooks + the appropriate component, invalidating the same query key its list view already uses:

- **fuelLog** (table-based, `fuelLogColumns.tsx`) — add a new `ColumnDef<TFuelLog>` ("Receipt") rendering `ImageUploadThumb` with `imageUrl={row.original.receiptImage?.url}`. Upload handler builds `FormData` (`formData.append("image", file)`) and calls `usePut(["fuelLogs", bikeId])` against `PUT /bikes/${bikeId}/fuel-logs/${row.original._id}/image`; delete handler calls `useDelete(["fuelLogs", bikeId])` against the same path.
- **maintenanceLog** (`MaintenanceLogCard.tsx`) — add `ImageUploadThumb` near the top of the card body, wired to `PUT/DELETE .../maintenance-logs/${log._id}/image`, invalidating `["maintenanceLogs", bikeId]`.
- **bikeAccessory** (`BikeAccessoryCard.tsx`) — add `ImageUploadThumb`, wired to `PUT/DELETE .../accessories/${accessory._id}/image`, invalidating `["bikeAccessories", bikeId, ...]` (matches the existing filter-aware query key from spec 12).
- **bikeIssue** (`BikeIssueCard.tsx`) — add `ImageGalleryField`, `onAdd` builds one `FormData` with `images` appended once per file and calls `usePost(["issues", bikeId])` against `POST .../issues/${issue._id}/images`; `onRemove` calls `useDelete(["issues", bikeId])` against `DELETE .../issues/${issue._id}/images/${imageId}`.

### Types

Add to each domain's existing type file:

```ts
// type/fuel-log.types.ts
receiptImage?: TCloudinaryImage;

// type/maintenance-log.types.ts
serviceImage?: TCloudinaryImage;

// type/bike-accessory.types.ts
productImage?: TCloudinaryImage;

// type/bike-issue.types.ts
images?: (TCloudinaryImage & { _id: string })[];
```

All four additions are optional, matching the backend's additive/no-migration schema change — existing records without these fields render exactly as they do today (placeholder tile, empty gallery).

## Implementation

1. [x] `utils/api.ts` — add `apiPut`.
2. [x] `hooks/useApi.ts` — add `usePut`.
3. [x] `next.config.ts` — add `res.cloudinary.com` to `images.remotePatterns`.
4. [x] `components/shared/type/image.types.ts` — new file, `TCloudinaryImage`.
5. [x] `components/shared/input/ImageUploadThumb.tsx` — new file.
6. [x] `components/shared/input/ImageGalleryField.tsx` — new file.
7. [x] `components/(main)/fuelLog/type/fuel-log.types.ts` — add `receiptImage?`.
8. [x] `components/(main)/fuelLog/fuelLogColumns.tsx` — new "Receipt" column (new `FuelLogReceiptCell.tsx` owns the `usePut`/`useDelete` calls, since column cells can't otherwise scope per-row mutation state cleanly).
9. [x] `components/(main)/MaintenanceLog/type/maintenance-log.types.ts` — add `serviceImage?`.
10. [x] `components/(main)/MaintenanceLog/MaintenanceLogCard.tsx` — integrate `ImageUploadThumb` (card owns its own `usePut`/`useDelete` instance, keyed off `log.bike`).
11. [x] `components/(main)/BikeAccessory/type/bike-accessory.types.ts` — add `productImage?`.
12. [x] `components/(main)/BikeAccessory/BikeAccessoryCard.tsx` — integrate `ImageUploadThumb`.
13. [x] `components/(main)/BikeIssue/type/bike-issue.types.ts` — add `images?`.
14. [x] `components/(main)/BikeIssue/BikeIssueCard.tsx` — integrate `ImageGalleryField`.

## Dependencies

None beyond the four domains already existing (specs 04/07/11/12) and backend spec 17 being deployed and reachable. No new npm packages — confirmed no dropzone/cropper library is needed for a plain click-to-upload thumbnail; `next/image` and native `<input type="file">` cover everything.

## Verify

- [x] `yarn build` / `yarn lint` clean — same 5 pre-existing warnings (2× `useReactTable` incompatible-library, 1× `watch()` incompatible-library, 2× unused-var), none new.
- [x] Uploading a receipt image on a fuel log row shows the thumbnail immediately and persists across a page refresh. Code-reviewed against the confirmed backend contract and this app's established `usePut`/query-invalidation pattern — no interactive browser tool is available in this environment to literally click through, same standing limitation as every prior spec in this project.
- [x] Re-uploading replaces the image (old Cloudinary asset is destroyed server-side per spec 17's own verified behavior; client shows only the new thumbnail, no duplicate) — `PUT .../image` always overwrites the single `receiptImage`/`serviceImage`/`productImage` field, never appends, so no duplicate-rendering path exists in the code. Code-reviewed, not clicked through.
- [x] Deleting an image clears the thumbnail back to the placeholder state — `onDelete` invalidates the same query key the list already reads, and `ImageUploadThumb` renders the placeholder whenever `imageUrl` is falsy. Code-reviewed, not clicked through.
- [x] Repeat upload/replace/delete for maintenance log (`serviceImage`) and bike accessory (`productImage`) — both cards wire the identical `usePut`/`useDelete` pattern as the fuel log receipt cell. Code-reviewed, not clicked through.
- [x] bikeIssue gallery: adding 2-3 images shows all of them with distinct thumbnails (keyed by each subdocument's own `_id`); removing one by its `X` calls `DELETE .../images/:imageId` for that id only, others remain untouched in both the array and the UI. Code-reviewed, not clicked through.
- [x] Selecting more than `5 - current count` files in the bikeIssue picker only queues the allowed number (`files.slice(0, remaining)`) and shows a `toast.info` explaining why.
- [x] A non-image file is rejected by the native file picker's `accept="image/*"` filter; if bypassed, the server's 400 surfaces as a `toast.error` reading `error.message` (matches this app's existing `error.message`-from-flattened-axios-error convention, not a silent failure).
- [x] Attempting any image action against a bike/record owned by a different user 404s (existing `findOwnedBikeOrThrow` ownership check — no client-side change needed; the same `error.message` toast path surfaces the 404's message).
- [x] Usable at ~375–430px width — all new UI (`size-16` thumbnails, `flex flex-wrap` gallery) uses the same unprefixed mobile-first Tailwind convention as every other domain, no `sm:`/`md:` overrides introduced. Not visually confirmed in an actual browser — no interactive browser tool is available in this environment, same standing limitation noted throughout this project's progress tracker.
