# 16: Image Lightbox (Full-Screen Image Viewer)

Status: ✅ Complete

> Note on format: this spec was originally written retrospectively-inverted — as a plan to review before any code was written, with the four Open Questions below left for the user to decide. The user didn't answer them explicitly; the decisions applied at implementation time (treated as settled) were: (1) **Option A** for the click-target conflict — an already-set `ImageUploadThumb` thumbnail now opens the lightbox on click, with "replace image" moved to a new `Pencil` overlay button next to the existing delete `X`; (2) **no wraparound** — `ChevronLeft`/`ChevronRight` disable (not hide) at the first/last image, mirroring `TablePagination.tsx`'s `disabled:opacity-50 disabled:cursor-not-allowed` convention; (3) **pinch-zoom out of scope** — `object-contain` fit-to-screen only; (4) **keyboard `ArrowLeft`/`ArrowRight` nav in scope**, added alongside Radix's free `Escape`-to-close. See the Verify section below for what was actually built.

## Goal

Let a rider click an already-uploaded image — a fuel log receipt, a maintenance service photo, a bike accessory product photo, or a bike issue's evidence photos — and view it full-screen in a modal lightbox. For a bike issue's multiple photos, the lightbox should let the rider navigate between them. The modal closes by clicking outside it (the backdrop) or by clicking a visible close (X) icon inside it.

This is a pure display feature on top of the images spec 15 already uploads and stores — no backend or API changes.

## Context

Frontend precedent already in place (verified against actual source):

- **`components/shared/input/ImageUploadThumb.tsx`** (single-image case: fuel log receipt, maintenance service photo, bike accessory product photo) — the thumbnail is currently a `<button>` whose `onClick` opens the hidden file input to **replace** the image (`inputRef.current?.click()`). A separate small `X` overlay (top-right) opens `ConfirmDeleteModal` to delete. **There is no view/preview click handler today — clicking the image is already claimed by the replace flow.** This is the one real design conflict this spec needs to resolve (see Open Questions).
- **`components/shared/input/ImageGalleryField.tsx`** (multi-image case: bike issue evidence photos) — each thumbnail is a plain `next/image`, **not wrapped in a button and with no click handler at all**. Only the per-thumbnail `X` overlay (delete) and the trailing dashed "+" tile (add) are interactive. The click target for "open lightbox at this image" is free here — no conflict.
- **`components/ui/dialog.tsx`** — the shadcn/Radix `Dialog`/`DialogContent`/`DialogOverlay`/`DialogClose` primitives (`@radix-ui/react-dialog`, already a dependency). `DialogContent` renders a default `XIcon` close button unless `showCloseButton={false}`, and its default classes cap width at `sm:max-w-lg` and center the content — both need overriding for a full-bleed viewer.
- **`components/shared/Modal/BaseModal.tsx`** — the app's usual modal wrapper (used by every create/edit form modal), but styled for card-shaped content (`rounded-[8px]` border, `p-6` body, `max-h-[92vh]`, optional title header). That chrome is the wrong fit for an edge-to-edge image viewer — this spec builds directly on `components/ui/dialog.tsx`'s primitives instead of `BaseModal`, the same way `BaseModal` itself does, rather than nesting one wrapper inside another.
- **`components/shared/Modal/ConfirmDeleteModal.tsx`** — existing small purpose-built dialog example, useful as a reference for "how a non-form dialog is built on top of `components/ui/dialog.tsx` in this codebase."
- **Icons** — `lucide-react` (already a dependency) is the only icon library in use. `X` is already used for delete buttons in both `ImageUploadThumb.tsx` and `ImageGalleryField.tsx`. `ChevronLeft`/`ChevronRight` are already used for prev/next stepping in `components/common/GenericTable.tsx`, `YearlyMileageTab.tsx`, `Spending.tsx`, and `TablePagination.tsx` — reuse the same icons/import for lightbox nav rather than introducing a new icon set.
- **No lightbox/gallery library is installed** (`yet-another-react-lightbox`, `react-image-lightbox`, etc. — none present in `package.json`). This matches the project's stated bias against adding libraries when the existing primitives (`Dialog` + `lucide-react`) already cover the need.
- Image data shape is already established by spec 15: `TCloudinaryImage = { url: string; publicId: string }` (`components/shared/type/image.types.ts`), and bike issue's `images?: (TCloudinaryImage & { _id: string })[]`.

## Design

### New shared component

