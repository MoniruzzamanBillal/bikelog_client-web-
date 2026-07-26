# 14: AI Integration (Spending Insight, Mileage Insight, Bike Chat)

Status: 🔲 Proposed (not started)

## Goal

Consume the three new AI endpoints (`bikelog_server` spec 16, `context/specs/16-ai-integration.md`): a spending-insight card, a mileage-insight card, and a full chat page scoped to one bike. This is v2 scope (`../../../v2-proposed-features/06-ai-integration.md`) — all three features are included in this pass (confirmed with the user; the chat UI was flagged as optional but chosen to be built now rather than deferred).

## Context

Backend contract (spec 16):

- `GET /bikes/:bikeId/ai/spending-insight` → `{ insight: string, generated: boolean, cached: boolean }`
- `GET /bikes/:bikeId/ai/mileage-insight` → `{ insight: string, generated: boolean, cached: boolean }`
- `POST /bikes/:bikeId/ai/chat`, body `{ messages: {role: "user"|"assistant", content: string}[] }` → `{ reply: string }`. Stateless — the client owns and resends the full conversation history each call; the backend never persists messages, and rejects any client-supplied `role: "system"` message.

Confirmed reusable pieces from direct exploration of the current codebase:

- `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx`'s nav grid is a plain `links` array mapped to `Link` tiles (`grid grid-cols-2 gap-3`, each tile `flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4`) — adding a 7th "AI Assistant" tile is a pure array addition, no restructuring.
- The card idiom used everywhere (`SpendingSummaryView.tsx`, `BikeDetailPage`'s header) is `rounded-lg border border-border bg-card p-4` with a `text-sm text-muted-foreground` label line and a larger value/body line below.
- `usePost()` (no arguments) is safe for a one-off mutation needing no cache invalidation — exactly the chat-send case.
- No chat/message-bubble component exists anywhere in this codebase — the message list UI is built from scratch this spec, using `components/ui/skeleton.tsx` and `lucide-react`'s `Loader2` (`className="size-4 animate-spin"`, already used in `components/ui/sonner.tsx`) for loading states. `components/shared/Modal/BaseModal.tsx`'s scrollable body pattern (`flex-1 overflow-y-auto`) is a useful reference for the message-list container's layout even though chat is a full page here, not a modal.
- Every other bike-scoped feature is a dedicated route under `app/(main)/bikes/[bikeId]/<domain>/page.tsx`, a 4-line wrapper importing one top-level component that reads `bikeId` via `useParams()` internally — the chat page follows this exact shape rather than being a modal, consistent with how every other substantial feature (not just quick actions) is structured here.

## Design

### Spending insight card

New `components/(main)/Spending/AiSpendingInsightCard.tsx`: `useFetchData<TSpendingInsight>(["ai", "spending-insight", bikeId], \`/bikes/${bikeId}/ai/spending-insight\`)`, rendered as a card using the standard idiom, placed at the top of `Spending.tsx`(above the existing period pill-buttons) so it's visible regardless of which period tab is active. Loading state:`"Thinking..."`text (matches this codebase's existing plain-text loading convention, not a spinner, for consistency with`SpendingSummaryView`'s own loading state).

### Mileage insight card

New `components/(main)/Mileage/AiMileageInsightCard.tsx`, same shape, placed at the top of `Mileage.tsx` above the existing tab row. `useFetchData<TMileageInsight>(["ai", "mileage-insight", bikeId], \`/bikes/${bikeId}/ai/mileage-insight\`)`.

Both insight types (`TSpendingInsight`, `TMileageInsight` — both `{insight: string; generated: boolean; cached: boolean}`) are added to their respective domain's existing `type/spending.types.ts`/`type/mileage.types.ts` files, not a new shared AI types file — matches this codebase's per-domain type-file convention.

No manual "regenerate" button in this pass — the backend already regenerates automatically when the underlying log count changes, and a normal page revisit re-runs the `useFetchData` query, so a manual refresh control isn't needed for v1.

### Bike chat page

New domain folder `components/(main)/AiAssistant/`:

- `AiAssistant.tsx` — reads `bikeId` via `useParams()`, owns the conversation as local state (`useState<TChatMessage[]>([])` — client-side only, matches the backend's stateless design), renders the message list + input.
- `type/aiAssistant.types.ts` — `TChatMessage { role: "user" | "assistant"; content: string }`, `TBikeChatResponse { reply: string }`.

Message list: a `flex-1 overflow-y-auto` scrollable container (same layout idiom as `BaseModal`'s body), each message a simple bubble — user messages right-aligned (`bg-primary text-primary-foreground`), assistant messages left-aligned (`bg-card border border-border`), both `rounded-lg px-4 py-2 text-sm`. No existing bubble component to reuse — built fresh, kept minimal (no markdown rendering, no avatars).

Input: a plain controlled `<textarea>` (uncontrolled local `useState<string>`, not wrapped in react-hook-form — this isn't a validated form, just a message box) + a send button (`components/ui/button`, `size="icon"`, disabled while `isPending` or input is empty).

Send flow: on submit, append the user's message to local state immediately (optimistic — no need to wait for a round trip to show what was just typed), call `usePost().mutateAsync({ url: \`/bikes/${bikeId}/ai/chat\`, payload: { messages: [...history, newUserMessage] } })`, append the returned `reply`as an assistant message on success. While pending, show a`Loader2` spinning icon in place of/alongside the send button ("AI is thinking...").

Error handling: if the mutation fails (e.g. the backend's `AppError(503)` when every free model is down), show the existing toast pattern (`sonner`, already used elsewhere in this codebase for mutation errors) rather than silently dropping the message — the optimistically-appended user message stays visible, but no fake assistant reply is added.

### Routing + nav entry

- New `app/(main)/bikes/[bikeId]/assistant/page.tsx`, importing and rendering `<AiAssistant />` — same 4-line wrapper shape as every other bike-scoped page.
- `BikeDetailPage.tsx`'s `links` array gets one new entry: `{ href: \`/bikes/${bikeId}/assistant\`, label: "AI Assistant", icon: <a lucide-react icon not already used for another tile, e.g. Sparkles or Bot> }`.

## Implementation

1. `components/(main)/Spending/type/spending.types.ts` — add `TSpendingInsight`.
2. `components/(main)/Spending/AiSpendingInsightCard.tsx` — new.
3. `components/(main)/Spending/Spending.tsx` — render the new card above the period buttons.
4. `components/(main)/Mileage/type/mileage.types.ts` — add `TMileageInsight`.
5. `components/(main)/Mileage/AiMileageInsightCard.tsx` — new.
6. `components/(main)/Mileage/Mileage.tsx` — render the new card above the tab row.
7. `components/(main)/AiAssistant/type/aiAssistant.types.ts` — new.
8. `components/(main)/AiAssistant/AiAssistant.tsx` — new, per Design above.
9. `app/(main)/bikes/[bikeId]/assistant/page.tsx` — new wrapper page.
10. `components/(main)/Bike/BikeDetailPage/BikeDetailPage.tsx` — add the "AI Assistant" tile to `links`.

## Dependencies

`bikelog_server` spec 16 must be deployed/available before this can be exercised against real data — can be built against a local `bikelog_server` in the meantime. No new npm dependency needed on the web side (all UI is built from existing shadcn primitives + local state).

## Verify

- [ ] `yarn build` / `yarn lint` clean.
- [ ] Spending/Mileage pages: insight card loads on page visit, shows a real generated insight, and doesn't re-trigger generation on every visit (cached response, verified by the `cached: true` field or by checking network calls aren't firing an AI generation each time).
- [ ] Assistant page: sending a message appends it immediately, shows a thinking state, then appends the real reply; conversation history persists across multiple messages in the same session (resent correctly each call) but resets on navigating away and back (no persistence expected, per stateless design).
- [ ] A backend 503 (simulated) surfaces as a toast, not a silent failure or a crash, and doesn't fabricate a fake assistant reply.
- [ ] Usable at ~390px width — message bubbles wrap correctly, input + send button don't overflow.
- [ ] Navigating between two different bikes' assistant pages doesn't leak one bike's conversation history into the other's (fresh local state per `bikeId`).
