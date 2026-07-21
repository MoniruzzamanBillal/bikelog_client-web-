# AI Workflow Rules

## Overall Approach

This app's whole point is to ship fast and be usable immediately — optimize every decision for "does this get a working screen in front of the user sooner," not for architectural purity, extensibility, or polish. When in doubt between a quick reuse of an existing pattern and a cleaner new one, take the quick reuse. Read `context/specs/00-build-plan.md` first to see where the project currently stands before starting on any spec.

## Scoping Rules

1. Build one spec (`context/specs/0N-*.md`) at a time, fully, before starting the next — don't half-implement two features in parallel.
2. A spec is "done" when: the screen(s) it describes work end-to-end against the real `bikelog_server` API, `yarn lint` is clean, and it's been manually checked at a phone-width viewport.
3. Don't add fields, screens, or interactions the spec doesn't ask for, even if the backend technically supports more (e.g. don't build maintenance-type edit/delete UI — the API doesn't even expose those routes).
4. Don't introduce a new dependency (charting, animation, state-management, date-picker, etc.) without checking `architecture.md`'s Invariants first — the existing scaffold almost certainly already has something usable.

## Splitting Work

- Split by backend module/route-group, matching the numbered specs — never split a single spec's "list view" and "create modal" across two work sessions if avoidable, they share types/hooks and are faster built together.
- Shared-component changes (new CSS tokens, bug fixes in `components/shared/*`) belong in whichever spec first needs them, not deferred to a separate "infra" pass — except the initial cleanup (dead file removal, CSS tokens, axios auth fix), which is spec 01 specifically so every later spec builds on a clean base.

## Handling Missing Requirements

- If a screen's exact field list is unclear: check the backend source of truth first — `bikelog_server/postman/dummy-data.md` has the authoritative required/optional/forbidden field list per endpoint, cross-checked against actual `.validation.ts` files. Don't guess a field name.
- If a component's prop API is unclear: read the component's source directly (`components/shared/...`) rather than assuming it matches a similar component elsewhere in the file — this scaffold has some inconsistencies between components (see `architecture.md`'s "Kept vs. removed" notes) that make copy-pasting a usage pattern risky.
- If a UX decision isn't specified by a spec (e.g. exact wording, exact card layout): make the minimal, obviously-correct choice and move on — this app doesn't need design-review-level judgment calls. Only stop and ask if the ambiguity is about *data correctness* (e.g. which date field to bucket by), not about *presentation*.

## Protected Files

- `lib/tokenManager.ts` and `utils/axiosInstance.ts`'s auth logic, once built in spec 01, shouldn't be "improved" toward httpOnly-cookies or a refresh-token flow later — the backend genuinely doesn't support either. If the backend ever adds refresh tokens, that's a backend spec first, this file second.
- The `app/(main)/layout.tsx` session gate stays a synchronous `getToken()` cookie check, nothing more — don't "upgrade" it to a `GET /auth/me` round-trip, a separate `ProtectedRoute` component, or a `middleware.ts`-based edge check. The synchronous check already satisfies "no route renders without a session" (see `architecture.md` Invariant 7); anything heavier is scope creep on a solved problem.
- Don't create files under `app/(admin)/` without an actual admin spec to implement — it's reserved, not started (see `architecture.md` Invariant 8). Don't scaffold a placeholder admin layout/guard "to be ready" — there's nothing to guard yet.
- `components/shared/*` — treat as a shared library, not feature code. A fix here (e.g. adding the missing `table-border`/`primary-500` CSS tokens) should be generically correct, not special-cased for one feature's page.
- Don't touch `bikelog_server/` from this repo's work — it's a separate, already-complete, separately-tracked codebase. If a frontend spec reveals a genuine backend bug or gap, note it in this app's `progress-tracker.md`'s "Known Gaps" and flag it to the user rather than editing the backend directly mid-frontend-spec.

## Documentation Sync

- After finishing a spec: update its own file's status line, update the `context/specs/00-build-plan.md` index status, and add a `progress-tracker.md` "Recent Activity" entry (what shipped, any deviation from the spec as written).
- If a spec's implementation reveals that `architecture.md` or `code-standards.md` was wrong or incomplete about something (e.g. a component prop turns out different from documented), fix that doc in the same pass — don't let it drift, this project explicitly had that problem on the backend side (`bikelog_server/context/progress-tracker.md`'s audit found a stale doc claim) and it's not worth repeating.

## Verification Checklist Before Moving On

- [ ] Screen works against the real API (not mocked data) — verify with the Postman collection's seeded data or by exercising the flow directly.
- [ ] `yarn lint` clean.
- [ ] Checked at a ~390px viewport width — no horizontal overflow, no unreachable tap targets.
- [ ] No server-derived field sent in any mutation payload (see `architecture.md` Invariant 3).
- [ ] If the screen is under `app/(main)/`: confirmed it's unreachable without a session (clear the `accessToken` cookie, try navigating directly to the route, land on `/login`).
- [ ] Spec status + `00-build-plan.md` + `progress-tracker.md` updated.
