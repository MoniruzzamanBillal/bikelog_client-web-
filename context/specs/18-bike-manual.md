# 18: Bike Owner Manual (upload/replace/delete, PDF, one per bike)

Status: ✅ Complete

## Goal

Let a rider upload their bike's owner manual as a single PDF from the web app — the missing piece of a feature that's otherwise already fully live. Backend spec 18 (`bikelog_server/context/specs/18-bike-manual-ai-integration.md`, Status: ✅ Complete) already built extraction/chunking/storage and already wires the manual into the existing AI chat (`POST /bikes/:bikeId/ai/chat`) so questions like _"when should I change my spark plug?"_ get answered from the manual's real service intervals. Nothing in this client can drive any of that today because there is no upload UI anywhere — this spec is purely "give the user a way to call the 3 endpoints that already exist," no new backend work.

## Context

Backend contract (verified against the real shipped source — `bikeManual.route.ts`/`.controller.ts`/`.service.ts`, not just spec prose):

- `POST /bikes/:bikeId/manual` — multipart, single field `manual`, PDF-only (`fileFilter` 400s anything with a different mimetype before it reaches Cloudinary), 20MB limit. **Upload-or-replace, upsert semantics — there is no `PUT` route for this feature**, unlike spec 15's image uploads. Calling `POST` again with an existing manual present replaces it (old Cloudinary asset + old chunks deleted first). Response `data` is the bare `TBikeManualMeta` object (not wrapped in `{hasManual, manual}}` — that shape is `GET`-only).
- `GET /bikes/:bikeId/manual` — no params. Always `200`, never `404` for "no manual yet" — response `data` is `{ hasManual: boolean, manual: TBikeManualMeta | null }`.
- `DELETE /bikes/:bikeId/manual` — `404` if no manual exists (only endpoint of the three that can 404 in the normal use path), else removes the Cloudinary asset + all chunk documents and clears `bike.manual`. Response `data` is `null`.
- `TBikeManualMeta` shape: `{ url, publicId, originalName, uploadedAt, chunkCount }`. `chunkCount` is worth surfacing in the UI — it's the concrete signal that the manual was actually indexed and is usable by the AI chat, not just "a file sits somewhere."
- Response envelope: `{ success, message, data, token }`, same as every other module. IDOR handled server-side via the existing `findOwnedBikeOrThrow` pattern, nothing extra needed client-side.
- No `validateRequest`/zod schema on the backend side (multipart file body only) — matches this client's own precedent of skipping a zod schema for pure file-upload flows (`ImageUploadThumb`/`FileGalleryField` callers carry none either).

Frontend precedent already in place (verified against actual source):

