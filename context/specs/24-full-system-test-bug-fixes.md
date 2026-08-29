# 24: Full-System Test Bug Fixes — Theme Hydration Mismatch + Accessory Currency Format

Status: 📋 Proposed — not started

## Goal

Per direct user request ("test the full system... if you find any error, make an implementation plan"), a full click-through test was run against this web client (register → login → bike creation → every one of the 9 bike-hub tiles → fuel logs → mileage → maintenance logs → spending totals + Year/Lifetime/Trend tabs → bike issues → bike accessories, including the new purchase-lock/price-required rules from spec 23 → bike documents → settings catalog → AI chat) using a real headless browser (Playwright) against the already-running local `bikelog_server` (port 5000, real dev DB) and this app's own dev server (port 5173).

**The overwhelming result: everything works.** Every screen loaded without error, every form submitted correctly, the new accessory-purchase-lock + price-required validation (spec 23) behaved exactly as designed, and — most importantly — the Spending page correctly totaled fuel + maintenance + a purchased accessory (৳960 + ৳1,500 + ৳800 = ৳3,260) across Month/Year/Lifetime/Trend views and the AI chat, closing the loop on the original user complaint this whole feature chain was built to fix.

Two real, reproducible bugs were found. Both are small and self-contained — this spec covers both together, matching this project's own established "bundled bug fix pass" precedent (spec 22).

## Context

### Bug 1 — React hydration mismatch on every single page load (Console Error, visible in Next.js dev overlay)

Confirmed via the Next.js dev-mode issues overlay (the "1 Issue" badge visible in the bottom-left corner on every page): a `Console Error` fires on every navigation —

> "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties... `<html lang="en" - className="dark" - style={{color-scheme:"dark"}}>`"

**Root cause, confirmed by reading `app/layout.tsx`:** this app uses `next-themes`'s `ThemeProvider` (`attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`). `next-themes` applies the theme `class`/`style` to `<html>` via a blocking inline script that runs *before* React hydrates, specifically so there's no flash-of-wrong-theme — but this means the server-rendered HTML (which has no way to know the theme) and the client's actual `<html>` tag legitimately differ at the moment React hydrates. `next-themes`' own documentation explicitly requires `suppressHydrationWarning` on the `<html>` tag for exactly this reason — this app's `<html lang="en">` doesn't have it.

This isn't a functional bug (the theme still applies correctly, confirmed visually throughout the entire test — every screenshot rendered the dark theme correctly) — it's a real, spec-noncompliant integration of a third-party library that spams a console error on every page load, which would drown out genuinely new errors during future debugging and shows up as a persistent "1 Issue" badge in local development.

### Bug 2 — `BikeAccessoryCard.tsx` shows "BDT 800" instead of "৳800", inconsistent with every other price display in the app

Confirmed by reading `BikeAccessoryCard.tsx`'s `formatPrice`:
```ts
const formatPrice = (price?: number) => {
  if (!price) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};
```
`Intl.NumberFormat` with `currency: "BDT"` under the `"en-US"` locale renders as the literal currency code `"BDT 800"`, not the Bengali Taka glyph — confirmed live in this test's own screenshots (`19-accessory-purchased-created.png`: "BDT 800"; `16-accessory-pending.png`'s sibling card has no price to compare against, but the pattern is unambiguous).

Every other price display in this codebase uses the same simple convention — a literal `৳` prefix + `.toLocaleString()`/`.toFixed(2)`, confirmed via a full-codebase grep:
- `fuelLogColumns.tsx:36` — `` `৳${totalCost.toFixed(2)}` ``
- `SpendingSummaryView.tsx:25,39` — `` ৳{totalSpending.toLocaleString()} ``
- `MaintenanceLogCard.tsx:113` — `` Cost: ৳{log.cost.toLocaleString()} ``
- `BikeAccessoryFormModal.tsx:131` / `MaintenanceLogFormModal.tsx:208` — both form field *labels* already say `"Price (৳)"` / `"Cost (৳)"`

`BikeAccessoryCard.tsx` is the **only** place in the entire app using `Intl.NumberFormat` for currency — a pre-existing inconsistency dating to spec 12 (predates this session's spec 23 work, not introduced by it), just never noticed until this full-system pass put a real purchased-with-price accessory next to every other price display for direct comparison.

## Design

### Fix 1 — `app/layout.tsx`
```diff
-    <html lang="en">
+    <html lang="en" suppressHydrationWarning>
```
One attribute. `suppressHydrationWarning` only suppresses the warning for *that element's own* attribute mismatches (not its children, not other bugs) — this is `next-themes`' own documented, standard fix, not a workaround that hides unrelated problems.

### Fix 2 — `BikeAccessoryCard.tsx`
```diff
 const formatPrice = (price?: number) => {
   if (!price) return "N/A";
-  return new Intl.NumberFormat("en-US", {
-    style: "currency",
-    currency: "BDT",
-    minimumFractionDigits: 0,
-    maximumFractionDigits: 0,
-  }).format(price);
+  return `৳${price.toLocaleString()}`;
 };
```
Matches `SpendingSummaryView.tsx`'s exact convention (`৳{value.toLocaleString()}`, no decimal places for a whole-number-style display) rather than `fuelLogColumns.tsx`'s 2-decimal variant, since accessory prices are typically whole amounts and the existing `bike-accessory.schema.ts` validation doesn't enforce a specific decimal precision either way.

## Implementation

1. ⏳ `app/layout.tsx` — add `suppressHydrationWarning` to `<html>`.
2. ⏳ `components/(main)/BikeAccessory/BikeAccessoryCard.tsx` — replace `formatPrice`'s `Intl.NumberFormat` call with the `` `৳${price.toLocaleString()}` `` convention used everywhere else.

## Dependencies

None — both are edits to existing files, no new packages.

## Verify

- [ ] Load any page (e.g. `/dashboard`) with the Next.js dev server running and confirm the "1 Issue" badge / hydration-mismatch console error no longer appears.
- [ ] View a purchased accessory with a price on `/bikes/:bikeId/accessories` and confirm it now reads `৳800` (or whatever the real value is), not `BDT 800`.
- [ ] `yarn build` clean; `yarn lint` clean, same baseline as before, no new warnings.
- [ ] Spot-check that dark mode still applies correctly on first paint (no flash-of-light-theme) after the `suppressHydrationWarning` change — it should, since that prop only suppresses the *warning*, not the actual client-side theme-application script `next-themes` already runs.
