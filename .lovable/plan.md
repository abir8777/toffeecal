## Problem

Google sign-in fails on `oauth.lovable.app` with **"Authorization failed — State verification failed"** (`invalid_request`).

Root cause: a previously installed PWA service worker is intercepting OAuth navigation requests (`/~oauth/initiate` and `/~oauth/callback`), breaking the state token round-trip. Even though `vite.config.ts` already has `navigateFallbackDenylist: [/^\/~oauth/]`, the **old service worker still cached on users' devices** does not have this rule, so it continues to hijack OAuth requests until it self-updates (which can take a long time, or never if the user keeps the PWA open).

## Fix

### 1. Force service worker to immediately take control and update
Update `vite.config.ts` PWA config:
- Set `workbox.skipWaiting: true` and `workbox.clientsClaim: true` so new SW versions activate immediately for all clients.
- Add `workbox.navigateFallbackDenylist` patterns to also exclude `/auth`, OAuth callback hashes, and any URL with `code=`/`state=` query params.
- Keep `registerType: "autoUpdate"`.

### 2. Add a runtime guard in `src/main.tsx`
Before rendering, detect if the current URL is an OAuth callback (`/~oauth`, or contains `code=` + `state=` in query/hash). If a service worker is registered and controlling the page on such URLs, unregister it and hard-reload once. This rescues users whose stale SW is currently intercepting the callback.

### 3. Add a one-time SW reset on app boot
In `src/main.tsx`, check `localStorage` for a version flag (e.g. `sw-reset-v2`). If absent, call `navigator.serviceWorker.getRegistrations()` → `unregister()` for all, set the flag, and reload. This guarantees every existing user gets a clean SW state exactly once.

### 4. Verify Google OAuth flow still works
After deploy, the user should:
- Fully close the installed PWA (if installed) and reopen, OR
- Hard-refresh the browser tab once.
The next Google sign-in attempt should complete successfully.

## Files to change
- `vite.config.ts` — strengthen workbox config (skipWaiting, clientsClaim, broader denylist).
- `src/main.tsx` — add SW reset + OAuth-callback rescue logic before `createRoot`.

## Notes
- No backend or Supabase changes are required — this is purely a client-side PWA caching issue.
- The OAuth credentials, redirect URLs, and `lovable.auth.signInWithOAuth` call in `AuthDialog.tsx` are already correct and do not need changes.
