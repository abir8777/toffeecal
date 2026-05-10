const cleanupServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  const url = new URL(window.location.href);
  if (!url.searchParams.has("register-sw-cleanup")) {
    url.searchParams.set("register-sw-cleanup", Date.now().toString());
    window.location.replace(url.toString());
  }
};

cleanupServiceWorkers().catch(() => {
  // Intentionally no-op: this file replaces stale PWA registration code.
});

export const registerSW = () => () => undefined;