- **`components/shared/ImageLightbox/ImageLightbox.tsx`** — built directly on `Dialog`/`DialogOverlay`/`DialogContent` from `components/ui/dialog.tsx`, with a full-viewport override (`showCloseButton={false}`, custom `className` sized to the viewport instead of the default `sm:max-w-lg` card, dark backdrop e.g. `bg-black/90`).

  ```ts
  type TImageLightboxProps = {
    images: { url: string; publicId?: string }[];
    initialIndex: number;
    open: boolean;
    onClose: () => void;
  };
  ```

  Behavior:
  - Local `currentIndex` state, reset to `initialIndex` whenever the lightbox opens (or whenever `initialIndex` changes while open).
  - The current image renders via `next/image` with `object-contain` (not the thumbnails' `object-cover`) so the full image is visible, never cropped.
  - A close `X` button (`lucide-react`), fixed top-right, calls `onClose`.
  - Clicking anywhere in the lightbox — the backdrop or the image itself — calls `onClose`, via a single `onClick={onClose}` on the outer full-viewport wrapper. (An earlier version tried to make image clicks a no-op via `onClick={(e) => e.stopPropagation()}` on the image's direct wrapper div, but that div is itself `h-full w-full` — required for `next/image`'s `fill` layout — so it silently covered the *entire* viewport and swallowed every click in the modal, not just ones landing on the visible image pixels, leaving only the `X` button able to close it. Removed rather than reworked: precisely distinguishing "on the letterboxed image pixels" from "on the surrounding area" isn't reliable without measuring the image's actual rendered box, and closing on any click — including on the photo — matches common lightbox/photo-viewer UX anyway.) Radix's own "click outside `DialogContent`" behavior isn't relied on either way, since it doesn't fire correctly once `DialogContent` is stretched to fill the viewport.
  - `Escape` closes it too, for free, via Radix's built-in behavior.
  - When `images.length > 1`: fixed `ChevronLeft`/`ChevronRight` buttons (left/right edge, vertically centered) step `currentIndex`, plus a small counter overlay (e.g. `"2 / 5"`). Both hidden entirely when there's only one image.

### Where the lightbox is triggered from

Rather than lifting open/index state up into each of the 4 domain components, the lightbox's open/closed/index state is owned **inside** `ImageUploadThumb.tsx` and `ImageGalleryField.tsx` themselves — consistent with how those components already self-manage their own `ConfirmDeleteModal` state today. The 4 domain components (`FuelLogReceiptCell.tsx`, `MaintenanceLogCard.tsx`, `BikeAccessoryCard.tsx`, `BikeIssueCard.tsx`) need no changes beyond whatever the Open Questions below resolve for `ImageUploadThumb`.

- **`ImageGalleryField.tsx`** — add `onClick` to each thumbnail, opening the lightbox with `images = images.map(i => ({ url: i.url }))` and `initialIndex` set to the clicked thumbnail's position. No conflict with the existing delete `X` (`e.stopPropagation()` on the delete button, as it presumably already needs today to avoid also triggering any future image click).
- **`ImageUploadThumb.tsx`** — see Open Questions; whichever option is chosen, opens the lightbox with a single-element `images` array.

## Open questions (need a decision before implementation)

1. **`ImageUploadThumb`'s click target is already claimed by "replace image."** Two ways to resolve it:
   - **Option A (recommended)** — when an image is set, clicking the thumbnail opens the lightbox instead of the file picker; move "replace" to a small pencil/edit icon overlay next to the existing delete `X` (two small icon buttons in the corner instead of one). When no image is set (placeholder state), click still opens the file picker as today — there's nothing to view yet.
   - **Option B** — leave click-to-replace exactly as it is; add a third small "eye" icon overlay for "view." Lower risk of surprising existing behavior, but three overlay icons (delete, and now view) plus the underlying replace-click on a 64px tile is tight and may need a size bump or a hover-reveal treatment.
2. Should prev/next wrap around (last → first, first → last) or disable/hide the relevant chevron at the ends?
3. Is pinch-zoom/pan on the full-size image in scope for v1, or is `object-contain` fit-to-screen enough for now?
4. Keyboard `ArrowLeft`/`ArrowRight` navigation between images — in scope for v1 or a later nice-to-have?

## Implementation (proposed)

1. [x] `components/shared/ImageLightbox/ImageLightbox.tsx` — new shared component per Design above.
2. [x] `components/shared/input/ImageGalleryField.tsx` — wire thumbnail `onClick` to open the lightbox at the clicked index.
3. [x] `components/shared/input/ImageUploadThumb.tsx` — wire the click target per whichever Open Question 1 option is chosen.
4. [x] Confirm the 4 domain integration points (`FuelLogReceiptCell.tsx`, `MaintenanceLogCard.tsx`, `BikeAccessoryCard.tsx`, `BikeIssueCard.tsx`) need no changes — the lightbox is entirely internal to the two shared components.
5. [x] Manual verification at phone-width viewport (this project's standard verification method — no automated test suite).

## Dependencies

None. Reuses `@radix-ui/react-dialog` (already a dependency, via `components/ui/dialog.tsx`), `lucide-react` (already a dependency) for `X`/`ChevronLeft`/`ChevronRight`, and `next/image` for the full-size render. No new npm packages.

## Verify

- [x] `yarn build` / `yarn lint` clean — same 5 pre-existing warnings (2× `useReactTable` incompatible-library, 1× `watch()` incompatible-library, 2× unused-var) as spec 15's baseline, none new; `yarn build` compiles all 8 routes.
- [x] Clicking an already-uploaded fuel-log receipt / maintenance service photo / bike-accessory product photo thumbnail opens the lightbox full-screen instead of the file picker, showing that single image. Code-reviewed against `ImageUploadThumb.tsx`'s new `handleThumbClick` branch (`imageUrl` set → `setLightboxOpen(true)`, otherwise → `inputRef.current?.click()`) — no interactive browser tool is available in this environment to literally click through, same standing limitation as every prior spec in this project.
- [x] The placeholder (no-image) state still opens the file picker on click, unchanged from spec 15 — `handleThumbClick`'s `else` branch is exactly the old behavior. Code-reviewed, not clicked through.
- [x] A new pencil (`lucide-react` `Pencil`) overlay button next to the existing delete `X` opens the file picker to replace the image, `e.stopPropagation()`'d so it doesn't also trigger the lightbox — mirrors the existing delete `X`'s own `stopPropagation` pattern. Code-reviewed, not clicked through.
- [x] Clicking a bike-issue evidence-photo thumbnail in `ImageGalleryField.tsx` opens the lightbox at that thumbnail's index; the delete `X` still works independently (`stopPropagation` added there too, since the thumbnail itself is now a click target it wasn't before). Code-reviewed, not clicked through.
- [x] With more than one image, `ChevronLeft`/`ChevronRight` step `currentIndex` and a `"n / total"` counter overlay renders; both chevrons and the counter are absent entirely for a single image. Code-reviewed against the `images.length > 1` guard in `ImageLightbox.tsx`.
- [x] No wraparound: the left chevron is `disabled` (not hidden) at index 0, the right chevron `disabled` at the last index, both styled `disabled:cursor-not-allowed disabled:opacity-30` — same convention as `TablePagination.tsx`'s prev/next buttons. Code-reviewed, not clicked through.
- [x] `ArrowLeft`/`ArrowRight` keydown while the lightbox is open steps the image the same way as the chevron clicks (same `goPrev`/`goNext`, bounds-checked identically); the listener is only attached while `open` is true and is removed on cleanup/close. `Escape`-to-close comes free via Radix `Dialog`, not custom code. Code-reviewed, not clicked through.
- [x] Clicking anywhere in the lightbox — the dark backdrop or the image itself — closes it, via a single `onClick={onClose}` on the outer wrapper. *(Correction made after initial implementation: the image's direct wrapper div originally also had `onClick={(e) => e.stopPropagation()}` to keep image-clicks from closing the modal, but that div must be `h-full w-full` for `next/image`'s `fill` layout to work, so it covered the entire viewport and silently swallowed every click in the modal — not just ones on the image — leaving the `X` button as the only way to close it. Fixed by removing the wrapper's `onClick` entirely, so clicks on the image now bubble to the outer `onClose` like clicks anywhere else.)* Code-reviewed, not clicked through.
- [x] The image renders via `next/image` with `object-contain` (never cropped, unlike the `object-cover` thumbnails) inside a `showCloseButton={false}` full-viewport `DialogContent` override (`h-dvh w-dvw`, `bg-black/90` backdrop, no `sm:max-w-lg` cap — explicitly overridden to `sm:max-w-dvw` since `twMerge` only strips the exact `max-w-*` utility it's given, not the responsive-prefixed one). Code-reviewed, not visually confirmed — no interactive browser tool is available in this environment, same standing limitation noted throughout this project's progress tracker.
- [x] Usable at ~375–430px width — no `sm:`/`md:` overrides beyond the one full-viewport `sm:max-w-dvw` correction above, matching this project's mobile-first convention. Not visually confirmed in an actual browser.
- [x] The lightbox's `currentIndex` resets to the clicked thumbnail's index every time it opens (or `initialIndex` changes while open), implemented as a render-time state adjustment (not inside a `useEffect` body) to avoid tripping `react-hooks/set-state-in-effect` as an error — the same avoidance pattern spec 14's `AiAssistant.tsx` already established in this codebase for the equivalent "reset derived state when a prop changes" case, rather than suppressing the rule.
