# 37 — Engine oil status card: always show a date

**Status**: ✅ Complete — 2026-11-09 (code; browser pass owed). App-parity catch-up. Mirrors `bikelog_app` spec **59**. Server half — `bikelog_server` spec **56** (the `/engine-oil-logs/status` endpoint gains an always-present `projectedDueDate`, an `overdueDays`, a `rateBasis.source`, and a provisional `estimate` block) — is **already implemented and deployed**. Pure web-client build.

Companion to the already-shipped web spec **33** (engine oil log). This only changes how `EngineOilStatusCard.tsx` renders the status the server already returns.

---

## Goal

Make the oil status card show a **projected date in every state the server can date** — not just the one “on track with a rate” state it shows today. Specifically: a date in the **overdue** state (“Was due ~ 3 Oct”), and a **provisional estimated date** for a change that has **no interval of its own** (derived server-side from the oil type’s suggested interval). The card must still degrade to exactly its spec-33 behaviour against an older server (all new fields are optional).

### Where the card falls short today

`EngineOilStatusCard.tsx` renders `projectedDueDate` only inside the `ok`/`upcoming` branch. In the **overdue** state it shows `Due X km ago` (no date), and for a change with **no interval** it shows `“N km on this oil” + “Set an interval…”` (no date, even though the server can now estimate one). The developer wants the date in all of them.

## Design

- **No new source of truth.** Every date, day-count and percentage comes off `GET /engine-oil-logs/status` already computed. The card must not derive a date or a km/day of its own (app spec 59 H-A). It only _reads and formats_ new fields.
- **The estimate is visibly provisional.** When the card is driven by the `estimate` block, the status pill gains a `· est.` suffix and the card ends with one sentence naming the oil type and how to make it exact. Never mix an estimated figure into the unlabelled audit lines.
- Keep the existing panel, pill tones, progress bar and audit lines; this is additive branching, not a redesign.

### New server fields on `TEngineOilStatus` (server spec 56 — add to `type/engine-oil-log.types.ts`)

```ts
projectedDueDate?: string;          // now also present when overdue (a PAST date)
overdueDays?: number;               // positive days past due; set only with status "overdue" + a usable rate
rateBasis?: { spanDays: number; distanceKm: number; source?: "recent" | "longRun" | "lifetime" };
estimate?: {                        // present only when lastChange has NO intervalKm but an oil type resolves
  basis: "oilTypeSuggestion";
  status: "ok" | "upcoming" | "overdue";
  intervalKm: number;
  nextDueOdometer: number;
  kmRemaining: number;              // signed
  percentUsed: number;
  projectedDaysRemaining?: number;
  projectedDueDate?: string;
  overdueDays?: number;
};
```

> `projectedDueDate` is a genuine instant → parse with `new Date(value)` (+ a `NaN` guard), **not** a UTC-midnight date-only parser. `kmRemaining` is **signed and unclamped** → take `Math.abs(...)` for the overdue line.

## Implementation

In `EngineOilStatusCard.tsx`, rework the headline/subline/audit derivation to the state table below (mirrors app spec 59 §B). All new reads guarded with `!= null` so an older server renders exactly as spec 33 left it.

| Server state                                  | Headline                                                                             | Sub-line under it                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ok` / `upcoming`, `projectedDueDate` present | `Next change around 12 Nov` (unchanged)                                              | `~N km to go`                                                                                                                                                      |
| `overdue`, `projectedDueDate` present         | `Was due around 3 Oct` (danger tone)                                                 | `${overdueDays} days past due · ~${Math.abs(kmRemaining)} km past due`                                                                                             |
| `overdue`, no date (no rate)                  | `Due ${Math.abs(kmRemaining)} km ago` (danger)                                       | `Was due at ${nextDueOdometer} km` (as today)                                                                                                                      |
| No interval, **`estimate` present**           | from `estimate.projectedDueDate` → `Next change around 12 Nov`, pill reads `…· est.` | `~${estimate.kmRemaining} km to go`; audit line `${kmSinceChange} / ${estimate.intervalKm} km on this oil · ${estimate.percentUsed}% · est.` + the source sentence |
| No interval, **no** oil type (no estimate)    | `${kmSinceChange} km on this oil`                                                    | `Set an interval on this change to get a due date` (as today)                                                                                                      |
| No rate at all (new bike)                     | `~${kmRemaining} km to go`                                                           | — (as today)                                                                                                                                                       |

Additional edits:

1. **Estimate drives the whole card** when present (app spec 59 D3): headline, sub-line, the **progress bar** (`estimate.percentUsed`, clamped 0–100) and the **pill tone** (keyed on `estimate.status`, with the `· est.` suffix). Do not render a bar from a real interval beside an estimated date.
2. **Source sentence** (app spec 59 D4): when the estimate is driving, end the card with e.g. _“Estimated from {oilType.name}’s {estimate.intervalKm} km interval — set one on this change to make it exact.”_ Reuse the existing muted/secondary text style; add no new token.
3. **Rate-basis suffix** (app spec 59 D5): in the `kmPerDay` audit line append ` long-run avg` / ` lifetime avg` when `rateBasis.source` is `"longRun"`/`"lifetime"`. `"recent"` (and absent) get **no** suffix, so the common case reads exactly as today.
4. Keep `projectedDaysRemaining` rendering as-is; note the server omits it when overdue (it would go negative), so the overdue day-count comes from `overdueDays`.

### Hazards

- **H-A — degrade cleanly.** All additions are optional fields; when absent, the new branches are unreachable and the card is byte-for-byte its spec-33 self. Deploy order is free in both directions.
- **H-B — the estimate is a different _kind_ of fact.** It is derived from the oil type’s _current_ `suggestedIntervalKm`, so editing the catalog moves it. Everything it produces carries `est.`.
- **H-C — one `new Date()` only, with a guard.** A bad/absent date must never print `Invalid Date`; fall back to the dateless branch.

## Dependencies

No new packages. Uses existing `date-fns` (`format`), `lucide-react`, `StatusTag`, and the panel styles already in the file.

## Verify

- [ ] An **overdue** oil reads `Was due around <date>` in danger tone with `<n> days past due · ~<km> km past due` beneath it.
- [ ] A change with **no interval** but a resolvable oil type shows the estimated date, an `est.` pill, and the source sentence; the bar fills from `estimate.percentUsed` (clamped at 100).
- [ ] Setting a real interval on that change replaces the estimate with the plain forecast; the two agree within rounding.
- [ ] A bike with thin fuel history shows a date plus the ` long-run avg` / ` lifetime avg` suffix; a bike with normal history reads exactly as before (no suffix, no `est.`).
- [ ] Against a **pre-spec-56** response (fields absent) the card renders exactly as web spec 33 left it.
- [ ] No `Invalid Date`, `৳NaN`, or stray separators in any state.
- [ ] 320–360px width: nothing wraps badly; the `· est.` suffix doesn’t push the heading.
- [ ] `yarn build` (tsc) and `yarn lint` clean.
