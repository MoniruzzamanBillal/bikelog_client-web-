# UI Context

Pulled directly from `app/globals.css` and `components.json` as they exist in the repo right now — not invented, not aspirational. If a token below stops matching the file, fix this doc, don't let it drift.

## Component Library

shadcn/ui, `"new-york"` style, `baseColor: "neutral"`, CSS variables mode (`components.json`). Icons: `lucide-react`. Primitives live in `components/ui/*` (button, dialog, select, input, textarea, checkbox, calendar, command, dropdown-menu, popover, skeleton, sonner, table, accordion, breadcrumb) — feature code composes these via `components/shared/*`, never imports `components/ui/*` directly except from inside a shared component.

## Brand / Accent Colors (Nocturne, spec 27)

The palette comes from the user's Claude Design export (`../redesign/`, "Nocturne" direction): a blurple accent on an indigo-tinted ground. It's defined as hex values in `app/globals.css`.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--background` | `#eef0f9` | `#161826` | Page ground. Plus `--ground-gradient` (a radial accent bloom, top-left) through `.bg-ground`. |
| `--card` / `--popover` | `#f7f8fe` | `#232532` | Raised surfaces. |
| `--primary` | `#5d5294` | `#9184d9` | The accent. Buttons use it as an **outline** (accent text + border, tinted hover), not a filled slab. |
| `--destructive` | `#b4453d` | `#e0786e` | Delete/error text, overdue/expired tags. |
| `--warning` | `#8f6219` | `#d8a657` | NEW. Upcoming reminders, "expires soon", 401/403 logs. |
| `--success` | `#3b7650` | `#7cbf8e` | NEW. Full tank, resolved, exact mileage, "sections indexed". |
| `--chart-1..5` | accent ramp + neutrals | same | Used by the recharts bars/donut and the category dots. |

`PrimaryButton` now wraps `Button` with the default (accent-outline) variant. The old hard-coded `bg-red-600` is gone.
## Semantic Tokens

This is the standard shadcn set plus the NEW `--warning`, `--success` and `--destructive-foreground`. All of them are exposed in `@theme inline` as `bg-/text-/border-*` classes. The `--surface-*` / `--table-border` aliases are declared once on `:root, .dark`, and `--surface-hover` is now `foreground` at 6%.

**Elevation**: the raw values are `--elev-sm/md/lg/glow` (per theme), exposed as the Tailwind `shadow-sm`, `shadow-md`, `shadow-lg` and `shadow-glow` classes. The raw names are `elev-*` so the `@theme` mapping isn't self-referential. Dark uses hairline edges plus ambient shadow; light uses soft ink shadows. `shadow-glow` (an accent ring plus bloom) marks the highlighted card: the first bike, the rolling average, the spending total and the composer.

**Helpers in `globals.css`**:
- `panel`: the standard card (radius 10px, `--card`, `elev-sm`).
- `.rule-fade`: a divider that fades out at both ends.
- `.row-fade`: table rows paint an end-faded bottom rule, with a hover tint in `tbody`.
- `.bg-ground`: applies the ground gradient.
## Radius Scale

`--radius: 0.5rem` (8px), with `sm`…`4xl` derived via `calc()`. Cards use `rounded-[10px]` (the design's card radius) through `panel`, and dialogs use 14px.
## Typography

Inter (`next/font/google`, weights 400–700) sets `--font-inter`, and `--font-sans` points at it. `--font-mono` is the system mono stack. Body text is 15px/1.55. Headings are weight 500 with -0.015em tracking, and page titles are 28px (desktop only; the mobile shell header shows the title instead). Numbers use `tabular-nums`. Kicker/section labels are 11–12px uppercase with 0.08–0.1em tracking.
## Breakpoints

Tailwind defaults **plus** three custom ones defined in `@theme`: `sc-430` (27rem / 432px), `sc-500` (32rem / 512px), `sc-laptop` (86rem / 1376px), and a redefined `2xl` (100rem / 1600px, wider than Tailwind's stock 96rem). The custom `sc-*` names exist from the old scaffold's own responsive tuning — for this app, prefer Tailwind's standard `sm`/`md`/`lg` unless a screen genuinely needs a break between `sm` (640px) and `md` (768px), in which case `sc-430`/`sc-500` are already there to use. Given mobile-first is the actual priority here, most screens won't need any breakpoint above `sm` at all.

## Theming

`next-themes` (`ThemeProvider`, `defaultTheme="dark"`, `enableSystem={false}`). A **theme toggle now exists**: it's in the desktop sidebar footer and the mobile header (`AppShell.tsx`'s `ThemeToggle`). Both themes are fully designed. The Sonner `Toaster` lives inside `ThemeProvider` (using `components/ui/sonner`) so toasts follow the theme.
## Conventions

- **Toasts**: `sonner`, already wired via `<Toaster />` in `app/layout.tsx`. Use `toast.success(...)`/`toast.error(...)` directly from mutation `onSuccess`/`onError` — no custom toast wrapper.
- **Class merging**: `cn()` from `lib/utils.ts` (`twMerge(clsx(...))`) — always, never manual string concatenation.
- **Rich text**: none. TipTap is in the inherited scaffold but not used anywhere in Bike Log (no field needs formatted text — `notes` fields are plain `ControlledTextArea`). Removed in spec 01.
- **Animation**: none beyond Tailwind's default transitions and shadcn's built-in Radix animation classes (dialog open/close, dropdown, etc.) which come for free and aren't worth stripping. GSAP is in the inherited scaffold but not used — removed in spec 01.
- **Tables**: `components/shared/table/GenericTableComponent` — see `architecture.md` for its full prop contract. This is the only table pattern used; no ad-hoc `<table>` markup in feature code.
- **Charts**: `recharts` (since spec 13). Style them with the `--chart-*` vars, no axis lines, muted ticks, and a tooltip on `--popover` + `--elev-md`.
- **Shared UI pieces (spec 27)**: `StateCard` (empty/error with retry), `StatTile`, `StatusTag` (tones: neutral/accent/success/warning/danger), `SegmentedTabs`, `PeriodStepper`, `InsightCard` and `PageHeader` (crumbs + title + actions; the title is hidden on mobile). Reuse these rather than hand-rolling badges or loading text.
- **Layout**: `AppShell` provides the page padding (`px-4 pt-4 pb-24` mobile, `lg:px-10 lg:pt-8 lg:pb-12`), so feature roots must not add their own `p-4`. The breakpoint is `lg` (1024px): below it the app uses the mobile header + tab bar, and from `lg` up it uses the sidebar.
- **Known CSS cruft**: the old `.tablePaginationNumber`/`.tablePaginationGradientBorder` classes were removed in spec 27 along with the restyled `TablePagination`.
