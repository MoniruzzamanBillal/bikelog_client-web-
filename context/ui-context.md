# UI Context

Pulled directly from `app/globals.css` and `components.json` as they exist in the repo right now — not invented, not aspirational. If a token below stops matching the file, fix this doc, don't let it drift.

## Component Library

shadcn/ui, `"new-york"` style, `baseColor: "neutral"`, CSS variables mode (`components.json`). Icons: `lucide-react`. Primitives live in `components/ui/*` (button, dialog, select, input, textarea, checkbox, calendar, command, dropdown-menu, popover, skeleton, sonner, table, accordion, breadcrumb) — feature code composes these via `components/shared/*`, never imports `components/ui/*` directly except from inside a shared component.

## Brand / Accent Colors

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--primary` | `oklch(0.205 0 0)` (near-black) | `oklch(0.922 0 0)` (near-white) | Default shadcn neutral primary — not motorcycle-brand-specific. |
| `--destructive` | `oklch(0.577 0.245 27.325)` (red) | `oklch(0.704 0.191 22.216)` (red) | Delete/error actions. |
| `PrimaryButton` | `bg-red-600` (hardcoded Tailwind red, not a CSS variable) | same | Inherited from the old scaffold, not restyled — see `architecture.md`'s "Kept vs. removed" note on why this stays as-is. |

No Bike Log–specific brand color has been chosen. Given the "minimal, build fast" priority, the plan is to leave the neutral shadcn palette + `PrimaryButton`'s existing red as the only accent, rather than spend time on a custom palette.

## Semantic Tokens

Standard shadcn set, all defined as light/dark OKLCH pairs in `:root`/`.dark`: `background`, `foreground`, `card`(+`-foreground`), `popover`(+`-foreground`), `primary`(+`-foreground`), `secondary`(+`-foreground`), `muted`(+`-foreground`), `accent`(+`-foreground`), `destructive`, `border`, `input`, `ring`, `chart-1` through `chart-5` (unused — no charts in this app), `sidebar` + 6 sidebar-prefixed tokens (unused — no sidebar nav planned, see Conventions below).

Plus a custom **surface** set, also light/dark paired: `--surface-primary`, `--surface-secondary`, `--surface-border`, `--surface-text`, `--surface-text-muted`, `--surface-hover`, `--surface-popover` — used by several `components/shared/*` components (tables, modal).

**Missing, referenced but not defined:** `table-border` (as `border-table-border`/`bg-table-border`) and `primary-500`/`primary-600` (as `bg-primary-500`, `hover:bg-primary-600`, `border-primary-600`) — used in `TableFilter.tsx`, `TablePagination.tsx`, `DateSelect.tsx`, `BaseModal.tsx` but absent from the `@theme` block. Add them in spec 01 (map `table-border` → `surface-border`, `primary-500`/`primary-600` → `primary`/a slightly darker computed shade) rather than leaving these components partially unstyled.

## Radius Scale

Single source `--radius: 0.625rem` (10px), with `sm`/`md`/`lg`/`xl`/`2xl`/`3xl`/`4xl` all derived via `calc()` offsets from it (`-4px` to `+16px`). Don't hardcode a `rounded-[Npx]` value — use the scale.

## Typography

`--font-sans: var(--font-geist-sans)`, `--font-mono: var(--font-geist-mono)` — Geist, loaded via `next/font` in `app/layout.tsx`. No separate type-scale tokens defined (no `--text-*` custom scale) — use Tailwind's default `text-sm`/`text-base`/`text-lg`/etc. directly.

## Breakpoints

Tailwind defaults **plus** three custom ones defined in `@theme`: `sc-430` (27rem / 432px), `sc-500` (32rem / 512px), `sc-laptop` (86rem / 1376px), and a redefined `2xl` (100rem / 1600px, wider than Tailwind's stock 96rem). The custom `sc-*` names exist from the old scaffold's own responsive tuning — for this app, prefer Tailwind's standard `sm`/`md`/`lg` unless a screen genuinely needs a break between `sm` (640px) and `md` (768px), in which case `sc-430`/`sc-500` are already there to use. Given mobile-first is the actual priority here, most screens won't need any breakpoint above `sm` at all.

## Theming

`next-themes`, wired in `app/layout.tsx` (`ThemeProvider` with `defaultTheme="dark"`, `enableSystem={false}`) — kept as-is from the scaffold. No theme toggle UI exists or is planned; dark is simply the fixed default. Not worth building a light/dark switcher for a single-user tool — if it bothers you, change `defaultTheme` to `"light"` once and move on.

## Conventions

- **Toasts**: `sonner`, already wired via `<Toaster />` in `app/layout.tsx`. Use `toast.success(...)`/`toast.error(...)` directly from mutation `onSuccess`/`onError` — no custom toast wrapper.
- **Class merging**: `cn()` from `lib/utils.ts` (`twMerge(clsx(...))`) — always, never manual string concatenation.
- **Rich text**: none. TipTap is in the inherited scaffold but not used anywhere in Bike Log (no field needs formatted text — `notes` fields are plain `ControlledTextArea`). Removed in spec 01.
- **Animation**: none beyond Tailwind's default transitions and shadcn's built-in Radix animation classes (dialog open/close, dropdown, etc.) which come for free and aren't worth stripping. GSAP is in the inherited scaffold but not used — removed in spec 01.
- **Tables**: `components/shared/table/GenericTableComponent` — see `architecture.md` for its full prop contract. This is the only table pattern used; no ad-hoc `<table>` markup in feature code.
- **Charts**: none, not planned (see `project-overview.md`'s Out of Scope).
- **Known CSS cruft**: `globals.css` has three leftover debug classes (`.bgr`, `.bge`, `.bgo` — solid red/violet/aqua backgrounds) from the old scaffold, unrelated to any real component. Delete in spec 01. `.tablePaginationNumber`/`.tablePaginationGradientBorder` appear to back `TablePagination.tsx`'s styling — verify actual usage before touching either.
