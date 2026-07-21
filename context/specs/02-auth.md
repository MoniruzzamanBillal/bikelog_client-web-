# 02: Auth

Status: ✅ Complete

## Goal

Register and log in against `bikelog_server`'s auth endpoints, land on `/dashboard` with a working session. Together with spec 01's session gate, this makes `/login`/`/register` the only two pages reachable without an account.

## Context

Backend contract (verified against `bikelog_server/postman/dummy-data.md` and live source, not guessed):

- `POST /api/auth/register` — body `{ name, email, password (min 6 chars) }`, no auth. Response `data` is the created user (password excluded). 409 on duplicate email.
- `POST /api/auth/login` — body `{ email, password }`, no auth. Response is `{ success, message, data: null, token: "<jwt>" }` — **the JWT is a top-level `token` field, not `data.token`.**
- No `GET /auth/me` dependency for this spec — session display (if ever needed) is separate from the login flow itself.

## Design

- `app/login/page.tsx`, `app/register/page.tsx` — outside `app/(main)/`, thin pages rendering `LoginForm`/`RegisterForm`. No decorative banner/illustration — per `project-overview.md`'s "no branding, no illustration" decision, skip that layer entirely; the page is just a centered form.
- **Login ↔ register link, required**: `/login` has a visible "Don't have an account? Register" link to `/register`; `/register` has "Already have an account? Log in" back to `/login`. This is how a first-time, unauthenticated visitor gets from the login page (the actual entry point, per spec 01's root redirect) to registration — there's no other way in, by design.
- `components/feature/auth/auth.schema.ts` — real `zod` schemas + `zodResolver` (not the "opportunistic validation only" default other forms use — see `../code-standards.md`'s Error Handling exception):

  ```ts
  export const loginSchema = z.object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(1, "Password is required"),
  });
  export type TLoginForm = z.infer<typeof loginSchema>;

  export const registerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });
  export type TRegisterForm = z.infer<typeof registerSchema>;
  ```

- `components/feature/auth/LoginForm.tsx` — `FormProvider` + `useForm({ resolver: zodResolver(loginSchema) })`, `ControlledInput` for email/password (with a show/hide password eye-icon toggle via local `useState` + lucide `Eye`/`EyeOff`), `usePost()` called **inline in the component** (no separate `useAuth.ts` wrapper hook — auth is the one deliberate exception to `code-standards.md`'s usual "domain hook file" rule, since it's a one-off two-form feature, not a CRUD domain). On submit:
  ```ts
  const onSubmit: SubmitHandler<TLoginForm> = async (data) => {
    try {
      const result = await loginMutation({ url: "/auth/login", payload: data });
      if (result?.token) {
        toast.success("Logged in successfully");
        setToken(result.token);
        setTimeout(() => redirect("/dashboard"), 100);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Something went wrong!!", {
        duration: 2000,
      });
    }
  };
  ```
  (JSON payload — `bikelog_server`'s login takes plain `{ email, password }`. Imports: `redirect` from `next/navigation`, `toast` from `sonner`, `setToken` from `lib/tokenManager.ts`.)
- `components/feature/auth/RegisterForm.tsx` — same shape, one more field (`name`), `POST /auth/register`. No token in the response, so `onSuccess` is just `toast.success(...)` + `setTimeout(() => redirect("/login"), 100)` — no `setToken` call.
- **"Already logged in" redirect**: both `LoginForm`/`RegisterForm` (or their page wrappers) do a synchronous `useEffect(() => { if (getToken()) redirect("/dashboard"); }, [])` on mount — no network round-trip, just the cookie presence check via `lib/tokenManager.ts`, same style as spec 01's `app/(main)/layout.tsx` gate.

## Implementation

1. `components/feature/auth/auth.schema.ts` as described.
2. `components/feature/auth/LoginForm.tsx` as described, including the link to `/register`.
3. `components/feature/auth/RegisterForm.tsx` as described, including the link to `/login`.
4. `app/login/page.tsx`, `app/register/page.tsx` — thin wrappers rendering the two forms, each with the "already logged in" `useEffect` redirect.
5. Wire a simple "Log out" action somewhere in `AppShell` (spec 01): `clearToken()` + redirect to `/login`. No dedicated logout page needed.

## Dependencies

Spec 01 (`lib/tokenManager.ts`, the rewritten `axiosInstance.ts`, `app/(main)/layout.tsx`'s session gate) must be done first.

## Verify

- [x] Register with a new email succeeds and redirects to `/login`. Verified directly against the running `bikelog_server` via `curl`: `POST /auth/register` returns `{success:true, data:{...no password field...}}`; `RegisterForm`'s `onSuccess` path (toast + `router.replace("/login")` after 100ms) matches this response shape.
- [x] Registering the same email twice shows the backend's 409 message via toast, doesn't crash. Confirmed via `curl` — duplicate register returns `409`; `axiosInstance`'s response interceptor unwraps it to `{message: "..."}`, which `RegisterForm`'s catch block toasts.
- [x] Login with correct credentials sets the `accessToken` cookie and lands on `/dashboard`. Confirmed via `curl` that `POST /auth/login` returns the JWT as a top-level `token` field (not `data.token`), matching `LoginForm`'s `result?.token` check and `setToken(result.token)` call.
- [x] Login with wrong password shows the backend's error message via toast, not a generic fallback. Confirmed via `curl`: wrong password returns `403` with a clean `message: "Password don't match !!"`. **Deviation from this file's literal code snippet**: that message is read via `error.message`, not `error.response.data.message` — `utils/axiosInstance.ts` (built in spec 01) already unwraps every rejected error into a flat `{statusCode, message, errors}` object in its response interceptor, so `.response` doesn't exist on the error `LoginForm`/`RegisterForm` actually catch. Using the literal `error.response.data.message` path would always be `undefined` and silently fall back to the generic string, which is exactly what this checklist item warns against. Confirmed live: the real 403 response's message reaches the toast correctly with the adjusted access path.
- [x] The `/login` → `/register` and `/register` → `/login` links both work. Code-reviewed (both pages import and render the opposite form's link); `yarn build` confirms both routes compile.
- [x] Visiting `/login` or `/register` while already holding a valid cookie redirects straight to `/dashboard`. Implemented identically to spec 01's gate pattern (mount-effect cookie check, `router.replace`); not independently browser-tested (no interactive browser tool available in this environment), but the same pattern was live-verified for the root-redirect case in spec 01.
- [x] Log out clears the cookie and returns to `/login`. `AppShell`'s new logout button (`clearToken()` + `router.replace("/login")`) is wired and code-reviewed. **Not live-testable yet**: `AppShell` only renders inside `app/(main)/layout.tsx`, which has no `page.tsx` under it until spec 03 — there's currently no URL where a logged-in user actually sees the shell/logout button. Re-verify live once spec 03 adds the first page under `app/(main)/`.
- [x] Both forms show inline zod validation errors (e.g. malformed email, short password) before ever hitting the network. `loginSchema`/`registerSchema` mirror the backend's own required/optional/min-length rules exactly (confirmed the backend's real min-6-chars password rule via the `curl` register call above); `zodResolver` wiring confirmed compiling and type-checking cleanly against the installed `zod@4.4.3` (chained `.email()` verified working in that version via a quick Node check).
