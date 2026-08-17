# 21: Spending PDF Export

Status: ✅ Complete

## Goal

Add an "Export PDF" button to the Spending screen's Month/Year/Lifetime tabs that downloads a PDF report of that period's spending — total, category breakdown, and the full list of individual fuel/maintenance line items (date, category, description, amount, vendor, remarks). This is the web-first rollout; the same pattern gets ported to `bikelog_app` (Expo) later, once this is tested and approved — the mobile port is explicitly out of scope for this spec.

## Design

### Where the data comes from

The existing `/bikes/:bikeId/spending-summary` endpoint only returns `{ category, total }` aggregates — no per-record detail. This spec depends on `bikelog_server` spec 23 ("Spending Details Export Endpoint"), which adds `GET /bikes/:bikeId/spending-summary/details?period=...&targetMonth=...|targetYear=...`, returning:

```ts
export type TSpendingRecordSource = "fuel" | "maintenance";

export interface TSpendingRecord {
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor: string | null;
  remarks: string | null;
  source: TSpendingRecordSource;
}

export interface TSpendingDetails {
  period: "month" | "year" | "lifetime";
  targetMonth?: string;
  targetYear?: string;
  totalSpending: number;
  categoryBreakdown: TCategoryBreakdown[];
  records: TSpendingRecord[]; // ascending by date
}
```

Build `bikelog_server` spec 23 first — this spec cannot be completed without it.

### Where PDF generation happens: client-side, not server-side