- **Shape mismatch with every existing upload widget** — `ImageUploadThumb.tsx` (spec 15) is the closest single-asset upload/replace/delete precedent (click-to-upload thumbnail, `X`-overlay delete, `Pencil`-overlay replace, `uploading` spinner state), but it's a small 64px **image** thumbnail with `accept="image/*"` and a lightbox for viewing — a PDF can't be thumbnailed or lightboxed the way an image can (same limitation spec 17/`FileGalleryField.tsx` already worked around for its own image+PDF mix, rendering PDFs as a bordered file-icon tile instead). Neither existing component fits a **single**, page-level, metadata-rich display (original filename, upload date, chunk count) — this feature is a full-width metadata card, not a tile in a grid. Build it inline in `BikeManual.tsx` rather than forcing a fit onto `ImageUploadThumb` or `FileGalleryField`, and don't factor out a new shared component for what's a single call site — same reasoning spec 17 used to justify inlining its own single-consumer expiry-badge logic.
- `RemindersBanner.tsx` is the closest **structural** precedent for "a bike-scoped card that self-fetches off a `bikeId` prop and isn't a list" — same shape this feature needs (self-contained `useFetchData`, no parent-lifted state).
- `hooks/useApi.ts`'s `usePost`/`useDelete` and `utils/axiosInstance.ts`'s FormData-vs-JSON content-type auto-detection (spec 15) need no changes. **Do not reach for `usePut`** — spec 15 added it for a different backend module that genuinely has `PUT .../image` routes; this module's `POST` is the upsert, using `PUT` here would just hit a route that doesn't exist.
- Recent domains (`BikeIssue`, `BikeAccessory`, `BikeDocument`) all skip a dedicated `use<Domain>.ts` hook file — components call `useFetchData`/`usePost`/`useDelete` directly and own their mutations inline ("self-contained-mutation" pattern, per spec 15's Recent Activity entry). This feature follows the same convention — no new hook file.
- `date-fns` is already a dependency (used for spec 17's expiry-badge math) — reused here to format `uploadedAt`.

## Design

- **`components/(main)/BikeManual/BikeManual.tsx`** — page component. `bikeId` via `useParams()`. `useFetchData<TBikeManualStatus>(["bikeManual", bikeId], \`/bikes/${bikeId}/manual\`, { enabled: !!bikeId })`. Renders one card (`rounded-lg border border-border bg-card p-4`, the same idiom as every other domain), branching on `data?.data.hasManual`:
  - **No manual (`hasManual: false`)** — an empty state: a dashed-border button (visually consistent with `FileGalleryField`'s "+" add tile, but full-width here rather than a 16-unit tile) with a `BookOpen`/`FileUp` icon and "No manual uploaded yet — upload a PDF to let the AI Assistant answer questions from it" text. Click opens a hidden `<input type="file" accept="application/pdf" />`; selecting a file calls `usePost([["bikeManual", bikeId]])` with a `FormData` containing `manual` against `POST /bikes/${bikeId}/manual`.
  - **Has manual (`hasManual: true`)** — metadata display: `manual.originalName` as the title, `date-fns`-formatted `manual.uploadedAt` below it, and a small muted line surfacing `manual.chunkCount` (e.g. "`{chunkCount}` sections indexed for AI chat") — this is the one piece of information that tells the user the upload actually did something beyond "a file sits somewhere," and ties directly back to why the feature exists. Below that: a "View PDF" link (`manual.url`, `target="_blank" rel="noopener noreferrer"` — same out-of-app-viewer precedent as spec 17's `FileGalleryField` raw-file tiles, no in-app PDF viewer), a "Replace" button (re-opens the same hidden file input and re-`POST`s — upload-or-replace, no separate flow), and a "Delete" button going through `ConfirmDeleteModal` (existing shared component) before calling `useDelete([["bikeManual", bikeId]])` against the same URL.
  - Both the upload and replace mutations share one `isPending` flag that disables the buttons and swaps in a `Loader2` spinner while in flight — same visual treatment as `ImageUploadThumb`'s `uploading` prop.
  - A closing line/link: "Ask the AI Assistant about this manual" → `/bikes/${bikeId}/assistant` (only shown once `hasManual` is true) — this is the entire point of the upload (backend spec 18 already grounds that existing chat in the manual), so a direct link closes the loop without duplicating any chat UI here.
- **`app/(main)/bikes/[bikeId]/manual/page.tsx`** — trivial wrapper rendering `<BikeManual />`, same 4-line shape as every other bike-scoped route.
- **`components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx`** — add `BookOpen` to the existing `lucide-react` import and append `{ href: \`/bikes/${bikeId}/manual\`, label: "Manual", icon: BookOpen }` to the `links` array (9th tile, alongside spec 17's "Documents" tile).

### Types

```ts
// components/(main)/BikeManual/type/bike-manual.types.ts
export type TBikeManualMeta = {
  url: string;
  publicId: string;
  originalName: string;
  uploadedAt: string;
  chunkCount: number;
};

export type TBikeManualStatus = {
  hasManual: boolean;
  manual: TBikeManualMeta | null;
};
```

No create/update payload types — the only "payload" is a raw `File` appended to `FormData`, not a JSON body, so there's nothing for a zod schema or RHF form to validate.

## Implementation

1. [x] `components/(main)/BikeManual/type/bike-manual.types.ts`
2. [x] `components/(main)/BikeManual/BikeManual.tsx` — fetch + empty/metadata states, upload/replace/delete wiring, `ConfirmDeleteModal` for delete.
3. [x] `app/(main)/bikes/[bikeId]/manual/page.tsx`
4. [x] `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` — add the "Manual" tile.
5. [x] Log the finished work in `context/progress-tracker.md`, same per-entry format as every prior spec.

## Dependencies

Backend spec 18 is already built and complete — confirm it's reachable on the running `bikelog_server` before wiring this up, don't assume. No new npm packages: `date-fns` (upload-date formatting), `lucide-react` (icons), `ConfirmDeleteModal` (existing shared component), and native `<input type="file">` cover everything. No PDF-viewer library — same "open in a new tab" convention spec 17 already established.

## Verify

- [x] `yarn build` / `yarn lint` clean, no new errors beyond the existing tolerated baseline — same 5 pre-existing warnings as spec 17's baseline, none new; `yarn build` compiles all routes including the new `/bikes/[bikeId]/manual` dynamic route.
- [x] Before any upload, the card shows the empty state (`hasManual: false`) — no metadata, no "View PDF"/"Replace"/"Delete" buttons, no AI-assistant link. Code-reviewed against `BikeManual.tsx`'s `!manual` branch — no interactive browser tool or reachable local backend was available in this environment, same standing limitation as every prior spec.
- [x] Uploading a real PDF succeeds — card switches to the metadata view showing `originalName`, a formatted upload date, and `chunkCount > 0`. Code-reviewed against the confirmed backend response shape (`bikeManual.service.ts`'s `uploadBikeManualIntoDB` returns the bare `TBikeManualMeta`, matched 1:1 by `BikeManual.tsx`'s render) — not live-clicked.
- [x] Selecting a non-PDF file is blocked by the `accept="application/pdf"` file picker filter; if bypassed (e.g. renamed extension), the server's 400 surfaces as a toast via the shared `catch (error) { toast.error(...) }` pattern used identically everywhere else in this app. Code-reviewed, not clicked through.
- [x] Uploading a second PDF via "Replace" updates the metadata shown (new `originalName`/date/chunkCount) — matches backend spec 18's own confirmed replace behavior (old asset + chunks gone); "Replace" re-opens the same hidden input and re-`POST`s to the same upsert endpoint, no separate code path. Code-reviewed, not clicked through.
- [x] Deleting reverts the card to the empty state; a second delete attempt with nothing to delete cannot be triggered from this UI (the Delete button only renders inside the `manual` branch). Code-reviewed against `ConfirmDeleteModal` wiring, not clicked through.
- [x] The "Ask the AI Assistant about this manual" link navigates to `/bikes/:bikeId/assistant` and only appears when a manual is present (inside the same `manual` branch as the action buttons). Code-reviewed, not clicked through.
- [x] The new "Manual" tile lands correctly in the now-9-entry grid on `BikeDetailPage` and is usable at ~375–430px width, following the same mobile-first unprefixed-Tailwind convention as every other domain — the tile itself reuses the exact unchanged `links.map(...)` markup, only the array grew by one entry. Not visually confirmed in an actual browser.
- [x] No interactive browser tool is available in this environment, and no local `bikelog_server` instance was running to `curl` against during this implementation (checked via `lsof`, ports 3000/5000/5173 all free) — click-through and live API round-trips are code-reviewed against this spec's Design section and the confirmed backend source (`bikeManual.route.ts`/`.controller.ts`/`.service.ts`, read directly, not guessed from spec prose), not literally observed. Worth a live pass once the backend is up.
