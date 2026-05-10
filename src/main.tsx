import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- Service worker hygiene: prevent stale SW from breaking OAuth ---
(() => {
  if (typeof window === "undefined") return;

  const forceNetworkReload = (param: string) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(param, Date.now().toString());
    window.location.replace(nextUrl.toString());
  };

  window.addEventListener("error", (event) => {
    const message = event.message || "";
    if (/Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(message)) {
      const flag = "chunk-reload-rescued";
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, "1");
        forceNetworkReload("chunk-reset");
      }
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message = String(event.reason?.message || event.reason || "");
    if (/Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed/i.test(message)) {
      const flag = "chunk-reload-rescued";
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, "1");
        forceNetworkReload("chunk-reset");
      }
    }
  });

  if (!("serviceWorker" in navigator)) return;

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
        .finally(() => forceNetworkReload("oauth-cache-reset"));
      return;
    }
  }

  // One-time global SW reset for users with stale workers/caches from before
  // the latest auth modal and OAuth denylist were added.
  const RESET_KEY = "sw-reset-v5";
  if (!localStorage.getItem(RESET_KEY)) {
    localStorage.setItem(RESET_KEY, "1");
    Promise.all([
      navigator.serviceWorker.getRegistrations(),
      "caches" in window ? caches.keys() : Promise.resolve([]),
    ])
      .then(([regs, cacheNames]) => {
        const cacheCleanup = Promise.all(cacheNames.map((name) => caches.delete(name)));
        return Promise.all([cacheCleanup, ...regs.map((r) => r.unregister())]).then(() => {
          forceNetworkReload("cache-reset");
        });
      })
      .catch(() => {
        // ignore
      });
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
