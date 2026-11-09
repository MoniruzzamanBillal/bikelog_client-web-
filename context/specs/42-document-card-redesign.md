# 42 — Document card redesign

**Status**: 📝 Plan only — written 2026-11-09. App-parity catch-up. Mirrors `bikelog_app` spec **68**. **No backend change** — every field shown is already on `TBikeDocument`.

---

## Goal

Rebuild `BikeDocumentCard.tsx` so each document card **shows all its information** and reads as a complete record. The current card shows only the title, an *optional* expiry pill, an optional description, and the file chips — the **expiry date**, the **file count** and the **date added** are nowhere. The new card surfaces all of them and always carries a clear status.

## Design

Mirrors the app’s redesigned card (spec 68), in the web’s Nocturne idiom:

- **Header** — a leading rounded icon badge (`FileText` on a tinted/`surface` chip), the **title**, and the expiry **status pill** stacked beneath it, with the edit/delete icon buttons on the right.
- **Status pill — always present** (never `null`): **Expired** (danger) / **Expires in N days** (warning, ≤30) / **Valid** (success, >30 days out) / **No expiry** (neutral) when there’s no date. Every card now carries an at-a-glance status.
- **Description** — unchanged, shown when present.
- **Meta row** — a new muted line carrying *all the facts*: the literal expiry date (`Expires 14 Mar 2027`, or `No expiry date`), the **file count** (`3 files`, singular/plural correct), and `Added …` from `createdAt`. Each with a small leading icon; wraps cleanly at narrow width.
- **Divider** — a thin rule separates the meta from the attachments.
- **Files** — the existing `FileGalleryField` (attach / view / remove) is unchanged.

**D1 — the pill names the *status*, the meta row carries the *date*** — not redundant: the pill is the colour-coded state, the meta line is the literal dates + file count. Together they are “all information”.

## Implementation

`components/(main)/BikeDocument/BikeDocumentCard.tsx` only:

1. Replace the `ExpiryBadge` (which returns `null` when there’s no date) with a `getExpiryPill(expiryDate?)` that **always** returns a `StatusTag`:
   - no date → `{ tone: neutral, label: "No expiry" }`
   - `daysRemaining < 0` → `{ danger, "Expired" }`
   - `daysRemaining <= 30` → `{ warning, "Expires in N days" }` (singular/plural)
   - else → `{ success, "Valid" }`
2. Restructure the header: icon badge (`FileText`, size ~16, on a `bg-surface`/tinted chip) + a column with the title (`font-medium`, truncates at ~2 lines) and the pill beneath it; keep the edit/delete `iconBtn`s on the right.
3. Keep the description block when `document.description` is present.
4. Add the **meta row** (a `flex flex-wrap` muted `text-[12px]` line): 
   - expiry: `expiryDate ? "Expires {dd MMM yyyy}" : "No expiry date"` (icon `CalendarClock`),
   - file count: `{files.length} file{s}` (icon `Paperclip`),
   - added: `Added {dd MMM yyyy}` from `createdAt` (icon `Clock`).
   Dates formatted with the client’s UTC-safe date handling (don’t shift a date-only field a day in local time).
5. Add a thin divider (e.g. a `border-t border-border/60` or the existing rule style) above `FileGalleryField`.
6. `FileGalleryField` and both upload/remove mutations stay exactly as they are.

**H1 — sort unchanged.** `BikeDocument.tsx` still sorts the list by soonest expiry; this spec touches only the card, not the list order or pager.

## Dependencies

No new packages. Uses existing `lucide-react` (`FileText`, `CalendarClock`, `Paperclip`, `Clock`, `SquarePen`, `Trash2`), `date-fns`, `StatusTag`, `FileGalleryField`.

## Verify

- [ ] A card shows: icon badge · title · status pill · (description) · meta row · divider · files.
- [ ] The four pill states render with the right tone; a document with no expiry shows **No expiry** + **No expiry date** in the meta.
- [ ] The file count is singular/plural correct and tracks add/remove.
- [ ] `Added …` matches the document’s creation date with no off-by-one.
- [ ] 320–360px: the meta row wraps cleanly; the title truncates; the action buttons stay put.
- [ ] Attach / view / remove still work (`FileGalleryField` unchanged).
- [ ] `yarn build` (tsc) and `yarn lint` clean.