No PDF-generation library exists anywhere in this stack yet (confirmed — neither backend nor web frontend has one installed, and there's no downloadable-file precedent in either). Generating the PDF **in the browser** (rather than having the backend stream a PDF) keeps the backend endpoint a plain JSON aggregation — consistent with every other endpoint in the spending module — and keeps this feature self-contained to the web client, which matches the "web first, mobile later" rollout: the backend JSON endpoint is reusable as-is by the future mobile port; only the PDF-rendering step (`jsPDF` here, likely `expo-print` or similar there) would need re-implementing per platform.

### UI placement

In `components/(main)/Spending/Spending.tsx`, the "Export PDF" button goes in the controls row, alongside the period-picker (the `<input type="month">` block for Month, the year-stepper `ChevronLeft/ChevronRight` block for Year), and unconditionally for Lifetime (no picker to sit next to). **Hidden entirely on the `trend` tab** — the user's ask is specifically Month/Year/Lifetime breakdowns, and "trend" isn't a single period with a coherent line-item export.

Match the existing local idiom in this file: `Spending.tsx` currently uses plain `<button>` + Tailwind classes (not the shared `Button`/`PrimaryButton` component) for its period pills and year-stepper arrows — use the same raw-`<button>` + `rounded-lg border border-border ... hover:bg-muted` styling for consistency with what's already on this exact screen, rather than introducing the shared `Button` component here for the first time. Icon: `Download` or `FileDown` from `lucide-react` (already installed — no new icon dependency), matching the `size-4` sizing already used on `ChevronLeft`/`ChevronRight` in this file.

Button states:
- Default: icon + "Export PDF" label.
- While fetching `/spending-summary/details`: disabled, spinner (reuse whatever loading-icon convention `AiSpendingInsightCard.tsx` or similar already uses, e.g. `Loader2` from `lucide-react` with a spin class) + "Exporting..." label.
- On fetch failure: re-enable the button, surface the backend's `message` via a `sonner` toast (`toast.error(...)`) — matching this project's documented error-handling convention (`code-standards.md`: "mutation errors → sonner toast with backend's message field").
- On success: PDF downloads immediately (no extra confirmation step needed) and the button returns to its default state.

### PDF content and layout

Use `jspdf` + `jspdf-autotable` (autotable renders the tabular sections; plain jsPDF text/line APIs handle the header). Structure, top to bottom:

1. **Header**: "Spending Report" title, then a subtitle line stating the period in human-readable form (e.g. "August 2026" for month, "2026" for year, "Lifetime" for lifetime) — derive this from the already-known `period`/`targetMonth`/`targetYear` state in `Spending.tsx`, not from parsing anything back out of the response. Include the generation timestamp (`new Date()` at export time) as a small line, since these reports don't otherwise carry a "when was this generated" marker.
2. **Summary block**: "Total Spending: ৳X,XXX" (use the same `toLocaleString()` formatting `SpendingSummaryView.tsx` already uses for currency figures, prefixed with ৳ like the rest of this app — no other currency formatting has appeared anywhere else in the codebase, so don't introduce one here).
3. **Category breakdown table** (`jspdf-autotable`): columns `Category | Total (৳)`, one row per `categoryBreakdown` entry — same data already shown on-screen by `SpendingSummaryView`, included here for report completeness.
4. **Full line-item table** (`jspdf-autotable`, the main content the user asked for): columns `Date | Category | Description | Amount (৳) | Vendor | Remarks`. Format `date` via `date-fns` (`format(new Date(record.date), "d MMM yyyy")` — `date-fns` is already a project dependency, this repo already formats dates this way elsewhere). Render `vendor`/`remarks` as `"-"` when `null`, never a blank cell or the literal string `"null"`. Sort matches the API's ascending-by-date order — don't re-sort.

If `records.length === 0`, still generate a PDF (header + "Total Spending: ৳0" + "No spending records for this period." — don't silently no-op the button click when there's genuinely nothing logged for a period the user explicitly asked to export).

### Filename

`spending-<period>-<targetMonth|targetYear|"lifetime">.pdf`, e.g. `spending-month-2026-08.pdf`, `spending-year-2026.pdf`, `spending-lifetime.pdf`. `doc.save(filename)` triggers the browser's native download — no extra file-saver library needed, `jsPDF`'s own `.save()` handles that.

### Files to create/modify

| Path | Action | Notes |
|---|---|---|
| `components/(main)/Spending/type/spending.types.ts` | Modify | Add `TSpendingRecordSource`, `TSpendingRecord`, `TSpendingDetails`, mirroring the backend's spec-23 field names/casing exactly (per `code-standards.md`'s type convention). |
| `components/(main)/Spending/utils/generateSpendingPdf.ts` | Create | Exports `generateSpendingPdf(details: TSpendingDetails, periodLabel: string): void` — builds and saves the PDF via `jsPDF`/`jspdf-autotable`. Keeps `Spending.tsx` thin; one thing per file, per this project's component convention. |
| `components/(main)/Spending/Spending.tsx` | Modify | Add the Export PDF button + its fetch-on-click handler (a one-off `axios`/fetch call via the same `apiGet`-style helper `useFetchData` wraps, triggered manually rather than via `useFetchData`'s auto-fetching `useQuery`, since this is an on-demand action, not a render-time data need); wire loading/error state; call `generateSpendingPdf` on success. Hide the button when `period === "trend"`. |
| `package.json` | Modify | Add `jspdf` and `jspdf-autotable`. |

## Implementation

1. [x] Add `TSpendingRecordSource`, `TSpendingRecord`, `TSpendingDetails` to `components/(main)/Spending/type/spending.types.ts`.
2. [x] `yarn add jspdf jspdf-autotable` — check installed versions are mutually compatible (`jspdf-autotable`'s major version must match the `jspdf` major it's built against; check the package's own compatibility notes at install time rather than assuming). Installed `jspdf@4.2.1` + `jspdf-autotable@5.0.8` — confirmed `jspdf-autotable@5`'s own declared peer range (`^2 || ^3 || ^4`) accepts `jspdf@4` before installing.
3. [x] Create `components/(main)/Spending/utils/generateSpendingPdf.ts`: builds the PDF exactly per the Design section's layout (header → summary → category table → line-item table), formats dates via `date-fns`, guards `null` vendor/remarks as `"-"`, handles the zero-records case, and calls `.save(filename)`. **Deviation from the spec's literal `৳` instruction, discovered during implementation, not a scope change:** jsPDF's built-in fonts (Helvetica/Times/Courier) only cover WinAnsi/Latin-1, so `৳` (U+09F3) rendered as mojibake (`ó`) in the generated PDF. Tried embedding a Bengali-script TTF (`Noto Sans Bengali`, SIL OFL, present on this system at `/usr/share/fonts/truetype/noto/`) via `jsPDF.addFont()` — rejected after isolated testing (a standalone Node script outside the Next app/browser, using the same installed `jspdf` package directly) showed jsPDF's TTF parser breaks badly enough on this font that it silently drops *all* text, including plain Latin, not just Bengali glyphs — confirmed this is a jsPDF/font-file interaction issue, not an app bug, by successfully embedding a different TTF (`DejaVuSans`, which lacks the `৳` glyph entirely — confirmed via `fc-query`'s charset dump — but proved jsPDF's font-embedding path itself works fine in general). Settled on the PDF-only fallback of prefixing amounts with the ASCII string `"Tk"` instead of `৳` — confined entirely to this one new file, via a `CURRENCY_PREFIX` constant and a `sanitizeForPdf()` helper that also strips a literal `৳` out of the backend's server-synthesized `record.description` field (e.g. `"5L (Full Tank) @ ৳100/L"`, from `bikelog_server` spec 23) before it reaches the PDF. The live on-screen UI is completely unaffected and still shows `৳` everywhere via normal browser/CSS font rendering, which was never the broken part — this is purely a jsPDF text-rendering limitation, isolated to the exported file.
4. [x] In `Spending.tsx`: add local `isExporting` state; add a `handleExportPdf` function that builds the same query string the existing summary fetch already builds (reuse `searchParams` construction, pointed at `/spending-summary/details` instead of `/spending-summary`), performs a one-off GET (via whatever thin API-client helper `useFetchData`/`apiGet` already wraps — don't add a second axios instance), and on success calls `generateSpendingPdf(response.data, periodLabel)` where `periodLabel` is derived from the already-known `period`/`targetMonth`/`targetYear` state (e.g. via `date-fns`'s `format`, matching how the Month input and Year stepper already display these values).
5. [x] Add the button to the controls row, styled per Design, hidden on the `trend` tab, disabled + spinner while `isExporting`.
6. [x] Wire `sonner` `toast.error(...)` on fetch failure, using the backend's `message` field per this project's existing error-handling convention.
7. [x] Manually test all three periods (see Verify) in a real browser — this is a UI feature, code review alone doesn't confirm the PDF actually renders correctly.
8. [x] Run `yarn lint`; fix anything flagged.
9. [x] Update `context/progress-tracker.md`: new Recent Activity entry + a spec 21 row in the Spec Implementation Status table.

## Dependencies

- `bikelog_server` spec 23 (Spending Details Export Endpoint) must be built and deployed/available first — this spec's data source doesn't exist without it.
- `jspdf` and `jspdf-autotable` (new npm dependencies — first PDF-generation library in this codebase, same category of decision as spec 13 adding `recharts`).
- Depends on spec 08 (Spending Summary), which built `Spending.tsx`/`SpendingSummaryView.tsx`/the spending types file this spec extends.

## Verify

- [x] "Export PDF" button appears on Month, Year, and Lifetime tabs; does **not** appear on the Trend tab. Live-verified with Playwright (headless Chromium, 390×844 viewport) against a temporary local `bikelog_server` instance with a throwaway user/bike: button present in all three tabs' controls row, absent (button list confirmed via DOM query) on Trend.
- [x] Clicking it on the Month tab (with data present) downloads a PDF named `spending-month-<targetMonth>.pdf` containing: header with "August 2026"-style period label, correct total spending, a category breakdown table matching what's on-screen, and a line-item table with one row per fuel/maintenance log in that month. Confirmed via `pdftotext` on the actual downloaded file (Playwright's `expect_download`): `spending-month-2026-08.pdf`, header "Spending Report" / "August 2026" / generation timestamp, "Total Spending: Tk 1,170", category table (Fuel 920, Spec21 Chain Lube 250) matching the on-screen `SpendingSummaryView`, and 3 line-item rows (2 fuel + 1 maintenance) in ascending date order.
- [x] Same for Year (`spending-year-<targetYear>.pdf`) and Lifetime (`spending-lifetime.pdf`) — both downloaded with the exact filenames and matching totals/tables, confirmed via `pdftotext`.
- [x] Line-item table's `Vendor`/`Remarks` columns show `-` (not blank, not `"null"`) for records where `fuelStation`/`serviceCenter`/`notes` weren't recorded — confirmed: the fuel log created without either field shows `-`/`-` in the extracted PDF text.
- [x] Dates in the line-item table are formatted human-readably (e.g. "17 Aug 2026"), not raw ISO strings — confirmed (`5 Aug 2026`, `7 Aug 2026`, `10 Aug 2026`).
- [x] Exporting a period with zero spending records still produces a valid PDF (header + ৳0 total + "No spending records for this period." message), not a silent no-op or a crash. Live-verified: selected a month (`2020-01`) with no logs, export still downloaded `spending-month-2020-01.pdf` with "Total Spending: Tk 0" and the literal "No spending records for this period." line (per the currency-symbol deviation above, the summary line uses `Tk` in the PDF, not `৳`, everywhere else the app still shows `৳`).
- [x] While the export is in flight, the button shows a disabled/spinner state and can't be double-clicked into firing two downloads — implemented via `isExporting` state gating both the `disabled` prop and an early-return guard in `handleExportPdf`; not separately re-verified as a race condition in this pass (the guard is a standard, already-used-elsewhere pattern in this codebase, not new machinery).
- [x] Simulating a backend error (e.g. temporarily point the fetch at a bad URL, or test against an unauthorized bike) shows a `sonner` error toast with the backend's message, and the button returns to its normal clickable state afterward. Live-verified: navigated to a bogus bike id, clicked Export PDF, got a `sonner` toast reading exactly the backend's real message ("Bike not found"), and confirmed via DOM query that the button was no longer disabled afterward.
- [x] Usable at ~390px width — button doesn't break the existing controls-row layout on mobile viewport. Confirmed via screenshot (Year tab, the tightest row: chevrons + year label + Export PDF button all fit with room to spare) and `document.documentElement.scrollWidth === clientWidth` (390 === 390, no horizontal overflow) on all three non-trend tabs.
- [x] `yarn lint` clean; `yarn build`/`tsc` type-check clean — both confirmed, same pre-existing 5-warning/0-error baseline, none new; all 15 routes compile.
- [x] `context/progress-tracker.md` updated with a new spec 21 row.
