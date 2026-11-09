# 36 — Settings: profile (name + avatar), with a read-only email

**Status**: 📝 Plan only — written 2026-11-09. App-parity catch-up. Mirrors `bikelog_app` specs **56** (profile update + avatar) and **58** (email stays read-only). Server halves — `bikelog_server` specs **53** (`/auth` profile routes + `profilePicture` column) and **55** (a submitted `email` is refused with 400) — are **already implemented and deployed**, so this is a pure web-client build with no backend work.

---

## Goal

Add an identity/profile section to the Settings page so the signed-in rider can see their photo (or initials), name and email, change their **name**, and **add / replace / remove** a profile photo — all inline, without leaving the page. The **email is shown but locked** (it is the account's sign-in identifier and cannot be changed from any client).

Today the web client knows nothing about the user beyond the JWT claims (`lib/userRole.ts` → `userId`, `userEmail`, `userRole`). It has never fetched the user's **name** or **profilePicture**. This spec is the first consumer of `GET /auth/me`.

## Design

- Follow the **Nocturne** design language already in the web client — reuse `panel`, `StatTile`/`StateCard` spacing, `StatusTag`, the `shared/input` form controls, `Button`, and `lucide-react` icons (`Camera`, `Pencil`, `Lock`, `Trash2`, `Loader2`, `UserRound`). No new visual language.
- A **round avatar** with an initials fallback, a small camera affordance, and inline `Change photo` / `Remove photo` text buttons — the same look the app adopted from `expenseTracker2`.
- The profile block sits at the **top of the Settings page**, above the odometer/catalog sections — identity belongs first.
- **Email field**: rendered disabled/dimmed with a padlock in the trailing slot and the helper line **“Your email is your sign-in ID and can’t be changed.”** (mirrors app spec 58 D3). It must read as *locked*, not *broken* — dim the whole field (`opacity-[0.72]`) and show the lock before any click.
- Edit is an **inline expansion** (a header `Edit` button toggles the editor open/closed), matching how the catalog sections already expand — not a modal or a bottom sheet.

### Endpoints (all under the axios `baseURL` `…/api`, auth prefix `/auth`)

| Call | Method / path | Body | Returns |
| --- | --- | --- | --- |
| Load identity | `GET /auth/me` | — | `{ id, name, email, profilePicture: {url, publicId} \| null, userRole, … }` |
| Save name | `PATCH /auth/update-profile` | `{ name }` | updated safe user. **Sending `email` → 400** (server spec 55); the UI never sends it |
| Set/replace photo | `PUT /auth/profile-picture` | `multipart/form-data`, one part named **`image`** | user with new `profilePicture` |
| Remove photo | `DELETE /auth/profile-picture` | — | user with `profilePicture: null` |

## Implementation

1. **Types** — add a shared user type (e.g. `components/(main)/SettingsCatalog/type/profile.types.ts` or extend an existing global type): `TCloudinaryImage = { url: string; publicId: string }` and `TMe = { id: string; name: string; email: string; profilePicture: TCloudinaryImage | null; userRole: "admin" | "user" }`. Reuse an existing Cloudinary image type if one already exists (accessory `productImage` uses the same `{url, publicId}` shape).
2. **`UserAvatar.tsx`** (new, in `components/shared/`) — props `{ name?: string | null; image?: TCloudinaryImage | null; size: number; className? }`.
   - Photo present → `next/image` (or a plain `<img>`) filling a circle (`rounded-full overflow-hidden`), `object-cover`.
   - No photo (or image load error via `onError`) → a `tint`ed primary circle with the **initials** (first letters of the first two words, uppercased; `?` when no name). Reset the error state whenever `image?.url` changes.
   - Export an `initials(name)` helper from the same file so nothing grows a private copy.
3. **`ProfileSection.tsx`** (new, in `components/(main)/SettingsCatalog/`):
   - `useFetchData<TMe>(["auth", "me"], "/auth/me")`.
   - **Collapsed**: `UserAvatar` (size ~56) · name (bold) + email (muted) · an `Edit` button on the right.
   - **Expanded editor**:
     - A larger `UserAvatar` (size ~88) with a **Change photo** button (hidden file input, `accept="image/*"`) and, when a photo exists, a **Remove photo** button. On file pick, build a `FormData`, append the file as `image`, `PUT /auth/profile-picture`; on remove, `DELETE /auth/profile-picture`. Show a spinner overlay while uploading. (Reuse the `FormData` + `usePost/usePut/useDelete` pattern already used by `BikeDocumentCard.tsx`.)
     - A **Name** field (`react-hook-form` + the existing `ControlledInput`, `min 1`, `max 60`), saved via `PATCH /auth/update-profile` with `{ name }` on a **Save name** button.
     - An **Email** field: disabled, dimmed (`opacity-[0.72]`), a `Lock` icon in the trailing slot, value = `me.email`, with the helper line below it. Never part of the submit payload.
   - All four mutations **invalidate `["auth", "me"]`** so the collapsed row and avatar refresh. Use `useFetchData`/`usePost`/`usePatch`/`useDelete` from `hooks/useApi`.
   - Toasts via `sonner`: success on save/upload/remove; the axios interceptor already surfaces server error messages.
4. **`Catalog.tsx`** — render `<ProfileSection />` as the first child, above `<OdometerSection />`. Keep the existing `PageHeader`.
5. **Guards** — everything read with `?.`/`??`; a missing `profilePicture` renders initials; a slow `/auth/me` shows a small skeleton for the row.

### Hazards / decisions

- **H-A — the email block is UI honesty, not enforcement.** The server (spec 55) refuses a submitted `email` with a 400 and only ever writes `name`. The disabled field + lock is the *explanation*; never include `email` in the PATCH body.
- **H-B — a disabled field must look disabled.** In the Nocturne palette a bare disabled input looks almost identical to an editable one; the padlock + dimming are what make the rule legible before a click (app spec 58 H-A).
- **D1 — do not reuse a bike image picker for the avatar.** An avatar is a circle with an initials state and two text buttons; keep `UserAvatar` purpose-built.
- **D2 — `/auth/me` is the only source of name/photo.** The JWT claims give only `email`/`role`; the name has never been in the token.

## Dependencies

No new packages. Uses existing `react-hook-form`, `@tanstack/react-query` (via `hooks/useApi`), `sonner`, `lucide-react`, `next/image`, and the shared `shared/input` controls. The server routes already exist and are deployed.

## Verify

- [ ] Settings shows the avatar (or initials), the real **name** from `/auth/me`, and the email.
- [ ] `Edit` expands an inline editor; `Edit`/close toggles it.
- [ ] Changing the name and pressing **Save name** persists it; the collapsed row and avatar update without a reload (`["auth","me"]` invalidation).
- [ ] Picking an image uploads it (`PUT …/profile-picture`, part `image`) and the avatar updates; **Remove photo** clears it and the initials return.
- [ ] The email field shows a padlock, is dimmed, opens no editor, and is never sent — it reads as *locked*, not broken.
- [ ] A hand-rolled `PATCH /auth/update-profile` with an `email` key returns **400** (server backstop; the UI can’t produce it).
- [ ] 320–360px width: the editor, avatar buttons and the email helper line wrap cleanly; no horizontal scroll.
- [ ] `yarn build` (tsc) and `yarn lint` clean.
