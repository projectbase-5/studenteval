## 1. Hide "Cleaning" and "Feature Engineering" from sidebar

In `src/components/WorkspaceShell.tsx`, remove the `/data/clean` and `/features` entries from the `NAV` array (Data Pipeline group keeps only Data Collection + EDA). Route files stay intact so the pages remain reachable by direct URL.

## 2. Auto-close mobile/tablet sidebar on navigation

In `WorkspaceShell.tsx`, inside `AppSidebar`'s menu rendering, read `setOpenMobile` and `isMobile` from `useSidebar()` and call `setOpenMobile(false)` in each `<Link>`'s `onClick`. This collapses the sheet immediately when a nav item is tapped on phone/tablet widths.

## 3. Fix the "Not Found" preview on `/` and other routes

Root cause investigation: the preview screenshot shows `/data/upload` rendering only "Not Found" plain text — that's TanStack Router's `defaultNotFoundComponent` fallback, which means the route tree isn't matching the URL. Two likely culprits:

a. `src/routeTree.gen.ts` is stale (the SPA migration deleted/regenerated it but it may not include all current routes).
b. The `<spline-viewer>` script in `index.html` is throwing at module evaluation (`Cannot read properties of undefined (reading 'position')`), which can break first paint in some browsers.

Fixes:

- Delete `src/routeTree.gen.ts` so the TanStack Router Vite plugin regenerates it cleanly on next dev start.
- Remove the global `<script src="…spline-viewer.js">` from `index.html` and instead inject it lazily only on the landing route (`src/routes/index.tsx`) via a `useEffect` that appends the script tag once. This prevents the Spline runtime crash from affecting the rest of the SPA.
- Verify `src/routes/index.tsx` exists with `createFileRoute("/")` — if missing, recreate a minimal version.

## 4. PWA install support (manifest-only, no service worker)

Per Lovable guidance, do **not** add `vite-plugin-pwa` / service workers (they break the preview iframe and cache stale builds). The existing `public/manifest.json` already enables Add-to-Home-Screen on Android and iOS. Polish  
  
show the install button of the pwa on the top right corner so that user can download the site with that :

- Add a 192×192 icon (`public/icon-192.png`) alongside the existing 512 for better Android compatibility, and reference both in `manifest.json`.
- Add `<link rel="apple-touch-icon" sizes="180x180" …>` and `<meta name="mobile-web-app-capable" content="yes">` to `index.html` for iOS install polish.
- Change manifest `start_url` from `/dashboard` to `/` so installed PWAs land on the marketing page (then the user clicks Dashboard) — or keep `/dashboard` if user prefers; will default to `/dashboard` for app-like feel.
- Add a small "Install app" button in the landing hero that listens for `beforeinstallprompt` and triggers `prompt()` on Android/desktop Chrome. iOS Safari has no API — show a one-line hint "Tap Share → Add to Home Screen" when on iOS.

Note: full offline support would require a service worker, which we're intentionally skipping. Installability + standalone display works on both Android and iOS with just the manifest.

## Files touched

- `src/components/WorkspaceShell.tsx` — trim nav + mobile auto-close
- `src/routeTree.gen.ts` — delete (auto-regenerates)
- `index.html` — drop global Spline script, add iOS PWA meta
- `src/routes/index.tsx` — lazy-load Spline viewer; add Install button
- `public/manifest.json` — add 192 icon entry
- `public/icon-192.png` — new asset