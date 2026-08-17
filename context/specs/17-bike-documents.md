# 17: Bike Documents (Papers/IDs, mixed image+PDF, expiry tracking)

Status: ✅ Complete

## Goal

Let a rider store scanned/photographed bike paperwork — registration paper, tax token, purchase paper, driving license, bank receipt, or anything else — with an optional expiry date, and attach multiple image/PDF files to each entry after creation. Client for the backend's planned `bikeDocument` module (`bikelog_server/context/specs/19-bike-documents.md`, spec 19, Status: Not started — build/verify the backend spec first, or in lockstep, since this client has nothing to call otherwise).

## Context

Backend contract (per spec 19's design — verify against the real shipped API before wiring this up, the same way spec 15 caught spec 17's design deviating in practice):

- `POST /api/bikes/:bikeId/documents` — body `{ title, description?, expiryDate? }`. No file field on create — matches this app's existing two-step precedent (`bikeIssue`: create first, attach files after).
- `GET .../documents` — `page`/`limit`/`sort` supported, defaults to soonest-expiry-first ordering server-side. Response `{ data: { result, meta } }`, `meta` a raw total-count number (same shape as every other list endpoint in this app — `totalPages = Math.ceil(meta / limit)` client-side).
- `GET/PATCH/DELETE .../documents/:id` — PATCH body `{ title?, description?, expiryDate? }`.
- `POST .../documents/:id/files` — multipart, form field `files` (repeated per file, up to 10/request, additive — never replaces), accepts image or PDF mimetypes. Response `data` is the full updated document.
- `DELETE .../documents/:id/files/:fileId` — removes exactly one file by its own subdocument id.
- Each file subdocument: `{ _id, url, publicId, resourceType: "image" | "raw", originalName, mimeType }` — `resourceType`/`mimeType` are new fields this client hasn't handled before (every prior upload feature, spec 15, was images-only); use `resourceType === "raw"` (or `mimeType === "application/pdf"`) to decide thumbnail vs. file-icon rendering, and `originalName` as the visible label for non-image entries since a PDF can't be meaningfully thumbnailed.
- Response envelope: `{ success, message, data, token }`, same as every other module.
- IDOR/soft-delete handled entirely server-side via the existing `findOwnedBikeOrThrow` pattern — nothing extra needed client-side.

Frontend precedent already in place (verified against actual source):

- `components/(main)/BikeIssue/` is the closest two-step-create-then-attach template (spec 11) — reuse its `BikeIssue.tsx` / `BikeIssueCard.tsx` / `BikeIssueFormModal.tsx` split, its `schema/`+`type/` subfolder convention, and its dual-mounted create/edit modal pattern.
- `components/shared/input/ImageGalleryField.tsx` (spec 15) is the only existing multi-file component, but it's images-only (`accept="image/*"`, renders every thumbnail via `next/image`) — **it cannot render a PDF entry**, and reusing it as-is would break on the first PDF upload. This spec adds a new sibling component rather than bending `ImageGalleryField` to do two unrelated things (see Design).
- `hooks/useApi.ts`'s `usePost`/`useDelete` and `utils/axiosInstance.ts`'s FormData-vs-JSON content-type auto-detection (spec 15) need no changes — this feature only needs `POST`/`DELETE` on the files sub-route, both already supported.
- `components/shared/input/ControlledDateSelect.tsx` (Radix Popover + `react-day-picker`, RHF-`Controller`-bound) is the existing date-field precedent (`bikeIssue.dateReported`, `bike.purchaseDate`, `maintenanceLog.serviceDate`/`nextDueDate`) — reused as-is for `expiryDate`, no new date-picker component needed. Its placeholder text is currently hardcoded to `"Select purchase date"` regardless of field — worth adding an optional `placeholder` prop while touching this file so the new `expiryDate` field doesn't show a misleading label; a small, contained fix, not a rewrite.
- No `type`/category enum exists in the backend contract (spec 19 deliberately keeps `title` free-text, matching how the user actually described the feature) — so no `ControlledSelectField` dropdown for document type; a single `ControlledInput` for `title` covers it, exactly like `bikeIssue.title`.

