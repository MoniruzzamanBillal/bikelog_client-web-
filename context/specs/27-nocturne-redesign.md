# 27: Nocturne Redesign (Claude Design → web client)

Status: 🟡 In Progress. Started 2026-09-27 per direct user instruction.

## Goal

Restyle the whole web client to the "Nocturne" design the user produced with Claude Design. **Reuse the existing components and data flow.** No API changes, no new data fields, no new dependencies. Web client only: `bikelog_app/` and `bikelog_server/` are untouched.

## Source of truth

- `../redesign/Bike Log Screens.html` (workspace root, outside this repo) is a bundled design doc. It is unpacked to `../redesign/extracted/`:
  - `template.html`: the canvas. Its second `<style>` block, "Part A", holds the shipping `globals.css` token values for `:root` (light) and `.dark`.
  - `ShellNav.html`: desktop sidebar, mobile header, mobile tab bar.
  - `Dashboard.html`, `BikeHub.html`, `FuelLogs.html`, `Mileage.html`, `Spending.html`, `Maintenance.html`, `Records.html` (issues/accessories/documents/manual), `Assistant.html`, `Settings.html` (catalog + admin), `Auth.html`.
- `../redesign/Bike Log redesign.pdf` holds the rendered screenshots of the same screens.

## Phases

1. **Tokens + font**: replace the `:root`/`.dark` palettes in `app/globals.css` with Part A's values. Add `--warning`, `--success`, `--destructive-foreground`, `--shadow-sm/md/lg`, `--shadow-glow` and `--ground-gradient`, and expose them in `@theme inline`. Switch Geist for Inter (`next/font/google`). Set `--radius: 0.5rem`.
2. **App shell**:
   - Desktop (lg+): a 232px sidebar with a bike sub-nav when the route is under `/bikes/[bikeId]`, the catalog/admin links, and theme-toggle + logout controls.
   - Mobile: a 52px header plus a 64px bottom tab bar. Outside a bike: Bikes/Catalog/Admin. Inside a bike: Overview/Fuel/Service/Spend/More.
3. **Shared components**: restyle `components/ui/*` and `components/shared/*` to the design's primitives. Keep their props unchanged. Add small shared pieces the design repeats, such as a stat tile, status tag, empty/error state and segmented tabs.
4. **Screens**, in the design's priority order: Dashboard → Bike hub → Fuel logs → Mileage → Spending → Maintenance → Issues/Accessories/Documents/Manual → Assistant → Catalog/Admin → Auth. Each screen gets desktop and mobile layouts plus loading, empty and error states.

## Rules

- Show only fields that exist in each feature's `type/*.types.ts`. If the design shows data the API doesn't return, drop it and list it under Known Gaps in `progress-tracker.md`.
- The session gate in `app/(main)/layout.tsx` and the auth logic in `lib/tokenManager.ts` stay untouched.

## Verify

`yarn lint` and `yarn build` clean. Then screenshot every route at 375px and 1280px, in dark and light, and compare each with the design. Exercise the main CRUD flows against the real API. No horizontal overflow at 375px.
