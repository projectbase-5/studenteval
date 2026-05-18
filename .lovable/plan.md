## Plan: Replace landing page with Spline-powered auth page

### What changes

1. **`src/routes/index.tsx`** — fully replace the current marketing landing with a fullscreen auth page:
   - Fullscreen `<spline-viewer>` background (script lazy-loaded once, viewer 1.12.94, scene `Dz6o7LVZzvTInuOJ`).
   - Spline canvas keeps native pointer events — no `pointer-events: none`, no overlay covering the right half.
   - Glassmorphism auth card pinned to left-center (`md:ml-[8vw]`, max-w ~420px, `backdrop-blur-xl bg-white/5 border-white/10`), vertically centered.
   - Right side fully open so the 3D scene stays interactive.
   - Subtle radial dark gradient behind the card only (not full-screen) for text legibility.
   - Sign In / Sign Up segmented toggle, email + password fields, "Forgot password?" link, primary action button, error/success states.
   - Linear/Vercel dark aesthetic: tight typography, hairline borders, soft glow on focus, micro hover transitions.
   - Mobile: card centers, slightly more opaque background for readability.

2. **Auth wiring (Supabase, email/password only — no profiles table per user's choice)**
   - Sign up: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/dashboard' } })`. With email confirmation disabled, the user is signed in immediately.
   - Sign in: `supabase.auth.signInWithPassword`.
   - Forgot password: `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })` shown as an inline mini-form.
   - On success: `navigate({ to: '/dashboard' })`.
   - Toast feedback via existing `sonner`.

3. **New route `src/routes/reset-password.tsx`** (required by the password-reset flow)
   - Public route, reads recovery token from URL hash, calls `supabase.auth.updateUser({ password })`, then redirects to `/dashboard`.

4. **`supabase/config.toml`** — add `[auth]` block disabling email confirmations:
   ```
   [auth]
   enable_signup = true
   [auth.email]
   enable_confirmations = false
   ```

5. **Routing/protection** — per user choice, workspace pages stay public. No `_authenticated` layout. Dashboard simply receives the redirect after login.

### What does NOT change

- `WorkspaceShell`, dashboard, predict, reports, all existing pages remain untouched.
- Existing pages-guide / workflow / features marketing content is removed with the old landing page (user asked to "remove the current landing page").
- No profiles table, no user_roles table, no DB migration.

### Spline interactivity guarantees

- `<spline-viewer>` lives in a `fixed inset-0` container with `z-0` and no `pointer-events-none`.
- Auth card sits in a sibling `relative z-10` container with `pointer-events-none` on the wrapper and `pointer-events-auto` only on the card itself — so cursor moves over the empty right side pass through to the 3D scene.
- Script tag injected once via `useEffect`, guarded by id check.
- Optional `loading-anim` attribute removed to reduce first-paint cost; viewer handles its own RAF loop.

### Quick fix for the existing runtime error

The current `/` throws `Cannot read properties of undefined (reading 'position')` from the marketing landing's mock-screenshot SVG block. Since we're replacing the whole file, the error goes away with the rewrite — no separate patch needed.

### Files touched

- rewrite `src/routes/index.tsx`
- create `src/routes/reset-password.tsx`
- edit `supabase/config.toml` (disable email confirmation)
