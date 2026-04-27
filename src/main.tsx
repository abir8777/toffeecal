import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
