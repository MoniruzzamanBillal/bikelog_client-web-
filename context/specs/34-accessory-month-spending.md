# 34 — Accessories: month-based spending on the Purchased filter

Status: ✅ **Implemented 2026-11-04.** `yarn lint` clean (no new findings), `npx tsc --noEmit` clean, and
**browser-verified against the live production backend** (bike "Hornet", account `abc@d.com`) — see Verification.

Requested directly by the developer (2026-11-04): *"now for the web frontend, add this feature in the accessories
page."* This is the web counterpart of `bikelog_app` spec 61 and consumes `bikelog_server` spec 59's endpoint
(`GET /bikes/:bikeId/accessories/spending-summary`), which is **already deployed**. This is a deliberate
cascade step 3 by **explicit request** — not forced by the contract (the endpoint is additive), so it is parity
the developer asked for, not a break that had to be patched.

---

## Problem

`components/(main)/BikeAccessory/BikeAccessory.tsx` shows purchased accessories as a flat, paginated,
status-grouped list with no money total — the rider can't see a grand total, this month's total, or which month
each item was bought in.

## What shipped

When the **status filter is set to "Purchased"**, the page renders a month-grouped spending view instead of the
flat list:

- **Summary strip** — two `bg-card shadow-glow` tiles: **This month** (`currentMonthTotal`) and **All time**
  (`allTimeTotal`), via the shared `formatTaka`.
- **Month sections** — one per month the server returns (newest-first, **every month from the earliest purchase
  to the current one, empty ones included**), each a heading `MONTH YYYY` + right-aligned subtotal, then that
  month's `BikeAccessoryCard`s, or a `No purchases this month` line for an empty month.
- The **urgency filter is hidden** on the Purchased view (D2).

## Files

- **New: `components/(main)/BikeAccessory/PurchasedAccessorySpending.tsx`** — fetches the summary under query key
  `["accessoryMonthSpending", bikeId]`, renders the strip + month groups, owns its loading/error/empty states.
  Reuses `formatTaka` (exported from `Spending/SpendingSummaryView.tsx`), `StateCard`, `Skeleton`, and
  `BikeAccessoryCard`. Month label = `format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy")`.
- **`BikeAccessory.tsx`** — `isPurchased = statusFilter === "purchased"`: disables the paginated list query
  (`enabled: !isPurchased`), renders `<PurchasedAccessorySpending>` when purchased, hides the urgency `Select`,
  and adds `["accessoryMonthSpending", bikeId]` to the delete mutation's invalidation list.
- **`BikeAccessoryFormModal.tsx`** / **`BikeAccessoryCard.tsx`** — create/update and image mutations also
  invalidate `["accessoryMonthSpending", bikeId]` (and the modal now also invalidates `["spending", bikeId]`,
  which it was missing) so the summary refreshes on any change.
- **`type/bike-accessory.types.ts`** — added `TAccessoryMonthGroup` and `TAccessorySpendingSummary`.

## Decisions

- **D1 — empty months are shown**, matching the app (the developer chose this). The server fills the calendar;
  the client renders `No purchases this month` for a zero month, and the current month always appears.
- **D2 — urgency filter hidden on Purchased.** Urgency is wishlist priority, meaningless once bought, and the
  totals are deliberately across all purchases — a half-applied filter would make them silently partial.
- **D3 — month heading color.** The heading was first styled `text-muted-foreground` and read as faint gray; the
  developer asked for it to be white, so the label is `text-foreground` (the bright token, matching the subtotal
  beside it). The app's `PurchasedAccessoriesList` month label was changed to `COLORS.text` in the same pass to
  keep the two clients consistent (Nocturne coupling).

## Verification

- `yarn lint` clean (0 errors), `npx tsc --noEmit` clean.
- **Browser (Playwright, live production API):** logged in as `abc@d.com`, opened Hornet → Accessories →
  Purchased. The `spending-summary` call returned **200**; the strip showed **This month ৳200 / All time ৳580**;
  months rendered newest-first — **November ৳200** (HrPayroll), **October ৳0 → "No purchases this month"**,
  **September ৳280** (tst accessories ৳200 + bb ৳80), **August ৳100** (dhe) — with white, legible headings;
  200+0+280+100 = 580 reconciles with All time, and This month = the November total. Urgency filter correctly
  hidden; no console errors.