## Design

- **List UI: card-list**, not a table — same reasoning as `bikeIssue`/`MaintenanceLog` (prose `description` field doesn't fit a table cell, and the file gallery needs vertical room per card).
- `components/(main)/BikeDocument/BikeDocument.tsx` — list page, structurally identical to `BikeIssue.tsx`: `bikeId` via `useParams()`, `page` state, `useFetchData<TBikeDocumentsApiResponse>(["bikeDocuments", bikeId, page.toString()], \`/bikes/${bikeId}/documents?page=&limit=\`)`. No status filter (documents have no lifecycle field, unlike issues). Renders the card list plus a create `BikeDocumentFormModal`(always mounted) and an edit instance (conditionally mounted on the selected document) — same dual-render pattern as`BikeIssue.tsx`.
- `components/(main)/BikeDocument/BikeDocumentCard.tsx` — `rounded-lg border border-border bg-card p-4`. Title + an expiry badge on one line (see below), description below (if present), then the file gallery. Action row: `SquarePen` (Edit — title/description/expiryDate only, same as `bikeIssue`'s edit scope), `Trash2` (Delete, native `confirm()` first, same as every other domain).
- `components/(main)/BikeDocument/BikeDocumentFormModal.tsx` — RHF, inline `defaultValues` from an optional `document?: TBikeDocument` prop, same no-`useEffect`-remount-on-close pattern as `BikeIssueFormModal.tsx`. **No file field at all** — matches the two-step UX, files are attached from the card after creation, never part of this modal.
- **Expiry badge** (new, this feature's one genuinely new small piece of display logic — no backend flag for "expired", computed client-side from `expiryDate` vs. `new Date()` using `date-fns`, already a dependency):
  - No `expiryDate` set → no badge.
  - Past → red/destructive pill, "Expired".
  - Within a configurable near-term window (30 days is a reasonable default, not a backend-enforced number) → amber pill, "Expires in N days" (`date-fns`' `differenceInDays`).
  - Otherwise → neutral/muted pill showing the formatted date, e.g. "Expires Jul 27, 2028".
  - Inline the threshold/lookup logic directly in `BikeDocumentCard.tsx`, matching `bikeIssue`'s precedent of inlining its status-badge lookup rather than introducing a shared constants file for a single-consumer piece of logic.

### File gallery (new shared component — mixed image + PDF)

- **`components/shared/input/FileGalleryField.tsx`** (new, sibling to `ImageGalleryField.tsx`, not a modification of it — `ImageGalleryField` stays images-only for `bikeIssue`, unchanged). Props:

  ```ts
  type TDocumentFile = {
    _id: string;
    url: string;
    publicId: string;
    resourceType: "image" | "raw";
    originalName: string;
    mimeType: string;
  };

  type TFileGalleryFieldProps = {
    files: TDocumentFile[];
    onAdd: (files: File[]) => void;
    onRemove: (fileId: string) => void;
    uploading: boolean;
  };
  ```

  Same `flex flex-wrap gap-2` tile layout as `ImageGalleryField`, but each tile branches on `resourceType`: `"image"` renders the existing `next/image` thumbnail treatment; `"raw"` renders a bordered tile with a generic file icon (`lucide-react`'s `FileText`) plus `originalName` truncated below it, opening `url` in a new tab on click (a PDF can't be previewed inline the way an image can — opening it is the simplest correct behavior, not a custom in-app PDF viewer, which is out of scope). Each tile keeps the existing `X` overlay + `confirm()` + `onRemove(file._id)` pattern. The trailing "+" add tile's hidden input uses `accept="image/*,application/pdf"` and `multiple`, slicing the selected `FileList` to at most `10 - files.length` (the server's per-request cap per spec 19, not a stricter client invention) before calling `onAdd`, with the same "only the first N were queued" toast as `ImageGalleryField` shows at its own (lower) cap of 5.

- `next.config.ts`'s `images.remotePatterns` already whitelists `res.cloudinary.com` (added in spec 15) — no change needed even though this feature adds PDF URLs, since `next/image` is only ever invoked for the `resourceType === "image"` branch.

### Per-domain integration

- `BikeDocumentCard.tsx` owns its own `usePost([["bikeDocuments", document.bike]])` and `useDelete([["bikeDocuments", document.bike]])` instances (matches `BikeIssueCard.tsx`'s self-contained-mutation precedent, not a prop-drilled `bikeId`). `handleAddFiles` builds one `FormData` with `files` appended once per file and calls it against `POST /bikes/${document.bike}/documents/${document._id}/files`; `handleRemoveFile` calls `DELETE .../documents/${document._id}/files/${fileId}`.
- `app/(main)/bikes/[bikeId]/documents/page.tsx` — trivial wrapper rendering `<BikeDocument />`, same 4-line shape as every other bike-scoped route.
- **`BikeDetailPage.tsx` entry point**: add `FileText` (or similar) to the existing `lucide-react` import in `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` and append `{ href: \`/bikes/${bikeId}/documents\`, label: "Documents", icon: FileText }`to the existing`links` array.

### Form fields

| Field         | Component                                     | Required | Notes                                                                                                                                                                           |
| ------------- | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `ControlledInput`                             | yes      | `isRequired`, free-text (e.g. "Bike Registration Paper", "Bank Receipt")                                                                                                        |
| `description` | `ControlledTextArea`                          | no       | `rows={3}`                                                                                                                                                                      |
| `expiryDate`  | `Controller` + `DateSelect` (`mode="single"`) | no       | No pre-fill (unlike `bikeIssue.dateReported`'s `new Date()` default) — most documents don't expire, leaving it blank should be the natural default, not an extra click to clear |

### Types

```ts
// components/(main)/BikeDocument/type/bike-document.types.ts
export type TDocumentFile = {
  _id: string;
  url: string;
  publicId: string;
  resourceType: "image" | "raw";
  originalName: string;
  mimeType: string;
};

export type TBikeDocument = {
  _id: string;
  bike: string;
  title: string;
  description?: string;
  expiryDate?: string;
  files?: TDocumentFile[];
  createdAt: string;
  updatedAt: string;
};

export type TCreateBikeDocumentPayload = {
  title: string;
  description?: string;
  expiryDate?: string;
};

export type TUpdateBikeDocumentPayload = Partial<TCreateBikeDocumentPayload>;

export type TBikeDocumentsApiResponse = {
  result: TBikeDocument[];
  meta: number;
};
```

## Implementation

1. [x] `components/(main)/BikeDocument/type/bike-document.types.ts`
2. [x] `components/(main)/BikeDocument/schema/bike-document.schema.ts` — zod, `title` required (min/max length matching `bikeIssueSchema`'s convention), `description` optional max length, `expiryDate` optional `z.date()` with no refine (unlike `bikeIssue`'s past-only `dateReported`).
3. [x] `components/shared/input/FileGalleryField.tsx` — new shared component.
4. [x] `components/(main)/BikeDocument/BikeDocumentFormModal.tsx`
5. [x] `components/(main)/BikeDocument/BikeDocumentCard.tsx` — includes the inline expiry-badge logic and `FileGalleryField` integration.
6. [x] `components/(main)/BikeDocument/BikeDocument.tsx`
7. [x] `app/(main)/bikes/[bikeId]/documents/page.tsx`
8. [x] `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` — add the "Documents" tile.
9. [x] (Optional, small, bundle in if convenient) `components/shared/input/ControlledDateSelect.tsx` — add an optional `placeholder` prop so `expiryDate` doesn't show the hardcoded "Select purchase date" text.
10. [x] Log the finished work in `context/progress-tracker.md`, same per-entry format as every prior spec.

## Dependencies

Backend spec 19 must be built and deployed/reachable first — this client has no fallback UI for a missing endpoint. No new npm packages — `date-fns` (expiry-badge math), `lucide-react` (file icon), `next/image`, and native `<input type="file">` already cover everything needed; confirmed no PDF-viewer or dropzone library is required since PDFs open in a new tab rather than rendering in-app.

## Verify

- [x] `yarn build` / `yarn lint` clean, no new errors beyond the existing tolerated baseline. Confirmed: `yarn build` succeeds (all 16 routes compile, including `/bikes/[bikeId]/documents`); `yarn lint` shows only the same pre-existing 5-warning/0-error baseline, none new.
- [x] Creating a document with only `title` succeeds; no expiry badge renders on its card. Live-verified against a temporary local `bikelog_server` instance with a throwaway user/bike: created "Registration Paper" with title only — no badge rendered, confirmed via screenshot.
- [x] Creating a document with an `expiryDate` in the past shows the red "Expired" badge; one within 30 days shows the amber "Expires in N days" badge; one further out shows the neutral formatted-date badge. Live-verified all three: a document dated 10 days in the past showed a red "Expired" pill; one dated 19 days out showed an amber "Expires in 19 days" pill; one dated ~4 months out showed a neutral "Expires 25-Dec-2026" pill — all three colors and exact label text confirmed via screenshot.
- [x] Uploading one image and one PDF to the same document in one action shows two distinct tiles — the image as a thumbnail, the PDF as a file-icon tile labeled with its original filename; clicking the PDF tile opens it in a new tab. Live-verified: uploaded a real 1×1 PNG + a real minimal PDF to "Registration Paper" in one request against real Cloudinary — resulting UI showed exactly one `next/image` thumbnail tile and one `FileText`-icon tile labeled "test-doc...⁠" (truncated `originalName`), confirmed via screenshot; the PDF tile is a real `<a href="..." target="_blank">` pointing at the actual Cloudinary raw-resource URL, confirmed via DOM query (opening in a real browser's new tab is standard `target="_blank"` behavior, not separately clickable in headless mode).
- [x] Removing a single file by its tile's `X` only removes that file from the gallery and (per backend contract) only that file's Cloudinary asset — the other file is untouched. Live-verified: deleted the PDF tile via its `X` + confirm modal, then checked ground truth two ways — a direct `GET` of the document showed `files: [only the image]`, and a direct HTTP fetch of the deleted PDF's old Cloudinary URL returned `404` (asset actually destroyed, not just detached) while the image's own URL remained live and untouched.
- [x] Selecting more than `10 - current count` files in one picker action only queues the allowed number and shows an info toast explaining why. Live-verified: with 1 file already present, selected 10 more in one picker action — got the exact toast "Only 9 more files can be added right now (max 10 total) — queued the first 9.", and the resulting tile count was exactly 10 (the cap), not 11.
- [x] Editing a document (title/description/expiryDate) never touches its `files[]` — confirmed the edit modal has no file field and the PATCH payload never includes `files`. Confirmed by code review: `BikeDocumentFormModal.tsx`'s `basePayload` only ever contains `title`/`description`/`expiryDate`, and `TUpdateBikeDocumentPayload` has no `files` field at the type level.
- [x] Deleting a document removes it from the list (soft-deleted server-side). Live-verified: deleted "Neutral Registration" via its trash icon + the real native `confirm()` dialog (intercepted and accepted, not bypassed) — it correctly disappeared from the list while the other 4 documents remained.
- [x] The new "Documents" tile on the bike detail page navigates to `/bikes/:bikeId/documents` and renders correctly in the now-9-entry tile grid (this app has since grown 2 more tiles — AI Assistant, Manual — past this spec's original "7-entry" estimate; not a regression, just later specs landing first). Live-verified: confirmed the tile's real `href` attribute is exactly `/bikes/:bikeId/documents`, and confirmed the destination route itself renders the correct page content — both checked in a real headless-Chromium browser, not just code review as the spec's original draft anticipated (this environment has real browser-testing capability, unlike when the rest of this spec's checklist was originally drafted).
- [x] Usable at ~375–430px width — follows the same mobile-first unprefixed-Tailwind convention as every other domain, no `sm:`/`md:` overrides introduced. Confirmed via `document.documentElement.scrollWidth === clientWidth` (390 === 390, no horizontal overflow) at every step of the live-verification pass above, plus visual confirmation via screenshots.
