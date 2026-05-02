import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

// --- Service worker hygiene: prevent stale SW from breaking OAuth ---
(() => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const isOAuthCallback =
    url.pathname.startsWith("/~oauth") ||
    url.pathname.startsWith("/auth") ||
    url.searchParams.has("code") ||
    url.searchParams.has("state") ||
    /access_token=|id_token=|state=/.test(url.hash);

  // Rescue: if landed on an OAuth callback while a SW controls the page,
  // unregister and reload once so the network handles the request.
  if (isOAuthCallback && navigator.serviceWorker.controller) {
    const flag = "oauth-sw-rescued";
    if (!sessionStorage.getItem(flag)) {
      sessionStorage.setItem(flag, "1");
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .finally(() => window.location.reload());
      return;
    }
  }

  // One-time global SW reset for users with stale workers from before
  // the OAuth denylist was added.
  const RESET_KEY = "sw-reset-v2";
  if (!localStorage.getItem(RESET_KEY)) {
    localStorage.setItem(RESET_KEY, "1");
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        if (regs.length === 0) return;
        return Promise.all(regs.map((r) => r.unregister())).then(() => {
          window.location.reload();
        });
      })
      .catch(() => {
        // ignore
      });
  }
})();

// --- WebView OAuth session recovery ---
// When the app is loaded after an OAuth redirect (especially inside Median
// or another WebView), the URL may carry session tokens in the hash fragment
// or query string. Manually inspect the URL, hydrate the Supabase session,
// then strip the tokens from the address bar so they don't leak into history.
(async () => {
  if (typeof window === "undefined") return;

  const parseTokens = (raw: string): { access_token?: string; refresh_token?: string } => {
    const stripped = raw.startsWith("#") || raw.startsWith("?") ? raw.slice(1) : raw;
    const params = new URLSearchParams(stripped);
    return {
      access_token: params.get("access_token") ?? undefined,
      refresh_token: params.get("refresh_token") ?? undefined,
    };
  };

  const fromHash = window.location.hash ? parseTokens(window.location.hash) : {};
  const fromQuery = window.location.search ? parseTokens(window.location.search) : {};
  const access_token = fromHash.access_token || fromQuery.access_token;
  const refresh_token = fromHash.refresh_token || fromQuery.refresh_token;

  console.info("[auth] OAuth callback inspection", {
    hasHashTokens: !!fromHash.access_token,
    hasQueryTokens: !!fromQuery.access_token,
    pathname: window.location.pathname,
  });

  if (access_token && refresh_token) {
    try {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error("[auth] setSession failed", error);
      } else {
        console.info("[auth] session restored from URL tokens");
      }
    } catch (e) {
      console.error("[auth] setSession threw", e);
    } finally {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
