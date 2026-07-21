# Project Overview: Bike Log (Frontend)

## Overview

Bike Log's frontend is a Next.js 16 (App Router) + React 19 web app, built mobile-first since it's used mostly on a phone while riding or right after a fill-up. It's the client for the already-complete `bikelog_server` REST API (Express + Mongoose, see `../../bikelog_server/context/`), which lets a rider log fuel fill-ups and maintenance events for their motorcycle(s) and derives real average mileage, km-based maintenance reminders, and total spending. The frontend was NOT started from scratch — it's built on top of an existing Next.js scaffold (`components.json`, shadcn/ui, TanStack Query/Table, react-hook-form) that was copied over from an earlier, unrelated shop/marketplace admin project the developer built, specifically to reuse its shared component library (inputs, modal, table) instead of rebuilding them. See `architecture.md` for exactly which pieces of that scaffold are kept vs. removed.

**This web app is the first version, not the end goal.** The developer's actual main target for this project is a React Native app — this Next.js build is a deliberately-sequenced first prototype: get something mobile-responsive and usable on a phone's browser fast, validate the product end-to-end against the real API, then build the React Native app once the web version has proven the UX/flows out. Nothing here should be read as "the permanent frontend" — screens, component choices, and folder structure should stay simple enough that the lessons (not necessarily the code) carry over cleanly into the React Native build later.

The original product plan (`../../bikelog_server/context/specs/bike-log-plan.md`) proposed Expo/React Native Web (a single codebase for native + responsive web) for the client. This project takes a different path to the same eventual destination: a standalone Next.js web app now, a separate React Native app later — not one shared Expo/RNW codebase. Everything in that plan about product logic (mileage math, maintenance intervals, spending) still applies; only §7 (Frontend & Notifications) is superseded by this doc and by the sequencing decision above.

## Goals

1. Ship something usable on a phone as fast as possible — minimal screens, minimal styling effort, no animation, no charts.
2. Reuse the existing shared component library (`ControlledInput`, `BaseModal`, `GenericTableComponent`, etc.) everywhere a form/modal/list is needed, instead of writing new ones per feature.
3. Cover the full backend MVP surface: auth, bike CRUD, fuel logs, mileage stats, maintenance catalog + logs + reminders, spending summary.
4. Stay mobile-responsive throughout — this is a phone-first tool, desktop is a nice-to-have side effect of it being a web app, not a target.

## Roles

`bikelog_server` has two roles in its schema/JWT payload, `user` and `admin` (see `../../bikelog_server/context/`), but authorization is not role-gated anywhere in the backend yet — `userRole` is forward-compatible scaffolding, not an enforced permission system. This frontend's **v1 builds only the regular-user (`user`-role) experience** — no admin pages, no admin logic, nothing role-conditional. It's structured to leave room for an admin panel later without a rework: `app/(main)/` holds every v1 (regular-user) page, and `app/(admin)/` is a **reserved, not-yet-populated** route group for a future admin panel — see `architecture.md`'s System Boundaries. No files exist under `app/(admin)/` until that work actually starts.

## Core User Flows

### First launch (unauthenticated)

1. Opening the app with no valid session lands on `/login` — this is the actual entry point, not a bike list or a marketing page. `/` itself just redirects to `/login`.
2. From `/login`, a visible link goes to `/register`; from `/register`, a link goes back to `/login`.
3. **No route other than `/login` and `/register` is reachable without a valid session** — attempting to navigate anywhere else (typed URL, stale bookmark, etc.) redirects back to `/login`. This is enforced at the `app/(main)/` layout level, not left to an API call failing first.

### Rider (`user` role — single-user-per-account, no shared-bike concept in v1)

1. Registers / logs in (`/register`, `/login`) — JWT returned by the API, stored client-side in a cookie.
2. Lands on `/dashboard` — a list of their bikes, with a quick-create modal for a new one.
3. Opens a bike (`/bikes/[bikeId]`) — a hub page with the bike's current odometer, an active reminders banner (if anything's due/upcoming), and links into that bike's fuel logs, mileage stats, maintenance logs, and spending summary.
4. Logs a fuel fill-up from the fuel logs page — odometer, liters, price, whether it was a full tank — via a modal form.
5. Checks mileage stats — exact per-tank history, monthly, yearly, lifetime totals, tab-switched on one page.
6. Logs a maintenance event (starting with engine oil) via a modal form, picking a maintenance type and (for oil changes) an oil type from small catalog dropdowns.
7. Checks the spending summary — total + per-category breakdown, switchable between month/year/lifetime.
8. Manages the maintenance-type/engine-oil-type catalogs from a small settings page, only when they need a type that isn't already seeded.

## Features by Category

- **Auth:** register, login, JWT-in-cookie session, hard route gate (no page but `/login`/`/register` renders without a valid token — see "Core User Flows").
- **Bike management:** list/create/edit/delete a bike; bike hub page linking to everything scoped to it.
- **Fuel & mileage:** fuel-log CRUD; mileage history (exact + rolling-average), monthly, yearly, lifetime stat views.
- **Maintenance & reminders:** maintenance-type / engine-oil-type catalog (create + list only — the API has no update/delete for these); maintenance-log CRUD; due/overdue/upcoming reminders surfaced as a banner.
- **Spending:** total + category-breakdown summary, switchable by period.

## In Scope (v1 / MVP)

- Everything the backend's spec 01–09 already implements (see `../../bikelog_server/context/progress-tracker.md`) — this frontend targets 100% coverage of the existing API surface, nothing more.
- Mobile-responsive layout as the primary target, not an afterthought.
- `user`-role functionality only.

## Out of Scope

**Deferred to a later version of this same web app (not abandoned):**
- Admin panel / any `admin`-role functionality — `app/(admin)/` stays an empty, reserved route group in v1 (see "Roles" above).
- Charts of any kind (mileage trend, spend trend) — plain totals/cards only, per the backend's "no charting library chosen yet" stance and the developer's explicit "no animation, minimal" instruction.
- Any richer maintenance-type catalog than what's seeded (Engine Oil, Chain Lube, Tire Change, Brake Pads, General Service, Insurance, Registration/Tax, Other) — the UI supports adding more, but no extra product logic beyond the generic catalog form.

**Deferred to the React Native app (a different, later build, not this one):**
- Push notifications (Expo push was the backend's Phase-2 plan for a native app; not applicable to this web client — an in-app reminders banner is the only mechanism here, same as the backend's Tier 1). This is exactly the kind of feature that's the React Native app's job, not this prototype's.

**Not relevant to Bike Log at all:**
- The old scaffold's leftover pages/components (TipTap rich text editor, GSAP animation, the shop-domain demo pages under `app/table`, `app/table2`, `app/multi-form`, `app/input`) — see `architecture.md` for what's kept vs. deleted.

## Success Criteria

- A rider can register, log in, add a bike, log a fuel fill-up, and see a mileage figure without touching the backend directly.
- Maintenance reminders correctly reflect due/overdue status from the API, visible without digging through menus.
- Every screen is usable one-handed on a phone screen (~375–430px wide) without horizontal scrolling breaking the layout.
- The whole MVP ships fast — no screen should take disproportionately longer to build than its backend endpoint took to write.
